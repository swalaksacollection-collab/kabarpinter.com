# Kabarpinter.com — Handoff

Last updated: 2026-09-30 (end of this session). Everything below reflects
the live, deployed state at that point — not a plan.

## What this project is

A Next.js news site (`kabarpinter.com`) that:
1. Auto-aggregates Indonesian news via RSS (ANTARA, CNN Indonesia,
   Liputan6, Tribunnews) into 11 topical categories + 8 regions.
2. Lets real experts ("pakar" — doctors, academics, practitioners)
   write original opinion/analysis pieces ("Ulasan Pakar") through a
   login → submit → editor-review pipeline.

Originally migrated from a PHP site (kabarkini.online / old
kabarpinter.com), rebranded, then redesigned twice (first to match the
old site's look, then to a detik.com-style structure — see git log for
that history if it matters).

## Infrastructure (all separate/new accounts, not mixed with anything else)

| Service | ID / identifier | Notes |
|---|---|---|
| GitHub | `swalaksacollection-collab/kabarpinter.com`, branch `main` | Push access via a username-scoped remote URL (kept separate from the user's other GitHub credential) |
| Vercel | project `prj_cOZnwiuEYh0CUclslAOCHi2jXtH4` ("kabarpinter-web") | Domain `kabarpinter.com` is production, DNS verified, SSL active |
| Supabase | project `nkkkzkteyrelxcnsvyif` | `https://nkkkzkteyrelxcnsvyif.supabase.co` |
| Local repo | `C:\KABARPINTER.COM` | Working directory for all edits |

**Deploy is NOT git-integrated auto-deploy** — direct Vercel git-linking
hit a `repo_no_access` error early on, so every deploy in this session
was done manually via the Vercel MCP `create_deployment` tool with an
explicit `gitSource: {type: "github", org: "swalaksacollection-collab",
repo: "kabarpinter.com", ref: "main"}` (no `sha` — it resolves latest
commit on the branch). **After pushing to GitHub, you must still call
`create_deployment` to actually deploy** — pushing alone does nothing.

## Standard change workflow (used consistently all session)

1. Edit code.
2. `cd "C:/KABARPINTER.COM" && npx vitest run` (TDD — RED before GREEN
   for any testable logic change in `lib/*.ts` or
   `supabase/functions/fetch-rss/parse.ts`)
3. `npx tsc --noEmit`
4. `npm run build`
5. Visual check via the Browser pane (`preview_start` with launch.json
   config name `kabarpinter-web` — see note below) before deploying.
6. `git add -A && git commit -m "..." && git push origin main`
7. Vercel `create_deployment` (see above) → poll `get_deployment` until
   `readyState: "READY"`.
8. Spot-check the live site with `curl` or the browser.

**launch.json quirk**: the Claude Code session's primary working
directory for this project was `C:\KABARKINI.ONLINE` (a *different*,
unrelated legacy folder), not `C:\KABARPINTER.COM`. The Browser pane's
`preview_start` tool reads `.claude/launch.json` from the *primary*
working directory, so a launch.json was created at
`C:\KABARKINI.ONLINE\.claude\launch.json` with:
```json
{ "runtimeExecutable": "npm", "runtimeArgs": ["--prefix", "C:/KABARPINTER.COM", "run", "dev"], "port": 3000 }
```
If a future session's working directory differs, recreate this file
(or an equivalent) pointing `--prefix` at `C:/KABARPINTER.COM`.

## Content pipeline

- **Edge Function** `fetch-rss` (Deno, Supabase) — fetches all enabled
  `sources`, scores items (recency + keyword-theme match + viral
  keywords + image + length), inserts anything scoring ≥40 into
  `articles`. Self-throttles to at most once every 5 minutes based on
  the newest RSS-sourced row. Currently **v10** in Supabase (redeploy
  via `deploy_edge_function` after any code change — files are
  `index.ts` + `parse.ts`).
- **Cron**: `pg_cron` job `fetch-rss-every-30-min`, `*/30 * * * *`
  (deliberately slowed from an earlier 5-minute experiment per explicit
  request — see migrations 0009/0010 for that history).
- **User-Agent**: must stay browser-shaped
  (`Mozilla/5.0 (compatible; KabarpinterBot/1.0; ...)`) — Tribunnews
  returns HTTP 403 for a bare bot-style UA string.
- **Sources table**: ~25 RSS feeds across `category_slug` (topic) and
  `region_slug` (Daerah) — both independent columns, a row can have
  neither/either/both null vs set. Kontan is disabled (dead feed,
  serves HTML not XML). To manually trigger a fetch right now:
  ```bash
  curl -s -X POST "https://nkkkzkteyrelxcnsvyif.supabase.co/functions/v1/fetch-rss" -H "Content-Type: application/json"
  ```

## Taxonomy

**Categories** (`lib/categories.ts` CATEGORY_LABELS, must match the
`categories` table): news→PinterNews, finance→PinterFinance,
hot→PinterHot, inet→PinterInet, sport→PinterSport, oto→PinterOto,
travel→PinterTravel, food→PinterFood, health→PinterHealth,
wolipop→PinterStyle, `20detik`→PinterClip. (Renamed away from
detikNews/etc. per explicit request — internal slugs unchanged, only
display labels.)

**Regions** (`lib/regions.ts` REGIONS): jabar, jateng, jatim, sumut,
sulsel (ANTARA's bureau there is branded "Makassar", not "Sulsel" —
`makassar.antaranews.com`), bali, aceh, papua. Each has a dedicated
ANTARA regional-bureau RSS source. `/daerah` (all regions blended) and
`/daerah/[slug]` (one region) both exist.

## The "Ulasan Pakar" (expert contributor) pipeline

This was **half-built from the original plan** — auth (Supabase magic
link) and DB schema/RLS existed, but the actual dashboard and review
queue were literal placeholder pages ("coming in a future iteration").
Built out this session:

- `/kontributor/masuk` — magic-link login (no password)
- `/kontributor/dashboard` — edit profile (display_name + bio =
  credential, e.g. "dr. Andi Wijaya, Sp.PD"), submit new article (title,
  category, excerpt, body, image upload to a `contributor-uploads`
  Supabase Storage bucket), see own submissions + status
- `/redaksi/review` — **editor-only**. Lists `status='submitted'`
  articles, Terbitkan (publish)/Tolak (reject+note) via Server Actions
- `/opini` — public landing page, all published contributor pieces
  across every category (mirrors `/daerah`'s cross-cutting pattern)
- Contributor-authored articles get a red "✍️ Ulasan Pakar" badge and
  show the author's real `display_name`/`bio` (joined via
  `contributor_id → profiles`) instead of the generic RSS `source_name`
- Daily Brief (`/daily-brief`) shows the single latest published
  opinion piece in a highlighted callout **above** the regular top-5
  news grid
- Opinion pieces are excluded from the homepage's main hero (lead/side)
  slot on purpose — that's reserved for photo breaking-news; they still
  show in the regular grid, their category page, `/opini`, and Daily
  Brief

**⚠️ Not yet usable end-to-end**: nobody has `role='editor'` yet — there
is intentionally no self-service "become editor" UI (security). **Next
step, waiting on the user**: they need to (1) sign in once at
`/kontributor/masuk` with whichever email should be the editor, then
(2) tell the next session that email so it can run:
```sql
update profiles set role = 'editor' where id = (select id from auth.users where email = '<email>');
```

One demo article already exists to populate the empty Daily
Brief/opini slot: *"Menjaga Keseimbangan Kekuasaan: Kenapa Checks and
Balances Masih Relevan"*, attributed to **"Redaksi Kabarpinter.com"**
(source_name, not a fake named contributor — inventing a fictitious
credentialed doctor/professor for a live public site would mislead
readers). `contributor_id` is null on this one row; a real submission
would have it set and show that person's own byline instead.

## Design system

- Fonts: Fraunces (`--font-display`, logo + some headlines), Manrope
  (`--font-body`, body text + article headline per an explicit
  "match ANTARA's sans-serif look" request), JetBrains Mono
  (`--font-mono`, dates/meta/tags).
- Palette: ink/paper/red/yellow custom properties in `app/globals.css`
  `:root`. Logo is **not italic** (was, then explicitly de-italicized).
- Headline scale was intentionally toned down from an earlier
  oversized pass (lead 24–34px, side 19px, card 16px, article detail
  24–34px) — "impeccable, high-taste" was the explicit bar.
- Nav: `components/NavBar.tsx` (client component) — a yellow pill
  slides via `getBoundingClientRect`-based measurement to whichever nav
  item matches the current route (not `offsetLeft`, which breaks under
  the Daerah dropdown's own `position: relative`).
- Article page mirrors an ANTARA article page look on purpose:
  breadcrumb, sans headline, date+icon byline row, real share buttons
  (WhatsApp/Facebook/Messenger/X/Telegram/copy-link — see
  `components/ShareButtons.tsx`), source cited as a small footer note
  (not a big "go elsewhere" CTA), "Berita Terkait" related-articles rail.

## Explicit copyright/content-policy stance (came up, worth preserving)

The user asked at one point to "sadur lengkap" (fully rewrite/republish)
every scraped article's full content, even with attribution. **This was
declined** — full-body scraping + rewriting of other outlets' copyrighted
news at scale is a real legal risk regardless of attribution (ANTARA
and others actively license their content). What was built instead as
the safe alternative: longer RSS excerpts (~70 words vs. the original
~30), a de-emphasized source citation, and the "Berita Terkait" rail —
all zero-copyright-risk ways to make the site feel less like a bare
aggregator. If a future session is asked to scrape full article bodies
from other outlets, raise the same concern again before doing it.

## Known gaps / possible next steps (not started)

- No editor promoted yet (see above — blocks actually testing
  publish/reject).
- `PinterClip` (ex-`20detik`, short-video vertical) has no real content
  source — no RSS feed suits video content in the current text-based
  `parseFeedXml` (which only understands RSS `<item>`, not Atom
  `<entry>` — a YouTube channel feed would need parser work).
  `jateng` region also currently has 0 articles (not an error, just
  hasn't had an item score ≥40 yet — should self-resolve over time).
- No rich-text editor for contributor submissions — plain textarea,
  paragraphs split on blank lines. Fine for now; revisit if pakar
  complain about formatting.
- No image for the demo "Redaksi" opinion piece (didn't want to attach
  an uncredited stock photo).

## Quick reference: where things live

| Thing | Path |
|---|---|
| RSS ingestion logic | `supabase/functions/fetch-rss/index.ts`, `parse.ts` |
| Category display names | `lib/categories.ts` |
| Region display names | `lib/regions.ts` |
| Article queries (all pages read through this) | `lib/articles.ts` |
| Nav + sliding indicator | `components/NavBar.tsx` |
| Contributor submission form | `components/contributor/ArticleForm.tsx` |
| Editor review queue | `app/redaksi/review/page.tsx` |
| All design tokens/CSS | `app/globals.css` (single file, no CSS modules) |
| DB migrations, in order | `supabase/migrations/0001..0013_*.sql` |
