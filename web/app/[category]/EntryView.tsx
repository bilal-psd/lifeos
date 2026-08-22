import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Entry } from "@/lib/archive";
import { linkOut, propertyLabel } from "@/lib/archive";
import { formatDate } from "@/lib/format";
import { coverArt, monogram } from "@/lib/cover";

/** "themoviedb.org" — the bare host, for a compact source credit. */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Singular noun for a category, used in the synopsis heading. */
const KIND: Record<string, string> = { films: "film", books: "book", projects: "project" };

/**
 * One entry's content, shared by the routed page and the modal so the two can
 * never drift apart. The wrapper supplies its own chrome: a back link on the
 * page, a close button and flip controls in the modal.
 */
export default function EntryView({ entry }: { entry: Entry }) {
  const link = linkOut(entry);
  const kind = KIND[entry.category] ?? "entry";

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-7">
        {/* The poster sits in a pool of its own colour. Every entry's panel is
            tinted by its own artwork; everything else stays monochrome. */}
        <div className="entry-art relative shrink-0 self-start">
          {entry.cover && (
            <div
              className="entry-glow"
              aria-hidden="true"
              style={{ backgroundImage: `url(${entry.cover})` }}
            />
          )}
          <div className="relative aspect-[2/3] w-32 overflow-hidden rounded-lg border border-border-strong bg-surface shadow-md sm:w-[188px]">
            {entry.cover ? (
              <Image
                src={entry.cover}
                alt={`${entry.title} cover`}
                fill
                sizes="(max-width:640px) 128px, 188px"
                className="object-cover"
                priority
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: coverArt(entry.title) }}
              >
                <span className="select-none text-5xl font-semibold text-white/[.10]" aria-hidden="true">
                  {monogram(entry.title)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[.09em] text-faint">
            {kind}
          </div>
          <h1 className="entry-title font-display mt-2">{entry.title}</h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <time className="tabular-nums text-faint">{formatDate(entry.date)}</time>
            {entry.tags.map((t) => (
              <span key={t} className="text-faint">
                #{t}
              </span>
            ))}
          </div>

          {Object.keys(entry.properties).length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px]">
              {Object.entries(entry.properties).map(([key, values]) => {
                const n = typeof values[0] === "number" ? (values[0] as number) : null;
                return (
                  <div key={key} className="flex items-baseline gap-2">
                    <dt className="text-muted">{propertyLabel(key)}</dt>
                    <dd className="font-medium">
                      {key === "rating" && n != null ? (
                        <span className="text-star tracking-[1px]">
                          {"★".repeat(Math.floor(n)) + (n % 1 ? "½" : "")}
                        </span>
                      ) : (
                        values.map((v) => (v === true ? "Yes" : String(v))).join(", ")
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      </div>

      {/* Most bulk-imported entries have no note. Render nothing rather than an
          empty block, so the synopsis sits directly under the metadata. */}
      {entry.body && (
        <div className="entry-body mt-7">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.body}</ReactMarkdown>
        </div>
      )}

      {entry.synopsis && (
        <aside
          className={entry.body ? "synopsis mt-8" : "synopsis synopsis-lead mt-7"}
          aria-label={`About this ${kind}`}
        >
          <h2 className="synopsis-eyebrow font-display">About this {kind}</h2>
          <p className="synopsis-text">{entry.synopsis.text}</p>
          <p className="synopsis-note">
            {/* Machine-written text on a public page says so plainly. */}
            AI-generated
            {entry.synopsis.sources.length > 0 && " from "}
            {entry.synopsis.sources.map((src, i) => (
              <span key={src}>
                {i > 0 && ", "}
                <a href={src} target="_blank" rel="noreferrer">
                  {hostLabel(src)}
                </a>
              </span>
            ))}
          </p>
        </aside>
      )}

      {link && (
        <div className="mt-8 border-t border-border pt-4 text-sm">
          <a href={link.href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            View on {link.label} ↗
          </a>
          {entry.metadata.id_status === "unverified" && (
            <span className="ml-2 text-muted">(unverified)</span>
          )}
        </div>
      )}
    </>
  );
}
