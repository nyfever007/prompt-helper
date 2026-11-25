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
  | { type: "resetCategory"; categoryId: string; at?: string }
  /** Restore one recorded category reset (default: the most recent). */
  | { type: "undoCategoryReset"; recordId?: number };

/** Session-only history of category resets (TD-09): most recent first, at most this many. */
export const CATEGORY_RESET_HISTORY_LIMIT = 5;

/**
 * Session-only record of one category reset (TD-09): exactly the selection objects it
 * removed (value, exclusion, custom entries, preset origin — by reference), plus which of
 * those attributes the user changed afterwards. Restoring brings back only attributes that
 * are still unset AND untouched since this reset; everything else stays as it is now.
 */
export interface CategoryResetRecord {
  /** Increasing sequence number in this session (operation order). */
  id: number;
  categoryId: string;
  /** When the reset happened (ISO, for the history list); absent in tests that omit it. */
  at?: string;
  removed: Record<string, AttributeSelection>;
  /** Removed attributes that were set, cleared or toggled again after this reset (kept on restore). */
  editedSince: string[];
}

/** Result of the last category-reset undo (for the notice). */
export interface CategoryRestoreResult {
  id: number;
  categoryId: string;
  restored: string[];
  /** Kept as they are now: set again or edited (incl. cleared) after the reset. */
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
  /** Recent category resets, most recent first (≤ CATEGORY_RESET_HISTORY_LIMIT). */
  categoryResets: CategoryResetRecord[];
  /** Last used reset sequence number (keeps ids increasing after the history empties). */
  lastResetSeq?: number;
  lastCategoryRestore: CategoryRestoreResult | null;
}

export const initialWorkspaceState = (registry: CatalogRegistry): WorkspaceState => ({
  spec: createEmptySpec(registry),
  resetSnapshot: null,
  transition: null,
  presetTransaction: null,
  lastPresetUndo: null,
  categoryResets: [],
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

/** Attribute ids whose stored selection differs between two specs (added, removed or replaced). */
const changedAttributeIds = (before: ImageSpec, after: ImageSpec): string[] => {
  if (before === after) return [];
  const out: string[] = [];
  for (const id of Object.keys(before.selections)) if (before.selections[id] !== after.selections[id]) out.push(id);
  for (const id of Object.keys(after.selections)) if (!(id in before.selections)) out.push(id);
  return out;
};

/** Marks later changes in every recorded reset that removed those attributes (their current state wins on restore). */
const trackEdits = (records: CategoryResetRecord[], changed: readonly string[]): CategoryResetRecord[] => {
  if (changed.length === 0 || records.length === 0) return records;
  let touched = false;
  const next = records.map((r) => {
    const hits = changed.filter((id) => id in r.removed && !r.editedSince.includes(id));
    if (hits.length === 0) return r;
    touched = true;
    return { ...r, editedSince: [...r.editedSince, ...hits] };
  });
  return touched ? next : records;
};

/**
 * Thin UI reducer over pure domain operations. Invalid actions leave the
 * spec untouched (the UI only offers valid values).
 */
export const createWorkspaceReducer = (registry: CatalogRegistry) => {
  const step = createStep(registry);
  return (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
    const next = step(state, action);
    if (next === state || next.spec === state.spec) return next;
    // Any later change of an attribute that a recorded reset removed protects the current value (TD-09).
    // The new record of a `resetCategory` is excluded: its own removals are not edits.
    const changed = changedAttributeIds(state.spec, next.spec);
    if (action.type === "resetCategory") {
      const [own, ...older] = next.categoryResets;
      return own ? { ...next, categoryResets: [own, ...trackEdits(older, changed)] } : next;
    }
    return { ...next, categoryResets: trackEdits(next.categoryResets, changed) };
  };
};

const createStep =
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
        const record: CategoryResetRecord = {
          id: (state.categoryResets[0]?.id ?? state.lastResetSeq ?? 0) + 1,
          categoryId: action.categoryId,
          ...(action.at ? { at: action.at } : {}),
          removed,
          editedSince: [],
        };
        return {
          ...state,
          spec,
          transition: diffInactive(registry, state.spec, spec, prevId) ?? state.transition,
          presetTransaction: tx,
          // Newest first; the oldest record beyond the limit is dropped (session only, never persisted).
          categoryResets: [record, ...state.categoryResets].slice(0, CATEGORY_RESET_HISTORY_LIMIT),
          lastResetSeq: record.id,
          lastCategoryRestore: null,
        };
      }
      case "undoCategoryReset": {
        const record = action.recordId === undefined ? state.categoryResets[0] : state.categoryResets.find((r) => r.id === action.recordId);
        if (!record) return state;
        // Attributes edited after this reset keep their current state (even when that is “unset”).
        const editable = Object.fromEntries(Object.entries(record.removed).filter(([id]) => !record.editedSince.includes(id)));
        const result = restoreCategoryReset(state.spec, editable);
        const skipped = [...new Set([...result.skipped, ...record.editedSince])].sort();
        return {
          ...state,
          spec: result.spec,
          transition: diffInactive(registry, state.spec, result.spec, prevId) ?? state.transition,
          categoryResets: state.categoryResets.filter((r) => r !== record),
          lastCategoryRestore: { id: (state.lastCategoryRestore?.id ?? 0) + 1, categoryId: record.categoryId, restored: result.restored, skipped },
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
          // A full reset supersedes pending category undos (restoring the full snapshot covers them).
          categoryResets: [],
          lastResetSeq: state.categoryResets[0]?.id ?? state.lastResetSeq,
          lastCategoryRestore: null,
        };
      }
      case "restoreResetSnapshot":
        if (!state.resetSnapshot) return state;
        return { ...state, spec: state.resetSnapshot, resetSnapshot: null, transition: null, presetTransaction: null, categoryResets: [] };
      case "replace":
        // A whole new spec (import, recovery): earlier resets no longer describe it.
        return { ...state, spec: action.spec, transition: null, presetTransaction: null, categoryResets: [] };
    }
  };
