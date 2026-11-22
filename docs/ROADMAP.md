# Roadmap

Order, as decided by the owner: Soul Mark: Solid Tones (v1, then v2), Soul Mark: Gradients,
Soul Mark: Neon, Soul Mark: Glass, Soul Mark: High Contrast, then Soul Mark: Patterns last.

Every theme is named "Soul Mark: <name>" wherever people see it.

Every theme uses the same layout people already know from Soul Mark:

1. **Signature themes** at the top: ready-made looks, one tap.
2. **"Mark it with your own taste"**: build your own from the theme's controls.
3. **About** at the bottom: a few words on why it exists.

Every theme keeps the readability promise: all text meets WCAG AA, checked by tests over every
ready-made combination.

## 1. Soul Mark: Solid Tones, v1 (frozen)

- Exactly the version merged into ArtCraft, copied once it is merged, with the ArtCraft commit it
  came from written in `soul-mark/v1/SOURCE.md`.
- Never edited afterwards. Fixes and features go into v2.

## 2. Soul Mark: Solid Tones, v2 (agent-ready)

The same theme, built to the Baseline Rule. **This repo is where v2 is made.** ArtCraft gets a
copy of the engine plus its own adapter (settings screen, CSS variables), sent once ArtCraft has
merged v1. A preview branch on the ArtCraft fork runs the same copy, so the theme can be seen and
screenshotted in the real app; `soul-mark/v2/scripts/compare-copy.mjs` fails if the copy drifts.

- [x] **Core:** the color engine and readability guard as a framework-free TypeScript package
      (`soul-mark/v2`), with gradients, tests and CI.
- [x] **Data:** theme files with a JSON Schema (`schema/`), examples, every signature and palette
      in `data/signatures.json`, status colors in `data/meaning-colors.json`. Export to the W3C
      Design Tokens format with `soul-mark export --format tokens`.
- [x] **CLI:** `soul-mark` with `compose`, `check`, `export` (CSS, JSON, design tokens, Tailwind),
      `list`, `encode`/`decode`; `--help`, `--json`, exit codes 0/1/2.
- [x] **CI:** typecheck, build, the CLI/MCP/schema/grader tests and the full readability sweep on
      every pull request, plus Cornerstone's gates and OpenSSF Scorecard.
- [x] **MCP:** five read-only tools (`list_signatures`, `compose_theme`, `check_theme`,
      `export_theme`, `decode_theme_code`) with output schemas and true annotations.
- [x] **Skill and agent docs:** `soul-mark/v2/SKILL.md` and `AGENTS.md`.
- [x] **Agent tests:** four tasks (can do, must refuse or ask, must not be fooled, must catch),
      graded by code. The runner (`npm run eval`) runs them against Claude or DeepSeek within a
      dollar cap; the first paid runs are under way, with results in `soul-mark/v2/evals/results/`.
- [ ] **Adapters:** web (CSS variables) and Tailwind are done through `export`; Android/Compose
      (from VidScripter's port) is still to come.

## 3. Soul Mark: Gradients

**Its own theme, beside Soul Mark: Solid Tones** (the owner's call: one picker for both was too
crowded). Settings › Appearance offers three cards: ArtCraft, Soul Mark: Solid Tones and
Soul Mark: Gradients. Each
keeps its own colors, so switching between them loses nothing. Both use the v2 engine; a theme
code says which one it belongs to (SM1 solid, SM2 gradient). Gradients starts from Neon Deep.

- Color 1 (the background), color 2 and an optional color 3. Color 2 never repeats color 1.
- Quick fades for colors 2 and 3 (black, white, gray, midnight), then the full palette.
- Top to bottom by default; an elliptical glow from the top as the other shape.
- The page, panels, dialogs and the side menu each carry the gradient; controls stay solid.
- The guard checks text on every color and on the blends between them.
- Signature gradients first, led by Neon Deep.

## 4. Soul Mark: Neon

A heads-up display in the style of the Watchers app: near-black glass, glowing cyan, green or amber lines, soft glow on borders
and buttons, a faint grid. Glow sits around text and never replaces its contrast.

## 5. Soul Mark: Glass

Frosted, see-through backgrounds, windows and menus over a background, with clear text.

## 6. Soul Mark: High Contrast

Strong, clear color for people who need it and people who like it.

## 7. Soul Mark: Patterns

Textures and patterns behind the interface. Last, because keeping text readable over a pattern is
the hardest problem here.

## Also on the list

- Custom-idea themes.
