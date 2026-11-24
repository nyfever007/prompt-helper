import type { ImageSpec } from "../spec/schema";
import type { Condition } from "./schema";

/** Lets conditions match hierarchically (child option satisfies its ancestors). */
export interface ConditionContext {
  /** The option id itself followed by its ancestors, nearest first. */
  lineage(attributeId: string, optionId: string): readonly string[];
}

const selectedLineage = (spec: ImageSpec, attributeId: string, ctx?: ConditionContext): string[] | undefined => {
  const selection = spec.selections[attributeId];
  if (!selection) return undefined;
  const v = selection.value;
  const ids = v.kind === "single" ? [v.optionId] : v.kind === "multi" ? v.optionIds : [];
  return ids.flatMap((id) => (ctx ? [...ctx.lineage(attributeId, id)] : [id]));
};

export const evaluateCondition = (condition: Condition, spec: ImageSpec, ctx?: ConditionContext): boolean => {
  switch (condition.op) {
    case "isSet":
      return spec.selections[condition.attributeId] !== undefined;
    case "isUnset":
      return spec.selections[condition.attributeId] === undefined;
    case "anyOf":
    case "noneOf": {
      const lineage = selectedLineage(spec, condition.attributeId, ctx);
      if (lineage === undefined) return condition.whenUnset === "pass";
      const hit = lineage.some((id) => condition.optionIds.includes(id));
      return condition.op === "anyOf" ? hit : !hit && lineage.length > 0;
    }
  }
};

export const evaluateAll = (conditions: readonly Condition[] | undefined, spec: ImageSpec, ctx?: ConditionContext): boolean =>
  (conditions ?? []).every((c) => evaluateCondition(c, spec, ctx));
