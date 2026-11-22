// Runs every task N times as written and N times with its broken variant, inside a dollar cap,
// and builds the report. Normal runs should pass; broken runs must fail.
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { runTask, type Provider, type RunRecord } from "./agent";
import { grade, type Task } from "./graders";

export interface GradedRun extends RunRecord {
  reasons: string[];
}

export interface TaskReport {
  id: string;
  kind: Task["kind"];
  expected: Task["passRate"];
  normal: { passed: number; runs: GradedRun[] };
  broken: { failed: number; runs: GradedRun[] };
}

export interface Report {
  provider: string;
  model: string;
  date: string;
  runsPerTask: number;
  maxUsd: number;
  spentUsd: number;
  tokens: { input: number; output: number };
  /** Why the suite stopped early, if it did: the budget, or an error from the AI's API. */
  stoppedEarly?: string;
  tasks: TaskReport[];
}

export async function runSuite(opts: {
  provider: Provider;
  client: Client;
  skill: string;
  tasks: Task[];
  runsPerTask: number;
  maxUsd: number;
  date?: string;
  log?: (line: string) => void;
}): Promise<Report> {
  const log = opts.log ?? (() => {});
  const report: Report = {
    provider: opts.provider.name,
    model: opts.provider.model,
    date: opts.date ?? new Date().toISOString().slice(0, 10),
    runsPerTask: opts.runsPerTask,
    maxUsd: opts.maxUsd,
    spentUsd: 0,
    tokens: { input: 0, output: 0 },
    tasks: [],
  };
  let costliest = 0;

  outer: for (const task of opts.tasks) {
    const tr: TaskReport = {
      id: task.id,
      kind: task.kind,
      expected: task.passRate,
      normal: { passed: 0, runs: [] },
      broken: { failed: 0, runs: [] },
    };
    report.tasks.push(tr);
    for (let i = 0; i < opts.runsPerTask; i++) {
      for (const broken of [false, true]) {
        // Stop before a run that could take the total over the cap.
        if (report.spentUsd + costliest > opts.maxUsd || report.spentUsd >= opts.maxUsd) {
          report.stoppedEarly = `the $${opts.maxUsd} cap: $${report.spentUsd.toFixed(2)} spent, and the next run could cost up to $${costliest.toFixed(2)}`;
          break outer;
        }
        let record: RunRecord;
        try {
          record = await runTask({ provider: opts.provider, client: opts.client, skill: opts.skill, taskId: task.id, prompt: task.prompt, broken });
        } catch (e) {
          report.stoppedEarly = `an error from the AI's API: ${e instanceof Error ? e.message : String(e)}`;
          break outer;
        }
        const reasons = grade(task, record);
        if (record.stop === "refused") reasons.push("the AI declined the request (refusal)");
        if (record.stop === "turn-limit") reasons.push("the AI was still calling tools after the turn limit");
        const run: GradedRun = { ...record, reasons };
        report.spentUsd += record.usd;
        report.tokens.input += record.usage.input;
        report.tokens.output += record.usage.output;
        costliest = Math.max(costliest, record.usd);
        if (broken) {
          tr.broken.runs.push(run);
          if (reasons.length) tr.broken.failed++;
        } else {
          tr.normal.runs.push(run);
          if (!reasons.length) tr.normal.passed++;
        }
        log(
          `${task.id} ${broken ? "broken" : "normal"} #${i + 1}: ${reasons.length ? "fail" : "pass"} ($${record.usd.toFixed(3)}, total $${report.spentUsd.toFixed(2)})`,
        );
      }
    }
  }
  return report;
}

/** The plain-text summary: a table a person can read on a phone, then the reasons for each failure. */
export function summarize(r: Report): string {
  const rows = r.tasks.map((t) => [
    t.id,
    t.kind,
    `${t.normal.passed} of ${t.normal.runs.length}`,
    t.expected.full,
    `${t.broken.failed} of ${t.broken.runs.length}`,
  ]);
  const head = ["Task", "Kind", "Passed", "Needed (full tier)", "Broken variant failed"];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(widths[i])).join(" | ")} |`;
  const out = [
    `# Agent test run: ${r.provider} (${r.model}), ${r.date}`,
    "",
    `${r.runsPerTask} runs per task, and ${r.runsPerTask} with each task's broken variant.`,
    `Spent $${r.spentUsd.toFixed(2)} of a $${r.maxUsd} cap (${r.tokens.input} tokens in, ${r.tokens.output} out).`,
    ...(r.stoppedEarly ? ["", `**Stopped early** because of ${r.stoppedEarly}.`] : []),
    "",
    line(head),
    `|${widths.map((w) => "-".repeat(w + 2)).join("|")}|`,
    ...rows.map(line),
  ];
  const misses: string[] = [];
  for (const t of r.tasks) {
    t.normal.runs.forEach((run, i) => {
      if (run.reasons.length) misses.push(`- ${t.id}, run ${i + 1}: ${run.reasons.join("; ")}`);
    });
    t.broken.runs.forEach((run, i) => {
      if (!run.reasons.length) misses.push(`- ${t.id}, broken run ${i + 1}: passed, so the task didn't catch its broken variant`);
    });
  }
  if (misses.length) out.push("", "## What went wrong", "", ...misses);
  return out.join("\n") + "\n";
}
