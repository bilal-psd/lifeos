"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatDate, formatMonthYear } from "@/lib/format";
import type { ListCard, PropertyDef, PropValue } from "@/lib/archive";
import { numProp, stars, creditOf } from "./rowHelpers";
import { Cover } from "./Cover";
import CurrentlyReading from "./CurrentlyReading";

export type Row = {
  slug: string;
  category: string;
  title: string;
  date: string;
  properties: Record<string, PropValue[]>;
  cover: string | null;
};

type ViewMode = "grid" | "list";

type Sort = "date" | "rating" | "title";
type FilterState = Record<string, { enum?: PropValue[]; from?: number; on?: boolean }>;

/* ---- icons ---- */
function Ico({ name, size = 15 }: { name: string; size?: number }) {
  const p: Record<string, React.ReactNode> = {
    filter: <path d="M2 4h12M4.5 8h7M6.5 12h3" strokeLinecap="round" />,
    display: (
      <>
        <rect x="2.2" y="2.2" width="4.4" height="4.4" rx="1" />
        <rect x="9.4" y="2.2" width="4.4" height="4.4" rx="1" />
        <rect x="2.2" y="9.4" width="4.4" height="4.4" rx="1" />
        <rect x="9.4" y="9.4" width="4.4" height="4.4" rx="1" />
      </>
    ),
    rating: <path d="M8 2l1.7 3.7 4 .5-3 2.8.8 4L8 11l-3.5 2 .8-4-3-2.8 4-.5z" />,
    language: (
      <>
        <circle cx="8" cy="8" r="6.1" />
        <path d="M2 8h12M8 2c2 2.3 2 9.7 0 12M8 2C6 4.3 6 11.7 8 14" />
      </>
    ),
    year: (
      <>
        <rect x="2.3" y="3.3" width="11.4" height="10.4" rx="1.6" />
        <path d="M2.5 6.4h11M5.4 2.1v2.4M10.6 2.1v2.4" />
      </>
    ),
    lists: (
      <>
        <path d="M5.5 4h8M5.5 8h8M5.5 12h8" strokeLinecap="round" />
        <circle cx="2.6" cy="4" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="2.6" cy="8" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="2.6" cy="12" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
    check: <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />,
    chevron: <path d="M4 6.5L8 10l4-3.5" strokeLinecap="round" strokeLinejoin="round" />,
    sort: (
      <path
        d="M4.5 3v9M4.5 12L2.4 9.7M4.5 12l2.1-2.3M11.5 13V4M11.5 4L9.4 6.3M11.5 4l2.1 2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    grid: (
      <>
        <rect x="2.3" y="2.3" width="4.6" height="4.6" rx="1" />
        <rect x="9.1" y="2.3" width="4.6" height="4.6" rx="1" />
        <rect x="2.3" y="9.1" width="4.6" height="4.6" rx="1" />
        <rect x="9.1" y="9.1" width="4.6" height="4.6" rx="1" />
      </>
    ),
    rows: <path d="M2.5 4h11M2.5 8h11M2.5 12h11" strokeLinecap="round" />,
  };
  const filled = name === "rating";
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="1.35"
      aria-hidden="true"
    >
      {p[name] ?? p.filter}
    </svg>
  );
}

// display label for a value (list slugs resolve to their registered name)
const labelFor = (def: PropertyDef, v: PropValue) => def.valueLabels?.[String(v)] ?? String(v);

/* number properties on a small ordinal scale (rating) filter by threshold;
   wide-range ones (year) bucket into decades. */
const numberMode = (def: PropertyDef): "threshold" | "decade" =>
  def.min != null && def.max != null && def.max - def.min <= 10 ? "threshold" : "decade";
const decadeOf = (y: number) => Math.floor(y / 10) * 10;
const decadesOf = (def: PropertyDef) =>
  [...new Set((def.values as number[]).map(decadeOf))].sort((a, b) => a - b);

function isActive(def: PropertyDef, s: FilterState[string]): boolean {
  if (!s) return false;
  if (def.type === "boolean") return !!s.on;
  if (def.type === "number" && numberMode(def) === "threshold") return s.from != null;
  return (s.enum?.length ?? 0) > 0;
}

function matchDef(def: PropertyDef, s: FilterState[string], row: Row): boolean {
  if (!s) return true;
  const vals = row.properties[def.key] ?? [];
  if (def.type === "enum") {
    const sel = s.enum ?? [];
    return sel.length === 0 || vals.some((v) => sel.includes(v));
  }
  if (def.type === "boolean") return s.on ? vals.includes(true) : true;
  if (def.type === "number") {
    const nums = vals.filter((v): v is number => typeof v === "number");
    if (numberMode(def) === "threshold") return s.from == null || nums.some((v) => v >= s.from!);
    const sel = (s.enum ?? []) as number[];
    return sel.length === 0 || nums.some((v) => sel.includes(decadeOf(v)));
  }
  return true;
}

function valueLabel(def: PropertyDef, s: FilterState[string]): string {
  if (!s) return "";
  if (def.type === "boolean") return "";
  if (def.type === "number" && numberMode(def) === "threshold") return s.from ? `${s.from}+` : "";
  const sel = s.enum ?? [];
  if (sel.length === 0) return "";
  if (sel.length > 1) return `${sel.length}`;
  return def.type === "number" ? `${sel[0]}s` : labelFor(def, sel[0]);
}

/* ---- featured lists ---- */
// A small fanned stack of member covers; missing covers fall back to the tile.
function ListFan({ covers, title }: { covers: (string | null)[]; title: string }) {
  const items = covers.length ? covers.slice(0, 3) : [null];
  const layout =
    items.length >= 3
      ? [
          { l: 0, t: 6, r: -8, z: 1 },
          { l: 20, t: 6, r: 8, z: 2 },
          { l: 10, t: 0, r: 0, z: 3 },
        ]
      : items.length === 2
        ? [
            { l: 3, t: 4, r: -6, z: 1 },
            { l: 17, t: 0, r: 6, z: 2 },
          ]
        : [{ l: 10, t: 0, r: 0, z: 1 }];
  return (
    <div className="relative h-[72px] w-[64px] shrink-0">
      {items.map((c, i) => (
        <div
          key={i}
          className="absolute aspect-[2/3] w-[44px] overflow-hidden rounded-[4px] border border-border-strong shadow-md"
          style={{ left: layout[i].l, top: layout[i].t, transform: `rotate(${layout[i].r}deg)`, zIndex: layout[i].z }}
        >
          <Cover cover={c} title={title} variant="thumb" />
        </div>
      ))}
    </div>
  );
}

function FeaturedLists({
  lists,
  selected,
  onSelect,
}: {
  lists: ListCard[];
  selected: (slug: string) => boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <section className="shelf mb-8 rounded-2xl p-5" aria-label="Featured">
      <h2 className="font-display mb-4 text-[15px] font-medium italic text-foreground/[.85]">Featured</h2>
      <div className="scroll-x-clean -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1.5">
        {lists.map((l) => {
          const on = selected(l.slug);
          return (
            <button
              key={l.slug}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(l.slug)}
              className={`flex w-[min(300px,82vw)] shrink-0 snap-start gap-3.5 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong ${
                on
                  ? "border-star bg-[rgba(224,164,85,.07)]"
                  : "border-border hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface"
              }`}
            >
              <ListFan covers={l.covers} title={l.name} />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="line-clamp-1 text-[14px] font-semibold leading-snug tracking-[-.005em]">{l.name}</div>
                {l.description && (
                  <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted">{l.description}</div>
                )}
                <div className="mt-auto pt-2 text-[11.5px] tabular-nums text-faint">
                  {l.count} {l.count === 1 ? "entry" : "entries"}
                  {on && <span className="text-star"> · selected</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function FilterableList({
  rows,
  filters,
  lists,
  category,
  reading = [],
}: {
  rows: Row[];
  filters: PropertyDef[];
  lists: ListCard[];
  category: string;
  reading?: Row[];
}) {
  const [fstate, setFstate] = useState<FilterState>({});
  const [open, setOpen] = useState<"filter" | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [drop, setDrop] = useState<string | null>(null); // open filter-property dropdown key
  const [flip, setFlip] = useState(false); // right-align dropdown near the edge
  const [sort, setSort] = useState<Sort>("rating");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const rootRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  // Lists drive the featured section, not a filter chip — keep them out of the bar.
  const facetDefs = useMemo(() => filters.filter((d) => d.key !== "lists"), [filters]);
  // List view shows a fixed default set of facets (the `summary` properties).
  const summaryDefs = useMemo(() => filters.filter((d) => d.summary), [filters]);
  // Over every row, not the filtered view — otherwise the credit line would
  // appear and vanish as filters change.
  const anyCredit = useMemo(() => rows.some((r) => creditOf(r)), [rows]);

  /* persistence: sort + view mode, per category.
     v2 bumps past saved prefs so the new grid/rating default takes over. */
  const storeKey = `lifeos:view:${category}:v2`;
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(storeKey) || "{}");
      if (s.sort) setSort(s.sort);
      if (s.viewMode === "grid" || s.viewMode === "list") setViewMode(s.viewMode);
    } catch {
      /* ignore */
    }
  }, [storeKey]);
  const persist = (next: { sort?: Sort; viewMode?: ViewMode }) => {
    try {
      localStorage.setItem(storeKey, JSON.stringify({ sort, viewMode, ...next }));
    } catch {
      /* ignore */
    }
  };
  const chooseView = (v: ViewMode) => {
    setViewMode(v);
    persist({ viewMode: v });
  };

  const closeAll = useCallback(() => {
    setOpen(null);
    setSortOpen(false);
    setDrop(null);
  }, []);

  /* outside-click + two-level Escape (dropdown first, then the unfurl/menu) */
  useEffect(() => {
    if (!open && !sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (drop) setDrop(null);
        else if (sortOpen) setSortOpen(false);
        else setOpen(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, sortOpen, drop, closeAll]);

  /* edge-flip: if the open dropdown would overflow the viewport, right-align it */
  useLayoutEffect(() => {
    setFlip(false);
    if (!drop) return;
    const el = dropRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) setFlip(true);
  }, [drop]);

  /* roving arrow-key focus inside the open menu */
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const scope = drop
      ? dropRef.current
      : (e.currentTarget as HTMLElement).querySelector("[data-names]");
    if (!scope) return;
    const items = [...scope.querySelectorAll<HTMLElement>("button:not([disabled])")];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i === -1) return;
    e.preventDefault();
    const next = e.key === "ArrowDown" ? i + 1 : i - 1;
    items[(next + items.length) % items.length]?.focus();
  };

  const activeDefs = filters.filter((d) => isActive(d, fstate[d.key]));
  const view = useMemo(() => {
    let out = rows.filter((r) => filters.every((d) => matchDef(d, fstate[d.key], r)));
    if (sort === "rating") {
      const rt = (r: Row) => (r.properties.rating?.find((v) => typeof v === "number") as number) ?? -1;
      out = [...out].sort((a, b) => rt(b) - rt(a));
    } else if (sort === "title") {
      out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    }
    return out;
  }, [rows, filters, fstate, sort]);

  /* mutations */
  // enum / decade are multi-select — keep the dropdown open so values can be stacked.
  const toggleEnum = (key: string, v: PropValue) =>
    setFstate((p) => {
      const cur = p[key]?.enum ?? [];
      return { ...p, [key]: { ...p[key], enum: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } };
    });
  // rating threshold is single-select — one pick is the answer, so close (like Sort).
  const setThreshold = (key: string, v: number) => {
    setFstate((p) => ({ ...p, [key]: { from: p[key]?.from === v ? undefined : v } }));
    setDrop(null);
  };
  const toggleBool = (key: string) => setFstate((p) => ({ ...p, [key]: { on: !p[key]?.on } }));
  const clearAll = () => setFstate({});
  // Featured lists are single-select: picking one is the whole filter; picking it again clears.
  const listSelected = (slug: string) => (fstate.lists?.enum ?? []).includes(slug);
  const selectList = (slug: string) => {
    setFstate((p) => ({ ...p, lists: { enum: listSelected(slug) ? [] : [slug] } }));
    setSortOpen(false);
  };
  const chooseSort = (s: Sort) => {
    setSort(s);
    persist({ sort: s });
    setSortOpen(false);
  };
  const openDrop = (key: string) => setDrop((d) => (d === key ? null : key));

  const iconBtn =
    "inline-flex h-7 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong";
  const clearBtn =
    "rounded-md px-2 py-1 text-[12.5px] text-accent transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong";
  const nameBtn = (active: boolean, isOpen: boolean) =>
    `unfurl-name inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong ${
      isOpen ? "bg-surface text-foreground" : active ? "text-foreground hover:bg-surface" : "text-muted hover:bg-surface hover:text-foreground"
    }`;
  const optRow =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:bg-accent-soft";
  const viewSeg = (on: boolean) =>
    `inline-flex h-6 w-7 items-center justify-center rounded text-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong ${
      on ? "bg-surface text-foreground" : "hover:text-foreground"
    }`;

  const ddPos = flip ? "right-0" : "left-0";

  const filterDropdown = (def: PropertyDef) => {
    if (def.type === "boolean") return null;
    const s = fstate[def.key];
    return (
      <div
        ref={dropRef}
        role="menu"
        className={`pop absolute top-full z-40 mt-1.5 max-h-72 min-w-[180px] overflow-y-auto ${ddPos}`}
      >
        {def.type === "enum" &&
          def.values.map((v) => {
            const on = (s?.enum ?? []).includes(v);
            return (
              <button key={String(v)} type="button" role="menuitemcheckbox" aria-checked={on} className={optRow} onClick={() => toggleEnum(def.key, v)}>
                <span className="flex-1">{labelFor(def, v)}</span>
                {on && <span className="text-accent"><Ico name="check" size={14} /></span>}
              </button>
            );
          })}
        {def.type === "number" && numberMode(def) === "threshold" &&
          Array.from({ length: Math.floor(def.max ?? 5) }, (_, i) => Math.floor(def.max ?? 5) - i).map((n) => (
            <button key={n} type="button" role="menuitemradio" aria-checked={s?.from === n} className={optRow} onClick={() => setThreshold(def.key, n)}>
              <span className="text-star tracking-[1px]">{"★".repeat(n)}</span>
              <span className="flex-1 text-[12.5px] text-muted">&amp; up</span>
              {s?.from === n && <span className="text-accent"><Ico name="check" size={14} /></span>}
            </button>
          ))}
        {def.type === "number" && numberMode(def) === "decade" &&
          decadesOf(def).map((d) => {
            const on = ((s?.enum ?? []) as number[]).includes(d);
            return (
              <button key={d} type="button" role="menuitemcheckbox" aria-checked={on} className={optRow} onClick={() => toggleEnum(def.key, d)}>
                <span className="flex-1 tabular-nums">{d}s</span>
                {on && <span className="text-accent"><Ico name="check" size={14} /></span>}
              </button>
            );
          })}
      </div>
    );
  };

  return (
    <div ref={rootRef}>
      {reading.length > 0 && <CurrentlyReading entries={reading} />}
      {lists.length > 0 && (
        <FeaturedLists lists={lists} selected={listSelected} onSelect={selectList} />
      )}

      {/* Header line — category, count, and every control, all on one line above the grid. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[.12em] text-faint">
          <span className="capitalize">{category}</span> ·{" "}
          {activeDefs.length > 0 ? `${view.length} of ${rows.length}` : rows.length}
        </span>
        <span className="h-px flex-1 bg-border" />

        {open === "filter" ? (
          <div className="flex flex-wrap items-center justify-end gap-0.5" data-names onKeyDown={onMenuKey}>
            {facetDefs.map((def) => {
              const active = isActive(def, fstate[def.key]);
              const isOpen = drop === def.key;
              const vl = valueLabel(def, fstate[def.key]);
              return (
                <div key={def.key} className="relative">
                  <button
                    type="button"
                    aria-haspopup={def.type !== "boolean"}
                    aria-expanded={isOpen}
                    className={nameBtn(active, isOpen)}
                    onClick={() => (def.type === "boolean" ? toggleBool(def.key) : openDrop(def.key))}
                  >
                    {def.label}
                    {vl && <span className="text-accent">{vl}</span>}
                    {def.type !== "boolean" && (
                      <span className={`text-faint transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        <Ico name="chevron" size={12} />
                      </span>
                    )}
                  </button>
                  {isOpen && filterDropdown(def)}
                </div>
              );
            })}
            {activeDefs.length > 0 && (
              <button type="button" onClick={clearAll} className={clearBtn}>
                Clear
              </button>
            )}
            <button type="button" className={`${iconBtn} bg-surface text-foreground`} aria-label="Close filters" onClick={closeAll}>
              <Ico name="filter" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            {activeDefs.length > 0 && (
              <button type="button" onClick={clearAll} className={clearBtn}>
                Clear
              </button>
            )}
            <div className="inline-flex items-center gap-0.5 rounded-md border border-border-strong p-0.5" role="group" aria-label="View">
              <button type="button" aria-pressed={viewMode === "grid"} aria-label="Grid view" title="Grid" className={viewSeg(viewMode === "grid")} onClick={() => chooseView("grid")}>
                <Ico name="grid" size={14} />
              </button>
              <button type="button" aria-pressed={viewMode === "list"} aria-label="List view" title="List" className={viewSeg(viewMode === "list")} onClick={() => chooseView("list")}>
                <Ico name="rows" size={15} />
              </button>
            </div>
            <div className="inline-flex items-center gap-0.5 rounded-md border border-border-strong p-0.5">
              {facetDefs.length > 0 && (
                <button
                  type="button"
                  title="Filter"
                  aria-label="Filter"
                  aria-expanded={false}
                  className={`${iconBtn}${activeDefs.length > 0 ? " text-foreground" : ""}`}
                  onClick={() => (setOpen("filter"), setSortOpen(false), setDrop(null))}
                >
                  <Ico name="filter" />
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  title="Sort"
                  aria-label="Sort"
                  aria-haspopup
                  aria-expanded={sortOpen}
                  className={`${iconBtn}${sortOpen ? " bg-surface text-foreground" : ""}`}
                  onClick={() => (setSortOpen((v) => !v), setDrop(null))}
                >
                  <Ico name="sort" />
                </button>
                {sortOpen && (
                  <div role="menu" className="pop absolute right-0 top-full z-40 mt-1.5 min-w-[176px]">
                    {([["date", "Newest first"], ["rating", "Highest rated"], ["title", "Title A–Z"]] as [Sort, string][]).map(
                      ([v, label]) => (
                        <button key={v} type="button" role="menuitemradio" aria-checked={sort === v} className={optRow} onClick={() => chooseSort(v)}>
                          <span className="flex-1">{label}</span>
                          {sort === v && <span className="text-accent"><Ico name="check" size={14} /></span>}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {view.length === 0 ? (
        <div className="border-t border-border py-8 text-[14px] text-faint">
          No entries match these filters.
          {activeDefs.length > 0 && (
            <button type="button" onClick={clearAll} className="ml-2 text-accent hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(142px,1fr))]">
          {view.map((e) => {
            const r = numProp(e, "rating");
            // films carry their own release year; other categories fall back
            // to the entry's logged date — either way, real data, not invented.
            const yr = numProp(e, "year");
            const dateline = yr != null ? String(yr) : formatMonthYear(e.date);
            const credit = creditOf(e);
            return (
              <Link key={e.slug} href={`/${e.category}/${e.slug}`} className="group block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:border-border-strong group-hover:shadow-lg">
                  <Cover cover={e.cover} title={e.title} variant="poster" />
                  {r != null && (
                    <span className="absolute right-1.5 top-1.5 flex items-center gap-[3px] rounded-md border border-star/40 bg-background/80 px-1.5 py-0.5 text-[11px] font-semibold text-star tabular-nums backdrop-blur-sm">
                      <Ico name="rating" size={9} />
                      {Number.isInteger(r) ? r : r.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="line-clamp-2 min-h-[calc(1.32em*2)] text-[13px] font-medium leading-snug tracking-[-.006em] transition-colors group-hover:text-accent">
                    {e.title}
                  </div>
                  {/* Rendered for every tile once the category has any credits at
                      all, so a missing one leaves a gap instead of shifting the
                      row out of alignment with its neighbours. */}
                  {anyCredit && (
                    <div className="mt-0.5 min-h-[1.35em] truncate text-[11px] leading-tight text-muted">
                      {credit}
                    </div>
                  )}
                  {dateline && (
                    <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint">
                      {dateline}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <ul className="border-t border-border">
          {view.map((e) => {
            const credit = creditOf(e);
            const shown = summaryDefs
              .filter((def) => (e.properties[def.key]?.length ?? 0) > 0)
              .map((def) => {
                const vals = e.properties[def.key];
                if (def.key === "rating") {
                  const r = vals.find((v) => typeof v === "number") as number | undefined;
                  return r != null ? { key: def.key, cls: "text-star tracking-[1px]", text: stars(r) } : null;
                }
                if (def.type === "boolean") return vals.includes(true) ? { key: def.key, cls: "", text: def.label } : null;
                return { key: def.key, cls: def.type === "number" ? "tabular-nums" : "", text: vals.map((v) => labelFor(def, v)).join(", ") };
              })
              .filter((x): x is { key: string; cls: string; text: string } => !!x && !!x.text);
            return (
              <li key={e.slug} className="border-b border-border">
                <Link href={`/${e.category}/${e.slug}`} className="group flex items-center gap-3.5 py-2.5">
                  <div className="relative aspect-[2/3] w-[38px] shrink-0 overflow-hidden rounded-[4px] border border-border bg-surface">
                    <Cover cover={e.cover} title={e.title} variant="thumb" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="truncate text-[15px] font-medium tracking-[-.006em] transition-colors group-hover:text-accent">
                        {e.title}
                      </span>
                      <time className="shrink-0 text-[12.5px] text-faint tabular-nums">{formatDate(e.date)}</time>
                    </div>
                    {(shown.length > 0 || credit) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-muted">
                        {credit && <span className="truncate">{credit}</span>}
                        {shown.map((s) => (
                          <span key={s.key} className={s.cls}>
                            {s.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
