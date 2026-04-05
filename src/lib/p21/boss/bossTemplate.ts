import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE_REL = ["docs", "p21", "training", "boss", "docs", "DCNA_BR_TEMPLATE_v1.txt"];

/**
 * DCNA P21 business rule skeleton (imports, Execute/RuleResult, logging hooks).
 * BOSS synthesis expands this into a complete .cs file.
 */
export function loadBossCSharpTemplate(): string {
  const path = join(process.cwd(), ...TEMPLATE_REL);
  try {
    return readFileSync(path, "utf8");
  } catch {
    throw new Error(`BOSS C# template not found at ${path}`);
  }
}
