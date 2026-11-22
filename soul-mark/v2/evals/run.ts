// npm run eval -- --provider claude|deepseek --max-usd <dollars> [options]
// Runs the agent tests against a real AI. It spends money, so --max-usd is required and the
// run stops before it could go over. Never interactive. Exit codes: 0 every task met its pass
// rate and every broken variant failed; 1 not; 2 bad usage or no run at all.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { connectServer } from "./agent";
import type { Task } from "./graders";
import { claudeProvider, type Effort } from "./providers/claude";
import { deepseekProvider } from "./providers/deepseek";
import { runSuite, summarize, type Report } from "./suite";

const HELP = `Usage: npm run eval -- --provider claude|deepseek --max-usd <dollars> [options]

  --tier quick|full       quick: 3 runs per task (default); full: 10
  --runs <n>              runs per task, instead of the tier's
  --task <id>             only this task (repeatable)
  --model <id>            claude: claude-opus-5-5 (default); deepseek: deepseek-chat (default)
  --effort <level>        claude only: low, medium (default), high, xhigh, max
  --price-in <dollars>    deepseek only, required: dollars per million input tokens
  --price-out <dollars>   deepseek only, required: dollars per million output tokens
  --out <dir>             where results go (default evals/results)

Keys: ANTHROPIC_API_KEY or DEEPSEEK_API_KEY, or a proxy that adds them.`;

const root = new URL("../", import.meta.url);

function main(): Promise<number> | number {
  const args = parseArgs(process.argv.slice(2)) as Record<string, string | undefined> & { taskList: string[] };
  if (args.help) {
    process.stdout.write(HELP + "\n");
    return 0;
  }
  const maxUsd = Number(args["max-usd"]);
  if (!args["max-usd"] || !(maxUsd > 0)) return usage("--max-usd is required: the most this run may spend, in dollars.");
  const tier = args.tier ?? "quick";
  if (tier !== "quick" && tier !== "full") return usage("--tier is quick or full.");
  const runs = args.runs ? Number(args.runs) : tier === "quick" ? 3 : 10;
  if (!Number.isInteger(runs) || runs < 1) return usage("--runs is a whole number, 1 or more.");

  let provider;
  if (args.provider === "claude") {
    const effort = (args.effort ?? "medium") as Effort;
    if (!["low", "medium", "high", "xhigh", "max"].includes(effort)) return usage("--effort is low, medium, high, xhigh or max.");
    provider = claudeProvider({ model: args.model ?? "claude-opus-5-5", effort });
  } else if (args.provider === "deepseek") {
    const input = Number(args["price-in"]);
    const output = Number(args["price-out"]);
    if (!(input > 0) || !(output > 0)) return usage("deepseek needs --price-in and --price-out, from DeepSeek's official pricing page.");
    provider = deepseekProvider({ model: args.model ?? "deepseek-chat", price: { input, output } });
  } else {
    return usage("--provider is claude or deepseek.");
  }

  const all = readdirSync(new URL("evals/tasks/", root))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(`evals/tasks/${f}`, root), "utf8")) as Task);
  const wanted = args.taskList.length ? args.taskList : undefined;
  const tasks = all.filter((t) => (wanted ? wanted.includes(t.id) : tier === "full" || t.tier === "quick"));
  if (!tasks.length) return usage("No task matches.");

  return (async () => {
    const client = await connectServer(new URL("dist/mcp.js", root).pathname);
    try {
      const report = await runSuite({
        provider,
        client,
        skill: readFileSync(new URL("SKILL.md", root), "utf8"),
        tasks,
        runsPerTask: runs,
        maxUsd,
        log: (line) => process.stderr.write(line + "\n"),
      });
      const text = summarize(report);
      save(report, text, args.out);
      process.stdout.write(text);
      return verdict(report);
    } finally {
      await client.close();
    }
  })();
}

function verdict(r: Report): number {
  if (r.stoppedEarly) return r.tasks.some((t) => t.normal.runs.length) ? 1 : 2;
  const ok = r.tasks.every(
    (t) => t.normal.passed === t.normal.runs.length && t.broken.failed === t.broken.runs.length,
  );
  return ok ? 0 : 1;
}

function save(r: Report, text: string, outDir?: string) {
  const dir = outDir ? new URL(`file://${process.cwd()}/${outDir}/`) : new URL("evals/results/", root);
  mkdirSync(dir, { recursive: true });
  const base = `${r.date}-${r.provider}-${r.model}`;
  writeFileSync(new URL(`${base}.json`, dir), JSON.stringify(r, null, 2) + "\n");
  writeFileSync(new URL(`${base}.md`, dir), text);
  process.stderr.write(`Saved ${base}.json and ${base}.md\n`);
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  const taskList: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help") out.help = "true";
    else if (a.startsWith("--") && i + 1 < argv.length) {
      const k = a.slice(2);
      const v = argv[++i];
      if (k === "task") taskList.push(v);
      out[k] = v;
    } else throw new UsageError(`Unknown or incomplete option ${a}.`);
  }
  return { ...out, taskList };
}

class UsageError extends Error {}

function usage(message: string): number {
  process.stderr.write(`${message}\nRun "npm run eval -- --help" for usage.\n`);
  return 2;
}

try {
  process.exitCode = await main();
} catch (e) {
  if (e instanceof UsageError) process.exitCode = usage(e.message);
  else throw e;
}
