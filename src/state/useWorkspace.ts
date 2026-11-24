"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  compilePrompt,
  createSpecStorage,
  findInactiveSelections,
  type CatalogMigrationRecord,
  type CatalogRegistry,
  type Diagnostic,
  type ExcludedItem,
  type ImageSpec,
  type InactiveSelection,
  type KeyValueStore,
  type PromptCompilation,
  type SelectionValue,
  type SpecStorage,
} from "@/domain";
import { createWorkspaceReducer, initialWorkspaceState, type Transition } from "./workspaceReducer";

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
  setValue(attributeId: string, value: SelectionValue): void;
  clear(attributeId: string): void;
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
        dispatch({ type: "replace", spec: loaded.spec });
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

  const compilation = useMemo(() => compilePrompt(state.spec, registry), [state.spec, registry]);
  const inactive = useMemo(() => findInactiveSelections(state.spec, registry), [state.spec, registry]);

  const setValue = useCallback((attributeId: string, value: SelectionValue) => dispatch({ type: "set", attributeId, value }), []);
  const clear = useCallback((attributeId: string) => dispatch({ type: "clear", attributeId }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const restoreResetSnapshot = useCallback(() => dispatch({ type: "restoreResetSnapshot" }), []);
  const replace = useCallback((next: ImageSpec) => dispatch({ type: "replace", spec: next }), []);
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
    setValue,
    clear,
    reset,
    restoreResetSnapshot,
    replace,
    applyRecovery,
    discardRecovery,
  };
};
