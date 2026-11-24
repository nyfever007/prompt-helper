import type { ImageSpec } from "../spec/schema";
import type { Condition } from "./schema";

export const evaluateCondition = (condition: Condition, spec: ImageSpec): boolean => {
  const selection = spec.selections[condition.attributeId];
  switch (condition.op) {
    case "isSet":
      return selection !== undefined;
    case "isUnset":
      return selection === undefined;
    case "anyOf": {
      if (!selection) return false;
      const v = selection.value;
      if (v.kind === "single") return condition.optionIds.includes(v.optionId);
      if (v.kind === "multi") return v.optionIds.some((id) => condition.optionIds.includes(id));
      return false;
    }
  }
};

export const evaluateAll = (conditions: readonly Condition[] | undefined, spec: ImageSpec): boolean =>
  (conditions ?? []).every((c) => evaluateCondition(c, spec));
