import { describe, expect, it } from "vitest";
import { applyPresetPlan, compilePrompt, createEmptySpec, getCoreRegistry, planPreset, undoPresetTransaction, writableEntries, type ImageSpec } from "@/domain";
import { recommendedPresets } from "@/domain/catalog/catalogs/recommended";
import { buildSpec, single } from "../fixtures/specs";

/** Sprint 2-D.5 — recommended concepts are product presets on the existing plan → confirm → apply → undo path. */
const core = getCoreRegistry();
const plan = (spec: ImageSpec, id: string) => {
  const p = planPreset(spec, core, id);
  if (!p.ok) throw new Error(id);
  return p.value;
};
/** Identity, body and appearance are never inferred from a concept. */
const FORBIDDEN = /^person\.(identity|body|face|eyes|eyebrows|nose|lips|skin|hair|facial_hair|appearance|makeup|expression)\./;

describe("recommended concepts", () => {
  it("there are the 12 approved concepts, none tied to a category", () => {
    const concepts = core.presets.filter((p) => !p.categoryId);
    expect(concepts.map((p) => p.label.en)).toEqual([
      "Natural Lifestyle", "Fashion Editorial", "Cinematic Character", "Fantasy Character", "Cyberpunk", "Romance Webtoon",
      "Professional Portrait", "Vintage Film", "Dreamlike Art", "Travel & Outdoor", "Sports & Action", "Artistic Portrait",
    ]);
    expect(concepts.every((p) => p.status === "approved" && p.label.ko && p.description?.ko)).toBe(true);
  });

  it.each(recommendedPresets.map((p) => p.id))("%s: suggests a direction only; applies cleanly to an empty spec", (id) => {
    const p = plan(createEmptySpec(core), id);
    const ids = p.entries.map((e) => e.attributeId);
    expect(ids.filter((a) => FORBIDDEN.test(a)), "never sets identity, body or appearance").toEqual([]);
    expect(ids.length).toBeLessThan(15); // a direction, not a complete specification
    expect(p.entries.map((e) => e.kind)).toEqual(ids.map(() => "new")); // every suggestion applies
    expect(p.conflictsAfter).toEqual([]);
    const applied = applyPresetPlan(createEmptySpec(core), core, p, "keepUser").spec;
    const c = compilePrompt(applied, core);
    expect(c.blocked).toBe(false);
    expect(c.diagnostics.filter((d) => d.severity === "warning" || d.severity === "error")).toEqual([]);
  });

  it("keepUser keeps the user's own values, replaces values from an earlier concept, and is undone like any preset", () => {
    const start = buildSpec(core, [["mood.tone", { kind: "multi", optionIds: ["melancholic"] }], ["output.aspect_ratio", single("square")]]);
    const first = applyPresetPlan(start, core, plan(start, "concept_vintage_film"), "keepUser").spec;
    expect(first.selections["mood.tone"]!.value).toEqual({ kind: "multi", optionIds: ["melancholic"] }); // the user's value stays
    expect(first.selections["output.aspect_ratio"]!.value).toEqual(single("square"));
    expect(first.selections["lighting.color_temperature"]!.source).toBe("preset");

    // a second concept replaces the first concept's values but still not the user's
    const p2 = plan(first, "concept_cyberpunk");
    expect(writableEntries(p2, "keepUser").map((e) => e.attributeId)).toContain("lighting.color_temperature");
    const { spec: second, transaction } = applyPresetPlan(first, core, p2, "keepUser");
    expect(second.selections["lighting.color_temperature"]!.value).toEqual(single("mixed_color"));
    expect(second.selections["mood.tone"]!.value).toEqual({ kind: "multi", optionIds: ["melancholic"] });
    expect(second.selections["output.aspect_ratio"]!.value).toEqual(single("square"));

    // undo restores exactly the previous state
    expect(undoPresetTransaction(second, transaction).spec).toEqual(first);
    // the explicit “replace” choice also replaces the user's values
    expect(applyPresetPlan(first, core, plan(first, "concept_cyberpunk"), "all").spec.selections["output.aspect_ratio"]!.value).toEqual(single("landscape_16_9"));
  });
});
