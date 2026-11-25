# Notes for AI agents working on Soul Mark v2

This package is the Soul Mark engine plus its agent-ready surface. It follows
[Cornerstone](https://github.com/Luminous-Enigma/Cornerstone): data files with a schema, a CLI,
CI checks, an MCP server, a skill and agent tests.

## Layout

| Path                   | What it is                                                                    |
|------------------------|-------------------------------------------------------------------------------|
| `src/soul-mark.ts`     | The engine: composes a theme from its seeds, with the readability guard       |
| `src/contrast.ts`      | Contrast and color math                                                       |
| `src/meaning.ts`       | Status colors, fitted without changing hue                                    |
| `src/presets.ts`       | Every ready-made color, signature theme and signature gradient (the source)   |
| `src/neon.ts`          | Soul Mark: Neon: the glow, bloom and grid, checked; built on the engine       |
| `src/neon-presets.ts`  | Neon's glows, near-black pages, fades and signature looks                     |
| `src/glass.ts`         | Soul Mark: Glass: see-through layers, frost and smoke, checked; on the engine |
| `src/glass-presets.ts` | Glass's pictures, fades and signature looks                                   |
| `src/craft.ts`         | Solid Tones as a theme file for ArtCraft's Crafting Apps (`--format craft`)   |
| `src/tools.ts`         | Shared by the CLI and MCP: theme files, check, export, signature lookup       |
| `src/cli.ts`           | The `soul-mark` command                                                       |
| `src/mcp.ts`           | The MCP server; every tool is effect READ                                     |
| `schema/`              | JSON Schemas: theme file, readability report, composed theme                  |
| `data/signatures.json` | Generated from `presets.ts` by `npm run data`; never edit by hand             |
| `examples/`            | Example theme files, checked against the schema in the tests                  |
| `evals/`               | Agent tests: tasks, graders, and the paid runner (`npm run eval`)             |
| `SKILL.md`             | Teaches an AI agent to use this well                                          |

## Build and test

```bash
npm ci
```

```bash
npm run typecheck
```

```bash
npm test
```

`npm test` builds `dist/` first, then runs everything, including the full readability sweep
(about 10 minutes).

## Rules

- The engine files (`contrast.ts`, `meaning.ts`, `soul-mark.ts`, `presets.ts`, `soul-mark.spec.ts`)
  are copied into ArtCraft. Change them here first; `scripts/compare-copy.mjs` shows drift.
- After changing `presets.ts`, run `npm run data` and commit `data/signatures.json`.
- A new MCP tool needs an entry in `test/mcp.test.ts`'s EXPECTED, with annotations that match
  its effect. Tools that change, spend, send or delete need a person's confirmation in the app.
- Never weaken a test to make it pass. Readability is the promise.
- `npm run eval` calls a paid AI. Run it only with the owner's approval of a budget, always with
  `--max-usd`, and commit the report it writes to `evals/results/`.
- After changing dependencies, rebuild the lock file from scratch with npm 11
  (`rm -rf node_modules package-lock.json && npx npm@11.6.2 install`), then confirm
  `npm ci` works with Node 22's own npm 10, which CI uses. npm 10 itself fails to resolve
  vitest 4's peer packages, and an in-place npm 11 update can leave a lock npm 10 rejects.
- Bump the version in `package.json`, `src/cli.ts` and `src/mcp.ts` together, and add a line to
  `CHANGELOG.md`.
