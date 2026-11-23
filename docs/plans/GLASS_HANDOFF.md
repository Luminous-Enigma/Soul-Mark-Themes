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

## Also planned: our own Catalina patcher for ArtCraft desktop

Not part of Glass, but the next session should know it. The owner has an Intel Mac on macOS 10.15
Catalina (10.15.7). The ArtCraft desktop app won't run there, so we will build our own patcher,
after studying the one below and ArtCraft desktop's real minimum macOS. Nothing has been built
yet. Plan it with the owner first, like a theme.

### What the owner found: `sudo-mk-sandwich/craft-catalina`

An unofficial patcher posted in ArtCraft's issue #2430 (macOS Catalina), by someone outside the
ArtCraft team: https://github.com/sudo-mk-sandwich/craft-catalina. Reviewed in an earlier session
at commit `af01d61` (18 Nov 2026); that was still its newest commit on 23 Nov 2026.

**It does not build ArtCraft desktop.** It builds 19 *other* apps from the same team's "Craft"
family: AniCraft, CADCraft, Craft Anything, DeckCraft, DesignCraft, EffectCraft, FigCraft,
FilmCraft, GridCraft, LightCraft, MailCraft, MaterialCraft, PdfCraft, PhotoCraft, SolidCraft,
SoundCraft, TextureCraft, VectorCraft and WordCraft. MailCraft and SolidCraft come from other
organizations (`UCS-Care-Group/mailcraft`, `tangency-labs/solidcraft`); SolidCraft's name may
not be redistributed.

**What it is:**

| Part                                    | What it does                                                           |
|-----------------------------------------|------------------------------------------------------------------------|
| `install.sh` (643 lines)                | Builds one app on the Mac from the latest stable tag, with the patches |
| `app/` (Rust, "Craftalina")             | A small window around `install.sh`; English and German                 |
| `patches/`                              | Per-app fixes (below)                                                  |
| `.github/workflows/catalina-builds.yml` | Builds one app on GitHub (proves it compiles, not that it runs)        |

**How it makes an app run on Catalina:**

1. Lowers the minimum from 11.0 to 10.15: `MACOSX_DEPLOYMENT_TARGET` in the app's
   `packaging/macos/package.sh` and `LSMinimumSystemVersion` in `Info.plist.in`, then checks the
   edit took (it stops if upstream changed those lines).
2. Builds Intel only (`x86_64-apple-darwin`); Apple silicon Macs don't need it.
3. Per-app patches for system functions Catalina doesn't have:
   - **PhotoCraft:** `CGPreflightScreenCaptureAccess` / `CGRequestScreenCaptureAccess` (macOS 11+)
     crashed the screen color picker; the patch reads `sw_vers` and skips the check below 10.16.
     (Big Sur reports 10.16 to apps built with an older SDK.) Catalina asks for the permission
     itself.
   - **Craft Anything:** a placeholder for the missing `AVFAudio` framework and a small C shim for
     `CGPreflightScreenCaptureAccess` (calls the real one if it exists, otherwise says "allowed").
     Experimental.
   - **AniCraft and SoundCraft:** a linker flag (`-Wl,-U,_AudioHardwareDestroyProcessTap`) so a
     macOS 14.2+ audio function is looked up only when used; system-audio recording doesn't work.
4. Ad-hoc signed, not notarized: the first open needs right-click › Open or "Open Anyway".

**The review's verdict:** careful work, no red flags in the code at `af01d61`.

- Good: never uses `sudo`; Rust comes from the official installer into the home folder; builds
  official tagged releases; deletes are guarded (`${WORK:?}`, app-name checks); patches are
  small and explained.
- The one real risk: **Craftalina downloads the author's newest `install.sh` and patches
  (`archive/HEAD.tar.gz`) at every start and runs them**, unpinned and unverified. Today's code is
  fine; future changes would run unchecked.
- The safer way, if the owner ever uses it: Terminal, pinned to the reviewed commit:
  `git clone https://github.com/sudo-mk-sandwich/craft-catalina.git`, then
  `cd craft-catalina && git checkout af01d61 && bash install.sh`. Review any newer commit first.
- Limits it states itself: needs Xcode command line tools, several GB free (it warns under 10 GB)
  and 30+ minutes per app; the apps' own auto-updates don't work; only "basic tests" (starts,
  opens, saves) were done; a newer-macOS function can still crash an app when used; the Craft apps
  draw with Metal, so they don't start in most virtual machines.

### ArtCraft desktop's minimum macOS (what we know)

- The desktop app is `storytold/artcraft`, a Tauri 2 app (`tauri` 2.11.2, `tao` 0.35.3, `wry`
  0.55.1), version 0.42.1, identifier `ai.artcraft.app`, config in
  `crates/desktop/artcraft/tauri.conf.json`.
- Issue #2430 says it needs macOS 11 or later. But its `tauri.conf.json` sets no
  `bundle.macOS.minimumSystemVersion`, and it has no `packaging/macos` folder like the Craft apps.
  Its macOS release (`.github/workflows/artcraft-macos-publish.yml`) is a **universal** build
  (`--target universal-apple-darwin`) on GitHub's newest macOS runner, signed with the team's
  Developer ID. So the 11.0 floor most likely comes from the build (the Apple silicon half starts
  at 11.0; the newest SDK and Xcode set the rest), not from a setting. **Unverified: measure it.**
- To measure: in a released `.app`, read `LSMinimumSystemVersion` from `Contents/Info.plist` and
  each slice's `minos` (`otool -l <binary> | grep -A4 LC_BUILD_VERSION`, or `vtool -show`).
- Then find what Catalina lacks: search the Rust code and dependencies for macOS 11+ APIs
  (`ScreenCaptureKit`, `CGPreflightScreenCaptureAccess`, `AVFAudio`, process taps, and so on), and
  try an Intel-only build with `bundle.macOS.minimumSystemVersion` "10.15" and
  `MACOSX_DEPLOYMENT_TARGET=10.15`. Tauri 2 itself supports 10.15. A full-code search through a
  partial clone was too slow from the cloud session; do it in a full clone.

### What ours should do (owner, earlier in this work)

- Build ArtCraft desktop from **ArtCraft's own source at a pinned version**, so we always know
  exactly what is running and can patch it. Never download and run an unpinned script.
- Keep what `craft-catalina` does well: no `sudo`, official toolchains, guarded deletes, checks
  that each edit took, and clear stops when upstream changes.
- Be honest about limits: a build for an old macOS can't bring back features that exist only in
  newer versions, and may hit bugs those versions don't have.
- Follow the Baseline Rule like everything else (data, CLI, CI, MCP, skill and agent docs).
- It probably belongs in its own repo; ask the owner for a name.

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
