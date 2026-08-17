---
name: lists
description: Create and manage custom lists across the archive — curated groupings of entries (a films "starter pack", a books "to reread", a cross-category "best of 2024"). Use when the user wants to make a list, add entries to a list, remove them, rename a list, or list what's in one. Lists work in any category and show up as a filter automatically.
---

# Skill: lists

Lists are curated groupings that cut across the archive. They are **generic** —
the same mechanism works for films, books, and any future category — and they
appear as a **List** filter on the category page with zero extra code.

## How a list works (the contract)

Two pieces, both in `content/`:

1. **Membership** — the `lists` property on each member entry, holding list
   **slugs** (see [docs/schema.md](../../../docs/schema.md)):
   ```yaml
   properties:
     lists: [malayalam-starter-pack]
   ```
2. **The name registry** — `content/_lists.json`, mapping slug → name/description:
   ```json
   {
     "malayalam-starter-pack": {
       "name": "Malayalam Cinema Starter Pack",
       "description": "A gateway into modern Malayalam film."
     }
   }
   ```

The website derives the filter from the data, so the List filter appears the
moment one entry has a `lists` value, labelled by the registry name.

## Creating a list

1. **Pick a slug** — lowercase, hyphenated, from the list's name
   (`Malayalam Cinema Starter Pack` → `malayalam-starter-pack`). Slugs are the
   stable key; the display name can change later without touching entries.
2. **Register it** in `content/_lists.json` (create the file if missing). Add
   `name` (required) and a short `description` (optional). Don't invent a
   description the user didn't imply.
3. **Add members** (below).

## Adding / removing members

- **Resolve each entry to its markdown file** (grep by title within the right
  category), then edit its frontmatter `properties`:
  - If a `properties:` block exists, add or extend `lists:` — append the slug,
    keep it a flow list, dedupe.
  - If there's no `lists:` line yet, add `  lists: [<slug>]`.
  - If the entry has no `properties:` block at all, add one (before `metadata:`).
- **Removing** = delete the slug from that entry's `lists` (and drop the `lists:`
  line if it becomes empty).
- An entry can belong to several lists; a slug can be reused across categories
  (a `favorites` list in both films and books is fine).

## Other operations

- **Rename** — change `name` in `_lists.json` only; slugs on entries stay put.
- **Delete a list** — remove its slug from every member entry, then delete its
  `_lists.json` key. (Grep `content/` for the slug to find members.)
- **What's in a list** — grep `content/` for the slug.

## Filing notes

- This is filing, not authoring: never fabricate which entries belong to a list.
  Add exactly the entries the user named (or that a source they gave lists).
- Bulk membership (e.g. importing a Letterboxd/Goodreads list export) is fine as
  a single commit — one commit for the whole list is cleaner than one per member.
- After editing, **commit and push** (see the capture skill's golden rules).
- No per-category setup is ever needed — lists are a shared property.
