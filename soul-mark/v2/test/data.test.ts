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
  seedsFrom,
  themeFile,
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
      "Borealis",
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

describe("Soul Mark: Glass files", () => {
  it("the schema and the loader both reject a Glass theme with a background", () => {
    const bad = { theme: "glass", seeds: { kind: "light", accent: "#2D81FF", background: "#000000" } };
    expect(v.theme(bad)).toBe(false);
    expect(() => parseThemeFile(bad)).toThrow(/background/);
  });

  it("the schema and the loader both reject Glass fields on another theme", () => {
    const bad = { theme: "solid-tones", seeds: { background: "#101B44", accent: "#1CB6BE", frost: 30 } };
    expect(v.theme(bad)).toBe(false);
    expect(() => parseThemeFile(bad)).toThrow(/Glass/);
  });

  it("a saved Glass theme loads back the same", () => {
    const file = themeFile(seedsFrom({ kind: "dark", accent: "#10B981", picture: "aurora", darkOn: true, darkened: 60, linked: false }), "Mine");
    const again = parseThemeFile(JSON.parse(JSON.stringify(file)));
    expect(again).toEqual(file);
    expect(v.theme(file)).toBe(true);
  });

  it("every Glass signature is readable, and its report and composed theme match the schemas", () => {
    for (const s of signaturesData().signatureGlass) {
      const file = signatureByName(`Glass: ${s.name}`)!;
      const r = checkTheme(file);
      expect([s.name, r.readable, r.code]).toEqual([s.name, true, s.code]);
      expect(v.check(r), JSON.stringify(v.check.errors)).toBe(true);
      expect(v.composed(composed(file)), JSON.stringify(v.composed.errors)).toBe(true);
    }
  });

  it("exports Glass's layers in CSS", () => {
    const css = exportTheme(signatureByName("Quartz")!, "css");
    for (const name of ["--glass-fill", "--glass-fill-stacked", "--glass-fill-total", "--glass-blur", "--glass-rgb"]) expect(css).toContain(name);
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

  it("every Soul Mark: Neon signature is readable, with its glow and grid as picked", () => {
    for (const n of signaturesData().signatureNeon) {
      const r = checkTheme(signatureByName(n.name)!);
      expect([n.name, r.theme, r.readable, r.code]).toEqual([n.name, "Soul Mark: Neon", true, n.code]);
      expect(r.neon).toEqual({ glow: n.glow, bloom: n.strength, grid: n.grid ? n.strength : 0 });
      expect(v.check(r), JSON.stringify(v.check.errors)).toBe(true);
    }
  });

  it("Neon's switches: glowing text and the grid on menus are checked, reported and schema-valid", () => {
    const on = checkTheme(themeFile(seedsFrom({ background: "#000000", accent: "#39FF88", glow: "#39FF88", textGlow: true, menuGrid: true })));
    expect(on.readable).toBe(true);
    expect(on.code).toMatch(/-t-m$/);
    expect(on.neon?.text?.halo).toBeGreaterThan(0);
    expect(on.neon?.menuGrid).toBeGreaterThan(0);
    expect(v.check(on), JSON.stringify(v.check.errors)).toBe(true);
    const off = checkTheme(themeFile(seedsFrom({ background: "#000000", accent: "#39FF88", glow: "#39FF88", textGlow: true, guard: false })));
    expect(off.readable).toBe(false);
    expect(off.shortfalls.map((s) => s.label)).toContain("Glowing text");
    expect(() => seedsFrom({ background: "#000000", accent: "#39FF88", textGlow: true })).toThrow(/only for Soul Mark: Neon/);
    expect(() => seedsFrom({ background: "#000000", accent: "#39FF88", glow: "#39FF88", grid: false, menuGrid: true })).toThrow(/needs grid/);
    const file = { theme: "neon", seeds: { background: "#000000", accent: "#39FF88", glow: "#39FF88", textGlow: true, menuGrid: true } };
    expect(v.theme(file)).toBe(true);
    expect(v.theme({ theme: "solid-tones", seeds: { background: "#000000", accent: "#39FF88", textGlow: true } })).toBe(false);
    const json = JSON.parse(exportTheme(parseThemeFile(file), "json"));
    expect(v.composed(json), JSON.stringify(v.composed.errors)).toBe(true);
    expect(json.neon.css["--st-white-rgb"]).toBeDefined();
  });

  it("a Neon glow too dim to see is reported with the guard off, and fixed in shade with it on", () => {
    const seeds = { background: "#000000", accent: "#00E5FF", glow: "#003A40" };
    const off = checkTheme(themeFile(seedsFrom({ ...seeds, guard: false })));
    expect(off.readable).toBe(false);
    expect(off.shortfalls.map((s) => s.label)).toContain("Neon outlines");
    const on = checkTheme(themeFile(seedsFrom(seeds)));
    expect(on.readable).toBe(true);
    expect(on.notes.map((n) => n.seed)).toContain("glow");
    expect(v.check(on), JSON.stringify(v.check.errors)).toBe(true);
  });

  it("Neon theme files: the schema and the loader agree on what a Neon theme needs", () => {
    const neon = { theme: "neon", seeds: { background: "#070B14", accent: "#00E5FF", glow: "#00E5FF" } };
    expect(v.theme(neon)).toBe(true);
    expect(parseThemeFile(neon).theme).toBe("neon");
    const noGlow = { theme: "neon", seeds: { background: "#070B14", accent: "#00E5FF" } };
    expect(v.theme(noGlow)).toBe(false);
    expect(() => parseThemeFile(noGlow)).toThrow(/needs a glow/);
    const glowOnSolid = { theme: "solid-tones", seeds: { background: "#070B14", accent: "#00E5FF", glow: "#00E5FF" } };
    expect(v.theme(glowOnSolid)).toBe(false);
    expect(() => parseThemeFile(glowOnSolid)).toThrow(/Only a "neon" theme/);
    expect(() => seedsFrom({ background: "#070B14", accent: "#00E5FF", strength: 0.5 })).toThrow(/only for Soul Mark: Neon/);
    expect(() => seedsFrom({ background: "#070B14", accent: "#00E5FF", glow: "#00E5FF", strength: 2 })).toThrow(/strength/);
    expect(() =>
      seedsFrom({ background: "#070B14", accent: "#00E5FF", glow: "#00E5FF", color2: "#000000", color3: "#101B44" }),
    ).toThrow(/two colors/);
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
    expect(themeFromText("SM3-070B14-x-00E5FF-00E5FF-60-g-50-cool").theme).toBe("neon");
    expect(() => themeFromText("SM3-070B14-x-00E5FF")).toThrow(/theme code/);
    expect(() => themeFromText("SM2-nope")).toThrow(/theme code/);
    expect(() => themeFromText("make it pretty")).toThrow(/theme code/);
  });
});

describe("exporting", () => {
  const aurora = signatureByName("Borealis")!;
  const starter = signatureByName("Midnight and Teal")!;

  it("craft exports Solid Tones only, guard on, as a suite theme that reads", () => {
    const t = JSON.parse(exportTheme(starter, "craft"));
    expect(t.schema).toBe("craft-design-theme");
    expect(t.schema_version).toBe(1);
    expect(t.name).toBe("Soul Mark: Midnight and Teal");
    expect(t.soul_mark.code).toMatch(/^SM1-/);
    expect(t.seeds.status).toEqual(expect.objectContaining({ good: expect.any(String), bad: expect.any(String) }));
    expect(() => exportTheme(aurora, "craft")).toThrow(/solid colors/);
    expect(() => exportTheme(signatureByName("Blueprint")!, "craft")).toThrow(/solid colors/);
    expect(() => exportTheme(signatureByName("Quartz")!, "craft")).toThrow(/solid colors/);
    const off = themeFile(seedsFrom({ background: "#101B44", accent: "#1CB6BE", guard: false }));
    expect(() => exportTheme(off, "craft")).toThrow(/guard on/);
  });

  it("Neon exports carry the glow: css variables, json, tokens and tailwind", () => {
    const hud = signatureByName("Blueprint")!;
    const css = exportTheme(hud, "css");
    expect(css).toContain("--st-neon-glow-rgb: 0 229 255;");
    expect(css).toContain("--st-gradient-page:");
    const json = JSON.parse(exportTheme(hud, "json"));
    expect(v.composed(json), JSON.stringify(v.composed.errors)).toBe(true);
    expect(json.neon.glow).toBe("#00E5FF");
    expect(JSON.parse(exportTheme(hud, "tokens"))["soul-mark"].glow).toEqual({ $type: "color", $value: "#00E5FF" });
    expect(JSON.parse(exportTheme(hud, "tailwind")).colors["soul-mark"].glow).toBe("#00E5FF");
  });

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
