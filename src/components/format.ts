import { normalizeHex, RANDOM_ORIGIN, resolveText, selectedCustomEntries, selectedOptionIds, type AttributeDefinition, type CatalogRegistry, type SelectionValue } from "@/domain";

/** Human-readable, localized summary of a selection value (UI only). Custom entries show their name. */
export const describeValue = (attribute: AttributeDefinition, value: SelectionValue, locale: string): string => {
  switch (value.kind) {
    case "single":
    case "multi": {
      const opts = attribute.type === "single" || attribute.type === "multi" ? attribute.options : [];
      return [
        ...selectedOptionIds(value).map((id) => resolveText(opts.find((o) => o.id === id)?.label, locale) || id),
        ...selectedCustomEntries(value).map((c) => (c.color && normalizeHex(c.label) !== c.color ? `${c.label} (${c.color})` : c.label)),
      ].join(", ");
    }
    case "number":
    case "range": {
      const unit = attribute.type === "quantity" ? attribute.units.find((u) => u.id === value.unit) : undefined;
      const n = value.kind === "number" ? String(value.value) : `${value.min}–${value.max}`;
      return unit ? `${n} ${resolveText(unit.label, locale)}` : n;
    }
    case "text":
      return value.text;
  }
};

export const attributeLabel = (registry: CatalogRegistry, attributeId: string, locale: string): string => {
  const a = registry.getAttribute(attributeId);
  return a ? resolveText(a.label, locale) : attributeId;
};

export const optionLabel = (registry: CatalogRegistry, attributeId: string, optionId: string, locale: string): string => {
  const o = registry.getOption(attributeId, optionId);
  return o ? resolveText(o.label, locale) : optionId;
};

/** Display name of a preset id — the Random Composer's reserved origin (Sprint 2-D.6) is not a catalog preset. */
export const presetLabel = (registry: CatalogRegistry, presetId: string, locale: string, randomName: string, userName?: (id: string) => string | undefined): string =>
  presetId === RANDOM_ORIGIN.presetId ? randomName : resolveText(registry.getPreset(presetId)?.label, locale) || userName?.(presetId) || presetId;
