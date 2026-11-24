import { z } from "zod";
import { migrateCatalogSelections, type CatalogMigrationRecord } from "../catalog/migrate";
import type { CatalogRegistry } from "../catalog/registry";
import { checkValueForAttribute } from "../catalog/valueCheck";
import { error, fromZodIssues, type Diagnostic } from "../shared/diagnostics";
import { AttributeIdSchema, CatalogIdSchema, SemVerSchema } from "../shared/ids";
import { migrateRawSpec } from "../spec/migrations";
import {
  AttributeSelectionSchema,
  IMAGE_SPEC_KIND,
  IMAGE_SPEC_SCHEMA_VERSION,
  ImageSpecSchema,
  TaskSchema,
  type AttributeSelection,
  type ImageSpec,
} from "../spec/schema";
import { validateSpecAgainstCatalog } from "./specValidator";

/** A piece of input that could not be used, kept verbatim with the reasons. */
export interface ExcludedItem {
  path: string;
  attributeId?: string;
  original: unknown;
  diagnostics: Diagnostic[];
}

export type SpecAnalysis =
  | { status: "valid"; spec: ImageSpec; diagnostics: Diagnostic[]; migrations: CatalogMigrationRecord[] }
  /** Some parts are unusable. `spec` is the PROPOSED recovery; apply only after user confirmation. */
  | { status: "recoverable"; spec: ImageSpec; excluded: ExcludedItem[]; diagnostics: Diagnostic[]; migrations: CatalogMigrationRecord[] }
  | { status: "invalid"; diagnostics: Diagnostic[] };

const HeaderSchema = z.looseObject({
  kind: z.literal(IMAGE_SPEC_KIND),
  schemaVersion: z.literal(IMAGE_SPEC_SCHEMA_VERSION),
  task: TaskSchema,
  catalog: z.object({ id: CatalogIdSchema, version: SemVerSchema }).strict(),
  selections: z.record(z.string(), z.unknown()),
});
const KNOWN_TOP_LEVEL = new Set(["kind", "schemaVersion", "task", "catalog", "selections"]);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Full input pipeline used by JSON import and local restore:
 * structure → schema migration → catalog ID migration → per-selection
 * validation → (valid | recoverable | invalid).
 *
 * Never guesses: unknown attributes/options/fields are excluded and listed,
 * never re-mapped. The original input object is not mutated.
 */
export const analyzeSpecInput = (input: unknown, registry: CatalogRegistry): SpecAnalysis => {
  if (!isPlainObject(input)) return { status: "invalid", diagnostics: [error("spec.not_object", "An ImageSpec must be a JSON object")] };
  if (input.kind !== IMAGE_SPEC_KIND) {
    return {
      status: "invalid",
      diagnostics: [error("spec.wrong_kind", `Not a Prompter ImageSpec (expected kind "${IMAGE_SPEC_KIND}")`, { path: "kind" })],
    };
  }
  const schemaMigrated = migrateRawSpec(input);
  if (!schemaMigrated.ok) return { status: "invalid", diagnostics: schemaMigrated.diagnostics };

  const header = HeaderSchema.safeParse(schemaMigrated.value);
  if (!header.success) return { status: "invalid", diagnostics: fromZodIssues("spec.schema", header.error.issues) };
  const raw = header.data;
  if (raw.catalog.id !== registry.id) {
    return {
      status: "invalid",
      diagnostics: [error("spec.catalog_mismatch", `Spec uses catalog "${raw.catalog.id}" but "${registry.id}" is loaded`, { path: "catalog.id" })],
    };
  }

  const excluded: ExcludedItem[] = [];
  for (const key of Object.keys(raw).sort()) {
    if (!KNOWN_TOP_LEVEL.has(key)) {
      excluded.push({ path: key, original: raw[key], diagnostics: [error("spec.unknown_field", `Unknown top-level field "${key}"`, { path: key })] });
    }
  }

  const migration = migrateCatalogSelections(raw.selections, raw.catalog.version, registry);
  const selections: Record<string, AttributeSelection> = {};
  for (const key of Object.keys(migration.selections).sort()) {
    const original = migration.selections[key];
    const path = `selections.${key}`;
    const reject = (diagnostics: Diagnostic[]) => excluded.push({ path, attributeId: key, original, diagnostics });

    if (!AttributeIdSchema.safeParse(key).success) {
      reject([error("selection.invalid_id", `"${key}" is not a valid attribute id`, { path })]);
      continue;
    }
    const parsed = AttributeSelectionSchema.safeParse(original);
    if (!parsed.success) {
      reject(fromZodIssues("spec.schema", parsed.error.issues, path));
      continue;
    }
    const attribute = registry.getAttribute(key);
    if (!attribute) {
      reject([error("selection.unknown_attribute", `Unknown attribute "${key}"`, { attributeId: key, path })]);
      continue;
    }
    const problems = checkValueForAttribute(attribute, parsed.data.value, `${path}.value`);
    if (problems.length > 0) {
      reject(problems);
      continue;
    }
    selections[key] = parsed.data;
  }

  const spec = ImageSpecSchema.parse({
    kind: raw.kind,
    schemaVersion: raw.schemaVersion,
    task: raw.task,
    catalog: { id: raw.catalog.id, version: migration.version },
    selections,
  });
  const diagnostics = [...schemaMigrated.diagnostics, ...migration.diagnostics, ...validateSpecAgainstCatalog(spec, registry)];
  return excluded.length === 0
    ? { status: "valid", spec, diagnostics, migrations: migration.records }
    : { status: "recoverable", spec, excluded, diagnostics, migrations: migration.records };
};
