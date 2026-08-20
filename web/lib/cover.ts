// Deterministic fallback cover art for entries without a downloaded cover.
// A duotone gradient + a monogram, keyed on the title so it's stable and
// distinct. Shared by the list (client) and the detail page (server).

const COVER_PALS: [string, string][] = [
  ["#3b3024", "#0c0a07"], ["#16323a", "#080d0f"], ["#3a1f24", "#0d0708"], ["#20263f", "#08090f"],
  ["#233329", "#080c09"], ["#2f2440", "#0b0810"], ["#33302a", "#0a0a08"], ["#25313a", "#080b0d"],
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** CSS gradient for the fallback tile behind an entry's monogram. */
export function coverArt(title: string): string {
  const h = hashStr(title);
  const p = COVER_PALS[h % COVER_PALS.length];
  return `linear-gradient(${120 + ((h >> 3) % 80)}deg, ${p[0]}, ${p[1]})`;
}

/** Single-letter monogram for the fallback tile (skips leading The/A/paren). */
export function monogram(title: string): string {
  const m = title.replace(/^\(|^The\s+|^A\s+/i, "").trim();
  return (m[0] || title[0] || "·").toUpperCase();
}
