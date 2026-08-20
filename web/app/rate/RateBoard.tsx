"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { coverArt, monogram } from "@/lib/cover";

export type RateItem = {
  slug: string;
  category: string;
  title: string;
  cover: string | null;
  year: number | null;
};
export type RateGroup = { category: string; entries: RateItem[] };

const keyOf = (it: RateItem) => `${it.category}/${it.slug}`;

const STAR_PATH = "M8 2l1.7 3.7 4 .5-3 2.8.8 4L8 11l-3.5 2 .8-4-3-2.8 4-.5z";

// A single star filled 0 / half / full, drawn by clipping a filled star over an outline.
function Star({ fill, size = 22 }: { fill: number; size?: number }) {
  return (
    <span className="relative block" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 16 16" className="block">
        <path d={STAR_PATH} fill="none" stroke="var(--faint)" strokeWidth="1.2" />
      </svg>
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <svg width={size} height={size} viewBox="0 0 16 16" className="block">
            <path d={STAR_PATH} fill="var(--star)" />
          </svg>
        </span>
      )}
    </span>
  );
}

// Five stars, each half clickable → 0.5-step ratings (0.5–5.0).
function StarRow({ value, onSet }: { value?: number; onSet: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0;
        return (
          <span key={n} className="relative inline-block" style={{ width: 22, height: 22 }}>
            <Star fill={fill} />
            {[n - 0.5, n].map((v, half) => (
              <button
                key={v}
                type="button"
                aria-label={`${v} star${v > 1 ? "s" : ""}`}
                className={`absolute inset-y-0 ${half === 0 ? "left-0" : "right-0"} w-1/2 focus-visible:outline-none`}
                onMouseEnter={() => setHover(v)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSet(v);
                }}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}

function Poster({ cover, title }: { cover: string | null; title: string }) {
  if (cover) return <Image src={cover} alt="" fill sizes="(max-width:560px) 40vw, 180px" className="object-cover" />;
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: coverArt(title) }}>
      <span className="select-none text-4xl font-semibold leading-none text-white/[.10]" aria-hidden="true">
        {monogram(title)}
      </span>
    </div>
  );
}

export default function RateBoard({ groups }: { groups: RateGroup[] }) {
  const [cat, setCat] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [focus, setFocus] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const items = useMemo(() => groups[cat]?.entries ?? [], [groups, cat]);
  const ratedCount = items.filter((it) => ratings[keyOf(it)] != null).length;

  const apply = useCallback(
    async (it: RateItem, r: number) => {
      const k = keyOf(it);
      const prev = ratings[k];
      setRatings((p) => {
        const n = { ...p };
        if (r === 0) delete n[k];
        else n[k] = r;
        return n;
      });
      try {
        const res = await fetch("/api/rate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ category: it.category, slug: it.slug, rating: r }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
        setError(null);
      } catch (e) {
        // revert optimistic update on failure
        setRatings((p) => {
          const n = { ...p };
          if (prev == null) delete n[k];
          else n[k] = prev;
          return n;
        });
        setError(`Couldn't save “${it.title}”: ${(e as Error).message}`);
      }
    },
    [ratings],
  );

  // keyboard: 1–5 rate (and advance to the next unrated), arrows move, ⌫/0 clear
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const it = items[focus];
      if (!it) return;
      if (/^[0-9]$/.test(e.key)) {
        // 0–10 scale on the number row: 1–9 = that score, 0 = 10. Store score/2.
        e.preventDefault();
        const score = e.key === "0" ? 10 : Number(e.key);
        apply(it, score / 2);
        setFocus((f) => {
          for (let i = f + 1; i < items.length; i++) if (ratings[keyOf(items[i])] == null) return i;
          return Math.min(items.length - 1, f + 1);
        });
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => Math.min(items.length - 1, f + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocus((f) => Math.max(0, f - 1));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        apply(it, 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, focus, ratings, apply]);

  // keep the focused card in view
  useEffect(() => {
    cardRefs.current[focus]?.scrollIntoView({ block: "nearest" });
  }, [focus]);

  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  if (total === 0) {
    return (
      <div className="py-16 text-center text-[15px] text-muted">
        Everything&apos;s rated. Nothing left to do here. 🎉
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[19px] font-semibold tracking-[-.01em]">Rate</h1>
        <span className="text-[13px] text-faint tabular-nums">
          {ratedCount} of {items.length} this session
        </span>
      </div>
      <p className="mb-5 text-[12.5px] text-muted">
        <kbd className="kbd">1</kbd>–<kbd className="kbd">9</kbd>,<kbd className="kbd">0</kbd> rate on a
        0–10 scale (<span className="text-foreground">7 = 3½★</span>, <kbd className="kbd">0</kbd> = 10) ·{" "}
        <kbd className="kbd">←</kbd>
        <kbd className="kbd">→</kbd> move · <kbd className="kbd">⌫</kbd> clear. Half-stars are clickable
        too. Saves straight to the markdown — this page is local-only.
      </p>

      {groups.length > 1 && (
        <div className="mb-5 inline-flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {groups.map((g, i) => {
            const remaining = g.entries.filter((it) => ratings[keyOf(it)] == null).length;
            return (
              <button
                key={g.category}
                type="button"
                onClick={() => {
                  setCat(i);
                  setFocus(0);
                }}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[13px] capitalize transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong ${
                  i === cat ? "bg-surface text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {g.category}
                <span className="text-[11px] text-faint tabular-nums">{remaining}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-border-strong bg-surface px-3 py-2 text-[12.5px] text-star">
          {error}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-6">
        {items.map((it, i) => {
          const r = ratings[keyOf(it)];
          const focused = i === focus;
          return (
            <div
              key={keyOf(it)}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              onClick={() => setFocus(i)}
              className={`scroll-mt-4 rounded-lg border p-2 transition-colors ${
                focused ? "border-star bg-surface" : "border-transparent hover:border-border"
              }`}
            >
              <div
                className={`relative aspect-[2/3] overflow-hidden rounded-md border bg-surface ${
                  r != null ? "border-border" : "border-border-strong"
                }`}
              >
                <Poster cover={it.cover} title={it.title} />
                {r != null && (
                  <div className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-star tabular-nums">
                    {r}★
                  </div>
                )}
              </div>
              <div className="mt-2 line-clamp-1 text-[13px] font-medium tracking-[-.006em]" title={it.title}>
                {it.title}
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-[11px] text-faint tabular-nums">{it.year ?? ""}</span>
              </div>
              <div className="mt-1.5">
                <StarRow value={r} onSet={(v) => apply(it, v)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
