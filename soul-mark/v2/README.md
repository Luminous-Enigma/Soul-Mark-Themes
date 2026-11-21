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

The full readability sweep takes about 13 minutes. CI runs all of it on every pull request.

## Where it is used

ArtCraft carries a copy of this engine under `frontend/apps/artcraft-webapp/src/theme/`, plus
its own adapter (settings screen and CSS variables). Changes are made here first, then copied.
`node scripts/compare-copy.mjs <path to that theme folder>` shows any difference between the two.

Coming next, per [the roadmap](../../docs/ROADMAP.md): theme files with a schema, a command line
tool, an MCP server, a skill and agent tests.
