import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getEntries, getEntry, linkOut } from "@/lib/archive";
import { formatDate } from "@/lib/format";

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

  return (
    <article>
      <Link
        href={`/${entry.category}`}
        className="text-sm capitalize text-muted transition-colors hover:text-foreground"
      >
        ← {entry.category}
      </Link>

      <h1 className="mt-4 text-[22px] font-semibold tracking-[-.012em]">
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
                <dt className="capitalize text-muted">{key}</dt>
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

      <div className="entry-body mt-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.body}</ReactMarkdown>
      </div>

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
