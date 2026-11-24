import { describe, expect, it } from "vitest";
import {
  baselinePolicy,
  compilePrompt,
  conditionAttributeIds,
  evaluateSafety,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  isOptionAttribute,
  resetCategory,
  restoreCategoryReset,
  searchCatalog,
  setPromptExclusion,
  type SelectionValue,
} from "@/domain";
import { buildSpec, multi, single, text } from "../fixtures/specs";

/** Sprint 2-B.4 — Person › Body (45 attributes, 7 subcategories). Approved vocabulary reproduced independently. */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const out = (entries: Array<[string, SelectionValue]>) => compilePrompt(buildSpec(core, entries), core);
const prompt = (entries: Array<[string, SelectionValue]>) => out(entries).prompt;
const B = (x: string) => `person.body.${x}`;
const body = core.attributes().filter((a) => a.id.startsWith("person.body."));

const SIZE = ["very small", "small", "medium-sized", "large", "very large"];
const LENGTH = ["very short", "short", "medium length", "long", "very long"];
const NB = ["very narrow", "narrow", "medium width", "broad", "very broad"];
const ST = ["very slender", "slender", "medium thickness", "thick", "very thick"];
const AMOUNT = ["very low", "low", "moderate", "high", "very high"];
const DEV = ["minimal", "slightly developed", "moderately developed", "well-developed", "highly developed"];
const DEF = ["minimal", "subtle", "moderate", "well-defined", "highly defined"];

/** id → [subcategory, template, bands | options] (approval §2–§8) */
const APPROVED: Record<string, [string, string, string[] | Record<string, string>]> = {
  height: ["general", "Height: {value}.", ["very short", "short", "average height", "tall", "very tall"]],
  build: ["general", "Body build: {value}.", { lean: "lean", slender: "slender", average: "average", athletic: "athletic", muscular: "muscular", plump: "plump", heavyset: "heavyset" }],
  frame: ["general", "Skeletal frame: {value}.", SIZE],
  muscle_mass: ["general", "Muscle mass: {value}.", AMOUNT],
  muscle_definition: ["general", "Muscle definition: {value}.", DEF],
  body_fat: ["general", "Body fat: {value}.", AMOUNT],
  silhouette: ["general", "Body silhouette: {value}.", { rectangular: "rectangular", hourglass: "hourglass-shaped", triangular: "triangular", inverted_triangular: "inverted triangular", oval: "oval" }],
  proportions: ["general", "Body proportions: {value}.", { natural: "natural", elongated: "elongated", compact: "compact", exaggerated: "exaggerated", chibi: "chibi" }],
  head_size: ["proportions", "Head size relative to body: {value}.", SIZE],
  heads_tall: ["proportions", "Head-to-body proportions: {value}.", []],
  upper_body_length: ["proportions", "Upper body length: {value}.", LENGTH],
  lower_body_length: ["proportions", "Lower body length: {value}.", LENGTH],
  upper_lower_ratio: ["proportions", "Upper-to-lower body proportion: {value}.", { longer_upper: "longer upper body", balanced: "balanced", longer_lower: "longer lower body" }],
  neck_length: ["neck_shoulders", "Neck length: {value}.", LENGTH],
  neck_thickness: ["neck_shoulders", "Neck thickness: {value}.", ST],
  shoulder_width: ["neck_shoulders", "Shoulder width: {value}.", NB],
  shoulder_slope: ["neck_shoulders", "Shoulder slope: {value}.", { sloping: "sloping", gently_sloping: "gently sloping", nearly_horizontal: "nearly horizontal" }],
  collarbones: ["neck_shoulders", "Collarbones: {value}.", ["barely visible", "slightly visible", "visible", "prominent", "highly prominent"]],
  rib_cage_width: ["torso", "Rib cage width: {value}.", NB],
  chest_volume: ["torso", "Chest volume: {value}.", SIZE],
  pectorals: ["torso", "Pectoral muscles: {value}.", DEV],
  waist_width: ["torso", "Waist width: {value}.", NB],
  waist_curvature: ["torso", "Waist curvature: {value}.", ["minimal", "slight", "moderate", "noticeable", "pronounced"]],
  abdomen: ["torso", "Abdomen: {value}.", { flat: "flat", softly_rounded: "softly rounded", protruding: "protruding" }],
  abs_definition: ["torso", "Abdominal definition: {value}.", DEF],
  back_width: ["torso", "Back width: {value}.", NB],
  back_muscles: ["torso", "Back muscles: {value}.", DEV],
  pelvis_width: ["hips", "Pelvis width: {value}.", NB],
  gluteal_volume: ["hips", "Gluteal volume: {value}.", SIZE],
  gluteal_shape: ["hips", "Gluteal shape: {value}.", { flat: "flat", rounded: "rounded", angular: "angular", gently_contoured: "gently contoured" }],
  waist_hip_contrast: ["hips", "Waist-to-hip contrast: {value}.", AMOUNT],
  arm_length: ["arms_hands", "Arm length: {value}.", LENGTH],
  upper_arm_thickness: ["arms_hands", "Upper arm thickness: {value}.", ST],
  forearm_thickness: ["arms_hands", "Forearm thickness: {value}.", ST],
  arm_muscles: ["arms_hands", "Arm muscles: {value}.", DEV],
  hand_size: ["arms_hands", "Hand size: {value}.", SIZE],
  finger_length: ["arms_hands", "Finger length: {value}.", LENGTH],
  finger_thickness: ["arms_hands", "Finger thickness: {value}.", ST],
  leg_length: ["legs_feet", "Leg length: {value}.", LENGTH],
  thigh_thickness: ["legs_feet", "Thigh thickness: {value}.", ST],
  calf_thickness: ["legs_feet", "Calf thickness: {value}.", ST],
  leg_muscles: ["legs_feet", "Leg muscles: {value}.", DEV],
  ankle_thickness: ["legs_feet", "Ankle thickness: {value}.", ST],
  foot_size: ["legs_feet", "Foot size: {value}.", SIZE],
  leg_alignment: ["legs_feet", "Leg alignment: {value}.", { straight: "straight", naturally_curved: "naturally curved", bow_legged: "bow-legged", knock_kneed: "knock-kneed" }],
};

describe("registration and integrity (45 new, 153 cumulative person attributes)", () => {
  it("registers exactly the approved attributes in 7 subcategories, order 309–353, approved Direct attributes with the output toggle", () => {
    expect(body.map((a) => a.id)).toEqual(Object.keys(APPROVED).map(B));
    expect(body.map((a) => a.order)).toEqual(Array.from({ length: 45 }, (_, i) => 309 + i));
    const per = (s: string) => body.filter((a) => a.categoryId === `person_body_${s}`).length;
    expect(["general", "proportions", "neck_shoulders", "torso", "hips", "arms_hands", "legs_feet"].map(per)).toEqual([8, 5, 5, 9, 4, 7, 7]);
    for (const a of body) {
      const [s, template] = APPROVED[a.id.slice("person.body.".length)]!;
      expect(a.categoryId, a.id).toBe(`person_body_${s}`);
      expect(a.prompt.template, a.id).toBe(template);
      expect(core.isExposed(a, "detailed"), a.id).toBe(true);
      expect(a.expression?.role, a.id).toBe("direct");
      expect(a.outputToggle, a.id).toBe(true);
      expect(a.label.ko && a.label.en && a.aliases?.length, a.id).toBeTruthy();
    }
    expect(core.attributes().filter((a) => a.id.startsWith("person.") && core.isExposed(a, "detailed"))).toHaveLength(153);
  });

  it("shapes keep their approved expressions; relative sizes are 1–5 degree sliders with the approved bands", () => {
    for (const a of body) {
      const vocab = APPROVED[a.id.slice("person.body.".length)]![2];
      if (Array.isArray(vocab)) {
        if (a.id === B("heads_tall")) continue;
        if (a.type !== "number") throw new Error(a.id);
        expect([a.semantics, a.control, a.min, a.max, a.step, a.defaultValue], a.id).toEqual(["degree", "slider", 1, 5, 1, undefined]);
        expect(a.bands!.map((b) => b.text), a.id).toEqual(vocab);
      } else {
        if (!isOptionAttribute(a)) throw new Error(a.id);
        expect(Object.fromEntries(a.options.map((o) => [o.id, o.prompt.text])), a.id).toEqual(vocab);
      }
    }
    expect(body.filter((a) => a.type === "number" && a.semantics === "degree")).toHaveLength(36);
    const withCustom = body.filter((a) => isOptionAttribute(a) && a.custom).map((a) => a.id);
    expect(withCustom).toEqual([B("build"), B("silhouette"), B("proportions"), B("gluteal_shape")]);
  });

  it("every option and band compiles alone to exactly its sentence, with no digits", () => {
    for (const a of body) {
      if (a.id === B("heads_tall")) continue;
      const [, template, vocab] = APPROVED[a.id.slice("person.body.".length)]!;
      const pairs: Array<[SelectionValue, string]> = Array.isArray(vocab) ? vocab.map((t, i) => [num(i + 1), t]) : Object.entries(vocab).map(([id, t]) => [single(id), t]);
      for (const [v, t] of pairs) {
        expect(prompt([[a.id, v]]), `${a.id} ${JSON.stringify(v)}`).toBe(template.replace("{value}", t));
      }
    }
  });

  it("heads tall: a separate number (2–10, half steps) output as written; independent of relative head size", () => {
    const a = core.getAttribute(B("heads_tall"))!;
    expect(a.type === "number" && [a.semantics, a.min, a.max, a.step, a.unit, a.bands]).toEqual(["ratio", 2, 10, 0.5, "heads tall", undefined]);
    expect(prompt([[B("heads_tall"), num(8)]])).toBe("Head-to-body proportions: 8 heads tall.");
    expect(prompt([[B("heads_tall"), num(7.5)]])).toBe("Head-to-body proportions: 7.5 heads tall.");
    expect(prompt([[B("heads_tall"), num(3)], [B("head_size"), num(4)]])).toBe("Head size relative to body: large. Head-to-body proportions: 3 heads tall.");
    for (const bad of [1.5, 10.5]) expect(() => buildSpec(core, [[B("heads_tall"), num(bad)]])).toThrow();
    const spec = buildSpec(core, [[B("heads_tall"), num(6.5)]]);
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections[B("heads_tall")]!.value).toEqual(num(6.5));
  });
});

describe("independence (approval §10)", () => {
  it("no body attribute references identity (gender, age, nationality, ethnicity) or any other attribute; there are no body rules", () => {
    for (const a of body) {
      const refs = (a.appliesWhen ?? []).flatMap(conditionAttributeIds);
      expect(refs, a.id).toEqual(["subject.kind"]);
    }
    expect(core.rules.filter((r) => r.involves.some((id) => id.startsWith("person.body.")))).toEqual([]);
  });

  it("the overall build (or identity) sets no other body value; any combination compiles as chosen", () => {
    const spec = buildSpec(core, [
      ["person.identity.gender", single("woman")],
      ["person.identity.age", { kind: "number", value: 70, unit: "years" }],
      ["person.identity.nationality", { kind: "multi", optionIds: ["jp"] }],
      [B("build"), single("muscular")],
    ]);
    expect(Object.keys(spec.selections).filter((k) => k.startsWith("person.body."))).toEqual([B("build")]);
    // independent axes freely combine (no automatic linkage, no diagnostics)
    const c = out([[B("build"), single("slender")], [B("muscle_mass"), num(5)], [B("body_fat"), num(5)], [B("frame"), num(1)], [B("shoulder_width"), num(5)], [B("pelvis_width"), num(1)], [B("waist_width"), num(1)], [B("waist_curvature"), num(1)]]);
    expect(c.fragments).toHaveLength(8);
    expect(c.diagnostics.filter((d) => d.code.startsWith("rule.") || d.code.startsWith("selection."))).toEqual([]);
  });

  it("no body phrase links the body to expression, personality, attractiveness, health, sexuality or clothing", () => {
    const linked = /\b(sexy|seductive|attractive|beautiful|pretty|ugly|curvy|voluptuous|busty|healthy|unhealthy|obese|fat-shaming|happy|confident|naked|nude|clothed|wearing|pose|posing)\w*/iu;
    for (const a of body) {
      const texts = isOptionAttribute(a) ? a.options.map((o) => o.prompt.text) : a.type === "number" ? (a.bands ?? []).map((b) => b.text) : [];
      for (const t of [...texts, a.prompt.template]) expect(t, a.id).not.toMatch(linked);
    }
  });
});

describe("safety (approval §11): neutral body description, existing policy unchanged", () => {
  it("no body phrase raises a safety signal", () => {
    for (const a of body) {
      const texts = isOptionAttribute(a) ? a.options.map((o) => o.prompt.text) : a.type === "number" ? (a.bands ?? []).map((b) => b.text) : [];
      const report = evaluateSafety({ tags: [], texts: texts.map((t) => ({ attributeId: a.id, text: a.prompt.template.replace("{value}", t) })) }, baselinePolicy);
      expect(report.findings, a.id).toEqual([]);
    }
  });

  it("body selections alone are never treated as sexual intent — also for minors (non-sexual description allowed)", () => {
    const bodySet: Array<[string, SelectionValue]> = [[B("chest_volume"), num(5)], [B("gluteal_volume"), num(5)], [B("waist_hip_contrast"), num(5)], [B("waist_curvature"), num(5)]];
    expect(out([["person.identity.age", { kind: "number", value: 30, unit: "years" }], ...bodySet]).blocked).toBe(false);
    expect(out([["person.identity.age_group", single("child")], ...bodySet]).blocked).toBe(false);
  });

  it("sexualization of a minor is still blocked, including when the age is excluded from the prompt", () => {
    expect(out([["intent.description", text("a sexy pose")], ["person.identity.age_group", single("adolescent")], [B("height"), num(4)]]).blocked).toBe(true);
    let spec = buildSpec(core, [["intent.description", text("a sexy pose")], ["person.identity.apparent_age", { kind: "number", value: 14, unit: "years" }], [B("build"), single("slender")]]);
    spec = setPromptExclusion(spec, "person.identity.apparent_age", true);
    expect(compilePrompt(spec, core).blocked).toBe(true);
  });
});

describe("approval §12 examples and common features", () => {
  it("realistic example (only set values are output)", () => {
    expect(
      prompt([
        [B("height"), num(4)], [B("build"), single("athletic")], [B("frame"), num(3)], [B("muscle_mass"), num(3)], [B("muscle_definition"), num(2)],
        [B("proportions"), single("natural")], [B("heads_tall"), num(8)], [B("shoulder_width"), num(4)], [B("waist_width"), num(2)],
        [B("arm_length"), num(4)], [B("leg_length"), num(4)], [B("hand_size"), num(3)],
      ]),
    ).toBe(
      "Height: tall. Body build: athletic. Skeletal frame: medium-sized. Muscle mass: moderate. Muscle definition: subtle. Body proportions: natural. " +
        "Head-to-body proportions: 8 heads tall. Shoulder width: broad. Waist width: narrow. Arm length: long. Hand size: medium-sized. Leg length: long.", // catalog order: arms & hands before legs
    );
  });

  it("character-style (chibi) example", () => {
    expect(prompt([[B("proportions"), single("chibi")], [B("heads_tall"), num(3)], [B("head_size"), num(4)], [B("arm_length"), num(2)], [B("leg_length"), num(2)], [B("hand_size"), num(2)]])).toBe(
      "Body proportions: chibi. Head size relative to body: large. Head-to-body proportions: 3 heads tall. Arm length: short. Hand size: small. Leg length: short.",
    );
  });

  it("custom build (name + expression), exclusion, JSON round-trip, and category reset/restore across subcategories", () => {
    let spec = buildSpec(core, [
      [B("build"), { kind: "single", custom: { label: "수영 선수 체형", expression: "a swimmer's build with a long torso" } }],
      [B("leg_length"), num(5)],
      [B("shoulder_width"), num(4)],
      ["person.face.shape", single("oval")],
    ]);
    expect(compilePrompt(spec, core).prompt).toBe("Face shape: oval. Body build: a swimmer's build with a long torso. Shoulder width: broad. Leg length: very long.");
    spec = setPromptExclusion(spec, B("leg_length"), true);
    expect(compilePrompt(spec, core).prompt).not.toContain("Leg length");
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
    const { spec: cleared, removed } = resetCategory(spec, core, "person_body");
    expect(Object.keys(removed).sort()).toEqual([B("build"), B("leg_length"), B("shoulder_width")]);
    expect(Object.keys(cleared.selections)).toEqual(["person.face.shape"]);
    expect(restoreCategoryReset(cleared, removed).spec.selections).toEqual(spec.selections);
    expect(Object.keys(resetCategory(spec, core, "person_body_legs_feet").removed)).toEqual([B("leg_length")]);
  });

  it.each([
    ["키", "attribute", B("height")],
    ["체형", "attribute", B("build")],
    ["근육량", "attribute", B("muscle_mass")],
    ["8등신", "attribute", B("heads_tall")],
    ["chibi", "option", B("proportions")],
    ["모래시계", "option", B("silhouette")],
    ["쇄골", "attribute", B("collarbones")],
    ["복근", "attribute", B("abs_definition")],
    ["골반", "attribute", B("pelvis_width")],
    ["O다리", "option", B("leg_alignment")],
    ["shoulders", "attribute", B("shoulder_width")],
  ])("search “%s” finds %s %s", (q, kind, attributeId) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === attributeId)).toBe(true);
  });

  it("unset body attributes add nothing; body subcategories show in the category tree with counts", () => {
    expect(prompt([["subject.kind", single("person")], [B("height"), num(3)]])).toBe("Main subject: a single person. Height: average height.");
    void multi;
  });
});
