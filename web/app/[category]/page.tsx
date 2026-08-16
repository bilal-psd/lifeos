import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getEntries, getFilters } from "@/lib/archive";
import FilterableList from "./FilterableList";

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

  const filters = getFilters(entries);
  const rows = entries.map((e) => ({
    slug: e.slug,
    category: e.category,
    title: e.title,
    date: e.date,
    properties: e.properties,
  }));

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2.5">
        <h1 className="text-[19px] font-semibold capitalize tracking-[-.01em]">
          {category}
        </h1>
        <span className="text-[13px] text-faint tabular-nums">{entries.length}</span>
      </div>
      <FilterableList rows={rows} filters={filters} category={category} />
    </div>
  );
}
