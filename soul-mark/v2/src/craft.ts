// Soul Mark in ArtCraft's Crafting Apps. The apps share one theme system (storytold/craft-libs,
// crates/theme, docs/suite-themes.md): a theme is a `craft-design-theme` v1 JSON file of seeds
// (neutral, accent, four status colors) plus colors "pinned" per mode. One file in the suite
// folder restyles every app on that system.
//
// This turns a composed Soul Mark into such a file. It pins the colors Soul Mark computes and
// proves readable, and leaves the rest to the suite's own derivation, which meets the suite's
// minimums for anything unpinned. Every pinned pair is measured here against the suite's rules
// (the table in docs/suite-themes.md), so the file resolves with no contrast warnings. A pinned
// color that would miss is moved in shade only (as Soul Mark's guard does), or, for the accent's
// fill, left unpinned for the suite to fit.
//
// The suite asks for opaque surfaces and has no gradients, glow or see-through layers, so only
// Soul Mark: Solid Tones (and later High Contrast) fits. Gradients, Neon and Glass are refused
// with a plain reason rather than flattened.
import { contrastRatio, type Hex, mix, nearestLightness } from "./contrast";
import { AA, NON_TEXT, type SoulMark } from "./soul-mark";

/** The suite's minimums (Standard contrast). */
export const CRAFT_TEXT = AA;
export const CRAFT_MARK = NON_TEXT;

/** How strong the suite's two lesser text colors are, as opacities of body text on the page. */
const MUTED_OPACITY = 0.75;
const FAINT_OPACITY = 0.55;
/** Hover and pressed: body text laid over the panel at these opacities. */
const HOVER_MIX = 0.08;
const PRESSED_MIX = 0.14;
/** A selected row: the accent laid over the panel. */
const SELECTED_MIX = 0.28;

/** A `craft-design-theme` v1 file. Paths are flat dotted strings, as the format asks. */
export interface CraftTheme {
  schema: "craft-design-theme";
  schema_version: 1;
  id: string;
  name: string;
  version: number;
  variants: "light" | "dark";
  contrast_intent: "standard";
  seeds: {
    neutral: Hex;
    accent: Hex;
    status: { good: Hex; warn: Hex; bad: Hex; info: Hex };
  };
  shape: null;
  light?: Record<string, Hex>;
  dark?: Record<string, Hex>;
  /** Kept byte for byte by the suite's store (unknown keys outside pin maps are allowed). */
  soul_mark: { code: string; theme: "Soul Mark: Solid Tones"; left_to_the_suite: string[] };
}

/** One pinned pair the suite will measure, as this file states it. */
export interface CraftPair {
  what: string;
  ratio: number;
  floor: number;
}

/** Ids the suite accepts: `[a-z0-9][a-z0-9._-]{1,63}`, never `craft.`. */
export function craftId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const id = `soul-mark.${slug || "theme"}`;
  return id.slice(0, 64).replace(/[-.]+$/, "");
}

/**
 * The suite theme for a composed Solid Tones theme. `code` is its SM1 code, kept in the file so
 * the theme can be rebuilt in Soul Mark.
 */
export function craftTheme(mark: SoulMark, name: string, code: string): CraftTheme {
  const t = mark.tokens;
  const status = statusSeeds(mark);

  const surfaces = {
    "surface.background": t.bg,
    "surface.chrome": t.bg,
    "surface.panel": t.panel,
    "surface.raised": t.controls,
    "surface.sunken": t.sunken,
    "surface.canvas": t.black,
  };
  const hover = mix(t.panel, t.fg, HOVER_MIX);
  const pressed = mix(t.panel, t.fg, PRESSED_MIX);
  const textGrounds = [t.bg, t.panel, t.controls, t.sunken, hover, pressed];

  // Body text, then the two lesser texts: faded like Soul Mark's own, then moved in shade only
  // until they read on every ground the suite measures them on.
  const normal = readable(t.fg, textGrounds, CRAFT_TEXT);
  const muted = readable(mix(t.bg, normal, fade(t.textFade, MUTED_OPACITY)), textGrounds, CRAFT_TEXT);
  const faint = readable(mix(t.bg, normal, fade(t.textFade, FAINT_OPACITY)), textGrounds, CRAFT_TEXT);

  // A selected row keeps body text on it (the suite's default), so the fill gives way, not the text.
  const selected = nearestLightness(
    mix(t.panel, t.accent, SELECTED_MIX),
    (c) => contrastRatio(normal, c) >= CRAFT_TEXT,
    (c) => contrastRatio(normal, c),
  ).hex;

  const accentText = readable(t.accentText, [t.panel, t.controls, t.sunken], CRAFT_TEXT);
  const focus = readable(t.accentInk, [t.bg, t.panel, t.controls, t.sunken], CRAFT_MARK);

  const pins: Record<string, Hex> = {
    ...surfaces,
    "text.normal": normal,
    "text.muted": muted,
    "text.faint": faint,
    "state.hover": hover,
    "state.pressed": pressed,
    "state.selected": selected,
    "accent.text": accentText,
    "line.focus": focus,
    "accent.border": t.accentLine,
  };

  // The suite has two accent fills. `accent.strong` carries text (buttons): it is Soul Mark's
  // accent exactly, with Soul Mark's light label, a pair Soul Mark's guard already proves readable.
  // `accent.solid` draws what has no text (check marks, slider fills) and must reach 3:1 on the
  // control surfaces. Soul Mark lets a labelled button sit closer to the panel than that, so where
  // it does, this fill moves in shade only, as little as it needs, with whichever of Soul Mark's
  // inks reads on it. Only when no shade of the hue can do both is it left to the suite to fit.
  const left: string[] = [];
  if (contrastRatio(t.white, t.accent) >= CRAFT_TEXT) {
    pins["accent.strong"] = t.accent;
    pins["text.on_strong"] = t.white;
  } else {
    left.push("accent.strong", "text.on_strong");
  }
  const controlGrounds = [t.panel, t.controls, t.sunken];
  const marksShow = (c: Hex) => controlGrounds.every((s) => contrastRatio(c, s) >= CRAFT_MARK);
  const labelInk = (c: Hex): Hex | null =>
    contrastRatio(t.white, c) >= CRAFT_TEXT ? t.white : contrastRatio(t.black, c) >= CRAFT_TEXT ? t.black : null;
  const fill = nearestLightness(
    t.accent,
    (c) => marksShow(c) && labelInk(c) !== null,
    (c) => Math.min(...controlGrounds.map((s) => contrastRatio(c, s))),
  );
  const ink = fill.passed ? labelInk(fill.hex) : null;
  if (ink) {
    pins["accent.solid"] = fill.hex;
    pins["text.on_accent"] = ink;
  } else {
    left.push("accent.solid", "text.on_accent");
  }

  return {
    schema: "craft-design-theme",
    schema_version: 1,
    id: craftId(name),
    name: `Soul Mark: ${name}`,
    version: 1,
    variants: t.scheme,
    contrast_intent: "standard",
    seeds: { neutral: t.panel, accent: t.accent, status },
    shape: null,
    [t.scheme]: pins,
    soul_mark: { code, theme: "Soul Mark: Solid Tones", left_to_the_suite: left },
  };
}

/** Every pinned pair the suite's Standard rules measure, as the file pins them. */
export function craftPairs(theme: CraftTheme): CraftPair[] {
  const p = (theme[theme.variants] ?? {}) as Record<string, Hex>;
  const out: CraftPair[] = [];
  const pair = (what: string, a: Hex | undefined, b: Hex | undefined, floor: number) => {
    if (a && b) out.push({ what, ratio: contrastRatio(a, b), floor });
  };
  const textGrounds = [
    "surface.background",
    "surface.panel",
    "surface.chrome",
    "surface.raised",
    "surface.sunken",
    "state.hover",
    "state.pressed",
  ];
  for (const ink of ["text.normal", "text.muted", "text.faint"])
    for (const ground of textGrounds) pair(`${ink} on ${ground}`, p[ink], p[ground], CRAFT_TEXT);
  pair("text.on_selected on state.selected", p["text.normal"], p["state.selected"], CRAFT_TEXT);
  for (const ground of ["surface.panel", "surface.raised", "surface.sunken"]) {
    pair(`accent.text on ${ground}`, p["accent.text"], p[ground], CRAFT_TEXT);
    pair(`accent.solid on ${ground}`, p["accent.solid"], p[ground], CRAFT_MARK);
  }
  pair("text.on_accent on accent.solid", p["text.on_accent"], p["accent.solid"], CRAFT_TEXT);
  pair("text.on_strong on accent.strong", p["text.on_strong"], p["accent.strong"], CRAFT_TEXT);
  for (const ground of ["surface.background", "surface.panel", "surface.chrome", "surface.raised", "surface.sunken"])
    pair(`line.focus on ${ground}`, p["line.focus"], p[ground], CRAFT_MARK);
  return out;
}

/** Problems the suite's own parser would refuse (docs/suite-themes.md, "Theme file"). */
export function craftFileProblems(theme: CraftTheme): string[] {
  const problems: string[] = [];
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(theme.id)) problems.push(`id ${theme.id} isn't a valid id`);
  if (theme.id.startsWith("craft.")) problems.push("ids starting craft. are kept for built-ins");
  const other = theme.variants === "light" ? "dark" : "light";
  if (theme[other] && Object.keys(theme[other]!).length) problems.push(`pins for ${other}, a mode the theme lacks`);
  for (const [path, value] of Object.entries(theme[theme.variants] ?? {})) {
    if (!/^[a-z_]+(\.[a-z_]+)+$/.test(path)) problems.push(`${path} isn't a flat dotted path`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) problems.push(`${path}: ${value} isn't an opaque #RRGGBB color`);
  }
  if (new TextEncoder().encode(JSON.stringify(theme)).length > 256 * 1024) problems.push("over 256 KiB");
  return problems;
}

/** The suite's status seeds: Soul Mark's own green, amber, red and blue, fitted to this theme. */
function statusSeeds(mark: SoulMark): CraftTheme["seeds"]["status"] {
  const ink = (family: string): Hex => {
    const found = mark.meaning.find((m) => m.variable === `--st-${family}-500-rgb`);
    if (!found) throw new Error(`no ${family}-500 status color`);
    return found.used;
  };
  return { good: ink("green"), warn: ink("amber"), bad: ink("red"), info: ink("blue") };
}

/** Soul Mark's fade: text at `opacity` draws at 1 - (1 - opacity) * textFade. */
function fade(textFade: number, opacity: number): number {
  return 1 - (1 - opacity) * textFade;
}

/** `ink`, or the nearest shade of it that reaches `floor` on every ground. */
function readable(ink: Hex, grounds: Hex[], floor: number): Hex {
  const worst = (c: Hex) => Math.min(...grounds.map((g) => contrastRatio(c, g)));
  return nearestLightness(ink, (c) => worst(c) >= floor, worst).hex;
}
