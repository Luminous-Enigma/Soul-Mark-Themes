# Plan: Soul Mark: Glass

The owner's answers, 23 Nov 2026. Read with `GLASS_HANDOFF.md`.

## What Glass is

True, pure glass: the app's windows, panels and menus are glass, and you see what is behind them.

- **Web app:** a picture sits behind the glass. A starter set comes with the theme; anyone can
  upload their own instead.
- **Desktop app:** truly see-through to the desktop behind the window, or an uploaded picture.
  **Planned only; no code yet.** It waits on the ArtCraft desktop app running on the owner's Mac
  (see `catalina-patcher/`). macOS has drawn frosted, see-through windows since 10.10.
- **The story** (About): for people who want to explore how far the design and work limits of the
  app, their workspace and their own experience can go. Purely for fun, and because it's cool.

## Decisions

| Topic         | Decision                                                                          |
|---------------|-----------------------------------------------------------------------------------|
| Lead look     | **Quartz**                                                                        |
| What's glass  | Everything, to start: side menu, top bar, panels, dialogs, menus. Pictures decide |
| Frost         | A switch and a bar, 0 to 100. On by default, at 30                                |
| Darkened      | A switch and a bar: smoky, tinted glass, like transition lenses, but you choose   |
| Glass kinds   | Light (clear) glass and dark (charcoal) glass                                     |
| Fit           | Any picture, any size or shape, fills the window without stretching               |

## Decided from the prototype (23 Nov 2026)

Pictures: the review page from the fork's `tools/glass-proto` (Luminous-Enigma/artcraft-services#3).

| Topic          | Decision                                                                    |
|----------------|-----------------------------------------------------------------------------|
| Home           | One layer of glass over the picture, as in the prototype; unchanged         |
| Menu (frosted) | Its own fill at **9%** on light and dark glass, over the page glass         |
| Workspaces     | Every tool's surfaces matched to the menu (bottom layer at the page fill,   |
|                | stacked layers at 9%, glass over work at the menu's total coverage)         |
| Stays solid    | Pictures, video, colored buttons, and fills in the opposite color (dark     |
|                | buttons on light glass, black video frames): thinning them broke their text |
| 3D             | The scene's background is see-through; grid and camera lines at full        |
|                | strength with a thin outline; a choice of **light or dark lines**           |
| Fades          | The five three-color Gradients fades become Glass backgrounds, unlabeled    |
| Transparency   | Its own setting: the menu's own fill, default 9%; every surface follows it  |
| Frost link     | A setting, on by default (9% and Frost 30): linked, Transparency applies    |
|                | only while frosted; unlinked, Transparency and Frost are set apart          |

Picked by Claude with the owner's go-ahead (23 Nov 2026), easy to change later: Quartz uses the
Quartz picture; Darkened on light glass turns its text light near 80; dark 3D lines are offered on
light glass only; all five three-color fades become signature looks. The engine may be built
overnight; no paid agent tests.

Measured on every prototype picture: worst body text 4.51:1, nothing below AA. Still open:
measuring each picture when it's picked, so the bottom layer can be thinner over dark pictures.

## How it works

- **Frost** is the blur only (0 = clear glass, 100 = fully frosted). It never decides readability.
- **Darkened** mixes a charcoal smoke into the glass (0 = none, 100 = darkest).
- **The fill** (how much glass color covers the picture) is set by the readability guard: the
  least fill that keeps every text at AA. Frost and Darkened can make the glass thicker, never
  thinner than that.
- **Fit:** the picture covers the window (`object-fit: cover` style), centered, fixed while
  scrolling. Large uploads are scaled down to the screen's size so they stay light; small ones
  are scaled up and softened so they don't look blocky.

## Readability (the promise)

Text is measured against the glass over the **lightest and darkest spot** of what is behind,
never the average. Blur gives no promise at the worst spot, so frost doesn't count.

| Behind the glass   | How the glass fill is set                                               |
|--------------------|-------------------------------------------------------------------------|
| A starter picture  | Measured ahead of time, in the tests, at every spot                     |
| An uploaded one    | Measured when it's picked; the glass is set from that picture           |
| The desktop        | Unknown and changing: worst case, any color (light 55%, dark 70% fill)  |

With the guard off, glass can be fully clear; every shortfall is reported. Browsers without
`backdrop-filter`, and people who ask for less transparency, get the same glass color solid.

## Order of work

1. **Prototype first** (fork branch off `soul-mark-gradients`): glass CSS only, to look at.
2. **Workspace pictures with stand-in work loaded:** home, create image, library, image editor,
   video editor, 3D, moodboard, background change, frame extractor, media. Frost at 0, 20, 40,
   60, 80, 100; light and dark glass; Darkened off and on. No real account.
3. **Owner review** on a phone-friendly page: decide where glass stays and where it turns solid.
4. **Engine** in `soul-mark/v2/src`: `glass.ts`, `glass-presets.ts`, `glass.spec.ts` on top of
   `composeSoulMark`; code prefix SM4 with `encode`/`decode`; the readability sweep.
5. **Signature looks** (Quartz first), agent-ready files, the ArtCraft adapter, pictures, ship
   on "ship it".

## Baseline Rule checklist for Glass

- [ ] Data: theme files, JSON Schema, `signatures.json`, examples, the starter pictures
- [ ] CLI: Glass flags (frost, darkened, glass kind), `--help`, `--json`, exit codes
- [ ] CI: sweep and tests on every pull request
- [ ] MCP: the tools take Glass; annotations stay read-only
- [ ] Skill and agent docs: `SKILL.md`, `AGENTS.md`
- [ ] Agent tests: still pass; a Glass task if needed (paid runs only with approval)
