// Mechanical QC for the synopsis sidecars. Run after writing any, and after
// any bulk edit. Style rules are in docs/synopsis-brief.md; this enforces the
// half of them a regex can actually check.
//
//   node scripts/lint-synopses.mjs
//
// Exits non-zero when anything fails, so it can gate a commit.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_DIR } from "./lib/sources.mjs";

const CHECKS = [
  ["em dash",           /—/],
  ["promo adjective",   /\b(acclaimed|beloved|iconic|masterful|stunning|vibrant|breathtaking|renowned|seminal|poignant|haunting|powerful|unflinching|gripping|masterpiece|mesmeri[sz]ing|searing)\b/i],
  ["not just X but Y",  /\bnot (just|only)\b[^.]{2,60}\bbut\b/i],
  ["fancy is",          /\b(serves as|stands as|boasts|showcases|delves into|underscores)\b/i],
  ["metaphor noun",     /\b(tapestry|landscape|meditation on|tour de force|testament to)\b/i],
  ["vague attribution", /\b(critics (say|note|praised|hailed)|widely (regarded|considered|seen as)|considered by many)\b/i],
  ["decorative -ing",   /,\s+(highlighting|showcasing|cementing|exploring|reflecting|underscoring|solidifying)\b/i],
  ["verdict language",  /\b(brilliant|superb|excellent|must-(watch|read)|flawless|worth (a )?(watch|read)|a triumph)\b/i],
  ["curly quote",       /[‘’“”]/],
  // A blurb must never talk about its own sourcing. This shipped once.
  ["meta-commentary",   /(no (plot )?(description|summary|information) (was )?available|little to draw on|this entry has)/i],
  ["preamble",          /^(here is|here's|this is a blurb|sure[,!])/i],
];

let violations = 0;
const short = [], long = [], noSrc = [];
const openings = new Map();
let checked = 0;

for (const cat of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_")).map((d) => d.name)) {
  const dir = path.join(CONTENT_DIR, cat, "synopses");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const id = `${cat}/${f.replace(/\.md$/, "")}`;
    let parsed;
    try {
      parsed = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch (e) {
      console.log(`parse fail          ${id}: ${e.message}`); violations++; continue;
    }
    checked++;
    const text = parsed.content.trim();
    for (const [name, re] of CHECKS) {
      const m = text.match(re);
      if (m) { console.log(`${name.padEnd(19)} ${id}  -> "${m[0]}"`); violations++; }
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < 50) short.push(`${id} (${words}w)`);
    if (words > 85) long.push(`${id} (${words}w)`);
    if (!parsed.data.sources?.length) noSrc.push(id);
    // Near-duplicate detection: parallel writers produce samey openings.
    const sig = text.toLowerCase().split(/\s+/).slice(0, 12).join(" ");
    openings.set(sig, [...(openings.get(sig) ?? []), id]);
  }
}

const dupes = [...openings.values()].filter((v) => v.length > 1);
console.log(`\nchecked ${checked} synopses`);
console.log(`rule violations: ${violations}`);
if (short.length) console.log(`under 50 words (${short.length}): ${short.join(", ")}`);
if (long.length) console.log(`over 85 words (${long.length}): ${long.join(", ")}`);
if (noSrc.length) console.log(`missing sources (${noSrc.length}): ${noSrc.join(", ")}`);
if (dupes.length) { console.log("duplicate openings:"); dupes.forEach((d) => console.log("  " + d.join(" | "))); }
else console.log("no duplicate openings");

process.exit(violations > 0 || noSrc.length > 0 || dupes.length > 0 ? 1 : 0);
