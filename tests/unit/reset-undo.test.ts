import { describe, expect, it } from "vitest";
import { getCoreRegistry } from "@/domain";
import { createWorkspaceReducer, initialWorkspaceState, type WorkspaceState } from "@/state/workspaceReducer";
import { multi, single, text } from "../fixtures/specs";

const core = getCoreRegistry();
const reduce = createWorkspaceReducer(core);
const run = (s: WorkspaceState, ...actions: Parameters<typeof reduce>[1][]) => actions.reduce(reduce, s);

describe("reset and undo (single in-session snapshot)", () => {
  const filled = run(
    initialWorkspaceState(core),
    { type: "set", attributeId: "subject.kind", value: single("person") },
    { type: "set", attributeId: "mood.tone", value: multi("calm") },
    { type: "set", attributeId: "intent.description", value: text("before reset") },
  );

  it("reset clears every attribute and keeps one snapshot of the state right before it", () => {
    const after = reduce(filled, { type: "reset" });
    expect(after.spec.selections).toEqual({});
    expect(after.resetSnapshot).toBe(filled.spec);
  });

  it("the snapshot survives further edits (approved #10)", () => {
    const after = run(filled, { type: "reset" }, { type: "set", attributeId: "subject.kind", value: single("animal") }, { type: "clear", attributeId: "subject.kind" });
    expect(after.resetSnapshot).toBe(filled.spec);
  });

  it("restoring brings back the exact pre-reset spec (replacing current edits) and consumes the snapshot", () => {
    const edited = run(filled, { type: "reset" }, { type: "set", attributeId: "style.preset", value: single("anime") });
    const restored = reduce(edited, { type: "restoreResetSnapshot" });
    expect(restored.spec).toBe(filled.spec);
    expect(restored.resetSnapshot).toBeNull();
  });

  it("resetting an already-empty spec does not destroy the existing snapshot", () => {
    const after = run(filled, { type: "reset" }, { type: "reset" });
    expect(after.resetSnapshot).toBe(filled.spec);
  });

  it("a later non-empty reset replaces the snapshot (single snapshot only)", () => {
    const second = run(filled, { type: "reset" }, { type: "set", attributeId: "subject.kind", value: single("vehicle") });
    const after = reduce(second, { type: "reset" });
    expect(after.resetSnapshot).toBe(second.spec);
  });

  it("restore without a snapshot is a no-op", () => {
    const s = initialWorkspaceState(core);
    expect(reduce(s, { type: "restoreResetSnapshot" })).toBe(s);
  });
});

describe("transitions: newly inapplicable / reactivated selections are reported", () => {
  it("reports framing becoming inapplicable and applicable again", () => {
    const s = run(
      initialWorkspaceState(core),
      { type: "set", attributeId: "subject.kind", value: single("person") },
      { type: "set", attributeId: "composition.framing", value: single("full_body") },
      { type: "set", attributeId: "subject.kind", value: single("landscape") },
    );
    expect(s.transition?.newlyInactive).toEqual([{ attributeId: "composition.framing", scope: "option", optionIds: ["full_body"] }]);
    const back = reduce(s, { type: "set", attributeId: "subject.kind", value: single("person") });
    expect(back.transition?.reactivated).toEqual([{ attributeId: "composition.framing", scope: "option", optionIds: ["full_body"] }]);
    expect(back.transition!.id).toBeGreaterThan(s.transition!.id);
  });

  it("invalid actions leave the state untouched", () => {
    const s = initialWorkspaceState(core);
    expect(reduce(s, { type: "set", attributeId: "subject.kind", value: single("dragon") })).toBe(s);
    expect(reduce(s, { type: "clear", attributeId: "subject.kind" })).toBe(s);
  });
});
