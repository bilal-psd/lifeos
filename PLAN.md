# LifeOS — Work Plan

Status as of 2026-08-15. See [CLAUDE.md](CLAUDE.md) for architecture and
conventions; this file tracks progress and what's next.

## Where things stand

**MVP is complete and deployed to production.**
- Live: https://lifeos.bilaldoesstuff.in (custom domain, SSL live)
  - also https://lifeos-tan-two.vercel.app
- Repo: https://github.com/bilal-psd/lifeos (public), git-connected to Vercel →
  every push to `main` auto-deploys.

## Done

- [x] Repo scaffolded, git initialized, project `CLAUDE.md`, `.gitignore`.
- [x] Entry schema contract — [docs/schema.md](docs/schema.md).
- [x] Skills: `capture`, `new-category` (meta-skill + authorities table),
      `films`, `books` — all under `.claude/skills/`.
- [x] Capture flow proven end-to-end with verified IDs, one commit each. Initial
      dogfood samples (Dune: Part Two, Project Hail Mary) have since been removed
      now that real user entries are being logged.
- [x] Next.js 16 + React 19 + Tailwind 4 site in `web/` — home feed,
      per-category pages, entry pages with markdown + ID link-outs.
- [x] Deployed to Vercel (see CLAUDE.md "Deployment" for the exact config).
- [x] Custom domain wired via Netlify DNS CNAME.

## In progress

- Nothing mid-flight. Tree is clean, all work committed and pushed.

## Next (unstarted, roughly in priority order)

1. **Keep capturing real entries.** The mock samples are gone; real notes are
   now flowing in (books, films). Keep logging things as they happen — just talk
   to Claude and the `capture` skill handles it.
2. **Exercise `new-category`** on a real third category (music, games, places,
   podcasts…) to confirm the meta-skill flow end-to-end in practice.
3. **Robust ID lookup (optional upgrade).** MVP resolves IDs via web search at
   capture time. Later: wire real TMDb (needs free API key) + Open Library API
   calls into the category skills for exact matches. Store keys as Vercel env
   vars, not in the repo.
4. **Site polish (optional).** Tag filtering, per-entry OpenGraph images, an
   RSS/JSON feed, search. None required for MVP.

## Open decisions / not yet settled

- **Non-media categories with no registry** (ideas, journal, recipes): schema
  supports `id_source: none` (omit the `metadata:` block), but we haven't
  created one yet — confirm the filing feel when the first one comes up.
- **`public` flag is currently always true.** The schema + site already filter
  on it, so private entries are a flip away if ever wanted — no decision needed
  until the user wants something private.
- **Enrichment stays ID-only** by explicit user decision — do NOT add
  cast/runtime/summaries. Revisit only if the user asks.

## How to resume

- Run the site locally: `pnpm --dir web dev` (or the `lifeos-web` launch config).
- Deploy is automatic on `git push`. Manual: `vercel deploy --prod --yes` from
  repo root (CLI logged in as `bilal-psd`).
- To log something: just tell Claude; it invokes the `capture` skill.
