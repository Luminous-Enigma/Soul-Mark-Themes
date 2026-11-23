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
- Tests: 35 script checks and 13 audit checks (some against the real 10.15 SDK), shellcheck and
  zizmor clean, all in CI.
- Test builds on GitHub's Intel Macs (`ci/README.md`), approved by the owner.

## Needs the owner

| What                                                    | Why                                         |
|---------------------------------------------------------|---------------------------------------------|
| Run `doctor` on the Mac and send what it prints         | Shows what's installed and what's missing   |
| Run `build` when ready, and send the end of `build.log` | The first real proof, and the next patches  |
| Open the app (right-click › Open) and say what happens  | Only Catalina itself proves the app runs    |

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
