# Status

Written 23 Nov 2026, overnight.

## Done

- The script, version 2: `doctor`, `tags`, `build` (with `--dry-run`), `scan`, `patches`,
  `check`; `--json`; exit codes 0, 1, 2; builds can go on an external drive and stop on exFAT.
- `patches/`: the place for fixes, each pinned to the releases it fits, checked before and after
  it's applied. Empty until a first build shows what's needed.
- Tests: 31 checks against stand-in Mac tools, all passing; shellcheck clean; both run in CI.

## Needs the owner

| What                                                    | Why                                            |
|---------------------------------------------------------|------------------------------------------------|
| Yes to reading ArtCraft desktop's public source here    | To find the macOS 11+ functions and patch them |
| Yes to a hand-started test build on GitHub's Intel Macs | To fix build errors without the owner's Mac    |
| Run `doctor` on the Mac and send what it prints         | Shows what's installed and what's missing      |
| Run `check` on the official app's `.dmg` (optional)     | Measures what ArtCraft really asks for         |
| Run `build` when ready, and send the end of `build.log` | The first real proof, and the next patches     |

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
- [x] CI: shellcheck and the tests on every pull request
- [ ] MCP: none yet
- [ ] Skill and agent docs: the README's "For tools and agents" section only
- [ ] Agent tests: none yet
