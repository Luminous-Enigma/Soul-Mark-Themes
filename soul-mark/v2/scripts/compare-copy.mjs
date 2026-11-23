// Compares a host app's copy of the engine with this one. Exit 0: the same. Exit 1: they differ.
//   node scripts/compare-copy.mjs <host theme folder>
// Known, intended differences: the host's meaning.ts may read the status colors from its own
// Tailwind palette instead of data/meaning-colors.json.
import fs from "node:fs";
import path from "node:path";

const host = process.argv[2];
if (!host) {
  console.error("usage: node scripts/compare-copy.mjs <host theme folder>");
  process.exit(2);
}
const here = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "src");
const FILES = [
  "contrast.ts",
  "soul-mark.ts",
  "presets.ts",
  "meaning.ts",
  "soul-mark.spec.ts",
  "neon.ts",
  "neon-presets.ts",
  "neon.spec.ts",
  "glass.ts",
  "glass-presets.ts",
  "glass.spec.ts",
];
const normalize = (name, text) =>
  name !== "meaning.ts"
    ? text
    : text
        .split("\n")
        .filter((l) => !/tailwindcss\/colors|meaning-colors\.json|palette\.families|colors\[family\]|toUpperCase\(\) as Hex|^\s+shade$|^\s+\]\.toUpperCase|String\(shade\)|^\s+\] as Hex,$|^\/\*\* (Must match|The families and shades|Every meaning color as)/.test(l))
        .join("\n");
let differ = 0;
for (const f of FILES) {
  const a = path.join(here, f);
  const b = path.join(host, f);
  if (!fs.existsSync(b)) {
    console.log(`MISSING  ${f} (not in ${host})`);
    differ++;
    continue;
  }
  const same = normalize(f, fs.readFileSync(a, "utf8")) === normalize(f, fs.readFileSync(b, "utf8"));
  console.log(`${same ? "SAME   " : "DIFFERS"}  ${f}`);
  if (!same) differ++;
}
process.exit(differ ? 1 : 0);
