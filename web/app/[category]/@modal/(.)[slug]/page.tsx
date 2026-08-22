import { notFound } from "next/navigation";
import { getEntry } from "@/lib/archive";
import EntryView from "../../EntryView";
import EntryModal from "../../EntryModal";

/**
 * Intercepts /<category>/<slug> when it is reached by clicking a tile, and
 * shows it over the grid instead of navigating away. A direct visit or a
 * refresh skips the interception and renders the real page.
 */
export default async function InterceptedEntry({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const entry = getEntry(category, slug);
  if (!entry) notFound();

  return (
    <EntryModal category={category} slug={slug} title={entry.title}>
      <EntryView entry={entry} />
    </EntryModal>
  );
}
