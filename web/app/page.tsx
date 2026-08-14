import Link from "next/link";
import { getEntries } from "@/lib/archive";
import { formatDate } from "@/lib/format";

export default function Home() {
  const entries = getEntries();
  return (
    <div>
      <p className="mb-10 text-muted">
        Things I&rsquo;ve watched, read, and thought about.
      </p>
      {entries.length === 0 ? (
        <p className="text-muted">Nothing archived yet.</p>
      ) : (
        <ul className="space-y-6">
          {entries.map((e) => (
            <li key={`${e.category}/${e.slug}`}>
              <Link href={`/${e.category}/${e.slug}`} className="group block">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium transition-colors group-hover:text-accent">
                    {e.title}
                  </span>
                  <time className="shrink-0 text-sm text-muted">
                    {formatDate(e.date)}
                  </time>
                </div>
                <span className="text-sm capitalize text-muted">
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
