# Writing brief: synopses

**Claude writes these, not a script.** There is no model API key in this repo
and no code that calls one. `pnpm --dir web enrich --only grounding` prints the
facts for an entry; you write the blurb from them and save the file.

Each blurb appears on a public page beside the archive owner's own star rating
and, often, their own written note.

## What to produce, per entry

Exactly one file:

```
content/<cat>/synopses/<slug>.md
```

With this exact shape. Copy `sources` verbatim from the entry record.

```markdown
---
generated: 2026-08-22
model: claude-sonnet-5
grounding: tmdb
sources:
  - https://www.themoviedb.org/movie/27205
  - https://en.wikipedia.org/wiki/Inception
---

Christopher Nolan's 2010 science-fiction thriller follows Cobb, a corporate spy
who steals secrets from people while they sleep. ...
```

Set `grounding` to `tmdb` for films, `google-books` for books, or `web-search`
when a Wikipedia extract was the main thing you wrote from. `enrich` prints the
right value.

## The blurb

60 to 80 words. What it is about, who made it, and what it is known for.

### Content rules, all mandatory

- **Describe, never judge.** No verdict, no praise, no criticism, no
  recommendation, no rating language. The opinions on this site belong to the
  owner, not to you.
- **Only what the grounding supports.** This is the rule that matters most. You
  may recognise many of these titles. Write from the supplied record anyway. If
  a fact is not in the record, leave it out. Do not fill gaps from memory, and
  never invent a plot point, a date, an award, or a name.
- **Your own words.** Never reuse phrasing or sentence structure from the source
  text. It is copyrighted and this page is public. A close paraphrase is not
  acceptable, so re-express the substance from scratch.
- Third person. Present tense for plot or argument.
- No major spoilers. Do not reveal endings or late twists.
- If the record is genuinely too thin to write 60 words honestly, write fewer
  words rather than padding, and note it in your report.

### Style rules, equally mandatory

A blurb that reads like marketing copy has failed.

- Never use an em dash. Use a period or a comma.
- No promotional or evaluative adjectives. Banned outright: acclaimed, beloved,
  iconic, masterful, stunning, vibrant, breathtaking, renowned, seminal,
  poignant, haunting, powerful, unflinching, gripping, masterpiece.
- No "not just X, but Y" construction.
- Do not force items into groups of three. Use however many the facts give you.
- Do not end a sentence with a decorative -ing clause such as "cementing its
  status as", "exploring themes of", or "highlighting the".
- Write "is" and "has", not "serves as", "stands as", "boasts", or "features".
- No abstract metaphor nouns: tapestry, landscape, journey, meditation, lens,
  portrait, tour de force, testament.
- No vague attribution. Never write "critics say", "widely regarded as", or
  "considered by many".
- Prefer active voice, and name who does what.
- Vary your sentence rhythm. Do not open every blurb with the same construction.
- **Be concrete.** Name the person, place, year, or event. If a sentence could
  sit unchanged in a blurb for a different work, delete it and write something
  specific instead.

## Franchises

Some batches contain several entries from one series. Read those together and
differentiate them deliberately. Each blurb must say what distinguishes *that*
instalment. Near-identical blurbs across a series are a failure.

## Check the grounding before you trust it

Wikipedia is resolved by search, so it lands on the wrong article more often
than you would expect. Over one full pass, 34 of 371 extracts described
something adjacent rather than the work: soundtrack albums, video game
adaptations, sequels, and author biographies standing in for the book.
`articleMatches()` in `web/scripts/lib/synopsis.mjs` rejects the obvious cases,
but read the extract and confirm it is about *this* work before writing from it.
If it is not, write from the TMDb or publisher text alone.

## Two failures worth naming

Both of these shipped once and had to be rewritten:

- **Never write meta-commentary about the sources.** A blurb once read "no plot
  description was available for this title." If you lack material, write less.
- **Never drift onto the creator's other work.** A blurb for The Hunger Games
  ended with Suzanne Collins's other series, because the grounding was her
  author page. Write about this work only.
