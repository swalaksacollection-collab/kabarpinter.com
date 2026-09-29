-- 0001_init.sql
create table categories (
  slug text primary key,
  label text not null,
  priority int not null default 5
);

create table sources (
  id serial primary key,
  name text not null,
  feed_url text not null,
  category_slug text references categories(slug),
  trust int not null default 5,
  enabled boolean not null default true
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  role text not null default 'contributor' check (role in ('contributor','editor')),
  created_at timestamptz not null default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('rss','contributor')),
  status text not null default 'draft'
    check (status in ('draft','submitted','published','rejected')),
  title text not null,
  slug text unique not null,
  excerpt text,
  body text,
  external_url text,
  image_url text,
  category_slug text references categories(slug),
  score int not null default 0,
  source_name text,
  contributor_id uuid references profiles(id),
  editor_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_published_idx
  on articles (status, published_at desc);
create index articles_category_idx on articles (category_slug);
create unique index articles_external_url_idx
  on articles (external_url) where external_url is not null;

-- RLS
alter table categories enable row level security;
alter table sources enable row level security;
alter table profiles enable row level security;
alter table articles enable row level security;

-- security definer helper: checking role via a plain subquery on profiles,
-- from inside a policy ON profiles, causes "infinite recursion detected in
-- policy for relation profiles" (the subquery re-triggers profiles' own
-- SELECT policies). This function runs as its owner (postgres, a
-- superuser), which bypasses RLS instead of re-entering it — Supabase's
-- documented pattern for this exact problem. It's also reused by the
-- articles policies below so they don't hit the same recursion via their
-- own subquery into profiles.
create function is_editor() returns boolean
  language sql security definer stable
  set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'editor'
  );
$$;

create policy "categories are publicly readable"
  on categories for select using (true);

create policy "sources are publicly readable"
  on sources for select using (true);

create policy "profiles: user can read own row"
  on profiles for select using (auth.uid() = id);
create policy "profiles: user can update own row"
  on profiles for update using (auth.uid() = id);
create policy "profiles: editors can read all"
  on profiles for select using (is_editor());

create policy "articles: public can read published"
  on articles for select using (status = 'published');
create policy "articles: contributor can read own"
  on articles for select using (contributor_id = auth.uid());
create policy "articles: contributor can insert own"
  on articles for insert with check (contributor_id = auth.uid());
create policy "articles: contributor can update own draft/submitted"
  on articles for update using (
    contributor_id = auth.uid() and status in ('draft','submitted')
  );
create policy "articles: editors can read all"
  on articles for select using (is_editor());
create policy "articles: editors can update all"
  on articles for update using (is_editor());
