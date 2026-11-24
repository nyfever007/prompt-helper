import { z } from "zod";
import { AttributeIdSchema, CatalogIdSchema, IdSchema, SemVerSchema } from "../shared/ids";
import { LocalizedTextSchema } from "../shared/localized";
import { SelectionValueSchema } from "../spec/values";

/** Version of the catalog *file format* (not the catalog content). */
export const CATALOG_FORMAT_VERSION = "0.1.0" as const;

export const TierSchema = z.enum(["basic", "detailed", "precision"]);
export type Tier = z.infer<typeof TierSchema>;

/**
 * How an option or attribute is phrased in prompts. `text` is the generic
 * English phrasing; `byAdapter` overrides it for a specific prompt adapter
 * (model-specific phrasing) without touching the compiler.
 */
export const PromptPhraseSchema = z
  .object({
    text: z.string().min(1),
    byAdapter: z.record(IdSchema, z.string().min(1)).optional(),
  })
  .strict();

/** Visual example metadata. Assets themselves are out of scope for Sprint 0. */
export const VisualExampleSchema = z
  .object({
    id: IdSchema,
    status: z.enum(["placeholder", "ready"]),
    src: z.string().optional(),
    alt: LocalizedTextSchema,
    provenance: z
      .object({ source: z.string(), license: z.string().optional(), createdAt: z.string().optional() })
      .strict()
      .optional(),
  })
  .strict();

export const OptionDefinitionSchema = z
  .object({
    id: IdSchema,
    label: LocalizedTextSchema,
    description: LocalizedTextSchema.optional(),
    /** Hierarchical categories: parent option within the same attribute. */
    parentId: IdSchema.optional(),
    /** Search aliases (any language). */
    aliases: z.array(z.string().min(1)).optional(),
    prompt: PromptPhraseSchema,
    examples: z.array(VisualExampleSchema).optional(),
    deprecated: z.boolean().optional(),
  })
  .strict();

export type OptionDefinition = z.infer<typeof OptionDefinitionSchema>;

/** Conditions used by applicability and cross-attribute rules. */
export const ConditionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("isSet"), attributeId: AttributeIdSchema }).strict(),
  z.object({ op: z.literal("isUnset"), attributeId: AttributeIdSchema }).strict(),
  z
    .object({ op: z.literal("anyOf"), attributeId: AttributeIdSchema, optionIds: z.array(IdSchema).min(1) })
    .strict(),
]);
export type Condition = z.infer<typeof ConditionSchema>;

/**
 * Template with a `{value}` placeholder, e.g. `"Visual style: {value}."`.
 * `byAdapter` gives model-specific templates.
 */
export const AttributePromptSchema = z
  .object({
    template: z.string().includes("{value}"),
    byAdapter: z.record(IdSchema, z.string().includes("{value}")).optional(),
  })
  .strict();

const attributeBase = {
  id: AttributeIdSchema,
  /** Taxonomy domain (subject, style, camera, person.face, …). */
  domain: AttributeIdSchema,
  /** UI grouping; groups can be nested (hierarchical categories). */
  groupId: IdSchema.optional(),
  label: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  /** The least detailed mode in which this attribute is offered. */
  tier: TierSchema,
  /** Sort key for UI and compilation order. Ties are broken by id. */
  order: z.number().int(),
  prompt: AttributePromptSchema,
  /** All conditions must hold for the attribute to be active. */
  appliesWhen: z.array(ConditionSchema).optional(),
  /**
   * Suggested value the UI may offer ("use default"). NEVER applied
   * implicitly; choosing it creates an explicit selection.
   */
  defaultValue: SelectionValueSchema.optional(),
  examples: z.array(VisualExampleSchema).optional(),
};

export const AttributeDefinitionSchema = z.discriminatedUnion("type", [
  z.object({ ...attributeBase, type: z.literal("single"), options: z.array(OptionDefinitionSchema).min(1) }).strict(),
  z
    .object({
      ...attributeBase,
      type: z.literal("multi"),
      options: z.array(OptionDefinitionSchema).min(1),
      maxSelections: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      ...attributeBase,
      type: z.literal("number"),
      min: z.number().finite(),
      max: z.number().finite(),
      step: z.number().positive().optional(),
      unit: z.string().optional(),
    })
    .strict(),
  z
    .object({
      ...attributeBase,
      type: z.literal("range"),
      min: z.number().finite(),
      max: z.number().finite(),
      step: z.number().positive().optional(),
      unit: z.string().optional(),
    })
    .strict(),
  z
    .object({
      ...attributeBase,
      type: z.literal("text"),
      maxLength: z.number().int().positive(),
      placeholder: LocalizedTextSchema.optional(),
    })
    .strict(),
]);

export type AttributeDefinition = z.infer<typeof AttributeDefinitionSchema>;
export type AttributeType = AttributeDefinition["type"];
export type OptionAttributeDefinition = Extract<AttributeDefinition, { type: "single" | "multi" }>;

export const GroupDefinitionSchema = z
  .object({
    id: IdSchema,
    label: LocalizedTextSchema,
    parentId: IdSchema.optional(),
    order: z.number().int(),
  })
  .strict();
export type GroupDefinition = z.infer<typeof GroupDefinitionSchema>;

/** Cross-attribute rule. Rules only REPORT; they never rewrite a spec. */
export const CatalogRuleSchema = z
  .object({
    id: IdSchema,
    kind: z.enum(["conflict", "dependency", "visibility"]),
    severity: z.enum(["error", "warning", "info"]),
    /** All conditions must hold for the rule to fire. */
    when: z.array(ConditionSchema).min(1),
    involves: z.array(AttributeIdSchema).min(1),
    message: LocalizedTextSchema,
  })
  .strict();
export type CatalogRule = z.infer<typeof CatalogRuleSchema>;

export const CatalogSchema = z
  .object({
    formatVersion: z.literal(CATALOG_FORMAT_VERSION),
    id: CatalogIdSchema,
    version: SemVerSchema,
    title: LocalizedTextSchema,
    groups: z.array(GroupDefinitionSchema).default([]),
    attributes: z.array(AttributeDefinitionSchema).min(1),
    rules: z.array(CatalogRuleSchema).default([]),
  })
  .strict();

export type CatalogInput = z.input<typeof CatalogSchema>;
export type Catalog = z.output<typeof CatalogSchema>;
