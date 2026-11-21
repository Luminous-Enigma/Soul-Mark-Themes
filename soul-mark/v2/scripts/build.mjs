// Bundles the command line tool and the MCP server into dist/, ready to run with Node.
import { build } from "esbuild";

for (const name of ["cli", "mcp"]) {
  await build({
    entryPoints: [`src/${name}.ts`],
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
