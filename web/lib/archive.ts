import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type EntryMeta = {
  tmdb_id?: number | string;
  imdb_id?: string;
  isbn_13?: string;
  olid?: string;
  mbid?: string;
  url?: string;
  id_status?: "verified" | "unverified";
  [key: string]: unknown;
};

export type Entry = {
  slug: string;
  category: string;
  title: string;
  date: string;
  tags: string[];
  public: boolean;
  metadata: EntryMeta;
  body: string;
};

// The archive lives at repo-root /content, one level up from the web/ app.
// Override with CONTENT_DIR when the deploy layout differs.
const CONTENT_DIR =
  process.env.CONTENT_DIR ?? path.join(process.cwd(), "..", "content");

function listCategoryDirs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

// YAML parses an unquoted `2026-08-01` into a Date; normalize everything to
// a plain YYYY-MM-DD string.
function toISODate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function readCategory(category: string): Entry[] {
  const dir = path.join(CONTENT_DIR, category);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const slug = file.replace(/\.md$/, "");
      return {
        slug,
        category,
        title: String(data.title ?? slug),
        date: toISODate(data.date),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        public: data.public !== false,
        metadata: (data.metadata ?? {}) as EntryMeta,
        body: content.trim(),
      } satisfies Entry;
    });
}

function byDateDesc(a: Entry, b: Entry): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

/** All public entries, newest first. Pass a category to scope to one. */
export function getEntries(category?: string): Entry[] {
  const cats = category ? [category] : listCategoryDirs();
  return cats
    .flatMap(readCategory)
    .filter((e) => e.public)
    .sort(byDateDesc);
}

/** Category names that have at least one public entry, alphabetical. */
export function getCategories(): string[] {
  return listCategoryDirs()
    .filter((c) => getEntries(c).length > 0)
    .sort();
}

export function getEntry(category: string, slug: string): Entry | null {
  return readCategory(category).find((e) => e.slug === slug && e.public) ?? null;
}

/** External link-out for an entry, derived from its IDs. */
export function linkOut(entry: Entry): { href: string; label: string } | null {
  const m = entry.metadata;
  if (m.imdb_id)
    return { href: `https://www.imdb.com/title/${m.imdb_id}/`, label: "IMDb" };
  if (m.olid)
    return { href: `https://openlibrary.org/books/${m.olid}`, label: "Open Library" };
  if (m.isbn_13)
    return { href: `https://openlibrary.org/isbn/${m.isbn_13}`, label: "Open Library" };
  if (m.mbid)
    return { href: `https://musicbrainz.org/release/${m.mbid}`, label: "MusicBrainz" };
  if (typeof m.url === "string") return { href: m.url, label: "Link" };
  return null;
}
