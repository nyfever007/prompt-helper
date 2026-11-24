import { applySelection, createEmptySpec, type CatalogRegistry, type ImageSpec, type SelectionValue } from "@/domain";

/** Build a spec by applying explicit selections in order (throws on invalid input). */
export const buildSpec = (registry: CatalogRegistry, entries: Array<[string, SelectionValue]>): ImageSpec =>
  entries.reduce((spec, [id, value]) => {
    const r = applySelection(spec, registry, id, value);
    if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join("; "));
    return r.value;
  }, createEmptySpec(registry));

export const single = (optionId: string): SelectionValue => ({ kind: "single", optionId });
export const text = (t: string): SelectionValue => ({ kind: "text", text: t });
export const multi = (...optionIds: string[]): SelectionValue => ({ kind: "multi", optionIds });
