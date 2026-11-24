import type { ImageSpec } from "../spec/schema";
import { selectedCustomEntries, selectedOptionIds, type SelectionValue } from "../spec/values";
import type { AgeClass, AgeModel, AttributeDefinition, BeingClass, QuantityAttributeDefinition } from "./schema";

/**
 * Structured age assessment (approved D7, N3, Q1–Q3 — SPRINT_2B1_SPEC_REVIEW §5).
 *
 * One interpretation shared by the safety policy, the actual-age/age-group
 * consistency check and conditional wording. It READS selections only —
 * including ones excluded from the prompt or currently inapplicable — and never
 * writes anything into the spec (no implicit `human`, age or gender).
 */

export interface AgeContext {
  readonly ageModel: AgeModel | undefined;
  getAttribute(id: string): AttributeDefinition | undefined;
  lineage(attributeId: string, optionId: string): readonly string[];
}

export type AgeSignalKind = "minor" | "ambiguous" | "adult";

export interface AgeSignal {
  attributeId: string;
  signal: AgeSignalKind;
}

export interface AgeAssessment {
  ageClass: AgeClass;
  being: BeingClass;
  /** Every individual signal, in model order (age group, actual age, apparent age). */
  signals: AgeSignal[];
}

/** A quantity value normalized to the base unit ({min,max} — equal for a single number). Null when not a usable quantity. */
export const quantityInBase = (attribute: AttributeDefinition | undefined, value: SelectionValue | undefined): { min: number; max: number } | null => {
  if (!attribute || attribute.type !== "quantity" || !value) return null;
  if (value.kind !== "number" && value.kind !== "range") return null;
  const unit = (attribute as QuantityAttributeDefinition).units.find((u) => u.id === value.unit);
  if (!unit) return null;
  return value.kind === "number"
    ? { min: value.value / unit.perBase, max: value.value / unit.perBase }
    : { min: value.min / unit.perBase, max: value.max / unit.perBase };
};

const classifyInterval = (min: number, max: number, adultFrom: number): AgeSignalKind =>
  max < adultFrom ? "minor" : min >= adultFrom ? "adult" : "ambiguous";

/**
 * Being classification (spec review §5.1 table). Inputs: the registered kind
 * of the entity type and species (or "custom"/unset). Unknown or conflicting
 * structure → `unclassified` (conservative).
 */
export const classifyBeing = (spec: ImageSpec, ctx: AgeContext): BeingClass => {
  const model = ctx.ageModel;
  if (!model) return "unclassified";
  const kindOf = (attributeId: string, kinds: Record<string, string>): string | "custom" | undefined => {
    const value = spec.selections[attributeId]?.value;
    if (!value) return undefined;
    if (selectedCustomEntries(value).length > 0) return "custom";
    const [id] = selectedOptionIds(value);
    if (id === undefined) return undefined;
    for (const x of ctx.lineage(attributeId, id)) if (kinds[x]) return kinds[x];
    return "custom"; // registered but unclassified in the model → treat like an unknown kind
  };
  const entity = kindOf(model.entityTypeAttributeId, model.entityKinds);
  const species = kindOf(model.speciesAttributeId, model.speciesKinds);

  if (entity === "artificial") return "nonhuman";
  if (species === "nonhuman") return entity === "human" ? "unclassified" : "nonhuman";
  if (species === "custom") return "unclassified";
  // species is human or unset from here on
  switch (entity) {
    case undefined:
      return "human"; // general person (N3): human basis, nothing is written to the spec
    case "human":
      return "human";
    case "augmented":
      return species === "human" ? "human" : "unclassified"; // human cyborg vs ambiguous cyborg (Q2)
    case "nonhuman":
      return species === "human" ? "unclassified" : "nonhuman";
    default:
      return "unclassified"; // custom entity (Q1)
  }
};

/** Signal of one quantity attribute (number or complete range), or null. */
const quantitySignal = (spec: ImageSpec, ctx: AgeContext, attributeId: string, adultFrom: number): AgeSignalKind | null => {
  const q = quantityInBase(ctx.getAttribute(attributeId), spec.selections[attributeId]?.value);
  return q ? classifyInterval(q.min, q.max, adultFrom) : null;
};

export const assessAge = (spec: ImageSpec, ctx: AgeContext): AgeAssessment => {
  const model = ctx.ageModel;
  if (!model) return { ageClass: "unknown", being: "unclassified", signals: [] };
  const signals: AgeSignal[] = [];

  const groupValue = spec.selections[model.ageGroupAttributeId]?.value;
  const [groupId] = selectedOptionIds(groupValue);
  const group = ctx.getAttribute(model.ageGroupAttributeId);
  const groupOption = groupId !== undefined && group && (group.type === "single" || group.type === "multi") ? group.options.find((o) => o.id === groupId) : undefined;
  if (groupOption?.interval) {
    const { min, maxExclusive } = groupOption.interval;
    // maxExclusive ≤ threshold → every value is below it (minor); open-ended or above → crosses unless min ≥ threshold.
    const kind: AgeSignalKind =
      maxExclusive !== undefined && maxExclusive <= model.adultFrom ? "minor" : min >= model.adultFrom ? "adult" : "ambiguous";
    signals.push({ attributeId: model.ageGroupAttributeId, signal: kind });
  }
  const actual = quantitySignal(spec, ctx, model.actualAgeAttributeId, model.adultFrom);
  if (actual) signals.push({ attributeId: model.actualAgeAttributeId, signal: actual });
  const apparent = quantitySignal(spec, ctx, model.apparentAgeAttributeId, model.adultFrom);
  if (apparent) signals.push({ attributeId: model.apparentAgeAttributeId, signal: apparent });

  const being = classifyBeing(spec, ctx);
  const has = (k: AgeSignalKind) => signals.some((s) => s.signal === k);
  let ageClass: AgeClass;
  if (has("minor")) ageClass = "minor"; // never offset by adult signals
  else if (has("ambiguous")) ageClass = "ambiguous";
  else if (
    signals.some(
      (s) =>
        s.signal === "adult" &&
        (s.attributeId !== model.actualAgeAttributeId || being === "human"), // actual age alone proves adulthood only for humans
    )
  )
    ageClass = "adult";
  else ageClass = "unknown";
  return { ageClass, being, signals };
};

/**
 * Is the quantity value (base unit) outside the interval of the selected group option?
 * Number: outside [min, maxExclusive). Range: any part outside.
 */
export const intervalMismatch = (spec: ImageSpec, ctx: AgeContext, quantityAttributeId: string, groupAttributeId: string): boolean => {
  const q = quantityInBase(ctx.getAttribute(quantityAttributeId), spec.selections[quantityAttributeId]?.value);
  if (!q) return false;
  const [groupId] = selectedOptionIds(spec.selections[groupAttributeId]?.value);
  const group = ctx.getAttribute(groupAttributeId);
  if (groupId === undefined || !group || (group.type !== "single" && group.type !== "multi")) return false;
  const interval = group.options.find((o) => o.id === groupId)?.interval;
  if (!interval) return false;
  return q.min < interval.min || (interval.maxExclusive !== undefined && q.max >= interval.maxExclusive);
};
