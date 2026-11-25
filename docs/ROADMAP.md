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

For the futuristic digital craftsman. The grid comes from the people who build things: architects'
blueprints, engineers' drafting tables, the floor of a 3D workspace. The neon comes from cyberpunk
and a sci-fi engineer's holographic workshop. Near-black glass, glowing cyan, green or amber lines,
a soft glow on borders and buttons, a faint grid. Glow sits around text and never replaces its
contrast. The grid stays out of the way of people's work: off in editors with grids of their own,
dimmed in the others, and gone behind any window that draws its own.

- [x] **Engine** (`soul-mark/v2/src/neon.ts`), on top of Solid Tones and Gradients, which it never
      changes: a near-black page (or a top-to-bottom fade), a glow color, its strength, and a grid.
- [x] **Readability:** the glow must stand out from the page and panels (3:1); text is measured
      beside the glow's bloom and on a grid line. The guard moves the glow only in shade and turns
      the bloom and grid down; with it off, what falls short is said. 2,352 combinations tested.
- [x] **Signature looks** from classic heads-up display colors, led by Blueprint; SM3 theme codes.
- [x] **Agent-ready:** theme files, the CLI (`--glow`, `--strength`, `--grid`), the MCP tools and
      the schemas all take Neon.
- [x] **Switches (Neon only):** glowing text and the grid on menus, measured like everything else.
- [x] **In ArtCraft:** a fourth card, the glow on panels and buttons, the grid, and the two
      switches, on the fork's preview branch; approved by the owner on 22 Nov 2026.

## 5. Soul Mark: Glass

Frosted, see-through backgrounds, windows and menus over a background, with clear text.

## 6. Soul Mark: High Contrast

Strong, clear color for people who need it and people who like it.

## 7. Soul Mark: Patterns

Textures and patterns behind the interface. Last, because keeping text readable over a pattern is
the hardest problem here.

## Soul Mark in every Crafting App

The owner's goal (24 Nov 2026): ship Soul Mark Themes to all 17 of ArtCraft's Crafting Apps, to
help bring back the freedom to customize the look of your own software applications. Started
25 Nov 2026, at the owner's word.

- The apps: PhotoCraft, VectorCraft, FilmCraft, LightCraft, PdfCraft, EffectCraft, AniCraft,
  DesignCraft, FigCraft, TextureCraft, MaterialCraft, SoundCraft, WordCraft, DeckCraft, CADCraft,
  GridCraft and Craft Anything. Native Rust apps, each in its own `storytold/<name>` repo.
- **What we found (read from their public source, 25 Nov 2026):** all 17 are built on one shared
  framework, `storytold/craft-libs` (on egui). It has a suite theme system (`crates/theme`,
  `docs/suite-themes.md`): a theme is a `craft-design-theme` JSON file of seeds and pinned colors,
  every app reads one shared folder (on a Mac, `~/Library/Application Support/ArtCraft/themes/`),
  and one choice restyles every app. It checks WCAG contrast too. It landed about 23 Nov 2026:
  PhotoCraft, VectorCraft, PdfCraft and WordCraft use it now; the other 13 get it as they move to a
  newer framework.
- [x] **Solid Tones as suite themes:** `soul-mark export <theme> --format craft` (and the MCP
  tool) writes one. It pins Soul Mark's own colors and leaves the rest to the suite, and every
  pinned pair meets the suite's own contrast rules, so the suite resolves it with no warnings.
  Buttons keep Soul Mark's exact accent and label (`accent.strong`); check marks get the nearest
  shade that reaches 3:1 (`accent.solid`). Tested on every signature and on every ready-made
  background with every ready-made accent (1,645 themes).
- [ ] **Try it on the owner's Mac:** install a Crafting App that has the suite system (PhotoCraft),
  put a Soul Mark file in the themes folder's `library/`, and pick it.
- [ ] **High Contrast:** the suite has a high-contrast slot in every theme; Soul Mark: High
  Contrast fills it.
- [ ] **Gradients, Neon's glow and Glass** need what the suite doesn't have yet: gradient
  surfaces, glow and see-through layers (its surfaces must be opaque). That means proposing
  framework features to `craft-libs`: a written plan first, sent only with the owner's say.
- Nothing changes in those repos without the owner's say.

## Also on the list

- Custom-idea themes.
