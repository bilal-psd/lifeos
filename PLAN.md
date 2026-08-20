# LifeOS — Work Plan

Status as of 2026-08-20. See [CLAUDE.md](CLAUDE.md) for architecture and
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
- [x] Bulk imports: Goodreads read shelf (67 books) and Letterboxd watched
      (369 films), IDs resolved, one commit per import.
- [x] Filterable **properties** — a typed `properties:` block (rating, language,
      year, liked, lists); the site derives each category's filter bar from the
      data, refined by `content/_properties.json`. Existing entries backfilled.
- [x] Custom **lists** — generic shared property + `content/_lists.json` registry
      + `lists` skill. Malayalam Cinema Starter Pack (12 films) populated.
- [x] Site redesign: dark, monochrome, Linear-idiom, Inter. Filter/Display are
      icon-only on the title line, unfurling into dropdowns; per-category display
      config + sort, persisted to localStorage.
- [x] Filter dropdown behavior fix: multi-select filters keep their menu open to
      stack values; single-select (rating threshold, sort) close on pick.
- [x] **Cover images for films & books** (commit `9f7b1bf`). Self-contained in
      `content/<cat>/covers/`, synced to `public/` at predev/prebuild. Grid
      (default) / list toggle + detail-page hero + duotone fallback tiles. Type
      system kept as **Inter + Mono** (the serif option was mocked and rejected).
      Backfill script with a Google-Books-identity → author-validated-iTunes →
      Open-Library waterfall (books) and TMDb (films). Backfilled **358/371
      films** and **69/70 books**; keys in gitignored `web/.env.local`. See the
      **Covers** section in CLAUDE.md.

## In progress

- Nothing mid-flight. Tree clean, covers commit pushed (Vercel auto-deploying —
  worth a glance that it went green).

## Next (unstarted, roughly in priority order)

1. **Wire cover-fetching into capture.** Covers are backfill-only right now — a
   newly captured film/book gets **no cover** until someone runs `pnpm
   fetch-covers`. Update the `films`/`books` SKILL.md (and/or `capture`) so a new
   entry pulls its cover inline: films grab `poster_path` during the web lookup
   and download the TMDb poster; books run the same waterfall as the backfill
   (`web/scripts/fetch-covers.mjs` has the reusable logic — Google-Books identity
   → author-validated iTunes → Open Library). Note the keys live in
   `web/.env.local`, which is local-only (fine for a local capture flow; not
   available in CI).
2. **The 14 uncovered entries** (13 films like *Agatha All Along* — a TV series —
   + 1 book, *Ambedkar's India*) show fallback tiles. Optional: hand-place a
   cover by dropping a file at `content/<cat>/covers/<slug>.jpg`, or leave them.
3. **Keep capturing real entries.** The mock samples are gone; real notes are
   now flowing in (books, films). Keep logging things as they happen — just talk
   to Claude and the `capture` skill handles it (then see item 1 re: its cover).
4. **Exercise `new-category`** on a real third category (music, games, places,
   podcasts…) to confirm the meta-skill flow end-to-end in practice.
5. **Robust ID lookup (optional upgrade).** MVP resolves IDs via web search at
   capture time. Later: wire real TMDb + Open Library API calls into the category
   skills for exact matches (TMDb/Google Books keys now exist in
   `web/.env.local`). Store keys as Vercel env vars, not in the repo.
6. **Site polish (optional).** Per-entry OpenGraph images, an RSS/JSON feed,
   full-text search, and a dedicated list page (a list currently surfaces only as
   a filter; a `/lists/<slug>` view is a possible next step). Filtering, sort,
   display config, and covers are already done.

## Open decisions / not yet settled

- **Non-media categories with no registry** (ideas, journal, recipes): schema
  supports `id_source: none` (omit the `metadata:` block), but we haven't
  created one yet — confirm the filing feel when the first one comes up.
- **`public` flag is currently always true.** The schema + site already filter
  on it, so private entries are a flip away if ever wanted — no decision needed
  until the user wants something private.
- **Enrichment is ID-only + a cover image** (amended 2026-08-20). Covers are now
  in; still do NOT add cast/runtime/summaries. See CLAUDE.md "Covers".
- **Type system for the covers UI is Inter + Mono.** A serif option
  (Instrument Serif) was mocked and rejected — don't reintroduce it.

## How to resume

- Run the site locally: `pnpm --dir web dev` (or the `lifeos-web` launch config).
- Deploy is automatic on `git push`. Manual: `vercel deploy --prod --yes` from
  repo root (CLI logged in as `bilal-psd`).
- To log something: just tell Claude; it invokes the `capture` skill.
