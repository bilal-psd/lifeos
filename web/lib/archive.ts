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

export type PropValue = string | number | boolean;

export type Entry = {
  slug: string;
  category: string;
  title: string;
  date: string;
  tags: string[];
  public: boolean;
  properties: Record<string, PropValue[]>;
  metadata: EntryMeta;
  body: string;
};

// A filterable property, derived from the entries present (values) and merged
// with any overrides in content/_properties.json (label, type, range).
export type PropertyDef = {
  key: string;
  label: string;
  type: "number" | "enum" | "boolean";
  values: PropValue[]; // distinct, sorted
  min?: number;
  max?: number;
  summary: boolean; // shown under each row title by default
};

type DefOverride = {
  label?: string;
  type?: PropertyDef["type"];
  min?: number;
  max?: number;
  hidden?: boolean;
  summary?: boolean;
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

// Normalize a frontmatter `properties:` block into arrays of primitives, so a
// scalar (`rating: 4`) and a list (`language: [Korean]`) filter the same way.
function parseProperties(raw: unknown): Record<string, PropValue[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, PropValue[]> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const arr = Array.isArray(v) ? v : [v];
    const vals = arr
      .filter((x) => x !== null && x !== undefined && x !== "")
      .map((x): PropValue =>
        typeof x === "number" || typeof x === "boolean" ? x : String(x)
      );
    if (vals.length) out[k] = vals;
  }
  return out;
}

let defsCache: Record<string, DefOverride> | null = null;
function loadDefs(): Record<string, DefOverride> {
  if (defsCache) return defsCache;
  const p = path.join(CONTENT_DIR, "_properties.json");
  try {
    defsCache = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    defsCache = {};
  }
  return defsCache!;
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
        properties: parseProperties(data.properties),
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

/**
 * Filterable properties present across a set of entries. Values are derived
 * from the entries themselves (so a new property becomes a filter the moment
 * one entry uses it); type/label/range come from content/_properties.json when
 * present, otherwise inferred. Properties marked `hidden` are omitted.
 */
export function getFilters(entries: Entry[]): PropertyDef[] {
  const defs = loadDefs();
  const collected = new Map<string, Set<PropValue>>();
  for (const e of entries) {
    for (const [k, vals] of Object.entries(e.properties)) {
      const set = collected.get(k) ?? new Set<PropValue>();
      vals.forEach((v) => set.add(v));
      collected.set(k, set);
    }
  }

  const out: PropertyDef[] = [];
  for (const [key, set] of collected) {
    const def = defs[key] ?? {};
    if (def.hidden) continue;
    const values = [...set];
    const nums = values.filter((v): v is number => typeof v === "number");
    const type: PropertyDef["type"] =
      def.type ??
      (values.every((v) => typeof v === "boolean")
        ? "boolean"
        : values.every((v) => typeof v === "number")
          ? "number"
          : "enum");
    const sorted =
      type === "number"
        ? nums.slice().sort((a, b) => a - b)
        : values
            .slice()
            .sort((a, b) => String(a).localeCompare(String(b)));
    out.push({
      key,
      label: def.label ?? key[0].toUpperCase() + key.slice(1),
      type,
      values: sorted,
      min: def.min ?? (nums.length ? Math.min(...nums) : undefined),
      max: def.max ?? (nums.length ? Math.max(...nums) : undefined),
      summary: def.summary ?? false,
    });
  }

  // Order by the definitions file first, then anything else alphabetically.
  const order = Object.keys(defs);
  return out.sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.label.localeCompare(b.label);
  });
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
