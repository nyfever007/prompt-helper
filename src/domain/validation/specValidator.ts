import { evaluateAll } from "../catalog/conditions";
import type { CatalogRegistry } from "../catalog/registry";
import { checkValueForAttribute } from "../catalog/valueCheck";
import {
  error,
  fail,
  fromZodIssues,
  hasErrors,
  info,
  ok,
  warning,
  type Diagnostic,
  type Result,
} from "../shared/diagnostics";
import { resolveText } from "../shared/localized";
import { migrateRawSpec } from "../spec/migrations";
import { IMAGE_SPEC_KIND, ImageSpecSchema, type ImageSpec } from "../spec/schema";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Stage 1 — structural validation (catalog-independent):
 * type check, document kind, schema version/migration, Zod schema.
 */
export const parseImageSpec = (input: unknown): Result<ImageSpec> => {
  if (!isPlainObject(input)) {
    return fail([error("spec.not_object", "An ImageSpec must be a JSON object")]);
  }
  if (input.kind !== IMAGE_SPEC_KIND) {
    return fail([
      error("spec.wrong_kind", `Not a Prompter ImageSpec (expected kind "${IMAGE_SPEC_KIND}")`, { path: "kind" }),
    ]);
  }
  const migrated = migrateRawSpec(input);
  if (!migrated.ok) return migrated;

  const parsed = ImageSpecSchema.safeParse(migrated.value);
  if (!parsed.success) return fail(fromZodIssues("spec.schema", parsed.error.issues));
  return ok(parsed.data, migrated.diagnostics);
};

/**
 * Stage 2 — semantic validation against a catalog. Reports only; never
 * rewrites the spec.
 */
export const validateSpecAgainstCatalog = (spec: ImageSpec, registry: CatalogRegistry): Diagnostic[] => {
  const out: Diagnostic[] = [];

  if (spec.catalog.id !== registry.id) {
    out.push(
      error("spec.catalog_mismatch", `Spec uses catalog "${spec.catalog.id}" but "${registry.id}" is loaded`, {
        path: "catalog.id",
      }),
    );
    return out;
  }
  if (spec.catalog.version !== registry.version) {
    out.push(
      warning(
        "spec.catalog_version_mismatch",
        `Spec was made with catalog ${spec.catalog.version}; loaded catalog is ${registry.version}`,
        { path: "catalog.version", params: { spec: spec.catalog.version, loaded: registry.version } },
      ),
    );
  }

  for (const attributeId of Object.keys(spec.selections).sort()) {
    const selection = spec.selections[attributeId]!;
    const attribute = registry.getAttribute(attributeId);
    const path = `selections.${attributeId}`;
    if (!attribute) {
      out.push(error("selection.unknown_attribute", `Unknown attribute "${attributeId}"`, { attributeId, path }));
      continue;
    }
    out.push(...checkValueForAttribute(attribute, selection.value, `${path}.value`));
    if (!evaluateAll(attribute.appliesWhen, spec)) {
      out.push(
        info("selection.inactive", `"${attributeId}" is set but not applicable to the current spec; it is kept but not compiled`, {
          attributeId,
          path,
        }),
      );
    }
  }

  for (const rule of registry.rules) {
    if (evaluateAll(rule.when, spec)) {
      out.push({
        code: `rule.${rule.id}`,
        severity: rule.severity,
        message: resolveText(rule.message, "en"),
        params: { rule: rule.id, kind: rule.kind, involves: rule.involves.join(",") },
      });
    }
  }
  return out;
};

/** SpecValidator: structural + semantic validation. Fails on any error. */
export const validateImageSpec = (input: unknown, registry: CatalogRegistry): Result<ImageSpec> => {
  const parsed = parseImageSpec(input);
  if (!parsed.ok) return parsed;
  const diagnostics = [...parsed.diagnostics, ...validateSpecAgainstCatalog(parsed.value, registry)];
  return hasErrors(diagnostics) ? fail(diagnostics) : ok(parsed.value, diagnostics);
};
