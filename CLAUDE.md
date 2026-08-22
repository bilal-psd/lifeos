# LifeOS

An AI-powered personal archive and publishing system.

You tell Claude about things you experience, learn, create, or enjoy. Claude
understands the context, files it into the archive as markdown, preserves your
original words, and a website makes it browsable.

## How it works

```
You → Claude (capture skill) → category skill → markdown in content/ → git → web/ site
```

- **Natural-language first.** No forms. You just say what you did/thought.
- **Markdown is the source of truth.** Everything lives in `content/`.
- **Git is the version history.** Each capture is its own commit.
- **Categories are extensible.** Each has a skill in `.claude/skills/<category>/`.
  A meta-skill (`new-category`) creates new ones on demand.
- **Your voice is preserved.** Claude may lightly clean up your note for
  readability, but never changes its meaning or substitutes its own words.
- **Retrieval is folder + grep + skill instructions.** No database, no embeddings.

## Repo layout

```
content/            # the archive (source of truth), one folder per category
  films/
  books/
  _properties.json  # optional filter overrides (label/type/range) per property
  _lists.json       # custom-list registry: slug -> {name, description}
.claude/skills/
  capture/          # entry point — files what you tell Claude
  new-category/     # meta-skill — creates a new category skill
  lists/            # create/manage custom lists (a shared, filterable property)
  films/  books/    # category skills (filing + ID conventions)
web/                # Next.js site that renders the archive
docs/schema.md      # the entry file format (the core contract)
```

## Capturing an entry

When the user describes something to archive, invoke the **`capture`** skill.
It classifies the entry, loads (or creates) the right category skill, resolves
an external ID, writes the markdown file, and commits it.

## The entry format

See [docs/schema.md](docs/schema.md). In short: one markdown file per entry.
YAML frontmatter holds `title`, `category`, `date`, `tags`, `public`, an
optional `properties:` block (typed, filterable facets like `rating`,
`language`, and list membership), and a `metadata:` block for IDs; the body is
the user's note. schema.md documents `properties` and custom lists in full.

## Conventions

- File names: `content/<category>/YYYY-MM-DD-slug.md`.
- Dates are absolute (`YYYY-MM-DD`).
- Everything is `public: true` for now.
- Package manager for the site is **pnpm** (`cd web && pnpm ...`).
- **Always `git push` after committing** — never ask first. Pushing to `main`
  auto-deploys via Vercel, so the push is the final step of every capture.

## Design decisions (settled — don't re-litigate)

- **Enrichment is ID + cover + credit + synopsis — and still nothing else.**
  The original rule was ID-only. It has been amended twice, deliberately, and
  each amendment is listed here so the rule stays a rule rather than drifting:
  1. a **cover image** (see **Covers** below);
  2. a **credit** — `properties.director` for films, `properties.author` for
     books — because an archive that can't say who made a thing is missing the
     single most-asked fact about it;
  3. an **AI-written synopsis** sidecar, because ~424 of 433 entries are bulk
     imports whose body is a stub like `Watched.`, leaving most pages empty.

  Still **not** enriched: cast lists, runtime, budget, publisher blurbs, crew
  beyond the director, or anything else. The bar for a fourth amendment is the
  same as for these: it answers a question a reader actually has on the page.
  See **Credits & synopses** below.
- **The category skill owns its ID convention.** `new-category` makes the
  ID-source decision **once per category**, with a single user confirmation,
  from the authorities table in its SKILL.md, and freezes it into the new
  category skill. `id_source: none` is a valid, first-class outcome (ideas,
  journal, recipes). Users are never asked per-entry.
- **MVP resolves IDs via web lookup** at capture time (no API keys). Set
  `metadata.id_status: unverified` and ask ONE clarifying question only when a
  title is genuinely ambiguous. TMDb/Open Library API wiring is a deferred
  upgrade, not part of MVP.
- **User's note, lightly edited.** Clean up grammar/readability but never
  change meaning, opinions, or voice — and never add ideas they didn't express.
  IDs live under `metadata:` so machine data stays separate from the user's words.
- **No DB, no embeddings.** Retrieval is folder + grep + skill instructions.
  Chosen deliberately for a personal-scale archive; don't add infra.
- **Properties & lists are generic and data-derived.** Filterable facets live in
  a `properties:` block; the site builds each category's filter bar from whatever
  properties its entries actually use (refined by `content/_properties.json` for
  labels/types/range). Custom **lists** are just a shared `lists` property with a
  name registry (`content/_lists.json`) — they work in any category and become a
  filter automatically, with no per-category code. Don't hardcode per-category
  filters or a bespoke lists table. See docs/schema.md and the `lists` skill.
- **Lists can be static or rule-derived — same mechanism either way.** A list
  entry in `_lists.json` normally has manual membership (entries carry the
  slug in `properties.lists`). It can instead carry a `rule: {category,
  property, value}` — Perfect Films (`category: films, property: rating,
  value: 5`) is the example. `applyDynamicLists()` in `web/lib/archive.ts`
  evaluates every rule at read time and merges matching slugs into
  `properties.lists`, so from that point on a rule-derived list is
  byte-identical to a static one everywhere downstream (filter chip, Featured
  card, click-to-filter). Add new auto-lists by registering a rule, not by
  writing new code.
- **A category can define a lifecycle exception to "every entry needs a
  rating."** Books support `properties.status: reading` for an in-progress
  book — no rating required, excluded from the rated grid and from
  filter/sort entirely, shown in its own "Currently reading" strip. Finishing
  a book is **not** a new capture: the user tells Claude, which finds the
  existing entry and edits it in place (drops `status`, adds the rating,
  bumps `date`). This is the first "edit an existing entry" flow in the
  project — the capture skill was updated with a pointer to it (see "Editing
  an existing entry, not creating one" in `capture/SKILL.md`) so it's a
  documented pattern, not a one-off carve-out. Full flow lives in the `books`
  skill.

## Covers

Films and books carry a cover image. It's **self-contained** — downloaded into
the repo at capture time, never hotlinked — so the archive stays complete and
rot-proof.

- **Storage:** `content/<category>/covers/<slug>.<ext>` (jpg/webp/png). Same
  `<slug>` as the entry file. This is the source of truth; no cover field in the
  frontmatter — presence of the file *is* the cover.
- **Serving:** `web/scripts/sync-covers.mjs` copies `content/**/covers/*` into
  `web/public/covers/<category>/` at `predev`/`prebuild`. The site references
  `/covers/<category>/<slug>.<ext>`. We copy (not a runtime route) because
  serverless functions can't reliably read `../content` at request time; static
  files under `public/` always work. `web/public/covers/` is gitignored.
- **UI:** category pages have a **grid (default) / list** toggle in the header,
  persisted per-category in localStorage alongside display+sort. Grid is a poster
  wall (2:3, title + rating/year caption); list adds a small row thumbnail. Entry
  detail pages show a cover hero beside the title. Fallback tile + monogram live
  in `web/lib/cover.ts` (shared by the client list and the server detail page);
  `entry.cover` is set in `web/lib/archive.ts`.
- **Sources — the backfill uses a quality waterfall, not one source:**
  - **Books** — 1) **Google Books** by ISBN for the precise *identity* (canonical
    title + author) — its own image is often only a ~128px thumbnail, so it's used
    for metadata, not the picture; 2) **iTunes/Apple Books** search by that title,
    validated against the Google author (rejects wrong-author hits like *Divergent*
    quiz books), upscaled to `…/1200x1200bb.jpg` — this is the high-res image;
    3) **Open Library** `…/b/isbn/<isbn>-L.jpg?default=false` (≈500px) as fallback.
    Google Books needs a free API key; iTunes + OL are keyless.
  - **Films** — TMDb poster `https://image.tmdb.org/t/p/w500<poster_path>`. Image
    host is keyless but `poster_path` is **not** derivable from `tmdb_id` — the
    backfill resolves it from the TMDb API (needs `TMDB_API_KEY`); new-film capture
    grabs it during the web lookup. Store `poster_path` under `metadata` too.
- **API keys** live in **`web/.env.local`** (gitignored via `.env*`), which
  `fetch-covers.mjs` auto-loads (tiny inline parser, no dotenv dep): `TMDB_API_KEY`
  and `GOOGLE_BOOKS_API_KEY`. Never commit them. Real env vars override the file.
- **Missing covers** render a deterministic duotone fallback tile (title +
  monogram) — nothing looks broken when a source has no cover (TV series, obscure
  editions).
- **Backfill:** `cd web && pnpm fetch-covers` (or `node scripts/fetch-covers.mjs`).
  Idempotent — skips entries that already have a cover; `--force` refetches,
  `--category films|books` and `--limit N` scope it. After it runs, `pnpm covers`
  (or restart dev) re-syncs `public/`. Paces itself ~200ms/request.
- **NOT YET WIRED INTO CAPTURE.** The `films`/`books` SKILL.md files don't yet
  download a cover for a *new* entry — only the backfill script does. So after
  capturing a new film/book, run `pnpm fetch-covers` to give it a cover (until
  the skills are updated to do it inline). See PLAN.md.

## Credits & synopses

Both are produced by **`pnpm --dir web enrich`**
(`web/scripts/enrich.mjs`) — one command, three idempotent steps
(`--only covers|credits|synopses`), scoped with `--category`, `--slug`,
`--limit`, `--force`, previewable with `--dry-run`.

- **Credits** live in `properties.director` (films) / `properties.author`
  (books), registered `hidden: true` in `content/_properties.json` so they
  display everywhere but never become a filter chip (hundreds of distinct
  values would be useless as a facet). Sources: TMDb `credits.crew` where
  `job == "Director"`; Google Books `volumeInfo.authors` with a keyless
  **Open Library** fallback (`bookMeta()`), which rescues ~15% of books whose
  ISBN Google can't resolve. Coverage today: **358/358 films, 73/75 books** —
  the 2 holdouts have ISBNs neither source knows, and degrade to no credit line.
- **Synopses** are sidecar files at `content/<category>/synopses/<slug>.md`
  (same convention as `covers/`). Read straight from `content/` by
  `readSynopsisFile()` in `web/lib/archive.ts` — **no `public/` sync needed**,
  unlike covers, because they're text rendered server-side, not static assets.
- **Grounding is gathered by script; the blurb is written by Claude.** There is
  **no model API key in this repo and no code that calls one.**
  `pnpm --dir web enrich --only grounding --slug <slug>` prints the facts for an
  entry (TMDb overview and credits, Google Books or Open Library, plus a
  Wikipedia extract when the first source is thin). Claude writes the blurb from
  that during capture and saves the sidecar. A script that called Claude on
  Claude's behalf only added a bill and a dependency, since capture already runs
  through Claude. Rules live in **[docs/synopsis-brief.md](docs/synopsis-brief.md)**.
- **Verify the Wikipedia extract is about the right work.** It is resolved by
  search, and over one full pass **34 of 371 extracts described something else**:
  soundtrack albums (Pulp Fiction, Inglourious Basterds), a video game (Revenge
  of the Sith), a sequel (The Devil Wears Prada 2), an unrelated film (Easy A got
  a Swedish crime thriller), and nine author biographies standing in for the
  book. `articleMatches()` in `web/scripts/lib/synopsis.mjs` rejects the obvious
  cases; read the rest before trusting them.
- **Publisher copy can be marketing with no content.** "Over 10 million copies
  sold, from the bestselling author of..." passes a word count and says nothing.
  `MARKETING` in `synopsis.mjs` discards it so the entry is treated as thin
  rather than written from sales figures.
- **It is a synopsis, never a review.** No verdicts, praise, criticism or rating
  language; opinions on this site are the user's, in the entry body. Original
  wording, not close paraphrase, because the sources are copyrighted and the
  site is public. The UI labels the block "AI-generated" with sources linked.
  Don't quietly drop that label.
- **Quality is enforced mechanically.** A lint checks every blurb for em dashes,
  fifteen banned promotional adjectives, forced triples, decorative -ing endings,
  vague attribution, verdict language, length, and near-duplicate openings across
  the archive. Re-run it after any bulk edit.

## Editorial design system (books/films pages)

Settled after several mockup rounds (published as Claude artifacts, reviewed
with inline comments) — see PLAN.md "Rejected directions" for what was tried
and cut, so it doesn't get re-proposed without new information.

- **Type pairing: Fraunces (display) + Inter (UI), used narrowly.** Fraunces
  is loaded via `next/font/google` in `web/app/layout.tsx` as `--font-fraunces`,
  exposed as the `--font-display` token in `globals.css` (Tailwind's
  `font-display` utility). It's used *only* for the wordmark, the shelf
  eyebrows ("Currently reading", "Featured"), and the "reading" badge —
  italic, restrained. Everything data-dense (titles, captions, controls,
  filter/sort UI) stays Inter. This supersedes an earlier, now-stale decision
  that had rejected a serif entirely — don't revert to Inter-only citing that
  old decision.
- **The "shelf" panel** (`.shelf` in `globals.css`) is the warm-tinted raised
  surface used for both Currently Reading and Featured — a gradient
  background plus a soft gold bottom-edge glow (`.shelf::after`), visually
  distinct from the plain-dark grid below. Both shelves render *above* the
  header line, first thing under the masthead — not between the header and
  the grid, which is where they used to sit.
- **View toggle and filter/sort are two separate bordered pill groups, never
  merged into one.** Deliberate: the view toggle reflects passive display
  state, filter/sort trigger action menus. They live together on one
  consolidated header line (`{category} · {count}` + both pills), which
  replaced a three-mismatched-shapes header and, before that, a second
  control row that had nothing else on it (read as an orphaned floating
  control — the fix was removing the second row entirely, not styling around
  it).
- **Grid rating badge is a star glyph + number** (`★ 4.5`), not a bare
  decimal — a bare number was tried and rejected for not speaking the same
  visual language as the stars used everywhere else on the site. Whole
  numbers render without a trailing `.0`.
- **Grid dateline** shows `numProp(e, "year")` when the category has one
  (films); otherwise falls back to `formatMonthYear(e.date)` (books, and any
  future category with no `year` property) — see `web/lib/format.ts`. This is
  a judgment call, not a firm rule: if books ever want a "year published"
  distinct from "when I logged it," that needs a real `year` property, not a
  repurposed `date`.

## Gotchas

- **Covers serve through `next/image`, which caches hard.** After refetching a
  cover to the *same* path, the file on disk changes but the URL doesn't, so the
  dev preview (and a browser tab) can keep showing the old image. The disk/public
  file is the truth — verify with `md5`/dimensions, not the preview. To force the
  preview: clear `web/.next/cache/images` and restart dev. Production serves the
  correct file on a fresh build.
- **YAML dates parse to `Date` objects.** gray-matter turns an unquoted
  `date: 2026-08-01` into a JS `Date`, so `String()` yields the full
  `toString()`. `web/lib/archive.ts` normalizes via `toISODate()` — keep dates
  flowing through it, don't `String(data.date)` directly.
- **`content/` is at the repo root, outside `web/`.** The site reads it via
  `../content` (`CONTENT_DIR` env overrides). This is why the Vercel project
  needs `sourceFilesOutsideRootDirectory: true` (see Deployment). A `vercel
  build` from inside `web/` alone would NOT see `content/`.
- **Edit frontmatter surgically.** When bulk-editing YAML (e.g. stamping a list
  onto many entries), use exact string replacement, not a broad regex — a greedy
  pattern can eat an adjacent key like `metadata:`. Re-validate after bulk edits
  by parsing every file with gray-matter (the same parser `web/lib/archive.ts`
  uses).
- **A poster-tile overlay badge must come *after* `<Cover>` in JSX, not
  before.** Both are absolutely positioned in the same stacking context, so
  DOM order decides paint order — a badge placed before `<Cover>` renders
  fine while the cover is still loading (nothing to cover it yet) and then
  silently disappears the moment the real image loads on top of it. Bit both
  the "reading" badge and the grid rating badge during the redesign; fixed by
  reordering, not by adding z-index. Easy to miss because it looks correct in
  a screenshot taken before images finish loading.
- **`hidden: true` removes a property from the filter bar *and* from the list
  view.** `getFilters()` skips hidden keys (`web/lib/archive.ts`), and the list
  row's caption is built from `summaryDefs`, which is derived from
  `getFilters()` — so a hidden property silently disappears there too. The
  detail page's `<dl>` iterates `entry.properties` raw and is unaffected. That's
  why `director`/`author` are rendered explicitly in the grid tile, the list row
  and the currently-reading strip, via `creditOf()` in
  `web/app/[category]/rowHelpers.ts`.
- **A new line in the grid caption must render for every tile or the grid goes
  ragged.** Tiles align because the title div carries `min-h-[calc(1.32em*2)]`.
  The credit line follows the same rule: it renders whenever the *category* has
  any credits at all (`anyCredit`, computed over all rows, not the filtered
  view), so a missing credit leaves a gap instead of pulling that tile's
  dateline up. Computing it over the filtered view instead would make the line
  appear and vanish while filtering.
- **Upstream credit data is dirty.** Google Books returns `"B.R. Ambedkar,"`
  with a trailing comma; multi-author records include editors and translators.
  `cleanName()` in `web/scripts/lib/sources.mjs` strips surrounding
  commas/semicolons but deliberately leaves trailing periods alone, so
  "Martin Luther King Jr." survives.
- **Page width is intentionally split.** The root shell
  (`web/app/layout.tsx`) is `max-w-6xl` (1152px) so the poster grid gets real
  columns; entry detail pages (`web/app/[category]/[slug]/page.tsx`)
  override to `max-w-2xl` on purpose so prose doesn't stretch full-width.
  Don't "fix" the detail page to match the shell width.

## Deployment (Vercel + Netlify DNS)

Not derivable from the code — recorded here so a fresh session doesn't rediscover it.

- **Vercel project:** `lifeos`, team `bilals-projects-4cf7bbf2`. Git-connected
  to the GitHub repo, so **`git push` to `main` auto-deploys**. Manual deploy:
  `vercel deploy --prod --yes` from the repo root.
- **Project settings that make it work** (set via the Vercel REST API, since
  they're not in code): `rootDirectory=web`, `framework=nextjs`,
  `sourceFilesOutsideRootDirectory=true` (build sees `../content`),
  `ssoProtection=null` (deployment protection off → site is public).
- **Custom domain:** `lifeos.bilaldoesstuff.in`. DNS is on **Netlify** (apex
  `bilaldoesstuff.in` is the user's main site). Record: `CNAME lifeos →
  cname.vercel-dns.com`. The Netlify MCP does NOT manage DNS (deploys/forms/env/
  extensions only), and there's no Netlify token on disk — so DNS changes need
  the user or a Netlify PAT.
- **Local auth:** `gh` and `vercel` CLIs are both logged in as `bilal-psd`.
  The Vercel token is at
  `~/Library/Application Support/com.vercel.cli/auth.json`; `.vercel/project.json`
  has the project/team IDs (gitignored).

See [PLAN.md](PLAN.md) for current status and what's next.

## Agent skills

### Issue tracker

Issues live as GitHub Issues in this repo (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/` at repo root, created lazily). See `docs/agents/domain.md`.
