import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  checkTheme,
  composed,
  exportTheme,
  parseThemeFile,
  signatureByName,
  signaturesData,
  themeFromText,
} from "../src/tools";
import { here, readJson, validators } from "./helpers";

const v = validators();
const EXAMPLES = readdirSync(here("examples")).filter((f) => f.endsWith(".theme.json"));

describe("data files", () => {
  it("data/signatures.json is current with presets.ts (run `npm run data` after changing presets)", () => {
    expect(readJson("data/signatures.json")).toEqual(JSON.parse(JSON.stringify(signaturesData())));
  });

  it("lists every signature gradient, marking the three-color ones", () => {
    const g = signaturesData().signatureGradients;
    expect(g.filter((x) => x.colorCount === 3).map((x) => x.name)).toEqual([
      "Aurora",
      "Synthwave",
      "Nebula",
      "Ember",
      "Twilight",
    ]);
  });
});

describe("theme files and the schema", () => {
  it.each(EXAMPLES)("%s matches the schema and loads", (f) => {
    const data = readJson(`examples/${f}`);
    expect(v.theme(data), JSON.stringify(v.theme.errors)).toBe(true);
    expect(parseThemeFile(data).theme).toBe(data.theme);
  });

  it("the schema and the loader both reject a gradient without color2", () => {
    const bad = { theme: "gradients", seeds: { background: "#101B44", accent: "#1CB6BE" } };
    expect(v.theme(bad)).toBe(false);
    expect(() => parseThemeFile(bad)).toThrow(/color2/);
  });

  it("the schema and the loader both reject a solid theme carrying a gradient", () => {
    const bad = { theme: "solid-tones", seeds: { background: "#101B44", accent: "#1CB6BE", color2: "#000000" } };
    expect(v.theme(bad)).toBe(false);
    expect(() => parseThemeFile(bad)).toThrow(/gradients/);
  });

  it("rejects a color 2 that repeats the background, and colors that aren't hex", () => {
    expect(() =>
      parseThemeFile({ theme: "gradients", seeds: { background: "#101B44", accent: "#1CB6BE", color2: "#101b44" } }),
    ).toThrow(/differ/);
    expect(() => parseThemeFile({ theme: "solid-tones", seeds: { background: "navy", accent: "#1CB6BE" } })).toThrow(
      /hex/,
    );
    expect(v.theme({ theme: "solid-tones", seeds: { background: "navy", accent: "#1CB6BE" } })).toBe(false);
  });
});

describe("checking", () => {
  it.each(EXAMPLES)("%s: the report matches the schema", (f) => {
    const r = checkTheme(parseThemeFile(readJson(`examples/${f}`)));
    expect(v.check(r), JSON.stringify(v.check.errors)).toBe(true);
  });

  it("every signature look is readable", () => {
    for (const t of [...signaturesData().signatureThemes, ...signaturesData().signatureGradients]) {
      const file = signatureByName(t.name)!;
      expect([t.name, checkTheme(file).readable]).toEqual([t.name, true]);
    }
  });

  it("a guard-off theme that falls short is reported, with ratios rounded down", () => {
    const r = checkTheme(parseThemeFile(readJson("examples/red-to-white-guard-off.theme.json")));
    expect(r.readable).toBe(false);
    expect(r.shortfalls.length).toBeGreaterThan(0);
    for (const s of r.shortfalls) expect(s.ratio).toBeLessThan(s.floor);
  });

  it("reads theme codes, and rejects text that is neither a code nor a theme file", () => {
    expect(themeFromText("SM2-0E1A2E-070B14-v-00E5FF-50-soft").theme).toBe("gradients");
    expect(themeFromText("SM1-101B44-1CB6BE-50-soft").theme).toBe("solid-tones");
    expect(() => themeFromText("SM2-nope")).toThrow(/theme code/);
    expect(() => themeFromText("make it pretty")).toThrow(/theme code/);
  });
});

describe("exporting", () => {
  const aurora = signatureByName("Aurora")!;
  const starter = signatureByName("Midnight and Teal")!;

  it("json matches the composed schema", () => {
    expect(v.composed(composed(aurora)), JSON.stringify(v.composed.errors)).toBe(true);
    expect(v.composed(JSON.parse(exportTheme(starter, "json")))).toBe(true);
  });

  it("css carries the gradient for gradients, and none for solid tones", () => {
    expect(exportTheme(aurora, "css")).toMatch(/--st-gradient-page: linear-gradient\(180deg, #0D2661 0%, #0C2F1C 50%, #0B0E14 100%\)/);
    expect(exportTheme(starter, "css")).not.toMatch(/--st-gradient/);
    expect(exportTheme(starter, "css")).toMatch(/^:root \{\n  --st-white-rgb: /);
  });

  it("design tokens follow the W3C format, with the gradient as a gradient token", () => {
    const t = JSON.parse(exportTheme(aurora, "tokens"))["soul-mark"];
    expect(t.background).toEqual({ $type: "color", $value: "#0D2661" });
    expect(t.gradient.$type).toBe("gradient");
    expect(t.gradient.$value).toEqual([
      { color: "#0D2661", position: 0 },
      { color: "#0C2F1C", position: 0.5 },
      { color: "#0B0E14", position: 1 },
    ]);
  });

  it("tailwind gives colors, and a background image for a gradient", () => {
    const tw = JSON.parse(exportTheme(aurora, "tailwind"));
    expect(tw.colors["soul-mark"].background).toBe("#0D2661");
    expect(tw.backgroundImage["soul-mark-gradient"]).toMatch(/^linear-gradient/);
  });
});
