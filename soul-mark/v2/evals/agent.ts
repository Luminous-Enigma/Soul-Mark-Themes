// One agent run: an AI gets SKILL.md and Soul Mark's MCP tools, answers one task's prompt, and
// we record every tool call and its final answer for grade(). The AI is behind a small Provider
// interface, so the same loop drives Claude, DeepSeek, or the scripted fake the tests use.
//
// Broken variants are applied here, between the AI and the server: the AI sees a sabotaged
// description, result or skill exactly as if the server or skill were broken, while the shipped
// server stays untouched.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Run } from "./graders";

export const MAX_TURNS = 8;

/** A tool as the AI sees it: a name, a description and a JSON Schema for its input. */
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface Turn {
  text: string;
  calls: ToolCall[];
  usage: { input: number; output: number };
  /** done: final answer; tools: wants tool results; refused: declined; cut: hit max_tokens. */
  stop: "done" | "tools" | "refused" | "cut";
}

/** One conversation with an AI. The provider keeps the conversation in its own format. */
export interface Conversation {
  next(): Promise<Turn>;
  addResults(results: { id: string; content: string; isError: boolean }[]): void;
}

export interface Provider {
  name: string;
  model: string;
  /** US dollars per million tokens, input and output. */
  price: { input: number; output: number };
  start(system: string, tools: ToolDef[], prompt: string): Conversation;
}

export interface RunRecord extends Run {
  turns: number;
  stop: Turn["stop"] | "turn-limit";
  usage: { input: number; output: number };
  usd: number;
}

/** Starts Soul Mark's MCP server (dist/mcp.js) over stdio, as any MCP client would. */
export async function connectServer(serverPath: string): Promise<Client> {
  const client = new Client({ name: "soul-mark-evals", version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [serverPath] }));
  return client;
}

/** Runs one task once. `broken` applies the task's broken variant. */
export async function runTask(opts: {
  provider: Provider;
  client: Client;
  skill: string;
  taskId: string;
  prompt: string;
  broken: boolean;
}): Promise<RunRecord> {
  const sabotage = opts.broken ? SABOTAGE[opts.taskId] : undefined;
  if (opts.broken && !sabotage) throw new Error(`No broken variant is wired for ${opts.taskId}.`);

  const hidden = new Set(sabotage?.hide ?? []);
  const listed = (await opts.client.listTools()).tools.filter((t) => !hidden.has(t.name));
  const tools: ToolDef[] = listed.map((t) => ({
    name: t.name,
    description: sabotage?.descriptions?.[t.name] ?? t.description ?? "",
    inputSchema: t.inputSchema as Record<string, unknown>,
  }));
  const skill = sabotage?.skill ? sabotage.skill(opts.skill) : opts.skill;

  const convo = opts.provider.start(skill, tools, opts.prompt);
  const record: RunRecord = { toolCalls: [], answer: "", turns: 0, stop: "turn-limit", usage: { input: 0, output: 0 }, usd: 0 };

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const t = await convo.next();
    record.turns = turn;
    record.usage.input += t.usage.input;
    record.usage.output += t.usage.output;
    if (t.text.trim()) record.answer = t.text;
    if (t.stop !== "tools") {
      record.stop = t.stop;
      break;
    }
    const results = [];
    for (const call of t.calls) {
      const { content, isError, value } = hidden.has(call.name)
        ? { content: `Unknown tool: ${call.name}`, isError: true, value: `Unknown tool: ${call.name}` }
        : await callTool(opts.client, call, sabotage?.result);
      record.toolCalls.push({ tool: call.name, arguments: call.args, result: value });
      results.push({ id: call.id, content, isError });
    }
    convo.addResults(results);
  }
  record.usd = cost(opts.provider, record.usage);
  return record;
}

export function cost(provider: Provider, usage: { input: number; output: number }): number {
  return (usage.input * provider.price.input + usage.output * provider.price.output) / 1_000_000;
}

interface Sabotage {
  /** Tools the AI doesn't get: not listed, and refused if called anyway. */
  hide?: string[];
  descriptions?: Record<string, string>;
  result?: (tool: string, value: Record<string, unknown>) => Record<string, unknown>;
  skill?: (skill: string) => string;
}

/**
 * Each task's broken variant, as its task file's brokenVariant.how describes it. Each one breaks
 * the setup so that no correct answer can pass: a missing tool or a checker that lies. (The first
 * round used gentler ones, reworded descriptions and a trimmed skill; real AIs answered correctly
 * anyway, so those couldn't show the tasks fail when something is truly broken.)
 */
export const SABOTAGE: Record<string, Sabotage> = {
  // "compose_theme is missing, so no theme can be made or checked."
  "can-do-gradient": { hide: ["compose_theme"] },
  // "The checker is broken: check_theme and compose_theme report every theme as readable."
  "must-catch-shortfall": {
    result: (tool, value) => {
      const pass = (c: Record<string, unknown>) => ({ ...c, readable: true, shortfalls: [], notes: [] });
      if (tool === "check_theme") return pass(value);
      if (tool === "compose_theme" && value.check) return { ...value, check: pass(value.check as Record<string, unknown>) };
      return value;
    },
  },
  // "check_theme is missing, so the code can't be checked."
  "must-not-be-fooled": { hide: ["check_theme"] },
  // "Every Soul Mark tool is missing, so there's no code to hand over."
  "must-refuse-or-ask-apply": {
    hide: ["list_signatures", "compose_theme", "check_theme", "export_theme", "decode_theme_code"],
  },
};

async function callTool(
  client: Client,
  call: ToolCall,
  alter?: Sabotage["result"],
): Promise<{ content: string; isError: boolean; value: unknown }> {
  try {
    const r = await client.callTool({ name: call.name, arguments: call.args });
    const isError = r.isError === true;
    const text = (r.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    if (isError || !r.structuredContent) return { content: text, isError, value: text };
    const value = alter ? alter(call.name, r.structuredContent as Record<string, unknown>) : r.structuredContent;
    return { content: JSON.stringify(value), isError: false, value };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { content: message, isError: true, value: message };
  }
}
