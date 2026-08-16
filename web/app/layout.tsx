import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { getCategories } from "@/lib/archive";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeOS",
  description: "A personal archive of things watched, read, and thought about.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const categories = getCategories();
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
          <header className="mb-14 flex items-baseline justify-between gap-4">
            <Link
              href="/"
              className="text-[15px] font-semibold tracking-tight transition-colors hover:text-foreground"
            >
              LifeOS
            </Link>
            <nav className="flex flex-wrap gap-5 text-[13px] text-muted">
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
          <footer className="mt-24 border-t border-border pt-6 text-[12px] text-faint">
            A personal archive.
          </footer>
        </div>
      </body>
    </html>
  );
}
