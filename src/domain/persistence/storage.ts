import type { CatalogRegistry } from "../catalog/registry";
import { error, fail, ok, type Diagnostic, type Result } from "../shared/diagnostics";
import { canonicalizeSpec } from "../spec/factory";
import type { ImageSpec } from "../spec/schema";
import { validateImageSpec } from "../validation/specValidator";

/** Minimal subset of the Web Storage API — injectable for tests/other backends. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const WORKSPACE_STORAGE_KEY = "prompter:v1:workspace";
export const STORAGE_FORMAT_VERSION = 1;

interface WorkspaceEnvelope {
  kind: "prompter.workspace";
  storageVersion: typeof STORAGE_FORMAT_VERSION;
  savedAt: string;
  spec: ImageSpec;
}

export type LoadResult =
  | { status: "empty" }
  | { status: "loaded"; spec: ImageSpec; savedAt: string; diagnostics: Diagnostic[] }
  /** Stored data could not be used. The raw value was preserved under `backupKey`. */
  | { status: "invalid"; diagnostics: Diagnostic[]; backupKey: string };

export interface SpecStorage {
  load(): LoadResult;
  save(spec: ImageSpec, now?: Date): Result<{ savedAt: string }>;
  clear(): void;
}

/**
 * Persistence: browser-local storage of the current ImageSpec, wrapped in a
 * versioned envelope and fully re-validated on load.
 */
export const createSpecStorage = (
  store: KeyValueStore,
  registry: CatalogRegistry,
  key: string = WORKSPACE_STORAGE_KEY,
): SpecStorage => {
  const backupKey = `${key}:corrupt-backup`;

  const invalid = (raw: string, diagnostics: Diagnostic[]): LoadResult => {
    try {
      store.setItem(backupKey, raw);
    } catch {
      // Backup is best-effort.
    }
    return { status: "invalid", diagnostics, backupKey };
  };

  return {
    load() {
      let raw: string | null;
      try {
        raw = store.getItem(key);
      } catch (e) {
        return { status: "invalid", diagnostics: [error("storage.unavailable", (e as Error).message)], backupKey };
      }
      if (raw === null) return { status: "empty" };

      let envelope: unknown;
      try {
        envelope = JSON.parse(raw);
      } catch {
        return invalid(raw, [error("storage.invalid_json", "Saved data is not valid JSON")]);
      }
      if (
        typeof envelope !== "object" ||
        envelope === null ||
        (envelope as Partial<WorkspaceEnvelope>).kind !== "prompter.workspace" ||
        (envelope as Partial<WorkspaceEnvelope>).storageVersion !== STORAGE_FORMAT_VERSION
      ) {
        return invalid(raw, [error("storage.unknown_format", "Saved data has an unknown format/version")]);
      }
      const { spec, savedAt } = envelope as WorkspaceEnvelope;
      const result = validateImageSpec(spec, registry);
      if (!result.ok) return invalid(raw, result.diagnostics);
      return { status: "loaded", spec: result.value, savedAt: String(savedAt), diagnostics: result.diagnostics };
    },

    save(spec, now = new Date()) {
      const envelope: WorkspaceEnvelope = {
        kind: "prompter.workspace",
        storageVersion: STORAGE_FORMAT_VERSION,
        savedAt: now.toISOString(),
        spec: canonicalizeSpec(spec),
      };
      try {
        store.setItem(key, JSON.stringify(envelope));
        return ok({ savedAt: envelope.savedAt });
      } catch (e) {
        return fail([error("storage.write_failed", `Could not save locally: ${(e as Error).message}`)]);
      }
    },

    clear() {
      try {
        store.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
};

/** In-memory KeyValueStore (tests, SSR, or when localStorage is unavailable). */
export const createMemoryStore = (initial: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } => {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  };
};
