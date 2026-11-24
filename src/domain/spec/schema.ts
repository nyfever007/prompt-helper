import { z } from "zod";
import { AttributeIdSchema, CatalogIdSchema, SemVerSchema } from "../shared/ids";
import { SelectionValueSchema } from "./values";

/** Current ImageSpec schema version. Bump on any persisted-shape change. */
export const IMAGE_SPEC_SCHEMA_VERSION = "0.1.0" as const;
export const IMAGE_SPEC_KIND = "prompter.image-spec" as const;

export const SelectionSourceSchema = z.enum(["user", "preset", "import"]);
export type SelectionSource = z.infer<typeof SelectionSourceSchema>;

/**
 * AttributeSelection: an EXPLICIT choice for one attribute.
 *
 * Invariant: an attribute is `unset` iff its id is absent from
 * `ImageSpec.selections`. There is no implicit default — choosing the
 * catalog's suggested default creates an explicit selection like any other.
 */
export const AttributeSelectionSchema = z
  .object({
    value: SelectionValueSchema,
    source: SelectionSourceSchema,
    /** Reserved for Precision mode emphasis (1 = low … 5 = critical). Absent = unset/normal. */
    priority: z.number().int().min(1).max(5).optional(),
  })
  .strict();

export type AttributeSelection = z.infer<typeof AttributeSelectionSchema>;

export const TaskSchema = z.enum(["text-to-image"]);
export type Task = z.infer<typeof TaskSchema>;

export const ImageSpecSchema = z
  .object({
    kind: z.literal(IMAGE_SPEC_KIND),
    schemaVersion: z.literal(IMAGE_SPEC_SCHEMA_VERSION),
    task: TaskSchema,
    catalog: z.object({ id: CatalogIdSchema, version: SemVerSchema }).strict(),
    selections: z.record(AttributeIdSchema, AttributeSelectionSchema),
  })
  .strict();

/** The canonical, versioned image specification — the single source of truth. */
export type ImageSpec = z.infer<typeof ImageSpecSchema>;
