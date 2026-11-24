import { z } from "zod";
import { AttributeIdSchema, CatalogIdSchema, IdSchema, SemVerSchema } from "../shared/ids";
import { LocalizedTextSchema } from "../shared/localized";
import { SelectionValueSchema } from "../spec/values";

/**
 * Version of the catalog *file format* (not the catalog content).
 *
 * 0.2.0 (Sprint 1): option-level `appliesWhen`, `classification`, `policyTags`,
 * `parameterValue`; attribute `prominence`, `searchable`, prompt `channel`;
 * rule `guidance`/`actions`; `noneOf` + `whenUnset` conditions; catalog
 * `migrations` (stable-ID rename maps).
 */
export const CATALOG_FORMAT_VERSION = "0.2.0" as const;

export const TierSchema = z.enum(["basic", "detailed", "precision"]);
export type Tier = z.infer<typeof TierSchema>;

/** Policy tags are namespaced ids, e.g. `age.minor`, `appeal.suggestive`, `coverage.minimal`. */
export const PolicyTagSchema = AttributeIdSchema;

/**
 * How an option is phrased in prompts. `text` is the generic English phrasing;
 * `byAdapter` overrides it for a specific prompt adapter (model-specific phrasing).
 */
export const PromptPhraseSchema = z
  .object({
    text: z.string().min(1),
    byAdapter: z.record(IdSchema, z.string().min(1)).optional(),
  })
  .strict();

/** Visual example metadata. Assets themselves are out of scope for now. */
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

/**
 * Conditions used by attribute/option applicability and cross-attribute rules.
 *
 * `anyOf` / `noneOf` match hierarchically: a selected child option also
 * matches its ancestors (selecting `dog` under `animal` satisfies `anyOf [animal]`).
 * `whenUnset` decides the result when the referenced attribute is unset
 * (default `"fail"`). `"pass"` means "no context yet → do not restrict".
 */
const WhenUnsetSchema = z.enum(["pass", "fail"]).optional();
export const ConditionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("isSet"), attributeId: AttributeIdSchema }).strict(),
  z.object({ op: z.literal("isUnset"), attributeId: AttributeIdSchema }).strict(),
  z
    .object({
      op: z.literal("anyOf"),
      attributeId: AttributeIdSchema,
      optionIds: z.array(IdSchema).min(1),
      whenUnset: WhenUnsetSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal("noneOf"),
      attributeId: AttributeIdSchema,
      optionIds: z.array(IdSchema).min(1),
      whenUnset: WhenUnsetSchema,
    })
    .strict(),
]);
export type Condition = z.infer<typeof ConditionSchema>;

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
    /** Option is offered/compiled only when all conditions hold. */
    appliesWhen: z.array(ConditionSchema).optional(),
    /**
     * DESCRIPTIVE facets of a preset on independent axes, e.g.
     * `{ "style.medium": ["photograph"], "style.realism": ["photorealistic"] }`.
     * Never applied to the spec; used for display and rule/conflict analysis only.
     */
    classification: z.record(AttributeIdSchema, z.array(IdSchema).min(1)).optional(),
    /** Safety-policy tags; see src/domain/safety. Purely declarative. */
    policyTags: z.array(PolicyTagSchema).optional(),
    /** Structured value for parameter channels (e.g. aspect ratio "16:9"). */
    parameterValue: z.union([z.string().min(1), z.number().finite()]).optional(),
    examples: z.array(VisualExampleSchema).optional(),
    deprecated: z.boolean().optional(),
  })
  .strict();

export type OptionDefinition = z.infer<typeof OptionDefinitionSchema>;

/**
 * Template with a `{value}` placeholder, e.g. `"Visual style: {value}."`.
 * `channel` routes the value into prompt text, a structured parameter, or both.
 */
export const AttributePromptSchema = z
  .object({
    template: z.string().includes("{value}"),
    byAdapter: z.record(IdSchema, z.string().includes("{value}")).optional(),
    channel: z.enum(["text", "parameter", "both"]).optional(),
    parameterKey: IdSchema.or(z.string().regex(/^[a-z][a-zA-Z0-9]*$/)).optional(),
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
  /** Within a mode: shown up front (`primary`) or behind "more settings" (`secondary`). */
  prominence: z.enum(["primary", "secondary"]).optional(),
  /** UI hint: offer text search over options (labels in all locales + aliases). */
  searchable: z.boolean().optional(),
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
      /** Optional; omit for "no limit". */
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

export const isOptionAttribute = (a: AttributeDefinition): a is OptionAttributeDefinition =>
  a.type === "single" || a.type === "multi";

export const GroupDefinitionSchema = z
  .object({
    id: IdSchema,
    label: LocalizedTextSchema,
    description: LocalizedTextSchema.optional(),
    parentId: IdSchema.optional(),
    order: z.number().int(),
  })
  .strict();
export type GroupDefinition = z.infer<typeof GroupDefinitionSchema>;

/** A user-triggerable suggestion attached to a rule. Never applied automatically. */
export const RuleActionSchema = z.object({ kind: z.literal("clear"), attributeId: AttributeIdSchema }).strict();
export type RuleAction = z.infer<typeof RuleActionSchema>;

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
    /** Actionable advice shown to the user. */
    guidance: LocalizedTextSchema,
    actions: z.array(RuleActionSchema).optional(),
  })
  .strict();
export type CatalogRule = z.infer<typeof CatalogRuleSchema>;

/**
 * Stable-ID migrations between catalog content versions. Within one step,
 * attribute renames apply first; `renameOption.attributeId` is the attribute id
 * AFTER that step's attribute renames.
 */
export const CatalogChangeSchema = z.discriminatedUnion("op", [
  z
    .object({ op: z.literal("renameAttribute"), from: AttributeIdSchema, to: AttributeIdSchema, reason: LocalizedTextSchema })
    .strict(),
  z
    .object({
      op: z.literal("renameOption"),
      attributeId: AttributeIdSchema,
      from: IdSchema,
      to: IdSchema,
      reason: LocalizedTextSchema,
    })
    .strict(),
]);
export type CatalogChange = z.infer<typeof CatalogChangeSchema>;

export const CatalogMigrationSchema = z
  .object({ fromVersion: SemVerSchema, toVersion: SemVerSchema, changes: z.array(CatalogChangeSchema) })
  .strict();
export type CatalogMigration = z.infer<typeof CatalogMigrationSchema>;

export const CatalogSchema = z
  .object({
    formatVersion: z.literal(CATALOG_FORMAT_VERSION),
    id: CatalogIdSchema,
    version: SemVerSchema,
    title: LocalizedTextSchema,
    groups: z.array(GroupDefinitionSchema).default([]),
    attributes: z.array(AttributeDefinitionSchema).min(1),
    rules: z.array(CatalogRuleSchema).default([]),
    migrations: z.array(CatalogMigrationSchema).default([]),
  })
  .strict();

export type CatalogInput = z.input<typeof CatalogSchema>;
export type Catalog = z.output<typeof CatalogSchema>;
