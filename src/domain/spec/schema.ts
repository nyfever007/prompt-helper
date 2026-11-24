import { z } from "zod";
import { AttributeIdSchema, CatalogIdSchema, IdSchema, SemVerSchema } from "../shared/ids";
import { SelectionValueSchema } from "./values";

/**
 * Current ImageSpec schema version. Bump on any persisted-shape change.
 * 0.2.0 (Sprint 2-A): optional `AttributeSelection.origin` (preset provenance).
 * 0.3.0 (Sprint 2-B.1): optional `AttributeSelection.excludedFromPrompt`,
 * custom entries in single/multi values, `unit` on number/range values.
 * Older apps cannot read newer files; this app reads 0.1.0 and 0.2.0 via migration.
 */
export const IMAGE_SPEC_SCHEMA_VERSION = "0.3.0" as const;
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
/** Persistent provenance of a selection that a composite preset set. */
export const SelectionOriginSchema = z.object({ presetId: IdSchema, presetVersion: SemVerSchema }).strict();
export type SelectionOrigin = z.infer<typeof SelectionOriginSchema>;

export const AttributeSelectionSchema = z
  .object({
    value: SelectionValueSchema,
    source: SelectionSourceSchema,
    /** Reserved for Precision mode emphasis (1 = low … 5 = critical). Absent = unset/normal. */
    priority: z.number().int().min(1).max(5).optional(),
    /** Which preset set this value. Only valid with `source: "preset"`; cleared on any direct user edit. */
    origin: SelectionOriginSchema.optional(),
    /**
     * Output state, independent of the value: the selection is kept (and still
     * safety-checked) but not compiled into the prompt. Absent = included.
     * Kept when the value changes; removed together with the selection.
     */
    excludedFromPrompt: z.literal(true).optional(),
  })
  .strict()
  .refine((s) => s.origin === undefined || s.source === "preset", {
    message: "origin is only allowed when source is \"preset\"",
    path: ["origin"],
  });

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
