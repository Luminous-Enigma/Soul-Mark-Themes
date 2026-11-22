# Changelog

Soul Mark v2's core. Versions follow semantic versioning (breaking.feature.fix).

## Unreleased

- The agent test runner: `npm run eval` runs the agent tests against a real AI (Claude or
  DeepSeek) through the MCP server, with each task's broken variant and a dollar cap. A
  manual-only GitHub workflow runs it too.
- First paid round (Claude Opus 5.5, DeepSeek V4 Pro and Flash), in `evals/results/`. Broken
  variants are now really broken (a missing tool, or a checker that lies), since real AIs
  answered the gentler ones correctly. Summaries quote the answers of runs that went wrong.
- Round 2 results. The must-catch grader also accepts "don't ship" and "fails WCAG AA" (real
  right answers it missed) and fails any answer that calls the theme fine to ship. Calls to a
  hidden tool are refused and never count; must-not-be-fooled's broken variant hides every tool
  that can measure a theme.
- Round 3 results. The graders ignore a negated shortfall ("nothing falls short") and a quoted
  claim ("the note claims the theme is readable"), and the runner keeps everything the AI wrote,
  not only its last message.

## 2.0.0-alpha.2

- New looks: signature theme Black and Blue; signature gradients Black to charcoal and
  White to silver; Black in the Deep backgrounds; Charcoal and Silver as quick fades.

- Agent-ready: a JSON Schema for theme files, readability reports and composed themes;
  `data/signatures.json`; example theme files.
- The `soul-mark` command: compose, check, export (CSS, JSON, W3C design tokens, Tailwind),
  list, encode, decode. `--json` everywhere; exit codes 0, 1, 2.
- An MCP server with five read-only tools: list_signatures, compose_theme, check_theme,
  export_theme, decode_theme_code.
- `SKILL.md`, `AGENTS.md`, and agent tests (can do, must refuse or ask, must not be fooled,
  must catch), graded by code.
- Signature gradients Nebula, Ember and Twilight; Gradients as its own theme.

## 2.0.0-alpha.1

- The engine as its own package, gradients included, with the full readability sweep in CI.
