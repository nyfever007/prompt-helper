import { error, fail, fromZodIssues, hasErrors, ok, type Diagnostic, type Result } from "../shared/diagnostics";
import type { ImageSpec } from "../spec/schema";
import { assessAge, intervalMismatch } from "./age";
import { conditionAttributeIds, type ConditionContext } from "./conditions";
import { phraseUnits, renderPhraseParts } from "./phrase";
import {
  CatalogSchema,
  isOptionAttribute,
  type AttributeDefinition,
  type Catalog,
  type CatalogMigration,
  type CatalogRule,
  type AgeModel,
  type CategoryDefinition,
  type Condition,
  type Control,
  type DerivedFact,
  type GroupDefinition,
  type OptionDefinition,
  type PresetDefinition,
  type PromptGroup,
  type Tier,
} from "./schema";
import { compareSemVer } from "./semver";
import { checkValueForAttribute } from "./valueCheck";

export const TIER_RANK: Record<Tier, number> = { basic: 0, detailed: 1, precision: 2 };

/** Which controls can represent which data types. */
export const CONTROL_TYPES: Record<Control, ReadonlyArray<AttributeDefinition["type"]>> = {
  chips: ["single", "multi"],
  dropdown: ["single"],
  cards: ["single", "multi"],
  searchable: ["single", "multi"],
  color: ["single", "multi"],
  slider: ["number"],
  number: ["number"],
  range: ["range"],
  text: ["text"],
  textarea: ["text"],
  quantity: ["quantity"],
};

export const defaultControl = (a: AttributeDefinition): Control =>
  a.control ?? (a.type === "single" || a.type === "multi" ? "chips" : a.type === "text" ? "textarea" : a.type);

const byOrderThenId = (a: { order: number; id: string }, b: { order: number; id: string }) =>
  a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * CatalogRegistry: validated, read-only, indexed view of one versioned catalog.
 *
 * Every consumer (validator, compiler, UI) asks the registry for attributes
 * and options instead of hard-coding them, so adding catalog entries does not
 * require changes to those consumers.
 */
export class CatalogRegistry implements ConditionContext {
  private readonly attributesById: ReadonlyMap<string, AttributeDefinition>;
  private readonly sortedAttributes: readonly AttributeDefinition[];
  /** Prompt output order (TD-08): the catalog `promptOrder` flattened, or the UI order when absent. Computed once. */
  private readonly promptOrdered: readonly AttributeDefinition[];
  private readonly promptGroupById: ReadonlyMap<string, string>;
  private readonly sortedGroups: readonly GroupDefinition[];
  private readonly sortedCategories: readonly CategoryDefinition[];
  /** Option lookup by id per option attribute (the catalog is deep-frozen, so indexes never go stale). */
  private readonly optionsById: ReadonlyMap<string, ReadonlyMap<string, OptionDefinition>>;
  /** Memoized `lineage` of registered options (pure function of the frozen catalog). */
  private readonly lineageCache = new Map<string, Map<string, readonly string[]>>();

  private constructor(private readonly catalog: Catalog) {
    this.sortedAttributes = Object.freeze([...catalog.attributes].sort(byOrderThenId));
    this.attributesById = new Map(this.sortedAttributes.map((a) => [a.id, a]));
    // Integrity guarantees every attribute is listed exactly once when `promptOrder` exists.
    this.promptOrdered = catalog.promptOrder
      ? Object.freeze(catalog.promptOrder.flatMap((g) => g.attributes.map((id) => this.attributesById.get(id)!)))
      : this.sortedAttributes;
    this.promptGroupById = new Map((catalog.promptOrder ?? []).flatMap((g) => g.attributes.map((id) => [id, g.id] as const)));
    this.optionsById = new Map(
      this.sortedAttributes.filter(isOptionAttribute).map((a) => [a.id, new Map(a.options.map((o) => [o.id, o] as const))] as const),
    );
    this.sortedGroups = Object.freeze([...catalog.groups].sort(byOrderThenId));
    this.sortedCategories = Object.freeze([...catalog.categories].sort(byOrderThenId));
  }

  /** Parse + integrity-check an untrusted catalog (e.g. loaded from JSON). */
  static create(input: unknown): Result<CatalogRegistry> {
    const parsed = CatalogSchema.safeParse(input);
    if (!parsed.success) return fail(fromZodIssues("catalog.schema", parsed.error.issues));
    const diagnostics = checkIntegrity(parsed.data);
    if (hasErrors(diagnostics)) return fail(diagnostics);
    return ok(new CatalogRegistry(deepFreeze(parsed.data)), diagnostics);
  }

  /** Like `create` but throws — for catalogs bundled with the app. */
  static createOrThrow(input: unknown): CatalogRegistry {
    const result = CatalogRegistry.create(input);
    if (!result.ok) {
      throw new Error(`Invalid catalog:\n${result.diagnostics.map((d) => `- ${d.message}`).join("\n")}`);
    }
    return result.value;
  }

  get id(): string {
    return this.catalog.id;
  }
  get version(): string {
    return this.catalog.version;
  }
  get title(): Catalog["title"] {
    return this.catalog.title;
  }
  get rules(): readonly CatalogRule[] {
    return this.catalog.rules;
  }
  /** Groups in deterministic (order, id) order. */
  get groups(): readonly GroupDefinition[] {
    return this.sortedGroups;
  }
  get migrations(): readonly CatalogMigration[] {
    return this.catalog.migrations;
  }
  /** Detailed navigation categories in deterministic (order, id) order. */
  get categories(): readonly CategoryDefinition[] {
    return this.sortedCategories;
  }
  get presets(): readonly PresetDefinition[] {
    return this.catalog.presets;
  }
  get ageModel(): AgeModel | undefined {
    return this.catalog.ageModel;
  }

  /** ConditionContext: facts derived from the whole spec (see domain/catalog/age.ts). */
  derivedFact(fact: DerivedFact, spec: ImageSpec): string {
    const a = assessAge(spec, this);
    return fact === "age.class" ? a.ageClass : a.being;
  }

  /** ConditionContext: `intervalMismatch` condition. */
  intervalMismatch(spec: ImageSpec, quantityAttributeId: string, groupAttributeId: string): boolean {
    return intervalMismatch(spec, this, quantityAttributeId, groupAttributeId);
  }

  getCategory(id: string): CategoryDefinition | undefined {
    return this.sortedCategories.find((c) => c.id === id);
  }

  getPreset(id: string): PresetDefinition | undefined {
    return this.catalog.presets.find((p) => p.id === id);
  }

  /** Category ids from the root down to `id` (inclusive). */
  categoryPath(id: string): string[] {
    const path: string[] = [];
    let cur = this.getCategory(id);
    while (cur && !path.includes(cur.id)) {
      path.unshift(cur.id);
      cur = cur.parentId ? this.getCategory(cur.parentId) : undefined;
    }
    return path;
  }

  /** Is the category (and every ancestor) approved for the product UI? */
  isCategoryApproved(id: string): boolean {
    const path = this.categoryPath(id);
    return path.length > 0 && path.every((c) => this.getCategory(c)?.status === "approved");
  }

  /**
   * Product exposure: an attribute is editable in a mode only if it is
   * APPROVED, its tier is within the mode, and (for Detailed) its category
   * chain is approved. Technical presence in the catalog is not enough.
   */
  isExposed(attribute: AttributeDefinition, mode: Tier): boolean {
    if (attribute.status !== "approved" || TIER_RANK[attribute.tier] > TIER_RANK[mode]) return false;
    if (mode === "basic") return true;
    return attribute.categoryId !== undefined && this.isCategoryApproved(attribute.categoryId);
  }

  getGroup(id: string): GroupDefinition | undefined {
    return this.sortedGroups.find((g) => g.id === id);
  }

  /** The top-level group an attribute belongs to (walking up `parentId`). */
  rootGroupOf(attribute: AttributeDefinition): GroupDefinition | undefined {
    let g = attribute.groupId ? this.getGroup(attribute.groupId) : undefined;
    while (g?.parentId) g = this.getGroup(g.parentId);
    return g;
  }

  /**
   * All attributes in PROMPT OUTPUT order (TD-08): the catalog's `promptOrder` groups, or
   * (order, id) when the catalog has none. The compiler uses this; the UI uses `attributes()`.
   */
  promptAttributes(): readonly AttributeDefinition[] {
    return this.promptOrdered;
  }

  /** Prompt output group of an attribute (undefined when the catalog has no `promptOrder`). */
  promptGroupOf(attributeId: string): string | undefined {
    return this.promptGroupById.get(attributeId);
  }

  get promptGroups(): readonly PromptGroup[] {
    return this.catalog.promptOrder ?? [];
  }

  /** All attributes in deterministic UI (order, id) order. */
  attributes(): readonly AttributeDefinition[] {
    return this.sortedAttributes;
  }

  /** Attributes first offered at exactly this tier (regardless of approval status). */
  attributesForTier(tier: Tier): AttributeDefinition[] {
    return this.sortedAttributes.filter((a) => a.tier === tier);
  }

  /** Attributes editable in a mode's product UI (see `isExposed`). */
  exposedAttributes(mode: Tier): AttributeDefinition[] {
    return this.sortedAttributes.filter((a) => this.isExposed(a, mode));
  }

  /** Attributes visible in a mode (a mode shows its tier and all simpler tiers). */
  attributesVisibleIn(tier: Tier): AttributeDefinition[] {
    return this.sortedAttributes.filter((a) => TIER_RANK[a.tier] <= TIER_RANK[tier]);
  }

  getAttribute(id: string): AttributeDefinition | undefined {
    return this.attributesById.get(id);
  }

  getOption(attributeId: string, optionId: string): OptionDefinition | undefined {
    return this.optionsById.get(attributeId)?.get(optionId);
  }

  /**
   * The option id followed by its ancestors, nearest first (ConditionContext).
   * Registered options are memoized (frozen result); unknown ids are computed, never cached.
   */
  lineage(attributeId: string, optionId: string): readonly string[] {
    const options = this.optionsById.get(attributeId);
    if (!options) return [optionId];
    if (!options.has(optionId)) return [optionId];
    let byOption = this.lineageCache.get(attributeId);
    if (!byOption) this.lineageCache.set(attributeId, (byOption = new Map()));
    let out = byOption.get(optionId);
    if (!out) {
      const chain = [optionId];
      let cur = options.get(optionId)?.parentId;
      while (cur !== undefined && !chain.includes(cur)) {
        chain.push(cur);
        cur = options.get(cur)?.parentId;
      }
      out = Object.freeze(chain);
      byOption.set(optionId, out);
    }
    return out;
  }

  /** The underlying catalog (frozen). Useful for building extended catalogs. */
  toCatalog(): Catalog {
    return this.catalog;
  }
}

function checkIntegrity(catalog: Catalog): Diagnostic[] {
  const out: Diagnostic[] = [];
  const attributes = new Map<string, AttributeDefinition>();

  const groupIds = new Set<string>();
  for (const g of catalog.groups) {
    if (groupIds.has(g.id)) out.push(error("catalog.duplicate_group", `Duplicate group id "${g.id}"`));
    groupIds.add(g.id);
  }
  for (const g of catalog.groups) {
    if (g.parentId !== undefined && !groupIds.has(g.parentId)) {
      out.push(error("catalog.unknown_group_parent", `Group "${g.id}" has unknown parent "${g.parentId}"`));
    }
  }
  out.push(...findCycles(catalog.groups, (id) => `Group hierarchy cycle at "${id}"`));

  for (const a of catalog.attributes) {
    if (attributes.has(a.id)) out.push(error("catalog.duplicate_attribute", `Duplicate attribute id "${a.id}"`));
    attributes.set(a.id, a);
    if (a.groupId !== undefined && !groupIds.has(a.groupId)) {
      out.push(error("catalog.unknown_group", `Attribute "${a.id}" references unknown group "${a.groupId}"`));
    }
    if ((a.type === "number" || a.type === "range" || a.type === "quantity") && a.max !== undefined && a.min > a.max) {
      out.push(error("catalog.invalid_bounds", `Attribute "${a.id}" has min > max`));
    }
    if (a.type === "single" || a.type === "multi") {
      const optionIds = new Set<string>();
      for (const o of a.options) {
        if (optionIds.has(o.id)) out.push(error("catalog.duplicate_option", `Duplicate option "${o.id}" in "${a.id}"`));
        optionIds.add(o.id);
      }
      for (const o of a.options) {
        if (o.parentId !== undefined && !optionIds.has(o.parentId)) {
          out.push(error("catalog.unknown_option_parent", `Option "${a.id}/${o.id}" has unknown parent "${o.parentId}"`));
        }
      }
      out.push(...findCycles(a.options, (id) => `Option hierarchy cycle at "${a.id}/${id}"`));
    }
  }

  for (const a of catalog.attributes) {
    if (a.defaultValue) {
      for (const d of checkValueForAttribute(a, a.defaultValue, `attributes.${a.id}.defaultValue`)) {
        out.push({ ...d, code: "catalog.invalid_default", message: `defaultValue invalid — ${d.message}` });
      }
    }
    for (const c of a.appliesWhen ?? []) {
      if (conditionAttributeIds(c).includes(a.id)) {
        out.push(error("catalog.self_condition", `Attribute "${a.id}" cannot depend on itself`));
      }
      out.push(...checkCondition(c, attributes, `attribute "${a.id}"`));
    }
  }

  for (const a of catalog.attributes) {
    const channel = a.prompt.channel ?? "text";
    if (channel !== "text" && !a.prompt.parameterKey) {
      out.push(error("catalog.missing_parameter_key", `Attribute "${a.id}" uses channel "${channel}" but has no parameterKey`));
    }
    if (!isOptionAttribute(a)) continue;
    for (const o of a.options) {
      for (const c of o.appliesWhen ?? []) {
        if (conditionAttributeIds(c).includes(a.id)) out.push(error("catalog.self_condition", `Option "${a.id}/${o.id}" cannot depend on its own attribute`));
        out.push(...checkCondition(c, attributes, `option "${a.id}/${o.id}"`));
      }
      for (const [axisId, valueIds] of Object.entries(o.classification ?? {})) {
        const axis = attributes.get(axisId);
        if (!axis || !isOptionAttribute(axis) || axisId === a.id) {
          out.push(error("catalog.invalid_classification", `Option "${a.id}/${o.id}" classifies on unknown/invalid axis "${axisId}"`));
          continue;
        }
        for (const v of valueIds) {
          if (!axis.options.some((x) => x.id === v)) {
            out.push(error("catalog.invalid_classification", `Option "${a.id}/${o.id}" uses unknown value "${axisId}/${v}"`));
          }
        }
      }
      if (channel !== "text" && o.parameterValue === undefined) {
        out.push(error("catalog.missing_parameter_value", `Option "${a.id}/${o.id}" needs a parameterValue (channel "${channel}")`));
      }
    }
  }

  out.push(...checkCategories(catalog));
  out.push(...checkSemantics(catalog, attributes));
  for (const a of catalog.attributes) out.push(...checkAttributeUi(a, attributes, catalog));
  out.push(...checkPresets(catalog, attributes));
  out.push(...checkMigrations(catalog, attributes));

  out.push(...checkPromptOrder(catalog, attributes));

  const ruleIds = new Set<string>();
  for (const r of catalog.rules) {
    if (ruleIds.has(r.id)) out.push(error("catalog.duplicate_rule", `Duplicate rule id "${r.id}"`));
    ruleIds.add(r.id);
    for (const c of r.when) out.push(...checkCondition(c, attributes, `rule "${r.id}"`));
    for (const id of [...r.involves, ...(r.actions ?? []).map((x) => x.attributeId)]) {
      if (!attributes.has(id)) out.push(error("catalog.unknown_attribute_ref", `Rule "${r.id}" involves unknown "${id}"`));
    }
  }
  return out;
}

/** Sprint 2-B.1 catalog semantics: groups, covers, suggestions, intervals, variants, custom, quantity, age model. */
function checkSemantics(catalog: Catalog, attributes: Map<string, AttributeDefinition>): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const a of catalog.attributes) {
    if (a.type === "quantity") {
      const ids = new Set<string>();
      for (const u of a.units) {
        if (ids.has(u.id)) out.push(error("catalog.invalid_quantity", `Attribute "${a.id}": duplicate unit "${u.id}"`));
        ids.add(u.id);
      }
      if (new Set(a.forms).size !== a.forms.length) out.push(error("catalog.invalid_quantity", `Attribute "${a.id}": duplicate forms`));
    }
    if (!isOptionAttribute(a)) continue;
    const groupIds = new Set((a.optionGroups ?? []).map((g) => g.id));
    if (groupIds.size !== (a.optionGroups ?? []).length) out.push(error("catalog.duplicate_option_group", `Attribute "${a.id}": duplicate option group id`));
    for (const o of a.options) {
      const where = `option "${a.id}/${o.id}"`;
      if (o.group !== undefined && !groupIds.has(o.group)) out.push(error("catalog.unknown_option_group", `${where} references unknown group "${o.group}"`));
      for (const cv of o.covers ?? []) {
        const target = attributes.get(cv.attributeId);
        if (!target || !isOptionAttribute(target) || cv.attributeId === a.id) {
          out.push(error("catalog.invalid_covers", `${where}: covers needs another option attribute ("${cv.attributeId}")`));
          continue;
        }
        for (const id of cv.optionIds) {
          if (!target.options.some((x) => x.id === id)) out.push(error("catalog.invalid_covers", `${where}: covers unknown option "${cv.attributeId}/${id}"`));
        }
      }
      for (const c of [...(o.suggestedWhen ?? []), ...(o.prompt.variants ?? []).flatMap((v) => v.when)]) {
        if (conditionAttributeIds(c).includes(a.id)) out.push(error("catalog.self_condition", `${where}: condition cannot depend on its own attribute`));
        out.push(...checkCondition(c, attributes, where));
      }
      if (o.interval && o.interval.maxExclusive !== undefined && o.interval.maxExclusive <= o.interval.min) {
        out.push(error("catalog.invalid_interval", `${where}: interval maxExclusive must be greater than min`));
      }
    }
  }
  const m = catalog.ageModel;
  if (m) {
    const need = (id: string, ok: (x: AttributeDefinition) => boolean, what: string) => {
      const x = attributes.get(id);
      if (!x || !ok(x)) out.push(error("catalog.invalid_age_model", `ageModel: "${id}" must be ${what}`));
      return x;
    };
    need(m.actualAgeAttributeId, (x) => x.type === "quantity", "a quantity attribute");
    need(m.apparentAgeAttributeId, (x) => x.type === "quantity", "a quantity attribute");
    need(m.ageGroupAttributeId, isOptionAttribute, "an option attribute");
    const entity = need(m.entityTypeAttributeId, isOptionAttribute, "an option attribute");
    const species = need(m.speciesAttributeId, isOptionAttribute, "an option attribute");
    const checkKinds = (attr: AttributeDefinition | undefined, kinds: Record<string, string>) => {
      if (!attr || !isOptionAttribute(attr)) return;
      for (const id of Object.keys(kinds)) {
        if (!attr.options.some((o) => o.id === id)) out.push(error("catalog.invalid_age_model", `ageModel: unknown option "${attr.id}/${id}"`));
      }
    };
    checkKinds(entity, m.entityKinds);
    checkKinds(species, m.speciesKinds);
  }
  return out;
}

function checkCategories(catalog: Catalog): Diagnostic[] {
  const out: Diagnostic[] = [];
  const ids = new Set<string>();
  for (const c of catalog.categories) {
    if (ids.has(c.id)) out.push(error("catalog.duplicate_category", `Duplicate category id "${c.id}"`));
    ids.add(c.id);
  }
  for (const c of catalog.categories) {
    if (c.parentId !== undefined && !ids.has(c.parentId)) {
      out.push(error("catalog.unknown_category_parent", `Category "${c.id}" has unknown parent "${c.parentId}"`));
    }
  }
  out.push(...findCycles(catalog.categories, (id) => `Category hierarchy cycle at "${id}"`));
  for (const a of catalog.attributes) {
    if (a.categoryId !== undefined && !ids.has(a.categoryId)) {
      out.push(error("catalog.unknown_category", `Attribute "${a.id}" references unknown category "${a.categoryId}"`));
    }
  }
  return out;
}

function checkAttributeUi(a: AttributeDefinition, attributes: Map<string, AttributeDefinition>, catalog: Catalog): Diagnostic[] {
  const out: Diagnostic[] = [];
  const control = defaultControl(a);
  if (!CONTROL_TYPES[control].includes(a.type)) {
    out.push(error("catalog.control_type_mismatch", `Attribute "${a.id}": control "${control}" cannot represent type "${a.type}"`));
  }
  if (control === "color" && isOptionAttribute(a) && a.options.some((o) => !o.swatch)) {
    out.push(error("catalog.missing_swatch", `Attribute "${a.id}": every option needs a swatch for control "color"`));
  }
  if (a.type === "number" || a.type === "range") {
    const semantics = a.semantics ?? "physical";
    if (semantics === "degree") {
      if (a.type !== "number" || !a.bands) {
        out.push(error("catalog.missing_bands", `Attribute "${a.id}": "degree" numbers need qualitative bands`));
      } else {
        const ups = a.bands.map((b) => b.upTo);
        if (ups.some((u, i) => i > 0 && u <= ups[i - 1]!) || ups[ups.length - 1]! < a.max || ups[0]! < a.min) {
          out.push(error("catalog.invalid_bands", `Attribute "${a.id}": bands must ascend and cover ${a.min}..${a.max}`));
        }
      }
    } else if (a.bands) {
      out.push(error("catalog.invalid_bands", `Attribute "${a.id}": bands are only for "degree" semantics`));
    }
    if (semantics === "physical" && !a.unit) {
      out.push(error("catalog.missing_unit", `Attribute "${a.id}": "physical" numbers need a unit`));
    }
  }
  if (!isOptionAttribute(a)) return out;
  for (const o of a.options) {
    const where = `option "${a.id}/${o.id}"`;
    for (const c of o.restriction?.when ?? []) {
      if (conditionAttributeIds(c).includes(a.id)) out.push(error("catalog.self_condition", `${where}: restriction cannot depend on its own attribute`));
      out.push(...checkCondition(c, attributes, where));
    }
    if (o.prompt.parts) {
      const rendered = renderPhraseParts(o.prompt.parts);
      if (rendered !== o.prompt.text) {
        out.push(error("catalog.parts_mismatch", `${where}: parts render to "${rendered}" but text is "${o.prompt.text}"`));
      }
      for (const unit of phraseUnits(o.prompt.parts)) {
        const axis = attributes.get(unit.axis);
        if (!axis || !isOptionAttribute(axis) || axis.id === a.id) {
          out.push(error("catalog.invalid_parts", `${where}: unit axis "${unit.axis}" is not another option attribute`));
          continue;
        }
        for (const v of unit.values) {
          if (!axis.options.some((x) => x.id === v)) out.push(error("catalog.invalid_parts", `${where}: unknown value "${unit.axis}/${v}"`));
          const declared = o.classification?.[unit.axis];
          if (declared && !declared.includes(v)) {
            out.push(error("catalog.invalid_parts", `${where}: unit value "${v}" is not in its classification for "${unit.axis}"`));
          }
        }
      }
    }
  }
  void catalog;
  return out;
}

function checkPresets(catalog: Catalog, attributes: Map<string, AttributeDefinition>): Diagnostic[] {
  const out: Diagnostic[] = [];
  const ids = new Set<string>();
  const categoryIds = new Set(catalog.categories.map((c) => c.id));
  for (const p of catalog.presets) {
    if (ids.has(p.id)) out.push(error("catalog.duplicate_preset", `Duplicate preset id "${p.id}"`));
    ids.add(p.id);
    if (p.categoryId !== undefined && !categoryIds.has(p.categoryId)) {
      out.push(error("catalog.unknown_category", `Preset "${p.id}" references unknown category "${p.categoryId}"`));
    }
    for (const c of p.appliesWhen ?? []) out.push(...checkCondition(c, attributes, `preset "${p.id}"`));
    const seen = new Set<string>();
    for (const patch of p.patches) {
      if (seen.has(patch.attributeId)) out.push(error("catalog.invalid_preset", `Preset "${p.id}" patches "${patch.attributeId}" twice`));
      seen.add(patch.attributeId);
      const attr = attributes.get(patch.attributeId);
      if (!attr) {
        out.push(error("catalog.invalid_preset", `Preset "${p.id}" patches unknown attribute "${patch.attributeId}"`));
        continue;
      }
      for (const d of checkValueForAttribute(attr, patch.value, `presets.${p.id}.${patch.attributeId}`)) {
        out.push({ ...d, code: "catalog.invalid_preset", message: `Preset "${p.id}": ${d.message}` });
      }
    }
  }
  return out;
}

/**
 * Migration chain must be contiguous, ascending, end at the catalog version,
 * and every rename must resolve to an id that exists in the current catalog.
 */
function checkMigrations(catalog: Catalog, attributes: Map<string, AttributeDefinition>): Diagnostic[] {
  const out: Diagnostic[] = [];
  const steps = catalog.migrations;
  if (steps.length === 0) return out;
  for (let i = 0; i < steps.length; i++) {
    const m = steps[i]!;
    if (compareSemVer(m.fromVersion, m.toVersion) >= 0) {
      out.push(error("catalog.invalid_migration", `Migration ${m.fromVersion} → ${m.toVersion} must go forward`));
    }
    if (i > 0 && steps[i - 1]!.toVersion !== m.fromVersion) {
      out.push(error("catalog.invalid_migration", `Migration chain is not contiguous at ${m.fromVersion}`));
    }
  }
  if (steps[steps.length - 1]!.toVersion !== catalog.version) {
    out.push(error("catalog.invalid_migration", `Migration chain must end at catalog version ${catalog.version}`));
  }
  // Resolve each rename to its final id by replaying later steps.
  const finalAttr = (id: string, from: number): string => {
    let cur = id;
    for (let i = from; i < steps.length; i++) {
      for (const c of steps[i]!.changes) if (c.op === "renameAttribute" && c.from === cur) cur = c.to;
    }
    return cur;
  };
  steps.forEach((m, i) => {
    for (const c of m.changes) {
      if (c.op === "renameAttribute") {
        const target = finalAttr(c.to, i + 1);
        if (!attributes.has(target)) {
          out.push(error("catalog.invalid_migration", `Rename ${c.from} → ${c.to} resolves to unknown attribute "${target}"`));
        }
      } else {
        const attr = attributes.get(finalAttr(c.attributeId, i + 1));
        let optionId = c.to;
        for (let j = i + 1; j < steps.length; j++) {
          for (const x of steps[j]!.changes) if (x.op === "renameOption" && x.from === optionId) optionId = x.to;
        }
        if (!attr || !isOptionAttribute(attr) || !attr.options.some((o) => o.id === optionId)) {
          out.push(error("catalog.invalid_migration", `Option rename ${c.attributeId}/${c.from} → ${c.to} resolves to an unknown option`));
        }
      }
    }
  });
  return out;
}

/** `promptOrder` (TD-08): known, unique group ids; every attribute listed exactly once. */
function checkPromptOrder(catalog: Catalog, attributes: Map<string, AttributeDefinition>): Diagnostic[] {
  if (!catalog.promptOrder) return [];
  const out: Diagnostic[] = [];
  const groups = new Set<string>();
  const listed = new Map<string, string>();
  for (const g of catalog.promptOrder) {
    if (groups.has(g.id)) out.push(error("catalog.prompt_order_duplicate_group", `Duplicate prompt group "${g.id}"`));
    groups.add(g.id);
    for (const id of g.attributes) {
      if (!attributes.has(id)) out.push(error("catalog.prompt_order_unknown", `Prompt group "${g.id}" lists unknown attribute "${id}"`));
      else if (listed.has(id)) out.push(error("catalog.prompt_order_duplicate", `Attribute "${id}" is listed in prompt groups "${listed.get(id)}" and "${g.id}"`));
      else listed.set(id, g.id);
    }
  }
  for (const id of attributes.keys()) {
    if (!listed.has(id)) out.push(error("catalog.prompt_order_missing", `Attribute "${id}" has no place in promptOrder`));
  }
  return out;
}

function checkCondition(c: Condition, attributes: Map<string, AttributeDefinition>, where: string): Diagnostic[] {
  if (c.op === "derived") return [];
  if (c.op === "intervalMismatch") {
    const q = attributes.get(c.attributeId);
    const g = attributes.get(c.groupAttributeId);
    if (!q || q.type !== "quantity" || !g || !isOptionAttribute(g)) {
      return [error("catalog.invalid_condition", `${where}: intervalMismatch needs a quantity attribute and an option attribute`)];
    }
    return [];
  }
  const target = attributes.get(c.attributeId);
  if (!target) {
    return [error("catalog.unknown_attribute_ref", `${where} references unknown attribute "${c.attributeId}"`)];
  }
  if (c.op === "numberIn") {
    if (target.type !== "number") return [error("catalog.invalid_condition", `${where}: numberIn requires a number attribute ("${c.attributeId}")`)];
    if (c.min !== undefined && c.max !== undefined && c.min > c.max) return [error("catalog.invalid_condition", `${where}: numberIn min > max`)];
    return [];
  }
  if (c.op === "selectedCount" && !isOptionAttribute(target)) {
    return [error("catalog.invalid_condition", `${where}: selectedCount requires an option attribute ("${c.attributeId}")`)];
  }
  if (c.op === "anyOf" || c.op === "noneOf") {
    if (target.type !== "single" && target.type !== "multi") {
      return [error("catalog.invalid_condition", `${where}: ${c.op} requires an option attribute ("${c.attributeId}")`)];
    }
    return c.optionIds
      .filter((id) => !target.options.some((o) => o.id === id))
      .map((id) => error("catalog.unknown_option_ref", `${where} references unknown option "${c.attributeId}/${id}"`));
  }
  return [];
}

function findCycles(nodes: ReadonlyArray<{ id: string; parentId?: string | undefined }>, msg: (id: string) => string) {
  const parent = new Map(nodes.map((n) => [n.id, n.parentId]));
  const out: Diagnostic[] = [];
  for (const n of nodes) {
    const seen = new Set<string>([n.id]);
    let cur = n.parentId;
    while (cur !== undefined) {
      if (seen.has(cur)) {
        out.push(error("catalog.hierarchy_cycle", msg(n.id)));
        break;
      }
      seen.add(cur);
      cur = parent.get(cur);
    }
  }
  return out;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}
