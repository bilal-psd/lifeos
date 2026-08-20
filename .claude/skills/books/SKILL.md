---
name: books
description: Filing convention for the books category — how to record a book the user read, and which external IDs to attach.
---

# Category: books

Use this when the user is logging a book they read (or are reading).

## ID convention

```yaml
id_source: openlibrary
id_fields: [isbn_13, olid]
lookup: web        # resolve via web search (MVP), no API key
```

- **Canonical source:** Open Library. ISBN is the natural key; OLID is Open
  Library's own stable work/edition id.
- Store `isbn_13` (preferred) and `olid` when available.
- Link-out on the website uses `olid` →
  `https://openlibrary.org/books/<olid>` (fall back to an ISBN search link).

## Resolving the ID (MVP: web lookup)

1. Search the web for the book by **title + author** (ask for the author only if
   the title is common and the user didn't say).
2. Capture the ISBN-13 and the OLID.
3. Set `id_status: verified` for an unambiguous match; `unverified` (and ask one
   clarifying question) if multiple editions/works are plausible. Prefer the
   original/most common edition when the user didn't specify one.

## Properties (filterable facets)

Set these under `properties:` when available (see
[docs/schema.md](../../../docs/schema.md) for the mechanism):

- `language` — the edition's **language, full name** (e.g. `English`, `Malayalam`,
  not `eng`). Open Library editions often omit it; set it when the lookup or the
  user's note makes it clear, otherwise leave it off rather than guessing.
- `rating` — a **required** 1–5 number for a finished book (see **Currently
  reading** below for the one exception). If the user's note doesn't give one,
  ask for it. If they decline or don't answer, set `rating: 3` (the midpoint)
  and **tell them you defaulted it** so they can change it later.
- `lists` — set when the user is adding the book to a named list.
- `status` — set to `reading` while a book is in progress; otherwise omit it
  entirely (a finished book has no `status` field). See below.

Infer what you can from the lookup; always prompt for the rating (it's required
for a finished book), falling back to the midpoint only if the user won't give one.

## Currently reading

A book the user has started but not finished gets filed like any other
capture, with two differences: skip the rating prompt, and set
`properties.status: reading` instead. It shows up in a small carousel on the
site, separate from the rated grid.

**Starting a book** — normal capture flow (ID lookup, file, commit, push), just
with `status: reading` and no `rating` key at all.

**Finishing a book** — the user will tell you later ("finished <title>, rate
it 4"). This is **not** a new capture — find the existing entry (grep
`content/books/` for the title with `status: reading`) and edit it in place:
- Delete the `status: reading` line (or the whole `status` key).
- Add the required `rating` (prompt if they didn't give one, per the usual rule).
- Update `date` to today (or the date they say they finished) — `date` means
  "when finished" for every rated book, so it needs to move off the start date.
- Leave the filename as-is; don't rename it to match the new date.
- Commit and push that one file, same as any other edit: `git commit -m
  "Finish book: <title>"`.

## Filing notes

- `title` is the book's title; consider adding the author to `tags` or letting
  it live only in the user's note (do not fabricate an author).
- `date` is when the user finished/read it — or started it, for a
  currently-reading entry (today if unspecified).
- Body = the user's note, lightly edited for readability but never changed in
  meaning or voice (see the capture skill's golden rules).

## Example

`content/books/2026-08-01-the-name-of-the-wind.md`

```markdown
---
title: "The Name of the Wind"
category: books
date: 2026-08-01
tags: [fantasy]
public: true
metadata:
  isbn_13: "9780756404741"
  olid: OL8479867M
  id_status: verified
---

Finally finished The Name of the Wind. The framing story pulled me in.
```
