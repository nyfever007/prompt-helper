import {
  applySelection,
  clearSelection,
  createEmptySpec,
  findInactiveSelections,
  inactiveKey,
  type CatalogRegistry,
  type ImageSpec,
  type InactiveSelection,
  type SelectionValue,
} from "@/domain";

export type WorkspaceAction =
  | { type: "set"; attributeId: string; value: SelectionValue }
  | { type: "clear"; attributeId: string }
  | { type: "reset" }
  | { type: "restoreResetSnapshot" }
  | { type: "replace"; spec: ImageSpec };

/** Applicability changes caused by the latest user edit (for notices). */
export interface Transition {
  id: number;
  newlyInactive: InactiveSelection[];
  reactivated: InactiveSelection[];
}

export interface WorkspaceState {
  spec: ImageSpec;
  /**
   * One snapshot of the spec taken right before the most recent reset.
   * Kept for the session even after further edits; replaced only by the next
   * non-empty reset; cleared only when restored.
   */
  resetSnapshot: ImageSpec | null;
  transition: Transition | null;
}

export const initialWorkspaceState = (registry: CatalogRegistry): WorkspaceState => ({
  spec: createEmptySpec(registry),
  resetSnapshot: null,
  transition: null,
});

const diffInactive = (registry: CatalogRegistry, before: ImageSpec, after: ImageSpec, prevId: number): Transition | null => {
  const b = findInactiveSelections(before, registry);
  const a = findInactiveSelections(after, registry);
  const bKeys = new Set(b.map(inactiveKey));
  const aKeys = new Set(a.map(inactiveKey));
  const newlyInactive = a.filter((x) => !bKeys.has(inactiveKey(x)));
  // "Reactivated" = was inactive, still set, now applicable.
  const reactivated = b.filter((x) => !aKeys.has(inactiveKey(x)) && x.attributeId in after.selections);
  if (newlyInactive.length === 0 && reactivated.length === 0) return null;
  return { id: prevId + 1, newlyInactive, reactivated };
};

/**
 * Thin UI reducer over pure domain operations. Invalid actions leave the
 * spec untouched (the UI only offers valid values).
 */
export const createWorkspaceReducer =
  (registry: CatalogRegistry) =>
  (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
    const prevId = state.transition?.id ?? 0;
    switch (action.type) {
      case "set":
      case "clear": {
        let next: ImageSpec;
        if (action.type === "set") {
          const result = applySelection(state.spec, registry, action.attributeId, action.value, "user");
          if (!result.ok) return state;
          next = result.value;
        } else {
          next = clearSelection(state.spec, action.attributeId);
        }
        if (next === state.spec) return state;
        return { ...state, spec: next, transition: diffInactive(registry, state.spec, next, prevId) ?? state.transition };
      }
      case "reset": {
        const isEmpty = Object.keys(state.spec.selections).length === 0;
        return {
          spec: createEmptySpec(registry),
          // Resetting an already-empty spec must not destroy an existing snapshot.
          resetSnapshot: isEmpty ? state.resetSnapshot : state.spec,
          transition: null,
        };
      }
      case "restoreResetSnapshot":
        if (!state.resetSnapshot) return state;
        return { spec: state.resetSnapshot, resetSnapshot: null, transition: null };
      case "replace":
        return { ...state, spec: action.spec, transition: null };
    }
  };
