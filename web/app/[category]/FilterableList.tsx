"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { PropertyDef, PropValue } from "@/lib/archive";

export type Row = {
  slug: string;
  category: string;
  title: string;
  date: string;
  properties: Record<string, PropValue[]>;
};

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
    liked: <path d="M8 13.7S2.3 10.2 2.3 6.3A3 3 0 018 4.2a3 3 0 015.7 2.1C13.7 10.2 8 13.7 8 13.7z" />,
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
  };
  const filled = name === "rating" || name === "liked";
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

const stars = (r: number) => "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");

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
  return def.type === "number" ? `${sel[0]}s` : String(sel[0]);
}

export default function FilterableList({
  rows,
  filters,
  category,
}: {
  rows: Row[];
  filters: PropertyDef[];
  category: string;
}) {
  const [fstate, setFstate] = useState<FilterState>({});
  const [open, setOpen] = useState<"filter" | "display" | null>(null);
  const [drop, setDrop] = useState<string | null>(null); // open dropdown key (or "__sort__")
  const [flip, setFlip] = useState(false); // right-align dropdown near the edge
  const [display, setDisplay] = useState<string[]>(filters.filter((f) => f.summary).map((f) => f.key));
  const [sort, setSort] = useState<Sort>("date");

  const rootRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const defByKey = useMemo(
    () => Object.fromEntries(filters.map((d) => [d.key, d])) as Record<string, PropertyDef>,
    [filters],
  );

  /* persistence: what's shown + ordering, per category */
  const storeKey = `lifeos:view:${category}`;
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(storeKey) || "{}");
      if (Array.isArray(s.display)) setDisplay(s.display);
      if (s.sort) setSort(s.sort);
    } catch {
      /* ignore */
    }
  }, [storeKey]);
  const persist = (next: { display?: string[]; sort?: Sort }) => {
    try {
      localStorage.setItem(storeKey, JSON.stringify({ display, sort, ...next }));
    } catch {
      /* ignore */
    }
  };

  const closeAll = useCallback(() => {
    setOpen(null);
    setDrop(null);
  }, []);

  /* outside-click + two-level Escape (dropdown first, then the unfurl) */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (drop) setDrop(null);
        else setOpen(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, drop, closeAll]);

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
  const toggleEnum = (key: string, v: PropValue) =>
    setFstate((p) => {
      const cur = p[key]?.enum ?? [];
      return { ...p, [key]: { ...p[key], enum: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } };
    });
  const setThreshold = (key: string, v: number) =>
    setFstate((p) => ({ ...p, [key]: { from: p[key]?.from === v ? undefined : v } }));
  const toggleBool = (key: string) => setFstate((p) => ({ ...p, [key]: { on: !p[key]?.on } }));
  const clearAll = () => setFstate({});
  const toggleDisplay = (key: string) => {
    const next = display.includes(key) ? display.filter((k) => k !== key) : [...display, key];
    setDisplay(next);
    persist({ display: next });
  };
  const chooseSort = (s: Sort) => {
    setSort(s);
    persist({ sort: s });
    setDrop(null);
  };
  const openDrop = (key: string) => setDrop((d) => (d === key ? null : key));

  const barBtn =
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong";
  const nameBtn = (active: boolean, isOpen: boolean) =>
    `unfurl-name inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong ${
      isOpen ? "bg-surface text-foreground" : active ? "text-foreground hover:bg-surface" : "text-muted hover:bg-surface hover:text-foreground"
    }`;
  const optRow =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:bg-accent-soft";

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
                <span className="flex-1">{String(v)}</span>
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
      {filters.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5" onKeyDown={onMenuKey}>
          {/* ---- Filter ---- */}
          {open === "filter" ? (
            <div className="flex flex-wrap items-center gap-0.5" data-names>
              <button type="button" className={barBtn} aria-label="Close filters" onClick={closeAll}>
                <Ico name="filter" />
              </button>
              {filters.map((def) => {
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
            </div>
          ) : (
            <button type="button" className={barBtn} aria-expanded={false} onClick={() => (setOpen("filter"), setDrop(null))}>
              <Ico name="filter" />
              Filter
              {activeDefs.length > 0 && (
                <span className="rounded-full border border-border px-1.5 text-[11px] leading-4 text-faint tabular-nums">
                  {activeDefs.length}
                </span>
              )}
            </button>
          )}

          <span className="flex-1" />

          {/* result count + clear, when filtering */}
          {activeDefs.length > 0 && (
            <>
              <span className="text-[12.5px] text-faint tabular-nums">
                {view.length} of {rows.length}
              </span>
              <button type="button" onClick={clearAll} className="rounded-md px-2 py-1 text-[12.5px] text-accent hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong">
                Clear
              </button>
            </>
          )}

          {/* ---- Display ---- */}
          {open === "display" ? (
            <div className="flex flex-wrap items-center justify-end gap-0.5" data-names>
              {filters.map((def) => {
                const on = display.includes(def.key);
                return (
                  <button
                    key={def.key}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    className={nameBtn(on, false)}
                    onClick={() => toggleDisplay(def.key)}
                  >
                    <span className={on ? "text-accent" : "text-faint"}>{on ? "●" : "○"}</span>
                    {def.label}
                  </button>
                );
              })}
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup
                  aria-expanded={drop === "__sort__"}
                  className={nameBtn(false, drop === "__sort__")}
                  onClick={() => openDrop("__sort__")}
                >
                  Sort
                  <span className={`text-faint transition-transform ${drop === "__sort__" ? "rotate-180" : ""}`}>
                    <Ico name="chevron" size={12} />
                  </span>
                </button>
                {drop === "__sort__" && (
                  <div ref={dropRef} role="menu" className={`pop absolute top-full z-40 mt-1.5 min-w-[160px] ${ddPos}`}>
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
              <button type="button" className={barBtn} aria-label="Close display options" onClick={closeAll}>
                <Ico name="display" />
              </button>
            </div>
          ) : (
            <button type="button" className={barBtn} aria-expanded={false} onClick={() => (setOpen("display"), setDrop(null))}>
              <Ico name="display" />
              Display
            </button>
          )}
        </div>
      )}

      {view.length === 0 ? (
        <div className="border-t border-border py-8 text-[14px] text-faint">
          No entries match these filters.
          {activeDefs.length > 0 && (
            <button type="button" onClick={clearAll} className="ml-2 text-accent hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="border-t border-border">
          {view.map((e) => {
            const shown = display
              .map((k) => defByKey[k])
              .filter((def): def is PropertyDef => !!def && (e.properties[def.key]?.length ?? 0) > 0)
              .map((def) => {
                const vals = e.properties[def.key];
                if (def.key === "rating") {
                  const r = vals.find((v) => typeof v === "number") as number | undefined;
                  return r != null ? { key: def.key, cls: "text-star tracking-[1px]", text: stars(r) } : null;
                }
                if (def.type === "boolean") return vals.includes(true) ? { key: def.key, cls: "", text: def.label } : null;
                return { key: def.key, cls: def.type === "number" ? "tabular-nums" : "", text: vals.map(String).join(", ") };
              })
              .filter((x): x is { key: string; cls: string; text: string } => !!x && !!x.text);
            return (
              <li key={e.slug} className="border-b border-border">
                <Link href={`/${e.category}/${e.slug}`} className="group block py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[15px] font-medium tracking-[-.006em] transition-colors group-hover:text-accent">
                      {e.title}
                    </span>
                    <time className="shrink-0 text-[12.5px] text-faint tabular-nums">{formatDate(e.date)}</time>
                  </div>
                  {shown.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-muted">
                      {shown.map((s) => (
                        <span key={s.key} className={s.cls}>
                          {s.text}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
