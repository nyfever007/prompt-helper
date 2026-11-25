"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  type PresetApplyMode,
  compilePrompt,
  createSpecStorage,
  loadLocks,
  saveLocks,
  findInactiveSelections,
  type CatalogMigrationRecord,
  type CatalogRegistry,
  type Diagnostic,
  type ExcludedItem,
  type ImageSpec,
  type InactiveSelection,
  type KeyValueStore,
  type PresetPlan,
  type PresetTransaction,
  type PromptCompilation,
  type RandomStyle,
  type SelectionValue,
  type SpecStorage,
} from "@/domain";
import {
  createWorkspaceReducer,
  initialWorkspaceState,
  type CategoryResetRecord,
  type CategoryRestoreResult,
  type LastRandom,
  type PresetUndoResult,
  type Transition,
} from "./workspaceReducer";

export type HydrationState =
  | { status: "pending" }
  | { status: "empty" }
  | { status: "loaded"; savedAt: string; migrations: CatalogMigrationRecord[]; preMigrationBackupKey?: string }
  /** Waiting for the user's recovery decision. Autosave is paused. */
  | { status: "recoverable"; proposed: ImageSpec; excluded: ExcludedItem[]; migrations: CatalogMigrationRecord[]; backupKey: string }
  | { status: "recovered"; excludedCount: number; backupKey: string }
  | { status: "discarded"; backupKey: string }
  | { status: "invalid"; diagnostics: Diagnostic[]; backupKey: string };

export type SaveState = { status: "idle" } | { status: "saved"; savedAt: string } | { status: "failed"; diagnostics: Diagnostic[] };

export interface Workspace {
  spec: ImageSpec;
  compilation: PromptCompilation;
  inactive: InactiveSelection[];
  transition: Transition | null;
  hydration: HydrationState;
  save: SaveState;
  storage: SpecStorage | null;
  hasResetSnapshot: boolean;
  presetTransaction: PresetTransaction | null;
  lastPresetUndo: PresetUndoResult | null;
  applyPreset(plan: PresetPlan, mode: PresetApplyMode): void;
  undoPreset(): void;
  /** Sprint 2-D.6: fill every applicable unset (or earlier random) attribute with random values. */
  randomize(style?: RandomStyle, seed?: number): void;
  lastRandom: LastRandom | null;
  /** Recent category resets in this session, most recent first (TD-09). */
  categoryResets: CategoryResetRecord[];
  lastCategoryRestore: CategoryRestoreResult | null;
  setExcluded(attributeId: string, excluded: boolean): void;
  resetCategory(categoryId: string): void;
  /** Restore one recorded reset (default: the most recent). */
  undoCategoryReset(recordId?: number): void;
  setValue(attributeId: string, value: SelectionValue): void;
  clear(attributeId: string): void;
  /** Sprint 3.1: locked attribute ids (sorted) and a fast lookup. */
  locks: string[];
  isLocked(attributeId: string): boolean;
  lock(attributeIds: string[], locked: boolean): void;
  unlockAll(): void;
  reset(): void;
  restoreResetSnapshot(): void;
  replace(spec: ImageSpec): void;
  applyRecovery(): void;
  discardRecovery(): void;
}

/**
 * Owns the single ImageSpec for the whole app. Every mode reads and writes
 * through this hook, so switching modes never forks or resets state.
 */
export const useWorkspace = (registry: CatalogRegistry, store: KeyValueStore | null): Workspace => {
  const reducer = useMemo(() => createWorkspaceReducer(registry), [registry]);
  const [state, dispatch] = useReducer(reducer, registry, initialWorkspaceState);
  const storage = useMemo(() => (store ? createSpecStorage(store, registry) : null), [store, registry]);
  const [hydration, setHydration] = useState<HydrationState>({ status: "pending" });
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  // Restore once on mount (client only — avoids SSR/localStorage mismatch).
  useEffect(() => {
    if (!storage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from external storage
      setHydration({ status: "empty" });
      return;
    }
    const loaded = storage.load();
    switch (loaded.status) {
      case "loaded":
        dispatch({ type: "replace", spec: loaded.spec, locks: store ? loadLocks(store, registry.id) : [] });
        setHydration({
          status: "loaded",
          savedAt: loaded.savedAt,
          migrations: loaded.migrations,
          ...(loaded.preMigrationBackupKey ? { preMigrationBackupKey: loaded.preMigrationBackupKey } : {}),
        });
        break;
      case "recoverable":
        setHydration({ status: "recoverable", proposed: loaded.spec, excluded: loaded.excluded, migrations: loaded.migrations, backupKey: loaded.backupKey });
        break;
      case "invalid":
        setHydration({ status: "invalid", diagnostics: loaded.diagnostics, backupKey: loaded.backupKey });
        break;
      case "empty":
        setHydration({ status: "empty" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per storage; store and registry define it
  }, [storage]);

  // Autosave every change after hydration — paused while a recovery decision is pending,
  // so the damaged original is never overwritten before the user decides.
  const autosaveOn = hydration.status !== "pending" && hydration.status !== "recoverable";
  useEffect(() => {
    if (!storage || !autosaveOn) return;
    const result = storage.save(state.spec);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the outcome of an external write
    setSave(result.ok ? { status: "saved", savedAt: result.value.savedAt } : { status: "failed", diagnostics: result.diagnostics });
  }, [state.spec, storage, autosaveOn]);

  // Locks are saved beside the workspace (separate key, ImageSpec unchanged).
  useEffect(() => {
    if (!store || !autosaveOn) return;
    saveLocks(store, registry.id, state.locks);
  }, [state.locks, store, registry.id, autosaveOn]);

  const compilation = useMemo(() => compilePrompt(state.spec, registry), [state.spec, registry]);
  const lockSet = useMemo(() => new Set(state.locks), [state.locks]);
  const isLocked = useCallback((id: string) => lockSet.has(id), [lockSet]);
  const lock = useCallback((attributeIds: string[], locked: boolean) => dispatch({ type: "lock", attributeIds, locked }), []);
  const unlockAll = useCallback(() => dispatch({ type: "unlockAll" }), []);
  const inactive = useMemo(() => findInactiveSelections(state.spec, registry), [state.spec, registry]);

  const setValue = useCallback((attributeId: string, value: SelectionValue) => dispatch({ type: "set", attributeId, value }), []);
  const clear = useCallback((attributeId: string) => dispatch({ type: "clear", attributeId }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const restoreResetSnapshot = useCallback(() => dispatch({ type: "restoreResetSnapshot" }), []);
  const replace = useCallback((next: ImageSpec) => dispatch({ type: "replace", spec: next }), []);
  const applyPreset = useCallback((plan: PresetPlan, mode: PresetApplyMode) => dispatch({ type: "applyPreset", plan, mode }), []);
  const undoPreset = useCallback(() => dispatch({ type: "undoPreset" }), []);
  const randomize = useCallback((style?: RandomStyle, seed?: number) => dispatch({ type: "applyRandom", seed: seed ?? Math.floor(Math.random() * 2 ** 31), ...(style ? { style } : {}) }), []);
  const setExcluded = useCallback((attributeId: string, excluded: boolean) => dispatch({ type: "setExcluded", attributeId, excluded }), []);
  const resetCategory = useCallback((categoryId: string) => dispatch({ type: "resetCategory", categoryId, at: new Date().toISOString() }), []);
  const undoCategoryReset = useCallback((recordId?: number) => dispatch({ type: "undoCategoryReset", ...(recordId !== undefined ? { recordId } : {}) }), []);
  const applyRecovery = useCallback(() => {
    if (hydration.status !== "recoverable") return;
    dispatch({ type: "replace", spec: hydration.proposed });
    setHydration({ status: "recovered", excludedCount: hydration.excluded.length, backupKey: hydration.backupKey });
  }, [hydration]);
  const discardRecovery = useCallback(() => {
    if (hydration.status !== "recoverable") return;
    setHydration({ status: "discarded", backupKey: hydration.backupKey });
  }, [hydration]);

  return {
    spec: state.spec,
    compilation,
    inactive,
    transition: state.transition,
    hydration,
    save,
    storage,
    hasResetSnapshot: state.resetSnapshot !== null,
    presetTransaction: state.presetTransaction,
    lastPresetUndo: state.lastPresetUndo,
    applyPreset,
    undoPreset,
    randomize,
    lastRandom: state.lastRandom ?? null,
    categoryResets: state.categoryResets,
    lastCategoryRestore: state.lastCategoryRestore,
    setExcluded,
    resetCategory,
    undoCategoryReset,
    setValue,
    clear,
    locks: state.locks,
    isLocked,
    lock,
    unlockAll,
    reset,
    restoreResetSnapshot,
    replace,
    applyRecovery,
    discardRecovery,
  };
};
