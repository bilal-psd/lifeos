import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCategories } from "@/lib/archive";

export const metadata: Metadata = {
  title: "LifeOS",
  description: "A personal archive of things watched, read, and thought about.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const categories = getCategories();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
          <header className="mb-12 flex items-baseline justify-between gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              LifeOS
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm text-muted">
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/${c}`}
                  className="capitalize transition-colors hover:text-foreground"
                >
                  {c}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
          <footer className="mt-20 border-t border-border pt-6 text-xs text-muted">
            A personal archive.
          </footer>
        </div>
      </body>
    </html>
  );
}
