# Soul Mark v2 core

The Soul Mark engine with no framework attached: give it a few colors (a background, an accent,
optionally a gradient), and it composes a whole theme in which every piece of text meets WCAG AA.

- `src/soul-mark.ts`: composes a theme from its seeds, solid or gradient, with the readability
  guard on or off.
- `src/contrast.ts`: contrast and color math.
- `src/meaning.ts`: fits status colors (errors, warnings, badges) to a theme without changing
  their hue. Their source colors are in `data/meaning-colors.json`.
- `src/presets.ts`: the ready-made colors, signature themes and signature gradients.

## Run the tests

```bash
npm ci
```

```bash
npm test
```

The full readability sweep takes about 10 minutes. CI runs all of it on every pull request.

## Where it is used

ArtCraft carries a copy of this engine under `frontend/apps/artcraft-webapp/src/theme/`, plus
its own adapter (settings screen and CSS variables). Changes are made here first, then copied.
`node scripts/compare-copy.mjs <path to that theme folder>` shows any difference between the two.

## Use it from a terminal

```bash
npm run build
```

```bash
node dist/cli.js check "Neon Deep"
```

```bash
node dist/cli.js compose "#0C2F1C" "#10B981" --color2 "#000000" --json
```

```bash
node dist/cli.js export examples/aurora.theme.json --format tokens
```

`node dist/cli.js --help` lists every command. Exit codes: 0 readable or done, 1 falls short,
2 bad input.

## Use it from an AI assistant

`node dist/mcp.js` is an MCP server (stdio) with five read-only tools: `list_signatures`,
`compose_theme`, `check_theme`, `export_theme` and `decode_theme_code`. `SKILL.md` teaches an
assistant to use them well. Nothing it does changes an app: people apply themes themselves.

## Theme files

A theme file is a few colors (its seeds), checked by [`schema/theme.schema.json`](schema/theme.schema.json).
Examples are in [`examples/`](examples/); every ready-made look is in
[`data/signatures.json`](data/signatures.json). Agent tests are in [`evals/`](evals/).
Building on it: [`AGENTS.md`](AGENTS.md). Changes: [`CHANGELOG.md`](CHANGELOG.md).
