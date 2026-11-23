# Handoff: Soul Mark: Glass

For the Claude session that builds Soul Mark: Glass. Read this first, then `CLAUDE.md`,
`docs/ROADMAP.md` and `soul-mark/v2/AGENTS.md`. Everything learned from Soul Mark: Solid Tones,
Gradients and Neon is here, so Glass starts where Neon finished.

Written 23 Nov 2026, after Neon was approved and merged.

## Where things stand

| Theme                      | State                                                                    |
|----------------------------|--------------------------------------------------------------------------|
| Soul Mark: Solid Tones, v1 | Waiting on ArtCraft to merge part 2 (see below)                          |
| Soul Mark: Solid Tones, v2 | Agent-ready, in `soul-mark/v2`                                           |
| Soul Mark: Gradients       | Agent-ready; in ArtCraft preview                                         |
| Soul Mark: Neon            | Agent-ready; in ArtCraft preview; approved and merged 22 Nov 2026        |
| Soul Mark: Glass           | **Next. Not started.**                                                   |

- v1: part 1 (storytold/artcraft-services#166, colors as variables) merged on 11 Nov 2026. Part 2,
  the theme itself, isn't merged yet, so `soul-mark/v1/` doesn't exist yet.
- Engine and tests: `soul-mark/v2/src` (`soul-mark.ts`, `neon.ts` and their presets and specs).
- ArtCraft preview: the fork `Luminous-Enigma/artcraft-services`, branch `soul-mark-gradients`
  (Neon was merged into it through the fork's PR #2). The theme lives in
  `frontend/apps/artcraft-webapp/src/theme/`; the picker in
  `components/settings-modal/AppearanceSection.tsx`; the CSS in `styles.css`.
- Screenshot tools: the fork's `theme-evidence` branch, `tools/*.mjs` (see "Pictures" below).
- Agent tests: all three AIs tried (Claude Opus 5.5, DeepSeek V4 Pro, DeepSeek Flash) pass 12 of
  12 and catch 12 of 12 broken variants (round 4, `soul-mark/v2/evals/results/`).

## What Glass is (the roadmap's words)

> Frosted, see-through backgrounds, windows and menus over a background, with clear text.

Nothing else has been decided. **The owner decides the look; never pick it silently.** Ask before
building, with pictures where you can:

1. **What's behind the glass?** A Gradients fade, a Neon page, a photo or picture the person
   picks, or several of these. (A picture is the hardest for readability; see below.)
2. **Dark glass, light glass, or both?**
3. **Which surfaces are glass:** the side menu, panels, dialogs, menus, the top bar?
4. **How frosted:** the blur and how see-through, and whether the person can change them.
5. **The lead look's name** and the signature looks (the owner named Neon's lead "Blueprint").
6. **Switches**, if any, like Neon's two (glowing text, grid on menus).
7. **The story** for the About section, in plain words, as Neon got "the futuristic digital
   craftsman".

## How each theme was built (do it in this order)

1. **Plan, with the owner's answers.** Put the Baseline Rule checklist in the plan and in every
   pull request.
2. **Engine first, here**, in `soul-mark/v2/src`: `glass.ts`, `glass-presets.ts`, `glass.spec.ts`,
   built on `composeSoulMark` without changing it (Neon does the same on top of Solid Tones and
   Gradients). A new code prefix (SM4) with `encode`/`decode` and round-trip tests.
3. **Readability sweep:** every ready-made combination, measured in the spec by its own code,
   not by trusting what the engine reports. Neon's sweep is 2,352 combinations plus 56 with both
   switches on. Expect the full test run to take about 10 minutes.
4. **Signature looks** built only from the ready-made rows, so anyone can make them by hand. A
   test proves the guard changes nothing on them, including the base theme's page and fade
   (Neon's Blueprint top moved once, #1C3D6E, and had to become #162F56).
5. **Agent-ready** (the Baseline Rule): theme files and JSON Schemas, the CLI flags, the MCP tools
   taking Glass, `SKILL.md`, `AGENTS.md`, `examples/`, `npm run data` for `signatures.json`,
   `CHANGELOG.md`, the README and roadmap.
6. **ArtCraft adapter** on a new fork branch off `soul-mark-gradients` (Neon's was
   `soul-mark-neon`): copy the engine files, add them to `scripts/compare-copy.mjs`'s FILES, a fifth
   card in Settings › Appearance, `data-*` attributes from `theme-store.ts`, CSS in `styles.css`.
7. **Pictures** of every signature look and a review page for the owner, then corrections.
8. **Ship** only when the owner says so, then the README previews (eight per theme).

## The readability promise, and what it means for glass

- All text ≥ 4.5:1 (`AA`), faded captions down to `MIN_TEXT_FADE` (0.4); outlines, icons and
  glows ≥ 3:1 (`NON_TEXT`). Constants are in `soul-mark.ts`.
- The guard moves colors only in lightness, keeping the hue, and turns effects down before it
  lets text fade. With the guard off, everything is used as picked and every shortfall is said.
- **Glass is a see-through fill over something you don't fully control.** Measure the text
  against the glass over the *lightest and darkest* thing that can be behind it, not the
  average. Blur mixes colors but doesn't promise anything about the worst spot. The helpers are
  there: `contrastOfOverlay`, `overlayContrast` and `mix` in `contrast.ts`; Gradients already
  measures every point of a gradient (`tokensAcrossGradient`), and Neon measures text beside its
  bloom and grid (`glowMeasurements`).
- Over a gradient or a Neon page, the backdrop is known, so the minimum opacity of the glass can
  be worked out exactly. Over a person's own picture it can't be known ahead of time: plan for
  the worst case (any color) or measure the picture when it is picked, and ask the owner which.
- Browsers without `backdrop-filter`, and people who ask for less transparency
  (`prefers-reduced-transparency`), get the same glass color solid. It must still pass.
- Never weaken a test to make it pass. Readability is the promise.

## Lessons from Neon (carry them over)

- **Stay out of the way of work.** Neon's grid is off in editors that have a grid of their own,
  dimmed in the others, and gone behind any window that draws its own (`workspace.ts` sets
  `data-workspace` to `off` or `dim` per route). Blur over 3D, video and image canvases is also
  heavy for the computer: decide with the owner where glass stays solid.
- **Menus and pickers count.** The owner asked that a switch's effect reach menus, submenus, the
  theme picker and every item in it. Check them all, in screenshots.
- **Filled buttons keep readable labels.** Neon hands apps a base label color
  (`--st-neon-label-rgb`) and keeps the halo off filled buttons.
- **The picker shows no duplicates** across rows (Neon filters its pages and fades).
- **ArtCraft's shared libraries are prebuilt.** Edits to `frontend/libs/*/src` don't reach the
  web app's build. Style them from the web app's `styles.css` with selectors instead.
- **`background-attachment: fixed`** keeps a page effect continuous from the page into panels.
- **Two switches on at once:** decide what wins and say it (on Blueprint, the menu grid wins and
  the text stays plain).

## Pictures

- Production build of the web app, served locally, with stand-in server answers: a signed-in
  test user with 2,500 credits and an empty library. No real account, ever.
- 1440×900 shots; fonts fixed; animation off. Scripts on the fork's `theme-evidence` branch:
  `tools/neon-shots.mjs` (each look on home, create image, library, pricing, the picker, phone
  sizes), `switch-shots.mjs`, `menugrid-shots.mjs`, `neon-probe-editors.mjs` (the editors). Copy
  and adapt them for Glass.
- README pictures go in `visual-previews/` as `<theme>-<look>.webp`, eight per theme, with one
  plain sentence each.
- Give the owner a review page with the pictures before shipping. The owner looks on a phone
  while out and on a laptop at home, so it must read well on both.

## Agent tests (paid)

- `npm run eval` runs the tasks against a real AI, always with `--max-usd`. **Only with the
  owner's approval of a budget.** The keys are GitHub repo secrets (`ANTHROPIC_API_KEY`,
  `DEEPSEEK_API_KEY`); the manual workflow `eval.yml` uses them. Never ask the owner to paste a
  key into chat.
- Rounds 1 to 4 cost $6.47 in all.
- The workflow runs one at a time (a concurrency group keeps only one pending run): start the next
  only after the previous one has begun. Reports are read back from the run log's `REPORT_JSON` line.
- Lessons: broken variants must really be broken (hide a tool or make the checker lie), since real
  AIs answer the gentler ones correctly. Graders must allow right answers worded differently, and
  must not count negated ("nothing falls short") or quoted ("the note claims…") wording. Grade
  everything the AI wrote, not only its last message. Add each real answer that fooled a grader
  to `test/graders.test.ts`.
- Glass should get a task of its own if it adds a tool or a new way to be wrong.

## Working with the owner

- Plain words, American English. The owner often reads on a phone: short messages, short
  commands, no `#` comments in commands to paste. Tables space-padded.
- Status reports are short and accurate: what's done, what's not, what needs the owner.
- When coming back from a pause that needs approval, give a short "done before the pause / needs
  approval now", not the whole plan again.
- The safety rule: a person approves anything that changes, spends, sends or deletes. Merging
  waits for "ship it".
- Never name the owner's other private projects, or real people or brands, in this public repo or
  in ArtCraft. Tell the story in plain words.
- **No session links.** Commit messages and pull request descriptions carry no
  `claude.ai/code/session` link and no `Claude-Session:` line, even though Claude Code adds them
  by default. The owner had them all redacted.
- Report honestly: say what was measured and what wasn't; never invent data.

## Tooling notes for this environment

- GitHub GraphQL is blocked; `gh pr view` fails. Use `gh api repos/<owner>/<repo>/...` (REST).
  Draft → ready: `POST .../pulls/<n>/ccr/ready_for_review`.
- Use the repos' current names: `Luminous-Enigma/Soul-Mark-Themes`, `Luminous-Enigma/Cornerstone`
  (once `agent-ready-standard`). Old names redirect through numeric IDs, which the proxy refuses.
- Editing releases and pushing tags are refused here. Push many branches one at a time; a single
  push of dozens of branches was refused.
- `bash scripts/public-gates.sh` locally reports GP3 (gitleaks not installed) and GP8 (zizmor
  can't reach GitHub) as failures; CI runs both and is the real check.
- On the ArtCraft fork, the "Wait for Cloudflare deploy" check always fails (forks can't deploy).
  Explain it once in the pull request; don't chase it.
- After changing dependencies in `soul-mark/v2`, rebuild the lock file as `AGENTS.md` says.

## Baseline Rule checklist for Glass

- [ ] Data: theme files, JSON Schema, `signatures.json`, examples
- [ ] CLI: Glass flags, `--help`, `--json`, exit codes
- [ ] CI: sweep and tests on every pull request
- [ ] MCP: the tools take Glass; annotations stay read-only
- [ ] Skill and agent docs: `SKILL.md`, `AGENTS.md`
- [ ] Agent tests: still pass; a Glass task if needed (paid runs only with approval)
