import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CatalogRegistry,
  compilePrompt,
  exportPromptText,
  exportSpecJson,
  getCoreRegistry,
  getPromptOutput,
  importSpecJson,
  planPreset,
  resetCategory,
  restoreCategoryReset,
  setPromptExclusion,
  undoPresetTransaction,
  applyPresetPlan,
  type SelectionValue,
} from "@/domain";
import { buildFixtureCatalog } from "@/testing/fixtureCatalog";
import { baselinePolicy020 } from "../fixtures/baselinePolicy-0.2.0";
import { AGE_STATES, evaluateCase, matrixCases, type MatrixResult } from "../fixtures/safetyMatrix";
import { buildSpec, multi, single, text } from "../fixtures/specs";

/**
 * Sprint 2-C.3 — safety policy prompter.baseline 0.2.0 → 0.3.0 (TD-12, TD-15) and appearance-direction
 * scope (TD-14). The comparison matrix (10 age states × 49 expressions × output states = 1,010 cases)
 * was compiled with the pre-change code and recorded in tests/fixtures/safety-matrix-0.2.0.json.
 */
const core = getCoreRegistry();
const old = JSON.parse(readFileSync(new URL("../fixtures/safety-matrix-0.2.0.json", import.meta.url), "utf8")) as Record<string, MatrixResult>;
const AD = "person.appearance.direction";
const P = "person.identity.";
const yrs = (value: number): SelectionValue => ({ kind: "number", value, unit: "years" });
type Entries = Array<[string, SelectionValue]>;
const safetyCodes = (entries: Entries) =>
  compilePrompt(buildSpec(core, entries), core)
    .diagnostics.filter((d) => d.code.startsWith("safety."))
    .map((d) => d.code.slice(7));

describe("policy 0.2.0 → 0.3.0: every difference is an approved change; nothing was relaxed", () => {
  const cases = matrixCases();
  const now = new Map(cases.map((c) => [c.key, evaluateCase(core, c)]));
  const diffs = cases.filter((c) => JSON.stringify(now.get(c.key)) !== JSON.stringify(old[c.key]));
  const NOT_ADULT = ["unknown", "nonhuman_elf_actual_300"]; // the age assessment is “unknown” (actual age alone proves adulthood only for humans)
  const MINORISH = ["minor_actual", "minor_group", "ambiguous_range", "conflict_actual_adult_apparent_minor"];

  it("the recorded matrix is complete and the copied 0.2.0 policy reproduces it with today's code (differences come from the policy only)", () => {
    expect(cases).toHaveLength(Object.keys(old).length);
    const mismatch = cases.filter((c) => JSON.stringify(evaluateCase(core, c, baselinePolicy020)) !== JSON.stringify(old[c.key])).map((c) => c.key);
    expect(mismatch).toEqual([]);
  });

  it("no case that was blocked is now permitted (no prohibition relaxed)", () => {
    expect(cases.filter((c) => old[c.key]!.blocked && !now.get(c.key)!.blocked).map((c) => c.key)).toEqual([]);
  });

  it("170 differences (840 unchanged of 1,010) in exactly three approved classes", () => {
    expect([cases.length, diffs.length, cases.length - diffs.length]).toEqual([1010, 170, 840]);
    const classes = { withheldAgeUnknown: 0, minorIntimateNew: 0, minorRuleRenamed: 0 };
    const unexpected: string[] = [];
    for (const c of diffs) {
      const [age] = c.key.split("|");
      const o = old[c.key]!;
      const n = now.get(c.key)!;
      if (!o.blocked && n.blocked && n.safety.join() === "appeal-age-unconfirmed" && NOT_ADULT.includes(age!)) classes.withheldAgeUnknown++;
      else if (!o.blocked && n.blocked && n.safety.join() === "minor-intimate-apparel" && MINORISH.includes(age!)) classes.minorIntimateNew++;
      else if (o.blocked && n.blocked && o.safety.join() === "minor-sexualization" && n.safety.join() === "minor-intimate-apparel") classes.minorRuleRenamed++;
      else unexpected.push(`${c.key}: ${JSON.stringify(o)} → ${JSON.stringify(n)}`);
    }
    expect(unexpected).toEqual([]);
    // TD-15: sexual appeal (registered, custom, free text, with garments) without a confirmed adult age → withheld
    // TD-12: briefs / boxers / shapewear with a minor now blocked like underwear / bras (consistency)
    // TD-12: underwear / bra / thermal with a minor stay blocked, now under the garment rule instead of “sexual wording”
    expect(classes).toEqual({ withheldAgeUnknown: 42, minorIntimateNew: 52, minorRuleRenamed: 76 });
  });

  it("unchanged: nudity and explicit content are blocked for every age (incl. adults), in every output state", () => {
    for (const c of cases.filter((x) => /\|text_(nude|explicit|ko_nudity)\|/.test(x.key))) {
      expect(now.get(c.key)!.blocked, c.key).toBe(true);
      expect(now.get(c.key), c.key).toEqual(old[c.key]);
    }
  });

  it("unchanged: general appearance words and non-intimate garments never block, for any age", () => {
    for (const c of cases.filter((x) => /\|(ad_(beautiful|handsome|pretty|cute|adorable|attractive_elegant)|text_(beautiful_person|cute_child|swimsuit)|tops_tank|one_piece_slip|inner_(undershirt|base_layer|camisole))\|/.test(x.key))) {
      expect(now.get(c.key)!.blocked, c.key).toBe(false);
      expect(now.get(c.key), c.key).toEqual(old[c.key]);
    }
  });
});

describe("TD-15 age matrix for sexual appeal (registered option, custom value, free text)", () => {
  const EXPRESSIONS: Record<string, Entries> = {
    option: [[AD, multi("sexy")]],
    custom: [[AD, { kind: "multi", optionIds: [], custom: [{ label: "유혹적인", expression: "seductive" }] }]],
    text: [["intent.description", text("a sensual portrait")]],
  };
  const EXPECTED: Record<string, string[]> = {
    unknown: ["appeal-age-unconfirmed"],
    adult_actual: [],
    adult_group: [],
    adult_apparent: [],
    minor_actual: ["minor-sexualization"],
    minor_group: ["minor-sexualization"],
    ambiguous_range: ["minor-sexualization"],
    conflict_actual_adult_apparent_minor: ["minor-sexualization"], // minor-first protection: an adult actual age does not offset it
    nonhuman_elf_actual_300: ["appeal-age-unconfirmed"], // actual age alone proves adulthood only for humans (existing rule)
    nonhuman_elf_apparent_adult: [],
  };
  it.each(Object.keys(AGE_STATES))("%s", (age) => {
    for (const [kind, expr] of Object.entries(EXPRESSIONS)) {
      expect(safetyCodes([["subject.kind", single("person")], ...AGE_STATES[age]!, ...expr]), `${age}/${kind}`).toEqual(EXPECTED[age]);
    }
  });

  it("the age assessment itself is unchanged and never inferred from appearance, gender, nationality or body", () => {
    for (const extra of [[AD, multi("beautiful", "sexy")], ["person.identity.gender", single("woman")], ["person.identity.nationality", multi("kr")], ["person.body.build", single("athletic")]] as Entries) {
      expect(compilePrompt(buildSpec(core, [extra]), core).age.ageClass).toBe("unknown");
    }
  });

  it("guidance names the age settings; nothing is set automatically", () => {
    const spec = buildSpec(core, [[AD, multi("sexy")]]);
    const c = compilePrompt(spec, core);
    const d = c.diagnostics.find((x) => x.code === "safety.appeal-age-unconfirmed")!;
    expect(d.severity).toBe("error");
    expect(d.involves).toEqual([AD]);
    expect(d.params?.relatedAttributes).toBe(`${P}age_group,${P}apparent_age,${P}age`);
    expect(Object.keys(spec.selections)).toEqual([AD]);
  });
});

describe("no bypass: every output path, exclusion, applicability, reset/restore, presets, JSON", () => {
  const sexyUnknown = (): Entries => [["subject.kind", single("person")], [AD, multi("sexy")]];

  it("every compiled output path is withheld (prompt, fragments, parameters, copy/display output, .txt export)", () => {
    const c = compilePrompt(buildSpec(core, [...sexyUnknown(), ["output.aspect_ratio", single("square")]]), core);
    expect([c.blocked, c.prompt, c.fragments, c.parameters]).toEqual([true, "", [], {}]);
    expect(getPromptOutput(c).ok).toBe(false);
    expect(exportPromptText(c)).toBeNull();
  });

  it("excluding the expression from the prompt or making it inapplicable does not release it", () => {
    const excluded = setPromptExclusion(buildSpec(core, sexyUnknown()), AD, true);
    expect(safetyCodes([])).toEqual([]);
    expect(compilePrompt(excluded, core).blocked).toBe(true);
    const inapplicable = buildSpec(core, [["subject.kind", single("landscape")], [AD, multi("sexy")]]);
    expect(compilePrompt(inapplicable, core).diagnostics.map((d) => d.code)).toContain("safety.appeal-age-unconfirmed");
  });

  it("category reset / restore of the age follows the current state; restoring re-applies the same check", () => {
    const adult = buildSpec(core, [...sexyUnknown(), [P + "age", yrs(30)]]);
    expect(compilePrompt(adult, core).blocked).toBe(false);
    const { spec: noAge, removed } = resetCategory(adult, core, "person_identity");
    expect(compilePrompt(noAge, core).blocked).toBe(true); // the adult age is gone → withheld
    expect(compilePrompt(restoreCategoryReset(noAge, removed).spec, core).blocked).toBe(false);
    const { spec: noAppearance, removed: r2 } = resetCategory(buildSpec(core, sexyUnknown()), core, "person_expression");
    expect(compilePrompt(noAppearance, core).blocked).toBe(false);
    expect(compilePrompt(restoreCategoryReset(noAppearance, r2).spec, core).blocked).toBe(true); // restoring cannot skip the check
  });

  it("presets: applying an alluring preset without an adult age is withheld; undo returns to the previous result; a confirmed adult allows it", () => {
    const fx = CatalogRegistry.createOrThrow(buildFixtureCatalog());
    const base = buildSpec(fx, [["subject.kind", single("person")]]);
    const plan = planPreset(base, fx, "p_alluring_look");
    if (!plan.ok) throw new Error("plan");
    const { spec, transaction } = applyPresetPlan(base, fx, plan.value, "all");
    expect(compilePrompt(spec, fx).diagnostics.map((d) => d.code)).toContain("safety.appeal-age-unconfirmed");
    expect(compilePrompt(undoPresetTransaction(spec, transaction).spec, fx).blocked).toBe(false);
    const adultBase = buildSpec(fx, [["subject.kind", single("person")], ["x.identity.age_group", single("adult")]]);
    const adultPlan = planPreset(adultBase, fx, "p_alluring_look");
    if (!adultPlan.ok) throw new Error("plan");
    expect(compilePrompt(applyPresetPlan(adultBase, fx, adultPlan.value, "all").spec, fx).blocked).toBe(false);
  });

  it("a spec saved before 0.3.0 imports losslessly (values and IDs unchanged); only its safety result changes", () => {
    const before = buildSpec(core, sexyUnknown());
    const legacy = JSON.parse(exportSpecJson(before));
    legacy.catalog.version = "0.11.0";
    const r = importSpecJson(JSON.stringify(legacy), core);
    expect(r.status).toBe("valid");
    if (r.status !== "valid") return;
    expect(r.spec.selections).toEqual(before.selections);
    expect(r.migrations).toEqual([]);
    expect(compilePrompt(r.spec, core).blocked).toBe(true);
  });
});

describe("TD-12: intimate apparel is a classification, applied the same to registered and free-text garments", () => {
  it("adults and unknown age: neutral; with sexual appeal: needs an adult; a minor: blocked — the same for registered options and text", () => {
    const registered: Entries = [["person.clothing.innerwear.type", single("briefs")]];
    const textual: Entries = [["intent.description", text("a model in briefs")]];
    for (const garment of [registered, textual]) {
      expect(safetyCodes(garment)).toEqual([]);
      expect(safetyCodes([[P + "age", yrs(30)], ...garment])).toEqual([]);
      expect(safetyCodes([[P + "age", yrs(14)], ...garment])).toEqual(["minor-intimate-apparel"]);
      expect(safetyCodes([...garment, ["person.expression.emotion", multi("happy")], [AD, multi("sexy")]])).toEqual(["appeal-age-unconfirmed"]);
      expect(safetyCodes([[P + "age", yrs(30)], ...garment, [AD, multi("sexy")]])).toEqual([]);
    }
  });

  it("garment classification never infers exposure: “none”, coverage and fit stay non-signals (unchanged)", () => {
    const c = compilePrompt(buildSpec(core, [[P + "age_group", single("child")], ["person.clothing.tops.type", single("none")], ["person.clothing.coverage", single("minimal")]]), core);
    expect(c.blocked).toBe(false);
  });

  it("the same principle for every gender: the result does not depend on gender", () => {
    for (const g of ["woman", "man", "nonbinary"]) {
      expect(safetyCodes([["person.identity.gender", single(g)], ["person.clothing.innerwear.type", single("boxer_shorts")]]), g).toEqual([]);
      expect(safetyCodes([["person.identity.gender", single(g)], [AD, multi("sexy")]]), g).toEqual(["appeal-age-unconfirmed"]);
      expect(safetyCodes([["person.identity.gender", single(g)], [P + "age", yrs(12)], ["person.clothing.innerwear.type", single("everyday_bra")]]), g).toEqual(["minor-intimate-apparel"]);
    }
  });
});
