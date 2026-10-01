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
- **Auth email (UPDATED 10-01): custom SMTP via Resend, configured but NOT yet
  tested end-to-end.**
  - Resend domain `mail.kabarpinter.com` (region Tokyo), status Verified.
    DNS at Hostinger: TXT `resend._domainkey.mail` (DKIM), CNAME `rsend.mail`
    and `send.mail` (SPF/bounce), TXT `_dmarc` (`v=DMARC1; p=none;`).
  - Supabase Auth -> Emails -> SMTP Settings: sender `no-reply@mail.kabarpinter.com`
    / "Kabarpinter.com", host `smtp.resend.com`, port `465`, user `resend`,
    password = a Resend API key (Sending access, restricted to the domain). The
    key lives only in Supabase - never commit it. Email rate limit is 30/hour
    (raise in Auth -> Rate Limits when needed); min interval per user 60 s.
  - The two templates **"Magic link or OTP"** and **"Confirm sign up"** both link
    to `https://kabarpinter.com/auth/confirm?token_hash={{ .TokenHash }}&type=email`
    (domain hard-coded on purpose, not `{{ .SiteURL }}`). This works across
    browsers/phones. The older PKCE route `/auth/callback` and the
    `emailRedirectTo` in `LoginForm` are still in the code.
  - **Rollback if login is broken**: press "Reset template" on both templates
    -> Supabase default emails -> PKCE `/auth/callback` flow (works only when the
    link is opened in the same browser that requested it). The existing admin
    session cookie stays valid meanwhile.
  - The owner deferred the end-to-end test. When testing: from a phone, request a
    link with an email that is NOT `swalaksacollection@gmail.com`, tap the button
    in the email, fill the application incl. selfie, then approve it at
    `/redaksi/pelamar`. Resend "Logs" show delivery; check them if mail is missing.
    After it works, update the notice text in `LoginForm` ("Buka di browser yang
    sama" is now obsolete) and drop `emailRedirectTo` if desired.
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

## Admin panel (NEW 10-01, migration 0017, live)

All under `/redaksi/*` (login required; `proxy.ts` matcher already covers it).
Admin-only pages are hidden from editors in `AdminNav` and enforced by RLS.

| Page | Who | What |
|---|---|---|
| `/redaksi/kontributor` | admin | Approved contributors: upload profile photo (`profiles.avatar_url`, shown on bylines), suspend/reactivate (`profiles.suspended`; blocks new submissions via `is_approved_contributor()`). |
| `/redaksi/filter` | admin | Submission filter rules (`filter_rules`: banned_word / min_words / max_links; action flag or reject) + a tester using the same `lib/filter.ts`. |
| `/redaksi/ulasan`, `/redaksi/ulasan/[id]` | editor+admin | Expert reviews: edit text, replace/remove illustration, hide/publish, delete (RLS delete policy for `source_type='contributor'` only). |
| `/redaksi/popup` | admin | Promo popups (`popups`, `popup_stats`): image, WIB schedule, target paths, per-session cap, views/clicks. |
| `/redaksi/iklan` + `/ads.txt` | admin | Google AdSense: one publisher id (`ad_settings`) + numeric slot id per placement (`ad_slots`: header, sidebar, in_article, footer). No pasted HTML on purpose. `/ads.txt` is generated from the publisher id. |

- **Filter runs server-side** in `submitArticle()` (`app/kontributor/actions.ts`),
  not in the browser. `reject` -> contributor sees reasons; `flag` -> saved in
  `articles.filter_flags` and shown in the review queue. Known limit: a malicious
  *approved* contributor could still insert directly via the REST API (RLS allows
  it); the editor review remains the final gate (nothing publishes without it).
  `filter_flags` is also readable by anon on published rows (low sensitivity).
- **Images** for the admin go to the public bucket `site-media` via
  `components/admin/ImageUploadField.tsx` (resized in the browser, URL stored).
  Server actions only accept URLs inside our own buckets (`lib/media.ts`).
- **Popup** (`components/SitePopup.tsx`, mounted in `app/layout.tsx`) fetches live
  popups client-side so public pages stay static/ISR; schedule is enforced by RLS.
  Always has a close button, Esc/backdrop closes, skips `/redaksi|/kontributor|/auth`,
  and waits if the install prompt is showing. Counts are indicative only.
- **Ads**: `components/AdSlot.tsx` (server) -> `AdUnit.tsx` (client, loads the shared
  adsbygoogle script). AdSense is **disabled** until the owner enters the publisher
  id + slot ids and ticks "aktifkan"; until then the home header shows the old
  "Pasang Iklan" placeholder. Google must approve the site first.
- **Deploy order matters**: public pages now select `profiles.avatar_url`, so
  migration 0017 must be applied *before* pushing code that reads it (done).
- **Deploy gotcha seen 10-01**: a normal push (`d291dfe`) was not picked up by the
  Vercel Git integration (no deployment appeared). An empty commit
  (`git commit --allow-empty`) re-triggered it within a minute.
- **Not verified end-to-end by Claude**: the staff pages themselves (login is a
  magic link). Verified live: public pages, redirects to login, anon RLS, popup
  (shown/Esc/stats) via a temporary popup that was deleted afterwards.

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

- **Pending test (owner deferred it)**: login through the new Resend templates
  and the contributor application form from a phone (see Infrastructure ->
  Auth email for the steps and the rollback). Until done, treat "other people
  can become contributors" as unverified.
- **Tribunnews: photos are hidden, and the text is an open legal question.**
  Tribunnews' terms of use (read 2026-10-01; not legal advice) say its content
  incl. photos is for personal, non-commercial use only, forbid robots/scripts
  that extract content, and forbid embedding its content on other sites without
  written permission. Kabarpinter is commercial, so (a) we do NOT scrape
  article pages for a larger `og:image` (the obvious fix for the 148x99 q30 RSS
  thumbnail), and (b) `lib/images.ts` `isImageAllowed()` blocks every
  `*.tribunnews.com` photo everywhere (cards, hero, article page, og:image,
  JSON-LD) - those cards are text-only with the source credit + link. The same
  terms arguably also cover aggregating Tribun titles/excerpts via RSS; that is
  still enabled and is the owner's call: get written permission from Tribunnews
  (then delete the entry in `BLOCKED_IMAGE_HOSTS` to show photos again) or
  disable the `Tribunnews` row in `sources`. Only Tribunnews' terms were read;
  ANTARA/Liputan6/detik/CNN terms have NOT been reviewed (their robots.txt has
  no usage notice, which proves nothing about their terms).
  Liputan6/kly photos are signed at 673x379 (cannot be enlarged) but are shown.
- **Editor tools (Phase B), partly done 10-01**: editors can now read the full
  text, edit before publishing, hide/unpublish and delete *contributor* pieces
  (`/redaksi/ulasan`). Still missing: hide/delete a bad RSS article; RSS sources
  and users are managed via SQL. Contributors cannot save drafts, edit, or
  re-submit a *rejected article* (RLS locks rejected rows; only rejected
  *applications* can be re-submitted).
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
- **Every image must also pass `isImageAllowed()`** (`lib/images.ts`): it is the
  one gate for hosts whose terms forbid embedding (currently Tribunnews). Any
  new place that renders `image_url`, og:image or JSON-LD images must call it.
  Never add a scraper for source article pages (robots/terms + the owner's
  stance on copyright).
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
| DB migrations, in order | `supabase/migrations/0001..0017_*.sql` (0014/0015 = applications; 0016 = Pokok Berita summaries; 0017 = admin panel) |
| Admin server actions | `app/redaksi/actions.ts` (staff), `app/kontributor/actions.ts` (`submitArticle`) |
| Filter / popup / ads / media / WIB logic (pure, tested) | `lib/filter.ts`, `lib/popup.ts`, `lib/ads.ts`, `lib/media.ts`, `lib/wib.ts` |
