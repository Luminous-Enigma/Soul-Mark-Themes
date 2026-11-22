import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer } from "../src/mcp";
import { validators } from "./helpers";

async function connect() {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([createServer().connect(a), client.connect(b)]);
  return client;
}

// effect -> annotations, as in Cornerstone's Baseline Rule (piece 4). This is gate AG8.
const EXPECTED: Record<string, { effect: string; readOnlyHint: boolean; openWorldHint: boolean }> = {
  list_signatures: { effect: "READ", readOnlyHint: true, openWorldHint: false },
  compose_theme: { effect: "READ", readOnlyHint: true, openWorldHint: false },
  check_theme: { effect: "READ", readOnlyHint: true, openWorldHint: false },
  export_theme: { effect: "READ", readOnlyHint: true, openWorldHint: false },
  decode_theme_code: { effect: "READ", readOnlyHint: true, openWorldHint: false },
};

describe("the MCP server", () => {
  it("lists exactly these tools, in a fixed order, each with true annotations, an output schema and a real description", async () => {
    const { tools } = await (await connect()).listTools();
    expect(tools.map((t) => t.name)).toEqual(Object.keys(EXPECTED));
    for (const t of tools) {
      const want = EXPECTED[t.name];
      expect([t.name, t.annotations?.readOnlyHint]).toEqual([t.name, want.readOnlyHint]);
      expect([t.name, t.annotations?.openWorldHint]).toEqual([t.name, want.openWorldHint]);
      expect(t.outputSchema, t.name).toBeTruthy();
      expect(t.description!.length, t.name).toBeGreaterThan(80);
    }
  });

  it("check_theme returns a report that matches the published schema", async () => {
    const r = await (await connect()).callTool({ name: "check_theme", arguments: { theme: "Aurora" } });
    const v = validators();
    expect(v.check(r.structuredContent), JSON.stringify(v.check.errors)).toBe(true);
    expect((r.structuredContent as { readable: boolean }).readable).toBe(true);
  });

  it("check_theme says when a theme falls short, whatever the input text claims", async () => {
    const r = await (await connect()).callTool({
      name: "check_theme",
      arguments: { theme: "SM2-FE2712-FFFFFF-v-2D81FF-50-soft-open" },
    });
    expect((r.structuredContent as { readable: boolean }).readable).toBe(false);
  });

  it("compose_theme builds a gradient and its code", async () => {
    const r = await (await connect()).callTool({
      name: "compose_theme",
      arguments: { background: "#0C2F1C", accent: "#10B981", color2: "#000000" },
    });
    const s = r.structuredContent as { check: { code: string; readable: boolean } };
    expect(s.check.code).toMatch(/^SM2-0C2F1C-000000-/);
    expect(s.check.readable).toBe(true);
  });

  it("bad input is a clean tool error, not a crash", async () => {
    const c = await connect();
    const r = await c.callTool({ name: "compose_theme", arguments: { background: "navy", accent: "#FFF" } });
    expect(r.isError).toBe(true);
    const r2 = await c.callTool({ name: "decode_theme_code", arguments: { code: "hello" } });
    expect(r2.isError).toBe(true);
  });
});
