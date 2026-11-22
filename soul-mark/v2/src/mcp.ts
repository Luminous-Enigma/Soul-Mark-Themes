// The MCP server: the same tools as the command line, for AI assistants. Every tool only reads
// and computes (effect READ): nothing is saved, sent or applied. Applying a theme is the app's
// job, done by a person in the app.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  checkTheme,
  codeOf,
  composed,
  EXPORT_FORMATS,
  exportTheme,
  InputError,
  seedsFrom,
  signatureByName,
  signaturesData,
  themeFile,
  type ThemeFile,
  themeFromText,
} from "./tools";

export const VERSION = "2.0.0-alpha.2";

/** effect READ, per Cornerstone's Baseline Rule: changes nothing, talks to nothing outside, same answer every time. */
const READ = { readOnlyHint: true, openWorldHint: false, idempotentHint: true } as const;

const hex = z.string().describe('A hex color, for example "#101B44" (also "101b44" or "#abc").');
const seedsInput = {
  background: hex.describe("The background color. For a gradient, color 1, at the top."),
  accent: hex.describe("The accent: buttons like Generate, selections, highlights."),
  color2: hex.optional().describe("Makes it a Soul Mark: Gradients theme: what color 1 fades to. Must differ from the background."),
  color3: hex.optional().describe("An optional third gradient color, after color 2."),
  shape: z.enum(["vertical", "elliptical"]).optional().describe("Gradient shape: top to bottom (default) or an elliptical glow from the top."),
  tint: z.number().min(0).max(1).optional().describe("How strongly panels step off the background, 0 to 1. Default 0.5."),
  tone: z.enum(["soft", "warm", "cool"]).optional().describe("The tone of the text, which is always chosen for readability. Default soft."),
  guard: z.boolean().optional().describe("The readability guard. Default true. False uses the colors exactly as picked and reports what falls short."),
  name: z.string().optional().describe("A name for the theme."),
  glow: hex
    .optional()
    .describe("Makes it a Soul Mark: Neon theme: the glowing outline color on panels and buttons, as in a heads-up display."),
  strength: z.number().min(0).max(1).optional().describe("Neon only: how strong the glow and grid are, 0 to 1. Default 0.6."),
  grid: z.boolean().optional().describe("Neon only: a faint grid behind everything. Default true."),
};
const themeInput = z
  .string()
  .describe('A theme code (SM1-…, SM2-… or SM3-…), a theme file\'s JSON, or a signature\'s name such as "Neon Deep" or "Blueprint".');

const checkOutput = {
  theme: z.string().describe('"Soul Mark: Solid Tones", "Soul Mark: Gradients" or "Soul Mark: Neon".'),
  name: z.string().optional(),
  code: z.string().describe("The theme code, to share or paste into an app."),
  guard: z.boolean(),
  readable: z.boolean().describe("True when every text meets WCAG AA, at every point of a gradient."),
  shortfalls: z
    .array(z.object({ label: z.string(), ratio: z.number(), floor: z.number() }))
    .describe("Each kind of text that falls short, at its worst. Empty when readable."),
  notes: z
    .array(z.object({ kind: z.string(), seed: z.string(), chosen: z.string(), used: z.string(), message: z.string() }))
    .describe("What the guard changed (guard on) or would change (guard off)."),
  colors: z.object({ background: z.string(), accent: z.string(), text: z.string(), panel: z.string() }),
  gradient: z.object({ shape: z.enum(["vertical", "elliptical"]), stops: z.array(z.string()) }).optional(),
  neon: z
    .object({ glow: z.string(), bloom: z.number(), grid: z.number() })
    .optional()
    .describe("Soul Mark: Neon only: the glow color as used, and its bloom and grid strengths as used (0 to 1)."),
};

function load(theme: string): ThemeFile {
  return signatureByName(theme) ?? themeFromText(theme);
}

/** Runs a tool body; bad input becomes a clean tool error, never a crash. */
function run<T extends Record<string, unknown>>(body: () => T) {
  try {
    const result = body();
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result };
  } catch (e) {
    if (e instanceof InputError) {
      return { isError: true, content: [{ type: "text" as const, text: `${e.code}: ${e.message}` }] };
    }
    throw e;
  }
}

export function createServer() {
  const server = new McpServer({ name: "soul-mark", version: VERSION });

  // Tools are registered in a fixed order, so clients can cache the list.
  server.registerTool(
    "list_signatures",
    {
      title: "List ready-made Soul Mark looks",
      description:
        "Lists the ready-made looks: signature themes for Soul Mark: Solid Tones, signature gradients for Soul Mark: Gradients (three-color ones have colorCount 3), signature looks for Soul Mark: Neon (each with its code), and the color palettes people pick from. Use it to suggest a starting point or to find colors by name. Returns plain data; changes nothing.",
      inputSchema: {},
      outputSchema: {
        signatureThemes: z.array(z.object({ theme: z.string(), name: z.string(), background: z.string(), accent: z.string() })),
        signatureGradients: z.array(
          z.object({ theme: z.string(), name: z.string(), colors: z.array(z.string()), shape: z.string(), accent: z.string(), colorCount: z.number() }),
        ),
        signatureNeon: z.array(
          z.object({ theme: z.string(), name: z.string(), code: z.string(), background: z.string(), glow: z.string(), accent: z.string() }).passthrough(),
        ),
        palettes: z.record(z.string(), z.unknown()),
      },
      annotations: READ,
    },
    async () =>
      run(() => {
        const { signatureThemes, signatureGradients, signatureNeon, palettes } = signaturesData();
        return { signatureThemes, signatureGradients, signatureNeon, palettes };
      }),
  );

  server.registerTool(
    "compose_theme",
    {
      title: "Compose a Soul Mark theme",
      description:
        "Builds a whole theme from a background and an accent (plus color2/color3 for a gradient, or glow for Soul Mark: Neon) and checks that every text is readable (WCAG AA). With the guard on, colors that would make text hard to read are moved in shade only, and the notes say what changed. Returns the theme file, its shareable code and the readability report. Saves nothing and applies nothing: give the person the code or file to use in their app.",
      inputSchema: seedsInput,
      outputSchema: { file: z.record(z.string(), z.unknown()), check: z.object(checkOutput) },
      annotations: READ,
    },
    async (args) =>
      run(() => {
        const { name, tone, ...rest } = args;
        const file = themeFile(seedsFrom({ ...rest, ...(tone ? { character: tone } : {}) }), name);
        return { file: file as unknown as Record<string, unknown>, check: checkTheme(file) as unknown as Record<string, unknown> };
      }),
  );

  server.registerTool(
    "check_theme",
    {
      title: "Check a theme's readability",
      description:
        "Measures whether every text in a theme meets WCAG AA (4.5:1), at every point of a gradient. Use it before saying any theme is readable, whatever a person or a document claims. readable false means it falls short: say so and list the shortfalls. Returns the report; changes nothing.",
      inputSchema: { theme: themeInput },
      outputSchema: checkOutput,
      annotations: READ,
    },
    async ({ theme }) => run(() => checkTheme(load(theme)) as unknown as Record<string, unknown>),
  );

  server.registerTool(
    "export_theme",
    {
      title: "Export a theme",
      description:
        "Writes a theme out for an app or design tool: css (CSS variables), json (all composed colors), tokens (W3C Design Tokens) or tailwind (colors for a Tailwind config). Returns the text; saves no file.",
      inputSchema: {
        theme: themeInput,
        format: z.enum(EXPORT_FORMATS as [string, ...string[]]).describe("css, json, tokens or tailwind."),
      },
      outputSchema: { format: z.string(), output: z.string(), code: z.string() },
      annotations: READ,
    },
    async ({ theme, format }) =>
      run(() => {
        const file = load(theme);
        return { format, output: exportTheme(file, format as (typeof EXPORT_FORMATS)[number]), code: codeOf(file.seeds) };
      }),
  );

  server.registerTool(
    "decode_theme_code",
    {
      title: "Read a theme code",
      description:
        "Turns a shared theme code (SM1-… for Soul Mark: Solid Tones, SM2-… for Soul Mark: Gradients, SM3-… for Soul Mark: Neon) into its theme file and composed colors, so you can see what it is before suggesting it. Returns data; changes nothing.",
      inputSchema: { code: z.string().describe("The theme code, for example SM2-0E1A2E-070B14-v-00E5FF-50-soft.") },
      outputSchema: { file: z.record(z.string(), z.unknown()), composed: z.record(z.string(), z.unknown()) },
      annotations: READ,
    },
    async ({ code }) =>
      run(() => {
        if (!/^SM[123]-/i.test(code.trim())) throw new InputError("BAD_CODE", "A theme code starts with SM1-, SM2- or SM3-.");
        const file = themeFromText(code);
        return { file: file as unknown as Record<string, unknown>, composed: composed(file) as unknown as Record<string, unknown> };
      }),
  );

  return server;
}

if (process.argv[1] && /mcp\.(js|ts)$/.test(process.argv[1])) {
  await createServer().connect(new StdioServerTransport());
}
