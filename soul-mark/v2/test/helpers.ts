import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";

export const here = (p: string) => new URL(`../${p}`, import.meta.url);
export const readJson = (p: string) => JSON.parse(readFileSync(here(p), "utf8"));

/** One validator with every published schema loaded, so $refs between them resolve. */
export function validators() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const theme = readJson("schema/theme.schema.json");
  ajv.addSchema(theme);
  return {
    theme: ajv.compile(theme),
    check: ajv.compile(readJson("schema/check-result.schema.json")),
    composed: ajv.compile(readJson("schema/composed.schema.json")),
  };
}
