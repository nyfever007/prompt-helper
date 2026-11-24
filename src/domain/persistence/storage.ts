import type { CatalogMigrationRecord } from "../catalog/migrate";
import type { CatalogRegistry } from "../catalog/registry";
import { error, fail, ok, type Diagnostic, type Result } from "../shared/diagnostics";
import { canonicalizeSpec } from "../spec/factory";
import type { ImageSpec } from "../spec/schema";
import { analyzeSpecInput, type ExcludedItem } from "../validation/analyze";

/** Minimal subset of the Web Storage API — injectable for tests/other backends. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const WORKSPACE_STORAGE_KEY = "prompter:v1:workspace";
export const MIGRATION_LOG_KEY = "prompter:v1:migration-log";
export const STORAGE_FORMAT_VERSION = 1;

interface WorkspaceEnvelope {
  kind: "prompter.workspace";
  storageVersion: typeof STORAGE_FORMAT_VERSION;
  savedAt: string;
  spec: ImageSpec;
}

export interface MigrationLogEntry {
  at: string;
  sourceSavedAt: string;
  records: CatalogMigrationRecord[];
}

export type LoadResult =
  | { status: "empty" }
  | {
      status: "loaded";
      spec: ImageSpec;
      savedAt: string;
      diagnostics: Diagnostic[];
      migrations: CatalogMigrationRecord[];
      /** Set when catalog migrations were applied; the pre-migration raw value is kept here. */
      preMigrationBackupKey?: string;
    }
  /** Partially usable. `spec` is a PROPOSAL — apply only after user confirmation. Raw kept under `backupKey`. */
  | {
      status: "recoverable";
      spec: ImageSpec;
      excluded: ExcludedItem[];
      savedAt: string;
      diagnostics: Diagnostic[];
      migrations: CatalogMigrationRecord[];
      backupKey: string;
    }
  /** Unusable. The raw value was preserved under `backupKey`. */
  | { status: "invalid"; diagnostics: Diagnostic[]; backupKey: string };

export interface SpecStorage {
  load(now?: Date): LoadResult;
  save(spec: ImageSpec, now?: Date): Result<{ savedAt: string }>;
  clear(): void;
  /** Raw value of a backup key (for "download original"). */
  readBackup(key: string): string | null;
  readMigrationLog(): MigrationLogEntry[];
}

/**
 * Persistence: browser-local storage of the current ImageSpec in a versioned
 * envelope. Loading runs the same analysis as JSON import (schema + catalog
 * ID migration + per-selection validation). Original data is always kept:
 * damaged → `:corrupt-backup`, migrated → `:pre-migration-backup`.
 */
export const createSpecStorage = (
  store: KeyValueStore,
  registry: CatalogRegistry,
  key: string = WORKSPACE_STORAGE_KEY,
): SpecStorage => {
  const backupKey = `${key}:corrupt-backup`;
  const preMigrationKey = `${key}:pre-migration-backup`;

  const tryWrite = (k: string, v: string) => {
    try {
      store.setItem(k, v);
      return true;
    } catch {
      return false; // best-effort
    }
  };

  const invalid = (raw: string, diagnostics: Diagnostic[]): LoadResult => {
    tryWrite(backupKey, raw);
    return { status: "invalid", diagnostics, backupKey };
  };

  const readMigrationLog = (): MigrationLogEntry[] => {
    try {
      const parsed: unknown = JSON.parse(store.getItem(MIGRATION_LOG_KEY) ?? "[]");
      return Array.isArray(parsed) ? (parsed as MigrationLogEntry[]) : [];
    } catch {
      return [];
    }
  };

  return {
    load(now = new Date()) {
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
      const env = envelope as Partial<WorkspaceEnvelope> | null;
      if (typeof env !== "object" || env === null || env.kind !== "prompter.workspace" || env.storageVersion !== STORAGE_FORMAT_VERSION) {
        return invalid(raw, [error("storage.unknown_format", "Saved data has an unknown format/version")]);
      }
      const savedAt = String(env.savedAt ?? "");
      const analysis = analyzeSpecInput(env.spec, registry);
      if (analysis.status === "invalid") return invalid(raw, analysis.diagnostics);
      if (analysis.status === "recoverable") {
        tryWrite(backupKey, raw);
        return { status: "recoverable", spec: analysis.spec, excluded: analysis.excluded, savedAt, diagnostics: analysis.diagnostics, migrations: analysis.migrations, backupKey };
      }
      if (analysis.migrations.length > 0) {
        tryWrite(preMigrationKey, raw);
        const log = readMigrationLog();
        const last = log[log.length - 1];
        const entry: MigrationLogEntry = { at: now.toISOString(), sourceSavedAt: savedAt, records: analysis.migrations };
        if (!last || last.sourceSavedAt !== savedAt || JSON.stringify(last.records) !== JSON.stringify(entry.records)) {
          tryWrite(MIGRATION_LOG_KEY, JSON.stringify([...log, entry]));
        }
        return { status: "loaded", spec: analysis.spec, savedAt, diagnostics: analysis.diagnostics, migrations: analysis.migrations, preMigrationBackupKey: preMigrationKey };
      }
      return { status: "loaded", spec: analysis.spec, savedAt, diagnostics: analysis.diagnostics, migrations: [] };
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

    readBackup(k) {
      try {
        return store.getItem(k);
      } catch {
        return null;
      }
    },

    readMigrationLog,
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
