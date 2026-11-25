import { describe, expect, it } from "vitest";
import {
  COALESCE_MS,
  compilePrompt,
  createEmptySpec,
  createSnapshot,
  getCoreRegistry,
  HISTORY_LIMIT,
  lockedIds,
  parseHistory,
  parseSnapshots,
  planPreset,
  resumeHistory,
  serializeHistory,
  serializeSnapshots,
  type ImageSpec,
} from "@/domain";
import { createWorkspaceReducer, initialWorkspaceState, type WorkspaceAction, type WorkspaceState } from "@/state/workspaceReducer";
import { multi, single } from "../fixtures/specs";

/** Sprint 3.4 — multi-step undo / redo, history restore and snapshots over the whole ImageSpec. */
const core = getCoreRegistry();
const reduce = createWorkspaceReducer(core);
let clock = 1_000_000;
/** Apply actions, each one "a while" after the previous unless `gap` says otherwise. */
const run = (state: WorkspaceState, ...actions: Array<WorkspaceAction | [WorkspaceAction, number]>) =>
  actions.reduce((st, a) => {
    const [action, gap] = Array.isArray(a) ? a : [a, 10_000];
    clock += gap;
    return reduce(st, { ...action, time: clock });
  }, state);
const fresh = (): WorkspaceState => initialWorkspaceState(core);
const kinds = (st: WorkspaceState) => st.history.entries.map((e) => e.kind);
const set = (attributeId: string, value = single("watercolor")): WorkspaceAction => ({ type: "set", attributeId, value });

describe("undo / redo", () => {
  it("every kind of action is one step: edits, locks, prompt inclusion, random, presets, resets", () => {
    const concept = planPreset(createEmptySpec(core), core, "concept_vintage_film");
    if (!concept.ok) throw new Error("plan");
    let st = run(
      fresh(),
      set("style.preset"),
      { type: "lock", attributeIds: ["style.preset"], locked: true },
      set("person.body.leg_alignment", single("straight")),
      { type: "setExcluded", attributeId: "person.body.leg_alignment", excluded: true },
      { type: "applyRandom", seed: 3, style: "chaos" },
      { type: "applyPreset", plan: concept.value, mode: "keepUser" },
      { type: "resetCategory", categoryId: "shared_camera" },
      { type: "reset" },
    );
    expect(kinds(st)).toEqual(["start", "edit", "lock", "edit", "output", "random", "preset", "categoryReset", "reset"]);
    const states = st.history.entries.map((e) => e.spec);
    // undo all the way back, one step at a time, then redo all the way forward
    for (let i = states.length - 2; i >= 0; i--) {
      st = run(st, { type: "undo" });
      expect(st.spec).toBe(states[i]);
    }
    expect(run(st, { type: "undo" })).toBe(st); // nothing left to undo
    for (let i = 1; i < states.length; i++) {
      st = run(st, { type: "redo" });
      expect(st.spec).toBe(states[i]);
    }
  });

  it("a random run is ONE entry whatever it changes; its changed count is recorded", () => {
    const st = run(fresh(), { type: "applyRandom", seed: 5, style: "chaos" });
    expect(st.history.entries).toHaveLength(2);
    expect(st.history.entries[1]!.changed).toBe(Object.keys(st.spec.selections).length);
  });

  it("a new action after undo drops the redo branch", () => {
    let st = run(fresh(), set("style.preset"), set("camera.angle", single("low_angle")));
    st = run(st, { type: "undo" });
    expect(st.history.index).toBe(1);
    st = run(st, set("mood.tone", multi("calm")));
    expect(kinds(st)).toEqual(["start", "edit", "edit"]);
    expect(st.history.entries[2]!.detail).toBe("mood.tone");
    expect(run(st, { type: "redo" })).toBe(st);
  });

  it("slider drags / typing on one attribute are one entry; another attribute or a pause starts a new one", () => {
    let st = run(fresh(), [set("person.body.height", { kind: "number", value: 1 }), 0], [set("person.body.height", { kind: "number", value: 2 }), 200], [set("person.body.height", { kind: "number", value: 3 }), 200]);
    expect(st.history.entries).toHaveLength(2);
    expect(st.spec.selections["person.body.height"]!.value).toEqual({ kind: "number", value: 3 });
    st = run(st, [set("person.body.height", { kind: "number", value: 4 }), COALESCE_MS + 1]); // a pause
    st = run(st, [set("person.body.frame", { kind: "number", value: 1 }), 100]); // another attribute
    expect(st.history.entries).toHaveLength(4);
    st = run(st, { type: "undo" }, { type: "undo" });
    expect(st.spec.selections["person.body.height"]!.value).toEqual({ kind: "number", value: 3 });
    st = run(st, { type: "undo" });
    expect(st.spec.selections).toEqual({});
  });

  it("separate option clicks stay separate steps even in quick succession; typing a text is one step", () => {
    let st = run(fresh(), [set("style.preset", single("watercolor")), 0], [set("style.preset", single("oil_painting")), 100]);
    expect(st.history.entries).toHaveLength(3);
    st = run(st, ...["A", "A q", "A qu", "A qui"].map((text): [WorkspaceAction, number] => [{ type: "set", attributeId: "intent.description", value: { kind: "text", text } }, 150]));
    expect(st.history.entries).toHaveLength(4);
  });

  it("keeps at most HISTORY_LIMIT entries (oldest dropped)", () => {
    let st = fresh();
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) st = run(st, set("style.preset", single(i % 2 ? "oil_painting" : "watercolor")));
    expect(st.history.entries).toHaveLength(HISTORY_LIMIT);
    expect(st.history.index).toBe(HISTORY_LIMIT - 1);
  });
});

describe("restore", () => {
  it("restores the whole past state — values, locks, exclusion, sources — as a new, undoable entry", () => {
    let st = run(fresh(), set("style.preset"), { type: "setExcluded", attributeId: "style.preset", excluded: true });
    const past = st.history.entries[st.history.index]!;
    st = run(st, { type: "setExcluded", attributeId: "style.preset", excluded: false }, { type: "lock", attributeIds: ["style.preset"], locked: true });
    // a normal edit respects the lock…
    expect(run(st, set("style.preset", single("oil_painting")))).toBe(st);
    // …an explicit restore brings back that exact past state (unlocked, excluded)
    const restored = run(st, { type: "restoreHistory", id: past.id });
    expect(restored.spec).toBe(past.spec);
    expect(lockedIds(restored.spec)).toEqual([]);
    expect(restored.spec.selections["style.preset"]!.excludedFromPrompt).toBe(true);
    expect(kinds(restored).at(-1)).toBe("restore");
    expect(run(restored, { type: "undo" }).spec).toBe(st.spec); // the restore itself can be undone
  });

  it("restoring a past state that the current safety policy holds is shown as held (the check always runs)", () => {
    let st = run(fresh(), set("person.identity.age_group", single("child")), set("person.appearance.direction", multi("sexy")));
    const held = st.spec;
    st = run(st, { type: "reset" });
    st = run(st, { type: "restoreHistory", id: st.history.entries.find((e) => e.spec === held)!.id });
    expect(compilePrompt(st.spec, core).blocked).toBe(true);
  });

  it("a snapshot restore is one entry with its name; undo returns", () => {
    const st = run(fresh(), set("style.preset"));
    const snap = createSnapshot(st.spec, "Look A")!;
    let next = run(st, set("camera.angle", single("low_angle")), { type: "restoreSnapshot", spec: snap.spec, name: snap.name });
    expect(next.history.entries.at(-1)).toMatchObject({ kind: "snapshot", detail: "Look A" });
    expect(Object.keys(next.spec.selections)).toEqual(["style.preset"]);
    next = run(next, { type: "undo" });
    expect(Object.keys(next.spec.selections).sort()).toEqual(["camera.angle", "style.preset"]);
  });
});

describe("storage", () => {
  it("history round-trips (whole specs incl. locks and custom colors); damaged data is ignored; invalid entries are dropped", () => {
    let st = run(fresh(), set("person.hair.primary_color", { kind: "single", custom: { label: "#3A7BD5", color: "#3A7BD5" } }), { type: "lock", attributeIds: ["person.hair.primary_color"], locked: true }, { type: "undo" });
    const text = serializeHistory(st.history, core.id);
    const back = parseHistory(text, core)!;
    expect(back.index).toBe(st.history.index);
    expect(back.entries.map((e) => e.spec)).toEqual(st.history.entries.map((e) => e.spec));
    expect(parseHistory("{bad", core)).toBeNull();
    const raw = JSON.parse(text);
    raw.entries[1].spec.selections["style.preset"] = { value: { kind: "single", optionId: "no_such_style" }, source: "user" };
    expect(parseHistory(JSON.stringify(raw), core)!.entries).toHaveLength(st.history.entries.length - 1);
    st = { ...st, history: back };
    expect(run(st, { type: "redo" }).spec.selections["person.hair.primary_color"]!.locked).toBe(true); // redo survives a reload
  });

  it("a reload continues the stored history when the design is the same, otherwise adds the loaded design", () => {
    const st = run(fresh(), set("style.preset"));
    const stored = parseHistory(serializeHistory(st.history, core.id), core);
    expect(resumeHistory(stored, st.spec, 1).entries).toHaveLength(2);
    const other: ImageSpec = { ...st.spec, selections: {} };
    const resumed = resumeHistory(stored, other, 1);
    expect(resumed.entries.map((e) => e.kind)).toEqual(["start", "edit", "start"]);
    expect(resumed.index).toBe(2);
  });

  it("snapshots round-trip; invalid ones are dropped", () => {
    const spec = run(fresh(), set("style.preset")).spec;
    const a = createSnapshot(spec, " Look ")!;
    expect(a.name).toBe("Look");
    expect(createSnapshot(spec, "  ")).toBeNull();
    const text = serializeSnapshots([a]);
    expect(parseSnapshots(text, core)).toEqual([a]);
    const raw = JSON.parse(text);
    raw.snapshots.push({ id: "x", name: "bad", at: "now", spec: { kind: "nope" } });
    expect(parseSnapshots(JSON.stringify(raw), core)).toEqual([a]);
    expect(parseSnapshots("oops", core)).toEqual([]);
  });
});
