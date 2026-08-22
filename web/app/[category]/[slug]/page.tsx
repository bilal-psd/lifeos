import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEntries, getEntry } from "@/lib/archive";
import EntryView from "../EntryView";

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

/**
 * The full page for one entry. Reached by a direct visit, a refresh, or a
 * shared link. Clicking through from the grid gets the modal instead, via the
 * intercepting route in @modal — same content either way, see EntryView.
 */
export default async function EntryPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const entry = getEntry(category, slug);
  if (!entry) notFound();

  return (
    <article className="max-w-2xl">
      <Link
        href={`/${entry.category}`}
        className="text-sm capitalize text-muted transition-colors hover:text-foreground"
      >
        ← {entry.category}
      </Link>
      <div className="mt-5">
        <EntryView entry={entry} />
      </div>
    </article>
  );
}
