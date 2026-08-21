import Link from "next/link";
import type { Row } from "./FilterableList";
import { Cover } from "./Cover";

/**
 * A book gets here via `properties.status: reading` — set while in progress,
 * dropped once rated and finished (see the books skill). No rating exists
 * yet, so the tile only shows what's known: cover and title.
 */
export default function CurrentlyReading({ entries }: { entries: Row[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="shelf mb-8 rounded-2xl p-5" aria-label="Currently reading">
      <h2 className="font-display mb-4 text-[15px] font-medium italic text-foreground/[.85]">
        Currently reading
      </h2>
      <div className="scroll-x-clean -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1.5">
        {entries.map((e) => (
          <Link
            key={e.slug}
            href={`/${e.category}/${e.slug}`}
            className="group block w-[104px] shrink-0 snap-start sm:w-[132px]"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:border-border-strong group-hover:shadow-lg">
              <Cover cover={e.cover} title={e.title} variant="poster" />
              <span className="font-display absolute left-1.5 top-1.5 rounded-full bg-background/60 px-2 py-0.5 text-[10px] italic text-foreground/90 backdrop-blur-sm">
                reading
              </span>
            </div>
            <div className="mt-2 line-clamp-2 text-[12.5px] font-medium leading-snug tracking-[-.006em] transition-colors group-hover:text-accent">
              {e.title}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
