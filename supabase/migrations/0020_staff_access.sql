-- Akses pengelola: login email+password terpisah (/pengelola), super admin
-- mengundang staf dan mengatur izin per area. ADDITIVE: kolom baru + tabel baru
-- + dua fungsi; tidak ada data atau policy lama yang diubah.
--
-- Izin (profiles.permissions) berlaku untuk editor: impor, review, ulasan.
-- Area khusus admin (pelamar, kontributor, filter, popup, iklan, tim) tetap
-- hanya untuk role 'admin' (super admin).

alter table profiles
  add column if not exists permissions text[] not null default '{}'
  check (permissions <@ array['impor', 'review', 'ulasan']::text[]);

create table if not exists staff_invites (
  email text primary key
    check (email = lower(email) and char_length(email) between 5 and 200),
  display_name text not null check (char_length(display_name) between 2 and 80),
  role text not null check (role in ('editor', 'admin')),
  permissions text[] not null default '{}'
    check (permissions <@ array['impor', 'review', 'ulasan']::text[]),
  invited_by uuid references profiles(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table staff_invites enable row level security;
revoke all on staff_invites from anon, authenticated;
grant select, insert, update, delete on staff_invites to authenticated;
create policy "staff_invites: admin manages" on staff_invites
  for all to authenticated using (is_admin()) with check (is_admin());

-- Dipakai halaman daftar pengelola (sebelum login): apakah email ini diundang?
create or replace function staff_invite_pending(p_email text) returns boolean
  language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from staff_invites
    where email = lower(trim(p_email)) and claimed_at is null
  );
$$;
revoke all on function staff_invite_pending(text) from public;
grant execute on function staff_invite_pending(text) to anon, authenticated;

-- Dipanggil setelah login: terapkan undangan untuk email TERKONFIRMASI milik
-- pemanggil. Tidak pernah menurunkan admin yang sudah ada.
create or replace function claim_staff_invite() returns text
  language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
  v_inv staff_invites%rowtype;
begin
  if auth.uid() is null then return null; end if;
  select lower(email) into v_email from auth.users
    where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then return null; end if;

  select * into v_inv from staff_invites where email = v_email and claimed_at is null;
  if not found then return null; end if;

  update profiles set
    role = case when role = 'admin' then 'admin' else v_inv.role end,
    permissions = v_inv.permissions,
    display_name = v_inv.display_name,
    application_status = 'approved'
  where id = auth.uid();
  update staff_invites set claimed_at = now() where email = v_email;
  return v_inv.role;
end;
$$;
revoke all on function claim_staff_invite() from public, anon;
grant execute on function claim_staff_invite() to authenticated;

-- Super admin mengubah peran/izin orang lain (bukan dirinya sendiri).
create or replace function admin_set_staff(target uuid, new_role text, new_perms text[]) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Hanya admin yang boleh mengubah akses.'; end if;
  if target = auth.uid() then raise exception 'Tidak bisa mengubah akses akun sendiri.'; end if;
  if new_role not in ('contributor', 'editor', 'admin') then raise exception 'Peran tidak valid.'; end if;
  update profiles set
    role = new_role,
    permissions = case when new_role = 'editor' then coalesce(new_perms, '{}') else '{}' end
  where id = target;
end;
$$;
revoke all on function admin_set_staff(uuid, text, text[]) from public, anon;
grant execute on function admin_set_staff(uuid, text, text[]) to authenticated;

-- Super admin: undangan bawaan (email milik pemilik situs).
insert into staff_invites (email, display_name, role, permissions)
values ('ndikpasowo@gmail.com', 'Super Admin', 'admin', '{}')
on conflict (email) do nothing;
