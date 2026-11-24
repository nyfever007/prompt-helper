import type { CatalogRegistry } from "../catalog/registry";
import { checkValueForAttribute } from "../catalog/valueCheck";
import { error, fail, ok, type Result } from "../shared/diagnostics";
import type { AttributeSelection, ImageSpec, SelectionSource } from "./schema";
import type { SelectionValue } from "./values";

/**
 * Pure, immutable spec operations.
 *
 * Invariants (tested in tests/unit/independence.test.ts):
 * - Only `selections[attributeId]` changes; every other selection object is
 *   returned by reference, untouched.
 * - No operation ever fills in a value the user did not choose.
 */

export const isSet = (spec: ImageSpec, attributeId: string): boolean => attributeId in spec.selections;

export const getSelection = (spec: ImageSpec, attributeId: string): AttributeSelection | undefined =>
  spec.selections[attributeId];

/** Set an explicit value. Blank text is treated as clearing (unset). */
export const applySelection = (
  spec: ImageSpec,
  registry: CatalogRegistry,
  attributeId: string,
  value: SelectionValue,
  source: SelectionSource = "user",
): Result<ImageSpec> => {
  const attribute = registry.getAttribute(attributeId);
  if (!attribute) {
    return fail([error("selection.unknown_attribute", `Unknown attribute "${attributeId}"`, { attributeId })]);
  }
  if (value.kind === "text" && value.text.trim() === "") {
    return ok(clearSelection(spec, attributeId));
  }
  if (value.kind === "multi" && value.optionIds.length === 0) {
    return ok(clearSelection(spec, attributeId));
  }
  const problems = checkValueForAttribute(attribute, value, `selections.${attributeId}.value`);
  if (problems.length > 0) return fail(problems);

  const previous = spec.selections[attributeId];
  const next: AttributeSelection = {
    value,
    source,
    // Changing a value keeps the user's emphasis for that attribute.
    ...(previous?.priority !== undefined ? { priority: previous.priority } : {}),
  };
  return ok({ ...spec, selections: { ...spec.selections, [attributeId]: next } });
};

/** Return the attribute to `unset`. No-op (same reference) when already unset. */
export const clearSelection = (spec: ImageSpec, attributeId: string): ImageSpec => {
  if (!(attributeId in spec.selections)) return spec;
  const selections = { ...spec.selections };
  delete selections[attributeId];
  return { ...spec, selections };
};
