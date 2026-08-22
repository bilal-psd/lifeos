// Surgical YAML frontmatter editing — line-level edits only, never a re-serialize.
//
// Re-emitting frontmatter with a YAML dumper would reorder keys, restyle flow
// lists, and turn unquoted dates into something else across all 433 files. So we
// splice single lines instead and leave every other byte alone (the "edit
// frontmatter surgically" rule in CLAUDE.md).
//
// This is a deliberate sibling of splitFrontmatter/setRating in
// web/app/api/rate/route.ts — that one is TS and dev-server-only, this one is
// plain ESM for the node scripts. Keep the two in sync if the shape changes.

/** Split a markdown file into { pre, block, post } around its frontmatter. */
export function splitFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return { pre: md.slice(0, m.index), block: m[1], post: md.slice(m.index + m[0].length) };
}

const join = (pre, lines, post) => `${pre}---\n${lines.join("\n")}\n---${post}`;

/** Double-quote a scalar so names with :, #, commas or quotes stay valid YAML. */
const quote = (v) =>
  typeof v === "number" || typeof v === "boolean"
    ? String(v)
    : `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const render = (value) =>
  Array.isArray(value)
    ? (value.length === 1 ? quote(value[0]) : `[${value.map(quote).join(", ")}]`)
    : quote(value);

/** Index of the `properties:` line, or -1. */
const propsIndex = (lines) => lines.findIndex((l) => /^properties:\s*$/.test(l));

/** Read a property's raw line value, or null when the key isn't set. */
export function getProperty(md, key) {
  const fm = splitFrontmatter(md);
  if (!fm) return null;
  const lines = fm.block.split("\n");
  const pi = propsIndex(lines);
  if (pi === -1) return null;
  for (let i = pi + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") continue;
    if (!/^\s/.test(l)) break; // dedent — out of the properties block
    const m = l.match(new RegExp(`^\\s+${key}:\\s*(.*)$`));
    if (m) return m[1];
  }
  return null;
}

/**
 * Set `properties.<key>`, adding the `properties:` block if the entry has none.
 * A new block is inserted directly before `metadata:` so machine IDs stay last,
 * matching how every existing entry is laid out.
 */
export function setProperty(md, key, value) {
  const fm = splitFrontmatter(md);
  if (!fm) throw new Error("no frontmatter");
  const lines = fm.block.split("\n");
  const line = `  ${key}: ${render(value)}`;
  const pi = propsIndex(lines);

  if (pi === -1) {
    const metaIdx = lines.findIndex((l) => /^metadata:/.test(l));
    lines.splice(metaIdx === -1 ? lines.length : metaIdx, 0, "properties:", line);
    return join(fm.pre, lines, fm.post);
  }

  // Scan the indented children for an existing key; stop at the first dedent.
  let at = -1;
  let lastChild = pi;
  for (let i = pi + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") continue;
    if (!/^\s/.test(l)) break;
    lastChild = i;
    if (new RegExp(`^\\s+${key}:`).test(l)) { at = i; break; }
  }
  if (at !== -1) lines[at] = line;
  else lines.splice(lastChild + 1, 0, line); // append after the last existing property
  return join(fm.pre, lines, fm.post);
}
