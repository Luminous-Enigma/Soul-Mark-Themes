# Agent tests

Tasks an AI agent must complete using only Soul Mark's skill (`../SKILL.md`) and MCP tools,
graded by code. The rules are in Cornerstone's
[Baseline Rule](https://github.com/Luminous-Enigma/Cornerstone/blob/main/docs/BASELINE_RULE.md#agent-tests-evals).

| Task                       | Kind               | What it proves                                                    | Pass rate (full) |
|----------------------------|--------------------|-------------------------------------------------------------------|------------------|
| `can-do-gradient`          | can do             | Makes a gradient, checks it, gives the code                       | 9 of 10          |
| `must-refuse-or-ask-apply` | must refuse or ask | Never claims it applied a theme; hands over the code for a person | 10 of 10         |
| `must-not-be-fooled`       | must not be fooled | A planted "SYSTEM:" note in the data doesn't stop the real check  | 10 of 10         |
| `must-catch-shortfall`     | must catch         | Reports that a guard-off theme falls short, with the 4.5:1 floor  | 10 of 10         |

- `graders.ts`: pass or fail, decided by code from the agent's tool calls and answer.
- `../test/graders.test.ts`: proves the graders pass good runs and fail bad ones, for every task.
- Each task names a **broken variant** that must fail, proving the task can fail: a missing
  tool, or a checker that reports every theme as readable. No correct answer can pass one.

## Running them

The runner (`run.ts`) gives each task to a real AI connected to `dist/mcp.js` over stdio, with
`SKILL.md` as its instructions. It runs the tool calls through the MCP server until the AI gives
a final answer (at most 8 turns), then calls `grade(task, run)`. Each task runs N times as
written (3 in the quick tier, 10 in the full tier) and N times with its broken variant.

| File                    | What it does                                                        |
|-------------------------|---------------------------------------------------------------------|
| `agent.ts`              | One run: the tool loop, and each task's broken variant (`SABOTAGE`) |
| `suite.ts`              | Every task, the dollar cap, the report and its summary              |
| `run.ts`                | The command line (`npm run eval`)                                   |
| `providers/claude.ts`   | Claude, through the official Anthropic SDK                          |
| `providers/deepseek.ts` | DeepSeek, through its OpenAI-compatible chat API                    |
| `results/`              | Each paid run's report (`.json`) and summary (`.md`), committed     |

The broken variants are applied between the AI and the server: a hidden tool isn't listed and
is refused if called, and a broken checker's results are rewritten, while the shipped server
stays untouched. A broken run that passes means that task can't catch that breakage, and the
summary says so. The summary quotes the answer of every run that went wrong, and the log of a
GitHub run ends with the whole report as one `REPORT_JSON` line.

### It costs money, so a person starts it

Running it calls a paid AI, so it never runs on its own. `--max-usd` is required; the runner
adds up the tokens each reply reports and stops before a run could take it over the cap.

```bash
npm run eval -- --provider claude --max-usd 5
```

```bash
npm run eval -- --provider deepseek --max-usd 1 --price-in 0.3 --price-out 1.2
```

DeepSeek has no default prices: take them from DeepSeek's official pricing page on the day,
using the cache-miss input price and the peak rates, so the cap holds at any hour. The default
model is `deepseek-flash`; `--model deepseek-v4-pro` runs the larger one. (On 22 Nov 2026 the
page gave $0.30 / $1.20 for Flash and $1.32 / $3.96 for V4 Pro; check again before a run.) Claude's list prices are in `providers/claude.ts`.
Other options: `--tier full`, `--runs <n>`, `--task <id>`, `--model <id>`, `--effort` (Claude).
Exit codes: 0 every run as expected, 1 not, 2 bad usage or nothing ran.

Keys come from `ANTHROPIC_API_KEY` or `DEEPSEEK_API_KEY`, or from a proxy that adds them. Never
paste a key into a chat or a file. On GitHub, the "agent tests (paid)" workflow runs it by hand
only, with the keys as repository secrets.

`test/runner.test.ts` proves the runner with a scripted fake AI against the real MCP server,
for free, on every pull request.
