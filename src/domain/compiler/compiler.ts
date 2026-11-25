import { assessAge, type AgeAssessment } from "../catalog/age";
import { findInactiveSelections, findRestrictedSelections, isOptionActive } from "../catalog/applicability";
import { evaluateAll } from "../catalog/conditions";
import { phraseUnits, renderPhraseParts } from "../catalog/phrase";
import type { CatalogRegistry } from "../catalog/registry";
import type { AttributeDefinition, OptionDefinition } from "../catalog/schema";
import { checkValueForAttribute } from "../catalog/valueCheck";
import { baselinePolicy } from "../safety/baselinePolicy";
import { evaluateSafety } from "../safety/evaluate";
import type { SafetyPolicy } from "../safety/types";
import { error, hasErrors, info, warning, type Diagnostic } from "../shared/diagnostics";
import type { ImageSpec } from "../spec/schema";
import { selectedCustomEntries, selectedOptionIds, type CustomEntry, type SelectionValue } from "../spec/values";
import { validateSpecAgainstCatalog } from "../validation/specValidator";
import { genericEnglishAdapter } from "./adapters/generic";
import { detectNonLatinScripts } from "./language";
import type { HiddenReason, PromptAdapter, PromptCompilation, PromptFragment, PromptParameterValue } from "./types";

/**
 * Bump when the compiler's output for an unchanged spec can change.
 * 0.3.0: numeric semantics (degree → bands), policy restrictions block output,
 * direct selections take over semantic units of preset phrases.
 * 0.4.0: output exclusion, metadata role, custom values, quantity units,
 * conditional wording, `covers` de-duplication, safety over non-output values
 * and structured age signals. Specs that use none of these compile exactly as
 * with 0.3.0 (regression-tested).
 * 0.5.0: output order from the catalog `promptOrder` (separate from the UI order,
 * TD-08); same text for the same catalog order (golden-tested).
 */
export const COMPILER_VERSION = "0.5.0";

/** Collapse whitespace for prompt output. The stored spec is never modified. */
export const normalizeWhitespace = (text: string): string => text.replace(/\s+/gu, " ").trim();

/** Option phrase: adapter-specific text (opaque) > first matching variant > semantic parts / text. */
const phrase = (registry: CatalogRegistry, spec: ImageSpec, option: OptionDefinition, adapterId: string, takenOver: ReadonlySet<string>): string => {
  const byAdapter = option.prompt.byAdapter?.[adapterId];
  if (byAdapter) return byAdapter;
  const variant = option.prompt.variants?.find((v) => evaluateAll(v.when, spec, registry));
  if (variant) return variant.text;
  if (option.prompt.parts && takenOver.size > 0) return renderPhraseParts(option.prompt.parts, takenOver);
  return option.prompt.text;
};

/** A custom entry is output as its expression, or — when none was given — its name, verbatim. */
export const customOutput = (c: CustomEntry): string => normalizeWhitespace(c.expression ?? c.label);

interface Rendered {
  text: string;
  /** Applicable registered options that contributed (option attributes only). */
  options: OptionDefinition[];
  /** Custom entries that contributed. */
  custom: CustomEntry[];
  parameter?: PromptParameterValue;
}

/** Selected registered options of an option attribute, in catalog order (not click order: the same set always yields the same text). */
const selectedOptionsInOrder = (attribute: AttributeDefinition, value: SelectionValue): OptionDefinition[] => {
  if (attribute.type !== "single" && attribute.type !== "multi") return [];
  const ids = selectedOptionIds(value);
  return attribute.options.filter((o) => ids.includes(o.id));
};

/** Applicable selected registered options of an option attribute (catalog order). */
const activeOptions = (registry: CatalogRegistry, spec: ImageSpec, attribute: AttributeDefinition, value: SelectionValue): OptionDefinition[] =>
  selectedOptionsInOrder(attribute, value).filter((o) => isOptionActive(registry, o, spec));

const quantityText = (attribute: AttributeDefinition, value: SelectionValue): string | null => {
  if (attribute.type !== "quantity" || (value.kind !== "number" && value.kind !== "range")) return null;
  const unit = attribute.units.find((u) => u.id === value.unit);
  if (!unit) return null;
  return value.kind === "number" ? `${value.value} ${value.value === 1 ? unit.one : unit.other}` : `${value.min}–${value.max} ${unit.other}`;
};

const renderValue = (
  registry: CatalogRegistry,
  spec: ImageSpec,
  attribute: AttributeDefinition,
  value: SelectionValue,
  adapterId: string,
  takenOver: ReadonlySet<string>,
  /** Applicable options already computed for this spec (pass 1); recomputed when absent. */
  active?: OptionDefinition[],
): Rendered | null => {
  switch (value.kind) {
    case "single":
    case "multi": {
      const options = active ?? activeOptions(registry, spec, attribute, value);
      const custom = selectedCustomEntries(value);
      if (options.length === 0 && custom.length === 0) return null; // inactive option: kept, not compiled
      const params = options.map((o) => o.parameterValue).filter((p) => p !== undefined);
      const text = [...options.map((o) => phrase(registry, spec, o, adapterId, takenOver)), ...custom.map(customOutput)].filter(Boolean).join(", ");
      const parameter = value.kind === "single" ? options[0]?.parameterValue : params.length ? params.join(",") : undefined;
      return { text, options, custom, ...(parameter !== undefined ? { parameter } : {}) };
    }
    case "number": {
      const q = quantityText(attribute, value);
      if (q !== null) return { text: q, options: [], custom: [], parameter: value.value };
      if (attribute.type !== "number") return null;
      // The raw number is stored losslessly in the spec; only its EXPRESSION depends on semantics.
      if ((attribute.semantics ?? "physical") === "degree" && attribute.bands) {
        const band = attribute.bands.find((b) => value.value <= b.upTo) ?? attribute.bands[attribute.bands.length - 1]!;
        return { text: band.text, options: [], custom: [], parameter: value.value };
      }
      const unit = attribute.unit ? (attribute.unit === "%" ? "%" : ` ${attribute.unit}`) : "";
      return { text: `${value.value}${unit}`, options: [], custom: [], parameter: value.value };
    }
    case "range": {
      const q = quantityText(attribute, value);
      if (q !== null) return { text: q, options: [], custom: [], parameter: `${value.min}-${value.max}` };
      const unit = attribute.type === "range" && attribute.unit ? ` ${attribute.unit}` : "";
      return { text: `${value.min} to ${value.max}${unit}`, options: [], custom: [], parameter: `${value.min}-${value.max}` };
    }
    case "text":
      return { text: normalizeWhitespace(value.text), options: [], custom: [], parameter: normalizeWhitespace(value.text) };
  }
};

const applyTemplate = (attribute: AttributeDefinition, adapterId: string, text: string): string =>
  // split/join: no regex replacement patterns, so user text like "$&" or "{value}" is inert.
  normalizeWhitespace((attribute.prompt.byAdapter?.[adapterId] ?? attribute.prompt.template).split("{value}").join(text));

/** Options of `option` lineage covering another attribute (child options inherit their parents' coverage). */
const coversOf = (registry: CatalogRegistry, attribute: AttributeDefinition, option: OptionDefinition) => {
  if (attribute.type !== "single" && attribute.type !== "multi") return [];
  return registry.lineage(attribute.id, option.id).flatMap((id) => attribute.options.find((o) => o.id === id)?.covers ?? []);
};

export interface CompileOptions {
  adapter?: PromptAdapter;
  safetyPolicy?: SafetyPolicy;
}

/**
 * PromptCompiler — deterministic, rule-based, no external AI.
 *
 * Pipeline: spec → catalog validation → semantic plan (one fragment per
 * explicitly set, applicable, included attribute; only applicable options;
 * semantic duplicates omitted with provenance) → adapter rendering → SAFETY
 * GATE (over every stored value, output or not) → language notice.
 *
 * Guarantees:
 * - Unset attributes contribute nothing; nothing is invented. Preset
 *   `classification` metadata is never turned into text or selections.
 * - Output depends only on (spec, catalog, adapter, policy, COMPILER_VERSION)
 *   and is independent of object key insertion order.
 * - Values excluded from the prompt or currently inapplicable are still
 *   safety-checked; exclusion never bypasses the policy.
 * - If the safety policy blocks, prompt/fragments/parameters are withheld.
 */
export const compilePrompt = (
  spec: ImageSpec,
  registry: CatalogRegistry,
  adapterOrOptions: PromptAdapter | CompileOptions = {},
): PromptCompilation => {
  const options: CompileOptions = "render" in adapterOrOptions ? { adapter: adapterOrOptions } : adapterOrOptions;
  const adapter = options.adapter ?? genericEnglishAdapter;
  const policy = options.safetyPolicy ?? baselinePolicy;

  // Applicability and policy restrictions are analyzed ONCE per compile and shared with
  // the validator (same spec, same registry → identical results, no repeated work).
  const catalogUsable = spec.catalog.id === registry.id; // otherwise the validator reports spec.catalog_mismatch
  const inactive = catalogUsable ? findInactiveSelections(spec, registry) : [];
  const restricted = catalogUsable ? findRestrictedSelections(spec, registry) : [];
  // Value checks, also computed once (the validator reports them; pass 1 skips invalid values).
  const valueProblems = new Map<string, Diagnostic[]>();
  if (catalogUsable) {
    for (const [id, selection] of Object.entries(spec.selections)) {
      const attribute = registry.getAttribute(id);
      if (attribute) valueProblems.set(id, checkValueForAttribute(attribute, selection.value, `selections.${id}.value`));
    }
  }
  const diagnostics: Diagnostic[] = [...validateSpecAgainstCatalog(spec, registry, catalogUsable ? { inactive, restricted, valueProblems } : undefined)];
  const inactiveAttributes = new Set(inactive.filter((i) => i.scope === "attribute").map((i) => i.attributeId));
  const inactiveOptions = new Map(inactive.filter((i) => i.scope === "option").map((i) => [i.attributeId, i.optionIds] as const));
  const fragments: PromptFragment[] = [];
  const parameters: Record<string, PromptParameterValue> = {};
  const parameterSources: Record<string, string> = {};
  /** Set + valid selections that do not produce a fragment, and why. */
  const hidden = new Map<string, HiddenReason>();
  const covered: NonNullable<PromptCompilation["covered"]> = [];

  // Prompt output order (TD-08): the catalog's explicit `promptOrder`, independent of the UI order.
  // Precomputed by the registry — no sorting here. Covers / takeovers / fragments all follow it.
  const promptOrder = registry.promptAttributes();

  // Pass 1 — which attributes will state their own meaning (set, valid, included, applicable).
  const producing = new Map<string, OptionDefinition[]>();
  const validSet: AttributeDefinition[] = [];
  if (catalogUsable) {
    for (const attribute of promptOrder) {
      const selection = spec.selections[attribute.id];
      if (!selection) continue; // unset → nothing
      if (hasErrors(valueProblems.get(attribute.id) ?? [])) continue; // already reported
      validSet.push(attribute);
      if (attribute.expression?.role === "metadata") {
        hidden.set(attribute.id, "metadata"); // management only: never output
        continue;
      }
      if (selection.excludedFromPrompt) {
        hidden.set(attribute.id, "excluded"); // kept + safety-checked, not output
        continue;
      }
      if (inactiveAttributes.has(attribute.id)) {
        hidden.set(attribute.id, "inactive"); // kept in spec, not compiled
        continue;
      }
      const off = inactiveOptions.get(attribute.id);
      const active = selectedOptionsInOrder(attribute, selection.value).filter((o) => !off?.includes(o.id));
      if ((attribute.type === "single" || attribute.type === "multi") && active.length === 0 && selectedCustomEntries(selection.value).length === 0) {
        hidden.set(attribute.id, "inactive");
        continue;
      }
      producing.set(attribute.id, active);
    }
  }

  // Semantic coverage: an attribute whose (registered) meaning is already stated by
  // another produced option is output once — by the covering attribute (catalog order).
  for (const attribute of promptOrder) {
    const opts = producing.get(attribute.id);
    if (!opts || covered.some((c) => c.attributeId === attribute.id)) continue;
    for (const o of opts) {
      for (const cv of coversOf(registry, attribute, o)) {
        const target = producing.get(cv.attributeId);
        if (!target || target.length === 0 || covered.some((c) => c.attributeId === cv.attributeId)) continue;
        if (selectedCustomEntries(spec.selections[cv.attributeId]?.value).length > 0) continue; // custom wording is never dropped
        const all = target.every((t) => registry.lineage(cv.attributeId, t.id).some((id) => cv.optionIds.includes(id)));
        if (!all) continue;
        covered.push({ attributeId: cv.attributeId, coveredBy: attribute.id, byOptionIds: [o.id] });
      }
    }
  }
  for (const c of covered) {
    producing.delete(c.attributeId);
    hidden.set(c.attributeId, "covered");
  }

  // Pass 2 — fragments. A semantic unit of a preset phrase whose axis is stated by a
  // direct selection is taken over by that selection (output once, direct choice wins).
  for (const attribute of promptOrder) {
    if (!producing.has(attribute.id)) continue;
    const selection = spec.selections[attribute.id]!;
    const takenOver = new Set<string>();
    const takenOverBy: NonNullable<PromptFragment["takenOverBy"]> = [];
    for (const o of producing.get(attribute.id)!) {
      for (const unit of phraseUnits(o.prompt.parts)) {
        const axisOptions = producing.get(unit.axis);
        if (!axisOptions || unit.axis === attribute.id || takenOver.has(unit.axis)) continue;
        takenOver.add(unit.axis);
        const relation = axisOptions.every((x) => unit.values.includes(x.id)) ? "equivalent" : "override";
        takenOverBy.push({ attributeId: unit.axis, relation });
        if (relation === "override") {
          diagnostics.push(
            info("preset.unit_overridden", `"${unit.axis}" (direct selection) replaces the matching part of "${attribute.id}" (${o.id})`, {
              attributeId: unit.axis,
              involves: [attribute.id, unit.axis],
              params: { preset: attribute.id, option: o.id, axis: unit.axis },
            }),
          );
        }
      }
    }

    const rendered = renderValue(registry, spec, attribute, selection.value, adapter.id, takenOver, producing.get(attribute.id));
    if (!rendered || !rendered.text) continue;

    const channel = attribute.prompt.channel ?? "text";
    if (channel !== "text" && attribute.prompt.parameterKey && rendered.parameter !== undefined) {
      parameters[attribute.prompt.parameterKey] = rendered.parameter;
      parameterSources[attribute.prompt.parameterKey] = attribute.id;
    }
    if (channel === "parameter") continue;

    fragments.push({
      attributeId: attribute.id,
      text: applyTemplate(attribute, adapter.id, rendered.text),
      ...(rendered.options.length ? { optionIds: rendered.options.map((o) => o.id) } : {}),
      ...(rendered.custom.length ? { customCount: rendered.custom.length } : {}),
      ...(selection.priority !== undefined ? { priority: selection.priority } : {}),
      ...(takenOverBy.length ? { takenOverBy } : {}),
    });
  }

  const rendered = adapter.render(fragments);
  const age: AgeAssessment = assessAge(spec, registry);

  // Safety gate over EVERY stored value: produced fragments, values that are not output
  // (excluded / inactive / metadata / covered), custom names AND expressions, all
  // selected options' policy tags, structured age signals and the adapter's final output.
  const tags: Array<{ attributeId: string; optionId: string; tag: string }> = [];
  const texts: Array<{ attributeId: string; text: string }> = fragments.map((f) => ({ attributeId: f.attributeId, text: f.text }));
  for (const attribute of validSet) {
    const value = spec.selections[attribute.id]!.value;
    if (attribute.type === "single" || attribute.type === "multi") {
      for (const id of selectedOptionIds(value)) {
        const o = registry.getOption(attribute.id, id);
        for (const tag of o?.policyTags ?? []) tags.push({ attributeId: attribute.id, optionId: id, tag });
      }
    }
    const custom = selectedCustomEntries(value);
    if (custom.length) texts.push({ attributeId: attribute.id, text: custom.map((c) => [c.label, c.expression ?? ""].join("\n")).join("\n") });
    if (hidden.has(attribute.id)) {
      const raw = rawText(attribute, value, spec, registry);
      if (raw) texts.push({ attributeId: attribute.id, text: applyTemplate(attribute, adapter.id, raw) });
    }
  }
  for (const s of age.signals) {
    if (s.signal === "minor") tags.push({ attributeId: s.attributeId, optionId: "$age", tag: "age.minor" });
    if (s.signal === "ambiguous") tags.push({ attributeId: s.attributeId, optionId: "$age", tag: "age.ambiguous_young" });
  }
  // Policy 0.3.0 (TD-15): only the structured assessment can confirm an adult — never words, never a default.
  if (age.ageClass === "adult") {
    const source = age.signals.find((s) => s.signal === "adult")!;
    tags.push({ attributeId: source.attributeId, optionId: "$age", tag: "age.adult_confirmed" });
  }
  texts.push({ attributeId: "$prompt", text: `${rendered.prompt}\n${rendered.negativePrompt}` });
  const safety = evaluateSafety({ tags, texts }, policy);

  for (const finding of safety.findings) {
    const involves = [
      ...new Set(finding.signals.flatMap((s) => s.sources.map((src) => src.attributeId)).filter((id) => id !== "$prompt")),
    ];
    const terms = [...new Set(finding.signals.flatMap((s) => s.sources.map((src) => (src.kind === "text" ? src.term : src.tag))))];
    const hiddenSources = involves.filter((id) => hidden.has(id)).map((id) => `${id}:${hidden.get(id)}`);
    const make = finding.severity === "block" ? error : warning;
    // Where the user resolves it (UI hint): the catalog's age settings for age-dependent rules.
    const resolution = policy.rules.find((r) => r.id === finding.ruleId)?.resolution;
    const model = registry.ageModel;
    const related = resolution === "age" && model ? [model.ageGroupAttributeId, model.apparentAgeAttributeId, model.actualAgeAttributeId] : [];
    diagnostics.push(
      make(`safety.${finding.ruleId}`, `Safety policy "${finding.ruleId}" (${finding.category}) matched: ${terms.join(", ")}`, {
        involves,
        ...(involves[0] ? { attributeId: involves[0] } : {}),
        params: {
          safetyRule: finding.ruleId,
          category: finding.category,
          terms: terms.join(", "),
          ...(hiddenSources.length ? { hiddenSources: hiddenSources.join(",") } : {}),
          ...(related.length ? { relatedAttributes: related.join(",") } : {}),
        },
      }),
    );
  }

  // Policy restrictions (catalog `restriction`): if a restricted option is present
  // (e.g. via import) the whole output is withheld; the spec itself is preserved.
  for (const r of restricted) {
    const attribute = registry.getAttribute(r.attributeId)!;
    const option = attribute.type === "single" || attribute.type === "multi" ? attribute.options.find((o) => o.id === r.optionIds[0]) : undefined;
    diagnostics.push(
      error("policy.restricted_selection", `"${r.attributeId}" has a restricted option (${r.optionIds.join(", ")}); prompt output is withheld`, {
        attributeId: r.attributeId,
        involves: [r.attributeId],
        params: {
          optionIds: r.optionIds.join(","),
          ...(option?.restriction?.policyRuleId ? { policyRuleId: option.restriction.policyRuleId } : {}),
        },
      }),
    );
  }

  const base = { safety, diagnostics, age, ...(covered.length ? { covered } : {}), meta: meta(spec, registry, adapter, policy) };
  if (safety.blocked || restricted.length > 0) {
    return { prompt: "", negativePrompt: "", fragments: [], parameters: {}, parameterSources: {}, blocked: true, ...base };
  }

  if (!adapter.supportsPriority && fragments.some((f) => f.priority !== undefined)) {
    diagnostics.push(info("compiler.priority_unsupported", `Adapter "${adapter.id}" cannot express priorities; they are ignored`));
  }
  for (const f of fragments) {
    const scripts = detectNonLatinScripts(f.text);
    if (scripts.length > 0) {
      diagnostics.push(
        warning("prompt.mixed_language", `"${f.attributeId}" contains non-English text (${scripts.join(", ")}); it is passed through untranslated`, {
          attributeId: f.attributeId,
          params: { scripts: scripts.join(", ") },
        }),
      );
    }
  }
  if (fragments.length === 0 && Object.keys(parameters).length === 0) {
    diagnostics.push(info("compiler.empty", "Nothing is selected yet; the prompt is empty"));
  }

  return { prompt: rendered.prompt, negativePrompt: rendered.negativePrompt, fragments, parameters, parameterSources, blocked: false, ...base };
};

/** Value text for safety checks of values that are not output (all selected options, regardless of applicability). */
const rawText = (attribute: AttributeDefinition, value: SelectionValue, spec: ImageSpec, registry: CatalogRegistry): string => {
  if (attribute.type === "single" || attribute.type === "multi") {
    const ids = selectedOptionIds(value);
    const opts = attribute.options.filter((o) => ids.includes(o.id));
    return [...opts.flatMap((o) => [o.prompt.text, ...(o.prompt.variants ?? []).map((v) => v.text)]), ...selectedCustomEntries(value).map(customOutput)].join(", ");
  }
  return renderValue(registry, spec, attribute, value, "", new Set())?.text ?? "";
};

const meta = (spec: ImageSpec, registry: CatalogRegistry, adapter: PromptAdapter, policy: SafetyPolicy): PromptCompilation["meta"] => ({
  compilerVersion: COMPILER_VERSION,
  adapterId: adapter.id,
  adapterVersion: adapter.version,
  specSchemaVersion: spec.schemaVersion,
  catalogId: registry.id,
  catalogVersion: registry.version,
  safetyPolicyId: policy.id,
  safetyPolicyVersion: policy.version,
});
