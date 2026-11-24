import { z } from "zod";

/** Stable identifier for options, groups, rules, adapters (e.g. `photography`, `digital_illustration`). */
export const IdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/, "must be lowercase snake/kebab case");

/** Attribute IDs are dotted paths of Ids (e.g. `subject.kind`, `person.skin.moles`). */
export const AttributeIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*(?:\.[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*)*$/, "must be a dotted lowercase id");

export const SemVerSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "must be MAJOR.MINOR.PATCH");

/** Catalog IDs may be namespaced with dots (e.g. `prompter.core`). */
export const CatalogIdSchema = AttributeIdSchema;
