// Enrich existing entries with a cover, credits (director/author), and an
// AI-written synopsis. Idempotent — each step skips an entry that already has
// its output, so a re-run is cheap and safe. Pass --force to redo anyway.
//
//   node scripts/enrich.mjs [--only covers|credits|synopses]
//                           [--category films|books] [--slug <slug>]
//                           [--limit N] [--force] [--dry-run]
//
// Capture-time use (one entry, everything):
//   node scripts/enrich.mjs --category films --slug 2026-08-22-some-film
//
// Keys come from the gitignored web/.env.local:
//   TMDB_API_KEY           films — poster, director, synopsis grounding
//   GOOGLE_BOOKS_API_KEY   books — author, synopsis grounding
//   ANTHROPIC_API_KEY      synopses only
import fs from "node:fs";
import path from "node:path";
import {
  CONTENT_DIR, TMDB_KEY, GBOOKS_KEY, parseArgs, sleep, download,
  coverCandidates, hasCover, listCategories, readEntries,
  tmdbMovie, directorsOf, bookMeta,
} from "./lib/sources.mjs";
import { setProperty } from "./lib/frontmatter.mjs";
import { hasSynopsis, writeSynopsis, buildGrounding, generateSynopsis } from "./lib/synopsis.mjs";

const args = parseArgs();
const { category: onlyCat, slug: onlySlug, limit, force, dryRun } = args;
const only = args.only ? args.only.split(",").map((s) => s.trim()) : ["covers", "credits", "synopses"];
const wants = (step) => only.includes(step);

// Which property holds "who made this", per category. Categories absent from
// this map simply get no credits step.
const CREDIT_PROP = { films: "director", books: "author" };

const stats = {
  covers: { done: 0, skipped: 0, missed: 0 },
  credits: { done: 0, skipped: 0, missed: 0 },
  synopses: { done: 0, skipped: 0, missed: 0, failed: 0 },
};
const noKey = new Set();
const tiers = {}; // dry-run only: how many entries land in each grounding tier

/** Re-read from disk each time: several steps rewrite the same file in one pass. */
const readFile = (f) => fs.readFileSync(f, "utf8");

async function doCover(entry) {
  const { cat, slug, meta, title } = entry;
  if (!force && hasCover(cat, slug)) { stats.covers.skipped++; return; }
  if (cat === "films" && !meta.poster_path && !TMDB_KEY()) { noKey.add("TMDB_API_KEY"); return; }
  if (cat === "books" && !GBOOKS_KEY()) { noKey.add("GOOGLE_BOOKS_API_KEY"); return; }
  const candidates = await coverCandidates(cat, meta, title);
  if (!candidates.length) { stats.covers.missed++; return; }
  if (dryRun) { stats.covers.done++; return; }
  const dest = path.join(CONTENT_DIR, cat, "covers", `${slug}.jpg`);
  for (const url of candidates) {
    try { if (await download(url, dest)) { stats.covers.done++; return; } } catch { /* try next */ }
  }
  stats.covers.missed++;
}

async function doCredits(entry) {
  const { cat, slug, meta, file } = entry;
  const key = CREDIT_PROP[cat];
  if (!key) return;

  // Re-read: a prior step in this same pass may have rewritten the file.
  const md = readFile(file);
  const current = entry.properties?.[key];
  if (!force && current != null && String(current).length) { stats.credits.skipped++; return; }

  let names = [];
  if (cat === "films") {
    if (!TMDB_KEY()) { noKey.add("TMDB_API_KEY"); return; }
    names = directorsOf(await tmdbMovie(meta.tmdb_id));
  } else if (cat === "books") {
    if (!GBOOKS_KEY()) { noKey.add("GOOGLE_BOOKS_API_KEY"); return; }
    names = (await bookMeta(meta))?.authors ?? [];
  }
  names = [...new Set(names.filter(Boolean))].slice(0, 3); // a poster caption fits ~3
  if (!names.length) {
    stats.credits.missed++;
    process.stdout.write(`· ${cat}/${slug} (no ${key})\n`);
    return;
  }
  if (!dryRun) fs.writeFileSync(file, setProperty(md, key, names));
  entry.properties[key] = names.length === 1 ? names[0] : names;
  stats.credits.done++;
  process.stdout.write(`✓ ${cat}/${slug} — ${key}: ${names.join(", ")}\n`);
}

async function doSynopsis(entry) {
  const { cat, slug } = entry;
  if (!force && hasSynopsis(cat, slug)) { stats.synopses.skipped++; return; }
  // Grounding needs only TMDb/Google Books, so --dry-run works without an
  // Anthropic key — that's how you size the tier-2 (paid web search) share
  // before spending anything.
  const grounding = await buildGrounding(entry);
  if (dryRun) {
    process.stdout.write(`~ ${cat}/${slug} — tier ${grounding.tier} (${grounding.facts.length} chars)\n`);
    tiers[grounding.tier] = (tiers[grounding.tier] ?? 0) + 1;
    stats.synopses.done++;
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) { noKey.add("ANTHROPIC_API_KEY"); return; }
  try {
    const result = await generateSynopsis(entry, grounding);
    if (!result?.synopsis) { stats.synopses.missed++; return; }
    writeSynopsis(cat, slug, result);
    stats.synopses.done++;
    process.stdout.write(`✓ ${cat}/${slug} — synopsis (${grounding.tier})\n`);
  } catch (err) {
    stats.synopses.failed++;
    process.stdout.write(`✗ ${cat}/${slug} — ${err.message}\n`);
  }
}

let processed = 0;
outer:
for (const cat of listCategories(onlyCat)) {
  for (const entry of readEntries(cat, onlySlug)) {
    if (processed >= limit) break outer;
    processed++;
    if (wants("covers")) await doCover(entry);
    if (wants("credits")) await doCredits(entry);
    if (wants("synopses")) await doSynopsis(entry);
    await sleep(200); // pace the external APIs
  }
}

const line = (name, s) =>
  `${name.padEnd(9)} done ${s.done}, skipped ${s.skipped}, none-found ${s.missed}` +
  (s.failed != null ? `, failed ${s.failed}` : "");
console.log("");
for (const step of only) if (stats[step]) console.log(line(step, stats[step]));
if (dryRun && Object.keys(tiers).length) console.log(`\ngrounding tiers: ${Object.entries(tiers).map(([k, v]) => `${k} ${v}`).join(", ")}`);
if (noKey.size) console.log(`\nmissing key(s) in web/.env.local: ${[...noKey].join(", ")}`);
