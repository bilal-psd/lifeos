import Link from "next/link";
import { Cover, type Row } from "./FilterableList";
import { numProp } from "./rowHelpers";

/**
 * A book gets here via `properties.status: reading` — set while in progress,
 * dropped once rated and finished (see the books skill). No rating exists
 * yet, so the tile only shows what's known: cover, title, year.
 */
export default function CurrentlyReading({ entries }: { entries: Row[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-7" aria-label="Currently reading">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[.16em] text-muted">Currently reading</h2>
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1.5">
        {entries.map((e) => {
          const yr = numProp(e, "year");
          return (
            <Link
              key={e.slug}
              href={`/${e.category}/${e.slug}`}
              className="group block w-[104px] shrink-0 snap-start sm:w-[142px]"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:border-border-strong group-hover:shadow-lg">
                <Cover cover={e.cover} title={e.title} variant="poster" />
              </div>
              <div className="mt-2">
                <div className="line-clamp-2 text-[13px] font-medium leading-snug tracking-[-.006em] transition-colors group-hover:text-accent">
                  {e.title}
                </div>
                {yr != null && <div className="mt-1 text-[11px] text-faint tabular-nums">{yr}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
