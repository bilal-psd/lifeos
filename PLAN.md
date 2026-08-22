# LifeOS — Work Plan

Status as of 2026-08-22. See [CLAUDE.md](CLAUDE.md) for architecture and
conventions; this file tracks progress and what's next.

## Where things stand

Status as of 2026-08-22. See [CLAUDE.md](CLAUDE.md) for architecture and
conventions; this file tracks progress and what's next.

**Everything below is shipped and live.** Latest: `db4948a` on `main`, deployed.
- Live: https://lifeos.bilaldoesstuff.in
- 434 entries: 358 films, 75 books, 1 project.
- Every film and book has a credit and a synopsis. Entries open in a modal.

**Another Claude session works this repo too** (it added the `projects`
category). Read "Working alongside another Claude session" in CLAUDE.md before
touching shared files. As of this writing that session had uncommitted edits to
`web/app/globals.css`, which this session also rewrote heavily, so expect a
conflict there when it pulls.

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
- [x] **Entry modal ("shelf view").** Clicking a tile opens the entry over the
      grid; a direct visit or refresh still serves the real page, so
      `/films/<slug>` stays a shareable link. Built on intercepting + parallel
      routes, with arrow keys flipping through the grid's current filtered
      order. Direction was approved from a published interactive mockup first.
      See CLAUDE.md "The entry modal".
- [x] **Synopses for all 433 entries.** Sidecar files at
      `content/<cat>/synopses/<slug>.md`, rendered on entry pages below the
      user's note and labelled AI-generated with sources linked.
      **No API key and no bill:** capture already runs through Claude, so
      Claude writes the blurbs from grounding a script gathers. Grounding is
      TMDb, Google Books, Open Library and Wikipedia, all free.
      Written by 8 parallel Sonnet subagents working from
      [docs/synopsis-brief.md](docs/synopsis-brief.md), with franchise clusters
      kept inside one agent so instalments got differentiated.
      Final state: 0 rule violations, 0 duplicate openings, median 75 words.
      **The real work was auditing the grounding**, not writing: 34 of 371
      Wikipedia extracts were about a different work (soundtracks, video games,
      sequels, author biographies). See CLAUDE.md.
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

- Nothing mid-flight. Working tree clean, `main` pushed, deploy green.

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

1. **`projects` has no cover and no synopsis.** The one entry (Marquee) renders
   noticeably thinner than films and books. The pipeline is category-generic, so
   the work is mostly deciding what a project's "cover" is (screenshot? repo OG
   image? generated tile?) and what its ID source gives you for grounding.
   `creditOf()` in `rowHelpers.ts` also has no mapping for `projects`.
2. **Strip the stub bodies from books.** 75 entries still say "Read — rated 3/5
   on Goodreads." Same treatment films got. Watch for `3-5/5` as well as
   `3.5/5`. See the gotcha in CLAUDE.md.
3. **The home feed (`/`) still links straight to full pages**, not the modal,
   and is still a plain title+date list untouched by the redesign. Making it
   open modals means intercepting from the root, so the slot goes in
   `app/@modal/` with `(.)` matchers one level up.
4. **Six synopses are under 50 words** because their sources were genuinely
   thin: The Notebook (28), Mother (31), Eternals (42), Another Round (45),
   Age of Ultron (46), Zack Snyder's Justice League (48). Each needs research
   rather than padding. `pnpm --dir web lint-synopses` lists them.
5. **Exercise `new-category`** on a fourth category to confirm the meta-skill
   flow (projects was created by the other session, so this is partly done).
6. **Robust ID lookup (optional).** Real TMDb + Open Library API calls in the
   category skills instead of web search.
7. **Site polish (optional).** OpenGraph images, RSS/JSON feed, full-text
   search, a dedicated `/lists/<slug>` page.

## Open decisions / not yet settled

- **Synopsis length in the modal.** The 60-80 word target was set for a full
  page. In a panel a shorter blurb might read better. Never re-decided after the
  modal shipped; current median is 75 words.
- **Whether `projects` entries should get synopses at all.** A project the user
  built is not a work someone else described, so external grounding may not
  exist or make sense.
- **Non-media categories with no registry** (ideas, journal, recipes): schema
  supports `id_source: none`, still untested.
- **`public` flag is always true.** No decision needed until private entries are
  wanted.
- **Enrichment is ID + cover + credit + synopsis.** Amended deliberately twice
  (see CLAUDE.md). Still do NOT add cast, runtime, budget, or crew beyond the
  director.
- **Dateline year-vs-logged-date** is a judgment call, not a firm rule.

## How to resume

- **If another session is active, work in a worktree.** `git worktree add
  /tmp/lifeos-wt <branch>` then `pnpm install` inside it (a symlinked
  `node_modules` breaks Turbopack). See CLAUDE.md.
- Run the site: `pnpm --dir web dev`.
- Check synopsis quality: `pnpm --dir web lint-synopses` (exits non-zero on
  failure).
- Enrich one entry: `pnpm --dir web enrich --category films --slug <slug>`.
  That fetches the cover and credit, and **prints grounding facts for you to
  write the synopsis from**. There is no API key and no script that writes it.
  Rules: [docs/synopsis-brief.md](docs/synopsis-brief.md).
- To log something: tell Claude; it invokes the `capture` skill.
- Deploy is automatic on push to `main`.
