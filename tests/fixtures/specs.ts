import { applySelection, createEmptySpec, type CatalogRegistry, type ImageSpec, type SelectionValue } from "@/domain";

/**
 * Build a spec by applying explicit selections in order (throws on invalid input).
 * Every entry still goes through `applySelection` (same validation and normalization);
 * it is applied against that attribute's previous selection only, so the whole map is
 * not copied per entry (TD-11). The result — including key order — equals folding
 * `applySelection` over the full spec (`buildSpecByFold`, checked in tests/unit/spec.test.ts).
 */
export const buildSpec = (registry: CatalogRegistry, entries: Array<[string, SelectionValue]>): ImageSpec => {
  const empty = createEmptySpec(registry);
  const selections: ImageSpec["selections"] = { ...empty.selections };
  for (const [id, value] of entries) {
    const previous = selections[id];
    const r = applySelection({ ...empty, selections: previous ? { [id]: previous } : {} }, registry, id, value);
    if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join("; "));
    const next = r.value.selections[id];
    if (next) selections[id] = next;
    else delete selections[id];
  }
  return { ...empty, selections };
};

/** Reference: fold `applySelection` over the full spec, one entry at a time. */
export const buildSpecByFold = (registry: CatalogRegistry, entries: Array<[string, SelectionValue]>): ImageSpec =>
  entries.reduce((spec, [id, value]) => {
    const r = applySelection(spec, registry, id, value);
    if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join("; "));
    return r.value;
  }, createEmptySpec(registry));

export const single = (optionId: string): SelectionValue => ({ kind: "single", optionId });
export const text = (t: string): SelectionValue => ({ kind: "text", text: t });
export const multi = (...optionIds: string[]): SelectionValue => ({ kind: "multi", optionIds });
