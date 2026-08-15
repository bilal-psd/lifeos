---
name: capture
description: Files something the user tells Claude into the LifeOS archive — classifies it, attaches an external ID, writes the markdown entry preserving the user's words, and commits it to git. Use whenever the user describes a thing they watched, read, played, visited, made, learned, or thought and wants it saved.
---

# Skill: capture

The entry point for the archive. When the user describes something to remember,
this skill turns it into a committed markdown entry.

## Golden rules

- **Keep the user's voice and substance.** The body is their note. You may
  lightly edit for readability — fix grammar, add paragraph breaks, tighten
  rambling phrasing, make a sentence make sense. Never change the essence,
  opinions, or meaning of what they said, and don't add ideas they didn't
  express. When in doubt, leave it as they said it.
- **Frontmatter is machine data; the body is theirs.** Facts Claude looks up
  (IDs) live under `metadata:`, never mixed into the note.
- **Ask at most one question, and only when you must** (genuine category or ID
  ambiguity). Default to sensible choices otherwise.

## Steps

1. **Extract** from what the user said:
   - a `title` (the thing itself),
   - the `category` it belongs to,
   - the `date` (when it happened; today — 2026-08-14-style absolute date — if
     unspecified),
   - any `tags` their note genuinely supports,
   - the note body (their exact words).

2. **Resolve the category.**
   - If `content/<category>/` and `.claude/skills/<category>/` exist → load that
     category skill.
   - If not → invoke the **`new-category`** meta-skill to create it (this makes
     the one-time ID-source decision), then continue.

3. **Resolve the ID** per the category skill's `id_convention`:
   - Do the web lookup it describes.
   - Fill the `metadata:` block with the id fields + `id_status`.
   - If `id_source: none`, omit `metadata:` entirely.
   - Only ask the user if the match is genuinely ambiguous.

4. **Write the file** at `content/<category>/<YYYY-MM-DD>-<slug>.md` following
   [docs/schema.md](../../../docs/schema.md). Set `public: true`.
   - `slug` = lowercase, hyphenated title.
   - If a file for the same slug/date already exists, tell the user rather than
     overwriting.

5. **Commit and push** just that file (always push — never ask first):
   ```bash
   git add content/<category>/<file>.md
   git commit -m "Add <category>: <title>"
   git push
   ```

6. **Report back** briefly: what was filed, the resolved ID (and whether it was
   verified), and the file path. Nothing more.

## Notes

- One entry = one file = one commit. Keeps git history a clean per-capture log.
- Never fabricate metadata the user didn't imply and you couldn't verify.
- The website reads these files directly; a well-formed frontmatter block is
  what makes an entry show up correctly.
