"use client";

import { useEffect, useMemo, useState } from "react";
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
  if (def.type === "boolean") {
    if (!state.on) return true;
    return vals.includes(true);
  }
  return true;
}

// How a property renders in the row summary line.
function formatProp(def: PropertyDef, values: PropValue[]): string {
  if (def.key === "rating") {
    const r = values.find((v) => typeof v === "number") as number | undefined;
    if (r == null) return "";
    return "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");
  }
  if (def.type === "boolean") return values.includes(true) ? def.label : "";
  return values.map(String).join(", ");
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
  const [state, setState] = useState<FilterState>({});
  const [panel, setPanel] = useState<"filter" | "display" | null>(null);
  const [display, setDisplay] = useState<string[]>(
    filters.filter((f) => f.summary).map((f) => f.key),
  );

  // Per-category display preference persists across visits.
  const storeKey = `lifeos:display:${category}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) setDisplay(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, [storeKey]);
  const saveDisplay = (next: string[]) => {
    setDisplay(next);
    try {
      localStorage.setItem(storeKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const defByKey = useMemo(
    () => Object.fromEntries(filters.map((d) => [d.key, d])),
    [filters],
  );

  const activeCount = filters.filter((f) => {
    const s = state[f.key];
    return s && ((s.enum?.length ?? 0) > 0 || s.from != null || s.to != null || s.on);
  }).length;

  const filtered = useMemo(
    () => rows.filter((row) => filters.every((def) => matches(def, state[def.key], row))),
    [rows, filters, state],
  );

  const toggleEnum = (key: string, value: PropValue) =>
    setState((prev) => {
      const cur = prev[key]?.enum ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [key]: { ...prev[key], enum: next } };
    });
  const setNumber = (key: string, edge: "from" | "to", value: number | undefined) =>
    setState((prev) => ({ ...prev, [key]: { ...prev[key], [edge]: value } }));
  const toggleBool = (key: string) =>
    setState((prev) => ({ ...prev, [key]: { ...prev[key], on: !prev[key]?.on } }));
  const toggleDisplay = (key: string) =>
    saveDisplay(display.includes(key) ? display.filter((k) => k !== key) : [...display, key]);

  const barBtn = (on: boolean) =>
    `transition-colors ${on ? "text-foreground" : "text-muted hover:text-foreground"}`;
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition-colors ${
      on ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
    }`;

  return (
    <div>
      {filters.length > 0 && (
        <div className="mb-8 text-sm">
          {/* minimal bar — everything else is behind a click */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPanel(panel === "filter" ? null : "filter")}
              className={barBtn(panel === "filter")}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === "display" ? null : "display")}
              className={barBtn(panel === "display")}
            >
              Display
            </button>
            {activeCount > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setState({})}
                  className="text-accent hover:underline"
                >
                  Clear
                </button>
                <span className="ml-auto text-muted">
                  {filtered.length} of {rows.length}
                </span>
              </>
            )}
          </div>

          {panel === "filter" && (
            <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
              {filters.map((def) => (
                <div key={def.key} className="flex flex-wrap items-center gap-2">
                  <span className="w-20 shrink-0 text-muted">{def.label}</span>
                  {def.type === "enum" &&
                    def.values.map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => toggleEnum(def.key, v)}
                        className={chip((state[def.key]?.enum ?? []).includes(v))}
                      >
                        {String(v)}
                      </button>
                    ))}
                  {def.type === "boolean" && (
                    <button
                      type="button"
                      onClick={() => toggleBool(def.key)}
                      className={chip(!!state[def.key]?.on)}
                    >
                      {def.label}
                    </button>
                  )}
                  {def.type === "number" && (
                    <div className="flex items-center gap-2">
                      <select
                        value={state[def.key]?.from ?? ""}
                        onChange={(e) =>
                          setNumber(def.key, "from", e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="rounded border border-border bg-transparent px-2 py-1"
                      >
                        <option value="">Any</option>
                        {(def.values as number[]).map((v) => (
                          <option key={v} value={v}>
                            {v}+
                          </option>
                        ))}
                      </select>
                      <span className="text-muted">to</span>
                      <select
                        value={state[def.key]?.to ?? ""}
                        onChange={(e) =>
                          setNumber(def.key, "to", e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="rounded border border-border bg-transparent px-2 py-1"
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
              ))}
            </div>
          )}

          {panel === "display" && (
            <div className="mt-4 rounded-lg border border-border p-4">
              <p className="mb-3 text-muted">Show under each title:</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {filters.map((def) => (
                  <label key={def.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={display.includes(def.key)}
                      onChange={() => toggleDisplay(def.key)}
                      className="accent-accent"
                    />
                    {def.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-muted">No entries match these filters.</p>
      ) : (
        <ul className="space-y-6">
          {filtered.map((e) => {
            const shown = display
              .map((k) => [k, defByKey[k]] as const)
              .filter(([k, def]) => def && (e.properties[k]?.length ?? 0) > 0)
              .map(([k, def]) => [def, formatProp(def, e.properties[k])] as const)
              .filter(([, text]) => text);
            return (
              <li key={e.slug}>
                <Link href={`/${e.category}/${e.slug}`} className="group block">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium transition-colors group-hover:text-accent">
                      {e.title}
                    </span>
                    <time className="shrink-0 text-sm text-muted">{formatDate(e.date)}</time>
                  </div>
                  {shown.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
                      {shown.map(([def, text]) => (
                        <span key={def.key} className={def.key === "rating" ? "text-accent" : ""}>
                          {text}
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
