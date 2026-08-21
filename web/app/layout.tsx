import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { getCategories } from "@/lib/archive";
import Nav from "./Nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600"],
  style: ["normal", "italic"],
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
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <header className="mb-8 flex items-baseline justify-between gap-4 border-b border-border-strong pb-4">
            <Link
              href="/"
              className="font-display text-[19px] font-semibold tracking-[-.01em] transition-colors hover:text-foreground"
            >
              LifeOS
            </Link>
            <Nav categories={categories} />
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
