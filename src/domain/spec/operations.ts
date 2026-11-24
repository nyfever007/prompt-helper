import type { CatalogRegistry } from "../catalog/registry";
import { checkValueForAttribute } from "../catalog/valueCheck";
import { error, fail, ok, type Result } from "../shared/diagnostics";
import type { AttributeSelection, ImageSpec, SelectionOrigin, SelectionSource } from "./schema";
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

/** Is the value empty (represented as unset)? */
const isEmptyValue = (value: SelectionValue): boolean =>
  (value.kind === "text" && value.text.trim() === "") ||
  (value.kind === "multi" && value.optionIds.length === 0 && (value.custom?.length ?? 0) === 0);

/** Set an explicit value. Blank text / an empty multi value is treated as clearing (unset). */
export const applySelection = (
  spec: ImageSpec,
  registry: CatalogRegistry,
  attributeId: string,
  value: SelectionValue,
  source: SelectionSource = "user",
  origin?: SelectionOrigin,
): Result<ImageSpec> => {
  const attribute = registry.getAttribute(attributeId);
  if (!attribute) {
    return fail([error("selection.unknown_attribute", `Unknown attribute "${attributeId}"`, { attributeId })]);
  }
  if (isEmptyValue(value)) return ok(clearSelection(spec, attributeId));
  // An empty `custom` array is not a valid shape; normalize it away.
  if (value.kind === "multi" && value.custom !== undefined && value.custom.length === 0) {
    value = { kind: "multi", optionIds: value.optionIds };
  }
  const problems = checkValueForAttribute(attribute, value, `selections.${attributeId}.value`);
  if (problems.length > 0) return fail(problems);

  const previous = spec.selections[attributeId];
  const next: AttributeSelection = {
    value,
    source,
    // Changing a value keeps the user's emphasis for that attribute.
    ...(previous?.priority !== undefined ? { priority: previous.priority } : {}),
    // Provenance: only preset writes carry an origin; any direct edit drops it (user > preset).
    ...(source === "preset" && origin ? { origin } : {}),
    // Output state is independent of the value: changing the value keeps it (approved D3).
    ...(previous?.excludedFromPrompt ? { excludedFromPrompt: true as const } : {}),
  };
  return ok({ ...spec, selections: { ...spec.selections, [attributeId]: next } });
};

/** Return the attribute to `unset`. No-op (same reference) when already unset. Output state goes with it. */
export const clearSelection = (spec: ImageSpec, attributeId: string): ImageSpec => {
  if (!(attributeId in spec.selections)) return spec;
  const selections = { ...spec.selections };
  delete selections[attributeId];
  return { ...spec, selections };
};

/**
 * Include or exclude a SET attribute from the prompt output without touching
 * its value, source or provenance. No-op (same reference) when unset or
 * already in the requested state.
 */
export const setPromptExclusion = (spec: ImageSpec, attributeId: string, excluded: boolean): ImageSpec => {
  const current = spec.selections[attributeId];
  if (!current || Boolean(current.excludedFromPrompt) === excluded) return spec;
  const { excludedFromPrompt: _drop, ...rest } = current;
  void _drop;
  const next: AttributeSelection = excluded ? { ...rest, excludedFromPrompt: true } : rest;
  return { ...spec, selections: { ...spec.selections, [attributeId]: next } };
};

/** Attribute ids of a category and all its descendant categories (catalog membership, not UI state). */
export const attributesInCategory = (registry: CatalogRegistry, categoryId: string): string[] =>
  registry
    .attributes()
    .filter((a) => a.categoryId !== undefined && registry.categoryPath(a.categoryId).includes(categoryId))
    .map((a) => a.id);

/**
 * Category reset (approved N5): clears EVERY stored selection of the category
 * subtree — regardless of search/filter/visibility, output exclusion,
 * applicability or exposure. Returns the removed selection objects (by
 * reference) so the reset can be undone precisely.
 */
export const resetCategory = (
  spec: ImageSpec,
  registry: CatalogRegistry,
  categoryId: string,
): { spec: ImageSpec; removed: Record<string, AttributeSelection> } => {
  const removed: Record<string, AttributeSelection> = {};
  for (const id of attributesInCategory(registry, categoryId)) {
    const s = spec.selections[id];
    if (s) removed[id] = s;
  }
  if (Object.keys(removed).length === 0) return { spec, removed };
  const selections = { ...spec.selections };
  for (const id of Object.keys(removed)) delete selections[id];
  return { spec: { ...spec, selections }, removed };
};

/**
 * Undo a category reset: each removed selection comes back ONLY if that
 * attribute is still unset (a later user edit wins). Nothing else changes.
 */
export const restoreCategoryReset = (
  spec: ImageSpec,
  removed: Readonly<Record<string, AttributeSelection>>,
): { spec: ImageSpec; restored: string[]; skipped: string[] } => {
  const restored: string[] = [];
  const skipped: string[] = [];
  const selections = { ...spec.selections };
  for (const id of Object.keys(removed).sort()) {
    if (id in spec.selections) {
      skipped.push(id);
      continue;
    }
    selections[id] = removed[id]!;
    restored.push(id);
  }
  return { spec: restored.length ? { ...spec, selections } : spec, restored, skipped };
};
