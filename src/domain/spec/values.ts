import { z } from "zod";
import { IdSchema } from "../shared/ids";

/**
 * A selection value is self-describing (`kind`) so a spec can be structurally
 * validated without a catalog. Semantic checks (does the option exist? does
 * the kind match the attribute type?) live in the SpecValidator.
 *
 * Adding a new value kind (e.g. `position`, `reference`) is a schema MINOR
 * bump plus a renderer in the compiler/UI control map — see docs/DECISIONS.md.
 */
export const SingleValueSchema = z.object({ kind: z.literal("single"), optionId: IdSchema }).strict();

export const MultiValueSchema = z
  .object({ kind: z.literal("multi"), optionIds: z.array(IdSchema).min(1) })
  .strict()
  .refine((v) => new Set(v.optionIds).size === v.optionIds.length, {
    message: "optionIds must be unique",
    path: ["optionIds"],
  });

export const NumberValueSchema = z.object({ kind: z.literal("number"), value: z.number().finite() }).strict();

export const RangeValueSchema = z
  .object({ kind: z.literal("range"), min: z.number().finite(), max: z.number().finite() })
  .strict()
  .refine((v) => v.min <= v.max, { message: "min must be <= max", path: ["min"] });

export const TextValueSchema = z
  .object({ kind: z.literal("text"), text: z.string().max(10_000) })
  .strict()
  .refine((v) => v.text.trim().length > 0, {
    message: "text must not be blank (blank text is represented as unset)",
    path: ["text"],
  });

export const SelectionValueSchema = z.discriminatedUnion("kind", [
  SingleValueSchema,
  MultiValueSchema,
  NumberValueSchema,
  RangeValueSchema,
  TextValueSchema,
]);

export type SelectionValue = z.infer<typeof SelectionValueSchema>;
export type SelectionValueKind = SelectionValue["kind"];
