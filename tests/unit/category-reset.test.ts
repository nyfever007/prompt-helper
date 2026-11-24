import { describe, expect, it } from "vitest";
import {
  attributesInCategory,
  CatalogRegistry,
  getCoreRegistry,
  planPreset,
  resetCategory,
  restoreCategoryReset,
  setPromptExclusion,
  type ImageSpec,
  type SelectionValue,
} from "@/domain";
import { createWorkspaceReducer, initialWorkspaceState, type WorkspaceState } from "@/state/workspaceReducer";
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
    const reg = CatalogRegistry.createOrThrow(c);
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
    expect(st.lastCategoryReset?.categoryId).toBe("person_identity");
    st = reduce(st, { type: "set", attributeId: "lighting.preset", value: single("studio_softbox") });
    st = reduce(st, { type: "undoCategoryReset" });
    expect(st.spec.selections["lighting.preset"]!.value).toEqual(single("studio_softbox"));
    expect(Object.keys(st.spec.selections).filter((k) => k.startsWith(P)).sort()).toEqual([P + "age", P + "description", P + "occupation", P + "species"]);
    expect(st.spec.selections[P + "occupation"]!.excludedFromPrompt).toBe(true);
    expect(st.lastCategoryReset).toBeNull();
    expect(st.lastCategoryRestore).toMatchObject({ restored: [P + "age", P + "description", P + "occupation", P + "species"], skipped: [] });
  });

  it("a full reset supersedes a pending category undo; restoring the full snapshot returns the pre-full-reset state", () => {
    let st = reduce(withSpec(mixed()), { type: "resetCategory", categoryId: "person_identity" });
    const beforeFull = st.spec;
    st = reduce(st, { type: "reset" });
    expect(st.lastCategoryReset).toBeNull();
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
