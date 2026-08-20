import type { Row } from "./FilterableList";

export const numProp = (row: Row, key: string) =>
  row.properties[key]?.find((v) => typeof v === "number") as number | undefined;

export const stars = (r: number) => "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");
