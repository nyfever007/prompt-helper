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
 * 0.3.0 (Sprint 2-A): attribute `status` (product approval) and `control`
 * (UI representation, separate from data type), `categoryId` + catalog
 * `categories` (Detailed navigation), attribute `aliases`; option `swatch`,
 * `restriction` (policy-based availability with reason) and phrase `parts`
 * (semantic units that direct selections can take over); number/range
 * `semantics` + `bands`; catalog `presets` (explicit partial patches).
 */
export const CATALOG_FORMAT_VERSION = "0.3.0" as const;

/**
 * Product approval status — separate from what the catalog can technically
 * express. Only `approved` attributes/categories are editable in the product
 * UI; `draft` and `deferred` data may exist but is never exposed for editing.
 */
export const ReleaseStatusSchema = z.enum(["approved", "draft", "deferred"]);
export type ReleaseStatus = z.infer<typeof ReleaseStatusSchema>;

export const TierSchema = z.enum(["basic", "detailed", "precision"]);
export type Tier = z.infer<typeof TierSchema>;

/** Policy tags are namespaced ids, e.g. `age.minor`, `appeal.suggestive`, `coverage.minimal`. */
export const PolicyTagSchema = AttributeIdSchema;

/**
 * How an option is phrased in prompts. `text` is the generic English phrasing;
 * `byAdapter` overrides it for a specific prompt adapter (model-specific phrasing).
 */
/**
 * A semantic unit inside a preset phrase that states the value of another
 * attribute (an "axis"), e.g. `{ axis: "lighting.color_temperature",
 * values: ["warm"], text: "warm" }` inside "warm golden-hour sunlight".
 * When the user explicitly sets that axis attribute, the unit is taken over by
 * the direct selection (removed from the preset phrase) so the meaning is
 * output once and the direct choice wins. See compiler.
 */
export const PhraseUnitSchema = z
  .object({ axis: AttributeIdSchema, values: z.array(IdSchema).min(1), text: z.string().min(1) })
  .strict();
export const PhrasePartSchema = z.union([
  z.string().min(1),
  PhraseUnitSchema,
  z.object({ list: z.array(z.union([z.string().min(1), PhraseUnitSchema])).min(1), sep: z.string() }).strict(),
]);
export type PhraseUnit = z.infer<typeof PhraseUnitSchema>;
export type PhrasePart = z.infer<typeof PhrasePartSchema>;

export const PromptPhraseSchema = z
  .object({
    text: z.string().min(1),
    byAdapter: z.record(IdSchema, z.string().min(1)).optional(),
    /** Optional semantic decomposition of `text`; must render exactly to `text` (checked). */
    parts: z.array(PhrasePartSchema).min(1).optional(),
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
    /** Color swatch for `control: "color"` (#RRGGBB). Catalog palette only (no free color values yet). */
    swatch: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    /**
     * Policy-based availability. When all `when` conditions hold the option is
     * shown DISABLED with `reason`; if present anyway (e.g. import) the prompt
     * output is blocked. Different from `appliesWhen` (context → hidden/kept).
     */
    restriction: z
      .object({ when: z.array(ConditionSchema).min(1), reason: LocalizedTextSchema, policyRuleId: IdSchema.optional() })
      .strict()
      .optional(),
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

/** UI representation. Independent from the data type; compatibility is checked by the registry. */
export const ControlSchema = z.enum([
  "chips",
  "dropdown",
  "cards",
  "searchable",
  "color",
  "slider",
  "number",
  "range",
  "text",
  "textarea",
]);
export type Control = z.infer<typeof ControlSchema>;

/** What a number means; decides how it is compiled. The raw number is always stored losslessly. */
export const NumericSemanticsSchema = z.enum(["degree", "physical", "ratio", "position", "count"]);
export type NumericSemantics = z.infer<typeof NumericSemanticsSchema>;

/** Qualitative bands for `degree` numbers: value ≤ upTo → text (ascending; last upTo ≥ max). */
export const BandSchema = z.object({ upTo: z.number().finite(), label: LocalizedTextSchema, text: z.string().min(1) }).strict();

const numericBase = {
  min: z.number().finite(),
  max: z.number().finite(),
  step: z.number().positive().optional(),
  unit: z.string().optional(),
  semantics: NumericSemanticsSchema.optional(),
  bands: z.array(BandSchema).min(1).optional(),
};

const attributeBase = {
  id: AttributeIdSchema,
  /** Product approval status (see ReleaseStatusSchema). Required: exposure is never implicit. */
  status: ReleaseStatusSchema,
  /** Taxonomy domain (subject, style, camera, person.face, …). */
  domain: AttributeIdSchema,
  /** Basic-mode layout section (beginner flow). */
  groupId: IdSchema.optional(),
  /** Detailed-mode navigation category (expert taxonomy). Independent of `groupId`. */
  categoryId: IdSchema.optional(),
  /** UI representation; defaults by type (single/multi → chips, number → number, …). */
  control: ControlSchema.optional(),
  /** Search aliases for the attribute itself (any language). */
  aliases: z.array(z.string().min(1)).optional(),
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
  z.object({ ...attributeBase, type: z.literal("number"), ...numericBase }).strict(),
  z.object({ ...attributeBase, type: z.literal("range"), ...numericBase }).strict(),
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

/** Detailed-mode navigation node. Hierarchical, data-driven; `draft` = structure only. */
export const CategoryDefinitionSchema = z
  .object({
    id: IdSchema,
    label: LocalizedTextSchema,
    description: LocalizedTextSchema.optional(),
    parentId: IdSchema.optional(),
    order: z.number().int(),
    status: ReleaseStatusSchema,
    /** Design document for this area (e.g. docs/catalogs/person/face.md). */
    docPath: z.string().optional(),
    /** Context in which the category is relevant (e.g. person subjects). */
    appliesWhen: z.array(ConditionSchema).optional(),
  })
  .strict();
export type CategoryDefinition = z.infer<typeof CategoryDefinitionSchema>;

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

/**
 * Composite preset: an explicit PARTIAL patch (never a whole-spec replacement).
 * Applying one goes through a preview plan + confirmation (see domain/presets).
 */
export const PresetDefinitionSchema = z
  .object({
    id: IdSchema,
    version: SemVerSchema,
    status: ReleaseStatusSchema,
    label: LocalizedTextSchema,
    description: LocalizedTextSchema.optional(),
    categoryId: IdSchema.optional(),
    appliesWhen: z.array(ConditionSchema).optional(),
    provenance: z.object({ source: z.string().min(1), author: z.string().optional(), note: z.string().optional() }).strict(),
    patches: z.array(z.object({ attributeId: AttributeIdSchema, value: SelectionValueSchema }).strict()).min(1),
  })
  .strict();
export type PresetDefinition = z.infer<typeof PresetDefinitionSchema>;

export const CatalogSchema = z
  .object({
    formatVersion: z.literal(CATALOG_FORMAT_VERSION),
    id: CatalogIdSchema,
    version: SemVerSchema,
    title: LocalizedTextSchema,
    groups: z.array(GroupDefinitionSchema).default([]),
    categories: z.array(CategoryDefinitionSchema).default([]),
    attributes: z.array(AttributeDefinitionSchema).min(1),
    rules: z.array(CatalogRuleSchema).default([]),
    migrations: z.array(CatalogMigrationSchema).default([]),
    presets: z.array(PresetDefinitionSchema).default([]),
  })
  .strict();

export type CatalogInput = z.input<typeof CatalogSchema>;
export type Catalog = z.output<typeof CatalogSchema>;
