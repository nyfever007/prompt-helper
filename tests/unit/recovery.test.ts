import { describe, expect, it } from "vitest";
import { analyzeSpecInput, createEmptySpec, exportSpecJson, getCoreRegistry } from "@/domain";
import { buildSpec, multi, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

describe("partial recovery analysis", () => {
  const base = JSON.parse(
    exportSpecJson(
      buildSpec(core, [
        ["intent.description", text("A quiet harbor")],
        ["subject.kind", single("landscape")],
        ["mood.tone", multi("calm")],
      ]),
    ),
  );

  it("separates usable from unusable parts and keeps originals and reasons for every excluded item", () => {
    const input = {
      ...base,
      note: "hand-edited",
      selections: {
        ...base.selections,
        "mood.tone": { value: { kind: "multi", optionIds: ["calm", "jubilant"] }, source: "user" },
        "lighting.preset": { value: { kind: "single", optionId: "golden_hour" }, source: "robot" },
        "future.attribute": { value: { kind: "text", text: "from a newer build" }, source: "user" },
      },
    };
    const frozen = structuredClone(input);
    const r = analyzeSpecInput(input, core);
    expect(r.status).toBe("recoverable");
    if (r.status !== "recoverable") return;
    expect(r.excluded.map((e) => [e.path, e.diagnostics[0]!.code])).toEqual([
      ["note", "spec.unknown_field"],
      ["selections.future.attribute", "selection.unknown_attribute"],
      ["selections.lighting.preset", "spec.schema"],
      ["selections.mood.tone", "value.unknown_option"],
    ]);
    expect(r.excluded.find((e) => e.path === "selections.future.attribute")!.original).toEqual(input.selections["future.attribute"]);
    // proposal contains exactly the valid parts, unchanged
    expect(r.spec.selections).toEqual({
      "intent.description": base.selections["intent.description"],
      "subject.kind": base.selections["subject.kind"],
    });
    // the input itself is never mutated
    expect(input).toEqual(frozen);
  });

  it("a whole multi-select value is excluded rather than partially rewritten", () => {
    const r = analyzeSpecInput(
      { ...base, selections: { "mood.tone": { value: { kind: "multi", optionIds: ["calm", "jubilant"] }, source: "user" } } },
      core,
    );
    expect(r.status === "recoverable" && r.spec.selections).toEqual({});
  });

  it("a fully valid input is 'valid' with nothing excluded", () => {
    const r = analyzeSpecInput(base, core);
    expect(r.status).toBe("valid");
  });

  it("an empty spec is valid", () => {
    expect(analyzeSpecInput(JSON.parse(exportSpecJson(createEmptySpec(core))), core).status).toBe("valid");
  });
});
