// DeepSeek through its OpenAI-compatible chat completions API, with tool calls.
// The key comes from DEEPSEEK_API_KEY, or from a proxy that adds it (a placeholder is sent then).
// DeepSeek's prices change, so there are no defaults: pass them from its official pricing page.
import type { Conversation, Provider, ToolDef, Turn } from "../agent";

export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: RawCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface RawCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface Completion {
  choices: { message: { content: string | null; tool_calls?: RawCall[] }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number };
}

export function deepseekProvider(opts: {
  model: string;
  price: { input: number; output: number };
  fetcher?: typeof fetch;
}): Provider {
  const fetcher = opts.fetcher ?? fetch;
  const key = process.env.DEEPSEEK_API_KEY || "placeholder-added-by-proxy";

  return {
    name: "deepseek",
    model: opts.model,
    price: opts.price,
    start(system: string, tools: ToolDef[], prompt: string): Conversation {
      const toolParams = tools.map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      }));
      const messages: Message[] = [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ];

      return {
        async next(): Promise<Turn> {
          const res = await fetcher(DEEPSEEK_URL, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
            body: JSON.stringify({ model: opts.model, messages, tools: toolParams, max_tokens: 8000 }),
          });
          if (!res.ok) throw new Error(`DeepSeek answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
          const body = (await res.json()) as Completion;
          const choice = body.choices[0];
          const raw = choice.message.tool_calls ?? [];
          messages.push({ role: "assistant", content: choice.message.content, ...(raw.length ? { tool_calls: raw } : {}) });
          const calls = raw.map((c) => ({ id: c.id, name: c.function.name, args: parseArgs(c.function.arguments) }));
          const stop =
            choice.finish_reason === "tool_calls" && calls.length
              ? "tools"
              : choice.finish_reason === "length"
                ? "cut"
                : choice.finish_reason === "content_filter"
                  ? "refused"
                  : "done";
          return {
            text: choice.message.content ?? "",
            calls,
            usage: { input: body.usage.prompt_tokens, output: body.usage.completion_tokens },
            stop,
          };
        },
        addResults(results) {
          for (const r of results) messages.push({ role: "tool", tool_call_id: r.id, content: r.content });
        },
      };
    },
  };
}

/** Tool arguments arrive as a JSON string; a broken one becomes an empty call the server rejects. */
function parseArgs(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
