import { z } from "zod";
import { IdSchema } from "../shared/ids";

/**
 * A selection value is self-describing (`kind`) so a spec can be structurally
 * validated without a catalog. Semantic checks (does the option exist? does
 * the kind match the attribute type?) live in the SpecValidator.
 *
 * Adding a new value kind (e.g. `position`, `reference`) is a schema MINOR
 * bump plus a renderer in the compiler/UI control map — see docs/DECISIONS.md.
 *
 * 0.3.0 (Sprint 2-B.1): user-defined values (`CustomEntry`) in single/multi
 * values, and an explicit `unit` on number/range values (quantity attributes).
 */

/** Upper bounds of a user-defined value (approved D4). Catalogs may only lower them. */
export const CUSTOM_LABEL_MAX = 200;
export const CUSTOM_EXPRESSION_MAX = 2000;

const notBlank = (s: string) => s.trim().length > 0;

/**
 * A user-defined value. `label` is what the user calls it (original language,
 * kept verbatim); `expression` is the optional prompt wording (also verbatim).
 * The compiler outputs `expression` when present, otherwise `label`.
 * Custom values are never merged with, or replaced by, registered options.
 */
export const CustomEntrySchema = z
  .object({
    label: z.string().max(CUSTOM_LABEL_MAX).refine(notBlank, { message: "label must not be blank" }),
    expression: z.string().max(CUSTOM_EXPRESSION_MAX).refine(notBlank, { message: "expression must not be blank (omit it instead)" }).optional(),
  })
  .strict();
export type CustomEntry = z.infer<typeof CustomEntrySchema>;

/** Key used to detect duplicate custom entries inside one value (never used to merge with registered options). */
export const customKey = (label: string): string => label.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();

export const SingleValueSchema = z.object({ kind: z.literal("single"), optionId: IdSchema }).strict();
export const SingleCustomValueSchema = z.object({ kind: z.literal("single"), custom: CustomEntrySchema }).strict();

export const MultiValueSchema = z
  .object({
    kind: z.literal("multi"),
    /** Registered options. May be empty when `custom` has entries. */
    optionIds: z.array(IdSchema),
    /** User-defined entries, in the order the user added them. */
    custom: z.array(CustomEntrySchema).min(1).optional(),
  })
  .strict()
  .refine((v) => v.optionIds.length + (v.custom?.length ?? 0) > 0, {
    message: "a multi value needs at least one option or custom entry (empty is represented as unset)",
    path: ["optionIds"],
  })
  .refine((v) => new Set(v.optionIds).size === v.optionIds.length, {
    message: "optionIds must be unique",
    path: ["optionIds"],
  })
  .refine((v) => new Set((v.custom ?? []).map((c) => customKey(c.label))).size === (v.custom?.length ?? 0), {
    message: "custom entries must have distinct labels",
    path: ["custom"],
  });

/** `unit` is required when the attribute declares units (quantity attributes). */
export const NumberValueSchema = z.object({ kind: z.literal("number"), value: z.number().finite(), unit: IdSchema.optional() }).strict();

export const RangeValueSchema = z
  .object({ kind: z.literal("range"), min: z.number().finite(), max: z.number().finite(), unit: IdSchema.optional() })
  .strict()
  .refine((v) => v.min <= v.max, { message: "min must be <= max", path: ["min"] });

export const TextValueSchema = z
  .object({ kind: z.literal("text"), text: z.string().max(10_000) })
  .strict()
  .refine((v) => v.text.trim().length > 0, {
    message: "text must not be blank (blank text is represented as unset)",
    path: ["text"],
  });

/**
 * Strict objects in a plain union: `single` has two shapes (registered option
 * or custom entry), which a discriminated union cannot express.
 */
export const SelectionValueSchema = z.union([
  SingleValueSchema,
  SingleCustomValueSchema,
  MultiValueSchema,
  NumberValueSchema,
  RangeValueSchema,
  TextValueSchema,
]);

export type SelectionValue = z.infer<typeof SelectionValueSchema>;
export type SelectionValueKind = SelectionValue["kind"];

/** Registered option ids of an option value (custom entries excluded). */
export const selectedOptionIds = (value: SelectionValue | undefined): string[] => {
  if (!value) return [];
  if (value.kind === "single") return "optionId" in value ? [value.optionId] : [];
  if (value.kind === "multi") return value.optionIds;
  return [];
};

/** Custom entries of an option value (in stored order). */
export const selectedCustomEntries = (value: SelectionValue | undefined): CustomEntry[] => {
  if (!value) return [];
  if (value.kind === "single") return "custom" in value ? [value.custom] : [];
  if (value.kind === "multi") return value.custom ?? [];
  return [];
};
