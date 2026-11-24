import type { CatalogRegistry } from "../catalog/registry";
import { IMAGE_SPEC_KIND, IMAGE_SPEC_SCHEMA_VERSION, type ImageSpec } from "./schema";

/**
 * Create an empty spec bound to a catalog. Every attribute starts `unset`:
 * catalog `defaultValue`s are suggestions only and are NOT applied here.
 */
export const createEmptySpec = (registry: CatalogRegistry): ImageSpec => ({
  kind: IMAGE_SPEC_KIND,
  schemaVersion: IMAGE_SPEC_SCHEMA_VERSION,
  task: "text-to-image",
  catalog: { id: registry.id, version: registry.version },
  selections: {},
});

/**
 * Canonical form for export/hashing: selection keys sorted, field order fixed.
 * Pure — returns a new object, never mutates the input.
 */
export const canonicalizeSpec = (spec: ImageSpec): ImageSpec => {
  const selections: ImageSpec["selections"] = {};
  for (const key of Object.keys(spec.selections).sort()) {
    const s = spec.selections[key]!;
    selections[key] = {
      value: s.value,
      source: s.source,
      ...(s.priority !== undefined ? { priority: s.priority } : {}),
      ...(s.origin !== undefined ? { origin: { presetId: s.origin.presetId, presetVersion: s.origin.presetVersion } } : {}),
    };
  }
  return {
    kind: spec.kind,
    schemaVersion: spec.schemaVersion,
    task: spec.task,
    catalog: { id: spec.catalog.id, version: spec.catalog.version },
    selections,
  };
};
