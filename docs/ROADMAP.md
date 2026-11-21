# Roadmap

Order, as decided by the owner: Soul Mark v1, Soul Mark v2, Gradients, Neon, Glass, then the
rest, with Patterns last.

Every theme uses the same layout people already know from Soul Mark:

1. **Signature themes** at the top: ready-made looks, one tap.
2. **"Mark it with your own taste"**: build your own from the theme's controls.
3. **About** at the bottom: a few words on why it exists.

Every theme keeps the readability promise: all text meets WCAG AA, checked by tests over every
ready-made combination.

## 1. Soul Mark v1 (frozen)

- Exactly the version merged into ArtCraft, copied once it is merged, with the ArtCraft commit it
  came from written in `soul-mark/v1/SOURCE.md`.
- Never edited afterwards. Fixes and features go into v2.

## 2. Soul Mark v2 (agent-ready)

The same theme, built to the Baseline Rule. **This repo is where v2 is made.** ArtCraft gets a
copy of the engine plus its own adapter (settings screen, CSS variables), sent once ArtCraft has
merged v1. A preview branch on the ArtCraft fork runs the same copy, so the theme can be seen and
screenshotted in the real app; `soul-mark/v2/scripts/compare-copy.mjs` fails if the copy drifts.

- [x] **Core:** the color engine and readability guard as a framework-free TypeScript package
      (`soul-mark/v2`), with gradients, tests and CI.
- [ ] **Data:** every theme and preset as a JSON file following the W3C Design Tokens format, with
      a schema. (Started: status colors in `data/meaning-colors.json`.)
- [ ] **CLI:** `compose`, `check`, `export` (CSS variables, JSON, Tailwind, Android), `list`,
      `encode`/`decode` theme codes; `--help`, `--json`, exit codes.
- [ ] **CI:** tests and the readability sweep on every pull request.
- [ ] **MCP:** the same actions as tools for AI assistants.
- [ ] **Skill:** `SKILL.md` on designing a good theme with the engine.
- [ ] **Adapters:** web (CSS variables), Tailwind, Android/Compose (from VidScripter's port).

## 3. Gradients

**Its own theme, beside Soul Mark** (the owner's call: one picker for both was too crowded).
Settings › Appearance offers three cards: ArtCraft, Soul Mark (solid colors) and Gradients. Each
keeps its own colors, so switching between them loses nothing. Both use the v2 engine; a theme
code says which one it belongs to (SM1 solid, SM2 gradient). Gradients starts from Neon Deep.

- Color 1 (the background), color 2 and an optional color 3. Color 2 never repeats color 1.
- Quick fades for colors 2 and 3 (black, white, gray, midnight), then the full palette.
- Top to bottom by default; an elliptical glow from the top as the other shape.
- The page, panels, dialogs and the side menu each carry the gradient; controls stay solid.
- The guard checks text on every color and on the blends between them.
- Signature gradients first, led by Neon Deep.

## 4. Neon

A heads-up display: near-black glass, glowing cyan, green or amber lines, soft glow on borders
and buttons, a faint grid. Glow sits around text and never replaces its contrast.

## 5. Glass

See-through, frosted panels over a background, with clear text.

## 6. High contrast

Strong, clear color for people who need it and people who like it.

## 7. Patterns

Textures and patterns behind the interface. Last, because keeping text readable over a pattern is
the hardest problem here.

## Also on the list

- Custom-idea themes.
