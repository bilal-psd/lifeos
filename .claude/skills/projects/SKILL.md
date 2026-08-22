---
name: projects
description: Filing convention for the projects category — how to record a software project the user built, and which external IDs to attach.
---

# Category: projects

Use this when the user is logging a software project they built (an app,
tool, extension, script) — one they're currently working on or have worked on
in the past.

## ID convention

```yaml
id_source: none
id_fields: [repo_url, homepage_url]
lookup: none        # not looked up externally — the user names their own project
```

- **No external registry.** These are the user's own projects, not something
  looked up in a public database, so there's no ambiguity to resolve and no
  `id_status` field.
- `repo_url` — the canonical link-out. The GitHub (or other) repo URL.
  Required whenever the project has a repo (get it from `git remote -v` in
  the project directory).
- `homepage_url` — optional. Where you'd actually go to *use* the thing, when
  that's different from the repo: a deployed site, a Homebrew cask page, a
  Chrome Web Store / App Store listing. Omit if the project has no separate
  homepage.
- Link-out on the website prefers `homepage_url` when present, else
  `repo_url`.

## Properties (filterable facets)

Set these under `properties:` (see
[docs/schema.md](../../../docs/schema.md) for the mechanism). No `rating` —
these are the user's own work, not something to score.

- `project_status` — **required**, one of:
  - `active` — currently being worked on
  - `shipped` — released/published and in a stable, usable state
  - `paused` — started, unfinished, not currently being worked on
  - `archived` — no longer maintained or relevant
  Infer a reasonable default from recent git activity and the project's own
  docs (e.g. a README "not started" roadmap table, a recent commit) but ask
  the user to confirm rather than silently guessing when it's unclear.
- `stack` — list of the main technologies (e.g. `[Swift, SwiftUI]`,
  `[Next.js, React, TypeScript, Supabase]`, `[Python, FastAPI]`). Pull this
  from the manifest (`package.json`, `pyproject.toml`, `Package.swift`) —
  don't ask the user.
- `lists` — set when the user is adding the project to a named list.

## Filing notes

- `title` is the project's name (e.g. "Marquee").
- `date` — when the project was started, or today if the user doesn't say.
  Unlike films/books, this isn't "when experienced" — it's more of an
  anchor date for the entry; don't stress over precision.
- Good sources to pull facts from without asking: `README.md`, the manifest
  file, `git remote -v`, `git log -1` (for status inference).

## The body: a portfolio page, not a note

Unlike films/books (a short personal reaction), a project entry's body is
**documentary** — it should read as a portfolio case study, roughly a page
long, something a recruiter or future-you would actually want to read.

- **Write it as an article, not a spec sheet.** Real markdown headings
  (`## `, sentence case), full narrative paragraphs underneath each one — not
  a bold inline label followed by one clipped sentence (`**The problem.**
  Checking what's playing...`). Let a section run several paragraphs when
  there's material; don't compress facts into terse fragments for their own
  sake. It should read like the story of building the thing, not a table of
  facts about it.
- **Include ASCII diagrams where they earn their place** — an architecture /
  data-flow diagram, a release pipeline, a state machine, whatever the
  project actually has that's easier to see than to read. Plain fenced code
  blocks, placed next to the prose they illustrate. Not mandatory for every
  section, only where there's a real shape to draw.
- **Still run every draft through `/unslop`** (see below) — long-form and
  narrative doesn't mean license for AI-writing tells; if anything a longer
  draft has more places for them to hide.

Cover the same ground as before, but as a narrative arc rather than six
isolated boxes — roughly this order, blending sections together where the
story wants to:

1. **The itch** — what friction, need, or curiosity led to building this.
2. **What it does** — the pitch.
3. **How it works** — the interesting engineering, architecture, and any
   diagram that helps. Not a full stack list.
4. **What got hard along the way** — real bugs or edge cases hit and how they
   got fixed; deliberate decisions and tradeoffs, including rejected
   alternatives if known. This is usually the most interesting section — tell
   it as what happened, not as a bullet list of facts.
5. **Shipping it** — release process, distribution, and a pipeline diagram
   if there's a real one worth drawing.
6. **Where it stands** — current status, version, any real usage signal.

Links (repo + homepage) are already covered by `metadata` — no separate link
section needed in the body.

### The audit (do this before asking anything)

Read, in the project directory, whatever of these exist — they're often a
goldmine written *during* development, especially for sections 1 and 4:

- `README.md` — what it does, features, install.
- `PLAN.md`, `DESIGN.md`, `PRODUCT.md`, `CLAUDE.md`, `AGENTS.md`,
  `DEVELOPING.md` — motivation, architecture rationale, settled decisions,
  rejected directions, open questions. LifeOS's own `CLAUDE.md` is the
  pattern to recognize: "Design decisions (settled — don't re-litigate)"
  style sections are exactly section-4 material.
- The manifest (`package.json`, `pyproject.toml`, `Package.swift`, …) — stack.
- `git log --oneline --reverse` (first commit = rough start date, the shape
  of iteration) and `git log -1` (recency, for `project_status`).
- `gh repo view <owner>/<repo> --json stargazerCount,description,createdAt,pushedAt`
  when the repo is on GitHub — real, verifiable usage signal.

### Draft, don't interrogate

Default to **drafting an answer for every section yourself** from what the
audit turns up, then hand the whole draft to the user as one page to review —
not a question per section. Only fall back to an explicit question when a
section has no evidence anywhere *and* a plausible inference would be
guessing at the user's personal reasoning (usually just section 1, sometimes
5). When you do infer rather than quote a source, say so in the review pass
("I'm inferring this from X — correct me") rather than presenting a guess as
fact. Never invent numbers (stars, users, downloads) — pull them or omit them.

This is still bound by the capture skill's "never fabricate" rule — audit and
draft aggressively, but every claim must trace back to something you read,
not something you assumed.

### Always run the draft through unslop

Before presenting a drafted body for review, run it through the **`unslop`**
skill. These bodies are dense, Claude-drafted prose stitched from several
source docs — exactly the shape that reads as AI-generated if left as-is.
Unslop, then present the result. Every project entry body goes through this,
no exceptions.

## Example

`content/projects/2026-08-22-marquee.md` — see that file for a full worked
example of the narrative, headed, diagram-including body format described
above.
