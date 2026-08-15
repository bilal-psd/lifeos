# Entry schema

The archive is plain markdown. One file per entry. This document is the
contract every skill and the website rely on.

## File location & naming

```
content/<category>/<YYYY-MM-DD>-<slug>.md
```

- `<category>` — the entry's category (matches a folder under `content/`).
- `<YYYY-MM-DD>` — the date the thing happened, or the capture date if unknown.
- `<slug>` — lowercase, hyphenated, derived from the title.

Example: `content/films/2026-08-14-dune-part-two.md`

## Frontmatter (YAML)

```yaml
---
title: "Dune: Part Two"      # required — display title
category: films              # required — must match the folder
date: 2026-08-14             # required — YYYY-MM-DD
tags: [sci-fi, rewatch]      # optional — list of lowercase strings
public: true                 # required — website only renders public entries
metadata:                    # optional — machine-added IDs, per category
  tmdb_id: 693134
  imdb_id: tt15239678
  id_status: verified        # verified | unverified
---
```

### Field rules

| field         | required | notes                                                       |
|---------------|----------|-------------------------------------------------------------|
| `title`       | yes      | Quote if it contains `:` or other YAML-special characters.  |
| `category`    | yes      | Must equal the parent folder name.                          |
| `date`        | yes      | `YYYY-MM-DD`. Absolute, never relative.                     |
| `tags`        | no       | Flow list, lowercase. Omit if none.                         |
| `public`      | yes      | `true` for now (everything is public).                      |
| `metadata`    | no       | ID block; fields defined by the category skill. Omit for    |
|               |          | categories with no external registry.                       |
| `id_status`   | no       | Inside `metadata`. `verified` when the ID is confirmed,     |
|               |          | `unverified` when it was a best guess.                      |

## Body

Everything after the frontmatter is **the user's note**. Claude may lightly
edit it for readability — grammar, paragraph breaks, tightening rambling
phrasing — but must never change its meaning, opinions, or voice, and must not
add ideas the user didn't express. It stays their note, just cleaned up.

## Why `metadata` is separate

The frontmatter mixes two kinds of data:
- **User-declared** (`title`, `date`, `tags`) — what the user told us.
- **Machine-added** (`metadata.*` IDs) — what Claude looked up.

Keeping IDs under `metadata:` makes the machine-added part explicit and
auditable in git, and leaves the user's contribution clearly theirs.
