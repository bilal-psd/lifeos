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
properties:                  # optional — typed, filterable facets
  rating: 4                  # number
  language: [English]        # scalar or list; filters merge both the same way
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
| `properties`  | no       | Typed, user-facing facets used as filters (see below).      |
| `metadata`    | no       | ID block; fields defined by the category skill. Omit for    |
|               |          | categories with no external registry.                       |
| `id_status`   | no       | Inside `metadata`. `verified` when the ID is confirmed,     |
|               |          | `unverified` when it was a best guess.                      |

### Properties (filterable facets)

`properties:` holds typed key/values the website turns into **filters** on each
category page. Unlike `tags` (freeform labels) and `metadata` (machine IDs),
properties are the facets you'd filter by — `rating`, `language`, `year`,
`lists` (list membership), etc.

- **Generic, used per category.** Any key is allowed; a category just uses the
  ones that fit (books → `language`; films → `rating`, `language`, `year`).
  The same key name shared across categories (e.g. `language`) means the same
  thing.
- **Value shapes.** A scalar (`rating: 4`) or a list (`language: [English, Hindi]`,
  `lists: [malayalam-starter-pack]`). The site normalizes both to lists.
- **Filters are derived from the data.** A property becomes a filter the moment
  one entry uses it — no separate registration. Type is inferred (all-numeric →
  range, all-boolean → toggle, else multi-select).
- **`content/_properties.json` is the optional override** for labels, types, and
  numeric range when inference isn't enough (e.g. `rating` is pinned to a 1–5
  scale, `language` gets the "Language" label). Store **full language names**
  (`English`, not `en`).

### Custom lists (the `lists` property)

Lists are just a **shared property** with a name registry — they work in any
category with no per-category setup.

- **Membership** is the `lists` property on an entry, holding list **slugs**:
  ```yaml
  properties:
    lists: [malayalam-starter-pack, best-of-2024]
  ```
  An entry can be in several lists; a slug can be used across categories.
- **Names live in `content/_lists.json`** — slug → `{ name, description }`:
  ```json
  { "malayalam-starter-pack": { "name": "Malayalam Cinema Starter Pack",
                                "description": "A gateway into modern Malayalam film." } }
  ```
  A slug with no registry entry falls back to a humanized label; register it so
  the filter reads nicely.
- **It filters for free.** Because filters derive from the data, the moment one
  entry has a `lists` value the category page shows a **List** filter, labelled
  by the registry name. No code changes per list.
- **To add a list:** register it in `_lists.json` (once), then add its slug to
  each member entry's `lists` property. See the `lists` skill.

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
