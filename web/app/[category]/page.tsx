import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getEntries, getFilters, getListCards } from "@/lib/archive";
import FilterableList from "./FilterableList";
import CurrentlyReading from "./CurrentlyReading";

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

  // In-progress entries (properties.status: "reading") have no rating yet —
  // keep them out of the rated grid and surface them in their own strip.
  const reading = entries.filter((e) => (e.properties.status ?? []).includes("reading"));
  const finished = entries.filter((e) => !(e.properties.status ?? []).includes("reading"));

  const filters = getFilters(finished);
  const lists = getListCards(finished);
  const toRow = (e: (typeof entries)[number]) => ({
    slug: e.slug,
    category: e.category,
    title: e.title,
    date: e.date,
    properties: e.properties,
    cover: e.cover,
  });

  return (
    <>
      <CurrentlyReading entries={reading.map(toRow)} />
      <FilterableList rows={finished.map(toRow)} filters={filters} lists={lists} category={category} />
    </>
  );
}
