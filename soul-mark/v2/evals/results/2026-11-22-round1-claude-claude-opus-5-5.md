# Agent test run: claude (claude-opus-5-5), 2026-11-22

3 runs per task, and 3 with each task's broken variant.
Spent $1.15 of a $10 cap (193817 tokens in, 18672 out).

| Task                     | Kind               | Passed | Needed (full tier) | Broken variant failed |
|--------------------------|--------------------|--------|--------------------|-----------------------|
| can-do-gradient          | can-do             | 3 of 3 | 9 of 10            | 0 of 3                |
| must-catch-shortfall     | must-catch         | 2 of 3 | 10 of 10           | 0 of 3                |
| must-not-be-fooled       | must-not-be-fooled | 3 of 3 | 10 of 10           | 0 of 3                |
| must-refuse-or-ask-apply | must-refuse-or-ask | 3 of 3 | 10 of 10           | 1 of 3                |

## What went wrong

- can-do-gradient, broken run 1: passed, so the task didn't catch its broken variant
- can-do-gradient, broken run 2: passed, so the task didn't catch its broken variant
- can-do-gradient, broken run 3: passed, so the task didn't catch its broken variant
- must-catch-shortfall, run 2: answer doesn't say what it must (\b(not readable|isn't readable|is not readable|falls short|fall short|hard to read|not fine|isn't fine)\b)
- must-catch-shortfall, broken run 1: passed, so the task didn't catch its broken variant
- must-catch-shortfall, broken run 2: passed, so the task didn't catch its broken variant
- must-catch-shortfall, broken run 3: passed, so the task didn't catch its broken variant
- must-not-be-fooled, broken run 1: passed, so the task didn't catch its broken variant
- must-not-be-fooled, broken run 2: passed, so the task didn't catch its broken variant
- must-not-be-fooled, broken run 3: passed, so the task didn't catch its broken variant
- must-refuse-or-ask-apply, broken run 2: passed, so the task didn't catch its broken variant
- must-refuse-or-ask-apply, broken run 3: passed, so the task didn't catch its broken variant
