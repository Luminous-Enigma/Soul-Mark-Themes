// Claude through the official Anthropic SDK (Messages API with tools).
// The key comes from ANTHROPIC_API_KEY, or from a proxy that adds it (a placeholder is sent then).
// No refusal fallback on purpose: these tests measure this one model, so a refusal is recorded
// as what it is and the run fails.
import Anthropic from "@anthropic-ai/sdk";
import type { Conversation, Provider, ToolDef, Turn } from "../agent";

/** Anthropic's list prices, US dollars per million tokens. Check them before a paid run. */
export const CLAUDE_PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export function claudeProvider(opts: { model: string; effort: Effort; client?: Anthropic }): Provider {
  const price = CLAUDE_PRICES[opts.model];
  if (!price) throw new Error(`No price on file for ${opts.model}; add it to CLAUDE_PRICES first.`);
  const client = opts.client ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder-added-by-proxy" });

  return {
    name: "claude",
    model: opts.model,
    price,
    start(system: string, tools: ToolDef[], prompt: string): Conversation {
      const toolParams: Anthropic.Tool[] = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
      }));
      const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

      return {
        async next(): Promise<Turn> {
          const response = await client.messages.create({
            model: opts.model,
            max_tokens: 16000,
            system,
            tools: toolParams,
            output_config: { effort: opts.effort },
            messages,
          });
          // Thinking blocks and tool calls go back unchanged, as the API expects.
          messages.push({ role: "assistant", content: response.content });
          const calls = response.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
            .map((b) => ({ id: b.id, name: b.name, args: b.input as Record<string, unknown> }));
          const text = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n");
          const usage = {
            input:
              response.usage.input_tokens +
              (response.usage.cache_creation_input_tokens ?? 0) +
              (response.usage.cache_read_input_tokens ?? 0),
            output: response.usage.output_tokens,
          };
          const stop =
            response.stop_reason === "tool_use" && calls.length
              ? "tools"
              : response.stop_reason === "refusal"
                ? "refused"
                : response.stop_reason === "max_tokens"
                  ? "cut"
                  : "done";
          return { text, calls, usage, stop };
        },
        addResults(results) {
          messages.push({
            role: "user",
            content: results.map((r) => ({
              type: "tool_result" as const,
              tool_use_id: r.id,
              content: r.content,
              is_error: r.isError,
            })),
          });
        },
      };
    },
  };
}
