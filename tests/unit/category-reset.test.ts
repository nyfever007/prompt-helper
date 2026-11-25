import { describe, expect, it } from "vitest";
import { placeUnlistedByOrder } from "@/testing/promptOrder";
import {
  attributesInCategory,
  CatalogRegistry,
  compilePrompt,
  getCoreRegistry,
  planPreset,
  resetCategory,
  restoreCategoryReset,
  setPromptExclusion,
  type ImageSpec,
  type SelectionValue,
} from "@/domain";
import { CATEGORY_RESET_HISTORY_LIMIT, createWorkspaceReducer, initialWorkspaceState, type WorkspaceState } from "@/state/workspaceReducer";
import { buildFixtureCatalog } from "@/testing/fixtureCatalog";
import { cloneCore } from "../fixtures/catalogs";
import { buildSpec, single, text } from "../fixtures/specs";

const core = getCoreRegistry();
const P = "person.identity.";
const yrs = (value: number): SelectionValue => ({ kind: "number", value, unit: "years" });

/** A spec with identity values in several states + values in other categories. */
const mixed = (): ImageSpec => {
  let s = buildSpec(core, [
    ["subject.kind", single("landscape")], // → identity values become INAPPLICABLE (still stored)
    ["lighting.preset", single("golden_hour")],
    ["intent.description", text("a quiet valley")],
    [P + "species", single("elf")],
    [P + "age", yrs(300)],
    [P + "occupation", { kind: "multi", optionIds: ["mage"], custom: [{ label: "Star cartographer" }] }],
    [P + "description", text("keeper of the old library")],
  ]);
  s = setPromptExclusion(s, P + "occupation", true); // EXCLUDED
  return s;
};

describe("category reset (N5): every stored value of the category subtree, nothing else", () => {
  it("membership is catalog-based (subcategories included), not UI-based", () => {
    expect(attributesInCategory(core, "person_identity")).toHaveLength(16);
    expect(attributesInCategory(core, "person_identity_age")).toEqual([P + "age_group", P + "age", P + "apparent_age"]);
  });

  it("clears excluded and inapplicable values too; other categories keep their exact objects", () => {
    const spec = mixed();
    const { spec: after, removed } = resetCategory(spec, core, "person_identity");
    expect(Object.keys(removed).sort()).toEqual([P + "age", P + "description", P + "occupation", P + "species"]);
    expect(removed[P + "occupation"]!.excludedFromPrompt).toBe(true);
    expect(Object.keys(after.selections).sort()).toEqual(["intent.description", "lighting.preset", "subject.kind"]);
    for (const k of ["intent.description", "lighting.preset", "subject.kind"]) expect(after.selections[k]).toBe(spec.selections[k]);
  });

  it("includes values that are not exposed in the current mode (e.g. imported draft attributes)", () => {
    const c = cloneCore();
    c.attributes.push({ id: "x.identity.legacy", domain: "x", status: "draft", categoryId: "person_identity_other", type: "text", tier: "detailed", order: 2170, maxLength: 50, label: { en: "Legacy" }, prompt: { template: "{value}" } });
    const reg = CatalogRegistry.createOrThrow(placeUnlistedByOrder(c));
    const spec = buildSpec(reg, [["x.identity.legacy", text("imported")], [P + "age", yrs(30)]]);
    expect(reg.isExposed(reg.getAttribute("x.identity.legacy")!, "detailed")).toBe(false);
    expect(Object.keys(resetCategory(spec, reg, "person_identity").removed).sort()).toEqual([P + "age", "x.identity.legacy"]);
  });

  it("an empty category is a no-op (same reference)", () => {
    const spec = buildSpec(core, [["subject.kind", single("person")]]);
    expect(resetCategory(spec, core, "person_identity").spec).toBe(spec);
  });

  it("restore brings back the exact objects (incl. exclusion) only where still unset — later user edits win", () => {
    const spec = mixed();
    const { spec: cleared, removed } = resetCategory(spec, core, "person_identity");
    // user sets the age again after the reset
    const edited = { ...cleared, selections: { ...cleared.selections, [P + "age"]: { value: yrs(40), source: "user" as const } } };
    const res = restoreCategoryReset(edited, removed);
    expect(res.skipped).toEqual([P + "age"]);
    expect(res.restored).toEqual([P + "description", P + "occupation", P + "species"]);
    expect(res.spec.selections[P + "age"]!.value).toEqual(yrs(40));
    expect(res.spec.selections[P + "occupation"]).toBe(spec.selections[P + "occupation"]);
    expect(res.spec.selections["lighting.preset"]).toBe(spec.selections["lighting.preset"]);
  });
});

describe("workspace reducer: category reset ↔ full reset ↔ preset undo ↔ exclusion", () => {
  const reduce = createWorkspaceReducer(core);
  const withSpec = (spec: ImageSpec): WorkspaceState => ({ ...initialWorkspaceState(core), spec });

  it("reset → edit another category → undo: restores the category, keeps the unrelated edit", () => {
    let st = reduce(withSpec(mixed()), { type: "resetCategory", categoryId: "person_identity" });
    expect(st.categoryResets.map((r) => r.categoryId)).toEqual(["person_identity"]);
    st = reduce(st, { type: "set", attributeId: "lighting.preset", value: single("studio_softbox") });
    st = reduce(st, { type: "undoCategoryReset" });
    expect(st.spec.selections["lighting.preset"]!.value).toEqual(single("studio_softbox"));
    expect(Object.keys(st.spec.selections).filter((k) => k.startsWith(P)).sort()).toEqual([P + "age", P + "description", P + "occupation", P + "species"]);
    expect(st.spec.selections[P + "occupation"]!.excludedFromPrompt).toBe(true);
    expect(st.categoryResets).toEqual([]);
    expect(st.lastCategoryRestore).toMatchObject({ restored: [P + "age", P + "description", P + "occupation", P + "species"], skipped: [] });
  });

  it("a full reset supersedes a pending category undo; restoring the full snapshot returns the pre-full-reset state", () => {
    let st = reduce(withSpec(mixed()), { type: "resetCategory", categoryId: "person_identity" });
    const beforeFull = st.spec;
    st = reduce(st, { type: "reset" });
    expect(st.categoryResets).toEqual([]);
    expect(reduce(st, { type: "undoCategoryReset" })).toBe(st); // nothing to undo
    st = reduce(st, { type: "restoreResetSnapshot" });
    expect(st.spec).toBe(beforeFull);
  });

  it("the output toggle is a user edit of that attribute only and keeps value/source/provenance", () => {
    const st0 = withSpec(buildSpec(core, [[P + "age", yrs(28)], [P + "gender", single("woman")]]));
    const st = reduce(st0, { type: "setExcluded", attributeId: P + "age", excluded: true });
    expect(st.spec.selections[P + "age"]).toEqual({ ...st0.spec.selections[P + "age"], excludedFromPrompt: true });
    expect(st.spec.selections[P + "gender"]).toBe(st0.spec.selections[P + "gender"]);
    expect(reduce(st, { type: "setExcluded", attributeId: P + "species", excluded: true })).toBe(st); // unset → no-op
  });

  it("preset undo never re-writes values cleared by a category reset or toggled by the user", () => {
    const fx = CatalogRegistry.createOrThrow(buildFixtureCatalog());
    const r = createWorkspaceReducer(fx);
    let st: WorkspaceState = { ...initialWorkspaceState(fx), spec: buildSpec(fx, [["subject.kind", single("person")]]) };
    const plan = planPreset(st.spec, fx, "p_soft_portrait");
    if (!plan.ok) throw new Error("plan");
    st = r(st, { type: "applyPreset", plan: plan.value, mode: "all" });
    const written = st.presetTransaction!.changes.map((c) => c.attributeId);
    const inExpression = written.filter((id) => fx.getAttribute(id)?.categoryId === "person_expression");
    expect(inExpression.length).toBeGreaterThan(0);
    st = r(st, { type: "resetCategory", categoryId: "person_expression" });
    const toggled = written.find((id) => !inExpression.includes(id))!;
    st = r(st, { type: "setExcluded", attributeId: toggled, excluded: true });
    st = r(st, { type: "undoPreset" });
    expect(st.lastPresetUndo!.kept.sort()).toEqual([...inExpression, toggled].sort());
    for (const id of inExpression) expect(st.spec.selections[id]).toBeUndefined(); // stays cleared
    expect(st.spec.selections[toggled]!.excludedFromPrompt).toBe(true); // stays as the user left it
  });
});

describe("TD-09: category reset history (session, several resets, later edits win)", () => {
  const reduce = createWorkspaceReducer(core);
  const at = "2026-11-25T10:00:00.000Z";
  const start = (entries: Array<[string, SelectionValue]>): WorkspaceState => ({ ...initialWorkspaceState(core), spec: buildSpec(core, entries) });
  const FACE: Array<[string, SelectionValue]> = [["person.face.shape", single("oval")], ["person.eyes.shape", single("almond")]];
  const LIGHT: Array<[string, SelectionValue]> = [["lighting.preset", single("golden_hour")], ["lighting.rim", single("subtle")], ["lighting.rim_color", single("cyan")]];

  it("records what each reset removed (ids, values, exclusion, custom, preset origin) with an increasing sequence and time", () => {
    let st = start([...FACE, ...LIGHT, [P + "occupation", { kind: "multi", optionIds: ["mage"], custom: [{ label: "Star cartographer" }] }]]);
    st = { ...st, spec: setPromptExclusion(st.spec, "lighting.rim", true) };
    const before = st.spec;
    st = reduce(st, { type: "resetCategory", categoryId: "shared_lighting", at });
    st = reduce(st, { type: "resetCategory", categoryId: "person_identity", at });
    expect(st.categoryResets.map((r) => [r.id, r.categoryId, r.at])).toEqual([[2, "person_identity", at], [1, "shared_lighting", at]]);
    const light = st.categoryResets[1]!;
    expect(Object.keys(light.removed).sort()).toEqual(["lighting.preset", "lighting.rim", "lighting.rim_color"]);
    for (const id of Object.keys(light.removed)) expect(light.removed[id]).toBe(before.selections[id]); // exact objects
    expect(light.removed["lighting.rim"]!.excludedFromPrompt).toBe(true);
    expect(st.categoryResets[0]!.removed[P + "occupation"]!.value).toEqual({ kind: "multi", optionIds: ["mage"], custom: [{ label: "Star cartographer" }] });
  });

  it("restores an OLDER reset after a newer one; each restore touches only its own attributes; other edits stay", () => {
    let st = start([...FACE, ...LIGHT, ["subject.kind", single("person")]]);
    st = reduce(st, { type: "resetCategory", categoryId: "person_face" });
    st = reduce(st, { type: "resetCategory", categoryId: "shared_lighting" });
    st = reduce(st, { type: "set", attributeId: "mood.tone", value: { kind: "multi", optionIds: ["calm"] } }); // unrelated later edit
    const faceId = st.categoryResets.find((r) => r.categoryId === "person_face")!.id;
    st = reduce(st, { type: "undoCategoryReset", recordId: faceId });
    expect(Object.keys(st.spec.selections).sort()).toEqual(["mood.tone", "person.eyes.shape", "person.face.shape", "subject.kind"]); // eyes are another category: never reset
    expect(st.categoryResets.map((r) => r.categoryId)).toEqual(["shared_lighting"]); // the lighting reset is still pending
    expect(st.lastCategoryRestore).toMatchObject({ categoryId: "person_face", restored: ["person.face.shape"], skipped: [] });
    st = reduce(st, { type: "undoCategoryReset" });
    expect(Object.keys(st.spec.selections).sort()).toEqual(["lighting.preset", "lighting.rim", "lighting.rim_color", "mood.tone", "person.eyes.shape", "person.face.shape", "subject.kind"]);
    expect(st.categoryResets).toEqual([]);
    expect(reduce(st, { type: "undoCategoryReset" })).toBe(st);
  });

  it("an attribute edited after the reset keeps its CURRENT state — set again, or set and cleared (stays unset) — and is reported", () => {
    let st = start(LIGHT);
    st = reduce(st, { type: "resetCategory", categoryId: "shared_lighting" });
    st = reduce(st, { type: "set", attributeId: "lighting.preset", value: single("neon") });
    st = reduce(st, { type: "set", attributeId: "lighting.rim_color", value: single("blue") });
    st = reduce(st, { type: "clear", attributeId: "lighting.rim_color" }); // the user's latest choice is “unset”
    expect(st.categoryResets[0]!.editedSince.sort()).toEqual(["lighting.preset", "lighting.rim_color"]);
    st = reduce(st, { type: "undoCategoryReset" });
    expect(st.spec.selections["lighting.preset"]!.value).toEqual(single("neon"));
    expect(st.spec.selections["lighting.rim_color"]).toBeUndefined();
    expect(st.spec.selections["lighting.rim"]!.value).toEqual(single("subtle"));
    expect(st.lastCategoryRestore).toMatchObject({ restored: ["lighting.rim"], skipped: ["lighting.preset", "lighting.rim_color"] });
  });

  it("a no-op on an unset attribute is not an edit", () => {
    let st = start(LIGHT);
    st = reduce(st, { type: "resetCategory", categoryId: "shared_lighting" });
    expect(reduce(st, { type: "setExcluded", attributeId: "lighting.rim", excluded: true })).toBe(st);
    expect(reduce(st, { type: "clear", attributeId: "lighting.rim" })).toBe(st);
    st = reduce(st, { type: "undoCategoryReset" });
    expect(st.lastCategoryRestore!.skipped).toEqual([]);
  });

  it("inactive values come back stored (not output), exactly as before the reset", () => {
    let st = start([["lighting.rim", single("none")], ["lighting.rim_color", single("cyan")]]);
    const before = st.spec;
    expect(compilePrompt(before, core).prompt).toBe("Rim light: none.");
    st = reduce(st, { type: "resetCategory", categoryId: "shared_lighting" });
    st = reduce(st, { type: "undoCategoryReset" });
    expect(st.spec.selections).toEqual(before.selections);
    expect(compilePrompt(st.spec, core).prompt).toBe("Rim light: none.");
  });

  it(`keeps the ${CATEGORY_RESET_HISTORY_LIMIT} most recent resets; ids keep increasing after the history empties`, () => {
    const cats = ["person_face", "person_eyes", "shared_lighting", "shared_camera", "shared_mood", "shared_scene"];
    let st = start([...FACE, ...LIGHT, ["composition.framing", single("upper_body")], ["mood.tone", { kind: "multi", optionIds: ["calm"] }], ["scene.setting", single("studio")]]);
    for (const c of cats) st = reduce(st, { type: "resetCategory", categoryId: c });
    expect(st.categoryResets.map((r) => r.categoryId)).toEqual(["shared_scene", "shared_mood", "shared_camera", "shared_lighting", "person_eyes"]);
    for (let i = 0; i < 5; i++) st = reduce(st, { type: "undoCategoryReset" });
    expect(st.spec.selections["person.face.shape"]).toBeUndefined(); // the dropped (oldest) reset can no longer be undone
    expect(st.spec.selections["person.eyes.shape"]!.value).toEqual(single("almond"));
    expect(st.categoryResets).toEqual([]);
    st = reduce(st, { type: "resetCategory", categoryId: "shared_mood" });
    expect(st.categoryResets[0]!.id).toBe(7);
  });

  it("presets: a preset applied after a reset is a later edit (its value is kept on restore); restoring never re-applies a preset", () => {
    const fx = CatalogRegistry.createOrThrow(buildFixtureCatalog());
    const r = createWorkspaceReducer(fx);
    let st: WorkspaceState = { ...initialWorkspaceState(fx), spec: buildSpec(fx, [["subject.kind", single("person")], ["lighting.preset", single("neon")], ["lighting.rim", single("subtle")]]) };
    st = r(st, { type: "resetCategory", categoryId: "shared_lighting" });
    const plan = planPreset(st.spec, fx, "p_golden_scene");
    if (!plan.ok) throw new Error("plan");
    st = r(st, { type: "applyPreset", plan: plan.value, mode: "all" });
    st = r(st, { type: "undoCategoryReset" });
    expect(st.spec.selections["lighting.preset"]!.value).toEqual(single("golden_hour")); // preset value kept (edited after reset)
    expect(st.spec.selections["lighting.rim"]!.value).toEqual(single("subtle")); // restored
    expect(st.lastCategoryRestore!.skipped).toEqual(["lighting.preset"]);
    // Preset undo still works on what the preset wrote and does not touch the restored rim light.
    st = r(st, { type: "undoPreset" });
    expect(st.spec.selections["lighting.preset"]).toBeUndefined();
    expect(st.spec.selections["lighting.rim"]!.value).toEqual(single("subtle"));
  });

  it("restoring never bypasses the safety policy: a restored value is checked exactly like before the reset", () => {
    let st = start([[P + "description", text("nude figure")], ["subject.kind", single("person")]]);
    expect(compilePrompt(st.spec, core).blocked).toBe(true);
    st = reduce(st, { type: "resetCategory", categoryId: "person_identity" });
    expect(compilePrompt(st.spec, core).blocked).toBe(false);
    st = reduce(st, { type: "undoCategoryReset" });
    const c = compilePrompt(st.spec, core);
    expect(c.blocked).toBe(true);
    expect(c.prompt).toBe("");
  });

  it("a full reset or an imported spec clears the history (it no longer describes the spec)", () => {
    for (const action of [{ type: "reset" }, { type: "replace", spec: buildSpec(core, []) }] as const) {
      let st = start(LIGHT);
      st = reduce(st, { type: "resetCategory", categoryId: "shared_lighting" });
      st = reduce(st, action);
      expect(st.categoryResets).toEqual([]);
    }
  });
});
