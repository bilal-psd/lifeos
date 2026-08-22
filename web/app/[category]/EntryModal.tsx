"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Key the grid writes its current order under, so the modal can flip through it. */
export const orderKey = (category: string) => `lifeos:order:${category}`;

/**
 * The panel an entry opens into when you click it from the grid.
 *
 * Flip order comes from sessionStorage rather than props: the grid is a client
 * component that knows the *filtered and sorted* order, and it sits in a
 * sibling route slot, so there is no shared React tree to read it from. When
 * nothing is stored (a direct visit or a shared link) the chevrons stay hidden,
 * which is right — there is no browsing session to flip through.
 */
export default function EntryModal({
  category,
  slug,
  title,
  children,
}: {
  category: string;
  slug: string;
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(orderKey(category));
      if (raw) setOrder(JSON.parse(raw));
    } catch {
      /* no order stored — flipping is simply unavailable */
    }
  }, [category]);

  const close = useCallback(() => router.back(), [router]);

  const i = order.indexOf(slug);
  const prev = i > 0 ? order[i - 1] : null;
  const next = i >= 0 && i < order.length - 1 ? order[i + 1] : null;

  // Replace rather than push, so Esc returns to the grid rather than walking
  // back through every entry that was flipped past.
  const go = useCallback(
    (target: string | null) => {
      if (target) router.replace(`/${category}/${target}`, { scroll: false });
    },
    [router, category],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(prev);
      else if (e.key === "ArrowRight") go(next);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, go, prev, next]);

  // Lock the page behind the panel while it is open.
  useEffect(() => {
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prior;
    };
  }, []);

  // A flip swaps the content in place, so reset the scroll position.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [slug]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="modal-scrim" aria-label="Close" onClick={close} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-panel"
        aria-keyshortcuts="Escape ArrowLeft ArrowRight"
      >
        <button type="button" className="modal-close" onClick={close} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round" />
          </svg>
        </button>

        <div ref={scrollRef} className="modal-body">
          {children}
        </div>

        {(prev || next) && (
          <div className="modal-bar">
            <button type="button" className="modal-chev" onClick={() => go(prev)} disabled={!prev} aria-label="Previous entry">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="modal-chev" onClick={() => go(next)} disabled={!next} aria-label="Next entry">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
