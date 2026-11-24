import type { Diagnostic } from "../shared/diagnostics";
import type { ImageSpec } from "../spec/schema";
import { evaluateAll } from "./conditions";
import type { CatalogRegistry } from "./registry";
import type { AttributeDefinition, CategoryDefinition, Tier } from "./schema";
import { normalizeSearch } from "./search";

export interface CategoryNode {
  category: CategoryDefinition;
  depth: number;
  children: CategoryNode[];
  /** Attributes in THIS category that are editable in the mode (approved + tier). */
  attributes: AttributeDefinition[];
  /** Category chain approved for the product UI. */
  approved: boolean;
  /** Category chain applicable to the current spec (e.g. person areas for person subjects). */
  applicable: boolean;
  /** Set attributes in this subtree (editable ones only). */
  setCount: number;
  /** Distinct warnings/notices concerning attributes in this subtree. */
  warningCount: number;
  /** Safety or policy blocks concerning attributes in this subtree. */
  blocked: boolean;
}

const concerns = (d: Diagnostic, ids: ReadonlySet<string>) =>
  (d.attributeId !== undefined && ids.has(d.attributeId)) || (d.involves ?? []).some((id) => ids.has(id));

const isWarning = (d: Diagnostic) =>
  d.severity === "warning" || d.code === "selection.inactive" || d.code === "selection.option_inactive" || d.code === "selection.restricted";
const isBlock = (d: Diagnostic) => d.code.startsWith("safety.") || d.code.startsWith("policy.");

/**
 * Detailed navigation derived entirely from catalog data: hierarchy, labels,
 * approval, applicability, per-subtree counts and badges. Deterministic.
 */
export const buildCategoryTree = (
  registry: CatalogRegistry,
  spec: ImageSpec,
  diagnostics: readonly Diagnostic[],
  mode: Tier = "detailed",
): CategoryNode[] => {
  const build = (parentId: string | undefined, depth: number, parentApplicable: boolean): CategoryNode[] =>
    registry.categories
      .filter((c) => c.parentId === parentId)
      .map((category) => {
        const applicable = parentApplicable && evaluateAll(category.appliesWhen, spec, registry);
        const children = build(category.id, depth + 1, applicable);
        const attributes = registry.attributes().filter((a) => a.categoryId === category.id && registry.isExposed(a, mode));
        const subtreeIds = new Set<string>([...attributes.map((a) => a.id), ...children.flatMap((c) => [...collectIds(c)])]);
        const relevant = diagnostics.filter((d) => concerns(d, subtreeIds));
        return {
          category,
          depth,
          children,
          attributes,
          approved: registry.isCategoryApproved(category.id),
          applicable,
          setCount: [...subtreeIds].filter((id) => id in spec.selections).length,
          warningCount: relevant.filter((d) => isWarning(d) && !isBlock(d)).length,
          blocked: relevant.some(isBlock),
        };
      });
  return build(undefined, 0, true);
};

function collectIds(node: CategoryNode): Set<string> {
  const ids = new Set(node.attributes.map((a) => a.id));
  for (const c of node.children) for (const id of collectIds(c)) ids.add(id);
  return ids;
}

export const flattenCategoryTree = (nodes: readonly CategoryNode[]): CategoryNode[] => nodes.flatMap((n) => [n, ...flattenCategoryTree(n.children)]);

export interface CatalogSearchHit {
  kind: "category" | "attribute" | "option";
  categoryId: string;
  attributeId?: string;
  optionId?: string;
  score: number;
}

const scoreTexts = (tokens: string[], texts: Array<{ text: string; weight: number }>): number => {
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const { text, weight } of texts) {
      const t = normalizeSearch(text);
      if (!t) continue;
      const s = t === token ? 100 : t.startsWith(token) ? 80 : t.includes(token) ? 60 : 0;
      if (s > 0) best = Math.max(best, s + weight);
    }
    if (best <= 0) return 0;
    total += best;
  }
  return total;
};

/**
 * Catalog-wide search for Detailed navigation: category names, editable
 * attributes (labels, aliases, descriptions) and their options (labels,
 * aliases, descriptions), in every locale. Tokens are ANDed. No result limit.
 * Draft categories are findable (they explain their status); their
 * non-approved attributes are not.
 */
export const searchCatalog = (registry: CatalogRegistry, query: string, mode: Tier = "detailed"): CatalogSearchHit[] => {
  const tokens = query.normalize("NFKC").split(/\s+/u).map(normalizeSearch).filter(Boolean);
  if (tokens.length === 0) return [];
  const hits: Array<CatalogSearchHit & { order: number }> = [];
  let order = 0;
  for (const c of registry.categories) {
    const score = scoreTexts(tokens, [
      ...Object.values(c.label).map((text) => ({ text, weight: 0 })),
      ...Object.values(c.description ?? {}).map((text) => ({ text, weight: -40 })),
    ]);
    if (score > 0) hits.push({ kind: "category", categoryId: c.id, score, order: order++ });
  }
  for (const a of registry.exposedAttributes(mode)) {
    if (!a.categoryId) continue;
    const score = scoreTexts(tokens, [
      ...Object.values(a.label).map((text) => ({ text, weight: 0 })),
      ...(a.aliases ?? []).map((text) => ({ text, weight: -5 })),
      { text: a.id, weight: -10 },
      ...Object.values(a.description ?? {}).map((text) => ({ text, weight: -40 })),
    ]);
    if (score > 0) hits.push({ kind: "attribute", categoryId: a.categoryId, attributeId: a.id, score, order: order++ });
    if (a.type !== "single" && a.type !== "multi") continue;
    for (const o of a.options) {
      const os = scoreTexts(tokens, [
        ...Object.values(o.label).map((text) => ({ text, weight: -2 })),
        ...(o.aliases ?? []).map((text) => ({ text, weight: -7 })),
        ...Object.values(o.description ?? {}).map((text) => ({ text, weight: -42 })),
      ]);
      if (os > 0) hits.push({ kind: "option", categoryId: a.categoryId, attributeId: a.id, optionId: o.id, score: os, order: order++ });
    }
  }
  return hits
    .sort((x, y) => y.score - x.score || x.order - y.order)
    .map((h) => ({
      kind: h.kind,
      categoryId: h.categoryId,
      score: h.score,
      ...(h.attributeId !== undefined ? { attributeId: h.attributeId } : {}),
      ...(h.optionId !== undefined ? { optionId: h.optionId } : {}),
    }));
};
