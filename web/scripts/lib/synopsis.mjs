// Grounding and storage for the "About this film/book" blurbs.
//
// This module does NOT write the blurb. Claude does, during capture, from the
// facts gathered here. There is no API key and no model call anywhere in the
// repo: the capture flow already runs through Claude, so a script that called
// Claude on Claude's behalf only ever added a bill and a dependency.
//
// The writing rules live in docs/synopsis-brief.md.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_DIR, tmdbMovie, directorsOf, bookMeta, sleep } from "./sources.mjs";

/** Below this many words of real source text, go and find more before writing. */
export const THIN_WORDS = 25;

/**
 * Publisher copy that says nothing about the work. A word count alone cannot
 * tell this apart from a description, which is how "The Psychology of Money"
 * nearly got a blurb about its sales figures.
 */
const MARKETING = /copies sold|bestselling author|best-selling author|#1 new york times|new york times bestseller|instant .*bestseller|now a major motion picture|as seen on|praise for |no marketing blurb/i;

const wordCount = (s) => (s || "").trim().split(/\s+/).filter(Boolean).length;

/* ------------------------------ storage ------------------------------- */

export const synopsisPath = (cat, slug) => path.join(CONTENT_DIR, cat, "synopses", `${slug}.md`);
export const hasSynopsis = (cat, slug) => fs.existsSync(synopsisPath(cat, slug));

export function readSynopsis(cat, slug) {
  const p = synopsisPath(cat, slug);
  if (!fs.existsSync(p)) return null;
  const { data, content } = matter(fs.readFileSync(p, "utf8"));
  return { ...data, text: content.trim() };
}

export function writeSynopsis(cat, slug, { synopsis, sources = [], grounding, model = "claude-opus-5" }) {
  const p = synopsisPath(cat, slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, [
    "---",
    `generated: ${new Date().toISOString().slice(0, 10)}`,
    `model: ${model}`,
    `grounding: ${grounding}`,
    ...(sources.length ? ["sources:", ...sources.map((s) => `  - ${s}`)] : []),
    "---",
    "",
    synopsis.trim(),
    "",
  ].join("\n"));
  return p;
}

/* ----------------------------- Wikipedia ------------------------------ */

/**
 * Wikipedia throttles hard. A fast loop returns empty results that look exactly
 * like "no article exists", so this paces itself and retries rather than
 * treating a refusal as a miss.
 */
export async function wikipediaExtract(query, attempt = 0) {
  const u = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts"
    + "&exintro=1&explaintext=1&redirects=1&generator=search&gsrlimit=1&gsrsearch="
    + encodeURIComponent(query);
  try {
    const r = await fetch(u, { headers: { "User-Agent": "lifeos-personal-archive/1.0" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (j?.error) throw new Error(j.error.code);
    const p = Object.values(j?.query?.pages ?? {})[0];
    return p?.extract ? { title: p.title, extract: p.extract.trim() } : null;
  } catch {
    if (attempt < 2) { await sleep(3000 * (attempt + 1)); return wikipediaExtract(query, attempt + 1); }
    return null;
  }
}

/**
 * Does this article actually describe the entry, or something adjacent?
 *
 * Search-resolved lookups land on the wrong page more often than you would
 * expect. Across one full pass over this archive, 34 of 371 extracts were about
 * a soundtrack album, a video game, a sequel, or the author's own biography.
 * Reject anything whose page title is not the work itself.
 */
export function articleMatches(pageTitle, entryTitle) {
  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const stop = new Set(["the", "a", "an", "of", "and", "or"]);
  const toks = (s) => norm(s).split(" ").filter((w) => w && !stop.has(w));
  const okParen = /^(film|movie|novel|book|\d{4}[a-z ]*film|\d{4}[a-z ]*novel)$/i;

  const pt = toks(pageTitle), tt = toks(entryTitle);
  if (pt.join(" ") === tt.join(" ")) return true;
  const paren = (pageTitle.match(/\(([^)]*)\)/) || [])[1];
  if (paren && okParen.test(paren)
      && toks(pageTitle.replace(/\([^)]*\)/g, "")).join(" ") === tt.join(" ")) return true;
  // the entry carries a longer name than the article (subtitle)
  if (tt.length > pt.length && tt.slice(0, pt.length).join(" ") === pt.join(" ")) return true;
  return false;
}

/* ----------------------------- grounding ------------------------------ */

/**
 * Collect what the free sources know about one entry, so Claude can write the
 * blurb from facts instead of memory. Never invents; a thin result stays thin.
 */
export async function buildGrounding(entry, { wikipedia = true } = {}) {
  const { cat, meta, title } = entry;
  const facts = { title };
  const sources = [];
  let primary = "";

  if (cat === "films") {
    const m = await tmdbMovie(meta.tmdb_id);
    primary = m?.overview || "";
    facts.year = (m?.release_date || "").slice(0, 4);
    facts.director = directorsOf(m).join(", ");
    facts.genres = (m?.genres || []).map((g) => g.name).join(", ");
    facts.language = m?.original_language || "";
    if (m?.original_title && m.original_title !== title) facts.originalTitle = m.original_title;
    if (meta.tmdb_id) sources.push(`https://www.themoviedb.org/movie/${meta.tmdb_id}`);
  } else if (cat === "books") {
    const b = await bookMeta(meta);
    primary = b?.description || "";
    facts.author = (b?.authors || []).join(", ");
    facts.published = b?.publishedDate || "";
    if (meta.isbn_13) sources.push(`https://openlibrary.org/isbn/${meta.isbn_13}`);
  }

  // Marketing copy is worse than nothing: it reads long but says nothing.
  if (MARKETING.test(primary) && wordCount(primary) < 90) primary = "";

  let wiki = null;
  if (wikipedia && wordCount(primary) < THIN_WORDS) {
    const q = cat === "films"
      ? `${title} ${facts.year || ""} ${facts.language && facts.language !== "en" ? "Indian" : ""} film`
      : `${title} ${facts.author || ""} book`;
    const w = await wikipediaExtract(q.replace(/\s+/g, " ").trim());
    if (w && articleMatches(w.title, title)) {
      wiki = w.extract;
      sources.push("https://en.wikipedia.org/wiki/" + encodeURIComponent(w.title.replace(/ /g, "_")));
    }
  }

  return {
    facts, primary, wikipedia: wiki, sources,
    grounding: wiki ? "web-search" : cat === "films" ? "tmdb" : "google-books",
    usableWords: wordCount(primary) + wordCount(wiki),
  };
}
