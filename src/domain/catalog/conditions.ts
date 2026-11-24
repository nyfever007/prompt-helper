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

/** Does any selected option (or one of its ancestors) appear in `optionIds`? Allocation-free; same result as scanning the flattened lineage. */
const lineageHits = (ids: readonly string[], attributeId: string, optionIds: readonly string[], ctx?: ConditionContext): boolean => {
  for (const id of ids) {
    if (!ctx) {
      if (optionIds.includes(id)) return true;
      continue;
    }
    for (const x of ctx.lineage(attributeId, id)) if (optionIds.includes(x)) return true;
  }
  return false;
};

export const evaluateCondition = (condition: Condition, spec: ImageSpec, ctx?: ConditionContext): boolean => {
  switch (condition.op) {
    case "isSet":
      return spec.selections[condition.attributeId] !== undefined;
    case "isUnset":
      return spec.selections[condition.attributeId] === undefined;
    case "anyOf":
    case "noneOf": {
      const selection = spec.selections[condition.attributeId];
      if (!selection) return condition.whenUnset === "pass";
      const ids = selectedOptionIds(selection.value);
      const hit = lineageHits(ids, condition.attributeId, condition.optionIds, ctx);
      if (condition.op === "anyOf") return hit;
      // A custom entry is a value that is none of the listed options. (Every selected id has a
      // non-empty lineage, so “some lineage” is the same as “some selected option”.)
      const hasCustom = selectedCustomEntries(selection.value).length > 0;
      return !hit && (ids.length > 0 || hasCustom);
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
