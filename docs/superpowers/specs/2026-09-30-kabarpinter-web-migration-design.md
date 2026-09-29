# Kabarpinter.com — Migration to Next.js + Vercel + Supabase (Design Spec)

Status: Approved for implementation planning
Date: 2026-09-30
Owner: Hendra (ndikpasowo@gmail.com)

## 1. Background & Purpose

Kabarpinter.com (formerly branded "KabarKini", domain kabarkini.online) is a
PHP news-aggregator site currently hosted on Hostinger. It auto-fetches
Indonesian news RSS feeds, scores them with a "viral score" algorithm, and
displays them across a homepage, category pages, article detail pages, a
"Daily Brief" digest, and several static info pages. The live PHP source is
only reachable through Hostinger's File Manager — there is no git history,
no local copy, and no way for an AI assistant to edit it directly.

Goals of this migration:

1. Move the site to a stack (Next.js on Vercel, source in GitHub) where
   Claude can make and deploy changes directly via git, instead of manual
   File Manager edits.
2. Rebrand fully to **Kabarpinter.com** (new logo: "kabar" / "pinter"
   stacked wordmark, charcoal/cream/amber palette) with a **full visual
   redesign** (not a pixel clone of the current site).
3. Preserve the existing RSS auto-aggregation behavior (6 sources, 15-minute
   refresh, viral scoring).
4. Lay the foundation for a contributor article-submission system (the next
   sub-project, out of scope for this spec beyond the shared `articles`
   schema).

Non-goals for this migration:
- TikTok/Instagram content-generator tooling from the old `dashboard.php`
  (caption/script generators) — not part of the public site, can return
  later as an internal tool if wanted.
- Push notifications, comments, real ad-payment integration.
- Pixel-identical visual clone of the current site — this is a redesign.

## 2. Architecture

```
GitHub (main branch)
   │  push → auto-deploy
   ▼
Vercel  ── Next.js 14 (App Router, TypeScript, Tailwind CSS)
   │  reads/writes via Supabase client (anon key, server-side)
   ▼
Supabase project
   ├─ Postgres: articles, categories, profiles, sources
   ├─ Auth: magic-link login (contributors, editors)
   ├─ Edge Function `fetch-rss`: scheduled every 15 min (pg_cron)
   └─ RLS policies gating read/write by role and status
```

Local repo: `C:\KABARPINTER.COM` (separate from the legacy
`C:\KABARKINI.ONLINE`, which holds the old PHP/mockup material and stays
untouched as reference).

The current Hostinger PHP site keeps running unmodified throughout the
build. `kabarpinter.com` DNS stays pointed at Hostinger until the user
explicitly approves cutover to Vercel at the end (per the user's earlier
instruction: prepare everything including DNS steps, get final approval
before flipping).

## 3. Data Model (Supabase / Postgres)

```sql
-- categories: fixed set matching the current theme taxonomy
create table categories (
  slug text primary key,        -- 'tren-viral', 'kebijakan', 'karir-skill',
                                 -- 'peluang-bisnis', 'umkm', 'ekonomi'
  label text not null,          -- '🔥 Tren Viral' etc.
  priority int not null default 5
);

-- profiles: extends auth.users for contributors/editors
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  role text not null default 'contributor' check (role in ('contributor','editor')),
  created_at timestamptz not null default now()
);

-- sources: the RSS feed list (replaces config.php 'sources' array)
create table sources (
  id serial primary key,
  name text not null,
  feed_url text not null,
  category_slug text references categories(slug),
  trust int not null default 5,
  enabled boolean not null default true
);

-- articles: unified table for RSS-fetched AND contributor-submitted content
create table articles (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('rss','contributor')),
  status text not null default 'draft'
    check (status in ('draft','submitted','published','rejected')),
  title text not null,
  slug text unique not null,
  excerpt text,
  body text,                    -- contributor articles: full body (markdown)
  external_url text,            -- rss articles: link to original source
  image_url text,
  category_slug text references categories(slug),
  score int default 0,          -- viral score, rss only
  source_name text,             -- 'ANTARA Top News' etc, rss only
  contributor_id uuid references profiles(id),  -- contributor articles only
  editor_note text,             -- rejection feedback
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_published_idx
  on articles (status, published_at desc);
create index articles_category_idx on articles (category_slug);
```

RLS summary:
- `articles`: `select` allowed to anyone where `status = 'published'`.
  Contributors can `select`/`update`/`insert` their own rows regardless of
  status. Editors (role check via `profiles.role`) can `select`/`update`
  any row.
- `profiles`: user can read/update own row; editors can read all.
- `sources`, `categories`: public read, no public write (managed via
  Supabase dashboard or a later admin UI).

## 4. RSS Ingestion (Supabase Edge Function `fetch-rss`)

- Triggered every 15 minutes via `pg_cron` calling the Edge Function
  (matches the current `cache_duration: 900`).
- For each row in `sources` where `enabled = true`:
  - Fetch and parse the RSS/XML feed.
  - On fetch/parse failure: log and continue to the next source (mirrors
    current PHP behavior — one dead feed shouldn't block the others).
  - For each item: compute viral score (port of the existing algorithm in
    `config.php`'s `scoring` block — tier keywords, recency, theme match,
    has-image, title length) and theme/category match via keyword lists
    (port of `config.php`'s `themes` block).
  - Upsert into `articles` keyed on `external_url` (dedupe), with
    `source_type='rss'`, `status='published'`, `published_at=now()` (or
    the feed's own pubDate if available).
- Articles below `min_score` (40, same threshold as today) are not stored.
- `slug` generation: kebab-case of the title, truncated to ~60 chars, with
  a short random suffix (e.g. 6 base36 chars) appended on collision. Same
  rule for contributor-submitted articles.

## 5. Contributor Flow (schema/RLS only in this spec)

Full UI is the next sub-project, but the schema above already supports it:
`profiles.role='contributor'` signs up via magic link → creates
`articles` rows with `source_type='contributor'`, `status='draft'` →
`submitted` → an editor flips to `published` or `rejected` (with
`editor_note`). This spec only guarantees the schema/RLS foundation is in
place; the contributor-facing UI is designed and built as its own
sub-project afterward.

## 6. Pages (MVP scope)

Public:
- `/` — Beranda (homepage)
- `/daily-brief` — Daily Brief digest
- `/kategori/[slug]` — category listing
- `/artikel/[slug]` — article detail
- `/cari` — search
- `/tentang`, `/redaksi`, `/pedoman`, `/etika`, `/kontak` — static info
- `/pasang-iklan`, `/rate-card`, `/affiliate`, `/sponsorship` — static info

Contributor/editor (scaffolded now, built out in the next sub-project):
- `/kontributor/masuk` (login), `/kontributor/dashboard`
- `/redaksi/review` (editor queue) — separate from the public `/redaksi`
  info page

## 7. Error Handling

- RSS fetch: per-source try/catch, logged, non-fatal (see §4).
- Public pages: Next.js `notFound()` for missing slugs; empty-state UI
  when a category/search has no results (mirrors current "Belum ada
  berita yang lolos filter" empty state).
- Auth: standard Supabase Auth error surfaces (invalid/expired magic
  link, etc.) shown inline on the login form.

## 8. Testing

- Unit tests (Vitest) for the ported scoring/theme-matching logic —
  direct port of the cases in the legacy `test_algorithm.php`.
- Manual QA checklist before DNS cutover: homepage renders, all 6 RSS
  sources ingest at least one article, each static page renders, 404
  page works, mobile layout check, Lighthouse pass on Core Web Vitals.

## 9. Deployment & Cutover Plan

1. Build and deploy to a Vercel preview URL (`*.vercel.app`) while
   `kabarpinter.com` DNS still points at Hostinger — zero risk to the
   live site during development.
2. Run the QA checklist (§8) against the preview URL.
3. Prepare exact DNS change instructions for Hostinger (A/CNAME records
   per Vercel's custom-domain setup) but do **not** apply them yet.
4. Present the finished preview + DNS instructions to the user for final
   go/no-go approval (per user's stated preference: prepare everything,
   approve once at the end).
5. On approval, apply the DNS change; keep the Hostinger PHP files in
   place (untouched, not deleted) for a rollback window.

## 10. Environment / Secrets

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Vercel env vars.
- Supabase service-role key — used only inside the Edge Function
  (Supabase secret store, never exposed to the Next.js client).
- No other third-party API keys required for MVP (RSS feeds are public).

## 11. Open Assumptions

- Magic-link auth (no passwords) for contributors/editors — can switch to
  password auth later if the user prefers.
- Supabase free tier is sufficient to start (Postgres + Auth + Edge
  Functions all within free-tier limits for this traffic level).
- Vercel Hobby (free) tier is sufficient for the Next.js app itself since
  the cron-sensitive workload (RSS fetch) lives in Supabase, not Vercel.
