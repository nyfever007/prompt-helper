import { isAttributeActive, isOptionActive, isOptionRestricted } from "../catalog/applicability";
import type { CatalogRegistry } from "../catalog/registry";
import type { AttributeDefinition, OptionDefinition } from "../catalog/schema";
import { compilePrompt } from "../compiler/compiler";
import type { PresetTransaction } from "../presets/presets";
import { applySelection } from "../spec/operations";
import type { AttributeSelection, ImageSpec, SelectionOrigin } from "../spec/schema";
import type { SelectionValue } from "../spec/values";

/**
 * Random Composer (Sprint 2-D.6, ADR-068) — fills every APPLICABLE, UNSET attribute of the whole catalog
 * with a random valid value, so a complete image design can start from nothing.
 *
 * - Catalog-driven: every approved attribute exposed in Basic or Detailed takes part, including ones added
 *   later; values come only from registered options (active, not restricted) or the valid number range.
 *   Free text and custom values are never generated. No AI, no network.
 * - Ownership: a value the user set (or imported), a value from a recommended concept, and anything the
 *   user excluded from the prompt are never changed. Values from an earlier random run are regenerated.
 *   Random values are ordinary preset-sourced selections with the reserved origin `random_composer` — the
 *   storage format is unchanged; a direct edit turns a value into the user's (existing provenance rule).
 * - Order: the subject first (a person when unset), then everything in catalog order against the spec
 *   built so far, so a value only appears where it applies; anything that stopped applying is dropped.
 * - Safety: the composition policy below never generates sexual-appeal wording, minors' ages, real
 *   people or innerwear; then the existing safety policy is checked and generated values that cause a
 *   hold are removed (at most 3 rounds — never an unbounded retry). User values are never touched, so a
 *   hold caused by the user's own choices keeps the existing blocked state and guidance.
 * - Creative combinations are allowed: non-blocking conflict notices stay as they are.
 */
export const RANDOM_ORIGIN: SelectionOrigin = { presetId: "random_composer", presetVersion: "1.0.0" };
export const isRandomSelection = (s: AttributeSelection | undefined): boolean => s?.source === "preset" && s.origin?.presetId === RANDOM_ORIGIN.presetId;

/** Composition policy: options never generated (the user can still choose them). */
const NEVER: Record<string, readonly string[]> = {
  "person.appearance.direction": ["sexy"],
  "person.identity.character_origin": ["real", "historical"],
  "person.identity.age_group": ["newborn", "infant", "toddler", "preschool", "child", "adolescent"],
  "person.clothing.tops.type": ["none"],
  "person.clothing.bottoms.type": ["none"],
  "person.clothing.one_piece.type": ["none"],
  "person.clothing.coverage": ["minimal", "light"],
};
/** Attributes never generated: exact ages (an adult age group is generated instead) and innerwear. */
const SKIP = (id: string) => id === "person.identity.age" || id === "person.identity.apparent_age" || id.startsWith("person.clothing.innerwear.");
const AGE_IDS = ["person.identity.age", "person.identity.apparent_age", "person.identity.age_group"];
const ONE_PIECE = "person.clothing.one_piece.";
const SEPARATES = ["person.clothing.tops.", "person.clothing.bottoms."];

/** Small deterministic PRNG (mulberry32) — same seed, same composition. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface RandomComposition {
  /** Generated values (attribute id → value), in catalog order. */
  patches: Array<{ attributeId: string; value: SelectionValue }>;
  /** Earlier random values that are not generated again (removed). */
  stale: string[];
  /** Generated values removed by the safety check. */
  safetyDropped: string[];
}

const owned = (s: AttributeSelection | undefined) => s !== undefined && (!isRandomSelection(s) || Boolean(s.excludedFromPrompt));

const pickOptions = (a: AttributeDefinition & { options: OptionDefinition[] }, spec: ImageSpec, registry: CatalogRegistry, rand: () => number): string[] | null => {
  const never = NEVER[a.id] ?? [];
  const pool = a.options.filter((o) => !never.includes(o.id) && isOptionActive(registry, o, spec) && !isOptionRestricted(registry, o, spec));
  if (pool.length === 0) return null;
  // "none"-like choices stay possible but less likely than a real choice
  const weight = (o: OptionDefinition) => (o.id === "none" ? 0.3 : 1);
  const pickOne = (from: OptionDefinition[]) => {
    const total = from.reduce((s, o) => s + weight(o), 0);
    let r = rand() * total;
    for (const o of from) if ((r -= weight(o)) <= 0) return o;
    return from[from.length - 1]!;
  };
  if (a.type === "single") return [pickOne(pool).id];
  const r = rand();
  const k = Math.min(pool.length, r < 0.6 ? 1 : r < 0.9 ? 2 : 3);
  const chosen: OptionDefinition[] = [pickOne(pool)];
  const rest = pool.filter((o) => o.id !== chosen[0]!.id && o.id !== "none");
  while (chosen.length < k && rest.length && chosen[0]!.id !== "none") chosen.push(rest.splice(Math.floor(rand() * rest.length), 1)[0]!);
  return chosen.map((o) => o.id);
};

const generate = (a: AttributeDefinition, spec: ImageSpec, registry: CatalogRegistry, rand: () => number): SelectionValue | null => {
  if (a.type === "single" || a.type === "multi") {
    const ids = pickOptions(a, spec, registry, rand);
    if (!ids) return null;
    return a.type === "single" ? { kind: "single", optionId: ids[0]! } : { kind: "multi", optionIds: ids };
  }
  if (a.type === "number") {
    const step = a.step ?? 1;
    const n = Math.floor((a.max - a.min) / step);
    return { kind: "number", value: Math.round((a.min + Math.floor(rand() * (n + 1)) * step) * 1000) / 1000 };
  }
  if (a.type === "quantity") {
    // only bounded quantities have a valid random range
    const min = a.min ?? 0;
    if (a.max === undefined) return null;
    const unit = a.units[0]!.id;
    return { kind: "number", value: Math.round(min + rand() * (a.max - min)), unit };
  }
  return null; // free text: no generated candidates
};

/** What a random run would write. Never changes the spec. */
export const composeRandom = (spec: ImageSpec, registry: CatalogRegistry, seed: number): RandomComposition => {
  const rand = rng(seed);
  const stale = Object.keys(spec.selections).filter((id) => !owned(spec.selections[id]));
  // the working spec: everything the user (or a concept) owns, without earlier random values
  const base: ImageSpec = { ...spec, selections: Object.fromEntries(Object.entries(spec.selections).filter(([, s]) => owned(s))) };
  let work = base;
  const patches = new Map<string, SelectionValue>();
  const put = (id: string, value: SelectionValue) => {
    const r = applySelection(work, registry, id, value, "preset", RANDOM_ORIGIN);
    if (r.ok) {
      work = r.value;
      patches.set(id, value);
    }
  };
  // subject first: an unset subject starts as one person (the first random design is person-centred)
  if (!base.selections["subject.kind"]) put("subject.kind", { kind: "single", optionId: "person" });
  const ownsAny = (prefixes: string[]) => Object.keys(base.selections).some((id) => prefixes.some((p) => id.startsWith(p)));
  const onePiece = ownsAny([ONE_PIECE]) ? true : ownsAny(SEPARATES) ? false : rand() < 0.25;
  const ageOwned = AGE_IDS.some((id) => base.selections[id]);
  for (const a of registry.attributes()) {
    if (a.status !== "approved" || base.selections[a.id] || patches.has(a.id)) continue;
    if (!registry.isExposed(a, "basic") && !registry.isExposed(a, "detailed")) continue;
    if (SKIP(a.id) || (a.id === "person.identity.age_group" && ageOwned)) continue;
    if (onePiece ? SEPARATES.some((p) => a.id.startsWith(p)) : a.id.startsWith(ONE_PIECE)) continue;
    if (!isAttributeActive(registry, a, work)) continue;
    const v = generate(a, work, registry, rand);
    if (v) put(a.id, v);
  }
  // drop generated values that a later choice made inapplicable (e.g. hair details after “bald”)
  const settle = () => {
    for (const id of [...patches.keys()]) {
      const a = registry.getAttribute(id)!;
      if (!isAttributeActive(registry, a, work)) remove(id);
    }
  };
  const remove = (id: string) => {
    patches.delete(id);
    work = { ...work, selections: without(work.selections, id) };
  };
  settle();
  // safety: remove generated values that the existing policy holds (bounded)
  const safetyDropped: string[] = [];
  for (let round = 0; round < 3; round++) {
    const c = compilePrompt(work, registry);
    if (!c.blocked) break;
    const culprits = new Set<string>();
    for (const f of c.safety.findings) if (f.severity === "block") for (const s of f.signals) for (const src of s.sources) culprits.add(src.attributeId);
    for (const d of c.diagnostics) if (d.severity === "error" && d.attributeId) culprits.add(d.attributeId);
    // text found only in the final prompt: blame the generated fragments that contain it
    const terms = c.safety.findings.flatMap((f) => f.signals.flatMap((s) => s.sources.filter((x) => x.kind === "text" && x.attributeId === "$prompt").map((x) => (x.kind === "text" ? x.term : ""))));
    const generated = [...culprits].filter((id) => patches.has(id));
    if (terms.length) for (const [id] of patches) if (terms.some((t) => describeFragment(registry, work, id).includes(t))) generated.push(id);
    if (generated.length === 0) break; // the hold comes from the user's own values: keep the existing behaviour
    for (const id of new Set(generated)) {
      remove(id);
      safetyDropped.push(id);
    }
    settle();
  }
  return {
    patches: [...patches.entries()].map(([attributeId, value]) => ({ attributeId, value })),
    stale: stale.filter((id) => !patches.has(id)),
    safetyDropped,
  };
};
const without = (selections: ImageSpec["selections"], id: string): ImageSpec["selections"] => Object.fromEntries(Object.entries(selections).filter(([k]) => k !== id));
const describeFragment = (registry: CatalogRegistry, spec: ImageSpec, id: string): string =>
  compilePrompt({ ...spec, selections: { [id]: spec.selections[id]! } }, registry).prompt.toLowerCase();

/**
 * Apply a random composition: remove earlier random values that were not regenerated, write the new ones
 * (origin `random_composer`). The returned transaction undoes the whole run with the existing preset undo
 * (a removed value is a change without `after`); user edits made afterwards are protected as usual.
 */
export const applyRandomComposition = (spec: ImageSpec, registry: CatalogRegistry, composition: RandomComposition): { spec: ImageSpec; transaction: PresetTransaction } => {
  let next = spec;
  const changes: PresetTransaction["changes"] = [];
  for (const id of composition.stale) {
    const before = spec.selections[id];
    if (!before) continue;
    next = { ...next, selections: without(next.selections, id) };
    changes.push({ attributeId: id, before });
  }
  for (const p of composition.patches) {
    const r = applySelection(next, registry, p.attributeId, p.value, "preset", RANDOM_ORIGIN);
    if (!r.ok) continue;
    next = r.value;
    const before = spec.selections[p.attributeId];
    changes.push({ attributeId: p.attributeId, ...(before ? { before } : {}), after: next.selections[p.attributeId]! });
  }
  return { spec: next, transaction: { presetId: RANDOM_ORIGIN.presetId, presetVersion: RANDOM_ORIGIN.presetVersion, mode: "keepUser", changes, userEdited: [] } };
};
