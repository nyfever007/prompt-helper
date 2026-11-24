import { describe, expect, it } from "vitest";
import {
  applySelection,
  compilePrompt,
  createEmptySpec,
  evaluateCondition,
  findInactiveSelections,
  getCoreRegistry,
  validateSpecAgainstCatalog,
  type Diagnostic,
} from "@/domain";
import { buildSpec, multi, single } from "../fixtures/specs";

const core = getCoreRegistry();
const rulesFired = (d: Diagnostic[]) => d.filter((x) => x.code.startsWith("rule.")).map((x) => x.ruleId);

describe("conditions", () => {
  it("whenUnset decides anyOf/noneOf when the attribute is unset", () => {
    const empty = createEmptySpec(core);
    expect(evaluateCondition({ op: "anyOf", attributeId: "subject.kind", optionIds: ["person"] }, empty)).toBe(false);
    expect(evaluateCondition({ op: "anyOf", attributeId: "subject.kind", optionIds: ["person"], whenUnset: "pass" }, empty)).toBe(true);
    expect(evaluateCondition({ op: "noneOf", attributeId: "subject.kind", optionIds: ["person"] }, empty)).toBe(false);
  });

  it("noneOf is true only when set and none match", () => {
    const s = buildSpec(core, [["scene.setting", single("forest")]]);
    expect(evaluateCondition({ op: "noneOf", attributeId: "scene.setting", optionIds: ["studio"] }, s, core)).toBe(true);
    expect(evaluateCondition({ op: "noneOf", attributeId: "scene.setting", optionIds: ["nature"] }, s, core)).toBe(false); // forest ⊂ nature
  });
});

describe("conflict and dependency diagnostics", () => {
  const cases: Array<[string, Array<[string, ReturnType<typeof single>]>, string[]]> = [
    ["overhead-vs-direction", [["camera.angle", single("birds_eye")], ["composition.view_direction", single("front")]], ["camera.angle", "composition.view_direction"]],
    ["sky-light-in-studio", [["lighting.preset", single("golden_hour")], ["scene.setting", single("studio")]], ["lighting.preset", "scene.setting"]],
    ["backdrop-hides-setting", [["scene.background", single("plain")], ["scene.setting", single("beach")]], ["scene.background", "scene.setting"]],
    ["mood-calm-tense", [["mood.tone", multi("calm", "tense")]], ["mood.tone"]],
    ["mood-cheerful-melancholic", [["mood.tone", multi("melancholic", "cheerful")]], ["mood.tone"]],
    ["mood-cozy-eerie", [["mood.tone", multi("cozy", "eerie")]], ["mood.tone"]],
    ["silhouette-hides-face", [["lighting.preset", single("backlit_rim")], ["subject.kind", single("person")], ["composition.framing", single("face_close_up")]], ["lighting.preset", "composition.framing"]],
  ];

  it.each(cases)("%s fires with the involved attributes, guidance and no automatic change", (ruleId, entries, involves) => {
    const spec = buildSpec(core, entries);
    const before = structuredClone(spec);
    const diags = validateSpecAgainstCatalog(spec, core).filter((d) => d.ruleId === ruleId);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.involves).toEqual(involves);
    const rule = core.rules.find((r) => r.id === ruleId)!;
    expect(rule.guidance.ko && rule.guidance.en).toBeTruthy();
    // the compiler still includes everything the user chose (no silent resolution)
    const c = compilePrompt(spec, core);
    expect(c.fragments.map((f) => f.attributeId).sort()).toEqual(Object.keys(spec.selections).sort());
    expect(spec).toEqual(before);
  });

  it("rule actions are suggestions only; applying one is an explicit, separate edit", () => {
    const spec = buildSpec(core, [["camera.angle", single("birds_eye")], ["composition.view_direction", single("front")]]);
    const d = validateSpecAgainstCatalog(spec, core).find((x) => x.ruleId === "overhead-vs-direction")!;
    expect(d.actions).toEqual([
      { kind: "clear", attributeId: "composition.view_direction" },
      { kind: "clear", attributeId: "camera.angle" },
    ]);
    expect(Object.keys(spec.selections)).toHaveLength(2);
  });

  it("no rules fire for compatible combinations", () => {
    const ok = [
      [["mood.tone", multi("calm", "cozy", "nostalgic")]],
      [["lighting.preset", single("studio_softbox")], ["scene.setting", single("studio")]],
      [["scene.background", single("plain")], ["scene.setting", single("studio")]],
      [["scene.background", single("plain")]],
      [["camera.angle", single("high_angle")], ["composition.view_direction", single("front")]],
    ] as Array<Array<[string, ReturnType<typeof single>]>>;
    for (const entries of ok) expect(rulesFired(validateSpecAgainstCatalog(buildSpec(core, entries), core))).toEqual([]);
  });
});

describe("context changes: inapplicable selections are preserved, excluded, reported and restored", () => {
  it("option-level: full-body framing survives a switch to landscape and returns when switching back", () => {
    const spec = buildSpec(core, [["subject.kind", single("person")], ["composition.framing", single("full_body")]]);
    expect(compilePrompt(spec, core).prompt).toContain("Framing: full-body shot.");

    const toLandscape = applySelection(spec, core, "subject.kind", single("landscape"));
    if (!toLandscape.ok) throw new Error();
    expect(toLandscape.value.selections["composition.framing"]).toBe(spec.selections["composition.framing"]);
    expect(findInactiveSelections(toLandscape.value, core)).toEqual([{ attributeId: "composition.framing", scope: "option", optionIds: ["full_body"] }]);
    const c = compilePrompt(toLandscape.value, core);
    expect(c.prompt).toBe("Main subject: a landscape.");
    expect(c.diagnostics.find((d) => d.code === "selection.option_inactive")?.attributeId).toBe("composition.framing");

    const back = applySelection(toLandscape.value, core, "subject.kind", single("person"));
    if (!back.ok) throw new Error();
    expect(findInactiveSelections(back.value, core)).toEqual([]);
    expect(compilePrompt(back.value, core).prompt).toContain("Framing: full-body shot.");
  });

  it("attribute-level: viewing direction survives a switch to abstract", () => {
    const spec = buildSpec(core, [["subject.kind", single("vehicle")], ["composition.view_direction", single("side")], ["camera.angle", single("low_angle")]]);
    const r = applySelection(spec, core, "subject.kind", single("abstract"));
    if (!r.ok) throw new Error();
    expect(findInactiveSelections(r.value, core).map((i) => [i.attributeId, i.scope])).toEqual([
      ["composition.view_direction", "attribute"],
      ["camera.angle", "attribute"],
    ]);
    expect(Object.keys(r.value.selections).sort()).toEqual(["camera.angle", "composition.view_direction", "subject.kind"]);
  });

  it("clearing the subject (no context) makes every selection applicable again", () => {
    const spec = buildSpec(core, [["subject.kind", single("landscape")], ["composition.framing", single("panoramic")], ["camera.angle", single("birds_eye")]]);
    const cleared = { ...spec, selections: { ...spec.selections } };
    delete cleared.selections["subject.kind"];
    expect(findInactiveSelections(cleared, core)).toEqual([]);
  });

  it("rules do not fire on attributes whose own value is unset", () => {
    expect(rulesFired(validateSpecAgainstCatalog(buildSpec(core, [["camera.angle", single("birds_eye")]]), core))).toEqual([]);
  });
});
