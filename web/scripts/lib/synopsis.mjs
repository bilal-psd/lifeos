// AI-written "About this film/book" blurbs, stored as sidecar files.
//
// Grounding is two-tier, cheapest and most reliable first:
//   tier 1  structured trusted APIs (TMDb / Google Books) — free, covers most
//   tier 2  Claude web search against an allowlist — only when tier 1 is thin
//
// The output is a synopsis, never a review: it describes the work, it does not
// judge it. Opinions on this site belong to the user, in the entry body.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_DIR, tmdbMovie, directorsOf, bookMeta } from "./sources.mjs";

export const MODEL = "claude-opus-5";

// Reference sources Claude may search in tier 2. Deliberately narrow — the
// point of web search here is *better sourcing*, not more sourcing.
export const WEB_SEARCH_DOMAINS = [
  "en.wikipedia.org",
  "themoviedb.org",
  "bfi.org.uk",
  "criterion.com",
  "rogerebert.com",
  "theguardian.com",
  "britannica.com",
  "publishersweekly.com",
  "kirkusreviews.com",
  "openlibrary.org",
];

/**
 * Below this many words of source text, tier 1 is too thin to write from and we
 * fall back to (paid) web search.
 *
 * Tuned against the real archive rather than guessed. Source-text lengths:
 * films median 43 words (none under 10), books median 60 (but 14 have none at
 * all). Every entry also carries structured facts — title, year, director or
 * author, genres, tagline — so ~25 words of overview is already enough to
 * write a descriptive 70-word blurb from. The thresholds trade off like this:
 *
 *   20 -> ~9% of entries hit web search    25 -> ~18%    30 -> ~28%    40 -> ~45%
 *
 * Raise it for richer, better-sourced blurbs at higher cost; lower it to save.
 */
const THIN_WORDS = 25;

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

export function writeSynopsis(cat, slug, { synopsis, sources = [], grounding, model = MODEL }) {
  const p = synopsisPath(cat, slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const fm = [
    "---",
    `generated: ${new Date().toISOString().slice(0, 10)}`,
    `model: ${model}`,
    `grounding: ${grounding}`,
    ...(sources.length ? ["sources:", ...sources.map((s) => `  - ${s}`)] : []),
    "---",
    "",
    synopsis.trim(),
    "",
  ].join("\n");
  fs.writeFileSync(p, fm);
  return p;
}

/* ----------------------------- grounding ------------------------------ */

/** Collect what the trusted APIs know, and decide whether it's enough. */
export async function buildGrounding(entry) {
  const { cat, meta, title } = entry;
  const lines = [];
  const sources = [];
  let body = "";

  if (cat === "films") {
    const m = await tmdbMovie(meta.tmdb_id);
    body = m?.overview || "";
    lines.push(`Title: ${title}`);
    if (m?.original_title && m.original_title !== title) lines.push(`Original title: ${m.original_title}`);
    if (m?.release_date) lines.push(`Released: ${m.release_date}`);
    const dirs = directorsOf(m);
    if (dirs.length) lines.push(`Director: ${dirs.join(", ")}`);
    if (m?.genres?.length) lines.push(`Genres: ${m.genres.map((g) => g.name).join(", ")}`);
    if (m?.original_language) lines.push(`Original language: ${m.original_language}`);
    if (m?.tagline) lines.push(`Tagline: ${m.tagline}`);
    if (body) lines.push(`TMDb overview: ${body}`);
    if (meta.tmdb_id) sources.push(`https://www.themoviedb.org/movie/${meta.tmdb_id}`);
    if (meta.imdb_id) sources.push(`https://www.imdb.com/title/${meta.imdb_id}/`);
  } else if (cat === "books") {
    const g = await bookMeta(meta);
    body = g?.description || "";
    lines.push(`Title: ${g?.title || title}`);
    if (g?.authors?.length) lines.push(`Author: ${g.authors.join(", ")}`);
    if (g?.publishedDate) lines.push(`Published: ${g.publishedDate}`);
    if (body) lines.push(`Publisher description: ${body}`);
    if (meta.isbn_13) sources.push(`https://openlibrary.org/isbn/${meta.isbn_13}`);
  }

  return {
    tier: wordCount(body) >= THIN_WORDS ? (cat === "films" ? "tmdb" : "google-books") : "web-search",
    facts: lines.join("\n"),
    sources,
  };
}

/* ----------------------------- generation ----------------------------- */

const SYSTEM = `You write short reference blurbs for a personal media archive. Each blurb sits on a public web page beside the archive owner's own star rating and, sometimes, their own written note.

Write 60-80 words describing the work: what it is about, who made it, and what it is known for.

Hard rules:
- Describe, never judge. No verdict, no praise, no criticism, no recommendation, and no rating language. The opinions on this site are the owner's, not yours.
- Write entirely in your own words. Never reuse phrasing, sentence structure, or distinctive wording from the source material you are given or find. These sources are copyrighted and this page is public. A close paraphrase is not acceptable, so re-express the substance from scratch.
- Third person. Present tense for plot or argument.
- No major spoilers. Do not reveal endings or late twists.
- State only what your sources support. If something is uncertain, leave it out rather than guessing.
- Output the blurb text only. No preamble, no title, no heading, no quotation marks around it.

Write plainly. A blurb that reads like marketing copy has failed, so these rules bind as hard as the ones above:
- Never use an em dash. Use a period or a comma.
- No promotional or evaluative adjectives. Banned outright: acclaimed, beloved, iconic, masterful, stunning, vibrant, breathtaking, renowned, seminal, poignant, haunting, powerful, unflinching, gripping.
- No "not just X, but Y" construction.
- Do not force items into groups of three. Use however many the facts actually give you.
- Do not end a sentence with a decorative -ing clause such as "cementing its status as", "exploring themes of", or "highlighting the".
- Write "is" and "has", not "serves as", "stands as", "boasts", or "features".
- No abstract metaphor nouns: tapestry, landscape, journey, meditation, lens, portrait, tour de force.
- No vague attribution. Never write "critics say", "widely regarded as", or "considered by many".
- Prefer active voice, and name who does what.
- Be concrete. Name the person, place, year, or event. If a sentence could sit unchanged in a blurb for some other work, delete it and write something specific instead.`;

/** Pull the URLs Claude actually consulted out of the server-tool result blocks. */
function searchSources(message) {
  const urls = [];
  for (const block of message.content || []) {
    if (block.type !== "web_search_tool_result") continue;
    // A successful result's `content` is a list; an error's is a single object.
    if (!Array.isArray(block.content)) continue;
    for (const r of block.content) if (r?.url) urls.push(r.url);
  }
  return [...new Set(urls)];
}

const textOf = (message) =>
  (message.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();

let clientPromise = null;
async function getClient() {
  if (!clientPromise) {
    clientPromise = import("@anthropic-ai/sdk").then((m) => new m.default());
  }
  return clientPromise;
}

export async function generateSynopsis(entry, grounding) {
  const client = await getClient();
  const kind = entry.cat === "films" ? "film" : entry.cat === "books" ? "book" : entry.cat;
  const webSearch = grounding.tier === "web-search";

  const prompt = webSearch
    ? `Write the blurb for this ${kind}. The reference APIs returned too little to write from, so search the web for what you need first.\n\n${grounding.facts}`
    : `Write the blurb for this ${kind}, using these source facts.\n\n${grounding.facts}`;

  const params = {
    model: MODEL,
    max_tokens: webSearch ? 8000 : 4000, // headroom: adaptive thinking bills here too
    system: SYSTEM,
    output_config: { effort: "low" }, // a 70-word blurb needs no deep reasoning
    messages: [{ role: "user", content: prompt }],
  };
  if (webSearch) {
    params.tools = [{
      type: "web_search_20260209",
      name: "web_search",
      max_uses: 4,
      allowed_domains: WEB_SEARCH_DOMAINS,
    }];
  }

  let message = await client.messages.create(params);
  // A server-tool turn can stop early with pause_turn; resume until it finishes.
  const messages = [...params.messages];
  let guard = 0;
  while (message.stop_reason === "pause_turn" && guard++ < 4) {
    messages.push({ role: "assistant", content: message.content });
    message = await client.messages.create({ ...params, messages });
  }
  if (message.stop_reason === "refusal") throw new Error("refused by safety classifier");

  const synopsis = textOf(message);
  if (!synopsis) return null;

  const found = webSearch ? searchSources(message) : [];
  return {
    synopsis,
    sources: [...new Set([...found, ...grounding.sources])].slice(0, 6),
    grounding: grounding.tier,
    model: MODEL,
    usage: message.usage,
  };
}
