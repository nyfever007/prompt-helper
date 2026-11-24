import { error, type Diagnostic } from "../shared/diagnostics";
import { CUSTOM_EXPRESSION_MAX, CUSTOM_LABEL_MAX, customKey, selectedCustomEntries, type SelectionValue } from "../spec/values";
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
  const kindOk = attribute.type === "quantity" ? (attribute.forms as string[]).includes(value.kind) : value.kind === attribute.type;
  if (!kindOk) {
    const expected = attribute.type === "quantity" ? attribute.forms.join("|") : attribute.type;
    return [
      error("value.kind_mismatch", `${attributeId}: expected a "${expected}" value but got "${value.kind}"`, {
        ...at,
        params: { expected, actual: value.kind },
      }),
    ];
  }

  const out: Diagnostic[] = [];
  const unknownOption = (id: string) => error("value.unknown_option", `${attributeId}: unknown option "${id}"`, { ...at, params: { optionId: id } });

  // User-defined entries: only where the catalog allows them, within its limits.
  const custom = selectedCustomEntries(value);
  if (custom.length > 0) {
    if (attribute.type !== "single" && attribute.type !== "multi") return out;
    if (!attribute.custom) {
      out.push(error("value.custom_not_allowed", `${attributeId}: custom values are not allowed`, at));
    } else {
      const labelMax = attribute.custom.labelMaxLength ?? CUSTOM_LABEL_MAX;
      const exprMax = attribute.custom.expressionMaxLength ?? CUSTOM_EXPRESSION_MAX;
      for (const c of custom) {
        if (c.label.length > labelMax || (c.expression?.length ?? 0) > exprMax) {
          out.push(error("value.text_too_long", `${attributeId}: custom entry exceeds ${labelMax}/${exprMax} characters`, { ...at, params: { max: labelMax } }));
        }
      }
      if (new Set(custom.map((c) => customKey(c.label))).size !== custom.length) {
        out.push(error("value.duplicate_custom", `${attributeId}: custom entries must have distinct labels`, at));
      }
    }
  }

  switch (attribute.type) {
    case "single": {
      if (value.kind === "single" && "optionId" in value && !attribute.options.some((o) => o.id === value.optionId)) {
        out.push(unknownOption(value.optionId));
      }
      break;
    }
    case "multi": {
      const v = value as Extract<SelectionValue, { kind: "multi" }>;
      for (const id of v.optionIds) {
        if (!attribute.options.some((o) => o.id === id)) out.push(unknownOption(id));
      }
      const count = v.optionIds.length + (v.custom?.length ?? 0);
      if (attribute.maxSelections !== undefined && count > attribute.maxSelections) {
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
    case "quantity": {
      const v = value as Extract<SelectionValue, { kind: "number" | "range" }>;
      if (!attribute.units.some((u) => u.id === v.unit)) {
        out.push(
          error("value.unknown_unit", `${attributeId}: unit "${v.unit ?? ""}" is not one of ${attribute.units.map((u) => u.id).join(", ")}`, {
            ...at,
            params: { unit: v.unit ?? "" },
          }),
        );
      }
      const nums = v.kind === "number" ? [v.value] : [v.min, v.max];
      const max = attribute.max ?? Number.POSITIVE_INFINITY;
      if (nums.some((n) => n < attribute.min || n > max)) {
        out.push(
          error("value.out_of_range", `${attributeId}: ${nums.join("-")} is outside ${attribute.min}..${attribute.max ?? "∞"}`, {
            ...at,
            params: { min: attribute.min, max: attribute.max ?? "∞" },
          }),
        );
      }
      if (attribute.integer && nums.some((n) => !Number.isInteger(n))) {
        out.push(error("value.not_integer", `${attributeId}: whole numbers only`, at));
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
