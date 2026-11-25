import type { CatalogRegistry } from "../catalog/registry";
import type { AttributeDefinition } from "../catalog/schema";
import type { AttributeSelection, ImageSpec } from "../spec/schema";
import { selectedCustomEntries, selectedOptionIds } from "../spec/values";
import { genericEnglishAdapter } from "./adapters/generic";
import type { PromptAdapter, PromptCompilation, PromptFragment } from "./types";

/**
 * Prompt detail (Sprint 2-D.7, ADR-069) — how much of a compiled design the prompt TEXT states.
 *
 * - `full`: the compiler's output, unchanged (the existing behaviour and the default for existing projects).
 * - `balanced`: core attributes plus meaningful details; incidental random fine details are left out.
 * - `compact`: core attributes first.
 *
 * A view over one compilation: the ImageSpec is never changed, nothing is reworded or invented (kept
 * fragments are exactly the compiler's sentences, in the same order), there is no fixed attribute cap,
 * and every omission is listed with its reason. Safety is NOT re-evaluated here: the full-spec result of
 * the compilation applies to every detail level — a blocked compilation stays blocked, and leaving a
 * value out of the text never lifts a hold.
 */
export const PROMPT_DETAILS = ["compact", "balanced", "full"] as const;
export type PromptDetail = (typeof PROMPT_DETAILS)[number];

/** 1 = core, 2 = meaningful detail, 3 = fine detail. */
export type Importance = 1 | 2 | 3;

/** Core attributes beyond the Basic tier (Basic-tier attributes are always core). */
const CORE = new Set([
  "person.identity.entity_type",
  "person.identity.species",
  "person.identity.age_group",
  "person.identity.age",
  "person.identity.apparent_age",
  "person.identity.gender",
  "person.hair.presence",
  "person.hair.length",
  "person.hair.primary_color",
  "person.hair.style",
  "person.eyes.iris_color",
  "person.skin.tone",
  "person.body.build",
  "person.expression.emotion",
  "person.clothing.fashion_style",
  "person.clothing.tops.type",
  "person.clothing.bottoms.type",
  "person.clothing.one_piece.type",
  "person.clothing.outerwear.type",
  "person.pose.posture",
  "person.pose.action",
]);

/** Fine details: precise sub-settings that refine a meaningful attribute. Numbers are fine by default. */
const FINE = [
  /\.secondary_color$/,
  /\.details$/,
  /_placement$/,
  /^person\.clothing\.[a-z_]+\.(fit|neckline|collar|sleeve_style|length|waist_rise|leg_cut|hem_length|waist_design|skirt_silhouette|closure_state|closure_type|hood|heel_height|heel_type|toe_shape|closure|opacity)$/,
  /^person\.accessories\.(frame_shape|frame_color|hat_color)$/,
  /^person\.body\.(?!build$|proportions$)/,
  /^person\.(eyes\.depth|lips\.(ratio|cupids_bow)|nose\.(tip_shape|bridge_shape)|eyebrows\.color)$/,
  /^person\.skin\.(undertone|texture|sheen|hydration)$/,
  /^person\.hair\.(part|hairline|layering|flyaways|movement|bangs_length|tie_position)$/,
  /^person\.facial_hair\.(grooming|texture)$/,
  /^person\.pose\.(torso_rotation|torso_lean|weight_shift|balance|head_tilt|chin|elbows|knees|feet|phase|speed)$/,
  /^person\.expression\.(teeth|brow_movement|mouth_openness)$/,
  /^person\.makeup\.(base_coverage|base_finish|mascara|false_lashes|lip_finish|contour|eyeliner_color)$/,
  /^camera\.(roll|projection|focus_target|bokeh)$/,
  /^lighting\.(fill|rim|rim_color|ambient|reflected|source_visibility)$/,
];

/**
 * How central an attribute is to the image. Catalog-driven defaults keep future attributes working:
 * Basic tier → core; numbers → fine; any other attribute → meaningful detail (unless listed above).
 */
export const attributeImportance = (a: AttributeDefinition): Importance => {
  if (a.tier === "basic" || CORE.has(a.id)) return 1;
  if (a.type === "number" || a.type === "range" || FINE.some((re) => re.test(a.id))) return 3;
  return 2;
};

/** Who chose a value: the user (or an import), a recommended concept, or the Random Composer. */
export type ValueOwner = "user" | "concept" | "random";
export const RANDOM_PRESET_ID = "random_composer";
export const valueOwner = (s: AttributeSelection): ValueOwner =>
  s.source === "preset" ? (s.origin?.presetId === RANDOM_PRESET_ID ? "random" : "concept") : "user";

/** The highest importance level (1 = core only) kept per owner; user values are kept longest. */
const KEEP: Record<Exclude<PromptDetail, "full">, Record<ValueOwner, Importance>> = {
  balanced: { user: 3, concept: 3, random: 2 },
  compact: { user: 2, concept: 2, random: 1 },
};

export type OmitReason = "detail" | "none" | "duplicate";
export interface PromptView extends PromptCompilation {
  detail: PromptDetail;
  /** Fragments of the full compilation left out of this view, with why (empty for `full`). */
  omitted: Array<{ attributeId: string; reason: OmitReason; text: string }>;
  /** Fragments of the full compilation (for counts). */
  fullFragmentCount: number;
}

/** A random value that only states absence ("none") adds nothing a model needs. */
const isNoneOnly = (s: AttributeSelection) => {
  const ids = selectedOptionIds(s.value);
  return ids.length > 0 && ids.every((id) => id === "none") && selectedCustomEntries(s.value).length === 0;
};

/** `x.secondary_color` that repeats `x.primary_color`. */
const repeatsPrimary = (spec: ImageSpec, id: string): boolean => {
  if (!id.endsWith(".secondary_color")) return false;
  const primary = spec.selections[id.replace(/secondary_color$/, "primary_color")];
  const own = spec.selections[id];
  return Boolean(primary && own && !primary.excludedFromPrompt && JSON.stringify(primary.value) === JSON.stringify(own.value));
};

/** The prompt as seen at one detail level (see module doc). `full` returns the compilation unchanged. */
export const viewPrompt = (
  compilation: PromptCompilation,
  spec: ImageSpec,
  registry: CatalogRegistry,
  detail: PromptDetail,
  adapter: PromptAdapter = genericEnglishAdapter,
): PromptView => {
  const base = { ...compilation, detail, omitted: [], fullFragmentCount: compilation.fragments.length };
  if (detail === "full" || compilation.blocked) return base;
  const keep = KEEP[detail];
  const kept: PromptFragment[] = [];
  const omitted: PromptView["omitted"] = [];
  const seen = new Set<string>();
  for (const f of compilation.fragments) {
    const a = registry.getAttribute(f.attributeId);
    const s = spec.selections[f.attributeId];
    if (!a || !s) {
      kept.push(f);
      continue;
    }
    const owner = valueOwner(s);
    const text = f.text.trim().toLowerCase();
    let reason: OmitReason | null = null;
    if (seen.has(text) || repeatsPrimary(spec, f.attributeId)) reason = "duplicate";
    else if (owner === "random" && isNoneOnly(s)) reason = "none";
    else if (attributeImportance(a) > keep[owner]) reason = "detail";
    if (reason) omitted.push({ attributeId: f.attributeId, reason, text: f.text });
    else {
      kept.push(f);
      seen.add(text);
    }
  }
  if (omitted.length === 0) return base;
  const rendered = adapter.render(kept);
  return { ...base, prompt: rendered.prompt, negativePrompt: rendered.negativePrompt, fragments: kept, omitted };
};
