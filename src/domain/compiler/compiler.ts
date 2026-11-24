import { evaluateAll } from "../catalog/conditions";
import type { CatalogRegistry } from "../catalog/registry";
import type { AttributeDefinition, OptionDefinition } from "../catalog/schema";
import { checkValueForAttribute } from "../catalog/valueCheck";
import { hasErrors, info, type Diagnostic } from "../shared/diagnostics";
import type { ImageSpec } from "../spec/schema";
import type { SelectionValue } from "../spec/values";
import { validateSpecAgainstCatalog } from "../validation/specValidator";
import { genericEnglishAdapter } from "./adapters/generic";
import type { PromptAdapter, PromptCompilation, PromptFragment } from "./types";

/** Bump when the compiler's output for an unchanged spec can change. */
export const COMPILER_VERSION = "0.1.0";

/** Collapse whitespace for prompt output. The stored spec is never modified. */
export const normalizeWhitespace = (text: string): string => text.replace(/\s+/gu, " ").trim();

const phrase = (option: OptionDefinition, adapterId: string): string =>
  option.prompt.byAdapter?.[adapterId] ?? option.prompt.text;

const renderValue = (attribute: AttributeDefinition, value: SelectionValue, adapterId: string): string => {
  switch (value.kind) {
    case "single": {
      const options = attribute.type === "single" ? attribute.options : [];
      const option = options.find((o) => o.id === value.optionId);
      return option ? phrase(option, adapterId) : "";
    }
    case "multi": {
      // Catalog order, not click order: the same set always yields the same text.
      const options = attribute.type === "multi" ? attribute.options : [];
      return options
        .filter((o) => value.optionIds.includes(o.id))
        .map((o) => phrase(o, adapterId))
        .join(", ");
    }
    case "number": {
      const unit = attribute.type === "number" && attribute.unit ? ` ${attribute.unit}` : "";
      return `${value.value}${unit}`;
    }
    case "range": {
      const unit = attribute.type === "range" && attribute.unit ? ` ${attribute.unit}` : "";
      return `${value.min} to ${value.max}${unit}`;
    }
    case "text":
      return normalizeWhitespace(value.text);
  }
};

/**
 * PromptCompiler — deterministic, rule-based, no external AI.
 *
 * Pipeline: spec → catalog validation → ordered semantic plan (fragments,
 * one per explicitly set & applicable attribute) → adapter rendering.
 *
 * Guarantees:
 * - Unset attributes contribute nothing; nothing is invented.
 * - Output depends only on (spec, catalog, adapter, COMPILER_VERSION) and is
 *   independent of object key insertion order.
 */
export const compilePrompt = (
  spec: ImageSpec,
  registry: CatalogRegistry,
  adapter: PromptAdapter = genericEnglishAdapter,
): PromptCompilation => {
  const diagnostics: Diagnostic[] = [...validateSpecAgainstCatalog(spec, registry)];
  const fragments: PromptFragment[] = [];
  const catalogUsable = !diagnostics.some((d) => d.code === "spec.catalog_mismatch");

  if (catalogUsable) {
    for (const attribute of registry.attributes()) {
      const selection = spec.selections[attribute.id];
      if (!selection) continue; // unset → nothing
      if (!evaluateAll(attribute.appliesWhen, spec)) continue; // kept in spec, not compiled
      if (hasErrors(checkValueForAttribute(attribute, selection.value, ""))) continue; // already reported

      const valueText = renderValue(attribute, selection.value, adapter.id);
      if (!valueText) continue;
      const template = attribute.prompt.byAdapter?.[adapter.id] ?? attribute.prompt.template;
      // split/join: no regex replacement patterns, so user text like "$&" or "{value}" is inert.
      const text = normalizeWhitespace(template.split("{value}").join(valueText));
      fragments.push({
        attributeId: attribute.id,
        text,
        ...(selection.priority !== undefined ? { priority: selection.priority } : {}),
      });
    }
  }

  if (!adapter.supportsPriority && fragments.some((f) => f.priority !== undefined)) {
    diagnostics.push(
      info("compiler.priority_unsupported", `Adapter "${adapter.id}" cannot express priorities; they are ignored`),
    );
  }
  if (fragments.length === 0) {
    diagnostics.push(info("compiler.empty", "Nothing is selected yet; the prompt is empty"));
  }

  const { prompt, negativePrompt } = adapter.render(fragments);
  return {
    prompt,
    negativePrompt,
    fragments,
    diagnostics,
    meta: {
      compilerVersion: COMPILER_VERSION,
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      specSchemaVersion: spec.schemaVersion,
      catalogId: registry.id,
      catalogVersion: registry.version,
    },
  };
};
