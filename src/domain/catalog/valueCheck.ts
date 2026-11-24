import { error, type Diagnostic } from "../shared/diagnostics";
import type { SelectionValue } from "../spec/values";
import type { AttributeDefinition } from "./schema";

/**
 * Check a selection value against its attribute definition.
 * Shared by the CatalogRegistry (for `defaultValue`) and the SpecValidator.
 */
export const checkValueForAttribute = (
  attribute: AttributeDefinition,
  value: SelectionValue,
  path: string,
): Diagnostic[] => {
  const attributeId = attribute.id;
  const at = { attributeId, path };
  if (value.kind !== attribute.type) {
    return [
      error("value.kind_mismatch", `${attributeId}: expected a "${attribute.type}" value but got "${value.kind}"`, {
        ...at,
        params: { expected: attribute.type, actual: value.kind },
      }),
    ];
  }

  const out: Diagnostic[] = [];
  switch (attribute.type) {
    case "single": {
      const v = value as Extract<SelectionValue, { kind: "single" }>;
      if (!attribute.options.some((o) => o.id === v.optionId)) {
        out.push(
          error("value.unknown_option", `${attributeId}: unknown option "${v.optionId}"`, {
            ...at,
            params: { optionId: v.optionId },
          }),
        );
      }
      break;
    }
    case "multi": {
      const v = value as Extract<SelectionValue, { kind: "multi" }>;
      for (const id of v.optionIds) {
        if (!attribute.options.some((o) => o.id === id)) {
          out.push(error("value.unknown_option", `${attributeId}: unknown option "${id}"`, { ...at, params: { optionId: id } }));
        }
      }
      if (attribute.maxSelections !== undefined && v.optionIds.length > attribute.maxSelections) {
        out.push(
          error("value.too_many_options", `${attributeId}: at most ${attribute.maxSelections} options allowed`, {
            ...at,
            params: { max: attribute.maxSelections },
          }),
        );
      }
      break;
    }
    case "number": {
      const v = value as Extract<SelectionValue, { kind: "number" }>;
      if (v.value < attribute.min || v.value > attribute.max) {
        out.push(
          error("value.out_of_range", `${attributeId}: ${v.value} is outside ${attribute.min}..${attribute.max}`, {
            ...at,
            params: { min: attribute.min, max: attribute.max },
          }),
        );
      }
      break;
    }
    case "range": {
      const v = value as Extract<SelectionValue, { kind: "range" }>;
      if (v.min < attribute.min || v.max > attribute.max) {
        out.push(
          error("value.out_of_range", `${attributeId}: ${v.min}-${v.max} is outside ${attribute.min}..${attribute.max}`, {
            ...at,
            params: { min: attribute.min, max: attribute.max },
          }),
        );
      }
      break;
    }
    case "text": {
      const v = value as Extract<SelectionValue, { kind: "text" }>;
      if (v.text.length > attribute.maxLength) {
        out.push(
          error("value.text_too_long", `${attributeId}: text exceeds ${attribute.maxLength} characters`, {
            ...at,
            params: { max: attribute.maxLength },
          }),
        );
      }
      break;
    }
  }
  return out;
};
