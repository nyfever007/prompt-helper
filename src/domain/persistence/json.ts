import type { CatalogRegistry } from "../catalog/registry";
import { error } from "../shared/diagnostics";
import { canonicalizeSpec } from "../spec/factory";
import type { ImageSpec } from "../spec/schema";
import { analyzeSpecInput, type SpecAnalysis } from "../validation/analyze";

/** Reject very large imports before parsing (defensive; specs are small). */
export const MAX_IMPORT_BYTES = 1_000_000;

/**
 * Serialize a spec as canonical, pretty JSON (stable key order, trailing newline).
 * Always allowed — even for specs whose prompt output is blocked — so the
 * user's original data is never lost.
 */
export const exportSpecJson = (spec: ImageSpec): string => `${JSON.stringify(canonicalizeSpec(spec), null, 2)}\n`;

/**
 * Parse and analyze JSON text. The caller decides:
 * - `valid` → may apply (catalog ID migrations, if any, are listed);
 * - `recoverable` → show what would be excluded and why; apply ONLY after
 *   explicit user confirmation; keep the original text;
 * - `invalid` → keep the current spec unchanged.
 */
export const importSpecJson = (text: string, registry: CatalogRegistry): SpecAnalysis => {
  if (text.length > MAX_IMPORT_BYTES) {
    return { status: "invalid", diagnostics: [error("import.too_large", `File is larger than ${MAX_IMPORT_BYTES} bytes`)] };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { status: "invalid", diagnostics: [error("import.invalid_json", `Not valid JSON: ${(e as Error).message}`)] };
  }
  return analyzeSpecInput(raw, registry);
};
