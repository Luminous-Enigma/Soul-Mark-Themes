// soul-mark: the command line tool. Never interactive; --json on every command; errors as JSON
// with --json; exit codes 0 (readable / done), 1 (falls short), 2 (bad input or usage).
import { readFileSync } from "node:fs";
import {
  checkTheme,
  codeOf,
  EXPORT_FORMATS,
  type ExportFormat,
  exportTheme,
  InputError,
  seedsFrom,
  signatureByName,
  signaturesData,
  themeFile,
  type ThemeFile,
  themeFromText,
} from "./tools";

const VERSION = "2.0.0-alpha.2";

const HELP = `soul-mark ${VERSION}: themes people compose from a few colors, with every text readable (WCAG AA).
Three themes: Soul Mark: Solid Tones (one background color), Soul Mark: Gradients (two or three)
and Soul Mark: Neon (a glowing outline color, with an optional fade and grid).

Usage:
  soul-mark compose <background> <accent> [--color2 <hex>] [--color3 <hex>] [--shape vertical|elliptical]
                    [--tint 0-1] [--tone soft|warm|cool] [--guard off] [--name <text>] [--json]
                    [--glow <hex> [--strength 0-1] [--grid on|off]      (Soul Mark: Neon)
                     [--text-glow on|off] [--menu-grid on|off]]
  soul-mark check <theme>                 Is every text readable? Exit 0 yes, 1 no.
  soul-mark export <theme> --format css|json|tokens|tailwind
  soul-mark list [signatures|gradients|neon|palettes|all]
  soul-mark encode <theme>                The short theme code (SM1-… solid, SM2-… gradient, SM3-… neon).
  soul-mark decode <code>                 The theme file for a code.
  soul-mark --help | --version

<theme> is a theme file (path to .json), a theme code (SM1-…, SM2-… or SM3-…), or a signature's
name in quotes (for example "Neon Deep" or "Blueprint").

Examples:
  soul-mark compose "#0C2F1C" "#10B981" --color2 "#000000" --json
  soul-mark check "Aurora"
  soul-mark compose "#070B14" "#00E5FF" --glow "#00E5FF" --grid on --json
  soul-mark export examples/neon-deep.theme.json --format css

Exit codes:
  0  readable, or the command did what was asked
  1  the theme falls short of WCAG AA somewhere (only possible with the guard off)
  2  bad input or usage`;

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const VALUE_FLAGS = new Set([
  "--color2",
  "--color3",
  "--shape",
  "--tint",
  "--tone",
  "--guard",
  "--name",
  "--format",
  "--glow",
  "--strength",
  "--grid",
  "--text-glow",
  "--menu-grid",
]);

function parse(args: string[]) {
  const words: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (VALUE_FLAGS.has(a)) {
      if (i + 1 >= args.length) throw new InputError("USAGE", `${a} needs a value.`);
      flags[a.slice(2)] = args[++i];
    } else if (a === "--json" || a === "--help" || a === "--version") {
      flags[a.slice(2)] = "true";
    } else if (a.startsWith("--")) {
      throw new InputError("USAGE", `Unknown option ${a}.`);
    } else {
      words.push(a);
    }
  }
  return { words, flags };
}

function out(value: unknown, text: string) {
  process.stdout.write((json ? JSON.stringify(value) : text) + "\n");
}

function loadTheme(arg: string | undefined): ThemeFile {
  if (!arg) throw new InputError("USAGE", "Expected a theme: a file, a code, or a signature's name.");
  const signature = signatureByName(arg);
  if (signature) return signature;
  if (/\.json$/i.test(arg)) {
    let text: string;
    try {
      text = readFileSync(arg, "utf8");
    } catch {
      throw new InputError("NO_FILE", `Can't read ${arg}.`);
    }
    return themeFromText(text);
  }
  return themeFromText(arg);
}

function main(): number {
  const { words, flags } = parse(argv);
  if (flags.version) {
    out({ version: VERSION }, VERSION);
    return 0;
  }
  if (flags.help || words.length === 0) {
    process.stdout.write(HELP + "\n");
    return 0;
  }
  const [command, ...rest] = words;
  switch (command) {
    case "compose": {
      if (rest.length !== 2) throw new InputError("USAGE", "compose needs a background and an accent.");
      if (flags.guard && flags.guard !== "off" && flags.guard !== "on") {
        throw new InputError("USAGE", '--guard is "on" or "off".');
      }
      for (const k of ["grid", "text-glow", "menu-grid"]) {
        if (flags[k] && flags[k] !== "off" && flags[k] !== "on") throw new InputError("USAGE", `--${k} is "on" or "off".`);
      }
      const seeds = seedsFrom({
        background: rest[0],
        accent: rest[1],
        ...(flags.color2 ? { color2: flags.color2 } : {}),
        ...(flags.color3 ? { color3: flags.color3 } : {}),
        ...(flags.shape ? { shape: flags.shape } : {}),
        ...(flags.tint ? { tint: flags.tint } : {}),
        ...(flags.tone ? { character: flags.tone } : {}),
        ...(flags.guard ? { guard: flags.guard !== "off" } : {}),
        ...(flags.glow ? { glow: flags.glow } : {}),
        ...(flags.strength ? { strength: flags.strength } : {}),
        ...(flags.grid ? { grid: flags.grid !== "off" } : {}),
        ...(flags["text-glow"] ? { textGlow: flags["text-glow"] !== "off" } : {}),
        ...(flags["menu-grid"] ? { menuGrid: flags["menu-grid"] !== "off" } : {}),
      });
      const file = themeFile(seeds, flags.name);
      const result = checkTheme(file);
      out({ file, check: result }, describe(result) + `\n\nTheme file:\n${JSON.stringify(file, null, 2)}`);
      return result.readable ? 0 : 1;
    }
    case "check": {
      const result = checkTheme(loadTheme(rest[0]));
      out(result, describe(result));
      return result.readable ? 0 : 1;
    }
    case "export": {
      const format = (flags.format ?? "css") as ExportFormat;
      if (!EXPORT_FORMATS.includes(format)) {
        throw new InputError("BAD_FORMAT", `--format must be one of ${EXPORT_FORMATS.join(", ")}.`);
      }
      const text = exportTheme(loadTheme(rest[0]), format);
      process.stdout.write(json ? JSON.stringify({ format, output: text }) + "\n" : text.endsWith("\n") ? text : text + "\n");
      return 0;
    }
    case "list": {
      const what = rest[0] ?? "all";
      const data = signaturesData();
      const pick: Record<string, unknown> = {
        signatures: data.signatureThemes,
        gradients: data.signatureGradients,
        neon: data.signatureNeon,
        palettes: data.palettes,
        all: data,
      };
      if (!(what in pick)) throw new InputError("USAGE", "list takes signatures, gradients, neon, palettes or all.");
      const text =
        what === "signatures"
          ? data.signatureThemes.map((t) => `${t.name}  ${t.background} + ${t.accent}`).join("\n")
          : what === "gradients"
            ? data.signatureGradients
                .map((g) => `${g.name}  ${g.colors.join(" → ")} (${g.shape}) + ${g.accent}${g.colors.length === 3 ? "  3 colors" : ""}`)
                .join("\n")
            : what === "neon"
              ? data.signatureNeon
                  .map((n) => `${n.name}  ${n.color2 ? `${n.background} → ${n.color2}` : n.background} + glow ${n.glow}${n.grid ? ", grid" : ""}`)
                  .join("\n")
              : JSON.stringify(pick[what], null, 2);
      out(pick[what], text);
      return 0;
    }
    case "encode": {
      const code = codeOf(loadTheme(rest[0]).seeds);
      out({ code }, code);
      return 0;
    }
    case "decode": {
      const file = themeFromText(rest[0] ?? "");
      out(file, JSON.stringify(file, null, 2));
      return 0;
    }
    default:
      throw new InputError("USAGE", `Unknown command ${JSON.stringify(command)}.`);
  }
}

function describe(r: ReturnType<typeof checkTheme>): string {
  const lines = [
    `${r.name ? `${r.name} (${r.theme})` : r.theme}, code ${r.code}`,
    r.readable
      ? `Readable: every text meets WCAG AA${r.gradient ? " at every point of the gradient" : ""}.`
      : "NOT readable everywhere. Falls short:",
    ...r.shortfalls.map((s) => `  ${s.label}: ${s.ratio.toFixed(2)}:1, needs ${s.floor}:1`),
  ];
  if (r.notes.length) lines.push(r.guard ? "What the readability guard did:" : "With the guard on:", ...r.notes.map((n) => `  ${n.message}`));
  return lines.join("\n");
}

try {
  process.exitCode = main();
} catch (e) {
  if (e instanceof InputError) {
    if (json) process.stderr.write(JSON.stringify({ error: { code: e.code, message: e.message } }) + "\n");
    else process.stderr.write(`${e.message}\nRun "soul-mark --help" for usage.\n`);
    process.exitCode = 2;
  } else {
    throw e;
  }
}
