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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const webDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = process.env.CONTENT_DIR ?? path.join(webDir, "..", "content");

// Load keys from the gitignored web/.env.local (KEY=value lines) without a
// dependency, so `pnpm fetch-covers` just works. Real env vars still win.
for (const envFile of [".env.local", ".env"]) {
  const p = path.join(webDir, envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TMDB_KEY = process.env.TMDB_API_KEY || "";
const GBOOKS_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, d) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : d; };
const onlyCat = opt("--category", null);
const limit = Number(opt("--limit", "0")) || Infinity;
const force = flag("--force");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) return false; // guard against 1px blanks / empties
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return true;
}

async function tmdbPosterPath(tmdbId) {
  if (!TMDB_KEY) return null;
  const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}`);
  if (!res.ok) return null;
  return (await res.json()).poster_path || null;
}

// --- book cover sources ---
// Strategy: Google Books (by ISBN) gives the precise identity — canonical title
// + author. iTunes gives the best *image* (up to 1200px) but matches by title,
// so we validate its hits against that author. Result: high-res AND correct.
const norm = (s) => (s || "").toLowerCase().split(/[:(]/)[0].replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const titleMatch = (want, got) => {
  const a = norm(want), b = norm(got);
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a) || (a.length > 6 && b.includes(a)) || (b.length > 6 && a.includes(b));
};
const authorMatch = (want, got) => {
  const tb = new Set(norm(got).split(" ").filter((w) => w.length > 2));
  return norm(want).split(" ").filter((w) => w.length > 2).some((w) => tb.has(w)); // shared surname/name token
};

async function googleBooksMeta(isbn) {
  if (!GBOOKS_KEY || !isbn) return null;
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&country=US&key=${GBOOKS_KEY}`);
  if (!res.ok) return null;
  const v = ((await res.json()).items || [])[0]?.volumeInfo;
  if (!v) return null;
  const l = v.imageLinks || {};
  let thumb = l.extraLarge || l.large || l.medium || l.small || l.thumbnail || l.smallThumbnail;
  if (thumb) thumb = thumb.replace(/^http:/, "https:").replace(/&edge=curl/, "");
  return { title: v.title || "", author: (v.authors || [])[0] || "", thumb: thumb || null };
}
async function itunesCover(title, author) {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=ebook&limit=8&country=US`);
  if (!res.ok) return null;
  for (const r of (await res.json()).results || []) {
    if (!r.artworkUrl100 || !titleMatch(title, r.trackName)) continue;
    if (author && !authorMatch(author, r.artistName)) continue; // reject wrong-author hits (e.g. quiz books)
    return r.artworkUrl100.replace(/\/\d+x\d+bb\.jpg$/, "/1200x1200bb.jpg");
  }
  return null;
}
const openLibraryCover = (meta) =>
  meta.isbn_13 ? `https://covers.openlibrary.org/b/isbn/${meta.isbn_13}-L.jpg?default=false`
    : meta.olid ? `https://covers.openlibrary.org/b/olid/${meta.olid}-L.jpg?default=false`
      : null;

// Ordered download candidates (best first); the loop tries each until one works.
async function resolveCandidates(cat, meta, title) {
  if (cat === "books") {
    const g = await googleBooksMeta(meta.isbn_13);
    const out = [];
    const it = await itunesCover(g?.title || title, g?.author); // hi-res, author-validated
    if (it) out.push(it);
    const ol = openLibraryCover(meta); // precise, ~500px
    if (ol) out.push(ol);
    if (g?.thumb) out.push(g.thumb); // correct but often small — last resort
    return out;
  }
  if (cat === "films") {
    let p = meta.poster_path;
    if (!p && meta.tmdb_id) p = await tmdbPosterPath(meta.tmdb_id);
    return p ? [`https://image.tmdb.org/t/p/w500${p}`] : [];
  }
  return [];
}

function hasCover(cat, slug) {
  return ["jpg", "jpeg", "webp", "png"].some((e) =>
    fs.existsSync(path.join(CONTENT_DIR, cat, "covers", `${slug}.${e}`)));
}

const cats = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && (!onlyCat || d.name === onlyCat))
  .map((d) => d.name);

let done = 0, skipped = 0, missed = 0, failed = 0, noKey = 0;
for (const cat of cats) {
  const dir = path.join(CONTENT_DIR, cat);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    if (done >= limit) break;
    const slug = file.replace(/\.md$/, "");
    if (!force && hasCover(cat, slug)) { skipped++; continue; }
    const { data } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
    const meta = data.metadata ?? {};
    const title = String(data.title ?? slug);
    if (cat === "films" && !meta.poster_path && !TMDB_KEY) { noKey++; continue; }
    const candidates = await resolveCandidates(cat, meta, title);
    await sleep(200); // pace external APIs (iTunes/TMDb throttle bursts)
    if (!candidates.length) { missed++; continue; }
    const dest = path.join(dir, "covers", `${slug}.jpg`);
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
