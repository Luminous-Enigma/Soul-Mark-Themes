# Notes for AI agents working on Soul Mark v2

This package is the Soul Mark engine plus its agent-ready surface. It follows
[Cornerstone](https://github.com/Luminous-Enigma/Cornerstone): data files with a schema, a CLI,
CI checks, an MCP server, a skill and agent tests.

## Layout

| Path                   | What it is                                                                  |
|------------------------|-----------------------------------------------------------------------------|
| `src/soul-mark.ts`     | The engine: composes a theme from its seeds, with the readability guard     |
| `src/contrast.ts`      | Contrast and color math                                                     |
| `src/meaning.ts`       | Status colors, fitted without changing hue                                  |
| `src/presets.ts`       | Every ready-made color, signature theme and signature gradient (the source) |
| `src/tools.ts`         | Shared by the CLI and MCP: theme files, check, export, signature lookup     |
| `src/cli.ts`           | The `soul-mark` command                                                     |
| `src/mcp.ts`           | The MCP server; every tool is effect READ                                   |
| `schema/`              | JSON Schemas: theme file, readability report, composed theme                |
| `data/signatures.json` | Generated from `presets.ts` by `npm run data`; never edit by hand           |
| `examples/`            | Example theme files, checked against the schema in the tests                |
| `evals/`               | Agent tests: tasks and graders written in code                              |
| `SKILL.md`             | Teaches an AI agent to use this well                                        |

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
- Bump the version in `package.json`, `src/cli.ts` and `src/mcp.ts` together, and add a line to
  `CHANGELOG.md`.
