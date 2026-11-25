import { compilePrompt, setPromptExclusion, type CatalogRegistry, type ImageSpec, type SafetyPolicy, type SelectionValue } from "@/domain";
import { buildSpec, multi, single, text } from "./specs";

/**
 * Safety policy comparison matrix (Sprint 2-C.3). The SAME cases were compiled with the
 * pre-change code (policy 0.2.0) and recorded in `safety-matrix-0.2.0.json`; the regression
 * test compiles them again and requires every difference to be an approved, listed change.
 *
 * A case = age state × expression (registered option, custom value or free text) × output state.
 */
type Entries = Array<[string, SelectionValue]>;
const P = "person.identity.";
const yrs = (value: number): SelectionValue => ({ kind: "number", value, unit: "years" });
const yrsRange = (min: number, max: number): SelectionValue => ({ kind: "range", min, max, unit: "years" });

export const AGE_STATES: Record<string, Entries> = {
  unknown: [],
  adult_actual: [[P + "age", yrs(30)]],
  adult_group: [[P + "age_group", single("adult")]],
  adult_apparent: [[P + "apparent_age", yrs(35)]],
  minor_actual: [[P + "age", yrs(12)]],
  minor_group: [[P + "age_group", single("adolescent")]],
  ambiguous_range: [[P + "age", yrsRange(15, 25)]],
  conflict_actual_adult_apparent_minor: [[P + "age", yrs(30)], [P + "apparent_age", yrs(15)]],
  nonhuman_elf_actual_300: [[P + "species", single("elf")], [P + "age", yrs(300)]],
  nonhuman_elf_apparent_adult: [[P + "species", single("elf")], [P + "apparent_age", yrs(25)]],
};

const AD = "person.appearance.direction";
const INNER = "person.clothing.innerwear.type";
const intent = (t: string): Entries => [["intent.description", text(t)]];

export const EXPRESSIONS: Record<string, Entries> = {
  none: [],
  // general appearance (registered)
  ad_beautiful: [[AD, multi("beautiful")]],
  ad_handsome: [[AD, multi("handsome")]],
  ad_pretty: [[AD, multi("pretty")]],
  ad_cute: [[AD, multi("cute")]],
  ad_adorable: [[AD, multi("adorable")]],
  ad_attractive_elegant: [[AD, multi("attractive", "elegant")]],
  // sexual appeal (registered, multi-select with general terms, custom)
  ad_sexy: [[AD, multi("sexy")]],
  ad_sexy_with_beautiful: [[AD, multi("beautiful", "sexy")]],
  ad_custom_seductive: [[AD, { kind: "multi", optionIds: [], custom: [{ label: "유혹적인", expression: "seductive" }] }]],
  text_sexy_woman: intent("a sexy woman"),
  text_seductive_pose: intent("a seductive pose"),
  text_ko_sexy: intent("섹시한 여성"),
  text_lingerie: intent("lingerie photoshoot"),
  text_boudoir: intent("boudoir portrait"),
  // general appearance in free text
  text_beautiful_person: intent("a beautiful person"),
  text_cute_child: intent("a cute child"),
  // garments (registered innerwear options, free text, other garments)
  ...Object.fromEntries(["undershirt", "base_layer", "thermal", "camisole", "sports_bra", "everyday_bra", "shapewear", "briefs", "boxer_briefs", "boxer_shorts", "full_coverage"].map((o) => [`inner_${o}`, [[INNER, single(o)]] as Entries])),
  text_underwear: intent("a person in underwear"),
  text_briefs: intent("a man in briefs"),
  text_bra: intent("a woman in a bra"),
  text_sports_bra: intent("a runner in a sports bra and leggings"),
  text_ko_underwear: intent("속옷 차림"),
  text_ko_bra: intent("브래지어"),
  text_ko_panties: intent("팬티"),
  text_swimsuit: intent("a swimsuit at the beach"),
  text_thermal: intent("thermal underwear on a snowy morning"),
  tops_tank: [["person.clothing.tops.type", single("tank_top")]],
  one_piece_slip: [["person.clothing.one_piece.type", single("slip_dress")]],
  // garment + sexual appeal combinations
  inner_bra_plus_ad_sexy: [[INNER, single("everyday_bra")], [AD, multi("sexy")]],
  inner_briefs_plus_text_seductive: [[INNER, single("briefs")], ...intent("a seductive look")],
  text_underwear_sexy: intent("sexy underwear"),
  // always-prohibited content (must stay blocked for every age)
  text_nude: intent("a nude figure"),
  text_explicit: intent("explicit sex scene"),
  text_ko_nudity: intent("알몸"),
  // ambiguous-age wording
  text_girl: intent("a girl"),
  text_sexy_schoolgirl: intent("sexy schoolgirl"),
  impression_youthful: [["person.impression.maturity", single("youthful")]],
  impression_youthful_plus_sexy: [["person.impression.maturity", single("youthful")], [AD, multi("sexy")]],
};

export type MatrixResult = { blocked: boolean; safety: string[]; prompt: boolean };

export const OUTPUT_STATES = ["included", "excluded", "inapplicable"] as const;

const withState = (spec: ImageSpec, state: (typeof OUTPUT_STATES)[number], expression: Entries): ImageSpec => {
  if (state === "excluded") {
    let s = spec;
    for (const [id] of expression) if (id !== "intent.description") s = setPromptExclusion(s, id, true);
    return s;
  }
  return spec;
};

/** All matrix cases: key → spec builder input. `inapplicable` uses a landscape subject (person values kept but not output). */
export const matrixCases = (): Array<{ key: string; entries: Entries; state: (typeof OUTPUT_STATES)[number]; expression: Entries }> => {
  const out: Array<{ key: string; entries: Entries; state: (typeof OUTPUT_STATES)[number]; expression: Entries }> = [];
  for (const [ageKey, age] of Object.entries(AGE_STATES)) {
    for (const [exprKey, expr] of Object.entries(EXPRESSIONS)) {
      for (const state of OUTPUT_STATES) {
        if (state !== "included" && (expr.length === 0 || expr.every(([id]) => id === "intent.description"))) continue; // free text has no exclusion state
        const subject: Entries = [["subject.kind", single(state === "inapplicable" ? "landscape" : "person")]];
        out.push({ key: `${ageKey}|${exprKey}|${state}`, entries: [...subject, ...age, ...expr], state, expression: expr });
      }
    }
  }
  return out;
};

export const evaluateCase = (registry: CatalogRegistry, c: ReturnType<typeof matrixCases>[number], policy?: SafetyPolicy): MatrixResult => {
  const spec = withState(buildSpec(registry, c.entries), c.state, c.expression);
  const r = compilePrompt(spec, registry, policy ? { safetyPolicy: policy } : {});
  return {
    blocked: r.blocked,
    safety: [...new Set(r.diagnostics.filter((d) => d.code.startsWith("safety.")).map((d) => d.code.slice(7)))].sort(),
    prompt: r.prompt !== "",
  };
};
