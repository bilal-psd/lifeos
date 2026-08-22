// Backfill cover images for existing entries, using their stored IDs.
// Idempotent: skips entries that already have a cover (pass --force to refetch).
//
//   node scripts/fetch-covers.mjs [--category films|books] [--limit N] [--force]
//
// Books  -> waterfall: Google Books by ISBN (needs GOOGLE_BOOKS_API_KEY) ->
//           validated iTunes/Apple Books by title (keyless) -> Open Library
//           by ISBN/OLID (keyless). Higher-quality sources win.
// Films  -> TMDb poster. Uses metadata.poster_path if present; otherwise needs
//           TMDB_API_KEY in the env to resolve poster_path from tmdb_id.
//
// The source lookups live in ./lib/sources.mjs, shared with scripts/enrich.mjs.
import path from "node:path";
import {
  CONTENT_DIR, TMDB_KEY, parseArgs, sleep, download,
  coverCandidates, hasCover, listCategories, readEntries,
} from "./lib/sources.mjs";

const { category: onlyCat, limit, force } = parseArgs();

let done = 0, skipped = 0, missed = 0, failed = 0, noKey = 0;
for (const cat of listCategories(onlyCat)) {
  for (const entry of readEntries(cat)) {
    if (done >= limit) break;
    const { slug, meta, title } = entry;
    if (!force && hasCover(cat, slug)) { skipped++; continue; }
    if (cat === "films" && !meta.poster_path && !TMDB_KEY()) { noKey++; continue; }
    const candidates = await coverCandidates(cat, meta, title);
    await sleep(200); // pace external APIs (iTunes/TMDb throttle bursts)
    if (!candidates.length) { missed++; continue; }
    const dest = path.join(CONTENT_DIR, cat, "covers", `${slug}.jpg`);
    let ok = false;
    for (const url of candidates) {
      try { if (await download(url, dest)) { ok = true; break; } } catch { /* try next */ }
    }
    if (ok) { done++; process.stdout.write(`✓ ${cat}/${slug}\n`); }
    else { missed++; process.stdout.write(`· ${cat}/${slug} (no cover)\n`); }
  }
}
console.log(`\nfetched ${done}, skipped ${skipped} (already had), no-cover ${missed}, failed ${failed}` +
  (noKey ? `, films-awaiting-TMDB_API_KEY ${noKey}` : ""));
