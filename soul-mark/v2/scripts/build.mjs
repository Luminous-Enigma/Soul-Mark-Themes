// Bundles the command line tool and the MCP server into dist/, ready to run with Node.
import { build } from "esbuild";

// eval.js is the agent test runner (evals/run.ts); it is not part of the package's tools.
for (const [name, entry] of [["cli", "src/cli.ts"], ["mcp", "src/mcp.ts"], ["eval", "evals/run.ts"]]) {
  await build({
    entryPoints: [entry],
    outfile: `dist/${name}.js`,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    packages: "external",
    banner: { js: "#!/usr/bin/env node" },
    logLevel: "warning",
  });
}
