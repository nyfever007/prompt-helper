import { describe, expect, it } from "vitest";
import {
  applyPresetPlan,
  applyRandomComposition,
  compilePrompt,
  composeRandom,
  createEmptySpec,
  exportSpecJson,
  getCoreRegistry,
  isRandomSelection,
  importSpecJson,
  lockedIds,
  planPreset,
  RANDOM_STYLES,
  resetCategory,
  setLocks,
  undoPresetTransaction,
  viewPrompt,
  writableEntries,
  type ImageSpec,
} from "@/domain";
import { createWorkspaceReducer, initialWorkspaceState, type WorkspaceState } from "@/state/workspaceReducer";
import { buildSpec, multi, single } from "../fixtures/specs";

/**
 * Sprint 3.1 — attribute locks: kept by every bulk change, editable only after unlocking, independent of exclusion and safety.
 * Since Sprint 3.2 the lock is stored in the spec (`selection.locked`, ImageSpec 0.4.0).
 */
const core = getCoreRegistry();
const reduce = createWorkspaceReducer(core);
const random = (spec: ImageSpec, seed: number, style: (typeof RANDOM_STYLES)[number] = "chaos", locked = new Set<string>()) =>
  applyRandomComposition(spec, core, composeRandom(spec, core, seed, style, locked));
const plan = (spec: ImageSpec, id: string) => {
  const p = planPreset(spec, core, id);
  if (!p.ok) throw new Error(id);
  return p.value;
};

describe("lock list", () => {
  it("only set attributes can be locked; a lock changes nothing but the flag; unlocking removes it", () => {
    const spec = buildSpec(core, [["style.preset", single("watercolor")], ["mood.tone", multi("calm")]]);
    const locked = setLocks(spec, ["mood.tone", "style.preset", "camera.angle"], true);
    expect(lockedIds(locked)).toEqual(["mood.tone", "style.preset"]);
    expect("camera.angle" in locked.selections).toBe(false);
    const { locked: flag, ...rest } = locked.selections["style.preset"]!;
    expect(flag).toBe(true);
    expect(rest).toEqual(spec.selections["style.preset"]);
    const unlocked = setLocks(locked, ["mood.tone"], false);
    expect(lockedIds(unlocked)).toEqual(["style.preset"]);
    expect(unlocked.selections["mood.tone"]).toEqual(spec.selections["mood.tone"]);
    expect(setLocks(spec, ["camera.angle"], true)).toBe(spec); // nothing to lock: same spec
  });
});

describe.each(RANDOM_STYLES)("random (%s)", (style) => {
  it("a locked random value is kept and not regenerated; unlocked random values are", () => {
    const first = random(createEmptySpec(core), 1, style).spec;
    const pinned = Object.keys(first.selections).filter((id) => isRandomSelection(first.selections[id])).slice(0, 5);
    const second = random(first, 2, style, new Set(pinned)).spec;
    for (const id of pinned) expect(second.selections[id], id).toBe(first.selections[id]); // same object: untouched
    const regenerated = Object.keys(first.selections).filter((id) => !pinned.includes(id) && JSON.stringify(first.selections[id]) !== JSON.stringify(second.selections[id]));
    expect(regenerated.length).toBeGreaterThan(5);
  });
});

describe("presets and concepts", () => {
  it("no apply mode — not even “replace everything” — writes a locked value; undo keeps it too", () => {
    const start = buildSpec(core, [["output.aspect_ratio", single("square")], ["mood.tone", multi("melancholic")]]);
    const p = plan(start, "concept_cyberpunk");
    const locked = new Set(["output.aspect_ratio"]);
    expect(writableEntries(p, "all").map((e) => e.attributeId)).toContain("output.aspect_ratio");
    expect(writableEntries(p, "all", locked).map((e) => e.attributeId)).not.toContain("output.aspect_ratio");
    for (const mode of ["all", "keepUser", "onlyEmpty"] as const) {
      const { spec } = applyPresetPlan(start, core, p, mode, locked);
      expect(spec.selections["output.aspect_ratio"], mode).toBe(start.selections["output.aspect_ratio"]);
    }
    // a value the concept wrote, then locked, survives the concept's undo
    const { spec: applied, transaction } = applyPresetPlan(start, core, p, "keepUser");
    const conceptId = transaction.changes[0]!.attributeId;
    const undone = undoPresetTransaction(applied, transaction, new Set([conceptId]));
    expect(undone.spec.selections[conceptId]).toBe(applied.selections[conceptId]);
    expect(undone.kept).toContain(conceptId);
  });
});

describe("resets", () => {
  it("a category reset keeps locked values and reports them", () => {
    const spec = buildSpec(core, [["camera.angle", single("low_angle")], ["camera.lens_type", single("standard")], ["style.preset", single("watercolor")]]);
    const r = resetCategory(spec, core, "shared_camera", new Set(["camera.angle"]));
    expect(r.kept).toEqual(["camera.angle"]);
    expect(Object.keys(r.removed)).toEqual(["camera.lens_type"]);
    expect(r.spec.selections["camera.angle"]).toBe(spec.selections["camera.angle"]);
    expect(r.spec.selections["style.preset"]).toBe(spec.selections["style.preset"]);
  });
});

describe("workspace reducer", () => {
  const withSpec = (spec: ImageSpec): WorkspaceState => ({ ...initialWorkspaceState(core), spec });
  const base = buildSpec(core, [["style.preset", single("watercolor")], ["camera.angle", single("low_angle")], ["output.aspect_ratio", single("square")]]);

  it("a locked value cannot be changed or cleared until unlocked; prompt exclusion stays independent", () => {
    let st = reduce(withSpec(base), { type: "lock", attributeIds: ["style.preset"], locked: true });
    expect(lockedIds(st.spec)).toEqual(["style.preset"]);
    expect(reduce(st, { type: "set", attributeId: "style.preset", value: single("oil_painting") })).toBe(st);
    expect(reduce(st, { type: "clear", attributeId: "style.preset" })).toBe(st);
    // exclusion works on a locked value and keeps the lock
    const excluded = reduce(st, { type: "setExcluded", attributeId: "style.preset", excluded: true });
    expect(excluded.spec.selections["style.preset"]!.excludedFromPrompt).toBe(true);
    expect(lockedIds(excluded.spec)).toEqual(["style.preset"]);
    // unlock → editable again
    st = reduce(st, { type: "lock", attributeIds: ["style.preset"], locked: false });
    expect(reduce(st, { type: "set", attributeId: "style.preset", value: single("oil_painting") }).spec.selections["style.preset"]!.value).toEqual(single("oil_painting"));
  });

  it("random runs, concepts, category resets and a full reset keep locked values; unlock all releases every lock", () => {
    let st = reduce(withSpec(base), { type: "lock", attributeIds: ["camera.angle", "output.aspect_ratio"], locked: true });
    const pinned = { ...st.spec.selections };
    st = reduce(st, { type: "applyRandom", seed: 3, style: "chaos" });
    expect(st.spec.selections["camera.angle"]).toBe(pinned["camera.angle"]);
    st = reduce(st, { type: "applyPreset", plan: plan(st.spec, "concept_cyberpunk"), mode: "all" });
    expect(st.spec.selections["output.aspect_ratio"]).toBe(pinned["output.aspect_ratio"]);
    st = reduce(st, { type: "resetCategory", categoryId: "shared_camera" });
    expect(st.spec.selections["camera.angle"]).toBe(pinned["camera.angle"]);
    st = reduce(st, { type: "reset" });
    expect(Object.keys(st.spec.selections).sort()).toEqual(["camera.angle", "output.aspect_ratio"]);
    expect(lockedIds(st.spec)).toEqual(["camera.angle", "output.aspect_ratio"]);
    st = reduce(st, { type: "unlockAll" });
    expect(lockedIds(st.spec)).toEqual([]);
  });

  it("a random value can be locked without editing it (source and provenance unchanged)", () => {
    let st = reduce(withSpec(createEmptySpec(core)), { type: "applyRandom", seed: 5, style: "natural" });
    const id = Object.keys(st.spec.selections).find((k) => k.startsWith("person.hair."))!;
    const random = st.spec.selections[id]!;
    st = reduce(st, { type: "lock", attributeIds: [id], locked: true });
    const before = st.spec.selections[id];
    expect(before).toEqual({ ...random, locked: true }); // same value, source and origin
    expect(isRandomSelection(st.spec.selections[id])).toBe(true);
    st = reduce(st, { type: "applyRandom", seed: 6, style: "natural" });
    expect(st.spec.selections[id]).toBe(before);
    // undo of that run keeps it as well
    st = reduce(st, { type: "undoPreset" });
    expect(st.spec.selections[id]).toBe(before);
  });

  it("a design brings its own locks: replacing the spec (import, recovery) uses the new design's locks", () => {
    const st = reduce(withSpec(base), { type: "lock", attributeIds: ["style.preset"], locked: true });
    expect(lockedIds(reduce(st, { type: "replace", spec: createEmptySpec(core) }).spec)).toEqual([]);
    const other = reduce(withSpec(createEmptySpec(core)), { type: "replace", spec: st.spec });
    expect(lockedIds(other.spec)).toEqual(["style.preset"]);
  });

  it("safety: a locked value is checked like any other — a hold caused by it stays", () => {
    const risky = buildSpec(core, [["person.identity.age_group", single("child")], ["person.appearance.direction", multi("sexy")]]);
    let st = reduce(withSpec(risky), { type: "lock", attributeIds: ["person.identity.age_group", "person.appearance.direction"], locked: true });
    st = reduce(st, { type: "applyRandom", seed: 9, style: "natural" });
    expect(compilePrompt(st.spec, core).blocked).toBe(true);
  });
});

describe("prompt detail", () => {
  it("a locked random detail is kept in Balanced and Compact like the user's own", () => {
    const spec = random(createEmptySpec(core), 7).spec;
    const c = compilePrompt(spec, core);
    const dropped = viewPrompt(c, spec, core, "compact").omitted.find((o) => o.reason === "detail")!.attributeId;
    expect(viewPrompt(c, spec, core, "balanced", { locked: new Set([dropped]) }).fragments.some((f) => f.attributeId === dropped)).toBe(true);
  });
});

describe("lock persistence (ImageSpec 0.4.0)", () => {
  it("JSON export carries the locks; importing restores them", () => {
    const spec = buildSpec(core, [["style.preset", single("watercolor")], ["mood.tone", multi("calm")]]);
    const locked = reduce({ ...initialWorkspaceState(core), spec }, { type: "lock", attributeIds: ["style.preset"], locked: true });
    const json = exportSpecJson(locked.spec);
    expect(JSON.parse(json).selections["style.preset"].locked).toBe(true);
    expect(JSON.parse(json).selections["mood.tone"].locked).toBeUndefined();
    const back = importSpecJson(json, core);
    expect(back.status).toBe("valid");
    if (back.status === "valid") expect(lockedIds(back.spec)).toEqual(["style.preset"]);
  });

  it("unlocking removes the field (an unlocked design exports exactly as before locking)", () => {
    const spec = buildSpec(core, [["style.preset", single("watercolor")]]);
    let st = reduce({ ...initialWorkspaceState(core), spec }, { type: "lock", attributeIds: ["style.preset"], locked: true });
    st = reduce(st, { type: "unlockAll" });
    expect(exportSpecJson(st.spec)).toBe(exportSpecJson(spec));
  });
});
