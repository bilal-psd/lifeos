"use client";

import { useMemo, useState } from "react";
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

function ratingStars(row: Row): string | null {
  const r = row.properties.rating?.find((v) => typeof v === "number") as number | undefined;
  if (r == null) return null;
  return "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");
}

export default function FilterableList({
  rows,
  filters,
}: {
  rows: Row[];
  filters: PropertyDef[];
}) {
  const [state, setState] = useState<FilterState>({});

  const active = filters.some((f) => {
    const s = state[f.key];
    return s && ((s.enum?.length ?? 0) > 0 || s.from != null || s.to != null || s.on);
  });

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

  const chip = (activeState: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition-colors ${
      activeState
        ? "border-accent bg-accent/10 text-accent"
        : "border-border text-muted hover:text-foreground"
    }`;

  return (
    <div>
      {filters.length > 0 && (
        <div className="mb-8 space-y-3 border-b border-border pb-6">
          {filters.map((def) => (
            <div key={def.key} className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 text-sm text-muted">{def.label}</span>

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
                <div className="flex items-center gap-2 text-sm">
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

          <div className="flex items-center gap-4 pt-1 text-sm text-muted">
            <span>
              {filtered.length} of {rows.length}
            </span>
            {active && (
              <button
                type="button"
                onClick={() => setState({})}
                className="text-accent hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-muted">No entries match these filters.</p>
      ) : (
        <ul className="space-y-6">
          {filtered.map((e) => {
            const stars = ratingStars(e);
            const lang = e.properties.language?.map(String).join(", ");
            return (
              <li key={e.slug}>
                <Link href={`/${e.category}/${e.slug}`} className="group block">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium transition-colors group-hover:text-accent">
                      {e.title}
                    </span>
                    <time className="shrink-0 text-sm text-muted">{formatDate(e.date)}</time>
                  </div>
                  {(stars || lang) && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      {stars && <span className="text-accent">{stars}</span>}
                      {lang && <span>{lang}</span>}
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
