"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ categories }: { categories: string[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-5 text-[11px] font-semibold uppercase tracking-[.09em] text-muted">
      {categories.map((c) => {
        const current = pathname === `/${c}` || pathname.startsWith(`/${c}/`);
        return (
          <Link
            key={c}
            href={`/${c}`}
            className={current ? "text-star" : "transition-colors hover:text-foreground"}
          >
            {c}
          </Link>
        );
      })}
    </nav>
  );
}
