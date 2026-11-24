import { findRestrictedSelections, isAttributeActive, isOptionActive } from "../catalog/applicability";
import { evaluateAll } from "../catalog/conditions";
import type { CatalogRegistry } from "../catalog/registry";
import type { PresetDefinition } from "../catalog/schema";
import { error, fail, ok, type Diagnostic, type Result } from "../shared/diagnostics";
import { applySelection } from "../spec/operations";
import type { AttributeSelection, ImageSpec, SelectionOrigin } from "../spec/schema";
import { customKey, selectedOptionIds, type SelectionValue } from "../spec/values";
import { validateSpecAgainstCatalog } from "../validation/specValidator";

export type PresetEntryKind = "new" | "change" | "same" | "inapplicable" | "restricted";

export interface PresetPlanEntry {
  attributeId: string;
  kind: PresetEntryKind;
  current?: AttributeSelection;
  next: AttributeSelection;
}

/** What applying a preset WOULD do. Computing it never changes the spec. */
export interface PresetPlan {
  preset: PresetDefinition;
  origin: SelectionOrigin;
  /** Preset-level `appliesWhen` against the current spec. */
  presetApplicable: boolean;
  /** In catalog attribute order (deterministic). */
  entries: PresetPlanEntry[];
  /** Explicit selections the preset does not touch (they stay exactly as they are). */
  untouched: string[];
  /** Rule diagnostics that would newly appear after applying everything applicable. */
  conflictsAfter: Diagnostic[];
  /** True when applying "all" would overwrite an existing explicit value. */
  requiresOverwriteConfirmation: boolean;
}

/**
 * Session-only record of the LAST preset application (for undo). Undo is
 * decided by `userEdited` (any direct edit after the preset), never by
 * comparing values — a user who changes a value and changes it back still
 * owns it.
 */
export interface PresetTransaction {
  presetId: string;
  presetVersion: string;
  mode: "all" | "onlyEmpty";
  changes: Array<{ attributeId: string; before?: AttributeSelection; after: AttributeSelection }>;
  userEdited: string[];
}

const sameValue = (a: SelectionValue, b: SelectionValue): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === "multi" && b.kind === "multi") {
    const ca = (a.custom ?? []).map((c) => JSON.stringify([customKey(c.label), c.label, c.expression ?? null])).sort();
    const cb = (b.custom ?? []).map((c) => JSON.stringify([customKey(c.label), c.label, c.expression ?? null])).sort();
    return (
      a.optionIds.length === b.optionIds.length &&
      a.optionIds.every((id) => b.optionIds.includes(id)) &&
      ca.length === cb.length &&
      ca.every((x, i) => x === cb[i])
    );
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

const writeAll = (spec: ImageSpec, registry: CatalogRegistry, entries: PresetPlanEntry[], origin: SelectionOrigin): ImageSpec =>
  entries.reduce((acc, e) => {
    const r = applySelection(acc, registry, e.attributeId, e.next.value, "preset", origin);
    return r.ok ? r.value : acc;
  }, spec);

export const planPreset = (spec: ImageSpec, registry: CatalogRegistry, presetId: string): Result<PresetPlan> => {
  const preset = registry.getPreset(presetId);
  if (!preset) return fail([error("preset.unknown", `Unknown preset "${presetId}"`)]);
  const origin: SelectionOrigin = { presetId: preset.id, presetVersion: preset.version };
  const order = new Map(registry.attributes().map((a, i) => [a.id, i]));
  const patches = [...preset.patches].sort((a, b) => (order.get(a.attributeId) ?? 0) - (order.get(b.attributeId) ?? 0));

  const draft: PresetPlanEntry[] = patches.map((p) => {
    const current = spec.selections[p.attributeId];
    const next: AttributeSelection = {
      value: p.value,
      source: "preset",
      origin,
      ...(current?.priority !== undefined ? { priority: current.priority } : {}),
    };
    const kind: PresetEntryKind = !current ? "new" : sameValue(current.value, p.value) ? "same" : "change";
    return { attributeId: p.attributeId, kind, ...(current ? { current } : {}), next };
  });

  // Applicability/restriction are judged in the context the preset itself creates.
  const simulated = writeAll(spec, registry, draft.filter((e) => e.kind !== "same"), origin);
  const restricted = new Set(findRestrictedSelections(simulated, registry).map((r) => r.attributeId));
  const entries = draft.map((e) => {
    const attribute = registry.getAttribute(e.attributeId)!;
    const value = e.next.value;
    const optionIds = selectedOptionIds(value);
    const optionsActive =
      attribute.type !== "single" && attribute.type !== "multi"
        ? true
        : optionIds.every((id) => {
            const o = attribute.options.find((x) => x.id === id);
            return o !== undefined && isOptionActive(registry, o, simulated);
          });
    if (e.kind !== "same" && restricted.has(e.attributeId) && optionIds.length) return { ...e, kind: "restricted" as const };
    if (e.kind !== "same" && (!isAttributeActive(registry, attribute, simulated) || !optionsActive)) return { ...e, kind: "inapplicable" as const };
    return e;
  });

  const appliedAll = writeAll(spec, registry, entries.filter((e) => e.kind === "new" || e.kind === "change"), origin);
  const ruleIds = (s: ImageSpec) => new Set(validateSpecAgainstCatalog(s, registry).filter((d) => d.ruleId).map((d) => d.ruleId));
  const before = ruleIds(spec);
  const conflictsAfter = validateSpecAgainstCatalog(appliedAll, registry).filter((d) => d.ruleId && !before.has(d.ruleId));
  const patched = new Set(patches.map((p) => p.attributeId));

  return ok({
    preset,
    origin,
    presetApplicable: evaluateAll(preset.appliesWhen, spec, registry),
    entries,
    untouched: Object.keys(spec.selections)
      .filter((id) => !patched.has(id))
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)),
    conflictsAfter,
    requiresOverwriteConfirmation: entries.some((e) => e.kind === "change"),
  });
};

/**
 * Apply a plan. `all` writes new + changed entries (the UI must have obtained
 * overwrite confirmation when `requiresOverwriteConfirmation`); `onlyEmpty`
 * writes only attributes that are currently unset. Inapplicable, restricted
 * and unchanged entries are never written; unrelated attributes are never touched.
 */
export const applyPresetPlan = (
  spec: ImageSpec,
  registry: CatalogRegistry,
  plan: PresetPlan,
  mode: "all" | "onlyEmpty",
): { spec: ImageSpec; transaction: PresetTransaction } => {
  const writable = plan.entries.filter((e) => e.kind === "new" || (mode === "all" && e.kind === "change"));
  let next = spec;
  const changes: PresetTransaction["changes"] = [];
  for (const e of writable) {
    const r = applySelection(next, registry, e.attributeId, e.next.value, "preset", plan.origin);
    if (!r.ok) continue;
    next = r.value;
    const before = spec.selections[e.attributeId];
    changes.push({ attributeId: e.attributeId, ...(before ? { before } : {}), after: next.selections[e.attributeId]! });
  }
  return {
    spec: next,
    transaction: { presetId: plan.preset.id, presetVersion: plan.preset.version, mode, changes, userEdited: [] },
  };
};

/** Record a direct user edit after a preset application (protects it from undo). */
export const markUserEdited = (tx: PresetTransaction, attributeId: string): PresetTransaction =>
  tx.changes.some((c) => c.attributeId === attributeId) && !tx.userEdited.includes(attributeId)
    ? { ...tx, userEdited: [...tx.userEdited, attributeId] }
    : tx;

/**
 * Undo the last preset application: restore ONLY attributes the preset changed
 * that the user has not edited since (and that still hold exactly what the
 * preset wrote). Everything else — user edits, unrelated attributes — stays.
 */
export const undoPresetTransaction = (
  spec: ImageSpec,
  tx: PresetTransaction,
): { spec: ImageSpec; restored: string[]; kept: string[] } => {
  const selections = { ...spec.selections };
  const restored: string[] = [];
  const kept: string[] = [];
  for (const c of tx.changes) {
    if (tx.userEdited.includes(c.attributeId) || spec.selections[c.attributeId] !== c.after) {
      kept.push(c.attributeId);
      continue;
    }
    if (c.before) selections[c.attributeId] = c.before;
    else delete selections[c.attributeId];
    restored.push(c.attributeId);
  }
  return { spec: restored.length ? { ...spec, selections } : spec, restored, kept };
};
