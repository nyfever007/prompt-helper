"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  type PresetApplyMode,
  compilePrompt,
  createSpecStorage,
  canRedo,
  canUndo,
  createEmptySpec,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  loadLegacyLocks,
  parseHistory,
  resumeHistory,
  serializeHistory,
  type History,
  lockedIds,
  removeLegacyLocks,
  setLocks,
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
  type WorkspaceAction,
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
  /** `lockIds` (Sprint 3.3): apply a user preset's saved locks too. */
  applyPreset(plan: PresetPlan, mode: PresetApplyMode, lockIds?: readonly string[]): void;
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
  /** Sprint 3.4: multi-step history of the whole spec, undo / redo, restore an entry or a snapshot. */
  history: History;
  canUndo: boolean;
  canRedo: boolean;
  undo(): void;
  redo(): void;
  restoreHistory(id: number): void;
  restoreSnapshot(spec: ImageSpec, name: string): void;
  /** False when the browser's storage could not keep the full history. */
  historySaved: boolean;
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
  const [state, rawDispatch] = useReducer(reducer, registry, initialWorkspaceState);
  // every action carries its time for the history (Sprint 3.4); the reducer stays pure
  const dispatch = useCallback((action: WorkspaceAction) => rawDispatch({ ...action, time: Date.now() }), []);
  const storage = useMemo(() => (store ? createSpecStorage(store, registry) : null), [store, registry]);
  const [hydration, setHydration] = useState<HydrationState>({ status: "pending" });
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  // Sprint 3.2: locks of the Sprint 3.1 side key were moved into the restored spec; the key is removed
  // once that spec has been saved (so a failed save loses nothing).
  const legacyLocksPending = useRef(false);

  // Restore once on mount (client only — avoids SSR/localStorage mismatch).
  useEffect(() => {
    if (!storage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from external storage
      setHydration({ status: "empty" });
      return;
    }
    const loaded = storage.load();
    const legacy = store ? loadLegacyLocks(store, registry.id) : null;
    if (legacy !== null) legacyLocksPending.current = true;
    const withLegacy = <T extends ImageSpec>(spec: T): ImageSpec => (legacy?.length ? setLocks(spec, legacy, true) : spec);
    // Sprint 3.4: continue the stored history with the restored design (or start one)
    let storedHistory: string | null = null;
    try {
      storedHistory = store?.getItem(HISTORY_STORAGE_KEY) ?? null;
    } catch {
      // unavailable
    }
    const startSpec = loaded.status === "loaded" ? withLegacy(loaded.spec) : createEmptySpec(registry);
    dispatch({ type: "hydrate", spec: startSpec, history: resumeHistory(parseHistory(storedHistory, registry), startSpec, Date.now()) });
    switch (loaded.status) {
      case "loaded":
        setHydration({
          status: "loaded",
          savedAt: loaded.savedAt,
          migrations: loaded.migrations,
          ...(loaded.preMigrationBackupKey ? { preMigrationBackupKey: loaded.preMigrationBackupKey } : {}),
        });
        break;
      case "recoverable":
        setHydration({ status: "recoverable", proposed: withLegacy(loaded.spec), excluded: loaded.excluded, migrations: loaded.migrations, backupKey: loaded.backupKey });
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
    if (result.ok && legacyLocksPending.current && store) {
      removeLegacyLocks(store);
      legacyLocksPending.current = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the outcome of an external write
    setSave(result.ok ? { status: "saved", savedAt: result.value.savedAt } : { status: "failed", diagnostics: result.diagnostics });
  }, [state.spec, storage, autosaveOn, store]);

  // History is saved beside the workspace (debounced; flushed when the page is hidden or closed; fewer
  // entries if the browser's storage is full).
  const [historySaved, setHistorySaved] = useState(true);
  const pendingHistory = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!store || !autosaveOn) return;
    const write = () => {
      pendingHistory.current = null;
      for (const limit of [HISTORY_LIMIT, 20, 5]) {
        try {
          store.setItem(HISTORY_STORAGE_KEY, serializeHistory(state.history, registry.id, limit));
          setHistorySaved(limit === HISTORY_LIMIT);
          return;
        } catch {
          // try fewer entries
        }
      }
      setHistorySaved(false);
    };
    pendingHistory.current = write;
    const timer = window.setTimeout(write, 300);
    return () => window.clearTimeout(timer);
  }, [state.history, store, registry.id, autosaveOn]);
  useEffect(() => {
    const flush = () => pendingHistory.current?.();
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush(); // unmount
    };
  }, []);

  const compilation = useMemo(() => compilePrompt(state.spec, registry), [state.spec, registry]);
  const locks = useMemo(() => lockedIds(state.spec), [state.spec]);
  const lockSet = useMemo(() => new Set(locks), [locks]);
  const isLocked = useCallback((id: string) => lockSet.has(id), [lockSet]);
  const lock = useCallback((attributeIds: string[], locked: boolean) => dispatch({ type: "lock", attributeIds, locked }), [dispatch]);
  const undo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "redo" }), [dispatch]);
  const restoreHistory = useCallback((id: number) => dispatch({ type: "restoreHistory", id }), [dispatch]);
  const restoreSnapshot = useCallback((spec: ImageSpec, name: string) => dispatch({ type: "restoreSnapshot", spec, name }), [dispatch]);
  const unlockAll = useCallback(() => dispatch({ type: "unlockAll" }), [dispatch]);
  const inactive = useMemo(() => findInactiveSelections(state.spec, registry), [state.spec, registry]);

  const setValue = useCallback((attributeId: string, value: SelectionValue) => dispatch({ type: "set", attributeId, value }), [dispatch]);
  const clear = useCallback((attributeId: string) => dispatch({ type: "clear", attributeId }), [dispatch]);
  const reset = useCallback(() => dispatch({ type: "reset" }), [dispatch]);
  const restoreResetSnapshot = useCallback(() => dispatch({ type: "restoreResetSnapshot" }), [dispatch]);
  const replace = useCallback((next: ImageSpec) => dispatch({ type: "replace", spec: next }), [dispatch]);
  const applyPreset = useCallback(
    (plan: PresetPlan, mode: PresetApplyMode, lockIds?: readonly string[]) => dispatch({ type: "applyPreset", plan, mode, ...(lockIds?.length ? { lockIds } : {}) }),
    [dispatch],
  );
  const undoPreset = useCallback(() => dispatch({ type: "undoPreset" }), [dispatch]);
  const randomize = useCallback((style?: RandomStyle, seed?: number) => dispatch({ type: "applyRandom", seed: seed ?? Math.floor(Math.random() * 2 ** 31), ...(style ? { style } : {}) }), [dispatch]);
  const setExcluded = useCallback((attributeId: string, excluded: boolean) => dispatch({ type: "setExcluded", attributeId, excluded }), [dispatch]);
  const resetCategory = useCallback((categoryId: string) => dispatch({ type: "resetCategory", categoryId, at: new Date().toISOString() }), [dispatch]);
  const undoCategoryReset = useCallback((recordId?: number) => dispatch({ type: "undoCategoryReset", ...(recordId !== undefined ? { recordId } : {}) }), [dispatch]);
  const applyRecovery = useCallback(() => {
    if (hydration.status !== "recoverable") return;
    dispatch({ type: "replace", spec: hydration.proposed });
    setHydration({ status: "recovered", excludedCount: hydration.excluded.length, backupKey: hydration.backupKey });
  }, [hydration, dispatch]);
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
    history: state.history,
    canUndo: canUndo(state.history),
    canRedo: canRedo(state.history),
    undo,
    redo,
    restoreHistory,
    restoreSnapshot,
    historySaved,
    locks,
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
