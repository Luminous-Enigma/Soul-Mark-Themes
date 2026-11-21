# Notes for Claude sessions

Soul Mark Themes: free, open themes for any app. Owner: Luminous Enigma.

## Foundation
This repo follows Cornerstone: https://github.com/Luminous-Enigma/Cornerstone
- Baseline Rule (docs/BASELINE_RULE.md): data files, CLI, CI, MCP, and a skill plus agent docs.
  Every theme ships with all of them, plus agent tests (can do, must refuse or ask, must not be
  fooled, must catch).
- Safety rule: an agent can read and draft; a person approves anything that changes, spends,
  sends, or deletes.
- Style (docs/STYLE.md): American English, plain words, honest reporting.
- Gates (docs/GATES.md): `bash scripts/test-gates.sh` and `bash scripts/public-gates.sh` run on
  every pull request; copies come from Cornerstone and are never edited here.
Put the Baseline Rule checklist in every plan and pull request.

## This repo
- **`soul-mark/v1/` is frozen.** It is exactly what was contributed to ArtCraft. Never edit it;
  changes go into v2.
- **Readability is the promise.** Every theme keeps all text at WCAG AA; tests prove it over every
  ready-made combination. Never weaken a test to make it pass.
- **Order of work** is in `docs/ROADMAP.md`.
- American English (color, gray). Plain words; the owner reads on a phone.
- Markdown tables are space-padded so columns line up in plain text.
