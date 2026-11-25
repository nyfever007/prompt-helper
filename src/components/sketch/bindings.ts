import { isAttributeActive, isOptionAttribute, selectedCustomEntries, selectedOptionIds, type CatalogRegistry, type ImageSpec } from "@/domain";

/**
 * Generic ImageSpec → sketch-parameter mapping (Sprint 2-D.2, generalised in Sprint 2-D.3). READ-ONLY:
 * a sketch never writes to the spec.
 * - Unset attributes keep the preview-only neutral form; nothing is stored or prompted.
 * - A selection that is excluded from the prompt, or not applicable, is NOT drawn (a sketch shows what the
 *   prompt describes) and is reported, so the user can see why.
 * - Custom values and options without a drawing are reported as “not shown in the sketch”.
 */
type Swatch = (optionId: string) => string | null;
export type Binding<T> =
  | { kind: "degree"; set(p: T, v: number): void }
  /** Returns the option ids it could NOT draw. */
  | { kind: "option"; set(p: T, ids: string[], swatch: Swatch): string[] };

export const degree = <T>(set: (p: T, v: number) => void): Binding<T> => ({ kind: "degree", set });
export const single = <T, K extends string>(known: readonly K[], set: (p: T, id: K) => void): Binding<T> => ({
  kind: "option",
  set: (p, ids) => {
    const id = ids[0];
    if (id && (known as readonly string[]).includes(id)) {
      set(p, id as K);
      return [];
    }
    return ids;
  },
});
export const color = <T>(set: (p: T, c: string) => void): Binding<T> => ({
  kind: "option",
  set: (p, ids, swatch) => {
    const c = ids[0] ? swatch(ids[0]) : null;
    if (c) set(p, c);
    return c ? [] : ids;
  },
});

export interface SketchState<T> {
  params: T;
  /** Set and drawn. */
  drawn: string[];
  /** Set but excluded from the prompt — not drawn. */
  excluded: string[];
  /** Set but not applicable in the current context — not drawn. */
  inactive: string[];
  /** Set, but (part of) the value has no drawing (custom values, attributes without a sketch). */
  notDrawn: string[];
}

/**
 * @param inScope attributes whose status this sketch reports (e.g. the five face areas)
 * @param force draw this attribute's stored value even when excluded/inactive (a slider's own preview explains its value).
 */
export const runBindings = <T>(
  registry: CatalogRegistry,
  spec: ImageSpec,
  inScope: (categoryId: string) => boolean,
  bindings: Record<string, Binding<T>>,
  params: T,
  force?: string,
): SketchState<T> => {
  const state: SketchState<T> = { params, drawn: [], excluded: [], inactive: [], notDrawn: [] };
  for (const a of registry.attributes()) {
    if (!a.categoryId || !inScope(a.categoryId)) continue;
    const sel = spec.selections[a.id];
    if (!sel) continue;
    if (a.id !== force) {
      if (sel.excludedFromPrompt) {
        state.excluded.push(a.id);
        continue;
      }
      if (!isAttributeActive(registry, a, spec)) {
        state.inactive.push(a.id);
        continue;
      }
    }
    const b = bindings[a.id];
    if (!b) {
      state.notDrawn.push(a.id);
      continue;
    }
    if (b.kind === "degree") {
      if (sel.value.kind === "number") {
        b.set(params, sel.value.value);
        state.drawn.push(a.id);
      } else state.notDrawn.push(a.id);
      continue;
    }
    const ids = selectedOptionIds(sel.value);
    const swatch: Swatch = (id) => (isOptionAttribute(a) ? (a.options.find((o) => o.id === id)?.swatch ?? null) : null);
    const missed = b.set(params, ids, swatch);
    if (ids.length > missed.length) state.drawn.push(a.id);
    if (missed.length > 0 || selectedCustomEntries(sel.value).length > 0) state.notDrawn.push(a.id);
  }
  return state;
};
