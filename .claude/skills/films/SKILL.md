---
name: films
description: Filing convention for the films category — how to record a film the user watched, and which external IDs to attach.
---

# Category: films

Use this when the user is logging a film or movie they watched.

## ID convention

```yaml
id_source: tmdb
id_fields: [tmdb_id, imdb_id]
lookup: web        # resolve via web search (MVP), no API key
```

- **Canonical source:** TMDb (The Movie Database). It also exposes the IMDb id.
- Store **both** `tmdb_id` (the TMDb numeric id) and `imdb_id` (the `tt…` id).
- Link-out on the website uses `imdb_id` → `https://www.imdb.com/title/<imdb_id>/`.

## Resolving the ID (MVP: web lookup)

1. Search the web for the film by **title + year** (use the year if the user
   mentioned one; otherwise the most likely/most recent well-known match).
2. Capture the TMDb id and the IMDb `tt…` id.
3. Set `id_status: verified` if the match is unambiguous. If the title is
   ambiguous (multiple plausible films, no year given) set `id_status:
   unverified` and ask the user a single clarifying question before committing.

## Filing notes

- `title` is the film's title (quote it in YAML if it contains a colon).
- `date` is when the user watched it (today if unspecified).
- Suggested tags: genre, `rewatch` if they said they'd seen it before, etc. —
  but only tags the user's note actually supports. Do not invent facts.
- Body = the user's note, lightly edited for readability but never changed in
  meaning or voice (see the capture skill's golden rules).

## Example

`content/films/2026-08-14-dune-part-two.md`

```markdown
---
title: "Dune: Part Two"
category: films
date: 2026-08-14
tags: [sci-fi, rewatch]
public: true
metadata:
  tmdb_id: 693134
  imdb_id: tt15239678
  id_status: verified
---

Watched Dune: Part Two last night. The visuals floored me.
```
