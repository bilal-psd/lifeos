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

## Properties (filterable facets)

Set these under `properties:` when the info is available (see
[docs/schema.md](../../../docs/schema.md) for the mechanism):

- `language` — the film's **primary language, full name** (e.g. `Korean`, not
  `ko`). Infer at capture from the TMDb/Letterboxd lookup you're already doing;
  don't ask the user.
- `rating` — a **required** 1–5 number. Every film must be rated. If the user's
  note doesn't give one, ask for it. If they decline or don't answer, set
  `rating: 3` (the midpoint) and **tell them you defaulted it** so they can
  change it. Never silently invent a non-midpoint rating.
- `year` — release year (number), when known from the lookup.
- `liked`, `lists` — set when the user says they loved it / is adding it to a
  named list.

Follow the one-question rule: infer what you can; the rating is the one thing
always worth asking, because it's required — prompt for it, and fall back to the
midpoint only if the user won't give one.

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
