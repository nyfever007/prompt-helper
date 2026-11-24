import type { CatalogRegistry } from "../catalog/registry";
import { error, fail, type Result } from "../shared/diagnostics";
import { canonicalizeSpec } from "../spec/factory";
import type { ImageSpec } from "../spec/schema";
import { validateImageSpec } from "../validation/specValidator";

/** Reject very large imports before parsing (defensive; specs are small). */
export const MAX_IMPORT_BYTES = 1_000_000;

/** Serialize a spec as canonical, pretty JSON (stable key order, trailing newline). */
export const exportSpecJson = (spec: ImageSpec): string => `${JSON.stringify(canonicalizeSpec(spec), null, 2)}\n`;

/**
 * Parse and fully validate JSON text. All-or-nothing: on any error the caller
 * receives diagnostics and must keep its current spec unchanged.
 */
export const importSpecJson = (text: string, registry: CatalogRegistry): Result<ImageSpec> => {
  if (text.length > MAX_IMPORT_BYTES) {
    return fail([error("import.too_large", `File is larger than ${MAX_IMPORT_BYTES} bytes`)]);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return fail([error("import.invalid_json", `Not valid JSON: ${(e as Error).message}`)]);
  }
  return validateImageSpec(raw, registry);
};
