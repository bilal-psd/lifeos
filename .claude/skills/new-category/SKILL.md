---
name: new-category
description: Meta-skill that creates a new category for the LifeOS archive — decides its canonical ID source once (with the user's confirmation) and scaffolds a category skill.
---

# Meta-skill: new-category

Use this when the `capture` skill encounters an entry that doesn't fit any
existing category (no folder under `content/`, no `.claude/skills/<category>/`).

Its job is to make the **ID-source decision once, at category birth**, and
freeze it into a new category skill. After that, every entry in the category
just follows the recorded convention — the user is never asked again.

## Steps

1. **Name the category.** Choose a short, lowercase, singular-ish folder name
   (`films`, `books`, `games`, `music`, `places`). Prefer an existing well-known
   name over a clever one.

2. **Propose a canonical ID source** from the authorities table below. If none
   fits, the category has **no external ID** — that's a valid, first-class
   outcome (e.g. personal ideas, journal notes, invented recipes).

3. **Confirm with the user — exactly once.** Ask a single yes/no, e.g.
   *"New category `games`. Standard ID for this is IGDB. Use that?"* Accept an
   alternative if they offer one.

4. **Scaffold the category skill** at `.claude/skills/<category>/SKILL.md` using
   the template below, filling in the frozen `id_source` / `id_fields` /
   `lookup` and a sensible link-out URL. Mirror the structure of the existing
   `films` / `books` skills.

5. **Create the content folder** `content/<category>/`.

6. **Hand back to `capture`** to file the actual entry.

**Shared properties come free.** Don't build per-category filtering or lists —
`properties` (rating, language, …) and custom **lists** are generic: any entry
in any category can use them and they become filters automatically. See
[docs/schema.md](../../../docs/schema.md) and the `lists` skill.

## Known-authorities table

| category (examples)        | id_source     | id_fields                | link-out base                                  |
|----------------------------|---------------|--------------------------|------------------------------------------------|
| films, movies              | tmdb          | tmdb_id, imdb_id         | https://www.imdb.com/title/<imdb_id>/          |
| tv, shows, series          | tmdb          | tmdb_id, imdb_id         | https://www.imdb.com/title/<imdb_id>/          |
| books                      | openlibrary   | isbn_13, olid            | https://openlibrary.org/books/<olid>           |
| music, albums, songs       | musicbrainz   | mbid                     | https://musicbrainz.org/release/<mbid>         |
| games, videogames          | igdb          | igdb_id                  | https://www.igdb.com/games/<slug>              |
| papers, research           | doi/arxiv     | doi, arxiv_id            | https://doi.org/<doi>                          |
| places, restaurants        | google-places | place_id                 | https://www.google.com/maps/place/?q=place_id:<place_id> |
| podcasts                   | podcastindex  | feed_id, itunes_id       | (feed url)                                      |
| tools, apps, software      | —             | url                      | (homepage url)                                 |
| ideas, notes, journal      | none          | —                        | —                                              |
| recipes (your own)         | none          | —                        | —                                              |

If the user's new category isn't in this table, pick the closest analog, or use
`none` when nothing external is a good canonical key. When in doubt, prefer
`none` over a shaky source — an ID that can't be trusted is worse than no ID.

## Category skill template

```markdown
---
name: <category>
description: Filing convention for the <category> category — how to record a <thing> and which external IDs to attach.
---

# Category: <category>

Use this when the user is logging a <thing>.

## ID convention

​```yaml
id_source: <id_source>      # or: none
id_fields: [<fields>]       # omit if none
lookup: web
​```

- Canonical source: <source, and what it gives>.
- Link-out on the website uses <field> → <link-out base>.

## Resolving the ID (MVP: web lookup)

1. Search the web by <the natural query for this thing>.
2. Capture <the id fields>.
3. `id_status: verified` when unambiguous; otherwise `unverified` + one
   clarifying question.

(Delete this whole section if id_source is `none`.)

## Filing notes

- title / date / tags guidance specific to this category.
- Body = the user's note, verbatim. Never fabricate facts.
```
