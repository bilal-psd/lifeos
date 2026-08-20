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

- **Enrichment is ID-only, plus a cover image.** Attach a stable external index
  (IMDb/TMDb id, ISBN/OLID, etc.) and a **cover** — nothing else (no cast,
  runtime, or summaries). The cover was a deliberate amendment to the original
  ID-only rule; see **Covers** below for how it's stored and served.
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
- **Sources (keyless where possible):**
  - **Books** — Open Library: `https://covers.openlibrary.org/b/isbn/<isbn_13>-L.jpg`
    (or `/b/olid/<olid>-L.jpg`). No key. Add `?default=false` to get a 404 on a
    miss instead of a blank image.
  - **Films** — TMDb poster: `https://image.tmdb.org/t/p/w500<poster_path>`. The
    image host is keyless, but `poster_path` is **not** derivable from `tmdb_id` —
    it comes from the TMDb API (needs a key) or the web lookup. New-film capture
    grabs it during the web lookup; the batch backfill script uses `TMDB_API_KEY`
    (env only, never committed). Store `poster_path` under `metadata` too.
- **Missing covers** render a deterministic duotone fallback tile (title +
  monogram) in the UI — nothing looks broken when a source has no cover.
- **Backfill:** `web/scripts/fetch-covers.mjs` fetches covers for existing
  entries by their stored IDs. Idempotent; skips entries that already have a
  cover file.

## Gotchas

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
