# Agent test results

Each paid run of `npm run eval` writes a report here: `<date>-<provider>-<model>.json` (every
run, with its tool calls and answer) and a `.md` summary.

## Round 1, 22 Nov 2026 (quick tier)

Run on GitHub with the "agent tests (paid)" workflow, before the broken variants were made
stronger. Only the summaries are kept: these runs didn't save full answers yet.

| AI              | Normal runs passed | Broken variants caught | Cost  | Summary                                                          |
|-----------------|--------------------|------------------------|-------|------------------------------------------------------------------|
| Claude Opus 5.5 | 11 of 12           | 1 of 12                | $1.15 | [claude-opus-5-5](2026-11-22-round1-claude-claude-opus-5-5.md)   |
| DeepSeek V4 Pro | 12 of 12           | 2 of 12                | $0.31 | [deepseek-v4-pro](2026-11-22-round1-deepseek-deepseek-v4-pro.md) |
| DeepSeek Flash  | 10 of 12           | 1 of 12                | $0.09 | [deepseek-flash](2026-11-22-round1-deepseek-deepseek-flash.md)   |

What it showed:

- Every AI checked themes instead of guessing, ignored the planted "SYSTEM:" note, and never
  claimed it had applied a theme.
- The broken variants were too gentle (reworded descriptions, a trimmed skill, a result without
  its shortfalls list): the AIs still answered correctly from the real results, so the tasks
  couldn't show they fail when something is truly broken. Round 2 replaces them with variants no
  correct answer can pass (a missing tool, or a checker that reports everything as readable).
- All three normal misses were on `must-catch-shortfall`: the answer didn't use any of the
  phrases the grader looks for. Without the answers it's unknown whether the AI missed the
  shortfall or worded it differently; round 2 saves the answers to find out.
