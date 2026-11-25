import type { CatalogRegistry } from "../catalog/registry";
import { canonicalizeSpec } from "../spec/factory";
import type { ImageSpec } from "../spec/schema";
import { analyzeSpecInput } from "../validation/analyze";

/**
 * Snapshots (Sprint 3.4, ADR-073): the WHOLE design saved under a name by the user — unlike My Presets
 * (reusable partial settings). Kept until the user deletes them; never trimmed with the automatic history.
 * Stored beside the workspace (`prompter:v1:snapshots`); the ImageSpec (0.4.0) is unchanged and every spec
 * is validated on load like an import.
 */
export const SNAPSHOTS_STORAGE_KEY = "prompter:v1:snapshots";
export const SNAPSHOT_NAME_MAX = 80;

export interface Snapshot {
  id: string;
  name: string;
  /** ISO time. */
  at: string;
  spec: ImageSpec;
}

export const newSnapshotId = (now: Date = new Date(), random: () => number = Math.random): string =>
  `snap_${now.getTime().toString(36)}${Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, "0")}`;

export const createSnapshot = (spec: ImageSpec, name: string, now: Date = new Date(), id: string = newSnapshotId(now)): Snapshot | null => {
  const n = name.trim().slice(0, SNAPSHOT_NAME_MAX);
  return n ? { id, name: n, at: now.toISOString(), spec: canonicalizeSpec(spec) } : null;
};

export const serializeSnapshots = (list: readonly Snapshot[]): string => JSON.stringify({ kind: "prompter.snapshots", version: 1, snapshots: list });

/** Damaged data loads as no snapshots; a snapshot whose spec is no longer valid is dropped. */
export const parseSnapshots = (text: string | null, registry: CatalogRegistry): Snapshot[] => {
  if (!text) return [];
  try {
    const raw = JSON.parse(text) as { kind?: unknown; version?: unknown; snapshots?: unknown };
    if (raw.kind !== "prompter.snapshots" || raw.version !== 1 || !Array.isArray(raw.snapshots)) return [];
    return raw.snapshots.flatMap((s: Record<string, unknown>) => {
      if (typeof s.id !== "string" || typeof s.name !== "string" || typeof s.at !== "string") return [];
      const a = analyzeSpecInput(s.spec, registry);
      return a.status === "valid" ? [{ id: s.id, name: s.name.slice(0, SNAPSHOT_NAME_MAX), at: s.at, spec: a.spec }] : [];
    });
  } catch {
    return [];
  }
};
