import type { KeyValueStore } from "./storage";

/**
 * Local persistence of attribute locks (Sprint 3.1, ADR-070). A separate key beside the workspace: the
 * ImageSpec, the workspace envelope and JSON export are unchanged, so existing projects and files are
 * read exactly as before (no locks). Unknown or damaged data is ignored (= no locks), never an error.
 */
export const LOCKS_STORAGE_KEY = "prompter:v1:locks";

interface LocksEnvelope {
  kind: "prompter.locks";
  version: 1;
  catalogId: string;
  attributeIds: string[];
}

export const loadLocks = (store: KeyValueStore, catalogId: string): string[] => {
  try {
    const raw = store.getItem(LOCKS_STORAGE_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as Partial<LocksEnvelope>;
    if (v.kind !== "prompter.locks" || v.version !== 1 || v.catalogId !== catalogId || !Array.isArray(v.attributeIds)) return [];
    return v.attributeIds.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
};

export const saveLocks = (store: KeyValueStore, catalogId: string, attributeIds: readonly string[]): boolean => {
  try {
    if (attributeIds.length === 0) store.removeItem(LOCKS_STORAGE_KEY);
    else store.setItem(LOCKS_STORAGE_KEY, JSON.stringify({ kind: "prompter.locks", version: 1, catalogId, attributeIds: [...attributeIds] } satisfies LocksEnvelope));
    return true;
  } catch {
    return false;
  }
};
