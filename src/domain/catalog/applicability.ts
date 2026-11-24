import type { ImageSpec } from "../spec/schema";
import { evaluateAll } from "./conditions";
import type { CatalogRegistry } from "./registry";
import type { AttributeDefinition, OptionDefinition } from "./schema";

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
    if (attribute.type !== "single" && attribute.type !== "multi") continue;
    const v = selection.value;
    const ids = v.kind === "single" ? [v.optionId] : v.kind === "multi" ? v.optionIds : [];
    const inactive = ids.filter((id) => {
      const option = attribute.options.find((o) => o.id === id);
      return option !== undefined && !isOptionActive(registry, option, spec);
    });
    if (inactive.length > 0) out.push({ attributeId: attribute.id, scope: "option", optionIds: inactive });
  }
  return out;
};

export const inactiveKey = (i: InactiveSelection): string => `${i.attributeId}:${i.scope}:${i.optionIds.join(",")}`;
