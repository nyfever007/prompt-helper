"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  compilePrompt,
  createEmptySpec,
  createSpecStorage,
  type CatalogRegistry,
  type Diagnostic,
  type ImageSpec,
  type KeyValueStore,
  type PromptCompilation,
  type SelectionValue,
} from "@/domain";
import { createWorkspaceReducer } from "./workspaceReducer";

export type HydrationState =
  | { status: "pending" }
  | { status: "empty" }
  | { status: "loaded"; savedAt: string }
  | { status: "invalid"; diagnostics: Diagnostic[] };

export type SaveState = { status: "idle" } | { status: "saved"; savedAt: string } | { status: "failed"; diagnostics: Diagnostic[] };

export interface Workspace {
  spec: ImageSpec;
  compilation: PromptCompilation;
  hydration: HydrationState;
  save: SaveState;
  setValue(attributeId: string, value: SelectionValue): void;
  clear(attributeId: string): void;
  reset(): void;
  replace(spec: ImageSpec): void;
}

/**
 * Owns the single ImageSpec for the whole app. Every mode reads and writes
 * through this hook, so switching modes never forks or resets state.
 */
export const useWorkspace = (registry: CatalogRegistry, store: KeyValueStore | null): Workspace => {
  const reducer = useMemo(() => createWorkspaceReducer(registry), [registry]);
  const [spec, dispatch] = useReducer(reducer, registry, createEmptySpec);
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
    if (loaded.status === "loaded") {
      dispatch({ type: "replace", spec: loaded.spec });
      setHydration({ status: "loaded", savedAt: loaded.savedAt });
    } else if (loaded.status === "invalid") {
      setHydration({ status: "invalid", diagnostics: loaded.diagnostics });
    } else {
      setHydration({ status: "empty" });
    }
  }, [storage]);

  // Autosave every change after hydration. Gated on hydration *state* (not a ref)
  // so the pre-restore empty spec is never written over saved data.
  const hydrationDone = hydration.status !== "pending";
  useEffect(() => {
    if (!storage || !hydrationDone) return;
    const result = storage.save(spec);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the outcome of an external write
    setSave(result.ok ? { status: "saved", savedAt: result.value.savedAt } : { status: "failed", diagnostics: result.diagnostics });
  }, [spec, storage, hydrationDone]);

  const compilation = useMemo(() => compilePrompt(spec, registry), [spec, registry]);

  const setValue = useCallback((attributeId: string, value: SelectionValue) => dispatch({ type: "set", attributeId, value }), []);
  const clear = useCallback((attributeId: string) => dispatch({ type: "clear", attributeId }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const replace = useCallback((next: ImageSpec) => dispatch({ type: "replace", spec: next }), []);

  return { spec, compilation, hydration, save, setValue, clear, reset, replace };
};
