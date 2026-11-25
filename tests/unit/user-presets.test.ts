import { describe, expect, it } from "vitest";
import {
  applySelection,
  compilePrompt,
  createEmptySpec,
  createUserPreset,
  duplicateUserPreset,
  exportUserPresets,
  getCoreRegistry,
  importUserPresets,
  isUserPresetId,
  loadUserPresets,
  lockedIds,
  planPresetDefinition,
  savedLocks,
  setLocks,
  userPresetCategories,
  userPresetToDefinition,
  writableEntries,
  type ImageSpec,
  type SelectionValue,
} from "@/domain";
import { createWorkspaceReducer, initialWorkspaceState, type WorkspaceState } from "@/state/workspaceReducer";
import { buildSpec, multi, single } from "../fixtures/specs";

/** Sprint 3.3 — user presets: save parts of a design, reuse them through the existing preset path. */
const core = getCoreRegistry();
const reduce = createWorkspaceReducer(core);
const NOW = new Date("2026-11-25T12:00:00Z");
let n = 0;
const rand = () => (n++ % 97) / 97;
const set = (spec: ImageSpec, id: string, value: SelectionValue, source: "user" | "preset" = "user") => {
  const r = applySelection(spec, core, id, value, source);
  if (!r.ok) throw new Error(id);
  return r.value;
};
const color = (hex: string): SelectionValue => ({ kind: "single", custom: { label: hex, color: hex } });

/** A design with a custom color and a lock, plus unrelated values. */
const design = () => {
  let s = buildSpec(core, [["subject.kind", single("person")], ["style.preset", single("watercolor")], ["mood.tone", multi("calm")], ["camera.angle", single("low_angle")]]);
  s = set(s, "person.hair.primary_color", color("#3A7BD5"));
  return setLocks(s, ["person.hair.primary_color"], true);
};
const save = (spec: ImageSpec, ids: string[], name = "My look") => createUserPreset(spec, core, { name, description: "desc", attributeIds: ids }, NOW, `user_test${ids.length}${name.length}`)!;

describe("saving", () => {
  it("saves only the chosen set attributes, exactly (custom color and lock kept), in catalog order", () => {
    const p = save(design(), ["person.hair.primary_color", "style.preset", "lighting.preset"]);
    expect(isUserPresetId(p.id)).toBe(true);
    expect(p.patches.map((x) => x.attributeId)).toEqual(["style.preset", "person.hair.primary_color"].sort((a, b) => core.attributes().findIndex((x) => x.id === a) - core.attributes().findIndex((x) => x.id === b)));
    expect(p.patches.find((x) => x.attributeId === "person.hair.primary_color")).toEqual({ attributeId: "person.hair.primary_color", value: color("#3A7BD5"), locked: true });
    expect(savedLocks(p)).toEqual(["person.hair.primary_color"]);
    expect(createUserPreset(design(), core, { name: " ", attributeIds: ["style.preset"] })).toBeNull(); // a name is required
    expect(createUserPreset(design(), core, { name: "x", attributeIds: ["lighting.preset"] })).toBeNull(); // nothing set → nothing saved
  });

  it("main categories, duplicate", () => {
    const p = save(design(), ["subject.kind", "style.preset", "mood.tone", "camera.angle", "person.hair.primary_color"]);
    expect(userPresetCategories(core, p).length).toBeGreaterThan(1);
    const d = duplicateUserPreset(p, "My look (copy)", NOW, "user_copy1");
    expect(d).toMatchObject({ id: "user_copy1", name: "My look (copy)", patches: p.patches });
  });
});

describe("applying (existing preset path)", () => {
  const withSpec = (spec: ImageSpec): WorkspaceState => ({ ...initialWorkspaceState(core), spec });
  const preset = save(design(), ["style.preset", "mood.tone", "person.hair.primary_color"]);
  const def = userPresetToDefinition(preset);

  it("keeps the user's own values by default, protects locks, leaves other attributes alone; provenance says user preset", () => {
    let target = buildSpec(core, [["subject.kind", single("person")], ["style.preset", single("oil_painting")], ["output.aspect_ratio", single("square")], ["mood.tone", multi("tense")]]);
    target = setLocks(target, ["mood.tone"], true);
    const plan = planPresetDefinition(target, core, def);
    expect(Object.fromEntries(plan.entries.map((e) => [e.attributeId, e.kind]))).toEqual({ "style.preset": "change", "mood.tone": "change", "person.hair.primary_color": "new" });
    expect(writableEntries(plan, "keepUser", new Set(lockedIds(target))).map((e) => e.attributeId)).toEqual(["person.hair.primary_color"]);
    const st = reduce(withSpec(target), { type: "applyPreset", plan, mode: "keepUser" });
    expect(st.spec.selections["style.preset"]!.value).toEqual(single("oil_painting")); // user value kept
    expect(st.spec.selections["mood.tone"]).toBe(target.selections["mood.tone"]); // locked
    expect(st.spec.selections["output.aspect_ratio"]).toBe(target.selections["output.aspect_ratio"]); // outside the preset
    expect(st.spec.selections["person.hair.primary_color"]).toMatchObject({ value: color("#3A7BD5"), source: "preset", origin: { presetId: preset.id } });
    expect(st.spec.selections["person.hair.primary_color"]!.locked).toBeUndefined(); // saved locks only on request
    // "replace my values" still never touches the lock
    const all = reduce(withSpec(target), { type: "applyPreset", plan, mode: "all" });
    expect(all.spec.selections["style.preset"]!.value).toEqual(single("watercolor"));
    expect(all.spec.selections["mood.tone"]).toBe(target.selections["mood.tone"]);
  });

  it("saved locks are applied on request and undone with the application", () => {
    const target = buildSpec(core, [["subject.kind", single("person")]]);
    const plan = planPresetDefinition(target, core, def);
    let st = reduce(withSpec(target), { type: "applyPreset", plan, mode: "keepUser", lockIds: savedLocks(preset) });
    expect(lockedIds(st.spec)).toEqual(["person.hair.primary_color"]);
    st = reduce(st, { type: "undoPreset" });
    expect(st.spec).toEqual(target);
  });

  it("several user presets apply one after another and combine; undo reverts only the last", () => {
    const a = userPresetToDefinition(save(design(), ["style.preset", "camera.angle"], "A"));
    const b = userPresetToDefinition(save(set(design(), "camera.angle", single("high_angle")), ["camera.angle", "mood.tone"], "Bee"));
    let st = withSpec(buildSpec(core, [["subject.kind", single("person")]]));
    st = reduce(st, { type: "applyPreset", plan: planPresetDefinition(st.spec, core, a), mode: "keepUser" });
    const afterA = st.spec;
    st = reduce(st, { type: "applyPreset", plan: planPresetDefinition(st.spec, core, b), mode: "keepUser" });
    expect(st.spec.selections["style.preset"]!.value).toEqual(single("watercolor")); // from A
    expect(st.spec.selections["camera.angle"]!.value).toEqual(single("high_angle")); // B replaced A's preset value
    expect(st.spec.selections["mood.tone"]!.value).toEqual(multi("calm")); // from B
    st = reduce(st, { type: "undoPreset" });
    expect(st.spec).toEqual(afterA);
  });

  it("conflict diagnostics and the safety policy apply as for any preset", () => {
    const risky = userPresetToDefinition(save(buildSpec(core, [["person.identity.age_group", single("child")], ["person.appearance.direction", multi("sexy")]]), ["person.identity.age_group", "person.appearance.direction"], "risky"));
    const st = reduce(withSpec(createEmptySpec(core)), { type: "applyPreset", plan: planPresetDefinition(createEmptySpec(core), core, risky), mode: "keepUser" });
    expect(compilePrompt(st.spec, core).blocked).toBe(true);
    const plan = planPresetDefinition(buildSpec(core, [["mood.tone", multi("cheerful")]]), core, userPresetToDefinition(save(buildSpec(core, [["mood.tone", multi("melancholic")]]), ["mood.tone"], "sad")));
    expect(plan.entries[0]!.kind).toBe("change");
  });
});

describe("library storage, export and import", () => {
  it("round-trips; damaged data loads as an empty library; imports get new ids; invalid patches are dropped and counted", () => {
    const p = save(design(), ["style.preset", "person.hair.primary_color"]);
    const text = exportUserPresets([p]);
    expect(loadUserPresets(text, core)).toEqual([p]);
    expect(loadUserPresets("{oops", core)).toEqual([]);
    expect(loadUserPresets(null, core)).toEqual([]);
    const imported = importUserPresets(text, core, NOW, rand)!;
    expect(imported.presets).toHaveLength(1);
    expect(imported.presets[0]!.id).not.toBe(p.id);
    expect(imported.presets[0]!.patches).toEqual(p.patches);
    // a single preset file works too; unknown attributes and invalid values are dropped
    const bad = { ...p, patches: [...p.patches, { attributeId: "nope.attribute", value: single("x") }, { attributeId: "style.preset", value: single("not_an_option") }] };
    const r = importUserPresets(JSON.stringify(bad), core, NOW, rand)!;
    expect(r.droppedPatches).toBe(2);
    expect(r.presets[0]!.patches).toEqual(p.patches);
    expect(importUserPresets(JSON.stringify({ kind: "prompter.user-presets", version: 1, presets: [{ id: "bad" }] }), core)!.rejected).toBe(1);
    expect(importUserPresets("not json", core)).toBeNull();
  });
});
