# Kabarpinter.com Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Kabarpinter.com as a Next.js app (Vercel + Supabase), fully rebranded, with the existing RSS-aggregation behavior preserved and the contributor-flow database foundation in place — deployed to a Vercel preview URL, with the Hostinger PHP site left untouched until final DNS cutover approval.

**Architecture:** Next.js 14 App Router (TypeScript, Tailwind) reads published articles from Supabase Postgres via server components. A Supabase Edge Function (`fetch-rss`), scheduled every 15 minutes via `pg_cron`, ingests 6 RSS sources into the same `articles` table contributors will later write to. Repo lives at `C:\KABARPINTER.COM`, pushed to GitHub, auto-deployed by Vercel on push to `main`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Vitest, Supabase (Postgres/Auth/Edge Functions/Deno), Vercel.

**Spec:** `docs/superpowers/specs/2026-09-30-kabarpinter-web-migration-design.md`

## Global Constraints

- Node 24 / npm 11 (confirmed installed locally) — use npm, not pnpm/yarn.
- No `gh` CLI available in this environment — GitHub repo creation is a manual step for the human partner (Task 19); everything else is done by the agent via MCP tools or shell.
- Brand palette (from the approved icon/logo work): charcoal `#1F1D1A`, cream `#FAF7F2`, amber `#C26A1A`. Logo wordmark: "kabar" (cream) stacked over "pinter" (amber) for the square mark; "Kabar" + amber "Pinter" inline for the header wordmark.
- `min_score` threshold for storing an RSS article: 40 (unchanged from the legacy `config.php`).
- RSS refresh cadence: every 15 minutes (`pg_cron`, not Vercel Cron — Vercel Hobby only allows daily cron).
- The Hostinger PHP site at kabarkini.online / kabarpinter.com is NOT touched by any task in this plan. DNS stays pointed at Hostinger until the human partner approves cutover (Task 22 only writes instructions, it does not apply them).
- TDD is applied to logic-bearing code (scoring, slug generation, search filtering, RSS item parsing). Presentational React Server Component pages are verified by running the dev server and checking rendered output — they do not get component-test scaffolding in this plan (YAGNI: no test framework for that exists yet in this repo, and adding one is out of scope).

## Review Focus

- A feed source that returns malformed/non-XML content (e.g., an HTML error page) must not crash the whole ingestion run — Task 17 tests this.
- An article title/excerpt containing raw HTML or special characters must render safely (no injection) on article pages — Task 12 uses React's default escaping (no `dangerouslySetInnerHTML` for RSS content) — flagged as a constraint, not a separate test.
- A category slug or article slug that doesn't exist must 404 cleanly, not throw — Task 11 and Task 12 test this.
- Two RSS items from different sources with the same title but different URLs must both be kept (dedupe key is `external_url`, not title) — Task 17 tests this.
- The search page with an empty or whitespace-only query must show all articles (or a sensible empty state), not crash — Task 14 tests this.
- Two RSS items whose titles slugify identically but have different `external_url`s must not collide on the `articles.slug` unique constraint — Task 17's `slugify` appends a hash of the link (caught and fixed during self-review).

---

### Task 1: Scaffold the Next.js project and brand design tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `app/layout.tsx`, `app/globals.css`, `.gitignore`, `.env.local.example`
- Create: `public/favicon.ico`, `public/favicon-16x16.png`, `public/favicon-32x32.png`, `public/apple-touch-icon.png`, `public/android-chrome-192x192.png`, `public/android-chrome-512x512.png`, `public/logo.png` (copied from `C:\KABARKINI.ONLINE`)
- Create: `public/site.webmanifest`

**Interfaces:**
- Produces: Tailwind theme tokens `brand.charcoal` (#1F1D1A), `brand.cream` (#FAF7F2), `brand.amber` (#C26A1A) — consumed by every component task from here on.

- [ ] **Step 1: Scaffold the app**

```bash
cd "C:\KABARPINTER.COM"
npm create next-app@latest . -- --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
```

Answer "Yes" to overwrite if it asks about the existing `docs/` folder being present — it will only scaffold alongside it, not touch it.

- [ ] **Step 2: Add brand tokens to `tailwind.config.ts`**

Open the generated `tailwind.config.ts` and add to `theme.extend.colors`:

```ts
colors: {
  brand: {
    charcoal: "#1F1D1A",
    cream: "#FAF7F2",
    amber: "#C26A1A",
    olive: "#4A6B2C",
  },
},
```

- [ ] **Step 3: Copy the already-approved brand assets**

```bash
cp "C:\KABARKINI.ONLINE\favicon.ico" "C:\KABARPINTER.COM\public\favicon.ico"
cp "C:\KABARKINI.ONLINE\favicon-16x16.png" "C:\KABARPINTER.COM\public\favicon-16x16.png"
cp "C:\KABARKINI.ONLINE\favicon-32x32.png" "C:\KABARPINTER.COM\public\favicon-32x32.png"
cp "C:\KABARKINI.ONLINE\apple-touch-icon.png" "C:\KABARPINTER.COM\public\apple-touch-icon.png"
cp "C:\KABARKINI.ONLINE\android-chrome-192x192.png" "C:\KABARPINTER.COM\public\android-chrome-192x192.png"
cp "C:\KABARKINI.ONLINE\android-chrome-512x512.png" "C:\KABARPINTER.COM\public\android-chrome-512x512.png"
cp "C:\KABARKINI.ONLINE\logo.png" "C:\KABARPINTER.COM\public\logo.png"
```

- [ ] **Step 4: Write `public/site.webmanifest`**

```json
{
  "name": "Kabarpinter.com",
  "short_name": "Kabarpinter",
  "description": "Tren, peluang, karir, dan UMKM Indonesia.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAF7F2",
  "theme_color": "#1F1D1A",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 5: Wire icons into `app/layout.tsx`**

Replace the generated `metadata` export with:

```ts
export const metadata: Metadata = {
  title: "Kabarpinter.com — Tren, Peluang, Karir & UMKM Indonesia",
  description: "Portal berita tren viral, kebijakan, peluang karir, dan cerita UMKM Indonesia.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};
```

- [ ] **Step 6: Verify it builds and runs**

```bash
npm run build
```

Expected: build succeeds with the default Next.js starter page.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Kabarpinter.com brand tokens and icons"
```

---

### Task 2: Provision the Supabase project

**Files:**
- Create: `.env.local` (not committed — add to `.gitignore` if not already there)

**Interfaces:**
- Produces: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars, and a Supabase `project_id` string recorded in this task's own notes for later tasks to reuse.

- [ ] **Step 1: List organizations**

Call the Supabase MCP tool `list_organizations` (no args). Ask the human partner which organization to use if more than one is returned.

- [ ] **Step 2: Create the project**

Call `create_project` with `name: "kabarpinter-com"`, `region` closest to the target audience (Indonesia → `ap-southeast-1`), and the chosen `organization_id`. This requires cost confirmation — follow the tool's `confirm_cost` flow if prompted.

- [ ] **Step 3: Wait for it to initialize, then fetch URL/keys**

Poll `get_project` until `status` is `ACTIVE_HEALTHY`. Then call `get_project_url` and `get_publishable_keys` with the new `project_id`.

- [ ] **Step 4: Write `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=<value from get_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key from get_publishable_keys>
```

- [ ] **Step 5: Confirm `.env.local` is gitignored**

```bash
grep -n "^\.env" "C:\KABARPINTER.COM\.gitignore"
```

Expected: `.env*.local` is already present (Next.js's default `.gitignore` includes it). If not, append it.

- [ ] **Step 6: Write `.env.local.example` (safe to commit)**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 7: Commit**

```bash
git add .env.local.example
git commit -m "chore: add Supabase env var template"
```

---

### Task 3: Database schema and RLS migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tables `categories(slug, label, priority)`, `sources(id, name, feed_url, category_slug, trust, enabled)`, `profiles(id, display_name, bio, role, created_at)`, `articles(id, source_type, status, title, slug, excerpt, body, external_url, image_url, category_slug, score, source_name, contributor_id, editor_note, published_at, created_at, updated_at)`.

- [ ] **Step 1: Write the migration SQL**

```sql
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

create policy "categories are publicly readable"
  on categories for select using (true);

create policy "sources are publicly readable"
  on sources for select using (true);

create policy "profiles: user can read own row"
  on profiles for select using (auth.uid() = id);
create policy "profiles: user can update own row"
  on profiles for update using (auth.uid() = id);
create policy "profiles: editors can read all"
  on profiles for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'editor')
  );

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
  on articles for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'editor')
  );
create policy "articles: editors can update all"
  on articles for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'editor')
  );
```

- [ ] **Step 2: Apply the migration**

Call the Supabase MCP tool `apply_migration` with `project_id` (from Task 2), `name: "init_schema"`, and `query` set to the SQL above.

- [ ] **Step 3: Verify the tables exist**

Call `execute_sql` with `query: "select table_name from information_schema.tables where table_schema = 'public' order by 1;"`. Expected: `articles`, `categories`, `profiles`, `sources` are all listed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add articles/categories/sources/profiles schema with RLS"
```

---

### Task 4: Seed categories and RSS sources

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Write the seed data** (ported 1:1 from the legacy `config.php`)

```sql
insert into categories (slug, label, priority) values
  ('tren-viral', '🔥 Tren Hari Ini', 10),
  ('peluang-bisnis', '💡 Peluang Bisnis', 10),
  ('karir-skill', '💼 Karir & Skill', 9),
  ('konsumen-data', '📊 Tren Konsumen', 8),
  ('ekspor-impor', '🌏 Ekspor-Impor', 8),
  ('umkm-inspirasi', '🚀 Kisah UMKM', 9),
  ('ekonomi-uang', '💰 Ekonomi & Uang', 7),
  ('politik', '🏛️ Politik', 5);

insert into sources (name, feed_url, category_slug, trust) values
  ('ANTARA Top News', 'https://www.antaranews.com/rss/top-news.xml', null, 10),
  ('ANTARA Ekonomi', 'https://www.antaranews.com/rss/ekonomi.xml', 'ekonomi-uang', 10),
  ('ANTARA Politik', 'https://www.antaranews.com/rss/politik.xml', 'politik', 10),
  ('Tribunnews', 'https://www.tribunnews.com/rss', 'tren-viral', 7),
  ('Liputan6 News', 'https://feed.liputan6.com/rss/news', null, 9),
  ('Kontan', 'https://www.kontan.co.id/feed', 'ekonomi-uang', 9);
```

- [ ] **Step 2: Apply it**

Call `execute_sql` with `project_id` and the SQL above (seed data is DML, not DDL, so `execute_sql` is correct here — not `apply_migration`).

- [ ] **Step 3: Verify**

Call `execute_sql` with `query: "select count(*) from categories; select count(*) from sources;"`. Expected: 8 categories, 6 sources.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: seed categories and RSS sources"
```

---

### Task 5: Port the viral-scoring and theme-matching algorithm (TDD)

**Files:**
- Create: `lib/scoring.ts`
- Test: `lib/scoring.test.ts`

**Interfaces:**
- Produces: `scoreArticle(input: ScoringInput): number`, `matchTheme(text: string): string | null`, `type ScoringInput = { title: string; publishedAt: Date; now: Date; hasImage: boolean; }`
- Consumes: nothing (pure functions).

- [ ] **Step 1: Install Vitest**

```bash
cd "C:\KABARPINTER.COM"
npm install -D vitest
```

Add to `package.json` `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing tests**

```ts
// lib/scoring.test.ts
import { describe, it, expect } from "vitest";
import { scoreArticle, matchTheme, THEME_KEYWORDS } from "./scoring";

describe("scoreArticle", () => {
  it("scores a fresh, viral-keyword, on-theme, imaged article highly", () => {
    const score = scoreArticle({
      title: "Viral! Bisnis Modal Kecil Bikin Untung Besar",
      publishedAt: new Date("2026-09-30T10:00:00Z"),
      now: new Date("2026-09-30T10:30:00Z"),
      hasImage: true,
    });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("scores a stale article with no keywords and no image low", () => {
    const score = scoreArticle({
      title: "Laporan Rapat Tahunan Perusahaan",
      publishedAt: new Date("2026-09-25T10:00:00Z"),
      now: new Date("2026-09-30T10:00:00Z"),
      hasImage: false,
    });
    expect(score).toBeLessThan(40);
  });

  it("gives zero recency points past the 48h window", () => {
    const score = scoreArticle({
      title: "Berita Biasa",
      publishedAt: new Date("2026-09-01T00:00:00Z"),
      now: new Date("2026-09-30T00:00:00Z"),
      hasImage: false,
    });
    // recency contributes 0, so total score must be well below a fresh equivalent
    const freshScore = scoreArticle({
      title: "Berita Biasa",
      publishedAt: new Date("2026-09-30T00:00:00Z"),
      now: new Date("2026-09-30T00:05:00Z"),
      hasImage: false,
    });
    expect(score).toBeLessThan(freshScore);
  });
});

describe("matchTheme", () => {
  it("matches 'peluang bisnis' keywords over other themes", () => {
    expect(matchTheme("Peluang Usaha Modal Kecil untuk Reseller")).toBe("peluang-bisnis");
  });

  it("matches 'karir & skill' keywords", () => {
    expect(matchTheme("Lowongan Kerja Fresh Graduate, Ini Syaratnya")).toBe("karir-skill");
  });

  it("returns null when nothing matches", () => {
    expect(matchTheme("Resep Masakan Rumahan Sehari-hari")).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run
```

Expected: FAIL — `lib/scoring.ts` does not exist yet.

- [ ] **Step 4: Implement `lib/scoring.ts`**

```ts
// lib/scoring.ts
export type ScoringInput = {
  title: string;
  publishedAt: Date;
  now: Date;
  hasImage: boolean;
};

const VIRAL_KEYWORDS = {
  tier1: ["viral", "heboh", "geger", "mengejutkan", "terungkap", "bocor", "cuan", "untung besar"],
  tier2: ["rahasia", "fakta", "inilah", "ternyata", "bikin", "tips", "cara", "peluang"],
  tier3: ["pertama", "baru", "terbaru", "eksklusif", "curhat", "cerita", "penting", "wajib"],
};

export const THEME_KEYWORDS: Record<string, string[]> = {
  "tren-viral": ["viral", "tren", "fyp", "tiktok", "mendunia", "fenomena", "heboh", "ramai", "gen z", "milenial", "lifestyle"],
  "peluang-bisnis": ["peluang", "bisnis", "usaha", "cuan", "untung", "modal kecil", "omset", "omzet", "jualan", "reseller", "dropship", "side hustle", "wirausaha"],
  "karir-skill": ["lowongan", "kerja", "karir", "gaji", "skill", "sertifikasi", "pelatihan", "fresh graduate", "wfh", "remote", "freelance", "lpdp", "beasiswa", "magang", "cpns", "pppk", "bumn"],
  "konsumen-data": ["konsumen", "belanja", "shopee", "tokopedia", "tiktok shop", "live shopping", "preferensi", "data", "survei", "riset", "gaya hidup", "kebiasaan"],
  "ekspor-impor": ["ekspor", "impor", "china", "temu", "tiongkok", "umkm go global", "bea cukai", "tarif", "kuota", "produk lokal", "sourcing", "supplier"],
  "umkm-inspirasi": ["umkm", "umkm sukses", "pengusaha muda", "startup", "founder", "mahasiswa bisnis", "modal nekat", "bangkrut", "gagal", "comeback", "sukses", "inspiratif"],
  "ekonomi-uang": ["rupiah", "dolar", "saham", "ihsg", "bitcoin", "kripto", "inflasi", "bbm", "subsidi", "pajak", "investasi", "reksadana", "emas", "bank indonesia"],
  politik: ["prabowo", "jokowi", "gibran", "pdip", "gerindra", "dpr", "menteri", "pilkada", "demo", "kpk", "korupsi"],
};

const WEIGHTS = {
  viralKeyword: 25,
  recency: 20,
  themeMatch: 35,
  hasImage: 10,
  titleLength: 5,
  emotion: 5,
};

const RECENCY_MAX_HOURS = 48;
const RECENCY_PEAK_HOURS = 2;

function viralKeywordScore(title: string): number {
  const t = title.toLowerCase();
  if (VIRAL_KEYWORDS.tier1.some((k) => t.includes(k))) return WEIGHTS.viralKeyword;
  if (VIRAL_KEYWORDS.tier2.some((k) => t.includes(k))) return WEIGHTS.viralKeyword * 0.6;
  if (VIRAL_KEYWORDS.tier3.some((k) => t.includes(k))) return WEIGHTS.viralKeyword * 0.3;
  return 0;
}

function recencyScore(publishedAt: Date, now: Date): number {
  const hours = (now.getTime() - publishedAt.getTime()) / 3_600_000;
  if (hours <= RECENCY_PEAK_HOURS) return WEIGHTS.recency;
  if (hours >= RECENCY_MAX_HOURS) return 0;
  const decay = 1 - (hours - RECENCY_PEAK_HOURS) / (RECENCY_MAX_HOURS - RECENCY_PEAK_HOURS);
  return WEIGHTS.recency * Math.max(0, decay);
}

export function matchTheme(text: string): string | null {
  const t = text.toLowerCase();
  let best: { slug: string; hits: number } | null = null;
  for (const [slug, keywords] of Object.entries(THEME_KEYWORDS)) {
    const hits = keywords.filter((k) => t.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { slug, hits };
    }
  }
  return best?.slug ?? null;
}

export function scoreArticle(input: ScoringInput): number {
  let score = 0;
  score += viralKeywordScore(input.title);
  score += recencyScore(input.publishedAt, input.now);
  score += matchTheme(input.title) ? WEIGHTS.themeMatch : 0;
  score += input.hasImage ? WEIGHTS.hasImage : 0;
  score += input.title.length >= 30 && input.title.length <= 90 ? WEIGHTS.titleLength : 0;
  score += /[!?]/.test(input.title) ? WEIGHTS.emotion : 0;
  return Math.round(score);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run
```

Expected: PASS, all 6 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/scoring.ts lib/scoring.test.ts package.json package-lock.json
git commit -m "feat: port viral-scoring and theme-matching algorithm with tests"
```

---

### Task 6: Slug generation utility (TDD)

**Files:**
- Create: `lib/slug.ts`
- Test: `lib/slug.test.ts`

**Interfaces:**
- Produces: `slugify(title: string, existingSlugs: Set<string>): string`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/slug.test.ts
import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("converts a title to kebab-case", () => {
    expect(slugify("Gaji PPPK Daerah Ditanggung Pusat", new Set())).toBe(
      "gaji-pppk-daerah-ditanggung-pusat"
    );
  });

  it("strips punctuation", () => {
    expect(slugify("Untung Besar?! Ini Caranya.", new Set())).toBe("untung-besar-ini-caranya");
  });

  it("truncates to ~60 chars", () => {
    const long = "a".repeat(100);
    expect(slugify(long, new Set()).length).toBeLessThanOrEqual(60);
  });

  it("appends a random suffix on collision", () => {
    const existing = new Set(["gaji-pppk"]);
    const result = slugify("Gaji PPPK", existing);
    expect(result).not.toBe("gaji-pppk");
    expect(result.startsWith("gaji-pppk-")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/slug.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/slug.ts
function baseSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function slugify(title: string, existingSlugs: Set<string>): string {
  const base = baseSlug(title);
  if (!existingSlugs.has(base)) return base;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run lib/slug.test.ts
```

Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/slug.ts lib/slug.test.ts
git commit -m "feat: add slug generation utility with collision handling"
```

---

### Task 7: Supabase client helpers and shared types

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/types.ts`
- Modify: `package.json` (add `@supabase/supabase-js`, `@supabase/ssr`)

**Interfaces:**
- Produces: `createServerClient(): SupabaseClient`, `createBrowserClient(): SupabaseClient`, `type Article`, `type Category`

- [ ] **Step 1: Install dependencies**

```bash
cd "C:\KABARPINTER.COM"
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Write shared types**

```ts
// lib/types.ts
export type Category = {
  slug: string;
  label: string;
  priority: number;
};

export type Article = {
  id: string;
  source_type: "rss" | "contributor";
  status: "draft" | "submitted" | "published" | "rejected";
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  external_url: string | null;
  image_url: string | null;
  category_slug: string | null;
  score: number;
  source_name: string | null;
  contributor_id: string | null;
  editor_note: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 3: Write the server client**

```ts
// lib/supabase/server.ts
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

- [ ] **Step 4: Write the browser client**

```ts
// lib/supabase/client.ts
import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 5: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/supabase package.json package-lock.json
git commit -m "feat: add Supabase client helpers and shared Article/Category types"
```

---

### Task 8: Article data-access layer and search filtering (TDD for pure logic)

**Files:**
- Create: `lib/articles.ts`
- Test: `lib/search.test.ts`, `lib/search.ts` (pure filter, extracted for testability)

**Interfaces:**
- Consumes: `createServerClient` (Task 7), `type Article` (Task 7)
- Produces: `getPublishedArticles(limit?: number): Promise<Article[]>`, `getArticlesByCategory(slug: string): Promise<Article[]>`, `getArticleBySlug(slug: string): Promise<Article | null>`, `filterArticles(articles: Article[], query: string): Article[]`

- [ ] **Step 1: Write the failing test for the pure search filter**

```ts
// lib/search.test.ts
import { describe, it, expect } from "vitest";
import { filterArticles } from "./search";
import type { Article } from "./types";

const sample: Article[] = [
  { id: "1", title: "Gaji PPPK Naik 6.5%", excerpt: "Kenaikan gaji tahun depan" } as Article,
  { id: "2", title: "Resep Nasi Goreng", excerpt: "Masakan rumahan" } as Article,
];

describe("filterArticles", () => {
  it("matches on title, case-insensitive", () => {
    expect(filterArticles(sample, "gaji").map((a) => a.id)).toEqual(["1"]);
  });

  it("matches on excerpt too", () => {
    expect(filterArticles(sample, "masakan").map((a) => a.id)).toEqual(["2"]);
  });

  it("returns all articles for an empty/whitespace query", () => {
    expect(filterArticles(sample, "   ")).toHaveLength(2);
    expect(filterArticles(sample, "")).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterArticles(sample, "zzz-no-match")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/search.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pure filter**

```ts
// lib/search.ts
import type { Article } from "./types";

export function filterArticles(articles: Article[], rawQuery: string): Article[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return articles;
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      (a.excerpt ?? "").toLowerCase().includes(query)
  );
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run lib/search.test.ts
```

Expected: PASS, all 4 tests.

- [ ] **Step 5: Implement the Supabase-backed data access functions**

```ts
// lib/articles.ts
import { createServerClient } from "./supabase/server";
import type { Article } from "./types";

export async function getPublishedArticles(limit = 30): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .eq("category_slug", categorySlug)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/articles.ts lib/search.ts lib/search.test.ts
git commit -m "feat: add article data-access layer and search filtering"
```

---

### Task 9: Logo, Header, and Footer components

**Files:**
- Create: `components/Logo.tsx`, `components/Header.tsx`, `components/Footer.tsx`
- Modify: `app/layout.tsx` (render Header/Footer around `{children}`)

**Interfaces:**
- Produces: `<Logo />`, `<Header />`, `<Footer />` — consumed by `app/layout.tsx` and reused by every page task below.

- [ ] **Step 1: Write `components/Logo.tsx`**

```tsx
// components/Logo.tsx
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="text-2xl font-bold tracking-tight">
      <span className="text-brand-charcoal">Kabar</span>
      <span className="text-brand-amber">Pinter</span>
    </Link>
  );
}
```

- [ ] **Step 2: Write `components/Header.tsx`**

```tsx
// components/Header.tsx
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/daily-brief", label: "Daily Brief" },
  { href: "/kategori/tren-viral", label: "Tren Viral" },
  { href: "/kategori/karir-skill", label: "Karir & Skill" },
  { href: "/kategori/peluang-bisnis", label: "Peluang Bisnis" },
  { href: "/kategori/umkm-inspirasi", label: "UMKM" },
  { href: "/kategori/ekonomi-uang", label: "Ekonomi" },
];

export function Header() {
  return (
    <header className="border-b border-brand-charcoal/10 bg-brand-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <a
          href="/cari"
          className="rounded-full bg-brand-charcoal px-4 py-2 text-sm text-brand-cream"
        >
          Cari
        </a>
      </div>
      <nav className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3">
        <ul className="flex gap-4 text-sm text-brand-charcoal/80">
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="whitespace-nowrap hover:text-brand-amber">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Write `components/Footer.tsx`**

```tsx
// components/Footer.tsx
export function Footer() {
  return (
    <footer className="mt-16 border-t border-brand-charcoal/10 bg-brand-charcoal py-10 text-brand-cream">
      <div className="mx-auto max-w-6xl px-4 text-sm">
        <p className="text-lg font-bold">
          Kabar<span className="text-brand-amber">Pinter</span>
        </p>
        <p className="mt-2 max-w-xl text-brand-cream/70">
          Portal berita tren viral, kebijakan, peluang karir, dan cerita UMKM
          Indonesia. Dikurasi otomatis, sebagian ditulis oleh kontributor.
        </p>
        <p className="mt-6 text-brand-cream/50">
          © {new Date().getFullYear()} Kabarpinter.com
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Wire into `app/layout.tsx`**

Import `Header` and `Footer`, and wrap `{children}`:

```tsx
<body>
  <Header />
  {children}
  <Footer />
</body>
```

- [ ] **Step 5: Verify visually**

```bash
npm run dev
```

Open `http://localhost:3000` and confirm the header shows the "KabarPinter" wordmark and nav, and the footer renders at the bottom. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 6: Commit**

```bash
git add components app/layout.tsx
git commit -m "feat: add Logo, Header, and Footer components"
```

---

### Task 10: Homepage

**Files:**
- Create: `app/page.tsx`, `components/ArticleCard.tsx`

**Interfaces:**
- Consumes: `getPublishedArticles` (Task 8), `<Header>`/`<Footer>` (Task 9, already in layout)
- Produces: `<ArticleCard article={article} />` — reused by Task 11, 13, 14.

- [ ] **Step 1: Write `components/ArticleCard.tsx`**

```tsx
// components/ArticleCard.tsx
import Link from "next/link";
import type { Article } from "@/lib/types";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="block rounded-lg border border-brand-charcoal/10 p-4 hover:border-brand-amber"
    >
      {article.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image_url}
          alt=""
          className="mb-3 h-40 w-full rounded object-cover"
        />
      )}
      <p className="text-xs uppercase tracking-wide text-brand-amber">
        {article.category_slug ?? "Umum"}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-brand-charcoal">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="mt-2 text-sm text-brand-charcoal/70">{article.excerpt}</p>
      )}
      <p className="mt-3 text-xs text-brand-charcoal/50">
        {article.source_name ?? "Kontributor"}
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: Write `app/page.tsx`**

```tsx
// app/page.tsx
import { getPublishedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";

export const revalidate = 60;

export default async function HomePage() {
  const articles = await getPublishedArticles(30);

  if (articles.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-brand-charcoal/60">
        <p>Belum ada berita yang lolos filter 😴</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">Beranda</h1>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Confirm `http://localhost:3000` renders the empty state (no data seeded yet — that's expected until Task 17/18 run). Stop the server once confirmed it doesn't crash.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/ArticleCard.tsx
git commit -m "feat: add homepage with article grid and empty state"
```

---

### Task 11: Category page

**Files:**
- Create: `app/kategori/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getArticlesByCategory` (Task 8), `<ArticleCard>` (Task 10)

- [ ] **Step 1: Write the page with 404 handling**

```tsx
// app/kategori/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getArticlesByCategory } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

async function getCategory(slug: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const articles = await getArticlesByCategory(slug);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">{category.label}</h1>
      {articles.length === 0 ? (
        <p className="mt-6 text-brand-charcoal/60">Belum ada berita di kategori ini.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify 404 behavior manually**

```bash
npm run dev
```

Visit `http://localhost:3000/kategori/does-not-exist` — expect the Next.js 404 page. Visit `http://localhost:3000/kategori/tren-viral` — expect the empty-state message (no articles seeded yet). Stop the server.

- [ ] **Step 3: Commit**

```bash
git add app/kategori
git commit -m "feat: add category listing page with 404 for unknown slugs"
```

---

### Task 12: Article detail page

**Files:**
- Create: `app/artikel/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getArticleBySlug` (Task 8)

- [ ] **Step 1: Write the page**

```tsx
// app/artikel/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/articles";

export const revalidate = 60;

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-brand-amber">
        {article.category_slug ?? "Umum"}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-brand-charcoal">{article.title}</h1>
      <p className="mt-2 text-sm text-brand-charcoal/50">
        {article.source_name ?? "Kontributor"}
      </p>
      {article.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image_url}
          alt=""
          className="mt-6 w-full rounded-lg object-cover"
        />
      )}
      {article.excerpt && (
        <p className="mt-6 text-lg text-brand-charcoal/80">{article.excerpt}</p>
      )}
      {article.body && (
        <div className="prose mt-6 max-w-none text-brand-charcoal">{article.body}</div>
      )}
      {article.external_url && (
        <a
          href={article.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block text-brand-amber underline"
        >
          Baca sumber asli →
        </a>
      )}
    </main>
  );
}
```

Note: `{article.title}`, `{article.excerpt}`, `{article.body}` are rendered as plain JSX children (React escapes them automatically) — never switch this to `dangerouslySetInnerHTML` for RSS-sourced content, per Global Constraints.

- [ ] **Step 2: Verify 404 behavior manually**

```bash
npm run dev
```

Visit `http://localhost:3000/artikel/does-not-exist` — expect the Next.js 404 page. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add app/artikel
git commit -m "feat: add article detail page with safe rendering and 404 handling"
```

---

### Task 13: Daily Brief page

**Files:**
- Create: `app/daily-brief/page.tsx`

**Interfaces:**
- Consumes: `getPublishedArticles` (Task 8), `<ArticleCard>` (Task 10)

- [ ] **Step 1: Write the page** (top 5 by score, mirrors the old "5 hal yang perlu Anda tahu")

```tsx
// app/daily-brief/page.tsx
import { getPublishedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";

export const revalidate = 60;

export default async function DailyBriefPage() {
  const articles = await getPublishedArticles(50);
  const top5 = [...articles].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">Daily Brief</h1>
      <p className="mt-2 text-brand-charcoal/60">5 hal yang perlu Anda tahu hari ini</p>
      {top5.length === 0 ? (
        <p className="mt-6 text-brand-charcoal/60">Belum ada berita untuk brief hari ini.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {top5.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Visit `http://localhost:3000/daily-brief`, confirm it renders (empty state expected pre-seed). Stop the server.

- [ ] **Step 3: Commit**

```bash
git add app/daily-brief
git commit -m "feat: add Daily Brief page (top 5 by score)"
```

---

### Task 14: Search page

**Files:**
- Create: `app/cari/page.tsx`

**Interfaces:**
- Consumes: `getPublishedArticles` (Task 8), `filterArticles` (Task 8), `<ArticleCard>` (Task 10)

- [ ] **Step 1: Write the page**

```tsx
// app/cari/page.tsx
import { getPublishedArticles } from "@/lib/articles";
import { filterArticles } from "@/lib/search";
import { ArticleCard } from "@/components/ArticleCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const all = await getPublishedArticles(100);
  const results = filterArticles(all, q);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">Cari Berita</h1>
      <form className="mt-6" action="/cari">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cari judul atau topik..."
          className="w-full max-w-md rounded border border-brand-charcoal/20 px-4 py-2"
        />
      </form>
      {results.length === 0 ? (
        <p className="mt-6 text-brand-charcoal/60">
          {q.trim() ? `Tidak ada hasil untuk "${q}".` : "Belum ada berita."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
```

(The empty/whitespace-query case is already covered by `filterArticles`'s own test in Task 8 — this page just passes `q` straight through.)

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Visit `http://localhost:3000/cari` and `http://localhost:3000/cari?q=test`, confirm neither crashes. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add app/cari
git commit -m "feat: add search page"
```

---

### Task 15: Static info pages

**Files:**
- Create: `components/StaticPage.tsx`
- Create: `app/tentang/page.tsx`, `app/redaksi/page.tsx`, `app/pedoman/page.tsx`, `app/etika/page.tsx`, `app/kontak/page.tsx`, `app/pasang-iklan/page.tsx`, `app/rate-card/page.tsx`, `app/affiliate/page.tsx`, `app/sponsorship/page.tsx`

- [ ] **Step 1: Write the shared layout component**

```tsx
// components/StaticPage.tsx
export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">{title}</h1>
      <div className="prose mt-6 max-w-none text-brand-charcoal/80">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Write each static page**

```tsx
// app/tentang/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Tentang Kami">
      <p>
        Kabarpinter.com adalah portal berita yang fokus pada tren viral,
        kebijakan pemerintah, peluang karir, dan cerita UMKM Indonesia.
        Sebagian berita kami kurasi otomatis dari sumber terpercaya, dan
        sebagian ditulis langsung oleh kontributor kami.
      </p>
    </StaticPage>
  );
}
```

```tsx
// app/redaksi/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Tim Redaksi">
      <p>
        Kabarpinter.com dikelola oleh tim redaksi kecil yang meninjau setiap
        artikel kontributor sebelum tayang, dan mengawasi kurasi berita
        otomatis dari sumber-sumber terpercaya.
      </p>
    </StaticPage>
  );
}
```

```tsx
// app/pedoman/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Pedoman Media Siber">
      <p>
        Kabarpinter.com berkomitmen mengikuti Pedoman Media Siber Dewan Pers:
        akurasi, keberimbangan, dan mencantumkan sumber asli untuk setiap
        berita yang kami kurasi.
      </p>
    </StaticPage>
  );
}
```

```tsx
// app/etika/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Kode Etik">
      <p>
        Kami tidak mempublikasikan informasi yang belum terverifikasi, selalu
        mencantumkan sumber, dan memberi hak jawab kepada pihak yang merasa
        dirugikan oleh pemberitaan kami.
      </p>
    </StaticPage>
  );
}
```

```tsx
// app/kontak/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Kontak">
      <p>
        Punya pertanyaan, koreksi, atau ingin bekerja sama? Hubungi kami di{" "}
        <a href="mailto:redaksi@kabarpinter.com">redaksi@kabarpinter.com</a>.
      </p>
    </StaticPage>
  );
}
```

```tsx
// app/pasang-iklan/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Pasang Iklan">
      <p>
        Tertarik memasangkan iklan di Kabarpinter.com? Hubungi tim kami di{" "}
        <a href="mailto:iklan@kabarpinter.com">iklan@kabarpinter.com</a> untuk
        paket dan ketersediaan slot.
      </p>
    </StaticPage>
  );
}
```

```tsx
// app/rate-card/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Rate Card">
      <p>
        Rate card lengkap kami tersedia atas permintaan — hubungi{" "}
        <a href="mailto:iklan@kabarpinter.com">iklan@kabarpinter.com</a> untuk
        mendapatkan dokumen terbaru.
      </p>
    </StaticPage>
  );
}
```

```tsx
// app/affiliate/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Program Affiliate">
      <p>
        Program affiliate Kabarpinter.com sedang kami siapkan. Daftarkan minat
        Anda ke <a href="mailto:partner@kabarpinter.com">partner@kabarpinter.com</a>{" "}
        dan kami akan menghubungi Anda begitu program dibuka.
      </p>
    </StaticPage>
  );
}
```

```tsx
// app/sponsorship/page.tsx
import { StaticPage } from "@/components/StaticPage";
export default function Page() {
  return (
    <StaticPage title="Sponsorship Konten">
      <p>
        Kami membuka slot sponsorship konten untuk brand yang relevan dengan
        pembaca kami (UMKM, karir, dan peluang bisnis). Hubungi{" "}
        <a href="mailto:partner@kabarpinter.com">partner@kabarpinter.com</a>.
      </p>
    </StaticPage>
  );
}
```

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Spot-check `/tentang`, `/kontak`, and `/sponsorship` render correctly. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add components/StaticPage.tsx app/tentang app/redaksi app/pedoman app/etika app/kontak app/pasang-iklan app/rate-card app/affiliate app/sponsorship
git commit -m "feat: add static info pages (tentang, redaksi, pedoman, etika, kontak, iklan)"
```

---

### Task 16: Contributor login, dashboard stub, and editor review stub

**Files:**
- Create: `app/kontributor/masuk/page.tsx`, `app/kontributor/dashboard/page.tsx`, `app/redaksi/review/page.tsx`

**Interfaces:**
- Consumes: `createBrowserClient` (Task 7, client-side magic-link sign-in), `createServerClient` (Task 7, server-side session check)

- [ ] **Step 1: Write the magic-link login page (client component)**

```tsx
// app/kontributor/masuk/page.tsx
"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold text-brand-charcoal">Masuk Kontributor</h1>
      {sent ? (
        <p className="mt-6 text-brand-charcoal/70">
          Link masuk sudah dikirim ke {email}. Cek email Anda.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@anda.com"
            className="w-full rounded border border-brand-charcoal/20 px-4 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="rounded bg-brand-charcoal px-4 py-2 text-brand-cream"
          >
            Kirim Link Masuk
          </button>
        </form>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Write the contributor dashboard stub (server component, auth-gated)**

```tsx
// app/kontributor/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function ContributorDashboard() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kontributor/masuk");

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-brand-charcoal">Dashboard Kontributor</h1>
      <p className="mt-4 text-brand-charcoal/70">
        Halo, {user.email}. Fitur submit &amp; kelola draft artikel akan hadir
        di iterasi berikutnya.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Write the editor review stub (server component, role-gated)**

```tsx
// app/redaksi/review/page.tsx
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function EditorReviewPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kontributor/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "editor") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-brand-charcoal/70">
          Halaman ini khusus untuk tim redaksi.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-brand-charcoal">Antrian Review</h1>
      <p className="mt-4 text-brand-charcoal/70">
        Antrean artikel kontributor untuk ditinjau akan hadir di iterasi
        berikutnya.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Verify visually**

```bash
npm run dev
```

Visit `/kontributor/masuk` and confirm the form renders; visit `/kontributor/dashboard` while logged out and confirm it redirects to `/kontributor/masuk`. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add app/kontributor app/redaksi/review
git commit -m "feat: scaffold contributor login, dashboard, and editor review stubs"
```

---

### Task 17: RSS ingestion Edge Function (TDD for parsing logic)

**Files:**
- Create: `supabase/functions/fetch-rss/index.ts`, `supabase/functions/fetch-rss/parse.ts`
- Test: `supabase/functions/fetch-rss/parse.test.ts` (run with Deno's built-in test runner)

**Interfaces:**
- Consumes: `THEME_KEYWORDS` logic and scoring weights (duplicated here in Deno-compatible form — see Global Constraints on why this isn't shared via import across the Node/Deno boundary).
- Produces: `parseFeedXml(xml: string): FeedItem[]`, `type FeedItem = { title: string; link: string; pubDate: string | null; imageUrl: string | null }`

- [ ] **Step 1: Write the failing Deno test**

```ts
// supabase/functions/fetch-rss/parse.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseFeedXml } from "./parse.ts";

Deno.test("parses well-formed RSS items", () => {
  const xml = `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title>Berita Satu</title>
        <link>https://example.com/satu</link>
        <pubDate>Wed, 30 Sep 2026 10:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Berita Dua</title>
        <link>https://example.com/dua</link>
        <pubDate>Wed, 30 Sep 2026 09:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
  const items = parseFeedXml(xml);
  assertEquals(items.length, 2);
  assertEquals(items[0].title, "Berita Satu");
  assertEquals(items[0].link, "https://example.com/satu");
});

Deno.test("returns an empty array for malformed/non-XML content instead of throwing", () => {
  const notXml = "<html><body>502 Bad Gateway</body></html>";
  const items = parseFeedXml(notXml);
  assertEquals(items, []);
});

Deno.test("keeps two items with the same title but different links", () => {
  const xml = `<?xml version="1.0"?>
    <rss><channel>
      <item><title>Sama</title><link>https://a.com/1</link></item>
      <item><title>Sama</title><link>https://b.com/2</link></item>
    </channel></rss>`;
  const items = parseFeedXml(xml);
  assertEquals(items.length, 2);
  assertEquals(items[0].link, "https://a.com/1");
  assertEquals(items[1].link, "https://b.com/2");
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd "C:\KABARPINTER.COM\supabase\functions\fetch-rss"
deno test --allow-none
```

Expected: FAIL — `parse.ts` does not exist. (If `deno` is not installed locally, note this in the task and skip to implementation + a manual `npx tsx` smoke check instead — Deno is only required inside the deployed Edge Function runtime, not for local development.)

- [ ] **Step 3: Implement `parse.ts`**

```ts
// supabase/functions/fetch-rss/parse.ts
export type FeedItem = {
  title: string;
  link: string;
  pubDate: string | null;
  imageUrl: string | null;
};

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return null;
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
    .trim();
}

export function parseFeedXml(xml: string): FeedItem[] {
  if (!xml.includes("<item")) return [];

  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const items: FeedItem[] = [];

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!title || !link) continue;

    const imageMatch = block.match(/<(?:media:content|enclosure)[^>]*url="([^"]+)"/i);

    items.push({
      title,
      link,
      pubDate: extractTag(block, "pubDate"),
      imageUrl: imageMatch ? imageMatch[1] : null,
    });
  }

  return items;
}
```

- [ ] **Step 4: Run to verify pass**

```bash
deno test --allow-none
```

Expected: PASS, all 3 tests. (Or, if Deno isn't installed locally: `npx tsx -e "import('./parse.ts').then(m => console.log(m.parseFeedXml('<item><title>x</title><link>y</link></item>')))"` and confirm it prints the parsed item without throwing.)

- [ ] **Step 5: Write `index.ts`** (the deployed function — fetches all enabled sources, scores, upserts)

```ts
// supabase/functions/fetch-rss/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseFeedXml } from "./parse.ts";

const MIN_SCORE = 40;
const RECENCY_MAX_HOURS = 48;
const RECENCY_PEAK_HOURS = 2;

const THEME_KEYWORDS: Record<string, string[]> = {
  "tren-viral": ["viral", "tren", "fyp", "tiktok", "mendunia", "fenomena", "heboh", "ramai"],
  "peluang-bisnis": ["peluang", "bisnis", "usaha", "cuan", "untung", "modal kecil", "reseller"],
  "karir-skill": ["lowongan", "kerja", "karir", "gaji", "skill", "freelance", "cpns"],
  "konsumen-data": ["konsumen", "belanja", "shopee", "tokopedia", "survei"],
  "ekspor-impor": ["ekspor", "impor", "tiongkok", "bea cukai", "supplier"],
  "umkm-inspirasi": ["umkm", "pengusaha muda", "startup", "bangkrut", "sukses"],
  "ekonomi-uang": ["rupiah", "saham", "ihsg", "inflasi", "investasi"],
  politik: ["prabowo", "dpr", "menteri", "pilkada", "korupsi"],
};

function matchTheme(text: string): string | null {
  const t = text.toLowerCase();
  let best: { slug: string; hits: number } | null = null;
  for (const [slug, keywords] of Object.entries(THEME_KEYWORDS)) {
    const hits = keywords.filter((k) => t.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { slug, hits };
  }
  return best?.slug ?? null;
}

function scoreItem(title: string, pubDate: string | null, hasImage: boolean): number {
  let score = 0;
  const t = title.toLowerCase();
  if (["viral", "heboh", "cuan"].some((k) => t.includes(k))) score += 25;
  else if (["tips", "cara", "peluang"].some((k) => t.includes(k))) score += 15;

  if (pubDate) {
    const hours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
    if (hours <= RECENCY_PEAK_HOURS) score += 20;
    else if (hours < RECENCY_MAX_HOURS) {
      score += 20 * (1 - (hours - RECENCY_PEAK_HOURS) / (RECENCY_MAX_HOURS - RECENCY_PEAK_HOURS));
    }
  }

  if (matchTheme(title)) score += 35;
  if (hasImage) score += 10;
  if (title.length >= 30 && title.length <= 90) score += 5;
  if (/[!?]/.test(title)) score += 5;
  return Math.round(score);
}

function slugify(title: string, link: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  // `articles.slug` is UNIQUE, but two different articles (different
  // external_url) can title-slugify identically. Append a short,
  // deterministic hash of the link so the slug stays unique without an
  // extra existence query. (This is why the plain lib/slug.ts collision
  // check from Task 6 isn't reused here \u2014 that version needs a Set of
  // existing slugs queried up front, which this per-item Deno loop
  // doesn't have; hashing the already-unique `link` is cheaper and
  // sufficient for RSS items.)
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = (hash * 31 + link.charCodeAt(i)) | 0;
  }
  const shortHash = Math.abs(hash).toString(36).slice(0, 6);
  return `${base}-${shortHash}`;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("enabled", true);

  let inserted = 0;
  const errors: string[] = [];

  for (const source of sources ?? []) {
    try {
      const res = await fetch(source.feed_url);
      const xml = await res.text();
      const items = parseFeedXml(xml);

      for (const item of items) {
        const score = scoreItem(item.title, item.pubDate, !!item.imageUrl);
        if (score < MIN_SCORE) continue;

        const category = source.category_slug ?? matchTheme(item.title);

        const { error } = await supabase.from("articles").upsert(
          {
            source_type: "rss",
            status: "published",
            title: item.title,
            slug: slugify(item.title, item.link),
            excerpt: null,
            external_url: item.link,
            image_url: item.imageUrl,
            category_slug: category,
            score,
            source_name: source.name,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          },
          { onConflict: "external_url", ignoreDuplicates: true }
        );
        if (!error) inserted++;
      }
    } catch (err) {
      // Per Global Constraints: one dead/malformed source must not block the rest.
      errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
  }

  return new Response(JSON.stringify({ inserted, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/fetch-rss
git commit -m "feat: add fetch-rss Edge Function with tested XML parsing"
```

---

### Task 18: Deploy the Edge Function and schedule it with pg_cron

**Files:**
- Create: `supabase/migrations/0002_schedule_fetch_rss.sql`

- [ ] **Step 1: Deploy the function**

Call the Supabase MCP tool `deploy_edge_function` with `project_id`, `name: "fetch-rss"`, `entrypoint_path: "index.ts"`, `verify_jwt: false` (this function is invoked only by `pg_cron`, not by end users — no user JWT will ever be present), and `files` containing the contents of `index.ts` and `parse.ts` from Task 17.

- [ ] **Step 2: Set the service role secret**

The Edge Function needs `SUPABASE_SERVICE_ROLE_KEY` — Supabase Edge Functions have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` available as built-in secrets automatically; no manual step needed. Confirm this by checking the function's logs after Step 4's manual trigger show no "undefined" env var errors.

- [ ] **Step 3: Write the `pg_cron` schedule migration**

```sql
-- 0002_schedule_fetch_rss.sql
select cron.schedule(
  'fetch-rss-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.edge_function_base_url') || '/functions/v1/fetch-rss',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);
```

Before applying, replace `current_setting('app.settings.edge_function_base_url')` with the literal project URL from Task 2 (e.g. `'https://<project-ref>.supabase.co'`), since custom settings require extra setup this project doesn't otherwise need — a literal string is simpler and equally correct here.

- [ ] **Step 4: Apply the migration**

Call `apply_migration` with `project_id`, `name: "schedule_fetch_rss"`, and the finalized SQL from Step 3.

- [ ] **Step 5: Manually trigger once to verify end-to-end**

Call `execute_sql` with:
```sql
select net.http_post(
  url := '<literal project URL>/functions/v1/fetch-rss',
  headers := jsonb_build_object('Content-Type', 'application/json')
);
```
Wait ~10 seconds, then `select count(*) from articles where source_type = 'rss';`. Expected: count > 0 (assuming at least one of the 6 sources is reachable and produces a score ≥ 40 article).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_schedule_fetch_rss.sql
git commit -m "feat: schedule fetch-rss every 15 minutes via pg_cron"
```

---

### Task 19: Push to GitHub (manual step for the human partner)

**Files:** none (repo-level operation)

- [ ] **Step 1: Human partner creates an empty GitHub repository**

Since `gh` CLI isn't available in this environment, the human partner creates a new empty repo (no README/license, to avoid merge conflicts) at github.com, e.g. `kabarpinter-web`, and shares the remote URL (e.g. `https://github.com/<user>/kabarpinter-web.git`).

- [ ] **Step 2: Agent adds the remote and pushes**

```bash
cd "C:\KABARPINTER.COM"
git remote add origin <URL FROM STEP 1>
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Verify**

Confirm the human partner can see all commits on github.com.

---

### Task 20: Create the Vercel project, set env vars, and deploy

**Files:** none (Vercel-side configuration)

- [ ] **Step 1: List teams**

Call the Vercel MCP tool `list_teams`. Ask the human partner which team/scope to use if more than one is returned.

- [ ] **Step 2: Create the project linked to the GitHub repo**

Call `create_project` with `name: "kabarpinter-web"`, `slug`/`teamId` from Step 1, and `gitRepository: { type: "github", repo: "<owner>/kabarpinter-web" }` (from Task 19).

- [ ] **Step 3: Set environment variables**

Call `create_project_env` twice (or once with an array), for `idOrName` = the new project's id:
- `{ key: "NEXT_PUBLIC_SUPABASE_URL", value: "<from Task 2>", type: "encrypted", target: ["production", "preview", "development"] }`
- `{ key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: "<from Task 2>", type: "encrypted", target: ["production", "preview", "development"] }`

- [ ] **Step 4: Trigger the first deployment**

Call `create_deployment` with `requestBody.name: "kabarpinter-web"`, `requestBody.project: "<project id>"`, and `requestBody.gitSource` pointing at the `main` branch (`type: "github"`, `ref: "main"`, plus `repoId`/`org`/`repo` as returned by Step 2). Poll until status is `READY`.

- [ ] **Step 5: Verify the preview URL**

Open the returned `*.vercel.app` URL and confirm the homepage, a category page, and a static page all render without error.

---

### Task 21: Run the QA checklist

**Files:** none (manual verification pass)

- [ ] **Step 1: Functional checklist** (against the Vercel preview URL)

- [ ] Homepage renders and shows articles (after Task 18's manual trigger has populated some)
- [ ] Each of the 6 RSS sources contributed at least one article, OR the failure is isolated (check the Edge Function logs / `errors` field from Task 18 Step 5 — one bad source must not block the others)
- [ ] Every static page (`/tentang`, `/redaksi`, `/pedoman`, `/etika`, `/kontak`, `/pasang-iklan`, `/rate-card`, `/affiliate`, `/sponsorship`) renders
- [ ] `/kategori/<unknown-slug>` and `/artikel/<unknown-slug>` both show the Next.js 404 page
- [ ] `/cari?q=` (empty) shows all articles; `/cari?q=zzzznomatch` shows the empty state
- [ ] `/kontributor/masuk` sends a magic link (check Supabase Auth logs for the send event)
- [ ] `/kontributor/dashboard` redirects to `/kontributor/masuk` when logged out

- [ ] **Step 2: Mobile check**

Resize the browser to a phone width (375px) and confirm the header nav scrolls horizontally without breaking layout, and article cards stack to one column.

- [ ] **Step 3: Record results**

Report the checklist results to the human partner before proceeding to Task 22.

---

### Task 22: Write the DNS cutover instructions (do not apply)

**Files:**
- Create: `docs/DNS_CUTOVER.md`

- [ ] **Step 1: Write the instructions doc**

```markdown
# DNS Cutover: kabarpinter.com → Vercel

**Do not apply until the human partner gives final go-ahead.**

Current state: kabarpinter.com points at Hostinger (the legacy PHP site).
Target state: kabarpinter.com points at the Vercel project `kabarpinter-web`.

## Steps (apply only on explicit approval)

1. In the Vercel project dashboard, go to Settings → Domains → Add →
   enter `kabarpinter.com`. Vercel will show the exact DNS records to set
   (usually an `A` record to `76.76.21.21` and a `CNAME` for `www` to
   `cname.vercel-dns.com` — use whatever Vercel's dashboard actually
   displays, as this can change).
2. In Hostinger hPanel → Domain → kabarpinter.com → DNS/Nameservers, add/
   update those exact records.
3. Wait for DNS propagation (a few minutes up to 24 hours) and for
   Vercel to show the domain as "Valid Configuration" with SSL issued.
4. Verify `https://kabarpinter.com` serves the new Next.js site.
5. Leave the Hostinger PHP files in place (do not delete `public_html`)
   for a rollback window of at least a few days.

## Rollback

If anything goes wrong after cutover, revert the DNS records at Hostinger
back to their original values (recorded before Step 2) — propagation
delay applies in reverse too.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DNS_CUTOVER.md
git commit -m "docs: add DNS cutover instructions (not applied)"
```

- [ ] **Step 3: Present to the human partner**

Tell the human partner: the preview is live at the Vercel URL, QA checklist results (Task 21), and that `docs/DNS_CUTOVER.md` is ready whenever they want to flip DNS. Do not apply it without their explicit go-ahead in chat.
