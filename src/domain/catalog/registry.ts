import { error, fail, fromZodIssues, hasErrors, ok, type Diagnostic, type Result } from "../shared/diagnostics";
import type { ConditionContext } from "./conditions";
import {
  CatalogSchema,
  isOptionAttribute,
  type AttributeDefinition,
  type Catalog,
  type CatalogMigration,
  type CatalogRule,
  type Condition,
  type GroupDefinition,
  type OptionDefinition,
  type Tier,
} from "./schema";
import { compareSemVer } from "./semver";
import { checkValueForAttribute } from "./valueCheck";

const TIER_RANK: Record<Tier, number> = { basic: 0, detailed: 1, precision: 2 };

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
  private readonly sortedGroups: readonly GroupDefinition[];

  private constructor(private readonly catalog: Catalog) {
    this.sortedAttributes = Object.freeze([...catalog.attributes].sort(byOrderThenId));
    this.attributesById = new Map(this.sortedAttributes.map((a) => [a.id, a]));
    this.sortedGroups = Object.freeze([...catalog.groups].sort(byOrderThenId));
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

  getGroup(id: string): GroupDefinition | undefined {
    return this.sortedGroups.find((g) => g.id === id);
  }

  /** The top-level group an attribute belongs to (walking up `parentId`). */
  rootGroupOf(attribute: AttributeDefinition): GroupDefinition | undefined {
    let g = attribute.groupId ? this.getGroup(attribute.groupId) : undefined;
    while (g?.parentId) g = this.getGroup(g.parentId);
    return g;
  }

  /** All attributes in deterministic (order, id) order. */
  attributes(): readonly AttributeDefinition[] {
    return this.sortedAttributes;
  }

  /** Attributes first offered at exactly this tier. */
  attributesForTier(tier: Tier): AttributeDefinition[] {
    return this.sortedAttributes.filter((a) => a.tier === tier);
  }

  /** Attributes visible in a mode (a mode shows its tier and all simpler tiers). */
  attributesVisibleIn(tier: Tier): AttributeDefinition[] {
    return this.sortedAttributes.filter((a) => TIER_RANK[a.tier] <= TIER_RANK[tier]);
  }

  getAttribute(id: string): AttributeDefinition | undefined {
    return this.attributesById.get(id);
  }

  getOption(attributeId: string, optionId: string): OptionDefinition | undefined {
    const attribute = this.attributesById.get(attributeId);
    if (!attribute || (attribute.type !== "single" && attribute.type !== "multi")) return undefined;
    return attribute.options.find((o) => o.id === optionId);
  }

  /** The option id followed by its ancestors, nearest first (ConditionContext). */
  lineage(attributeId: string, optionId: string): readonly string[] {
    const attribute = this.attributesById.get(attributeId);
    if (!attribute || !isOptionAttribute(attribute)) return [optionId];
    const out = [optionId];
    let cur = attribute.options.find((o) => o.id === optionId)?.parentId;
    while (cur !== undefined && !out.includes(cur)) {
      out.push(cur);
      cur = attribute.options.find((o) => o.id === cur)?.parentId;
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
    if ((a.type === "number" || a.type === "range") && a.min > a.max) {
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
      if (c.attributeId === a.id) {
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
        if (c.attributeId === a.id) out.push(error("catalog.self_condition", `Option "${a.id}/${o.id}" cannot depend on its own attribute`));
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

  out.push(...checkMigrations(catalog, attributes));

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

function checkCondition(c: Condition, attributes: Map<string, AttributeDefinition>, where: string): Diagnostic[] {
  const target = attributes.get(c.attributeId);
  if (!target) {
    return [error("catalog.unknown_attribute_ref", `${where} references unknown attribute "${c.attributeId}"`)];
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
