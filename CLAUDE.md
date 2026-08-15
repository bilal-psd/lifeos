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
- **Your words are preserved verbatim.** Claude never rewrites your note.
- **Retrieval is folder + grep + skill instructions.** No database, no embeddings.

## Repo layout

```
content/            # the archive (source of truth), one folder per category
  films/
  books/
.claude/skills/
  capture/          # entry point — files what you tell Claude
  new-category/     # meta-skill — creates a new category skill
  films/  books/    # category skills (filing + ID conventions)
web/                # Next.js site that renders the archive
docs/schema.md      # the entry file format (the core contract)
```

## Capturing an entry

When the user describes something to archive, invoke the **`capture`** skill.
It classifies the entry, loads (or creates) the right category skill, resolves
an external ID, writes the markdown file, and commits it.

## The entry format

See [docs/schema.md](docs/schema.md). In short: one markdown file per entry,
YAML frontmatter holds machine data (`title`, `category`, `date`, `tags`,
`public`, and a `metadata:` block for IDs); the body is the user's note,
untouched.

## Conventions

- File names: `content/<category>/YYYY-MM-DD-slug.md`.
- Dates are absolute (`YYYY-MM-DD`).
- Everything is `public: true` for now.
- Package manager for the site is **pnpm** (`cd web && pnpm ...`).

## Design decisions (settled — don't re-litigate)

- **Enrichment is ID-only.** Attach a stable external index (IMDb/TMDb id,
  ISBN/OLID, etc.) and nothing else — no cast, runtime, posters, or summaries.
  This was an explicit user call.
- **The category skill owns its ID convention.** `new-category` makes the
  ID-source decision **once per category**, with a single user confirmation,
  from the authorities table in its SKILL.md, and freezes it into the new
  category skill. `id_source: none` is a valid, first-class outcome (ideas,
  journal, recipes). Users are never asked per-entry.
- **MVP resolves IDs via web lookup** at capture time (no API keys). Set
  `metadata.id_status: unverified` and ask ONE clarifying question only when a
  title is genuinely ambiguous. TMDb/Open Library API wiring is a deferred
  upgrade, not part of MVP.
- **User's note is verbatim.** Never summarize/rewrite the body. IDs live under
  `metadata:` so the machine-added part stays separate from the user's words.
- **No DB, no embeddings.** Retrieval is folder + grep + skill instructions.
  Chosen deliberately for a personal-scale archive; don't add infra.

## Gotchas

- **YAML dates parse to `Date` objects.** gray-matter turns an unquoted
  `date: 2026-08-01` into a JS `Date`, so `String()` yields the full
  `toString()`. `web/lib/archive.ts` normalizes via `toISODate()` — keep dates
  flowing through it, don't `String(data.date)` directly.
- **`content/` is at the repo root, outside `web/`.** The site reads it via
  `../content` (`CONTENT_DIR` env overrides). This is why the Vercel project
  needs `sourceFilesOutsideRootDirectory: true` (see Deployment). A `vercel
  build` from inside `web/` alone would NOT see `content/`.

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
