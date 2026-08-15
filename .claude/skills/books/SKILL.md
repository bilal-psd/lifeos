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

## Filing notes

- `title` is the book's title; consider adding the author to `tags` or letting
  it live only in the user's note (do not fabricate an author).
- `date` is when the user finished/read it (today if unspecified).
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
