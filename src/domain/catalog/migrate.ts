import { error, warning, type Diagnostic } from "../shared/diagnostics";
import type { LocalizedText } from "../shared/localized";
import type { CatalogRegistry } from "./registry";
import { compareSemVer } from "./semver";

/** One ID change that was actually applied to a spec, with its documented reason. */
export interface CatalogMigrationRecord {
  fromVersion: string;
  toVersion: string;
  op: "renameAttribute" | "renameOption";
  /** For renameOption: the attribute (post-rename id) whose option changed. */
  attributeId: string;
  from: string;
  to: string;
  reason: LocalizedText;
}

export interface CatalogMigrationResult {
  selections: Record<string, unknown>;
  /** Catalog version the selections now conform to. */
  version: string;
  records: CatalogMigrationRecord[];
  diagnostics: Diagnostic[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Apply the catalog's stable-ID rename maps to raw selections.
 *
 * - Pure: returns new objects; the input is never mutated (originals stay available).
 * - Only declared renames are applied. Unknown attributes/options are NEVER
 *   guessed, re-mapped or deleted here — they are left for validation/recovery.
 * - A rename whose target already exists is not applied (no overwrite); it is
 *   reported as an error so the user can decide during recovery.
 */
export const migrateCatalogSelections = (
  selections: Record<string, unknown>,
  fromVersion: string,
  registry: CatalogRegistry,
): CatalogMigrationResult => {
  const current = registry.version;
  if (fromVersion === current) return { selections, version: fromVersion, records: [], diagnostics: [] };

  const steps = registry.migrations;
  const start = steps.findIndex((m) => m.fromVersion === fromVersion);
  if (start === -1) {
    const newer = compareSemVer(fromVersion, current) > 0;
    return {
      selections,
      version: fromVersion,
      records: [],
      diagnostics: [
        warning(
          newer ? "migration.catalog_newer" : "migration.no_path",
          newer
            ? `Spec was made with a newer catalog (${fromVersion}) than this build (${current})`
            : `No migration path from catalog ${fromVersion} to ${current}`,
          { path: "catalog.version", params: { from: fromVersion, to: current } },
        ),
      ],
    };
  }

  let out: Record<string, unknown> = { ...selections };
  const records: CatalogMigrationRecord[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const step of steps.slice(start)) {
    const base = { fromVersion: step.fromVersion, toVersion: step.toVersion };
    for (const change of step.changes.filter((c) => c.op === "renameAttribute")) {
      if (change.op !== "renameAttribute" || !(change.from in out)) continue;
      if (change.to in out) {
        diagnostics.push(
          error("migration.collision", `Cannot rename "${change.from}" to "${change.to}": target already present`, {
            attributeId: change.from,
            path: `selections.${change.from}`,
          }),
        );
        continue;
      }
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(out)) next[k === change.from ? change.to : k] = v;
      out = next;
      records.push({ ...base, op: "renameAttribute", attributeId: change.to, from: change.from, to: change.to, reason: change.reason });
    }
    for (const change of step.changes) {
      if (change.op !== "renameOption") continue;
      const sel = out[change.attributeId];
      if (!isRecord(sel) || !isRecord(sel.value)) continue;
      const value = sel.value;
      if (value.kind === "single" && value.optionId === change.from) {
        out = { ...out, [change.attributeId]: { ...sel, value: { ...value, optionId: change.to } } };
      } else if (value.kind === "multi" && Array.isArray(value.optionIds) && value.optionIds.includes(change.from)) {
        if (value.optionIds.includes(change.to)) {
          diagnostics.push(
            error("migration.collision", `Cannot rename option "${change.from}" to "${change.to}" in "${change.attributeId}": already selected`, {
              attributeId: change.attributeId,
            }),
          );
          continue;
        }
        const optionIds = value.optionIds.map((id: unknown) => (id === change.from ? change.to : id));
        out = { ...out, [change.attributeId]: { ...sel, value: { ...value, optionIds } } };
      } else {
        continue;
      }
      records.push({ ...base, op: "renameOption", attributeId: change.attributeId, from: change.from, to: change.to, reason: change.reason });
    }
  }
  return { selections: out, version: current, records, diagnostics };
};
