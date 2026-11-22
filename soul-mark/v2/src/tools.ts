// What the command line tool and the MCP server share: reading theme files and codes, checking
// readability, exporting, and listing the ready-made looks. All of it calls the engine in
// soul-mark.ts; nothing here decides a color on its own.

import { contrastRatio, type Hex, isHex } from "./contrast";
import {
  ACCENTS,
  BOLD_BACKGROUNDS,
  DEEP_BACKGROUNDS,
  GRADIENT_FADES,
  LIGHT_BACKGROUNDS,
  PRIMARY_BACKGROUNDS,
  SIGNATURE_GRADIENTS,
  SIGNATURE_THEMES,
  WHEEL,
  WHEEL_DEEP,
  WHEEL_LIGHT,
} from "./presets";
import {
  type Character,
  composeSoulMark,
  cssVariables,
  decodeSeeds,
  encodeSeeds,
  type GradientShape,
  gradientCss,
  measureText,
  type Shortfall,
  type SoulMark,
  type SoulMarkSeeds,
  type SoulMarkTokens,
  tokensAcrossGradient,
} from "./soul-mark";

/** The theme a file or code belongs to, as people see it: Soul Mark: Solid Tones or Soul Mark: Gradients. */
export type ThemeKind = "solid-tones" | "gradients";

/** A theme file (schema/theme.schema.json). */
export interface ThemeFile {
  name?: string;
  theme: ThemeKind;
  seeds: SoulMarkSeeds;
}

/** Bad input: a clear message and a stable code, never a crash. */
export class InputError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const THEME_NAMES: Record<ThemeKind, string> = {
  "solid-tones": "Soul Mark: Solid Tones",
  gradients: "Soul Mark: Gradients",
};

/** "#abc", "abc", "#AABBCC" or "aabbcc" as "#AABBCC". */
export function normalizeHex(value: unknown, field: string): Hex {
  if (typeof value !== "string") throw new InputError("BAD_COLOR", `${field} must be a hex color like "#101B44".`);
  let h = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = [...h].map((c) => c + c).join("");
  const hex = `#${h.toUpperCase()}`;
  if (!isHex(hex)) throw new InputError("BAD_COLOR", `${field} must be a hex color like "#101B44", not ${JSON.stringify(value)}.`);
  return hex as Hex;
}

/**
 * Seeds from loose input (a theme file's seeds, CLI flags or MCP arguments), checked strictly:
 * anything that isn't a valid choice is an error, never silently replaced.
 */
export function seedsFrom(raw: Record<string, unknown>): SoulMarkSeeds {
  const seeds: SoulMarkSeeds = {
    background: normalizeHex(raw.background, "background"),
    accent: normalizeHex(raw.accent, "accent"),
    tint: 0.5,
    character: "soft",
    guard: true,
  };
  if (raw.tint !== undefined) {
    const t = Number(raw.tint);
    if (!Number.isFinite(t) || t < 0 || t > 1) throw new InputError("BAD_TINT", "tint must be a number from 0 to 1.");
    seeds.tint = t;
  }
  if (raw.character !== undefined) {
    if (!["soft", "warm", "cool"].includes(String(raw.character))) {
      throw new InputError("BAD_TONE", 'tone must be "soft", "warm" or "cool".');
    }
    seeds.character = raw.character as Character;
  }
  if (raw.guard !== undefined) {
    if (typeof raw.guard !== "boolean") throw new InputError("BAD_GUARD", "guard must be true or false.");
    seeds.guard = raw.guard;
  }
  if (raw.color2 !== undefined) {
    seeds.color2 = normalizeHex(raw.color2, "color2");
    if (seeds.color2 === seeds.background) {
      throw new InputError("SAME_COLOR", "color2 must differ from the background (color 1): a gradient needs two colors.");
    }
    seeds.shape = "vertical";
  }
  if (raw.color3 !== undefined) {
    if (!seeds.color2) throw new InputError("NO_COLOR2", "color3 needs a color2 first.");
    seeds.color3 = normalizeHex(raw.color3, "color3");
  }
  if (raw.shape !== undefined) {
    if (!seeds.color2) throw new InputError("NO_COLOR2", "shape is only for gradients, which need a color2.");
    if (raw.shape !== "vertical" && raw.shape !== "elliptical") {
      throw new InputError("BAD_SHAPE", 'shape must be "vertical" or "elliptical".');
    }
    seeds.shape = raw.shape as GradientShape;
  }
  return seeds;
}

export function kindOf(seeds: SoulMarkSeeds): ThemeKind {
  return seeds.color2 ? "gradients" : "solid-tones";
}

/** A theme file's contents, checked: the theme it says must match its colors. */
export function parseThemeFile(data: unknown): ThemeFile {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new InputError("BAD_FILE", "A theme file is a JSON object with \"theme\" and \"seeds\".");
  }
  const d = data as Record<string, unknown>;
  if (d.theme !== "solid-tones" && d.theme !== "gradients") {
    throw new InputError("BAD_FILE", '"theme" must be "solid-tones" or "gradients".');
  }
  if (!d.seeds || typeof d.seeds !== "object") throw new InputError("BAD_FILE", '"seeds" is missing.');
  const seeds = seedsFrom(d.seeds as Record<string, unknown>);
  if (kindOf(seeds) !== d.theme) {
    throw new InputError(
      "THEME_MISMATCH",
      d.theme === "gradients"
        ? 'A "gradients" theme needs a color2.'
        : 'A "solid-tones" theme has no color2; use "gradients" for a gradient.',
    );
  }
  if (d.name !== undefined && typeof d.name !== "string") throw new InputError("BAD_FILE", '"name" must be text.');
  return { ...(d.name ? { name: d.name as string } : {}), theme: d.theme, seeds };
}

/** A theme from text that is either a theme code (SM1-… or SM2-…) or a theme file's JSON. */
export function themeFromText(text: string): ThemeFile {
  const t = text.trim();
  if (/^SM[12]-/i.test(t)) {
    const seeds = decodeSeeds(t);
    if (!seeds) throw new InputError("BAD_CODE", `${JSON.stringify(t)} is not a Soul Mark theme code.`);
    return { theme: kindOf(seeds), seeds };
  }
  let data: unknown;
  try {
    data = JSON.parse(t);
  } catch {
    throw new InputError("BAD_INPUT", "Expected a theme code (SM1-… or SM2-…) or a theme file's JSON.");
  }
  return parseThemeFile(data);
}

export function themeFile(seeds: SoulMarkSeeds, name?: string): ThemeFile {
  return { ...(name ? { name } : {}), theme: kindOf(seeds), seeds };
}

/** The readability report (schema/check-result.schema.json). */
export interface CheckResult {
  theme: string;
  name?: string;
  code: string;
  guard: boolean;
  readable: boolean;
  /** The worst contrast of each kind of text that falls short, at the worst point of a gradient. */
  shortfalls: Shortfall[];
  /** What the guard did (guard on) or would do (guard off). */
  notes: { kind: string; seed: string; chosen: string; used: string; message: string }[];
  colors: { background: string; accent: string; text: string; panel: string };
  gradient?: { shape: GradientShape; stops: string[] };
}

/** Composes the theme and says, measured, whether every text reads (WCAG AA). */
export function checkTheme(file: ThemeFile): CheckResult {
  const mark = composeSoulMark(file.seeds);
  // Measured again here, at every point of a gradient, rather than trusted.
  const failures = tokensAcrossGradient(mark).flatMap((t) =>
    measureText(t).filter((m) => m.ratio < m.floor - 1e-9),
  );
  const shortfalls = mark.shortfalls.length
    ? mark.shortfalls
    : failures.length
      ? [worst(failures)]
      : [];
  return {
    theme: THEME_NAMES[file.theme],
    ...(file.name ? { name: file.name } : {}),
    code: encodeSeeds(file.seeds),
    guard: file.seeds.guard !== false,
    readable: shortfalls.length === 0,
    shortfalls: shortfalls.map((s) => ({ ...s, ratio: round2(s.ratio) })),
    notes: mark.notes.map((n) => ({ kind: n.kind, seed: n.seed, chosen: n.chosen, used: n.used, message: n.message })),
    colors: {
      background: mark.tokens.bg,
      accent: mark.tokens.accent,
      text: mark.tokens.fg,
      panel: mark.tokens.panel,
    },
    ...(mark.gradient ? { gradient: { shape: mark.gradient.shape, stops: mark.gradient.stops } } : {}),
  };
}

function worst(ms: { what: string; ratio: number; floor: number }[]): Shortfall {
  const w = ms.reduce((a, b) => (b.ratio / b.floor < a.ratio / a.floor ? b : a));
  return { label: w.what, ratio: w.ratio, floor: w.floor };
}

const round2 = (n: number) => Math.floor(n * 100) / 100;

export type ExportFormat = "css" | "json" | "tokens" | "tailwind";
export const EXPORT_FORMATS: ExportFormat[] = ["css", "json", "tokens", "tailwind"];

/** The theme in a format an app or design tool can use. */
export function exportTheme(file: ThemeFile, format: ExportFormat): string {
  const mark = composeSoulMark(file.seeds);
  switch (format) {
    case "css":
      return cssText(mark);
    case "json":
      return JSON.stringify(composed(file, mark), null, 2);
    case "tokens":
      return JSON.stringify(designTokens(file, mark), null, 2);
    case "tailwind":
      return JSON.stringify(tailwindColors(mark), null, 2);
    default:
      throw new InputError("BAD_FORMAT", `format must be one of ${EXPORT_FORMATS.join(", ")}.`);
  }
}

/** The composed theme (schema/composed.schema.json). */
export function composed(file: ThemeFile, mark: SoulMark = composeSoulMark(file.seeds)) {
  return {
    theme: THEME_NAMES[file.theme],
    ...(file.name ? { name: file.name } : {}),
    code: encodeSeeds(file.seeds),
    seeds: file.seeds,
    tokens: tokenColors(mark.tokens),
    scheme: mark.tokens.scheme,
    textFade: mark.tokens.textFade,
    ...(mark.gradient
      ? {
          gradient: {
            shape: mark.gradient.shape,
            stops: mark.gradient.stops,
            panelStops: mark.gradient.panelStops,
            css: gradientCss(mark.gradient.shape, mark.gradient.stops),
          },
        }
      : {}),
  };
}

const TOKEN_NAMES: [keyof SoulMarkTokens, string][] = [
  ["bg", "background"],
  ["panel", "panel"],
  ["controls", "controls"],
  ["sunken", "sunken"],
  ["fg", "text"],
  ["white", "ink"],
  ["black", "deep"],
  ["accent", "accent"],
  ["accent600", "accent-hover"],
  ["accent700", "accent-pressed"],
  ["accentText", "accent-text"],
  ["accentLine", "accent-line"],
  ["accentInk", "accent-ink"],
  ["accent300", "accent-300"],
  ["accent400", "accent-400"],
  ["scrollTrack", "scroll-track"],
  ["scrollThumb", "scroll-thumb"],
];

function tokenColors(t: SoulMarkTokens): Record<string, string> {
  return Object.fromEntries(TOKEN_NAMES.map(([k, name]) => [name, t[k] as string]));
}

function cssText(mark: SoulMark): string {
  const vars = cssVariables(mark);
  return `:root {\n${Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}\n`;
}

/** W3C Design Tokens (Community Group format): colors, and the gradient as a gradient token. */
function designTokens(file: ThemeFile, mark: SoulMark) {
  const colors = Object.fromEntries(
    Object.entries(tokenColors(mark.tokens)).map(([name, hex]) => [name, { $type: "color", $value: hex }]),
  );
  const g = mark.gradient;
  return {
    "soul-mark": {
      $description: `${THEME_NAMES[file.theme]}${file.name ? `: ${file.name}` : ""}, theme code ${encodeSeeds(file.seeds)}`,
      ...colors,
      ...(g
        ? {
            gradient: {
              $type: "gradient",
              $value: g.stops.map((color, i) => ({ color, position: i / (g.stops.length - 1) })),
              $extensions: { "soul-mark": { shape: g.shape } },
            },
          }
        : {}),
    },
  };
}

/** Colors for a Tailwind config's theme.extend (and the gradient as a background image). */
function tailwindColors(mark: SoulMark) {
  return {
    colors: { "soul-mark": tokenColors(mark.tokens) },
    ...(mark.gradient
      ? { backgroundImage: { "soul-mark-gradient": gradientCss(mark.gradient.shape, mark.gradient.stops) } }
      : {}),
  };
}

/** Every ready-made look and palette, as plain data (data/signatures.json is generated from this). */
export function signaturesData() {
  const rows = (r: [string, Hex][]) => r.map(([name, hex]) => ({ name, hex }));
  return {
    $comment:
      "Generated from src/presets.ts by `npm run data`. Do not edit by hand; a test fails if this file is out of date.",
    signatureThemes: SIGNATURE_THEMES.map((t) => ({ theme: "solid-tones", ...t })),
    signatureGradients: SIGNATURE_GRADIENTS.map((g) => ({ theme: "gradients", ...g, colorCount: g.colors.length })),
    palettes: {
      backgrounds: {
        primaries: rows(PRIMARY_BACKGROUNDS),
        light: rows(LIGHT_BACKGROUNDS),
        deep: rows(DEEP_BACKGROUNDS),
        bold: rows(BOLD_BACKGROUNDS),
      },
      accents: { classic: rows(ACCENTS), wheel: rows(WHEEL), light: rows(WHEEL_LIGHT), deep: rows(WHEEL_DEEP) },
      gradientFades: rows(GRADIENT_FADES),
    },
  };
}

/** A signature look by name (case and spacing ignored), as a theme file. */
export function signatureByName(name: string): ThemeFile | null {
  const key = name.toLowerCase().replace(/\s+/g, " ").trim();
  const t = SIGNATURE_THEMES.find((s) => s.name.toLowerCase() === key);
  if (t) return themeFile(seedsFrom({ background: t.background, accent: t.accent }), t.name);
  const g = SIGNATURE_GRADIENTS.find((s) => s.name.toLowerCase() === key);
  if (g) {
    return themeFile(
      seedsFrom({ background: g.colors[0], color2: g.colors[1], color3: g.colors[2], shape: g.shape, accent: g.accent }),
      g.name,
    );
  }
  return null;
}

/** Contrast between two colors, for quick questions. */
export function contrastOf(a: string, b: string): number {
  return round2(contrastRatio(normalizeHex(a, "first color"), normalizeHex(b, "second color")));
}
