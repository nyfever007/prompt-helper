import type { ImageSpec } from "../spec/schema";
import { selectedOptionIds } from "../spec/values";
import { evaluateAll } from "./conditions";
import type { CatalogRegistry } from "./registry";
import type { AttributeDefinition, OptionDefinition } from "./schema";

/**
 * Per-attribute facts of the (deep-frozen) catalog: whether any option has its own
 * applicability or a policy restriction. Lets the scans below skip attributes whose
 * options can never be inactive/restricted — the results are unchanged.
 */
const optionFacts = new WeakMap<AttributeDefinition, { appliesWhen: boolean; restriction: boolean }>();
const factsOf = (attribute: AttributeDefinition) => {
  let f = optionFacts.get(attribute);
  if (!f) {
    const options = attribute.type === "single" || attribute.type === "multi" ? attribute.options : [];
    f = { appliesWhen: options.some((o) => o.appliesWhen !== undefined), restriction: options.some((o) => o.restriction !== undefined) };
    optionFacts.set(attribute, f);
  }
  return f;
};

/** Is the attribute applicable to the current spec (attribute-level `appliesWhen`)? */
export const isAttributeActive = (registry: CatalogRegistry, attribute: AttributeDefinition, spec: ImageSpec): boolean =>
  evaluateAll(attribute.appliesWhen, spec, registry);

/** Is this option applicable (its own `appliesWhen`, given the attribute is active)? */
export const isOptionActive = (registry: CatalogRegistry, option: OptionDefinition, spec: ImageSpec): boolean =>
  evaluateAll(option.appliesWhen, spec, registry);

export interface InactiveSelection {
  attributeId: string;
  /** `attribute`: whole attribute not applicable; `option`: some selected options not applicable. */
  scope: "attribute" | "option";
  /** For scope `option`: the selected option ids that are not applicable. */
  optionIds: string[];
}

/**
 * Selections that are kept in the spec but excluded from compilation because
 * they are not applicable in the current context. Deterministic order.
 */
export const findInactiveSelections = (spec: ImageSpec, registry: CatalogRegistry): InactiveSelection[] => {
  const out: InactiveSelection[] = [];
  for (const attribute of registry.attributes()) {
    const selection = spec.selections[attribute.id];
    if (!selection) continue;
    if (!isAttributeActive(registry, attribute, spec)) {
      out.push({ attributeId: attribute.id, scope: "attribute", optionIds: [] });
      continue;
    }
    if ((attribute.type !== "single" && attribute.type !== "multi") || !factsOf(attribute).appliesWhen) continue;
    const ids = selectedOptionIds(selection.value);
    const inactive = ids.filter((id) => {
      const option = registry.getOption(attribute.id, id);
      return option !== undefined && !isOptionActive(registry, option, spec);
    });
    if (inactive.length > 0) out.push({ attributeId: attribute.id, scope: "option", optionIds: inactive });
  }
  return out;
};

export const inactiveKey = (i: InactiveSelection): string => `${i.attributeId}:${i.scope}:${i.optionIds.join(",")}`;

/** Is this option currently restricted by policy (shown disabled with a reason)? */
export const isOptionRestricted = (registry: CatalogRegistry, option: OptionDefinition, spec: ImageSpec): boolean =>
  option.restriction !== undefined && evaluateAll(option.restriction.when, spec, registry);

export interface RestrictedSelection {
  attributeId: string;
  optionIds: string[];
}

/** Selected options that are restricted by policy in the current spec. Deterministic order. */
/** Attributes (registry order) with at least one restricted option — usually none. */
const restrictable = new WeakMap<CatalogRegistry, readonly AttributeDefinition[]>();
const restrictableOf = (registry: CatalogRegistry) => {
  let list = restrictable.get(registry);
  if (!list) restrictable.set(registry, (list = registry.attributes().filter((a) => factsOf(a).restriction)));
  return list;
};

export const findRestrictedSelections = (spec: ImageSpec, registry: CatalogRegistry): RestrictedSelection[] => {
  const out: RestrictedSelection[] = [];
  for (const attribute of restrictableOf(registry)) {
    const selection = spec.selections[attribute.id];
    if (!selection || (attribute.type !== "single" && attribute.type !== "multi")) continue;
    const ids = selectedOptionIds(selection.value);
    const restricted = ids.filter((id) => {
      const o = registry.getOption(attribute.id, id);
      return o !== undefined && isOptionRestricted(registry, o, spec);
    });
    if (restricted.length) out.push({ attributeId: attribute.id, optionIds: restricted });
  }
  return out;
};
