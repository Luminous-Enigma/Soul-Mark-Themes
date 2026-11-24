# Status

Updated 23 Nov 2026.

## Done

- The script: `doctor`, `tags`, `build` (with `--dry-run`), `scan`, `patches`, `check`, `audit`;
  `--json`; exit codes 0, 1, 2; builds can go on an external drive and stop on exFAT.
- The build follows ArtCraft's own Mac release recipe (read from `storytold/artcraft` at
  `artcraft-v0.41.1`): frontend first, then Tauri with `SQLX_OFFLINE=true`; the Tauri build tool
  pinned to 2.11.5, the same 2.11 line as ArtCraft's Tauri (2.11.2).
- `audit.py`: every system function and class the built app links to, checked against the macOS
  10.15 SDK. Runs after every build.
- What ArtCraft's code needs from macOS, read from its source: its own code names no macOS 11+
  function. The Mac libraries in the Intel build are AppKit, Foundation, CoreFoundation,
  CoreGraphics and WebKit (through `tao`, `wry`, `muda`, `rfd` and `window-vibrancy`), all on
  10.15. The lockfile also has two 11+ frameworks (UniformTypeIdentifiers, Symbols), but only
  for other targets; neither is in the Intel Mac build.
- The frontend's native helpers, read from their binaries: esbuild 0.24 and newer are built for
  macOS 11 and refuse to install on Catalina. ArtCraft installs one (Vite 6's esbuild 0.25.12)
  but builds the app with Vite 5 and esbuild 0.21.5 (macOS 10.13), so the build skips only that
  install step (`install-steps.js`). nx, rollup, swc, rspack, unrs-resolver and fsevents are all
  built for 10.12 to 10.15.
- Tests: 42 script checks and 13 audit checks (some against the real 10.15 SDK), shellcheck and
  zizmor clean, all in CI.
- Test builds on GitHub's Intel Macs (`ci/README.md`), approved by the owner.
- **First test build passed** (23 Nov 2026, GitHub's Intel Mac, macOS 15, Node 20): ArtCraft
  `artcraft-v0.41.1` (commit `07ebde1`) built for Intel, asking for macOS 10.15 with every part's
  lowest macOS at 10.15, and the audit checked 428 system functions and classes against the
  10.15 SDK: nothing missing. About 67 minutes. It proves the build and that the app links to
  nothing Catalina lacks; only the Mac proves it runs. It also showed `check` calling every
  framework missing on macOS 11+ (they live in a shared cache there); fixed.
- **Two more test builds passed** (23 Nov 2026, same Mac), the first with `install-steps.js`:
  it skipped only Vite 6's esbuild 0.25.12 (8 install steps run, 1 skipped), the app built, and
  the audit again checked 428 system functions and classes: nothing missing. The fixed `check`
  reports no missing frameworks. Builds used: 5 of the 10 approved (3 passed, 1 cancelled,
  1 never started because the workflow file was invalid). Two of them started by accident when
  work was merged to main; merging to main no longer starts a build.
- **First run on the owner's Mac** (24 Nov 2026): `doctor` printed nothing. The Xcode tools were
  installed without the receipt `pkgutil` reads, and that lookup ended the script silently.
  Fixed, with a test; the script now also says so if any step ever stops it without a message.
- **First build on the owner's Mac** (24 Nov 2026), on an exFAT SSD through an APFS disk image,
  with Rust on the same image: it compiled up to BoringSSL (`boring-sys2`), which needs CMake.
  GitHub's Macs come with CMake, so the test builds never showed it. `doctor` and `build` now
  check for it, and the README says where to get a CMake that runs on 10.15 and how to build on
  an exFAT drive.

## Owner's approvals (23 Nov 2026, before sleep)

- Up to 10 test builds on GitHub's Intel Macs overnight.
- Small patches to ArtCraft's code or libraries where a build needs them: pinned to 0.41.1, each
  with its reason, in `patches/`; ArtCraft's repo itself is never touched.
- No paid agent tests.
- Merges: yes for the next 30, each double-checked first (full tests here and in CI). Given at
  bedtime, 23 Nov 2026.

## Needs the owner

| What                                                    | Why                                         |
|---------------------------------------------------------|---------------------------------------------|
| Run `doctor` on the Mac and send what it prints         | Shows what's installed and what's missing   |
| Run `build` when ready, and send the end of `build.log` | The first real proof, and the next patches  |
| Open the app (right-click › Open) and say what happens  | Only Catalina itself proves the app runs    |

## Watch for on the Mac

Things only Catalina itself can show:

- **The app's screens** run in Catalina's own WebKit (from Safari 15.6). The frontend is compiled
  for Safari 14 and up, so it should load; a feature newer than Safari 15 could still break one
  part.
- **The 3D splat viewer** (`@sparkjsdev/spark`) runs compiled WebAssembly code. If it needs a
  WebAssembly feature Safari 15 lacks, 3D worlds fail while the rest of the app works.
- **The older Xcode tools** Catalina allows (12.4) compile the app's C parts. The test builds use
  newer ones, so a compile error that shows up only on the Mac is possible.

## First run on the Mac

```bash
bash artcraft-catalina.sh doctor
```

```bash
ARTCRAFT_CATALINA_WORK=/Volumes/SSD/artcraft-catalina bash artcraft-catalina.sh build artcraft-v0.41.1
```

If it stops, the message says why. If the build itself fails, the end of
`/Volumes/SSD/artcraft-catalina/build.log` says where; send those lines.

## Baseline Rule checklist

Kept simple on purpose (owner's call); it may move to its own repo later.

- [ ] Data: `patches/manifest.tsv` is the data; no JSON Schema yet
- [x] CLI: `--help` (no command), `--json`, exit codes 0/1/2
- [x] CI: shellcheck, the tests and zizmor on every pull request; Intel Mac test builds by hand
- [ ] MCP: none yet
- [ ] Skill and agent docs: the README's "For tools and agents" section only
- [ ] Agent tests: none yet
