import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { here } from "./helpers";

const cli = (...args: string[]) => {
  const r = spawnSync("node", [here("dist/cli.js").pathname, ...args], { encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

describe("the soul-mark command", () => {
  it("--help explains every command and exits 0", () => {
    const r = cli("--help");
    expect(r.code).toBe(0);
    for (const c of ["compose", "check", "export", "list", "encode", "decode", "Exit codes"]) expect(r.out).toContain(c);
  });

  it("check exits 0 for a readable signature, 1 for a theme that falls short", () => {
    expect(cli("check", "Neon Deep").code).toBe(0);
    const bad = cli("check", here("examples/red-to-white-guard-off.theme.json").pathname, "--json");
    expect(bad.code).toBe(1);
    expect(JSON.parse(bad.out).readable).toBe(false);
  });

  it("bad input exits 2 with a JSON error, never a stack trace", () => {
    const r = cli("compose", "red", "blue", "--json");
    expect(r.code).toBe(2);
    expect(JSON.parse(r.err).error.code).toBe("BAD_COLOR");
    expect(r.err).not.toMatch(/at .*\.js:\d+/);
    expect(cli("frobnicate").code).toBe(2);
    expect(cli("compose", "#101B44", "#1CB6BE", "--color2", "#101B44").code).toBe(2);
  });

  it("compose --json returns a theme file and its check", () => {
    const r = cli("compose", "#0C2F1C", "#10B981", "--color2", "#000000", "--json");
    expect(r.code).toBe(0);
    const { file, check } = JSON.parse(r.out);
    expect(file.theme).toBe("gradients");
    expect(check.code).toMatch(/^SM2-0C2F1C-000000-/);
  });

  it("encode and decode round-trip", () => {
    const code = JSON.parse(cli("encode", "Borealis", "--json").out).code;
    const file = JSON.parse(cli("decode", code, "--json").out);
    expect(file.seeds.color3).toBe("#0B0E14");
  });

  it("export writes each format", () => {
    expect(cli("export", "Borealis", "--format", "css").out).toMatch(/--st-gradient-page/);
    expect(cli("export", "Borealis", "--format", "nope").code).toBe(2);
    expect(JSON.parse(cli("export", "Borealis", "--format", "tokens").out)["soul-mark"].gradient.$type).toBe("gradient");
  });

  it("export --format craft writes a Crafting Apps theme, and refuses what isn't solid", () => {
    const r = cli("export", "Deep space and Azure", "--format", "craft");
    expect(r.code).toBe(0);
    const t = JSON.parse(r.out);
    expect(t.schema).toBe("craft-design-theme");
    expect(t.id).toBe("soul-mark.deep-space-and-azure");
    expect(t.variants).toBe("dark");
    const refused = cli("export", "Borealis", "--format", "craft", "--json");
    expect(refused.code).toBe(2);
    expect(refused.err + refused.out).toMatch(/NOT_SOLID/);
  });

  it("composes, checks, lists and round-trips Soul Mark: Neon", () => {
    const made = cli("compose", "#070B14", "#00E5FF", "--glow", "#00E5FF", "--grid", "off", "--json");
    expect(made.code).toBe(0);
    const { file, check } = JSON.parse(made.out);
    expect([file.theme, check.theme, check.code]).toEqual(["neon", "Soul Mark: Neon", "SM3-070B14-x-00E5FF-00E5FF-60-n-50-soft"]);
    expect(cli("decode", check.code, "--json").out).toContain('"glow":"#00E5FF"');
    expect(cli("encode", "Blueprint").out.trim()).toMatch(/^SM3-162F56-03060C-/);
    expect(cli("check", "Green terminal").code).toBe(0);
    expect(cli("list", "neon").out).toContain("Blueprint");
    expect(cli("compose", "#070B14", "#00E5FF", "--glow", "#00E5FF", "--grid", "maybe").code).toBe(2);
    expect(cli("compose", "#070B14", "#00E5FF", "--strength", "0.5").code).toBe(2);
    const glowing = cli("compose", "#000000", "#39FF88", "--glow", "#39FF88", "--text-glow", "on", "--menu-grid", "on", "--json");
    expect(glowing.code).toBe(0);
    expect(JSON.parse(glowing.out).check.code).toMatch(/-t-m$/);
    expect(cli("compose", "#000000", "#39FF88", "--glow", "#39FF88", "--text-glow", "bright").code).toBe(2);
  });

  it("composes, checks, lists and round-trips Soul Mark: Glass", () => {
    const made = cli("compose", "#2D81FF", "--glass", "light", "--picture", "quartz", "--json");
    expect(made.code).toBe(0);
    const { file, check } = JSON.parse(made.out);
    expect([file.theme, check.theme, check.code]).toEqual(["glass", "Soul Mark: Glass", "SM4-l-2D81FF-quartz-30-f-9-k-x-l"]);
    expect(check.glass.stackedFill).toBe(0.09);
    expect(check.glass.fill).toBeGreaterThan(check.glass.stackedFill);
    expect(cli("decode", check.code, "--json").out).toContain('"kind":"light"');
    expect(cli("encode", "Hearth").out.trim()).toBe("SM4-d-F59E0B-fade-hearth-30-f-9-k-x-l");
    expect(cli("check", "Quartz").code).toBe(0);
    expect(cli("check", "Glass: Northern lights").out).toContain("Soul Mark: Glass");
    expect(cli("check", "Borealis").out).toContain("Soul Mark: Gradients");
    expect(cli("list", "glass").out).toContain("Smoked quartz");
    const unlinked = JSON.parse(cli("compose", "#2D81FF", "--glass", "dark", "--frost", "off", "--linked", "off", "--darkened", "40", "--json").out);
    expect(unlinked.check.glass.thin).toBe(true);
    expect(unlinked.check.code).toMatch(/-n-9-u-40-l$/);
    expect(cli("compose", "#2D81FF", "--glass", "light", "--glow", "#00E5FF").code).toBe(2);
    expect(cli("compose", "#000000", "#2D81FF", "--glass", "light").code).toBe(2);
    expect(cli("compose", "#2D81FF", "--glass", "grey").code).toBe(2);
    expect(cli("compose", "#2D81FF", "--glass", "light", "--picture", "../secret").code).toBe(2);
    expect(cli("compose", "#2D81FF", "--glass", "light", "--frost", "lots").code).toBe(2);
  });

  it("list gradients marks the three-color ones", () => {
    expect(cli("list", "gradients").out).toMatch(/Ember .*3 colors/);
  });
});
