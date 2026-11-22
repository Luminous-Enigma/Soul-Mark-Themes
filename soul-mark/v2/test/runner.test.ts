// The agent test runner, proven with a scripted fake AI against the real MCP server (dist/mcp.js),
// so nothing here calls a paid model.
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectServer, runTask, SABOTAGE, type Conversation, type Provider, type ToolDef, type Turn } from "../evals/agent";
import type { Task } from "../evals/graders";
import { claudeProvider } from "../evals/providers/claude";
import { deepseekProvider } from "../evals/providers/deepseek";
import { runSuite, summarize } from "../evals/suite";
import { here, readJson } from "./helpers";

const TASK_IDS = ["can-do-gradient", "must-catch-shortfall", "must-not-be-fooled", "must-refuse-or-ask-apply"];
const SKILL = readFileSync(here("SKILL.md"), "utf8");
const task = (id: string) => readJson(`evals/tasks/${id}.json`) as Task;

let client: Client;
beforeAll(async () => {
  client = await connectServer(here("dist/mcp.js").pathname);
});
afterAll(async () => {
  await client.close();
});

describe("the runner with a careful fake AI", () => {
  it("passes every task through the real MCP server", async () => {
    for (const id of TASK_IDS) {
      const record = await runTask({ provider: carefulFake(), client, skill: SKILL, taskId: id, prompt: task(id).prompt, broken: false });
      const report = await runSuite({ provider: carefulFake(), client, skill: SKILL, tasks: [task(id)], runsPerTask: 1, maxUsd: 1 });
      expect(record.toolCalls.length, id).toBeGreaterThan(0);
      expect(report.tasks[0].normal.passed, `${id}: ${JSON.stringify(report.tasks[0].normal.runs[0].reasons)}`).toBe(1);
    }
  });

  it("records the real tool results and adds up tokens and dollars", async () => {
    const r = await runTask({ provider: carefulFake(), client, skill: SKILL, taskId: "must-not-be-fooled", prompt: task("must-not-be-fooled").prompt, broken: false });
    expect((r.toolCalls[0].result as { readable: boolean }).readable).toBe(false);
    expect(r.usage).toEqual({ input: 2000, output: 200 });
    expect(r.usd).toBeCloseTo((2000 * 4 + 200 * 20) / 1e6);
    expect(r.stop).toBe("done");
  });
});

describe("broken variants", () => {
  it("one is wired for every task", () => {
    expect(Object.keys(SABOTAGE).sort()).toEqual([...TASK_IDS].sort());
  });

  it("change what the AI sees, as each task file says", async () => {
    const seen = async (id: string, broken: boolean) => {
      const spy = spyFake();
      const record = await runTask({ provider: spy, client, skill: SKILL, taskId: id, prompt: task(id).prompt, broken });
      return { ...spy.seen!, record };
    };
    const names = (tools: ToolDef[]) => tools.map((t) => t.name);

    expect(names((await seen("can-do-gradient", true)).tools)).not.toContain("compose_theme");
    expect(names((await seen("must-not-be-fooled", true)).tools)).not.toContain("check_theme");
    expect((await seen("must-refuse-or-ask-apply", true)).tools).toEqual([]);

    const ok = await seen("must-catch-shortfall", false);
    const bad = await seen("must-catch-shortfall", true);
    expect(ok.record.toolCalls[0].result).toMatchObject({ readable: false });
    expect(bad.record.toolCalls[0].result).toMatchObject({ readable: true, shortfalls: [] });
  });

  it("refuse a hidden tool even if the AI calls it anyway", async () => {
    const r = await runTask({ provider: carefulFake(), client, skill: SKILL, taskId: "can-do-gradient", prompt: task("can-do-gradient").prompt, broken: true });
    expect(r.toolCalls[0]).toMatchObject({ tool: "compose_theme", result: "Unknown tool: compose_theme" });
  });

  it("make every task fail, even for an AI that does everything right", async () => {
    for (const id of TASK_IDS) {
      const report = await runSuite({ provider: carefulFake(), client, skill: SKILL, tasks: [task(id)], runsPerTask: 1, maxUsd: 1 });
      expect(report.tasks[0].normal.passed, id).toBe(1);
      expect(report.tasks[0].broken.failed, id).toBe(1);
    }
  });

  it("leave everything as it is on normal runs", async () => {
    const spy = spyFake();
    await runTask({ provider: spy, client, skill: SKILL, taskId: "must-refuse-or-ask-apply", prompt: "hi", broken: false });
    const { tools } = await client.listTools();
    expect(spy.seen!.system).toBe(SKILL);
    expect(spy.seen!.tools.map((t) => t.description)).toEqual(tools.map((t) => t.description));
  });
});

describe("the suite", () => {
  it("stops before a run could take it over the dollar cap", async () => {
    // Each careful run costs $0.012; a $0.05 cap allows 4 runs, then stops.
    const report = await runSuite({ provider: carefulFake(), client, skill: SKILL, tasks: TASK_IDS.map(task), runsPerTask: 3, maxUsd: 0.05 });
    const runs = report.tasks.flatMap((t) => [...t.normal.runs, ...t.broken.runs]);
    expect(runs.length).toBe(4);
    expect(report.spentUsd).toBeLessThanOrEqual(0.05);
    expect(report.stoppedEarly).toMatch(/cap/);
  });

  it("stops on an error from the AI's API instead of counting it as a fail", async () => {
    const failing: Provider = { ...carefulFake(), start: () => ({ next: () => Promise.reject(new Error("401 bad key")), addResults() {} }) };
    const report = await runSuite({ provider: failing, client, skill: SKILL, tasks: [task("must-not-be-fooled")], runsPerTask: 3, maxUsd: 1 });
    expect(report.stoppedEarly).toMatch(/401 bad key/);
    expect(report.tasks[0].normal.runs).toEqual([]);
  });

  it("counts a broken run that passes as a miss, and quotes the answer", async () => {
    // A fake that always says the theme falls short, without reading the check, passes the
    // must-catch broken variant: exactly what the summary must flag.
    const stubborn: Provider = {
      ...carefulFake(),
      start(system, tools, prompt) {
        const careful = carefulFake().start(system, tools, prompt);
        let called = false;
        return {
          async next() {
            if (!called) return (called = true), careful.next();
            return { text: "It falls short of the 4.5:1 floor.\nDon't ship it.", calls: [], usage: { input: 1, output: 1 }, stop: "done" };
          },
          addResults: careful.addResults,
        };
      },
    };
    const report = await runSuite({ provider: stubborn, client, skill: SKILL, tasks: [task("must-catch-shortfall")], runsPerTask: 1, maxUsd: 1, date: "2026-01-01" });
    expect(report.tasks[0].broken.failed).toBe(0);
    const text = summarize(report);
    expect(text).toContain("broken run 1: passed, so the task didn't catch its broken variant\n  > It falls short of the 4.5:1 floor.\n  > Don't ship it.");
    const table = text.split("\n").filter((l) => l.startsWith("|"));
    expect(new Set(table.map((l) => l.length)).size).toBe(1);
  });
});

describe("providers speak their APIs' formats", () => {
  it("claude: sends tools and tool results the Messages API way", async () => {
    const sent: Record<string, unknown>[] = [];
    const replies = [
      { content: [{ type: "tool_use", id: "t1", name: "check_theme", input: { theme: "Aurora" } }], stop_reason: "tool_use", usage: { input_tokens: 100, output_tokens: 10 } },
      { content: [{ type: "text", text: "Readable." }], stop_reason: "end_turn", usage: { input_tokens: 150, output_tokens: 5, cache_read_input_tokens: 50 } },
    ];
    const fakeClient = { messages: { create: async (body: Record<string, unknown>) => (sent.push(structuredClone(body)), replies.shift()) } };
    const p = claudeProvider({ model: "claude-opus-5-5", effort: "medium", client: fakeClient as never });
    const convo = p.start("skill", [{ name: "check_theme", description: "d", inputSchema: { type: "object" } }], "Is Aurora readable?");
    const first = await convo.next();
    expect(first).toMatchObject({ stop: "tools", calls: [{ id: "t1", name: "check_theme", args: { theme: "Aurora" } }] });
    convo.addResults([{ id: "t1", content: "{}", isError: false }]);
    const second = await convo.next();
    expect(second).toMatchObject({ stop: "done", text: "Readable.", usage: { input: 200, output: 5 } });
    expect(sent[0]).toMatchObject({ model: "claude-opus-5-5", system: "skill", output_config: { effort: "medium" }, tools: [{ name: "check_theme", input_schema: { type: "object" } }] });
    expect((sent[1].messages as unknown[]).at(-1)).toEqual({ role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "{}", is_error: false }] });
  });

  it("claude: a refusal is reported as one", async () => {
    const fakeClient = { messages: { create: async () => ({ content: [], stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 0 } }) } };
    const convo = claudeProvider({ model: "claude-opus-5-5", effort: "low", client: fakeClient as never }).start("s", [], "p");
    expect((await convo.next()).stop).toBe("refused");
  });

  it("deepseek: sends tools and tool results the chat completions way", async () => {
    const bodies: Record<string, unknown>[] = [];
    const replies = [
      { choices: [{ message: { content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "check_theme", arguments: '{"theme":"Aurora"}' } }] }, finish_reason: "tool_calls" }], usage: { prompt_tokens: 90, completion_tokens: 9 } },
      { choices: [{ message: { content: "Readable." }, finish_reason: "stop" }], usage: { prompt_tokens: 120, completion_tokens: 4 } },
    ];
    const fetcher = async (_url: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return new Response(JSON.stringify(replies.shift()));
    };
    const p = deepseekProvider({ model: "deepseek-chat", price: { input: 1, output: 2 }, fetcher: fetcher as never });
    const convo = p.start("skill", [{ name: "check_theme", description: "d", inputSchema: { type: "object" } }], "Is Aurora readable?");
    expect(await convo.next()).toMatchObject({ stop: "tools", calls: [{ id: "c1", name: "check_theme", args: { theme: "Aurora" } }] });
    convo.addResults([{ id: "c1", content: "{}", isError: false }]);
    expect(await convo.next()).toMatchObject({ stop: "done", text: "Readable.", usage: { input: 120, output: 4 } });
    expect(bodies[0]).toMatchObject({ model: "deepseek-chat", tools: [{ type: "function", function: { name: "check_theme", parameters: { type: "object" } } }] });
    expect((bodies[0].messages as unknown[])[0]).toEqual({ role: "system", content: "skill" });
    expect((bodies[1].messages as unknown[]).at(-1)).toEqual({ role: "tool", tool_call_id: "c1", content: "{}" });
  });

  it("deepseek: an error status stops with the status", async () => {
    const fetcher = async () => new Response("nope", { status: 402 });
    const convo = deepseekProvider({ model: "deepseek-chat", price: { input: 1, output: 2 }, fetcher: fetcher as never }).start("s", [], "p");
    await expect(convo.next()).rejects.toThrow(/402/);
  });
});

/**
 * A fake AI that does each task the careful way: calls the right tool, then answers only from
 * what the tool returned. Every turn reports 1,000 tokens in and 100 out, priced like Claude Opus 5.5.
 */
function carefulFake(): Provider {
  return {
    name: "fake",
    model: "careful",
    price: { input: 4, output: 20 },
    start(_system, _tools, prompt): Conversation {
      let results: string[] | null = null;
      const usage = { input: 1000, output: 100 };
      return {
        async next(): Promise<Turn> {
          if (!results) return { text: "", calls: [planCall(prompt)], usage, stop: "tools" };
          if (!results[0].startsWith("{")) return { text: `I couldn't check it: ${results[0]}`, calls: [], usage, stop: "done" };
          const r = JSON.parse(results[0]);
          const check = r.check ?? r;
          const verdict = check.readable
            ? "It's readable: every text meets WCAG AA."
            : `It's not readable: it falls short of the 4.5:1 floor. ${(check.shortfalls ?? []).map((s: { label: string; ratio: number }) => `${s.label} ${s.ratio}:1`).join(", ")}`;
          const apply = /switch my/i.test(prompt) ? "I can't switch your app myself. Paste this code into ArtCraft's theme settings: " : "";
          return { text: `${apply}${verdict} Code: ${check.code}`, calls: [], usage, stop: "done" };
        },
        addResults(rs) {
          results = rs.map((r) => r.content);
        },
      };
    },
  };
}

function planCall(prompt: string) {
  if (/#0C2F1C/.test(prompt)) return { id: "1", name: "compose_theme", args: { background: "#0C2F1C", accent: "#10B981", color2: "#000000" } };
  const code = prompt.match(/SM[12]-[\w-]+/)?.[0];
  if (code) return { id: "1", name: "check_theme", args: { theme: code } };
  const json = prompt.match(/\{.*\}/)?.[0];
  if (json) return { id: "1", name: "check_theme", args: { theme: json } };
  return { id: "1", name: "check_theme", args: { theme: "Neon Deep" } };
}

/** A fake that records what it was given, calls the tool the careful fake would, then stops. */
function spyFake(): Provider & { seen?: { system: string; tools: ToolDef[] } } {
  const careful = carefulFake();
  const spy: Provider & { seen?: { system: string; tools: ToolDef[] } } = {
    ...careful,
    start(system, tools, prompt) {
      spy.seen = { system, tools };
      return careful.start(system, tools, prompt);
    },
  };
  return spy;
}
