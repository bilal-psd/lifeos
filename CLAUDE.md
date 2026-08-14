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
