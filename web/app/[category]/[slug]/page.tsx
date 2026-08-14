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

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {entry.title}
      </h1>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <time>{formatDate(entry.date)}</time>
        {entry.tags.map((t) => (
          <span key={t}>#{t}</span>
        ))}
      </div>

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
