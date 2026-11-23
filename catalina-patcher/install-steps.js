// Runs the frontend packages' install steps after `npm ci --ignore-scripts`, the way npm would,
// except one that can't work on Catalina:
//
//   esbuild 0.24 and newer are built for macOS 11, and their installer refuses older macOS
//   ("cannot be installed because macOS 10.15 is too outdated"). ArtCraft's frontend installs one
//   (Vite 6's esbuild 0.25), but its app build uses its own Vite 5 and esbuild 0.21.5, which run
//   on 10.13 and up. So that one install step is skipped, said plainly, and nothing else is.
//
//   node install-steps.js <frontend folder> [--dry-run]
//
// Any other step that fails stops the build. Reads package-lock.json; changes nothing else.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const [dir, flag] = process.argv.slice(2);
if (!dir) {
  console.error("usage: node install-steps.js <frontend folder> [--dry-run]");
  process.exit(2);
}
const dry = flag === "--dry-run";
const lock = JSON.parse(fs.readFileSync(path.join(dir, "package-lock.json"), "utf8"));
const STEPS = ["preinstall", "install", "postinstall"];

let ran = 0, skipped = 0;
for (const [where, info] of Object.entries(lock.packages || {})) {
  if (!info.hasInstallScript || !where) continue;
  const pkgDir = path.join(dir, where);
  const pkgFile = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pkgFile)) continue; // an optional package for another platform
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
  const why = skipReason(pkg);
  if (why) {
    console.log(`skipped  ${where} ${pkg.version}: ${why}`);
    skipped++;
    continue;
  }
  const steps = STEPS.filter((s) => pkg.scripts && pkg.scripts[s]);
  if (!steps.length && fs.existsSync(path.join(pkgDir, "binding.gyp"))) {
    console.error(`stopped  ${where} needs a native build (binding.gyp), which this build doesn't expect`);
    process.exit(1);
  }
  for (const s of steps) {
    console.log(`run      ${where} ${pkg.version}: ${s}`);
    if (!dry) execFileSync("npm", ["run", "--silent", s], { cwd: pkgDir, stdio: "inherit" });
    ran++;
  }
}
console.log(`Install steps: ${ran} run, ${skipped} skipped`);

function skipReason(pkg) {
  if (pkg.name === "esbuild" && atLeast(pkg.version, [0, 24, 0])) {
    return "built for macOS 11, won't run on Catalina; the app build uses esbuild 0.21.5 instead";
  }
  return null;
}

function atLeast(version, min) {
  const v = String(version).split(/[.-]/).map(Number);
  for (let i = 0; i < 3; i++) {
    if ((v[i] || 0) !== min[i]) return (v[i] || 0) > min[i];
  }
  return true;
}
