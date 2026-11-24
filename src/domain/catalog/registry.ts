import { error, fail, fromZodIssues, hasErrors, ok, type Diagnostic, type Result } from "../shared/diagnostics";
import {
  CatalogSchema,
  type AttributeDefinition,
  type Catalog,
  type CatalogRule,
  type Condition,
  type GroupDefinition,
  type OptionDefinition,
  type Tier,
} from "./schema";
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
export class CatalogRegistry {
  private readonly attributesById: ReadonlyMap<string, AttributeDefinition>;
  private readonly sortedAttributes: readonly AttributeDefinition[];

  private constructor(private readonly catalog: Catalog) {
    this.sortedAttributes = Object.freeze([...catalog.attributes].sort(byOrderThenId));
    this.attributesById = new Map(this.sortedAttributes.map((a) => [a.id, a]));
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
  get groups(): readonly GroupDefinition[] {
    return this.catalog.groups;
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

  const ruleIds = new Set<string>();
  for (const r of catalog.rules) {
    if (ruleIds.has(r.id)) out.push(error("catalog.duplicate_rule", `Duplicate rule id "${r.id}"`));
    ruleIds.add(r.id);
    for (const c of r.when) out.push(...checkCondition(c, attributes, `rule "${r.id}"`));
    for (const id of r.involves) {
      if (!attributes.has(id)) out.push(error("catalog.unknown_attribute_ref", `Rule "${r.id}" involves unknown "${id}"`));
    }
  }
  return out;
}

function checkCondition(c: Condition, attributes: Map<string, AttributeDefinition>, where: string): Diagnostic[] {
  const target = attributes.get(c.attributeId);
  if (!target) {
    return [error("catalog.unknown_attribute_ref", `${where} references unknown attribute "${c.attributeId}"`)];
  }
  if (c.op === "anyOf") {
    if (target.type !== "single" && target.type !== "multi") {
      return [error("catalog.invalid_condition", `${where}: anyOf requires an option attribute ("${c.attributeId}")`)];
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
