import { resolveText, type AttributeDefinition, type SelectionValue } from "@/domain";

/** Human-readable, localized summary of a selection value (UI only). */
export const describeValue = (attribute: AttributeDefinition, value: SelectionValue, locale: string): string => {
  switch (value.kind) {
    case "single": {
      const o = attribute.type === "single" ? attribute.options.find((x) => x.id === value.optionId) : undefined;
      return o ? resolveText(o.label, locale) : value.optionId;
    }
    case "multi": {
      const opts = attribute.type === "multi" ? attribute.options : [];
      return value.optionIds.map((id) => resolveText(opts.find((o) => o.id === id)?.label, locale) || id).join(", ");
    }
    case "number":
      return String(value.value);
    case "range":
      return `${value.min}–${value.max}`;
    case "text":
      return value.text;
  }
};
