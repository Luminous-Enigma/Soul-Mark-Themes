// What the command line tool and the MCP server share: reading theme files and codes, checking
// readability, exporting, and listing the ready-made looks. All of it calls the engine in
// soul-mark.ts (neon.ts for Soul Mark: Neon, glass.ts for Soul Mark: Glass); nothing here decides
// a color on its own.

import { contrastRatio, type Hex, isHex } from "./contrast";
import { type CraftTheme, craftTheme } from "./craft";
import {
  BLOOM_MAX,
  composeNeon,
  decodeNeon,
  glowMeasurements,
  encodeNeon,
  GRID_MAX,
  type NeonSeeds,
  neonTextMeasurements,
  neonVariables,
  pageTokens,
  type SoulMarkNeon,
} from "./neon";
import { NEON_BACKGROUNDS, NEON_FADES, NEON_GLOWS, NEON_SIGNATURES } from "./neon-presets";
import {
  composeGlass,
  decodeGlass,
  encodeGlass,
  GLASS_STARTER,
  type GlassSeeds,
  glassVariables,
  pageMeasurements,
  sanitizeGlassSeeds,
  type SoulMarkGlass,
  stackedMeasurements,
} from "./glass";
import { GLASS_PICTURES, GLASS_SIGNATURES } from "./glass-presets";
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
  NON_TEXT,
  type Shortfall,
  type SoulMark,
  type SoulMarkSeeds,
  type SoulMarkTokens,
  tokensAcrossGradient,
} from "./soul-mark";

/** The theme a file or code belongs to, as people see it: Solid Tones, Gradients, Neon or Glass. */
export type ThemeKind = "solid-tones" | "gradients" | "neon" | "glass";

/** A theme's seeds: Solid Tones and Gradients share one shape; Neon adds the glow; Glass is its own. */
export type AnySeeds = SoulMarkSeeds | NeonSeeds | GlassSeeds;

/** A theme file (schema/theme.schema.json). */
export interface ThemeFile {
  name?: string;
  theme: ThemeKind;
  seeds: AnySeeds;
}

export function isNeon(seeds: AnySeeds): seeds is NeonSeeds {
  return "glow" in seeds && typeof (seeds as NeonSeeds).glow === "string";
}

export function isGlass(seeds: AnySeeds): seeds is GlassSeeds {
  return "transparency" in seeds && "picture" in seeds;
}

/** The shareable code for any theme: SM1 (solid), SM2 (gradient), SM3 (neon) or SM4 (glass). */
export function codeOf(seeds: AnySeeds): string {
  return isGlass(seeds) ? encodeGlass(seeds) : isNeon(seeds) ? encodeNeon(seeds) : encodeSeeds(seeds);
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
  neon: "Soul Mark: Neon",
  glass: "Soul Mark: Glass",
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
export function seedsFrom(raw: Record<string, unknown>): AnySeeds {
  if (raw.kind !== undefined || raw.glass !== undefined) return glassSeedsFrom(raw);
  for (const k of GLASS_ONLY) {
    if (raw[k] !== undefined) throw new InputError("NO_GLASS", `${k} is only for Soul Mark: Glass, which needs "kind": "light" or "dark".`);
  }
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
  if (raw.glow === undefined) {
    for (const k of ["strength", "grid", "textGlow", "menuGrid"]) {
      if (raw[k] !== undefined) throw new InputError("NO_GLOW", `${k} is only for Soul Mark: Neon, which needs a glow.`);
    }
    return seeds;
  }
  return neonSeedsFrom(seeds, raw);
}

/** The Neon part of the seeds: the glow, its strength and the grid. A Neon fade has two colors. */
function neonSeedsFrom(seeds: SoulMarkSeeds, raw: Record<string, unknown>): NeonSeeds {
  if (seeds.color3 !== undefined || raw.shape === "elliptical") {
    throw new InputError("NEON_FADE", "A Soul Mark: Neon fade runs top to bottom with two colors: no color3 or elliptical shape.");
  }
  const neon: NeonSeeds = { ...seeds, glow: normalizeHex(raw.glow, "glow"), strength: 0.6, grid: true };
  if (raw.strength !== undefined) {
    const v = Number(raw.strength);
    if (!Number.isFinite(v) || v < 0 || v > 1) throw new InputError("BAD_STRENGTH", "strength must be a number from 0 to 1.");
    neon.strength = v;
  }
  if (raw.grid !== undefined) {
    if (typeof raw.grid !== "boolean") throw new InputError("BAD_GRID", "grid must be true or false.");
    neon.grid = raw.grid;
  }
  for (const k of ["textGlow", "menuGrid"] as const) {
    if (raw[k] === undefined) continue;
    if (typeof raw[k] !== "boolean") throw new InputError("BAD_SWITCH", `${k} must be true or false.`);
    if (raw[k]) neon[k] = true;
  }
  if (neon.menuGrid && !neon.grid) throw new InputError("NO_GRID", "menuGrid puts the grid on menus, so it needs grid on.");
  return neon;
}

/** The fields only Soul Mark: Glass has. */
const GLASS_ONLY = ["picture", "frost", "frostOn", "transparency", "linked", "darkened", "darkOn", "lines"];

/**
 * Glass seeds from loose input: "kind" (light or dark glass; "glass" is the same field) and an
 * accent, with the rest optional and each checked strictly. Glass has no background color: the
 * glass is the background.
 */
function glassSeedsFrom(raw: Record<string, unknown>): GlassSeeds {
  if (raw.kind !== undefined && raw.glass !== undefined && raw.kind !== raw.glass) {
    throw new InputError("BAD_GLASS", '"kind" and "glass" say different things; give one.');
  }
  const kind = raw.kind ?? raw.glass;
  if (kind !== "light" && kind !== "dark") throw new InputError("BAD_GLASS", 'kind must be "light" or "dark" glass.');
  for (const k of ["background", "color2", "color3", "shape", "glow", "tint", "character"]) {
    if (raw[k] !== undefined) throw new InputError("GLASS_FIELD", `${k} isn't part of Soul Mark: Glass; the glass is the background.`);
  }
  const seeds: GlassSeeds = { ...GLASS_STARTER, kind, accent: normalizeHex(raw.accent, "accent") };
  if (raw.picture !== undefined) {
    const ids = GLASS_PICTURES.map((p) => p.id);
    if (typeof raw.picture !== "string" || !(ids.includes(raw.picture) || raw.picture === "custom")) {
      throw new InputError("BAD_PICTURE", `picture must be one of ${ids.join(", ")}, or "custom".`);
    }
    seeds.picture = raw.picture;
  }
  for (const [k, lo, hi] of [["frost", 0, 100], ["darkened", 0, 100], ["transparency", 0, 1]] as const) {
    if (raw[k] === undefined) continue;
    const v = Number(raw[k]);
    if (!Number.isFinite(v) || v < lo || v > hi) throw new InputError("BAD_NUMBER", `${k} must be a number from ${lo} to ${hi}.`);
    seeds[k] = v;
  }
  for (const k of ["frostOn", "linked", "darkOn", "guard"] as const) {
    if (raw[k] === undefined) continue;
    if (typeof raw[k] !== "boolean") throw new InputError("BAD_SWITCH", `${k} must be true or false.`);
    seeds[k] = raw[k] as boolean;
  }
  if (raw.lines !== undefined) {
    if (raw.lines !== "light" && raw.lines !== "dark") throw new InputError("BAD_LINES", 'lines must be "light" or "dark".');
    seeds.lines = raw.lines;
  }
  return sanitizeGlassSeeds(seeds);
}

export function kindOf(seeds: AnySeeds): ThemeKind {
  if (isGlass(seeds)) return "glass";
  if (isNeon(seeds)) return "neon";
  return seeds.color2 ? "gradients" : "solid-tones";
}

/** A theme file's contents, checked: the theme it says must match its colors. */
export function parseThemeFile(data: unknown): ThemeFile {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new InputError("BAD_FILE", "A theme file is a JSON object with \"theme\" and \"seeds\".");
  }
  const d = data as Record<string, unknown>;
  if (d.theme !== "solid-tones" && d.theme !== "gradients" && d.theme !== "neon" && d.theme !== "glass") {
    throw new InputError("BAD_FILE", '"theme" must be "solid-tones", "gradients", "neon" or "glass".');
  }
  if (!d.seeds || typeof d.seeds !== "object") throw new InputError("BAD_FILE", '"seeds" is missing.');
  const seeds = seedsFrom(d.seeds as Record<string, unknown>);
  if (kindOf(seeds) !== d.theme) {
    throw new InputError(
      "THEME_MISMATCH",
      d.theme === "glass"
        ? 'A "glass" theme needs "kind": "light" or "dark".'
        : kindOf(seeds) === "glass"
          ? 'Only a "glass" theme has a glass "kind" in its seeds.'
          : d.theme === "neon"
        ? 'A "neon" theme needs a glow.'
        : kindOf(seeds) === "neon"
          ? 'Only a "neon" theme has a glow.'
          : d.theme === "gradients"
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
  if (/^SM4-/i.test(t)) {
    const seeds = decodeGlass(t);
    if (!seeds) throw new InputError("BAD_CODE", `${JSON.stringify(t)} is not a Soul Mark theme code.`);
    return { theme: "glass", seeds };
  }
  if (/^SM3-/i.test(t)) {
    const seeds = decodeNeon(t);
    if (!seeds) throw new InputError("BAD_CODE", `${JSON.stringify(t)} is not a Soul Mark theme code.`);
    return { theme: "neon", seeds };
  }
  if (/^SM[12]-/i.test(t)) {
    const seeds = decodeSeeds(t);
    if (!seeds) throw new InputError("BAD_CODE", `${JSON.stringify(t)} is not a Soul Mark theme code.`);
    return { theme: kindOf(seeds), seeds };
  }
  let data: unknown;
  try {
    data = JSON.parse(t);
  } catch {
    throw new InputError("BAD_INPUT", "Expected a theme code (SM1-…, SM2-…, SM3-… or SM4-…) or a theme file's JSON.");
  }
  return parseThemeFile(data);
}

export function themeFile(seeds: AnySeeds, name?: string): ThemeFile {
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
  /** Soul Mark: Neon only: the glow as used, how strong its bloom and grid are (0 to 1), glowing text and the grid on menus. */
  neon?: { glow: string; bloom: number; grid: number; text?: { tint: number; halo: number }; menuGrid?: number };
  /** Soul Mark: Glass only: each layer's fill (0 to 1), whether Transparency thins now, the blur, smoke and picture. */
  glass?: GlassReport;
}

export interface GlassReport {
  kind: "light" | "dark";
  glass: string;
  picture: string;
  fill: number;
  stackedFill: number;
  overWorkFill: number;
  thin: boolean;
  blur: number;
  smoke: number;
  textFade: number;
  lines: string;
}

/** Composes the theme and says, measured, whether every text reads (WCAG AA). */
export function checkTheme(file: ThemeFile): CheckResult {
  if (isGlass(file.seeds)) return checkGlass(file, composeGlass(file.seeds));
  const neon = isNeon(file.seeds) ? composeNeon(file.seeds) : undefined;
  const mark = neon ? neon.mark : composeSoulMark(file.seeds);
  // Measured again here, at every point of a gradient (and beside Neon's glow and on its grid),
  // rather than trusted.
  const failures = [
    ...tokensAcrossGradient(mark).flatMap((t) => measureText(t)),
    ...(neon ? neonMeasurements(neon) : []),
  ].filter((m) => m.ratio < m.floor - 1e-9);
  const reported = neon ? neon.shortfalls : mark.shortfalls;
  const shortfalls = reported.length ? reported : failures.length ? [worst(failures)] : [];
  return {
    theme: THEME_NAMES[file.theme],
    ...(file.name ? { name: file.name } : {}),
    code: codeOf(file.seeds),
    guard: file.seeds.guard !== false,
    readable: shortfalls.length === 0,
    shortfalls: shortfalls.map((s) => ({ ...s, ratio: round2(s.ratio) })),
    notes: [...mark.notes, ...(neon?.notes ?? [])].map((n) => ({
      kind: n.kind,
      seed: n.seed,
      chosen: n.chosen,
      used: n.used,
      message: n.message,
    })),
    colors: {
      background: mark.tokens.bg,
      accent: mark.tokens.accent,
      text: mark.tokens.fg,
      panel: mark.tokens.panel,
    },
    ...(mark.gradient ? { gradient: { shape: mark.gradient.shape, stops: mark.gradient.stops } } : {}),
    ...(neon ? { neon: neonReport(neon) } : {}),
  };
}

/** Glass: every layer measured again here, over black and white behind it, rather than trusted. */
function checkGlass(file: ThemeFile, g: SoulMarkGlass): CheckResult {
  const t = g.mark.tokens;
  const failures = [...pageMeasurements(t, g.fill), ...stackedMeasurements(t, g.fill, g.stackedFill)].filter(
    (m) => m.ratio < m.floor - 1e-9,
  );
  const shortfalls = g.shortfalls.length ? g.shortfalls : failures.length ? [worst(failures)] : [];
  return {
    theme: THEME_NAMES.glass,
    ...(file.name ? { name: file.name } : {}),
    code: codeOf(file.seeds),
    guard: file.seeds.guard !== false,
    readable: shortfalls.length === 0,
    shortfalls: shortfalls.map((s) => ({ ...s, ratio: round2(s.ratio) })),
    notes: [...g.mark.notes, ...g.notes].map((n) => ({ kind: n.kind, seed: n.seed, chosen: n.chosen, used: n.used, message: n.message })),
    colors: { background: t.bg, accent: t.accent, text: t.fg, panel: t.panel },
    glass: glassReport(g),
  };
}

function glassReport(g: SoulMarkGlass): GlassReport {
  return {
    kind: g.seeds.kind,
    glass: g.glass,
    picture: g.seeds.picture,
    fill: g.fill,
    stackedFill: g.stackedFill,
    overWorkFill: g.overWorkFill,
    thin: g.thin,
    blur: Math.round(g.blur * 10) / 10,
    smoke: Math.round(g.smoke * 1000) / 1000,
    textFade: g.textFade,
    lines: g.lines,
  };
}

function neonReport(n: SoulMarkNeon): NonNullable<CheckResult["neon"]> {
  return {
    glow: n.glow,
    bloom: n.bloom,
    grid: n.grid,
    ...(n.text ? { text: { tint: n.text.tint, halo: n.text.halo } } : {}),
    ...(n.menuGrid > 0 ? { menuGrid: n.menuGrid } : {}),
  };
}

/** Neon's own measurements: the glow against what it outlines, and text beside the bloom and on the grid. */
function neonMeasurements(n: SoulMarkNeon) {
  const pages = pageTokens(n.mark);
  const outlines = pages.flatMap((t) =>
    [t.bg, t.panel].map((s) => ({ what: `glow on ${s}`, ratio: contrastRatio(n.glow, s), floor: NON_TEXT })),
  );
  const glowing = n.text || n.menuGrid > 0
    ? glowMeasurements(pages, n.glow, Math.max(n.bloom * BLOOM_MAX, n.grid * GRID_MAX), {
        tint: n.text?.tint ?? 0,
        halo: n.text?.halo ?? 0,
        menu: n.menuGrid,
        fade: n.textFade ?? 1,
      })
    : [];
  return [
    ...outlines,
    ...neonTextMeasurements(pages, n.glow, n.bloom * BLOOM_MAX),
    ...neonTextMeasurements(pages, n.glow, n.grid * GRID_MAX),
    ...glowing,
  ];
}

function worst(ms: { what: string; ratio: number; floor: number }[]): Shortfall {
  const w = ms.reduce((a, b) => (b.ratio / b.floor < a.ratio / a.floor ? b : a));
  return { label: w.what, ratio: w.ratio, floor: w.floor };
}

const round2 = (n: number) => Math.floor(n * 100) / 100;

export type ExportFormat = "css" | "json" | "tokens" | "tailwind" | "craft";
export const EXPORT_FORMATS: ExportFormat[] = ["css", "json", "tokens", "tailwind", "craft"];

/** The theme in a format an app or design tool can use. */
export function exportTheme(file: ThemeFile, format: ExportFormat): string {
  if (format === "craft") return JSON.stringify(exportCraft(file), null, 2) + "\n";
  if (isGlass(file.seeds)) return exportGlass(file, composeGlass(file.seeds), format);
  const neon = isNeon(file.seeds) ? composeNeon(file.seeds) : undefined;
  const mark = neon ? neon.mark : composeSoulMark(file.seeds);
  switch (format) {
    case "css":
      return cssText(mark, neon);
    case "json":
      return JSON.stringify(composed(file, mark), null, 2);
    case "tokens":
      return JSON.stringify(designTokens(file, mark, neon), null, 2);
    case "tailwind":
      return JSON.stringify(tailwindColors(mark, neon), null, 2);
    default:
      throw new InputError("BAD_FORMAT", `format must be one of ${EXPORT_FORMATS.join(", ")}.`);
  }
}

/**
 * A suite theme for ArtCraft's Crafting Apps (craft-design-theme v1). The suite's themes are
 * solid colors, so only Soul Mark: Solid Tones fits; the others are refused with the reason.
 */
function exportCraft(file: ThemeFile): CraftTheme {
  const seeds = file.seeds;
  if (isGlass(seeds) || isNeon(seeds) || seeds.color2)
    throw new InputError(
      "NOT_SOLID",
      `The Crafting Apps' themes are solid colors, so only Soul Mark: Solid Tones exports to them (this is ${THEME_NAMES[file.theme]}).`,
    );
  if (seeds.guard === false)
    throw new InputError("GUARD_OFF", "Export to the Crafting Apps with the readability guard on: their themes must read everywhere.");
  return craftTheme(composeSoulMark(seeds), file.name ?? "My theme", codeOf(seeds));
}

/** Glass in each format: the base theme on the glass color, plus the glass layers. */
function exportGlass(file: ThemeFile, g: SoulMarkGlass, format: ExportFormat): string {
  const glassColor = { glass: g.glass };
  switch (format) {
    case "css": {
      const vars = { ...cssVariables({ ...g.mark, gradient: undefined }), ...glassVariables(g) };
      return `:root {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}\n`;
    }
    case "json":
      return JSON.stringify(composed(file), null, 2);
    case "tokens": {
      const tokens = designTokens(file, g.mark);
      return JSON.stringify(tokens, null, 2);
    }
    case "tailwind":
      return JSON.stringify({ colors: { "soul-mark": { ...tokenColors(g.mark.tokens), ...glassColor } } }, null, 2);
    default:
      throw new InputError("BAD_FORMAT", `format must be one of ${EXPORT_FORMATS.join(", ")}.`);
  }
}

/** The composed theme (schema/composed.schema.json). */
export function composed(file: ThemeFile, mark?: SoulMark) {
  if (isGlass(file.seeds)) {
    const g = composeGlass(file.seeds);
    return {
      theme: THEME_NAMES.glass,
      ...(file.name ? { name: file.name } : {}),
      code: codeOf(file.seeds),
      seeds: file.seeds,
      tokens: tokenColors(g.mark.tokens),
      scheme: g.mark.tokens.scheme,
      textFade: g.textFade,
      glass: { ...glassReport(g), css: glassVariables(g) },
    };
  }
  mark ??= composeSoulMark(file.seeds);
  const neon = isNeon(file.seeds) ? composeNeon(file.seeds) : undefined;
  return {
    theme: THEME_NAMES[file.theme],
    ...(file.name ? { name: file.name } : {}),
    code: codeOf(file.seeds),
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
    ...(neon ? { neon: { ...neonReport(neon), css: neonVariables(neon) } } : {}),
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

function cssText(mark: SoulMark, neon?: SoulMarkNeon): string {
  const vars = { ...cssVariables(mark), ...(neon ? neonVariables(neon) : {}) };
  return `:root {\n${Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}\n`;
}

/** W3C Design Tokens (Community Group format): colors, and the gradient as a gradient token. */
function designTokens(file: ThemeFile, mark: SoulMark, neon?: SoulMarkNeon) {
  const colors = Object.fromEntries(
    Object.entries({ ...tokenColors(mark.tokens), ...(neon ? { glow: neon.glow } : {}) }).map(([name, hex]) => [
      name,
      { $type: "color", $value: hex },
    ]),
  );
  const g = mark.gradient;
  return {
    "soul-mark": {
      $description: `${THEME_NAMES[file.theme]}${file.name ? `: ${file.name}` : ""}, theme code ${codeOf(file.seeds)}`,
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
function tailwindColors(mark: SoulMark, neon?: SoulMarkNeon) {
  return {
    colors: { "soul-mark": { ...tokenColors(mark.tokens), ...(neon ? { glow: neon.glow } : {}) } },
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
    signatureNeon: NEON_SIGNATURES.map(({ name, ...seeds }) => ({ theme: "neon", name, code: encodeNeon(seeds), ...seeds })),
    signatureGlass: GLASS_SIGNATURES.map(({ name, ...seeds }) => ({ theme: "glass", name, code: encodeGlass(seeds), ...seeds })),
    palettes: {
      backgrounds: {
        primaries: rows(PRIMARY_BACKGROUNDS),
        light: rows(LIGHT_BACKGROUNDS),
        deep: rows(DEEP_BACKGROUNDS),
        bold: rows(BOLD_BACKGROUNDS),
      },
      accents: { classic: rows(ACCENTS), wheel: rows(WHEEL), light: rows(WHEEL_LIGHT), deep: rows(WHEEL_DEEP) },
      gradientFades: rows(GRADIENT_FADES),
      neon: {
        glows: rows(NEON_GLOWS),
        backgrounds: rows(NEON_BACKGROUNDS),
        fades: NEON_FADES.map(([name, top, bottom]) => ({ name, colors: [top, bottom] })),
      },
      glass: {
        pictures: GLASS_PICTURES.map((p) => ({ ...p })),
      },
    },
  };
}

/** A signature look by name (case and spacing ignored), as a theme file. */
export function signatureByName(name: string): ThemeFile | null {
  const key = name.toLowerCase().replace(/\s+/g, " ").trim();
  // "Glass: Aurora" asks for Glass's look when another theme has the same name.
  const glassKey = key.replace(/^glass:\s*/, "");
  if (glassKey !== key) return glassSignature(glassKey);
  const t = SIGNATURE_THEMES.find((s) => s.name.toLowerCase() === key);
  if (t) return themeFile(seedsFrom({ background: t.background, accent: t.accent }), t.name);
  const g = SIGNATURE_GRADIENTS.find((s) => s.name.toLowerCase() === key);
  if (g) {
    return themeFile(
      seedsFrom({ background: g.colors[0], color2: g.colors[1], color3: g.colors[2], shape: g.shape, accent: g.accent }),
      g.name,
    );
  }
  const n = NEON_SIGNATURES.find((s) => s.name.toLowerCase() === key);
  if (n) {
    const { name: _name, shape: _shape, ...seeds } = n;
    return themeFile(seedsFrom({ ...seeds, ...(seeds.color2 ? {} : { color2: undefined }) }), n.name);
  }
  return glassSignature(key);
}

function glassSignature(key: string): ThemeFile | null {
  const s = GLASS_SIGNATURES.find((x) => x.name.toLowerCase() === key);
  if (!s) return null;
  const { name, kind, guard: _guard, fill: _fill, ...rest } = s;
  return themeFile(seedsFrom({ kind, ...rest }), name);
}

/** Contrast between two colors, for quick questions. */
export function contrastOf(a: string, b: string): number {
  return round2(contrastRatio(normalizeHex(a, "first color"), normalizeHex(b, "second color")));
}
