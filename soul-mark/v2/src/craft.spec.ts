// Soul Mark as Crafting Apps suite themes: every file the suite's parser would accept, and every
// pinned pair at the suite's own minimums, so the suite resolves it with no contrast warnings.
import { contrastRatio } from "./contrast";
import { craftFileProblems, craftId, craftPairs, craftTheme } from "./craft";
import { ALL_ACCENTS, DEEP_BACKGROUNDS, LIGHT_BACKGROUNDS, PRIMARY_BACKGROUNDS, SIGNATURE_THEMES } from "./presets";
import { composeSoulMark } from "./soul-mark";

const BACKGROUNDS = [...PRIMARY_BACKGROUNDS, ...LIGHT_BACKGROUNDS, ...DEEP_BACKGROUNDS];

describe("Soul Mark in the Crafting Apps", () => {
  describe("signature themes", () => {
    for (const s of SIGNATURE_THEMES)
      it(`${s.name}: a valid suite file, every pinned pair readable`, () => {
        const mark = composeSoulMark({ background: s.background, accent: s.accent, tint: 0.5, character: "soft" });
        const theme = craftTheme(mark, s.name, "SM1-test");
        expect(craftFileProblems(theme)).toEqual([]);
        expectReadable(theme);
        expect(theme.variants).toBe(mark.tokens.scheme);
        expect(theme.seeds.accent).toBe(mark.tokens.accent);
      });
  });

  // One test per background, so the runner can report between them.
  describe("every ready-made background with every ready-made accent", () => {
    for (const [bgName, background] of BACKGROUNDS)
      it(`on ${bgName}`, async () => {
        await new Promise((r) => setTimeout(r, 0));
        for (const [acName, accent] of ALL_ACCENTS) {
          const mark = composeSoulMark({ background, accent, tint: 0.5, character: "soft" });
          const theme = craftTheme(mark, `${bgName} and ${acName}`, "SM1-test");
          expect(craftFileProblems(theme), `${bgName} + ${acName}`).toEqual([]);
          expectReadable(theme, `${bgName} + ${acName}`);
        }
      });
  });

  describe("the file", () => {
    it("keeps Soul Mark's own colors where they already meet the suite's rules", () => {
      const s = SIGNATURE_THEMES.find((x) => x.name === "Deep space and Azure")!;
      const mark = composeSoulMark({ background: s.background, accent: s.accent, tint: 0.5, character: "soft" });
      const pins = craftTheme(mark, s.name, "SM1-test").dark!;
      expect(pins["surface.background"]).toBe(mark.tokens.bg);
      expect(pins["surface.panel"]).toBe(mark.tokens.panel);
      expect(pins["surface.sunken"]).toBe(mark.tokens.sunken);
      expect(pins["text.normal"]).toBe(mark.tokens.fg);
    });

    it("pins only its own mode, and says what it leaves to the suite", () => {
      const light = craftTheme(
        composeSoulMark({ background: "#FFFFFF", accent: "#0969DA", tint: 0.5, character: "soft" }),
        "Paper and Cobalt",
        "SM1-test",
      );
      expect(light.variants).toBe("light");
      expect(light.dark).toBeUndefined();
      expect(Array.isArray(light.soul_mark.left_to_the_suite)).toBe(true);
    });

    it("leaves the accent fill to the suite when check marks wouldn't show on it", () => {
      // An accent as light as the panel: check marks drawn in it wouldn't reach 3:1.
      const mark = composeSoulMark({ background: "#FFFFFF", accent: "#E8E8E8", tint: 0.5, character: "soft" });
      const theme = craftTheme(mark, "Pale", "SM1-test");
      const pins = theme.light!;
      const marksShow = ["surface.panel", "surface.raised", "surface.sunken"].every(
        (g) => !pins["accent.solid"] || contrastRatio(pins["accent.solid"], pins[g]) >= 3,
      );
      expect(marksShow).toBe(true);
      expectReadable(theme);
    });

    it("makes ids the suite accepts, never craft.", () => {
      expect(craftId("Deep space and Azure")).toBe("soul-mark.deep-space-and-azure");
      expect(craftId("Ünïcode & spaces!")).toMatch(/^[a-z0-9][a-z0-9._-]{1,63}$/);
      expect(craftId("x".repeat(200)).length).toBeLessThanOrEqual(64);
      expect(craftId("craft")).not.toMatch(/^craft\./);
    });
  });
});

function expectReadable(theme: ReturnType<typeof craftTheme>, label = theme.name) {
  const short = craftPairs(theme).filter((p) => p.ratio < p.floor);
  expect(
    short.map((p) => `${p.what} ${p.ratio.toFixed(2)} < ${p.floor}`),
    label,
  ).toEqual([]);
}
