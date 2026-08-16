"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type FilterState = Record<
  string,
  { enum?: PropValue[]; from?: number; to?: number; on?: boolean }
>;

type Sort = "date" | "rating" | "title";

/* ---- icons (16px, stroked to match Linear's line weight) ---- */
function Ico({ name }: { name: string }) {
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
    check: <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />,
    back: <path d="M9.5 3.5L5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />,
    x: <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />,
  };
  const filled = name === "rating" || name === "liked";
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="1.35"
    >
      {p[name]}
    </svg>
  );
}

function matches(def: PropertyDef, state: FilterState[string], row: Row): boolean {
  if (!state) return true;
  const vals = row.properties[def.key] ?? [];
  if (def.type === "enum") {
    const sel = state.enum ?? [];
    if (sel.length === 0) return true;
    return vals.some((v) => sel.includes(v));
  }
  if (def.type === "number") {
    if (state.from == null && state.to == null) return true;
    const nums = vals.filter((v): v is number => typeof v === "number");
    return nums.some(
      (v) => (state.from == null || v >= state.from) && (state.to == null || v <= state.to),
    );
  }
  if (def.type === "boolean") return state.on ? vals.includes(true) : true;
  return true;
}

function stars(r: number): string {
  return "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");
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
  const [panel, setPanel] = useState<"filter" | "display" | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [display, setDisplay] = useState<string[]>(
    filters.filter((f) => f.summary).map((f) => f.key),
  );
  const [sort, setSort] = useState<Sort>("date");

  const defByKey = useMemo(
    () => Object.fromEntries(filters.map((d) => [d.key, d])) as Record<string, PropertyDef>,
    [filters],
  );

  // Per-category view preference (what to show + ordering) persists.
  const storeKey = `lifeos:view:${category}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || "{}");
      if (Array.isArray(saved.display)) setDisplay(saved.display);
      if (saved.sort) setSort(saved.sort);
    } catch {
      /* ignore */
    }
  }, [storeKey]);
  const persist = (next: { display?: string[]; sort?: Sort }) => {
    try {
      localStorage.setItem(
        storeKey,
        JSON.stringify({ display, sort, ...next }),
      );
    } catch {
      /* ignore */
    }
  };

  // Dismiss popovers on outside click / Escape.
  const filterRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filterRef.current?.contains(t) || displayRef.current?.contains(t)) return;
      setPanel(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  const activeKeys = filters.filter((f) => {
    const s = fstate[f.key];
    return s && ((s.enum?.length ?? 0) > 0 || s.from != null || s.to != null || s.on);
  });

  const view = useMemo(() => {
    let out = rows.filter((r) => filters.every((d) => matches(d, fstate[d.key], r)));
    if (sort === "rating") {
      const rt = (r: Row) => (r.properties.rating?.find((v) => typeof v === "number") as number) ?? -1;
      out = [...out].sort((a, b) => rt(b) - rt(a));
    } else if (sort === "title") {
      out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    }
    return out;
  }, [rows, filters, fstate, sort]);

  const toggleEnum = (key: string, v: PropValue) =>
    setFstate((p) => {
      const cur = p[key]?.enum ?? [];
      return { ...p, [key]: { ...p[key], enum: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } };
    });
  const setMin = (key: string, v: number | undefined) =>
    setFstate((p) => ({ ...p, [key]: { ...p[key], from: v } }));
  const setRange = (key: string, edge: "from" | "to", v: number | undefined) =>
    setFstate((p) => ({ ...p, [key]: { ...p[key], [edge]: v } }));
  const toggleBool = (key: string) =>
    setFstate((p) => ({ ...p, [key]: { ...p[key], on: !p[key]?.on } }));
  const clearKey = (key: string) => setFstate((p) => ({ ...p, [key]: {} }));
  const toggleDisplay = (key: string) => {
    const next = display.includes(key) ? display.filter((k) => k !== key) : [...display, key];
    setDisplay(next);
    persist({ display: next });
  };
  const changeSort = (s: Sort) => {
    setSort(s);
    persist({ sort: s });
  };

  const openFilter = (s: string | null) => {
    setStep(s);
    setPanel("filter");
  };

  const pillText = (key: string): string => {
    const s = fstate[key];
    if (!s) return "";
    if (key === "language" || defByKey[key]?.type === "enum") return (s.enum ?? []).join(", ");
    if (key === "liked") return "Yes";
    if (defByKey[key]?.key === "rating") return `${s.from}+`;
    return `${s.from ?? "…"}–${s.to ?? "…"}`;
  };

  const barBtn =
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-muted transition-colors hover:bg-surface hover:text-foreground aria-expanded:bg-surface aria-expanded:text-foreground";

  return (
    <div>
      {filters.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          {/* Filter */}
          <div ref={filterRef} className="relative">
            <button
              type="button"
              aria-expanded={panel === "filter"}
              onClick={() => (panel === "filter" ? setPanel(null) : openFilter(null))}
              className={barBtn}
            >
              <Ico name="filter" />
              Filter
            </button>
            {panel === "filter" && (
              <div className="pop absolute left-0 top-full z-40 mt-1.5 min-w-[210px]">
                {step === null ? (
                  filters.map((def) => {
                    const on = activeKeys.some((k) => k.key === def.key);
                    return (
                      <button
                        key={def.key}
                        type="button"
                        className="pop-row"
                        onClick={() => (def.type === "boolean" ? toggleBool(def.key) : setStep(def.key))}
                      >
                        <span className="text-muted">
                          <Ico name={def.key in { rating: 1, language: 1, liked: 1, year: 1 } ? def.key : "filter"} />
                        </span>
                        <span className="flex-1">{def.label}</span>
                        {on && <span className="text-faint">•</span>}
                      </button>
                    );
                  })
                ) : (
                  <StepPanel
                    def={defByKey[step]}
                    state={fstate[step]}
                    onBack={() => setStep(null)}
                    onToggleEnum={(v) => toggleEnum(step, v)}
                    onSetMin={(v) => setMin(step, v)}
                    onSetRange={(edge, v) => setRange(step, edge, v)}
                  />
                )}
              </div>
            )}
          </div>

          {/* applied pills */}
          {activeKeys.map((def) => (
            <span
              key={def.key}
              className="inline-flex items-center overflow-hidden rounded-md border border-border-strong bg-surface text-[12.5px]"
            >
              <button
                type="button"
                onClick={() => openFilter(def.key)}
                className="flex items-center py-[3px] pl-2 pr-1.5 hover:bg-accent-soft"
              >
                <span className="text-muted">{def.label}</span>
                <span className="ml-1 font-medium tabular-nums">{pillText(def.key)}</span>
              </button>
              <button
                type="button"
                aria-label={`Remove ${def.label} filter`}
                onClick={() => clearKey(def.key)}
                className="flex h-full items-center border-l border-border px-1.5 text-muted hover:bg-accent-soft hover:text-foreground"
              >
                <Ico name="x" />
              </button>
            </span>
          ))}

          <span className="flex-1" />
          {activeKeys.length > 0 && (
            <span className="text-[12.5px] text-faint tabular-nums">
              {view.length} of {rows.length}
            </span>
          )}

          {/* Display */}
          <div ref={displayRef} className="relative">
            <button
              type="button"
              aria-expanded={panel === "display"}
              onClick={() => setPanel(panel === "display" ? null : "display")}
              className={barBtn}
            >
              <Ico name="display" />
              Display
            </button>
            {panel === "display" && (
              <div className="pop absolute right-0 top-full z-40 mt-1.5 min-w-[220px]">
                <div className="px-2 pb-1 pt-1.5 text-[11px] uppercase tracking-wider text-faint">
                  Show under each title
                </div>
                {filters.map((def) => (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => toggleDisplay(def.key)}
                    className="pop-row justify-between"
                  >
                    <span>{def.label}</span>
                    <span className="lx-sw" data-on={display.includes(def.key)} />
                  </button>
                ))}
                <div className="mt-1 border-t border-border px-2 pb-1 pt-2 text-[11px] uppercase tracking-wider text-faint">
                  Ordering
                </div>
                <div className="px-2 py-1.5">
                  <select
                    value={sort}
                    onChange={(e) => changeSort(e.target.value as Sort)}
                    className="lx-select w-full"
                  >
                    <option value="date">Newest first</option>
                    <option value="rating">Highest rated</option>
                    <option value="title">Title A–Z</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view.length === 0 ? (
        <p className="border-t border-border py-8 text-[14px] text-faint">
          No entries match these filters.
        </p>
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
                  return r != null
                    ? { key: def.key, cls: "text-star tracking-[1px]", text: stars(r) }
                    : null;
                }
                if (def.type === "boolean")
                  return vals.includes(true) ? { key: def.key, cls: "", text: def.label } : null;
                return {
                  key: def.key,
                  cls: def.type === "number" ? "tabular-nums" : "",
                  text: vals.map(String).join(", "),
                };
              })
              .filter((x): x is { key: string; cls: string; text: string } => !!x && !!x.text);
            return (
              <li key={e.slug} className="border-b border-border">
                <Link href={`/${e.category}/${e.slug}`} className="group block py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[15px] font-medium tracking-[-.006em] transition-colors group-hover:text-accent">
                      {e.title}
                    </span>
                    <time className="shrink-0 text-[12.5px] text-faint tabular-nums">
                      {formatDate(e.date)}
                    </time>
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

/* value picker for one property (rating / language / year) */
function StepPanel({
  def,
  state,
  onBack,
  onToggleEnum,
  onSetMin,
  onSetRange,
}: {
  def: PropertyDef;
  state: FilterState[string];
  onBack: () => void;
  onToggleEnum: (v: PropValue) => void;
  onSetMin: (v: number | undefined) => void;
  onSetRange: (edge: "from" | "to", v: number | undefined) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 border-b border-border px-1.5 pb-1.5 pt-0.5 text-[11px] uppercase tracking-wider text-faint">
        <button type="button" onClick={onBack} className="flex items-center gap-1 hover:text-foreground">
          <Ico name="back" />
          {def.label}
        </button>
      </div>

      {def.key === "rating" &&
        [5, 4, 3, 2, 1].map((n) => (
          <button
            key={n}
            type="button"
            className="pop-row"
            onClick={() => onSetMin(state?.from === n ? undefined : n)}
          >
            <span className="text-star tracking-[1px]">{"★".repeat(n)}</span>
            <span className="flex-1 text-[12.5px] text-muted">{n} &amp; up</span>
            {state?.from === n && (
              <span className="text-accent">
                <Ico name="check" />
              </span>
            )}
          </button>
        ))}

      {def.type === "enum" &&
        def.values.map((v) => {
          const on = (state?.enum ?? []).includes(v);
          return (
            <button key={String(v)} type="button" className="pop-row" onClick={() => onToggleEnum(v)}>
              <span className="flex-1">{String(v)}</span>
              {on && (
                <span className="text-accent">
                  <Ico name="check" />
                </span>
              )}
            </button>
          );
        })}

      {def.key === "year" && (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <select
            value={state?.from ?? ""}
            onChange={(e) => onSetRange("from", e.target.value ? Number(e.target.value) : undefined)}
            className="lx-select"
          >
            <option value="">Any</option>
            {(def.values as number[]).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-faint">to</span>
          <select
            value={state?.to ?? ""}
            onChange={(e) => onSetRange("to", e.target.value ? Number(e.target.value) : undefined)}
            className="lx-select"
          >
            <option value="">Any</option>
            {(def.values as number[]).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
