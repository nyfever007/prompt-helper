import { describe, expect, it } from "vitest";
import {
  baselinePolicy,
  compilePrompt,
  evaluateSafety,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  isAttributeActive,
  isOptionAttribute,
  resetCategory,
  restoreCategoryReset,
  searchCatalog,
  setPromptExclusion,
  type SelectionValue,
} from "@/domain";
import { buildSpec, multi, single, text } from "../fixtures/specs";

/** Sprint 2-B.6 (1)(2) — Appearance direction and Person › Pose & action. */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const yrs = (value: number): SelectionValue => ({ kind: "number", value, unit: "years" });
const out = (entries: Array<[string, SelectionValue]>) => compilePrompt(buildSpec(core, entries), core);
const prompt = (entries: Array<[string, SelectionValue]>) => out(entries).prompt;
const codes = (entries: Array<[string, SelectionValue]>) => out(entries).diagnostics.map((d) => d.code);
const AD = "person.appearance.direction";
const P = (x: string) => `person.pose.${x}`;
const PERSON: [string, SelectionValue] = ["subject.kind", single("person")];
const pose = core.attributes().filter((a) => a.id.startsWith("person.pose."));

const DIRECTIONS: Array<[string, string, string]> = [
  ["beautiful", "아름다운", "Beautiful"], ["handsome", "잘생긴", "Handsome"], ["pretty", "예쁜", "Pretty"], ["cute", "귀여운", "Cute"], ["stunning", "눈부시게 아름다운", "Stunning"],
  ["sexy", "섹시한", "Sexy"], ["gorgeous", "빼어나게 아름다운", "Gorgeous"], ["attractive", "매력적인", "Attractive"], ["charming", "호감 가는 매력", "Charming"], ["elegant", "우아한", "Elegant"],
  ["striking", "눈길을 끄는", "Striking"], ["refined", "세련된", "Refined"], ["adorable", "사랑스러운", "Adorable"], ["rugged", "투박하고 강인한", "Rugged"], ["ethereal", "몽환적인", "Ethereal"],
  ["androgynous", "중성적인", "Androgynous"], ["ordinary", "평범한 외모", "Ordinary-looking"], ["distinctive", "개성 있는 외모", "Distinctive"],
];

describe("appearance direction (directive §2)", () => {
  it("the 18 approved options; multi-select with custom values; Direct/interpretive; Basic + Detailed (one attribute)", () => {
    const a = core.getAttribute(AD)!;
    expect(a.type).toBe("multi");
    expect(isOptionAttribute(a) && a.options.map((o) => [o.id, o.label.ko, o.label.en])).toEqual(DIRECTIONS);
    expect(isOptionAttribute(a) && a.custom).toBeTruthy();
    expect(a.expression?.role).toBe("direct");
    expect(a.tier).toBe("basic");
    expect(a.groupId).toBe("what");
    expect(a.categoryId).toBe("person_expression_impression");
    expect(core.exposedAttributes("basic").map((x) => x.id)).toContain(AD);
    expect(core.exposedAttributes("detailed").map((x) => x.id)).toContain(AD);
    expect(core.attributes().filter((x) => x.id === AD)).toHaveLength(1);
  });

  it("is placed right after the subject and before everything else; unset leaves existing output unchanged", () => {
    const ids = core.attributes().map((x) => x.id);
    expect(ids.slice(0, 4)).toEqual(["intent.description", "subject.kind", AD, "person.identity.entity_type"]);
    expect(prompt([PERSON])).toBe("Main subject: a single person.");
    expect(prompt([PERSON, ["person.identity.age", yrs(28)], ["style.preset", single("anime")]])).toBe("Main subject: a single person. Actual age: 28 years old. Visual style: anime-style illustration.");
    expect(prompt([PERSON, [AD, multi("beautiful", "elegant")], ["person.identity.age", yrs(28)]])).toBe("Main subject: a single person. Appearance direction: beautiful, elegant. Actual age: 28 years old.");
  });

  it("TD-14 (Sprint 2-C.3): same subject scope as the other person attributes — applies with no subject or a single person; an explicit non-person subject keeps the value but does not output it", () => {
    const a = core.getAttribute(AD)!;
    expect(a.appliesWhen).toEqual(core.getAttribute("person.face.shape")!.appliesWhen); // the common person scope
    expect(isAttributeActive(core, a, buildSpec(core, []))).toBe(true); // 2-B.6: false (changed by approval)
    expect(isAttributeActive(core, a, buildSpec(core, [PERSON]))).toBe(true);
    // no subject: output without adding any subject sentence, and nothing else is set
    const unset = buildSpec(core, [[AD, multi("beautiful")]]);
    expect(compilePrompt(unset, core).prompt).toBe("Appearance direction: beautiful.");
    expect(Object.keys(unset.selections)).toEqual([AD]);
    for (const s of ["group", "animal", "landscape"]) expect(isAttributeActive(core, a, buildSpec(core, [["subject.kind", single(s)]])), s).toBe(false);
    const spec = buildSpec(core, [["subject.kind", single("landscape")], [AD, multi("beautiful")]]);
    expect(compilePrompt(spec, core).prompt).toBe("Main subject: a landscape.");
    expect(spec.selections[AD]).toBeDefined();
  });

  it("sets nothing else and is never limited by gender", () => {
    const spec = buildSpec(core, [PERSON, [AD, multi("handsome", "pretty")]]);
    expect(Object.keys(spec.selections).sort()).toEqual([AD, "subject.kind"]);
    for (const g of ["woman", "man", "nonbinary"]) {
      const c = out([PERSON, ["person.identity.gender", single(g)], [AD, multi("handsome", "beautiful")]]);
      expect(c.diagnostics.filter((d) => d.severity !== "info"), g).toEqual([]);
      expect(c.prompt, g).toContain("Appearance direction: beautiful, handsome.");
    }
  });

  it("same meaning as an impression value → output once (existing covers rule); stored values unchanged", () => {
    const spec = buildSpec(core, [PERSON, [AD, multi("elegant", "attractive")], ["person.impression.vibe", multi("elegant")], ["person.impression.attractiveness", single("attractive")]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Main subject: a single person. Appearance direction: attractive, elegant.");
    expect(c.covered?.map((x) => x.attributeId).sort()).toEqual(["person.impression.attractiveness", "person.impression.vibe"]);
    expect(spec.selections["person.impression.vibe"]!.value).toEqual(multi("elegant"));
    // a different impression value is not covered
    expect(prompt([PERSON, [AD, multi("elegant")], ["person.impression.vibe", multi("elegant", "urban")]])).toBe("Main subject: a single person. Appearance direction: elegant. Personal vibe: elegant, urban.");
  });

  it("safety: “sexy” follows the existing minor protection; non-sexual beauty words never block; the age assessment is unchanged", () => {
    const sexy: [string, SelectionValue] = [AD, multi("sexy")];
    expect(out([PERSON, sexy, ["person.identity.age", yrs(30)]]).blocked).toBe(false);
    // Policy 0.3.0 (TD-15, approved change): unknown age is not adult — withheld until an adult age is set (0.2.0: permitted).
    const unknown = out([PERSON, sexy]);
    expect([unknown.blocked, unknown.prompt]).toEqual([true, ""]);
    expect(unknown.diagnostics.filter((d) => d.code.startsWith("safety.")).map((d) => d.code)).toEqual(["safety.appeal-age-unconfirmed"]);
    expect(out([PERSON, sexy, ["person.identity.age_group", single("adult")]]).blocked).toBe(false);
    expect(out([PERSON, sexy, ["person.identity.apparent_age", yrs(30)]]).blocked).toBe(false);
    expect(out([sexy, ["person.identity.age", yrs(30)]]).blocked).toBe(false); // subject unset (TD-14) + adult
    expect(out([PERSON, sexy, ["person.identity.age_group", single("adolescent")]]).blocked).toBe(true);
    expect(out([PERSON, sexy, ["person.identity.apparent_age", yrs(15)]]).blocked).toBe(true);
    expect(out([PERSON, sexy, ["person.impression.maturity", single("youthful")]]).blocked).toBe(true);
    const excluded = setPromptExclusion(buildSpec(core, [PERSON, sexy, ["person.identity.age_group", single("child")]]), AD, true);
    expect(compilePrompt(excluded, core).blocked).toBe(true);
    expect(out([PERSON, [AD, { kind: "multi", optionIds: [], custom: [{ label: "seductive look" }] }], ["person.identity.age_group", single("adolescent")]]).blocked).toBe(true);
    for (const o of ["beautiful", "handsome", "pretty", "cute", "adorable", "stunning", "gorgeous", "charming"]) {
      expect(out([PERSON, [AD, multi(o)], ["person.identity.age_group", single("child")]]).blocked, o).toBe(false);
      expect(out([PERSON, [AD, multi(o)]]).blocked, o).toBe(false); // general appearance needs no age (TD-15)
      expect(out([[AD, multi(o)]]).blocked, o).toBe(false);
    }
    for (const o of DIRECTIONS.map(([id]) => id)) {
      expect(out([PERSON, [AD, multi(o)]]).age.ageClass, o).toBe("unknown");
      expect(out([PERSON, [AD, multi(o)], ["person.identity.age_group", single("adolescent")]]).age.ageClass, o).toBe("minor");
    }
  });

  it.each([["외모", "attribute"], ["외모 방향", "attribute"], ["잘생긴", "option"], ["미인", "option"], ["gorgeous", "option"], ["ordinary", "option"]])("search “%s” finds the appearance direction (%s)", (q, kind) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === AD)).toBe(true);
  });
});

const POSE: Record<string, [string, string[]]> = {
  posture: ["posture", ["standing", "sitting", "lying_down", "reclining", "kneeling", "crouching", "squatting"]],
  body_orientation: ["posture", ["front", "left", "right", "rear", "three_quarter"]],
  torso_rotation: ["posture", ["left", "neutral", "right"]],
  torso_lean: ["posture", ["forward", "upright", "backward", "sideways"]],
  weight_shift: ["posture", ["even", "left_leg", "right_leg"]],
  balance: ["posture", ["natural", "symmetrical", "asymmetrical"]],
  tension: ["posture", []],
  head_direction: ["head_gaze", ["forward", "left", "right", "up", "down"]],
  head_tilt: ["head_gaze", ["left", "upright", "right"]],
  chin: ["head_gaze", ["lowered", "neutral", "raised"]],
  gaze_direction: ["head_gaze", ["camera", "left", "right", "up", "down", "distance", "away"]],
  arms: ["arms_hands", ["relaxed", "crossed", "raised", "outstretched", "behind_back"]],
  elbows: ["arms_hands", ["straight", "slightly_bent", "bent"]],
  hand_position: ["arms_hands", ["at_sides", "on_hips", "in_pockets", "near_face", "behind_head", "behind_back", "on_lap"]],
  hand_gesture: ["arms_hands", ["open", "fists", "waving", "peace", "pointing", "thumbs_up", "clasped"]],
  legs: ["legs_feet", ["together", "apart", "crossed", "one_bent", "one_raised"]],
  knees: ["legs_feet", ["straight", "slightly_bent", "bent"]],
  feet: ["legs_feet", ["forward", "inward", "outward"]],
  action: ["action", ["walking", "running", "jumping", "dancing", "stretching", "turning", "reaching", "waving", "sitting_down", "standing_up", "reading", "writing"]],
  speed: ["action", ["static", "slow", "moderate", "fast", "very_fast"]],
  phase: ["action", ["preparation", "mid_action", "peak", "completion"]],
  support: ["action", ["wall", "chair", "ground", "surface", "holding"]],
};

describe("pose & action (directive §3)", () => {
  it("22 approved attributes in 5 subcategories, order 478–499, approved Direct with the output toggle", () => {
    expect(core.getCategory("person_pose")?.status).toBe("approved");
    expect(core.categories.filter((c) => c.parentId === "person_pose").map((c) => c.label.ko)).toEqual(["기본 자세", "머리·시선", "팔·손 자세", "다리·발 자세", "동작"]);
    expect(pose.map((a) => a.id)).toEqual(Object.keys(POSE).map(P));
    expect(pose.map((a) => a.order)).toEqual(Array.from({ length: 22 }, (_, i) => 478 + i));
    for (const a of pose) {
      const [subId, options] = POSE[a.id.slice("person.pose.".length)]!;
      expect(a.categoryId, a.id).toBe(`person_pose_${subId}`);
      expect(a.status, a.id).toBe("approved");
      expect(a.expression?.role, a.id).toBe("direct");
      expect(a.outputToggle, a.id).toBe(true);
      expect(core.isExposed(a, "detailed"), a.id).toBe(true);
      if (options.length) expect(isOptionAttribute(a) && a.options.map((o) => o.id), a.id).toEqual(options);
    }
    expect(core.getAttribute(P("tension"))!.type).toBe("number");
    expect(core.getAttribute(P("hand_gesture"))!.type).toBe("multi");
    expect(core.getAttribute(P("action"))!.type).toBe("multi");
  });

  it("every option and band compiles alone to exactly its sentence; no pose phrase raises a safety signal", () => {
    for (const a of pose) {
      const texts: string[] = [];
      if (isOptionAttribute(a)) {
        for (const o of a.options) {
          expect(prompt([[a.id, a.type === "single" ? single(o.id) : multi(o.id)]]), `${a.id}/${o.id}`).toBe(a.prompt.template.replace("{value}", o.prompt.text));
          texts.push(o.prompt.text);
        }
      } else if (a.type === "number") {
        a.bands!.forEach((b, i) => {
          expect(prompt([[a.id, num(i + 1)]]), `${a.id}/${i + 1}`).toBe(a.prompt.template.replace("{value}", b.text));
          texts.push(b.text);
        });
      }
      const r = evaluateSafety({ tags: [], texts: texts.map((t) => ({ attributeId: a.id, text: `${a.prompt.template.replace("{value}", t)} girl child` })) }, baselinePolicy);
      expect(r.findings, a.id).toEqual([]);
    }
  });

  it("independent axes: body orientation ≠ camera viewing direction; head direction ≠ gaze direction ≠ gaze state; posture ≠ action", () => {
    const spec = buildSpec(core, [
      PERSON, [P("body_orientation"), single("three_quarter")], ["composition.view_direction", single("front")],
      [P("head_direction"), single("left")], [P("gaze_direction"), single("camera")], ["person.expression.gaze_state", single("focused")],
      [P("posture"), single("sitting")], [P("action"), multi("reading")],
    ]);
    expect(compilePrompt(spec, core).prompt).toBe(
      "Main subject: a single person. Gaze: focused. Posture: sitting. Body orientation: three-quarter facing. Head direction: turned left. Gaze direction: looking at the camera. " +
        "Action: reading. Viewing direction: front view.",
    );
    expect(Object.keys(spec.selections)).toHaveLength(8);
    // A pose sets no clothing, emotion or personality
    expect(Object.keys(buildSpec(core, [[P("action"), multi("dancing")], [P("posture"), single("standing")]]).selections).sort()).toEqual([P("action"), P("posture")]);
  });

  it("only real contradictions warn (non-blocking, nothing changed)", () => {
    const cases: Array<[string, Array<[string, SelectionValue]>]> = [
      ["pose-resting-posture-vs-locomotion", [[P("posture"), single("lying_down")], [P("action"), multi("running")]]],
      ["pose-static-vs-movement", [[P("speed"), single("static")], [P("action"), multi("walking")]]],
      ["pose-standing-vs-seated-support", [[P("posture"), single("standing")], [P("support"), single("chair")]]],
      ["pose-standing-vs-hands-on-lap", [[P("posture"), single("standing")], [P("hand_position"), single("on_lap")]]],
      ["pose-crossed-arms-vs-hand-position", [[P("arms"), single("crossed")], [P("hand_position"), single("in_pockets")]]],
      ["pose-crossed-arms-vs-straight-elbows", [[P("arms"), single("crossed")], [P("elbows"), single("straight")]]],
      ["pose-bent-posture-vs-straight-knees", [[P("posture"), single("squatting")], [P("knees"), single("straight")]]],
      ["pose-closed-eyes-vs-gaze-direction", [["person.expression.eye_openness", single("closed")], [P("gaze_direction"), single("camera")]]],
      ["pose-hand-gesture-open-vs-fists", [[P("hand_gesture"), multi("open", "fists")]]],
    ];
    for (const [rule, entries] of cases) {
      const c = out(entries);
      expect(c.diagnostics.map((d) => d.code), rule).toContain(`rule.${rule}`);
      expect(c.blocked, rule).toBe(false);
    }
    // natural combinations are not diagnosed
    for (const entries of [
      [[P("posture"), single("sitting")], [P("action"), multi("reading", "writing")], [P("hand_position"), single("on_lap")]],
      [[P("posture"), single("standing")], [P("action"), multi("walking")], [P("speed"), single("slow")], [P("support"), single("wall")]],
      [[P("arms"), single("crossed")], [P("elbows"), single("bent")], [P("hand_gesture"), multi("waving", "peace")]],
    ] as Array<Array<[string, SelectionValue]>>) {
      expect(codes(entries).filter((c) => c.startsWith("rule."))).toEqual([]);
    }
  });

  it("custom value, exclusion, JSON round-trip, reset of the parent and of one subcategory, restore", () => {
    let spec = buildSpec(core, [
      PERSON,
      [P("posture"), { kind: "single", custom: { label: "한쪽 무릎 세우고 앉기", expression: "sitting with one knee drawn up" } }],
      [P("gaze_direction"), single("distance")],
      [P("tension"), num(2)],
    ]);
    expect(compilePrompt(spec, core).prompt).toBe("Main subject: a single person. Posture: sitting with one knee drawn up. Posture tension: relaxed. Gaze direction: looking into the distance.");
    spec = setPromptExclusion(spec, P("tension"), true);
    expect(compilePrompt(spec, core).prompt).not.toContain("tension");
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
    const { spec: cleared, removed } = resetCategory(spec, core, "person_pose");
    expect(Object.keys(removed).sort()).toEqual([P("gaze_direction"), P("posture"), P("tension")]);
    expect(Object.keys(cleared.selections)).toEqual(["subject.kind"]);
    expect(restoreCategoryReset(cleared, removed).spec.selections).toEqual(spec.selections);
    expect(Object.keys(resetCategory(spec, core, "person_pose_head_gaze").removed)).toEqual([P("gaze_direction")]);
  });

  it.each([
    ["자세", "attribute", P("posture")], ["포즈", "attribute", P("posture")], ["시선 방향", "attribute", P("gaze_direction")], ["카메라 응시", "attribute", P("gaze_direction")],
    ["eye contact", "option", P("gaze_direction")], ["팔짱", "option", P("arms")], ["브이", "option", P("hand_gesture")], ["다리 꼬기", "option", P("legs")], ["짝다리", "attribute", P("weight_shift")],
    ["달리기", "option", P("action")], ["기대기", "attribute", P("support")],
  ])("search “%s” finds %s %s", (q, kind, attributeId) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === attributeId)).toBe(true);
  });

  it("nothing in pose is set from gender, age or other attributes", () => {
    const c = out([PERSON, ["person.identity.gender", single("woman")], ["person.identity.age", yrs(70)], ["intent.description", text("portrait")]]);
    expect(c.prompt).not.toMatch(/Posture|Gaze direction|Action/);
  });
});
