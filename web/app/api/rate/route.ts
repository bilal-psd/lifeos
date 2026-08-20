import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { contentDir, getCategories } from "@/lib/archive";

// Writes to the markdown source — a local authoring tool. Never in production
// (serverless can't write the repo anyway); the route hard-refuses there.
export const dynamic = "force-dynamic";
const DEV = process.env.NODE_ENV !== "production";

/* Set `properties.rating` by editing the frontmatter surgically — one line
   added or changed — so diffs stay clean and nothing else in the file moves
   (see the "edit frontmatter surgically" gotcha in CLAUDE.md). */
function splitFrontmatter(md: string): { pre: string; block: string; post: string } | null {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return { pre: md.slice(0, m.index!), block: m[1], post: md.slice(m.index! + m[0].length) };
}
const join = (pre: string, lines: string[], post: string) =>
  `${pre}---\n${lines.join("\n")}\n---${post}`;

function setRating(md: string, rating: number): string {
  const fm = splitFrontmatter(md);
  if (!fm) throw new Error("no frontmatter");
  const lines = fm.block.split("\n");
  const propIdx = lines.findIndex((l) => /^properties:\s*$/.test(l));
  if (propIdx === -1) {
    // No properties block — add one just before metadata:, else at the end.
    const metaIdx = lines.findIndex((l) => /^metadata:/.test(l));
    const ins = ["properties:", `  rating: ${rating}`];
    lines.splice(metaIdx === -1 ? lines.length : metaIdx, 0, ...ins);
  } else {
    // Scan the indented children for an existing rating; stop at the first dedent.
    let ratingLine = -1;
    for (let i = propIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.trim() === "") continue;
      if (!/^\s/.test(l)) break;
      if (/^\s+rating:/.test(l)) {
        ratingLine = i;
        break;
      }
    }
    if (ratingLine !== -1) lines[ratingLine] = lines[ratingLine].replace(/rating:\s*.*/, `rating: ${rating}`);
    else lines.splice(propIdx + 1, 0, `  rating: ${rating}`);
  }
  return join(fm.pre, lines, fm.post);
}

function clearRating(md: string): string {
  const fm = splitFrontmatter(md);
  if (!fm) return md;
  const lines = fm.block.split("\n").filter((l) => !/^\s+rating:\s*/.test(l));
  return join(fm.pre, lines, fm.post);
}

export async function POST(req: Request) {
  if (!DEV) return NextResponse.json({ error: "Rating is a local-only tool." }, { status: 403 });

  let body: { category?: string; slug?: string; rating?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const { category, slug } = body;
  const r = Number(body.rating);

  if (!category || !getCategories().includes(category))
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) // kebab slugs only — no path traversal
    return NextResponse.json({ error: "Bad slug." }, { status: 400 });
  if (!Number.isFinite(r) || r < 0 || r > 5)
    return NextResponse.json({ error: "Rating must be 0–5." }, { status: 400 });

  const file = path.join(contentDir(), category, `${slug}.md`);
  if (!fs.existsSync(file)) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const md = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, r === 0 ? clearRating(md) : setRating(md, r));
  return NextResponse.json({ ok: true, rating: r });
}
