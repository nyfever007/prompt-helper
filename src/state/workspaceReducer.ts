import {
  applyPresetPlan,
  applySelection,
  clearSelection,
  createEmptySpec,
  findInactiveSelections,
  inactiveKey,
  markUserEdited,
  resetCategory,
  restoreCategoryReset,
  setPromptExclusion,
  undoPresetTransaction,
  type AttributeSelection,
  type CatalogRegistry,
  type ImageSpec,
  type InactiveSelection,
  type PresetPlan,
  type PresetTransaction,
  type SelectionValue,
} from "@/domain";

export type WorkspaceAction =
  | { type: "set"; attributeId: string; value: SelectionValue }
  | { type: "clear"; attributeId: string }
  | { type: "reset" }
  | { type: "restoreResetSnapshot" }
  | { type: "replace"; spec: ImageSpec }
  | { type: "applyPreset"; plan: PresetPlan; mode: "all" | "onlyEmpty" }
  | { type: "undoPreset" }
  | { type: "setExcluded"; attributeId: string; excluded: boolean }
  | { type: "resetCategory"; categoryId: string }
  | { type: "undoCategoryReset" };

/**
 * Session-only record of the LAST category reset: exactly the selection objects
 * it removed. Undo restores each only if that attribute is still unset.
 */
export interface CategoryResetRecord {
  id: number;
  categoryId: string;
  removed: Record<string, AttributeSelection>;
}

/** Result of the last category-reset undo (for the notice). */
export interface CategoryRestoreResult {
  id: number;
  categoryId: string;
  restored: string[];
  skipped: string[];
}

/** Result of the last preset undo (for the notice). */
export interface PresetUndoResult {
  id: number;
  presetId: string;
  restored: string[];
  kept: string[];
}

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
  /** Session-only record of the LAST preset application (undo target). */
  presetTransaction: PresetTransaction | null;
  lastPresetUndo: PresetUndoResult | null;
  lastCategoryReset: CategoryResetRecord | null;
  lastCategoryRestore: CategoryRestoreResult | null;
}

export const initialWorkspaceState = (registry: CatalogRegistry): WorkspaceState => ({
  spec: createEmptySpec(registry),
  resetSnapshot: null,
  transition: null,
  presetTransaction: null,
  lastPresetUndo: null,
  lastCategoryReset: null,
  lastCategoryRestore: null,
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
        return {
          ...state,
          spec: next,
          transition: diffInactive(registry, state.spec, next, prevId) ?? state.transition,
          // Any direct edit of a preset-changed attribute protects it from undo (even if set back to the same value).
          presetTransaction: state.presetTransaction ? markUserEdited(state.presetTransaction, action.attributeId) : null,
        };
      }
      case "setExcluded": {
        // Output state only: value, source and provenance are untouched. Still a user edit
        // of that attribute (protects it from preset undo).
        const next = setPromptExclusion(state.spec, action.attributeId, action.excluded);
        if (next === state.spec) return state;
        return {
          ...state,
          spec: next,
          presetTransaction: state.presetTransaction ? markUserEdited(state.presetTransaction, action.attributeId) : null,
        };
      }
      case "resetCategory": {
        const { spec, removed } = resetCategory(state.spec, registry, action.categoryId);
        if (spec === state.spec) return state;
        let tx = state.presetTransaction;
        // Cleared preset values count as user edits: a later preset undo never re-writes them.
        for (const id of Object.keys(removed)) tx = tx ? markUserEdited(tx, id) : tx;
        return {
          ...state,
          spec,
          transition: diffInactive(registry, state.spec, spec, prevId) ?? state.transition,
          presetTransaction: tx,
          lastCategoryReset: { id: (state.lastCategoryReset?.id ?? 0) + 1, categoryId: action.categoryId, removed },
          lastCategoryRestore: null,
        };
      }
      case "undoCategoryReset": {
        const record = state.lastCategoryReset;
        if (!record) return state;
        const result = restoreCategoryReset(state.spec, record.removed);
        return {
          ...state,
          spec: result.spec,
          transition: diffInactive(registry, state.spec, result.spec, prevId) ?? state.transition,
          lastCategoryReset: null,
          lastCategoryRestore: { id: (state.lastCategoryRestore?.id ?? 0) + 1, categoryId: record.categoryId, restored: result.restored, skipped: result.skipped },
        };
      }
      case "applyPreset": {
        const { spec, transaction } = applyPresetPlan(state.spec, registry, action.plan, action.mode);
        if (transaction.changes.length === 0) return state;
        return {
          ...state,
          spec,
          transition: diffInactive(registry, state.spec, spec, prevId) ?? state.transition,
          presetTransaction: transaction,
          lastPresetUndo: null,
        };
      }
      case "undoPreset": {
        if (!state.presetTransaction) return state;
        const result = undoPresetTransaction(state.spec, state.presetTransaction);
        return {
          ...state,
          spec: result.spec,
          transition: diffInactive(registry, state.spec, result.spec, prevId) ?? state.transition,
          presetTransaction: null,
          lastPresetUndo: {
            id: (state.lastPresetUndo?.id ?? 0) + 1,
            presetId: state.presetTransaction.presetId,
            restored: result.restored,
            kept: result.kept,
          },
        };
      }
      case "reset": {
        const isEmpty = Object.keys(state.spec.selections).length === 0;
        return {
          spec: createEmptySpec(registry),
          // Resetting an already-empty spec must not destroy an existing snapshot.
          resetSnapshot: isEmpty ? state.resetSnapshot : state.spec,
          transition: null,
          presetTransaction: null,
          lastPresetUndo: null,
          // A full reset supersedes a pending category undo (restoring the full snapshot covers it).
          lastCategoryReset: null,
          lastCategoryRestore: null,
        };
      }
      case "restoreResetSnapshot":
        if (!state.resetSnapshot) return state;
        return { ...state, spec: state.resetSnapshot, resetSnapshot: null, transition: null, presetTransaction: null, lastCategoryReset: null };
      case "replace":
        return { ...state, spec: action.spec, transition: null, presetTransaction: null, lastCategoryReset: null };
    }
  };
