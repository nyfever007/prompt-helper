import { describe, expect, it } from "vitest";
import {
  applyPresetPlan,
  applyRandomComposition,
  applySelection,
  compilePrompt,
  composeRandom,
  createEmptySpec,
  getCoreRegistry,
  isAttributeActive,
  isOptionAttribute,
  isRandomSelection,
  planPreset,
  setPromptExclusion,
  undoPresetTransaction,
  RANDOM_STYLES,
  type ImageSpec,
  type RandomStyle,
} from "@/domain";
import { buildSpec, multi, single } from "../fixtures/specs";

/**
 * Sprint 2-D.6 — Random Composer: whole-catalog random values, user values kept, regeneration, undo, safety.
 * Since Sprint 2-D.7 the whole-catalog generation is the `chaos` style (unchanged); ownership, undo and
 * safety guarantees are checked for every style.
 */
const core = getCoreRegistry();
const run = (spec: ImageSpec, seed: number, style: RandomStyle = "chaos") => applyRandomComposition(spec, core, composeRandom(spec, core, seed, style));
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 1);

describe("Random Composer", () => {
  it.each(SEEDS)("seed %i: from nothing → a person design over the whole catalog, every value valid and applicable, output not held", (seed) => {
    const { spec } = run(createEmptySpec(core), seed);
    const ids = Object.keys(spec.selections);
    expect(spec.selections["subject.kind"]!.value).toEqual(single("person"));
    expect(ids.length).toBeGreaterThan(150); // no arbitrary cap: everything applicable is filled
    for (const id of ids) {
      const sel = spec.selections[id]!;
      const a = core.getAttribute(id)!;
      expect(isRandomSelection(sel), id).toBe(true);
      expect(isAttributeActive(core, a, spec), id).toBe(true);
      expect(sel.value.kind === "single" && "custom" in sel.value, id).toBe(false); // never invents custom values
      if (isOptionAttribute(a)) for (const oid of sel.value.kind === "single" && "optionId" in sel.value ? [sel.value.optionId] : sel.value.kind === "multi" ? sel.value.optionIds : []) expect(a.options.some((o) => o.id === oid), `${id}:${oid}`).toBe(true);
      if (a.type === "number" && sel.value.kind === "number") expect(sel.value.value >= a.min && sel.value.value <= a.max, id).toBe(true);
    }
    // areas across the whole catalog
    for (const prefix of ["person.identity.", "person.face.", "person.eyes.", "person.skin.", "person.hair.", "person.body.", "person.expression.", "person.makeup.", "person.clothing.", "person.accessories.", "person.pose.", "camera.", "composition.", "lighting.", "scene.", "mood.", "style.", "output."])
      expect(ids.some((id) => id.startsWith(prefix)), prefix).toBe(true);
    // composition policy: adult age group only, no exact ages, no innerwear, no sexual-appeal wording
    const age = spec.selections["person.identity.age_group"];
    if (age) expect(["young_adult", "adult", "middle_aged", "older_adult", "advanced_age", "ageless"]).toContain((age.value as { optionId: string }).optionId);
    expect(ids.filter((id) => id === "person.identity.age" || id === "person.identity.apparent_age" || id.startsWith("person.clothing.innerwear."))).toEqual([]);
    expect(ids.some((id) => id === "intent.description" || id === "person.identity.description")).toBe(false); // free text stays unset
    expect(compilePrompt(spec, core).blocked).toBe(false);
  });

  it.each(RANDOM_STYLES)("%s: keeps the user's values, a concept's values and an excluded value; regenerates only random values", (style) => {
    let spec = buildSpec(core, [["person.identity.gender", single("woman")], ["style.preset", single("watercolor")]]);
    const concept = planPreset(spec, core, "concept_vintage_film");
    if (!concept.ok) throw new Error("plan");
    spec = applyPresetPlan(spec, core, concept.value, "keepUser").spec;
    const first = run(spec, 11, style).spec;
    expect(first.selections["person.identity.gender"]).toEqual(spec.selections["person.identity.gender"]);
    expect(first.selections["style.preset"]).toEqual(spec.selections["style.preset"]);
    expect(first.selections["lighting.color_temperature"]).toEqual(spec.selections["lighting.color_temperature"]); // from the concept
    // the user edits one random value and excludes another from the prompt
    const edited = applySelection(first, core, "camera.angle", single("worms_eye"), "user");
    if (!edited.ok) throw new Error("edit");
    const excludedId = Object.keys(first.selections).find((id) => isRandomSelection(first.selections[id]) && id.startsWith("person.hair."))!;
    const mine = setPromptExclusion(edited.value, excludedId, true);
    const second = run(mine, 12, style).spec;
    expect(second.selections["camera.angle"]!.value).toEqual(single("worms_eye"));
    expect(second.selections["camera.angle"]!.source).toBe("user");
    expect(second.selections[excludedId]).toEqual(mine.selections[excludedId]);
    // other random values were regenerated
    const regenerated = Object.keys(first.selections).filter((id) => isRandomSelection(first.selections[id]) && JSON.stringify(first.selections[id]) !== JSON.stringify(second.selections[id]));
    expect(regenerated.length).toBeGreaterThan(20);
  });

  it.each(RANDOM_STYLES)("%s: undoes the last run exactly, including values a run removed", (style) => {
    const start = buildSpec(core, [["subject.kind", single("person")]]);
    const a = run(start, 1, style);
    const b = run(a.spec, 2, "natural"); // switching styles between runs is a normal regeneration
    expect(undoPresetTransaction(b.spec, b.transaction).spec).toEqual(a.spec);
    expect(undoPresetTransaction(a.spec, a.transaction).spec).toEqual(start);
  });

  it.each(RANDOM_STYLES)("%s: is deterministic per seed and follows a subject the user chose", (style) => {
    expect(composeRandom(createEmptySpec(core), core, 5, style)).toEqual(composeRandom(createEmptySpec(core), core, 5, style));
    const { spec } = run(buildSpec(core, [["subject.kind", single("landscape")]]), 3, style);
    expect(Object.keys(spec.selections).some((id) => id.startsWith("person."))).toBe(false);
    expect(Object.keys(spec.selections).some((id) => id.startsWith("scene.") || id.startsWith("lighting."))).toBe(true);
  });

  it.each(RANDOM_STYLES)("%s: never changes the user's age or bypasses safety: a hold caused by the user's own values stays", (style) => {
    const risky = buildSpec(core, [["person.identity.age_group", single("child")], ["person.appearance.direction", multi("sexy")]]);
    expect(compilePrompt(risky, core).blocked).toBe(true);
    const { spec } = run(risky, 4, style);
    expect(spec.selections["person.identity.age_group"]).toEqual(risky.selections["person.identity.age_group"]);
    expect(spec.selections["person.appearance.direction"]).toEqual(risky.selections["person.appearance.direction"]);
    expect(compilePrompt(spec, core).blocked).toBe(true); // existing block and guidance are kept
  });

  it("example: one random design (printed for the sprint report)", () => {
    const { spec } = run(createEmptySpec(core), 20261125);
    const c = compilePrompt(spec, core);
    expect(c.prompt.length).toBeGreaterThan(500);
    if (process.env.PRINT_RANDOM_EXAMPLE) console.log(`${Object.keys(spec.selections).length} values\n${c.prompt}`);
  });
});
