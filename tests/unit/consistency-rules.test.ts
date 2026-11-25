import { describe, expect, it } from "vitest";
import { CatalogRegistry, compilePrompt, evaluateCondition, getCoreRegistry, setPromptExclusion, type SelectionValue } from "@/domain";
import { consistencyRules } from "@/domain/catalog/catalogs/consistency-rules";
import { cloneCore } from "../fixtures/catalogs";
import { buildSpec, multi, single } from "../fixtures/specs";

/** Sprint 2-C.2 (TD-10) — contradiction / convention diagnostics, incl. choice ↔ slider (`numberIn`). */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
type Entries = Array<[string, SelectionValue]>;
const ruleCodes = (entries: Entries) =>
  compilePrompt(buildSpec(core, entries), core)
    .diagnostics.filter((d) => d.code.startsWith("rule."))
    .map((d) => d.code.slice(5));

/** [rule, firing settings, representative settings that must NOT fire]. */
const CASES: Array<[string, Entries, Entries[]]> = [
  ["face-round-shape-vs-long-length", [["person.face.shape", single("round")], ["person.face.length", num(4)]], [[["person.face.shape", single("round")]], [["person.face.shape", single("round")], ["person.face.length", num(3)]], [["person.face.shape", single("oval")], ["person.face.length", num(5)]]]],
  ["face-rectangular-shape-vs-short-length", [["person.face.shape", single("rectangular")], ["person.face.length", num(1)]], [[["person.face.shape", single("rectangular")], ["person.face.length", num(4)]]]],
  ["eyes-round-shape-vs-low-height", [["person.eyes.shape", single("round")], ["person.eyes.height", num(2)]], [[["person.eyes.shape", single("round")], ["person.eyes.height", num(3)]], [["person.eyes.shape", single("almond")], ["person.eyes.height", num(1)]]]],
  ["eyes-elongated-shape-vs-narrow-width", [["person.eyes.shape", single("elongated")], ["person.eyes.width", num(1)]], [[["person.eyes.shape", single("elongated")], ["person.eyes.width", num(5)]], [["person.eyes.shape", single("elongated")], ["person.eyes.size", num(1)]]]],
  ["nose-upturned-shape-vs-downward-tip", [["person.nose.shape", single("upturned")], ["person.nose.tip_angle", num(1)]], [[["person.nose.shape", single("upturned")], ["person.nose.tip_angle", num(3)]], [["person.nose.shape", single("button")], ["person.nose.tip_angle", num(1)]]]],
  ["lips-thin-shape-vs-full-thickness", [["person.lips.shape", multi("thin")], ["person.lips.upper_thickness", num(4)], ["person.lips.lower_thickness", num(5)]], [[["person.lips.shape", multi("thin")], ["person.lips.lower_thickness", num(5)]], [["person.lips.shape", multi("thin")], ["person.lips.upper_thickness", num(2)], ["person.lips.lower_thickness", num(5)]]]],
  ["lips-full-shape-vs-thin-thickness", [["person.lips.shape", multi("full", "heart")], ["person.lips.upper_thickness", num(1)], ["person.lips.lower_thickness", num(2)]], [[["person.lips.shape", multi("full")], ["person.lips.upper_thickness", num(1)], ["person.lips.lower_thickness", num(3)]]]],
  ["lips-upper-dominant-vs-thickness", [["person.lips.ratio", single("upper_dominant")], ["person.lips.upper_thickness", num(2)], ["person.lips.lower_thickness", num(4)]], [[["person.lips.ratio", single("upper_dominant")], ["person.lips.upper_thickness", num(4)], ["person.lips.lower_thickness", num(2)]]]],
  ["lips-lower-dominant-vs-thickness", [["person.lips.ratio", single("lower_dominant")], ["person.lips.lower_thickness", num(1)], ["person.lips.upper_thickness", num(5)]], [[["person.lips.ratio", single("lower_dominant")], ["person.lips.lower_thickness", num(4)]]]],
  ["body-muscular-build-vs-low-muscle-mass", [["person.body.build", single("muscular")], ["person.body.muscle_mass", num(2)]], [[["person.body.build", single("muscular")], ["person.body.muscle_mass", num(3)]], [["person.body.build", single("athletic")], ["person.body.muscle_mass", num(1)]]]],
  ["body-plump-build-vs-low-body-fat", [["person.body.build", single("plump")], ["person.body.body_fat", num(1)]], [[["person.body.build", single("plump")], ["person.body.body_fat", num(4)]]]],
  ["body-slender-build-vs-high-body-fat", [["person.body.build", single("slender")], ["person.body.body_fat", num(4)]], [[["person.body.build", single("slender")], ["person.body.muscle_mass", num(5)]]]],
  ["body-hourglass-vs-low-waist-hip-contrast", [["person.body.silhouette", single("hourglass")], ["person.body.waist_hip_contrast", num(2)]], [[["person.body.silhouette", single("hourglass")], ["person.body.waist_hip_contrast", num(4)]]]],
  ["body-chibi-vs-tall-head-ratio", [["person.body.proportions", single("chibi")], ["person.body.heads_tall", num(6.5)]], [[["person.body.proportions", single("chibi")], ["person.body.heads_tall", num(2.5)]], [["person.body.proportions", single("elongated")], ["person.body.heads_tall", num(9)]]]],
  ["expression-neutral-with-other-emotions", [["person.expression.emotion", multi("neutral", "happy")]], [[["person.expression.emotion", multi("happy", "excited")]], [["person.expression.emotion", multi("neutral")]]]],
  ["expression-neutral-vs-strong-intensity", [["person.expression.emotion", multi("neutral")], ["person.expression.emotion_intensity", num(5)]], [[["person.expression.emotion", multi("neutral")], ["person.expression.emotion_intensity", num(2)]], [["person.expression.emotion", multi("angry")], ["person.expression.emotion_intensity", num(5)]]]],
  ["expression-closed-mouth-vs-open-mouth-smile", [["person.expression.mouth_openness", single("closed")], ["person.expression.smile", multi("open_mouth")]], [[["person.expression.mouth_openness", single("closed")], ["person.expression.smile", multi("closed_mouth")]]]],
  ["camera-wide-aperture-vs-deep-dof", [["camera.aperture", single("f_1_8")], ["camera.depth_of_field", num(5)]], [[["camera.aperture", single("f_1_8")], ["camera.depth_of_field", num(1)]], [["camera.aperture", single("f_8")], ["camera.depth_of_field", num(5)]]]],
  ["camera-narrow-aperture-vs-shallow-dof", [["camera.aperture", single("f_16")], ["camera.depth_of_field", num(1)]], [[["camera.aperture", single("f_16")], ["camera.depth_of_field", num(5)]], [["camera.aperture", single("f_4")], ["camera.depth_of_field", num(1)]]]],
  ["camera-telephoto-vs-exaggerated-perspective", [["camera.lens_type", single("telephoto")], ["camera.perspective", single("exaggerated")]], [[["camera.lens_type", single("telephoto")], ["camera.perspective", single("compressed")]]]],
  ["camera-wide-lens-vs-compressed-perspective", [["camera.lens_type", single("fisheye")], ["camera.perspective", single("compressed")]], [[["camera.lens_type", single("wide")], ["camera.perspective", single("exaggerated")]], [["camera.lens_type", single("standard")], ["camera.perspective", single("compressed")]]]],
  ["lighting-soft-light-vs-sharp-shadow-edge", [["lighting.softness", single("soft")], ["lighting.shadow_edge", num(5)]], [[["lighting.softness", single("soft")], ["lighting.shadow_edge", num(2)]], [["lighting.softness", single("medium")], ["lighting.shadow_edge", num(5)]]]],
  ["lighting-hard-light-vs-soft-shadow-edge", [["lighting.softness", single("very_hard")], ["lighting.shadow_edge", num(1)]], [[["lighting.softness", single("hard")], ["lighting.shadow_edge", num(4)]]]],
  ["lighting-high-contrast-vs-no-shadows", [["lighting.contrast", single("very_high")], ["lighting.shadow_strength", single("none")]], [[["lighting.contrast", single("high")], ["lighting.shadow_strength", single("strong")]], [["lighting.contrast", single("medium")], ["lighting.shadow_strength", single("none")]]]],
];

describe("each new rule: fires on its condition, not on representative neighbours", () => {
  it("covers all 24 rules exactly once", () => {
    expect(CASES.map(([id]) => id).sort()).toEqual(consistencyRules.map((r) => r.id).sort());
    expect(core.rules).toHaveLength(90 + 24);
  });
  it.each(CASES)("%s", (id, fire, quiet) => {
    expect(ruleCodes(fire)).toEqual([id]); // exactly this rule — no duplicate warning for the same cause
    for (const q of quiet) expect(ruleCodes(q), JSON.stringify(q)).not.toContain(id);
  });
});

describe("classification, non-blocking, output unchanged", () => {
  it("contradiction → warning, convention → info; none blocks and the prompt is exactly the same as without the rule", () => {
    for (const r of consistencyRules) {
      expect(r.kind, r.id).toBe("conflict");
      expect(r.severity, r.id).toBe(r.basis === "contradiction" ? "warning" : "info");
      expect(r.actions, r.id).toBeUndefined(); // nothing is changed or offered to be cleared automatically
    }
    expect(consistencyRules.filter((r) => r.basis === "contradiction")).toHaveLength(17);
    expect(consistencyRules.filter((r) => r.basis === "convention")).toHaveLength(7);
    for (const [id, fire] of CASES) {
      const withRule = compilePrompt(buildSpec(core, fire), core);
      const c = cloneCore();
      c.rules = (c.rules ?? []).filter((r) => r.id !== id);
      const noRuleReg = CatalogRegistry.createOrThrow(c);
      const without = compilePrompt(buildSpec(noRuleReg, fire), noRuleReg);
      expect(withRule.blocked, id).toBe(false);
      expect(withRule.prompt, id).toBe(without.prompt);
      expect(withRule.fragments, id).toEqual(without.fragments);
    }
  });

  it("diagnostics carry the basis; existing conflict rules default to contradiction, sky light in a studio is a convention", () => {
    const d = (entries: Entries, id: string) => compilePrompt(buildSpec(core, entries), core).diagnostics.find((x) => x.code === `rule.${id}`)!;
    expect(d([["camera.aperture", single("f_2")], ["camera.depth_of_field", num(4)]], "camera-wide-aperture-vs-deep-dof").params).toMatchObject({ basis: "convention" });
    expect(d([["person.nose.shape", single("upturned")], ["person.nose.tip_angle", num(2)]], "nose-upturned-shape-vs-downward-tip").params).toMatchObject({ basis: "contradiction" });
    expect(d([["camera.lens_type", single("telephoto")], ["camera.focal_length", single("mm_24")]], "camera-telephoto-vs-short-focal-length").params).toMatchObject({ basis: "contradiction" });
    const studio = d([["lighting.preset", single("golden_hour")], ["scene.setting", single("studio")]], "sky-light-in-studio");
    expect([studio.severity, studio.params?.basis]).toEqual(["warning", "convention"]); // severity unchanged
  });

  it("safety stays independent: a blocked spec still lists the consistency notice, and the notice never blocks by itself", () => {
    const entries: Entries = [["intent.description", { kind: "text", text: "sexy schoolgirl" }], ["camera.aperture", single("f_1_4")], ["camera.depth_of_field", num(5)]];
    const c = compilePrompt(buildSpec(core, entries), core);
    expect(c.blocked).toBe(true);
    expect(c.diagnostics.some((x) => x.code === "rule.camera-wide-aperture-vs-deep-dof")).toBe(true);
    expect(c.diagnostics.filter((x) => x.code.startsWith("safety.")).length).toBeGreaterThan(0);
    expect(compilePrompt(buildSpec(core, entries.slice(1)), core).blocked).toBe(false);
  });

  it("excluded values are diagnosed like every existing rule (rules read stored values); output and exclusion are unchanged", () => {
    const fire: Entries = [["camera.lens_type", single("telephoto")], ["camera.perspective", single("exaggerated")], ["camera.focal_length", single("mm_24")]];
    const spec = setPromptExclusion(buildSpec(core, fire), "camera.perspective", true);
    const c = compilePrompt(spec, core);
    expect(c.diagnostics.filter((d) => d.code.startsWith("rule.")).map((d) => d.code)).toEqual(["rule.camera-telephoto-vs-short-focal-length", "rule.camera-telephoto-vs-exaggerated-perspective"]);
    expect(c.prompt).toBe("Lens: telephoto lens. Focal length: 24 mm.");
  });

  it("creative combinations without a clear basis stay quiet (fantasy, stylization, intentional looks)", () => {
    for (const entries of [
      [["person.body.proportions", single("chibi")], ["person.body.heads_tall", num(3)], ["person.body.build", single("muscular")], ["person.body.muscle_mass", num(5)]],
      [["person.face.shape", single("heart")], ["person.face.length", num(5)], ["person.eyes.shape", single("round")], ["person.eyes.size", num(5)], ["person.eyes.height", num(5)]],
      [["camera.lens_type", single("macro")], ["camera.aperture", single("f_2_8")], ["camera.depth_of_field", num(1)], ["camera.perspective", single("natural")]],
      [["lighting.softness", single("very_soft")], ["lighting.shadow_edge", num(1)], ["lighting.contrast", single("low")], ["lighting.shadow_strength", single("light")]],
      [["person.expression.emotion", multi("happy", "surprised")], ["person.expression.emotion_intensity", num(5)], ["person.expression.mouth_openness", single("wide_open")], ["person.expression.smile", multi("open_mouth")]],
    ] as Entries[]) expect(ruleCodes(entries), JSON.stringify(entries)).toEqual([]);
  });
});

describe("numberIn condition", () => {
  const spec = (v?: number) => buildSpec(core, v === undefined ? [] : [["camera.depth_of_field", num(v)]]);
  it("holds only for a SET value within inclusive bounds; an unset slider is never inferred", () => {
    const c = { op: "numberIn", attributeId: "camera.depth_of_field", min: 2, max: 4 } as const;
    expect([undefined, 1, 2, 3, 4, 5].map((v) => evaluateCondition(c, spec(v)))).toEqual([false, false, true, true, true, false]);
    expect(evaluateCondition({ op: "numberIn", attributeId: "camera.depth_of_field", max: 1 }, spec())).toBe(false);
  });
  it("catalog integrity: numberIn needs a number attribute, min ≤ max and at least one bound", () => {
    const codes = (when: unknown) => {
      const c = cloneCore();
      c.rules = [...(c.rules ?? []), { id: "x-test", kind: "conflict", severity: "info", when: [when as never], involves: ["camera.aperture"], message: { en: "x" }, guidance: { en: "x" } }];
      return CatalogRegistry.create(c).diagnostics.map((d) => d.code);
    };
    expect(codes({ op: "numberIn", attributeId: "camera.aperture", min: 1 })).toContain("catalog.invalid_condition");
    expect(codes({ op: "numberIn", attributeId: "camera.depth_of_field", min: 4, max: 2 })).toContain("catalog.invalid_condition");
    expect(codes({ op: "numberIn", attributeId: "camera.depth_of_field" }).some((c) => c.startsWith("catalog.schema"))).toBe(true);
    expect(codes({ op: "numberIn", attributeId: "camera.depth_of_field", min: 4 })).toEqual([]);
  });
});
