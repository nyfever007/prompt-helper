import type { ImageSpec } from "../spec/schema";
import { selectedCustomEntries, selectedOptionIds } from "../spec/values";
import type { Condition, DerivedFact } from "./schema";

/** Lets conditions match hierarchically (child option satisfies its ancestors) and read derived facts. */
export interface ConditionContext {
  /** The option id itself followed by its ancestors, nearest first. */
  lineage(attributeId: string, optionId: string): readonly string[];
  /** Value of a derived fact (e.g. `age.class`) for the spec. Absent context → condition fails. */
  derivedFact?(fact: DerivedFact, spec: ImageSpec): string;
  /** See the `intervalMismatch` condition. */
  intervalMismatch?(spec: ImageSpec, quantityAttributeId: string, groupAttributeId: string): boolean;
}

const selectedLineage = (spec: ImageSpec, attributeId: string, ctx?: ConditionContext): string[] | undefined => {
  const selection = spec.selections[attributeId];
  if (!selection) return undefined;
  return selectedOptionIds(selection.value).flatMap((id) => (ctx ? [...ctx.lineage(attributeId, id)] : [id]));
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
      if (condition.op === "anyOf") return hit;
      // A custom entry is a value that is none of the listed options.
      const hasCustom = selectedCustomEntries(spec.selections[condition.attributeId]?.value).length > 0;
      return !hit && (lineage.length > 0 || hasCustom);
    }
    case "derived":
      return ctx?.derivedFact ? condition.anyOf.includes(ctx.derivedFact(condition.fact, spec)) : false;
    case "selectedCount": {
      const value = spec.selections[condition.attributeId]?.value;
      return selectedOptionIds(value).length + selectedCustomEntries(value).length >= condition.min;
    }
    case "intervalMismatch":
      return ctx?.intervalMismatch ? ctx.intervalMismatch(spec, condition.attributeId, condition.groupAttributeId) : false;
  }
};

export const evaluateAll = (conditions: readonly Condition[] | undefined, spec: ImageSpec, ctx?: ConditionContext): boolean =>
  (conditions ?? []).every((c) => evaluateCondition(c, spec, ctx));

/** Attribute ids a condition reads (derived facts read the age model, not listed here). */
export const conditionAttributeIds = (c: Condition): string[] =>
  c.op === "derived" ? [] : c.op === "intervalMismatch" ? [c.attributeId, c.groupAttributeId] : [c.attributeId];
