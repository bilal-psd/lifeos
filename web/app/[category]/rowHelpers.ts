import type { Row } from "./FilterableList";

export const numProp = (row: Row, key: string) =>
  row.properties[key]?.find((v) => typeof v === "number") as number | undefined;

export const stars = (r: number) => "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");

/** Joined string values of a property — "Phil Lord, Christopher Miller". */
export const strProp = (row: Row, key: string) =>
  row.properties[key]?.filter((v) => typeof v === "string").join(", ") || undefined;

/** Which property names "who made this", per category. */
export const CREDIT_KEY: Record<string, string> = { films: "director", books: "author" };

/**
 * The credit shown under a title — director for films, author for books.
 * These are `hidden` properties, so they never reach the filter bar (and so
 * never reach `summaryDefs` either); every surface renders them explicitly.
 */
export const creditOf = (row: Row) => {
  const key = CREDIT_KEY[row.category];
  return key ? strProp(row, key) : undefined;
};
