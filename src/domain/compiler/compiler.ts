import { isAttributeActive, isOptionActive } from "../catalog/applicability";
import type { CatalogRegistry } from "../catalog/registry";
import type { AttributeDefinition, OptionDefinition } from "../catalog/schema";
import { checkValueForAttribute } from "../catalog/valueCheck";
import { baselinePolicy } from "../safety/baselinePolicy";
import { evaluateSafety } from "../safety/evaluate";
import type { SafetyPolicy } from "../safety/types";
import { error, hasErrors, info, warning, type Diagnostic } from "../shared/diagnostics";
import type { ImageSpec } from "../spec/schema";
import type { SelectionValue } from "../spec/values";
import { validateSpecAgainstCatalog } from "../validation/specValidator";
import { genericEnglishAdapter } from "./adapters/generic";
import { detectNonLatinScripts } from "./language";
import type { PromptAdapter, PromptCompilation, PromptFragment, PromptParameterValue } from "./types";

/** Bump when the compiler's output for an unchanged spec can change. */
export const COMPILER_VERSION = "0.2.0";

/** Collapse whitespace for prompt output. The stored spec is never modified. */
export const normalizeWhitespace = (text: string): string => text.replace(/\s+/gu, " ").trim();

const phrase = (option: OptionDefinition, adapterId: string): string =>
  option.prompt.byAdapter?.[adapterId] ?? option.prompt.text;

interface Rendered {
  text: string;
  /** Applicable options that contributed (option attributes only). */
  options: OptionDefinition[];
  parameter?: PromptParameterValue;
}

const renderValue = (
  registry: CatalogRegistry,
  spec: ImageSpec,
  attribute: AttributeDefinition,
  value: SelectionValue,
  adapterId: string,
): Rendered | null => {
  switch (value.kind) {
    case "single": {
      if (attribute.type !== "single") return null;
      const option = attribute.options.find((o) => o.id === value.optionId);
      if (!option || !isOptionActive(registry, option, spec)) return null; // inactive option: kept, not compiled
      return { text: phrase(option, adapterId), options: [option], ...(option.parameterValue !== undefined ? { parameter: option.parameterValue } : {}) };
    }
    case "multi": {
      if (attribute.type !== "multi") return null;
      // Catalog order, not click order: the same set always yields the same text.
      const options = attribute.options.filter((o) => value.optionIds.includes(o.id) && isOptionActive(registry, o, spec));
      if (options.length === 0) return null;
      const params = options.map((o) => o.parameterValue).filter((p) => p !== undefined);
      return { text: options.map((o) => phrase(o, adapterId)).join(", "), options, ...(params.length ? { parameter: params.join(",") } : {}) };
    }
    case "number": {
      const unit = attribute.type === "number" && attribute.unit ? ` ${attribute.unit}` : "";
      return { text: `${value.value}${unit}`, options: [], parameter: value.value };
    }
    case "range": {
      const unit = attribute.type === "range" && attribute.unit ? ` ${attribute.unit}` : "";
      return { text: `${value.min} to ${value.max}${unit}`, options: [], parameter: `${value.min}-${value.max}` };
    }
    case "text":
      return { text: normalizeWhitespace(value.text), options: [], parameter: normalizeWhitespace(value.text) };
  }
};

export interface CompileOptions {
  adapter?: PromptAdapter;
  safetyPolicy?: SafetyPolicy;
}

/**
 * PromptCompiler — deterministic, rule-based, no external AI.
 *
 * Pipeline: spec → catalog validation → semantic plan (one fragment per
 * explicitly set & applicable attribute; only applicable options) →
 * adapter rendering → SAFETY GATE → language notice.
 *
 * Guarantees:
 * - Unset attributes contribute nothing; nothing is invented. Preset
 *   `classification` metadata is never turned into text or selections.
 * - Output depends only on (spec, catalog, adapter, policy, COMPILER_VERSION)
 *   and is independent of object key insertion order.
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

  const diagnostics: Diagnostic[] = [...validateSpecAgainstCatalog(spec, registry)];
  const fragments: PromptFragment[] = [];
  const parameters: Record<string, PromptParameterValue> = {};
  const parameterSources: Record<string, string> = {};
  const tags: Array<{ attributeId: string; optionId: string; tag: string }> = [];
  const catalogUsable = !diagnostics.some((d) => d.code === "spec.catalog_mismatch");

  if (catalogUsable) {
    for (const attribute of registry.attributes()) {
      const selection = spec.selections[attribute.id];
      if (!selection) continue; // unset → nothing
      if (!isAttributeActive(registry, attribute, spec)) continue; // kept in spec, not compiled
      if (hasErrors(checkValueForAttribute(attribute, selection.value, ""))) continue; // already reported

      const rendered = renderValue(registry, spec, attribute, selection.value, adapter.id);
      if (!rendered || !rendered.text) continue;
      for (const o of rendered.options) for (const tag of o.policyTags ?? []) tags.push({ attributeId: attribute.id, optionId: o.id, tag });

      const channel = attribute.prompt.channel ?? "text";
      if (channel !== "text" && attribute.prompt.parameterKey && rendered.parameter !== undefined) {
        parameters[attribute.prompt.parameterKey] = rendered.parameter;
        parameterSources[attribute.prompt.parameterKey] = attribute.id;
      }
      if (channel === "parameter") continue;

      const template = attribute.prompt.byAdapter?.[adapter.id] ?? attribute.prompt.template;
      // split/join: no regex replacement patterns, so user text like "$&" or "{value}" is inert.
      const text = normalizeWhitespace(template.split("{value}").join(rendered.text));
      fragments.push({
        attributeId: attribute.id,
        text,
        ...(rendered.options.length ? { optionIds: rendered.options.map((o) => o.id) } : {}),
        ...(selection.priority !== undefined ? { priority: selection.priority } : {}),
      });
    }
  }

  const rendered = adapter.render(fragments);

  // Safety gate: structured tags + every fragment + the adapter's final output.
  const safety = evaluateSafety(
    {
      tags,
      texts: [
        ...fragments.map((f) => ({ attributeId: f.attributeId, text: f.text })),
        { attributeId: "$prompt", text: `${rendered.prompt}\n${rendered.negativePrompt}` },
      ],
    },
    policy,
  );
  for (const finding of safety.findings) {
    const involves = [
      ...new Set(finding.signals.flatMap((s) => s.sources.map((src) => src.attributeId)).filter((id) => id !== "$prompt")),
    ];
    const terms = [...new Set(finding.signals.flatMap((s) => s.sources.map((src) => (src.kind === "text" ? src.term : src.tag))))];
    const make = finding.severity === "block" ? error : warning;
    diagnostics.push(
      make(`safety.${finding.ruleId}`, `Safety policy "${finding.ruleId}" (${finding.category}) matched: ${terms.join(", ")}`, {
        involves,
        ...(involves[0] ? { attributeId: involves[0] } : {}),
        params: { safetyRule: finding.ruleId, category: finding.category, terms: terms.join(", ") },
      }),
    );
  }

  if (safety.blocked) {
    return {
      prompt: "",
      negativePrompt: "",
      fragments: [],
      parameters: {},
      parameterSources: {},
      blocked: true,
      safety,
      diagnostics,
      meta: meta(spec, registry, adapter, policy),
    };
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

  return {
    prompt: rendered.prompt,
    negativePrompt: rendered.negativePrompt,
    fragments,
    parameters,
    parameterSources,
    blocked: false,
    safety,
    diagnostics,
    meta: meta(spec, registry, adapter, policy),
  };
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
