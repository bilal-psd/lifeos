import Link from "next/link";
import { getEntries } from "@/lib/archive";
import { formatDate } from "@/lib/format";

export default function Home() {
  const entries = getEntries();
  return (
    <div>
      <p className="mb-10 text-[15px] text-muted">
        Things I&rsquo;ve watched, read, and thought about.
      </p>
      {entries.length === 0 ? (
        <p className="text-muted">Nothing archived yet.</p>
      ) : (
        <ul className="border-t border-border">
          {entries.map((e) => (
            <li key={`${e.category}/${e.slug}`} className="border-b border-border">
              <Link href={`/${e.category}/${e.slug}`} className="group block py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[15px] font-medium tracking-[-.006em] transition-colors group-hover:text-accent">
                    {e.title}
                  </span>
                  <time className="shrink-0 text-[12.5px] text-faint tabular-nums">
                    {formatDate(e.date)}
                  </time>
                </div>
                <span className="mt-1 block text-[12.5px] capitalize text-muted">
                  {e.category}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
