import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getEntries, getEntry, linkOut, propertyLabel } from "@/lib/archive";
import { formatDate } from "@/lib/format";
import { coverArt, monogram } from "@/lib/cover";

/** "themoviedb.org" — the bare host, for a compact source credit. */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Singular noun for a category, used in the synopsis heading. */
const KIND: Record<string, string> = { films: "film", books: "book" };

export function generateStaticParams() {
  return getEntries().map((e) => ({ category: e.category, slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const entry = getEntry(category, slug);
  return { title: entry ? `${entry.title} — LifeOS` : "LifeOS" };
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const entry = getEntry(category, slug);
  if (!entry) notFound();

  const link = linkOut(entry);
  const kind = KIND[entry.category] ?? "entry";

  return (
    <article className="max-w-2xl">
      <Link
        href={`/${entry.category}`}
        className="text-sm capitalize text-muted transition-colors hover:text-foreground"
      >
        ← {entry.category}
      </Link>

      <div className="mt-5 flex gap-5">
        <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-surface shadow-md sm:w-36">
          {entry.cover ? (
            <Image src={entry.cover} alt={`${entry.title} cover`} fill sizes="(max-width:640px) 112px, 144px" className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: coverArt(entry.title) }}>
              <span className="select-none text-5xl font-semibold text-white/[.10]" aria-hidden="true">
                {monogram(entry.title)}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold tracking-[-.012em] text-balance">
            {entry.title}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <time className="tabular-nums text-faint">{formatDate(entry.date)}</time>
            {entry.tags.map((t) => (
              <span key={t} className="text-faint">
                #{t}
              </span>
            ))}
          </div>

          {Object.keys(entry.properties).length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px]">
              {Object.entries(entry.properties).map(([key, values]) => {
                const n = typeof values[0] === "number" ? (values[0] as number) : null;
                return (
                  <div key={key} className="flex items-baseline gap-2">
                    <dt className="text-muted">{propertyLabel(key)}</dt>
                    <dd className="font-medium">
                      {key === "rating" && n != null ? (
                        <span className="text-star tracking-[1px]">
                          {"★".repeat(Math.floor(n)) + (n % 1 ? "½" : "")}
                        </span>
                      ) : (
                        values.map((v) => (v === true ? "Yes" : String(v))).join(", ")
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      </div>

      <div className="entry-body mt-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.body}</ReactMarkdown>
      </div>

      {entry.synopsis && (
        <aside className="synopsis mt-10" aria-label={`About this ${kind}`}>
          <h2 className="synopsis-eyebrow font-display">About this {kind}</h2>
          <p className="synopsis-text">{entry.synopsis.text}</p>
          <p className="synopsis-note">
            {/* Machine-written text on a public page says so plainly. */}
            AI-generated
            {entry.synopsis.sources.length > 0 && " from "}
            {entry.synopsis.sources.map((src, i) => (
              <span key={src}>
                {i > 0 && ", "}
                <a href={src} target="_blank" rel="noreferrer">
                  {hostLabel(src)}
                </a>
              </span>
            ))}
          </p>
        </aside>
      )}

      {link && (
        <div className="mt-10 border-t border-border pt-4 text-sm">
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            View on {link.label} ↗
          </a>
          {entry.metadata.id_status === "unverified" && (
            <span className="ml-2 text-muted">(unverified)</span>
          )}
        </div>
      )}
    </article>
  );
}
