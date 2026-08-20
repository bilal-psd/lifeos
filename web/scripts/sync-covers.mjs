// Copies cover images from the archive (content/<cat>/covers/*) into the app's
// public/ so they serve as ordinary static assets. Runs at predev/prebuild.
// Source of truth stays in content/; public/covers is a gitignored build copy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = process.env.CONTENT_DIR ?? path.join(webDir, "..", "content");
const OUT = path.join(webDir, "public", "covers");
const EXTS = new Set([".jpg", ".jpeg", ".webp", ".png"]);

if (!fs.existsSync(CONTENT_DIR)) {
  console.log("[sync-covers] no content dir, skipping");
  process.exit(0);
}

let copied = 0;
fs.rmSync(OUT, { recursive: true, force: true });
for (const cat of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
  if (!cat.isDirectory()) continue;
  const src = path.join(CONTENT_DIR, cat.name, "covers");
  if (!fs.existsSync(src)) continue;
  const dst = path.join(OUT, cat.name);
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (!EXTS.has(path.extname(f).toLowerCase())) continue;
    fs.copyFileSync(path.join(src, f), path.join(dst, f));
    copied++;
  }
}
console.log(`[sync-covers] copied ${copied} cover(s) into public/covers`);
