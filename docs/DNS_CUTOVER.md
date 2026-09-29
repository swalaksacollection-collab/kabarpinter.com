# DNS Cutover: kabarpinter.com → Vercel

**Do not apply until the human partner gives final go-ahead.**

Current state: `kabarpinter.com` points at Hostinger (the legacy PHP site,
`kabarkini.online` / `kabarpinter.com` shared hosting).
Target state: `kabarpinter.com` points at the Vercel project
`kabarpinter-web` (project id `prj_cOZnwiuEYh0CUclslAOCHi2jXtH4`, currently
live and verified at `https://kabarpinter-web.vercel.app`).

## Pre-cutover checklist (already done, listed for reference)

- [x] Next.js app built, tested, and deployed to Vercel preview
- [x] Supabase project (`kabarpinter-com`, dedicated account) live with
      schema, RLS, seed data, and RSS ingestion scheduled every 15 min
- [x] QA checklist passed (Task 21) — including a dark-mode contrast bug
      found and fixed
- [x] Code pushed to `https://github.com/swalaksacollection-collab/kabarpinter.com`

## Steps (apply only on explicit approval)

1. **Add the domain to the Vercel project.** In the Vercel dashboard
   (`kabarpinter-web` project → Settings → Domains → Add), enter
   `kabarpinter.com`. Vercel will display the *exact* DNS records to set —
   these can change over time, so use whatever the dashboard shows at the
   moment of cutover rather than a hardcoded value here. As of this
   writing, Vercel's typical recommendation is an `A` record for the
   apex domain to `76.76.21.21` and a `CNAME` for `www` to
   `cname.vercel-dns.com`, but **confirm in the dashboard**.
2. **Update DNS at Hostinger.** Log into Hostinger hPanel →
   `kabarpinter.com` → Domain → DNS/Nameservers, and add/update the
   records exactly as Vercel's dashboard showed in step 1. Record the
   *current* records first (screenshot or copy them) so step 5's
   rollback has something to revert to.
3. **Wait for propagation.** A few minutes up to 24 hours. Vercel's
   dashboard will show the domain's status move from "Invalid
   Configuration" to "Valid Configuration" with SSL automatically
   issued once DNS has propagated.
4. **Verify.** Open `https://kabarpinter.com` in a normal (non-cached)
   browser session and confirm it serves the new Next.js site — check
   the homepage renders real articles, and spot-check a couple of the
   pages from the QA checklist (Task 21).
5. **Keep the Hostinger files in place.** Do not delete anything in
   `public_html` on Hostinger — leave it as a rollback path for at
   least a few days after cutover.

## Rollback

If anything goes wrong after cutover, revert the DNS records at
Hostinger back to the values recorded in step 2 — propagation delay
applies in reverse too, so allow the same window for the rollback to
take effect.

## Known limitations to be aware of post-cutover

- The Vercel project is **not** git-linked at the project-settings level
  (Vercel's API rejected the direct link even after GitHub App
  permissions were confirmed correct — see the plan's ledger, Task 20).
  This means a future `git push` to `main` will **not** auto-deploy.
  Either link the repository via the Vercel dashboard UI (which may
  succeed where the API call didn't), or trigger deployments manually
  after each push.
- Two of the six RSS sources are not currently ingesting:
  **Tribunnews** returns HTTP 403 (bot-detection blocking the fetch)
  and **Kontan**'s feed URL now serves an HTML page instead of XML
  (the feed path likely changed). Both fail gracefully — the other
  sources keep ingesting — but nothing will come from these two until
  their URLs/access are fixed in the `sources` table.
- The contributor submission UI (draft/submit/review flow) is
  scaffolded but not built out — that's the next sub-project per the
  original design spec.
