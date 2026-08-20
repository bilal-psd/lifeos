import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEntries } from "@/lib/archive";
import RateBoard, { type RateGroup } from "./RateBoard";

// Local authoring tool — hidden (404) in production.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rate — LifeOS" };

const CATEGORIES = ["films", "books"] as const;
const numProp = (vals: (string | number | boolean)[] | undefined) =>
  (vals?.find((v) => typeof v === "number") as number | undefined) ?? null;

export default function RatePage() {
  if (process.env.NODE_ENV === "production") notFound();

  const groups: RateGroup[] = CATEGORIES.map((category) => ({
    category,
    entries: getEntries(category)
      .filter((e) => !(e.properties.rating ?? []).some((v) => typeof v === "number"))
      .map((e) => ({
        slug: e.slug,
        category: e.category,
        title: e.title,
        cover: e.cover,
        year: numProp(e.properties.year),
      })),
  })).filter((g) => g.entries.length > 0);

  return <RateBoard groups={groups} />;
}
