-- Contributor onboarding with identity verification + super admin approval.
--
-- Flow: anyone can sign in (magic link) -> must submit a full application
-- (biodata + selfie) -> an ADMIN approves or rejects it (with a reason) ->
-- a rejected applicant can fix the data and re-submit. Only APPROVED
-- contributors may submit articles.
--
-- Design notes
--  * Personal data (phone, city, real name, selfie path) lives in its own
--    table `contributor_applications`, readable only by the owner and admins.
--    `profiles` stays free of PII so the public author byline can be exposed
--    with a narrow column grant.
--  * Status changes go through SECURITY DEFINER functions only; clients can
--    never write `application_status`, `role`, etc. directly.
--  * The selfie lives in a PRIVATE storage bucket.

-- ---------------------------------------------------------------------
-- 1. Roles: add 'admin' (super admin). Editors keep article-review powers.
-- ---------------------------------------------------------------------
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%';
  if c is not null then
    execute format('alter table public.profiles drop constraint %I', c);
  end if;
end $$;

alter table profiles
  add constraint profiles_role_check
  check (role in ('contributor', 'editor', 'admin'));

alter table profiles
  add column application_status text not null default 'none'
    check (application_status in ('none', 'pending', 'approved', 'rejected')),
  add column application_reason text,
  add column application_submitted_at timestamptz,
  add column application_reviewed_at timestamptz,
  add column application_reviewed_by uuid references profiles(id);

-- ---------------------------------------------------------------------
-- 2. Role helpers (used inside RLS policies, hence SECURITY DEFINER).
-- ---------------------------------------------------------------------
create or replace function is_editor() returns boolean
  language sql security definer stable
  set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

create function is_admin() returns boolean
  language sql security definer stable
  set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create function is_approved_contributor() returns boolean
  language sql security definer stable
  set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (application_status = 'approved' or role in ('editor', 'admin'))
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Application data (PII) - owner + admin only.
-- ---------------------------------------------------------------------
create table contributor_applications (
  user_id      uuid primary key references profiles(id) on delete cascade,
  full_name    text not null default '' check (char_length(full_name) <= 120),
  display_name text not null default '' check (char_length(display_name) <= 80),
  bio          text not null default '' check (char_length(bio) <= 600),
  phone        text not null default '' check (char_length(phone) <= 30),
  city         text not null default '' check (char_length(city) <= 80),
  profession   text not null default '' check (char_length(profession) <= 120),
  institution  text not null default '' check (char_length(institution) <= 160),
  social_url   text check (social_url is null or char_length(social_url) <= 300),
  selfie_path  text check (selfie_path is null or char_length(selfie_path) <= 200),
  updated_at   timestamptz not null default now()
);

alter table contributor_applications enable row level security;

create policy "applications: owner can read"
  on contributor_applications for select using (user_id = auth.uid());

create policy "applications: admin can read all"
  on contributor_applications for select using (is_admin());

-- The owner may create/edit the application only while it is "open"
-- (never submitted, or rejected). While pending/approved it is locked.
create policy "applications: owner can insert while open"
  on contributor_applications for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.application_status in ('none', 'rejected')
    )
  );

create policy "applications: owner can update while open"
  on contributor_applications for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.application_status in ('none', 'rejected')
    )
  )
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. profiles: clients can no longer write ANYTHING directly.
--    (The signup trigger creates the row; approval copies the byline in.)
-- ---------------------------------------------------------------------
drop policy if exists "profiles: user can update own row" on profiles;
drop policy if exists "profiles: user can insert own row" on profiles;
revoke insert, update on public.profiles from authenticated;

-- Public author byline (id, display_name, bio) for APPROVED contributors
-- only - this is what makes "Ulasan Pakar" bylines render for anonymous
-- readers. Column-level grant so phone/selfie etc. can never leak.
revoke select on public.profiles from anon;
grant select (id, display_name, bio) on public.profiles to anon;

create policy "profiles: public can read approved contributors"
  on profiles for select to anon
  using (application_status = 'approved');

-- ---------------------------------------------------------------------
-- 5. Workflow functions
-- ---------------------------------------------------------------------
create function submit_contributor_application() returns void
  language plpgsql security definer
  set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p   profiles%rowtype;
  a   contributor_applications%rowtype;
begin
  if uid is null then
    raise exception 'Anda belum masuk.' using errcode = '28000';
  end if;

  select * into p from profiles where id = uid;
  if not found then
    raise exception 'Profil tidak ditemukan.';
  end if;
  if p.application_status not in ('none', 'rejected') then
    raise exception 'Pengajuan Anda sudah dikirim.';
  end if;

  select * into a from contributor_applications where user_id = uid;
  if not found then
    raise exception 'Data pengajuan belum diisi.';
  end if;

  if char_length(trim(a.full_name)) < 3 then
    raise exception 'Nama lengkap wajib diisi.';
  end if;
  if char_length(trim(a.display_name)) < 3 then
    raise exception 'Nama tampilan wajib diisi.';
  end if;
  if char_length(trim(a.bio)) < 30 then
    raise exception 'Bio/kredensial minimal 30 karakter.';
  end if;
  if char_length(regexp_replace(a.phone, '\D', '', 'g')) < 9 then
    raise exception 'Nomor HP/WhatsApp tidak valid.';
  end if;
  if char_length(trim(a.city)) < 2 then
    raise exception 'Kota wajib diisi.';
  end if;
  if char_length(trim(a.profession)) < 2 then
    raise exception 'Profesi wajib diisi.';
  end if;
  if char_length(trim(a.institution)) < 2 then
    raise exception 'Institusi/afiliasi wajib diisi.';
  end if;
  if a.selfie_path is null or a.selfie_path not like uid::text || '/%' then
    raise exception 'Foto diri wajib diunggah.';
  end if;

  update profiles
     set application_status = 'pending',
         application_reason = null,
         application_submitted_at = now()
   where id = uid;
end $$;

create function review_contributor_application(
  target uuid, approve boolean, reason text default null
) returns void
  language plpgsql security definer
  set search_path = public
as $$
declare
  p profiles%rowtype;
  a contributor_applications%rowtype;
begin
  if not is_admin() then
    raise exception 'Hanya admin yang dapat meninjau pengajuan.' using errcode = '42501';
  end if;

  select * into p from profiles where id = target for update;
  if not found or p.application_status <> 'pending' then
    raise exception 'Pengajuan ini tidak sedang menunggu peninjauan.';
  end if;

  if approve then
    select * into a from contributor_applications where user_id = target;
    update profiles
       set application_status = 'approved',
           application_reason = null,
           application_reviewed_at = now(),
           application_reviewed_by = auth.uid(),
           display_name = a.display_name,
           bio = a.bio
     where id = target;
  else
    if reason is null or char_length(trim(reason)) < 5 then
      raise exception 'Alasan penolakan wajib diisi (minimal 5 karakter).';
    end if;
    update profiles
       set application_status = 'rejected',
           application_reason = trim(reason),
           application_reviewed_at = now(),
           application_reviewed_by = auth.uid()
     where id = target;
  end if;
end $$;

-- Lock function execution down. (Supabase grants EXECUTE to anon/authenticated
-- by default on new functions.) The trigger function needs no client access;
-- the workflow functions are for signed-in users and re-check identity inside.
revoke all on function handle_new_user() from public, anon, authenticated;
revoke all on function submit_contributor_application() from public, anon;
revoke all on function review_contributor_application(uuid, boolean, text) from public, anon;
grant execute on function submit_contributor_application() to authenticated;
grant execute on function review_contributor_application(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Only approved contributors may submit articles.
-- ---------------------------------------------------------------------
drop policy "articles: contributor can insert own" on articles;
create policy "articles: contributor can insert own"
  on articles for insert with check (
    contributor_id = auth.uid()
    and source_type = 'contributor'
    and status in ('draft', 'submitted')
    and is_approved_contributor()
  );

-- ---------------------------------------------------------------------
-- 7. Private bucket for the selfie (identity verification).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contributor-verification', 'contributor-verification', false,
  3145728, array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "verification: owner can read own"
  on storage.objects for select
  using (
    bucket_id = 'contributor-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verification: admin can read all"
  on storage.objects for select
  using (bucket_id = 'contributor-verification' and is_admin());

-- Upload / replace / delete only while the application is still open,
-- so an approved contributor cannot swap the verified photo afterwards.
create policy "verification: owner can upload while open"
  on storage.objects for insert
  with check (
    bucket_id = 'contributor-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.application_status in ('none', 'rejected')
    )
  );

create policy "verification: owner can replace while open"
  on storage.objects for update
  using (
    bucket_id = 'contributor-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.application_status in ('none', 'rejected')
    )
  );

create policy "verification: owner can delete while open"
  on storage.objects for delete
  using (
    bucket_id = 'contributor-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.application_status in ('none', 'rejected')
    )
  );
