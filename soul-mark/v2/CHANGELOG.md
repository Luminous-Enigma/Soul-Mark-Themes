# Changelog

Soul Mark v2's core. Versions follow semantic versioning (breaking.feature.fix).

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
