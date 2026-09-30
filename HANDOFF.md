# Kabarpinter.com — Handoff

Last updated: 2026-10-01. Everything below reflects the live, deployed
state at that point — not a plan. (Sections marked UPDATED 10-01 were
rewritten after the move to the `swalaksacollection` Vercel team.)

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

## Infrastructure (UPDATED 10-01)

| Service | Identifier | Notes |
|---|---|---|
| GitHub | `swalaksacollection-collab/kabarpinter.com`, branch `main` | personal account |
| Vercel | team **`swalaksacollection`** (Hobby), project **`kabarpinter-com`** | serves `kabarpinter.com`; **git-integrated: every push to `main` auto-deploys** (~1-3 min) |
| Supabase | project `nkkkzkteyrelxcnsvyif`, region `ap-southeast-1` (Singapore) | org "swalaksacollection-collab's Org" |
| DNS | Hostinger hPanel (nameservers `*.dns-parking.com`) | apex A `76.76.21.21`, `www` CNAME `cname.vercel-dns.com`, TXT `_vercel` (domain-ownership proof, may stay) |
| Local repo | `C:\KABARPINTER.COM` | working directory for all edits |

- **Functions run in `sin1`** (Singapore, next to Supabase) via `vercel.json`.
  Before this they ran in `iad1` (US) and every page took 1.4-3 s.
- **Old project**: an earlier Vercel project `kabarpinter-web` lives in a
  *different* Vercel account (scope `prastowo`). It no longer serves the
  domain. The Claude **Vercel connector/MCP is authenticated to that old
  account**, so `create_deployment` etc. cannot see or deploy the current
  project - just `git push`. (Reconnect the connector with
  `swalaksacollection@gmail.com` if MCP access is wanted.)
- **Auth email**: Supabase's built-in SMTP only delivers to members of the
  Supabase organization (others get "Email address not authorized") and the
  email templates are **not editable until a custom SMTP server is set up**.
  Until then only the owner can log in. Login uses `/auth/callback` (PKCE:
  the link must be opened in the *same browser* that requested it). After
  custom SMTP, switch the Magic Link + Confirm-signup templates to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
  (route already exists; works across browsers/phones).
- Supabase Auth -> URL Configuration: Site URL `https://kabarpinter.com`,
  redirect allow-list `https://kabarpinter.com/**`.

## Standard change workflow (UPDATED 10-01)

1. Edit code.
2. `cd "C:/KABARPINTER.COM" && npx vitest run` - **TDD**: write the test,
   watch it fail for the right reason (RED), then implement (GREEN), for any
   logic in `lib/*.ts` or `supabase/functions/fetch-rss/parse.ts`.
3. `npx tsc --noEmit` and `npx eslint app components lib` (must be 0 errors).
4. Verify the real build. **If another session's dev server is running in
   this folder, do NOT run `npm run build` here** - it overwrites the shared
   `.next` and breaks that dev server (this happened: HTTP 500 "Module not
   found ... turbopack-next/internal/font/google/font"). Instead copy the
   project (without `.next`/`.git`, with a *real copy* of `node_modules` -
   Turbopack rejects a junction/symlinked `node_modules`) to a scratch dir,
   build there, inspect `.next/server/app/*.html`, then delete the copy.
5. `git fetch origin` (other sessions push to `main` too) ->
   `git pull --rebase --autostash origin main` if behind -> commit -> push.
6. **Push = deploy.** Poll the live site until the change appears (e.g. a
   new route stops returning 404), then verify with `curl`/browser: status,
   `x-vercel-cache`, TTFB and the actual content.
7. State plainly what was measured and what was *not* verified.

**launch.json quirk**: the Claude Code session's primary working directory
can be `C:\KABARKINI.ONLINE` (a different legacy folder). The Browser pane's
`preview_start` reads `.claude/launch.json` from the *primary* working
directory, so one exists at `C:\KABARKINI.ONLINE\.claude\launch.json`:
```json
{ "runtimeExecutable": "npm", "runtimeArgs": ["--prefix", "C:/KABARPINTER.COM", "run", "dev"], "port": 3000 }
```
Port 3000 may already be taken by another session's dev server - don't stop
it; `curl` it or test in an isolated copy.

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

## The "Ulasan Pakar" / contributor pipeline (UPDATED 10-01)

**Flow**: anyone can sign in (magic link) -> must submit a full application
(real name, phone, city, profession, institution, bio, optional link,
**selfie from the phone camera**) -> an **admin** approves or rejects it
(rejection needs a reason, shown to the applicant) -> a rejected applicant
fixes the data and **re-submits** -> only **approved** contributors can submit
articles -> an editor/admin reviews each article (publish / reject + note).

- Roles in `profiles.role`: `contributor`, `editor`, `admin` (super admin).
  `is_editor()` is true for editor **and** admin. The owner account
  `swalaksacollection@gmail.com` is `admin` (display name "Redaksi
  Kabarpinter.com"). There is deliberately no self-service "become admin".
  To promote someone (after they have logged in once):
  `update profiles set role='admin', application_status='approved' where id=(select id from auth.users where email='<email>');`
- **Data model** (migrations `0014`, `0015`): PII lives in
  `contributor_applications` (owner + admin only; anon has no privileges at
  all). `profiles` holds role + `application_status`
  (`none|pending|approved|rejected`) + reason/dates, and clients cannot write
  it at all. Status changes only happen through the SECURITY DEFINER functions
  `submit_contributor_application()` and `review_contributor_application()`.
  Approval copies `display_name`/`bio` into `profiles` (the public byline).
  Anon may read only `id, display_name, bio` of *approved* profiles (column
  grant) - this is what makes "Ulasan Pakar" bylines render for readers.
- **Selfie**: private Storage bucket `contributor-verification` (path
  `<uid>/selfie.jpg`); the owner may upload/replace only while the application
  is open (`none`/`rejected`); admin reads via a short-lived signed URL.
  Resized to <=1280px JPEG in the browser before upload.
- Pages: `/kontributor/masuk` (login), `/kontributor/dashboard` (shows the
  state: apply / pending / rejected+resubmit / approved -> write articles),
  `/redaksi/pelamar` (**admin**: approve/reject with reason + history),
  `/redaksi/review` (editor/admin: publish/reject articles), `/opini`
  (public landing); Daily Brief highlights the latest opinion piece.
- `proxy.ts` refreshes the Supabase session **only** on `/kontributor/*`,
  `/redaksi/*` sub-pages and `/auth/*` - never mount it on public pages.
- Opinion pieces are excluded from the homepage hero slot on purpose.
- One demo article ("Menjaga Keseimbangan Kekuasaan...") is attributed to
  "Redaksi Kabarpinter.com" via `source_name` (`contributor_id` is null) - no
  fictitious credentialed author was invented.

## Design system

- Fonts: same families as detik.com (explicit request). Montserrat
  (`--font-display`, via next/font; logo, headings, article headline at
  600) and Helvetica (`--font-body`, system stack "Helvetica Neue",
  Helvetica, Arial, Tahoma - Helvetica is licensed so it isn't shipped;
  Windows/Android visitors get Arial, same as detik's own fallback).
  `--font-mono` now aliases the body stack (detik uses Helvetica for
  dates/meta too).
- Light/dark theme: `html[data-theme]`, set pre-paint by the inline
  script in `app/layout.tsx` (localStorage `kp-theme`, else OS setting);
  toggle is `components/ThemeToggle.tsx`. Dark tokens live in
  `app/globals.css` right after `:root`.
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

## Known gaps / possible next steps (UPDATED 10-01)

- **Custom SMTP** (Resend/Brevo/...): required before any contributor other
  than the owner can receive a login link. Then switch the email templates to
  `/auth/confirm` (see Infrastructure).
- **Tribunnews images stay blurry** (~20% of images, the largest source): RSS
  only exposes a signed 148x99 q30 thumbnail and any URL change -> HTTP 400.
  Options: fetch `og:image` (1200x675) from the article page at ingestion
  (filter out logo placeholders; some are q30 too), or show Tribun cards
  without a photo. Liputan6/kly URLs are signed as well (673x379, left as is).
- **Editor tools (Phase B)**: an editor sees only the first 400 chars of a
  submission; cannot edit before publishing, unpublish a live article, or
  hide/delete a bad RSS article; RSS sources and users can only be managed via
  SQL. Contributors cannot save drafts, edit, or re-submit a *rejected
  article* (RLS locks rejected rows; only rejected *applications* can be
  re-submitted).
- No verification of credentials beyond the admin's review of the application.
- `PinterClip` (ex-`20detik`) has no content source (the parser only handles
  RSS `<item>`, not Atom `<entry>`); `jateng` may be empty until an item
  scores >=40.
- Plain-textarea article editor (paragraphs split on blank lines).
- Vercel **Hobby** is non-commercial; the site has ad/sponsorship pages, so
  plan to move to Pro once revenue starts.
- `@vercel/analytics` is installed, but the owner must click **Enable** in the
  Vercel project's Analytics tab before any data appears.
- Not yet verified by a real user: the application form UI and the phone
  selfie flow (the form is behind login).

## Conventions / standing rules from the owner (NEW 10-01)

- **Every image goes through `lib/images.ts`** ("untuk ke depan begitu
  semua"): `upgradeImageUrl()` for `src`, `imageSrcSet()` + `IMAGE_SIZES` for
  `srcSet`/`sizes`, so each screen density gets a genuinely sharper photo
  without over-downloading. Only request sizes a CDN was *probed* to serve
  (ANTARA 800/1200 only; detik 360/720/1080/1440). **Never rewrite signed CDN
  URLs** (Tribunnews, Liputan6/kly). Keep `IMAGE_SIZES` in step with the
  layout CSS (cards are 112px thumbnails on phones, 2-3 columns above).
  Verify in a browser by reading `img.currentSrc` - *not* `naturalWidth`
  (browsers rescale it for `w`-descriptor srcsets).
- **Homepage lead story** is chosen by `lib/lead.ts` `pickLead()`: among the
  newest 6 hero-eligible articles, the first whose photo can be served >=1000px
  (`maxImageWidth()` in `lib/images.ts`); otherwise the sharpest available.
  Reason: Liputan6 (673px) and Tribunnews (148px) photos look blurry in the
  ~700px hero slot. Freshness still wins when the newest photo is sharp.
- Public pages use the cookie-free `createPublicClient()`
  (`lib/supabase/public.ts`) so they stay static/ISR; only session-dependent
  code uses `createServerClient()`. Any `cookies()` call makes a route dynamic
  and slow again.
- Internal links use `next/link` (client-side navigation), never `<a>`.
- Measure, don't assume (curl TTFB + `x-vercel-cache`, image dimensions via
  download). Report what was not verified.
- Do not scrape/republish full copyrighted article bodies (see stance above).

## Quick reference: where things live

| Thing | Path |
|---|---|
| RSS ingestion logic | `supabase/functions/fetch-rss/index.ts`, `parse.ts` |
| Category display names | `lib/categories.ts` |
| Region display names | `lib/regions.ts` |
| Article queries (all pages read through this) | `lib/articles.ts` |
| Image URL upgrade + srcset | `lib/images.ts` (+ `images.test.ts`) |
| SEO helpers / site constants | `lib/seo.ts`, `lib/site.ts`; `app/sitemap.ts`, `app/robots.ts` |
| Application validation + safe redirect | `lib/application.ts` |
| Auth plumbing | `proxy.ts`, `lib/supabase/{server,client,public,proxy}.ts`, `app/auth/{callback,confirm}/route.ts` |
| Nav + sliding indicator | `components/NavBar.tsx` |
| Contributor submission form | `components/contributor/ArticleForm.tsx` |
| Editor review queue | `app/redaksi/review/page.tsx` |
| Admin: contributor applications | `app/redaksi/pelamar/page.tsx`, `components/contributor/ApplicationForm.tsx` |
| All design tokens/CSS | `app/globals.css` (single file, no CSS modules) |
| DB migrations, in order | `supabase/migrations/0001..0016_*.sql` (0014/0015 = applications; 0016 = Pokok Berita summaries) |
