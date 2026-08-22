# LifeOS — Work Plan

Status as of 2026-08-22. See [CLAUDE.md](CLAUDE.md) for architecture and
conventions; this file tracks progress and what's next.

## Where things stand

**MVP is complete and deployed to production; the books/films UI just went
through a full editorial redesign.**
- Live: https://lifeos.bilaldoesstuff.in (custom domain, SSL live)
  - also https://lifeos-tan-two.vercel.app
- Repo: https://github.com/bilal-psd/lifeos (public), git-connected to Vercel →
  every push to `main` auto-deploys. Latest: `674a8a4`.

## Done

- [x] Repo scaffolded, git initialized, project `CLAUDE.md`, `.gitignore`.
- [x] Entry schema contract — [docs/schema.md](docs/schema.md).
- [x] Skills: `capture`, `new-category` (meta-skill + authorities table),
      `films`, `books`, `lists` — all under `.claude/skills/`.
- [x] Capture flow proven end-to-end with verified IDs, one commit each.
- [x] Next.js 16 + React 19 + Tailwind 4 site in `web/` — home feed,
      per-category pages, entry pages with markdown + ID link-outs.
- [x] Deployed to Vercel, custom domain via Netlify DNS CNAME (see CLAUDE.md
      "Deployment").
- [x] Bulk imports: Goodreads read shelf (67 books) and Letterboxd watched
      (369 films), IDs resolved, one commit per import.
- [x] Filterable **properties** — a typed `properties:` block; the site
      derives each category's filter bar from the data, refined by
      `content/_properties.json`.
- [x] Custom **lists** — a shared `lists` property + `content/_lists.json`
      registry. Now supports two kinds of membership (see "Rule-based lists"
      below): static per-entry tags (Malayalam Cinema Starter Pack, 12 films)
      and rule-derived (Perfect Films — every film at `rating: 5`, 13 entries
      and counting, zero maintenance).
- [x] **Cover images for films & books** (commit `9f7b1bf`). Self-contained in
      `content/<cat>/covers/`, synced to `public/` at predev/prebuild.
      Backfill script with a Google-Books-identity → author-validated-iTunes →
      Open-Library waterfall (books) and TMDb (films). Currently **358/358
      films** and **75/75 books** covered; keys in gitignored `web/.env.local`.
- [x] **Removed the unused `liked` property** — it duplicated `rating` without
      adding signal, dropped from filter config, the films skill, schema docs,
      the UI, and the 25 entries that had it set.
- [x] **"Currently reading" lifecycle for books.** A book can be
      `properties.status: reading` — no rating required while in progress,
      shown in its own strip, excluded from the rated grid and from
      filter/sort entirely. Finishing a book is **not** a new capture — you
      tell Claude, it finds the existing entry and edits it in place (drops
      `status`, adds the rating, bumps `date`). Full flow documented in the
      `books` skill. **5 books currently in progress:** Red Rising, Same as
      Ever, Bangalore Through the Centuries, Sophie's World, Zen and the Art
      of Motorcycle Maintenance.
- [x] **Credits: director (films) / author (books).** New `properties.director`
      and `properties.author`, registered `hidden: true` so they display
      everywhere but add no filter chip. Backfilled **358/358 films and 73/75
      books** — TMDb credits for films; Google Books with a keyless Open
      Library fallback for books, which rescued 9 of the 11 books Google
      couldn't resolve. The last 2 have ISBNs neither source knows. Shown on
      grid tiles, list rows, the currently-reading strip, and (free, via the
      existing `<dl>`) entry pages.
- [x] **Script layer refactor.** `web/scripts/lib/sources.mjs` (shared,
      memoized external-source layer) + `lib/frontmatter.mjs` (surgical
      line-level YAML edits, generalized from the rate API route).
      `fetch-covers.mjs` now consumes them — verified behaviour-identical
      (433 skipped, forced refetch byte-identical). New `enrich.mjs` is the
      single entry point for cover + credits + synopsis, including the
      `--slug` path the capture skills now call. **This closes the old
      "wire cover-fetching into capture" item.**
- [x] **AI synopsis pipeline — code complete, backfill not yet run.** Sidecar
      files at `content/<cat>/synopses/<slug>.md`, two-tier grounding
      (trusted APIs → Claude web search only when thin), rendered on entry
      pages below the user's note and labelled AI-generated with sources.
      **Blocked on `ANTHROPIC_API_KEY` being added to `web/.env.local`** —
      see "In progress".
- [x] **Full editorial redesign of the books/films pages** (commit `674a8a4`,
      preceded by `ad92ec0`, `0bc5682`). Iterated as published Claude
      artifacts with inline comments before touching code — see "Rejected
      directions" below for what didn't make the cut and why. Shipped:
      - Real masthead — Fraunces wordmark, small-caps nav with an actual
        active-tab indicator (there wasn't one before).
      - Currently Reading and Featured both restyled as a warm-tinted "shelf"
        panel and moved to lead the page, directly under the masthead.
      - Header consolidated onto one line: category + count, then the view
        toggle and filter/sort as two *separate* bordered pill groups — kept
        apart deliberately (see CLAUDE.md).
      - Grid tiles: rating moved from an inline star row to a corner badge
        (star + number); caption gained a dateline (release year for films,
        logged month/year for books — see `formatMonthYear` in
        `web/lib/format.ts`).
      - Page shell widened `max-w-2xl` → `max-w-6xl` (was capping the poster
        grid at 4 columns regardless of screen size); entry detail pages kept
        at `max-w-2xl` on purpose so prose doesn't stretch full-width.

## In progress

- **Synopsis backfill is the one unfinished step.** All the code ships and the
  UI is verified against a fixture, but no synopsis has been generated: this
  machine has no Anthropic credential (no `ANTHROPIC_API_KEY`, no `ant` CLI).
  To finish:
  1. Add `ANTHROPIC_API_KEY=...` to `web/.env.local` (gitignored).
  2. Sanity-check a few: `pnpm --dir web enrich --only synopses --category books --limit 3`
     — read them against their source URLs before going wide.
  3. Check spend on a slightly bigger sample, then run the rest.
     Estimated ~$8-10 one-time for all 433.

## Rejected directions (don't re-propose without new information)

- **A pull-quote / marginalia module** showing a user's own note as a styled
  quote (hover-revealed or as a standalone "featured quote" block) — explored
  in two separate mockup rounds, cut both times. Reason: there's no mechanism
  to actually choose or persist *which* quote is featured, so showing one
  fabricates curation the product doesn't have. Revisit only alongside
  building that mechanism.
- **A full magazine-index layout** — replacing the poster grid with a hero
  "review spread" (big cover + pull-quote) plus a ruled text index for
  everything else. Rejected because the poster wall *is* the product's
  identity; trading it for a text-forward index for the sake of "editorial"
  worked against the actual goal.
- **Merging the view toggle and filter/sort into one control group.** Tried,
  reverted. They're conceptually different (passive display state vs. an
  action that opens a menu) and were kept as two visually distinct pills.
- **~~Type system is Inter + Mono only, serif rejected~~ — superseded.** An
  earlier round of this project mocked and rejected a serif for the covers UI.
  That's no longer the standing decision: Fraunces (display, used narrowly)
  + Inter is now the settled pairing, chosen after several more mockup rounds
  this session. See CLAUDE.md.

## Next (unstarted, roughly in priority order)

1. **Keep capturing real entries** — books, films, and now the
   currently-reading lifecycle (start = normal capture with `status: reading`,
   finish = tell Claude, it edits the entry in place).
2. **Exercise `new-category`** on a real third category to confirm the
   meta-skill flow end-to-end in practice.
3. **Robust ID lookup (optional upgrade).** Wire real TMDb + Open Library API
   calls into the category skills for exact matches instead of web search.
4. **Site polish (optional).** OpenGraph images, an RSS/JSON feed, full-text
   search, a dedicated `/lists/<slug>` page.
5. **Extend the rule-based list pattern** — the engine (`_lists.json` +
   `applyDynamicLists` in `web/lib/archive.ts`) already supports any
   `{category, property, value}` rule with zero new code. A "Perfect Books"
   (books, rating=5) is a one-line registration away, same for anything else
   that's a pure function of existing properties.
6. **Home page and list-view mode weren't touched by the redesign** — the
   home feed (`/`) is still a plain title+date list, and the alternate
   row-based "list" view on category pages still uses the pre-redesign style.
   Not a bug, just out of scope; worth a deliberate look if the new visual
   language should extend there too.

## Open decisions / not yet settled

- **Non-media categories with no registry** (ideas, journal, recipes): schema
  supports `id_source: none`, but we haven't created one yet.
- **`public` flag is currently always true.** A flip away from private
  entries if ever wanted — no decision needed until then.
- **Enrichment is ID + cover + credit + synopsis.** Amended deliberately (see
  CLAUDE.md "Design decisions"). Still do NOT add cast, runtime, budget, or
  crew beyond the director.
- **Dateline fallback (year vs. logged date) is a judgment call, not a firm
  rule.** Films show release `year`; books (which have no `year` property)
  fall back to when the entry was logged. If books ever want a "published
  year" distinct from "date I read it," that's a new property, not a reuse of
  `date`.
- **The pull-quote/marginalia idea isn't dead, just blocked** on a real
  "choose a featured quote" mechanism not existing yet. See "Rejected
  directions."

## How to resume

- Run the site locally: `pnpm --dir web dev` (or the `lifeos-web` launch
  config).
- Deploy is automatic on `git push`. Manual: `vercel deploy --prod --yes` from
  repo root (CLI logged in as `bilal-psd`).
- To log something: just tell Claude; it invokes the `capture` skill (or, for
  a book already `status: reading`, tell Claude you finished it).
- The redesign's design exploration lived in published Claude artifacts
  (mockups + inline comments) rather than in this repo — the *decisions* and
  *reasons* are captured above and in CLAUDE.md; the artifacts themselves
  aren't a durable reference, treat this file as the source of truth.
