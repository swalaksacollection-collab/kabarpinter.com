-- 0017_admin_panel.sql
-- Admin panel: contributor management (suspend + profile photo), submission
-- filter rules, popups (+ stats), AdSense ad slots, and an admin-only media
-- bucket. ADDITIVE ONLY: no existing table, row or policy is dropped; the one
-- replaced function (is_approved_contributor) keeps its old behaviour and only
-- adds "not suspended".

-- ---------------------------------------------------------------------
-- 1. profiles: public profile photo + suspension flag
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists avatar_url text
    check (avatar_url is null or char_length(avatar_url) <= 500),
  add column if not exists suspended boolean not null default false;

-- Public author byline now also carries the photo (anon sees approved
-- contributors only, via the existing row policy).
grant select (avatar_url) on public.profiles to anon;

create or replace function is_approved_contributor() returns boolean
  language sql security definer stable
  set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and not suspended
      and (application_status = 'approved' or role in ('editor', 'admin'))
  );
$$;

-- Clients cannot write profiles directly; admins go through these.
create or replace function admin_set_contributor_avatar(target uuid, url text)
  returns void
  language plpgsql security definer
  set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Hanya admin yang dapat mengubah foto profil.' using errcode = '42501';
  end if;
  if url is not null and url not like '%/storage/v1/object/public/site-media/%' then
    raise exception 'Alamat foto tidak valid.';
  end if;
  update profiles set avatar_url = url where id = target;
end $$;

create or replace function admin_set_contributor_suspended(target uuid, flag boolean)
  returns void
  language plpgsql security definer
  set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Hanya admin yang dapat menonaktifkan kontributor.' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'Anda tidak dapat menonaktifkan akun Anda sendiri.';
  end if;
  update profiles set suspended = flag where id = target;
end $$;

revoke all on function admin_set_contributor_avatar(uuid, text) from public, anon;
revoke all on function admin_set_contributor_suspended(uuid, boolean) from public, anon;
grant execute on function admin_set_contributor_avatar(uuid, text) to authenticated;
grant execute on function admin_set_contributor_suspended(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 2. articles: filter reasons + editors may delete contributor pieces
-- ---------------------------------------------------------------------
alter table articles
  add column if not exists filter_flags text[] not null default '{}';

create policy "articles: editors can delete contributor pieces"
  on articles for delete using (is_editor() and source_type = 'contributor');

-- ---------------------------------------------------------------------
-- 3. Submission filter rules
-- ---------------------------------------------------------------------
create table filter_rules (
  id         bigint generated always as identity primary key,
  rule_type  text not null check (rule_type in ('banned_word', 'min_words', 'max_links')),
  value      text not null check (char_length(trim(value)) between 1 and 100),
  action     text not null default 'flag' check (action in ('flag', 'reject')),
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);

alter table filter_rules enable row level security;
revoke all on filter_rules from anon;

-- Approved contributors can read the rules (the submit action evaluates them
-- with the contributor's own session); only admins can change them.
create policy "filter_rules: approved contributors can read"
  on filter_rules for select to authenticated using (is_approved_contributor());
create policy "filter_rules: admin manages"
  on filter_rules for all to authenticated
  using (is_admin()) with check (is_admin());

insert into filter_rules (rule_type, value, action) values
  ('banned_word', 'judi online',   'reject'),
  ('banned_word', 'slot gacor',    'reject'),
  ('banned_word', 'pinjol ilegal', 'flag'),
  ('min_words',   '150',           'flag'),
  ('max_links',   '3',             'flag');

-- ---------------------------------------------------------------------
-- 4. Popups + daily stats
-- ---------------------------------------------------------------------
create table popups (
  id              bigint generated always as identity primary key,
  title           text not null check (char_length(trim(title)) between 1 and 120),
  body            text not null default '' check (char_length(body) <= 600),
  image_url       text check (image_url is null or char_length(image_url) <= 500),
  link_url        text check (link_url is null or (char_length(link_url) <= 500 and link_url ~* '^https?://')),
  starts_at       timestamptz,
  ends_at         timestamptz,
  target_paths    text not null default 'semua' check (char_length(target_paths) <= 300),
  max_per_session int  not null default 1 check (max_per_session between 1 and 20),
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

create table popup_stats (
  popup_id bigint not null references popups(id) on delete cascade,
  day      date   not null default current_date,
  views    int    not null default 0,
  clicks   int    not null default 0,
  primary key (popup_id, day)
);

alter table popups enable row level security;
alter table popup_stats enable row level security;
revoke all on popup_stats from anon;

-- Visitors only ever see popups that are enabled and inside their schedule.
create policy "popups: public can read live ones"
  on popups for select
  using (
    enabled
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );
create policy "popups: admin manages"
  on popups for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "popup_stats: admin can read"
  on popup_stats for select to authenticated using (is_admin());

-- Anonymous counter. Whitelisted events only; counts are indicative (public
-- endpoint), not for billing sponsors.
create or replace function track_popup(p_id bigint, p_event text) returns void
  language plpgsql security definer
  set search_path = public
as $$
begin
  if p_event not in ('view', 'click') then return; end if;
  if not exists (select 1 from popups where id = p_id) then return; end if;
  insert into popup_stats (popup_id, day, views, clicks)
  values (p_id, current_date, (p_event = 'view')::int, (p_event = 'click')::int)
  on conflict (popup_id, day) do update
    set views  = popup_stats.views  + excluded.views,
        clicks = popup_stats.clicks + excluded.clicks;
end $$;

revoke all on function track_popup(bigint, text) from public;
grant execute on function track_popup(bigint, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Google AdSense: one publisher id + one numeric slot id per placement
-- ---------------------------------------------------------------------
create table ad_settings (
  id           int primary key default 1 check (id = 1),
  publisher_id text check (publisher_id is null or publisher_id ~ '^ca-pub-[0-9]{10,20}$'),
  enabled      boolean not null default false
);
insert into ad_settings (id) values (1);

create table ad_slots (
  slot_key   text primary key check (slot_key in ('header', 'sidebar', 'in_article', 'footer')),
  label      text not null,
  ad_slot_id text check (ad_slot_id is null or ad_slot_id ~ '^[0-9]{6,20}$'),
  enabled    boolean not null default false
);
insert into ad_slots (slot_key, label) values
  ('header',     'Header (di atas daftar berita)'),
  ('sidebar',    'Di antara kartu berita'),
  ('in_article', 'Di dalam artikel'),
  ('footer',     'Bawah halaman');

alter table ad_settings enable row level security;
alter table ad_slots enable row level security;

-- Public read is required (the ids appear in the page HTML anyway).
create policy "ad_settings: public read" on ad_settings for select using (true);
create policy "ad_slots: public read"    on ad_slots    for select using (true);
create policy "ad_settings: admin manages" on ad_settings for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "ad_slots: admin manages" on ad_slots for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- 6. Media bucket managed by admins (profile photos, popup images,
--    illustrations replaced by editors). Public read, admin-only write.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media', 'site-media', true, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "site-media: public read"
  on storage.objects for select using (bucket_id = 'site-media');
create policy "site-media: admin or editor upload"
  on storage.objects for insert
  with check (bucket_id = 'site-media' and is_editor());
create policy "site-media: admin or editor replace"
  on storage.objects for update
  using (bucket_id = 'site-media' and is_editor());
create policy "site-media: admin or editor delete"
  on storage.objects for delete
  using (bucket_id = 'site-media' and is_editor());
