import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getEntries } from "@/lib/archive";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return getCategories().map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return { title: `${category} — LifeOS` };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const entries = getEntries(category);
  if (entries.length === 0) notFound();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold capitalize tracking-tight">
        {category}
      </h1>
      <ul className="space-y-6">
        {entries.map((e) => (
          <li key={e.slug}>
            <Link href={`/${e.category}/${e.slug}`} className="group block">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium transition-colors group-hover:text-accent">
                  {e.title}
                </span>
                <time className="shrink-0 text-sm text-muted">
                  {formatDate(e.date)}
                </time>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
