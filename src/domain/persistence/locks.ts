import type { KeyValueStore } from "./storage";

/**
 * LEGACY lock storage (Sprint 3.1, ADR-070). Since Sprint 3.2 (ADR-071) locks live in the ImageSpec
 * (`AttributeSelection.locked`). On load the app moves these locks into the restored spec and removes
 * the key only after that spec was saved successfully — nothing is lost if saving fails.
 * Unknown or damaged data is ignored (= no locks), never an error.
 */
export const LEGACY_LOCKS_STORAGE_KEY = "prompter:v1:locks";

export const loadLegacyLocks = (store: KeyValueStore, catalogId: string): string[] | null => {
  try {
    const raw = store.getItem(LEGACY_LOCKS_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { kind?: unknown; version?: unknown; catalogId?: unknown; attributeIds?: unknown };
    if (v.kind !== "prompter.locks" || v.version !== 1 || v.catalogId !== catalogId || !Array.isArray(v.attributeIds)) return [];
    return v.attributeIds.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
};

export const removeLegacyLocks = (store: KeyValueStore): void => {
  try {
    store.removeItem(LEGACY_LOCKS_STORAGE_KEY);
  } catch {
    // retried on the next load
  }
};
