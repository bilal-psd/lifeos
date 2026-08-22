// Shared external-source layer for the enrichment scripts (fetch-covers, enrich).
//
// Every network call is memoized per-process: one entry needs the same TMDb
// movie for its poster, its director, and its synopsis grounding, so without a
// cache a single `enrich` pass would hit each API three times.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

export const webDir = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
export const CONTENT_DIR = process.env.CONTENT_DIR ?? path.join(webDir, "..", "content");

// Load keys from the gitignored web/.env.local (KEY=value lines) without a
// dependency, so `pnpm fetch-covers` just works. Real env vars still win.
export function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
    const p = path.join(webDir, envFile);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

export const TMDB_KEY = () => process.env.TMDB_API_KEY || "";
export const GBOOKS_KEY = () => process.env.GOOGLE_BOOKS_API_KEY || "";

/** Tiny flag parser — no dependency, same shape the cover backfill has always used. */
export function parseArgs(argv = process.argv.slice(2)) {
  const flag = (name) => argv.includes(name);
  const opt = (name, d) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
  return {
    category: opt("--category", null),
    slug: opt("--slug", null),
    only: opt("--only", null),
    limit: Number(opt("--limit", "0")) || Infinity,
    force: flag("--force"),
    dryRun: flag("--dry-run"),
    flag, opt,
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) return false; // guard against 1px blanks / empties
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return true;
}

/**
 * Tidy a credited name. Upstream data is dirty — Google Books returns
 * "B.R. Ambedkar," with a trailing comma. Strips surrounding punctuation and
 * collapses whitespace, but never reorders: "Martin Luther King Jr." must keep
 * its trailing period, so only commas/semicolons are stripped.
 */
export const cleanName = (s) =>
  String(s || "").replace(/\s+/g, " ").replace(/^[\s,;]+|[\s,;]+$/g, "").trim();

/* ------------------------------- TMDb -------------------------------- */

const tmdbCache = new Map();

/**
 * Full TMDb movie record with credits appended — one call serves the poster
 * path, the director, and the synopsis grounding text.
 */
export async function tmdbMovie(tmdbId) {
  if (!tmdbId || !TMDB_KEY()) return null;
  const key = String(tmdbId);
  if (tmdbCache.has(key)) return tmdbCache.get(key);
  let out = null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY()}&append_to_response=credits`,
    );
    if (res.ok) out = await res.json();
  } catch { /* leave null — caller falls back */ }
  tmdbCache.set(key, out);
  return out;
}

/** Every credited director, in TMDb's own order. */
export function directorsOf(movie) {
  return ((movie?.credits?.crew) || [])
    .filter((c) => c.job === "Director" && c.name)
    .map((c) => cleanName(c.name))
    .filter(Boolean);
}

/* ---------------------------- Google Books ---------------------------- */

const gbooksCache = new Map();

export async function googleBooksMeta(isbn) {
  if (!GBOOKS_KEY() || !isbn) return null;
  const key = String(isbn);
  if (gbooksCache.has(key)) return gbooksCache.get(key);
  let out = null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&country=US&key=${GBOOKS_KEY()}`,
    );
    if (res.ok) {
      const v = ((await res.json()).items || [])[0]?.volumeInfo;
      if (v) {
        const l = v.imageLinks || {};
        let thumb = l.extraLarge || l.large || l.medium || l.small || l.thumbnail || l.smallThumbnail;
        if (thumb) thumb = thumb.replace(/^http:/, "https:").replace(/&edge=curl/, "");
        out = {
          title: v.title || "",
          authors: (v.authors || []).map(cleanName).filter(Boolean),
          author: cleanName((v.authors || [])[0]),
          description: v.description || "",
          publishedDate: v.publishedDate || "",
          thumb: thumb || null,
        };
      }
    }
  } catch { /* leave null — caller falls back */ }
  gbooksCache.set(key, out);
  return out;
}

/* --------------------------- Open Library ---------------------------- */

const olCache = new Map();

/**
 * Keyless fallback for books Google Books can't resolve by ISBN — about 15% of
 * this archive. `jscmd=data` returns author *names* inline, so unlike the plain
 * /isbn/ endpoint it needs no second round-trip per author.
 */
export async function openLibraryMeta(isbn, olid) {
  const bibkey = isbn ? `ISBN:${isbn}` : olid ? `OLID:${olid}` : null;
  if (!bibkey) return null;
  if (olCache.has(bibkey)) return olCache.get(bibkey);
  let out = null;
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=${bibkey}&format=json&jscmd=data`,
    );
    if (res.ok) {
      const v = (await res.json())[bibkey];
      if (v) {
        out = {
          title: v.title || "",
          authors: (v.authors || []).map((a) => cleanName(a.name)).filter(Boolean),
          publishedDate: v.publish_date || "",
          description: typeof v.notes === "string" ? v.notes : (v.notes?.value || ""),
        };
      }
    }
  } catch { /* leave null — caller falls back */ }
  olCache.set(bibkey, out);
  return out;
}

/** Book identity with a keyless fallback: Google Books first, then Open Library. */
export async function bookMeta(meta) {
  const g = await googleBooksMeta(meta.isbn_13);
  if (g?.authors?.length) return { ...g, source: "google-books" };
  const ol = await openLibraryMeta(meta.isbn_13, meta.olid);
  if (!ol) return g ? { ...g, source: "google-books" } : null;
  return {
    title: ol.title || g?.title || "",
    authors: ol.authors,
    author: ol.authors[0] || "",
    description: g?.description || ol.description || "",
    publishedDate: g?.publishedDate || ol.publishedDate || "",
    thumb: g?.thumb || null,
    source: "open-library",
  };
}

/* ------------------------- book cover matching ------------------------- */
// Google Books (by ISBN) gives the precise identity — canonical title + author.
// iTunes gives the best *image* (up to 1200px) but matches by title, so we
// validate its hits against that author. Result: high-res AND correct.
export const norm = (s) => (s || "").toLowerCase().split(/[:(]/)[0].replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
export const titleMatch = (want, got) => {
  const a = norm(want), b = norm(got);
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a) || (a.length > 6 && b.includes(a)) || (b.length > 6 && a.includes(b));
};
export const authorMatch = (want, got) => {
  const tb = new Set(norm(got).split(" ").filter((w) => w.length > 2));
  return norm(want).split(" ").filter((w) => w.length > 2).some((w) => tb.has(w)); // shared surname/name token
};

export async function itunesCover(title, author) {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=ebook&limit=8&country=US`);
  if (!res.ok) return null;
  for (const r of (await res.json()).results || []) {
    if (!r.artworkUrl100 || !titleMatch(title, r.trackName)) continue;
    if (author && !authorMatch(author, r.artistName)) continue; // reject wrong-author hits (e.g. quiz books)
    return r.artworkUrl100.replace(/\/\d+x\d+bb\.jpg$/, "/1200x1200bb.jpg");
  }
  return null;
}

export const openLibraryCover = (meta) =>
  meta.isbn_13 ? `https://covers.openlibrary.org/b/isbn/${meta.isbn_13}-L.jpg?default=false`
    : meta.olid ? `https://covers.openlibrary.org/b/olid/${meta.olid}-L.jpg?default=false`
      : null;

/** Ordered cover download candidates (best first). */
export async function coverCandidates(cat, meta, title) {
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
    if (!p && meta.tmdb_id) p = (await tmdbMovie(meta.tmdb_id))?.poster_path || null;
    return p ? [`https://image.tmdb.org/t/p/w500${p}`] : [];
  }
  return [];
}

/* --------------------------- archive walking --------------------------- */

export const COVER_EXTS = ["jpg", "jpeg", "webp", "png"];

export function hasCover(cat, slug) {
  return COVER_EXTS.some((e) => fs.existsSync(path.join(CONTENT_DIR, cat, "covers", `${slug}.${e}`)));
}

export function listCategories(onlyCat = null) {
  return fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && (!onlyCat || d.name === onlyCat))
    .map((d) => d.name);
}

/** Every entry in a category as { cat, slug, file, data, title, meta, properties, raw }. */
export function readEntries(cat, onlySlug = null) {
  const dir = path.join(CONTENT_DIR, cat);
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((slug) => !onlySlug || slug === onlySlug)
    .map((slug) => {
      const file = path.join(dir, `${slug}.md`);
      const raw = fs.readFileSync(file, "utf8");
      const { data } = matter(raw);
      return {
        cat, slug, file, raw, data,
        title: String(data.title ?? slug),
        meta: data.metadata ?? {},
        properties: data.properties ?? {},
      };
    });
}
