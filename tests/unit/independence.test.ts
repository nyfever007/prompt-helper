import { describe, expect, it } from "vitest";
import { applySelection, clearSelection, compilePrompt, createEmptySpec, getCoreRegistry, type CatalogRegistry, type ImageSpec } from "@/domain";
import { extendedRegistry, sampleValues } from "../fixtures/catalogs";
import { buildSpec, multi, single } from "../fixtures/specs";

const deepFreeze = <T,>(v: T): T => {
  if (v && typeof v === "object") {
    Object.freeze(v);
    Object.values(v).forEach(deepFreeze);
  }
  return v;
};

const fullSpec = (reg: CatalogRegistry): ImageSpec =>
  reg.attributes().reduce((spec, a) => {
    const r = applySelection(spec, reg, a.id, sampleValues(a)[0]);
    if (!r.ok) throw new Error(a.id);
    return r.value;
  }, createEmptySpec(reg));

describe.each([
  ["core catalog", getCoreRegistry()],
  ["extended catalog", extendedRegistry()],
])("4. attributes change independently — %s", (_name, reg) => {
  const attrs = reg.attributes();

  it("changing any attribute A leaves every other attribute B identical (all pairs)", () => {
    const base = deepFreeze(fullSpec(reg));
    expect(Object.keys(base.selections).length).toBe(attrs.length);
    for (const a of attrs) {
      const r = applySelection(base, reg, a.id, sampleValues(a)[1]);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.value.selections[a.id]!.value).toEqual(sampleValues(a)[1]);
      for (const b of attrs) {
        if (b.id === a.id) continue;
        // same object reference = provably untouched
        expect(r.value.selections[b.id], `${a.id} changed ${b.id}`).toBe(base.selections[b.id]);
      }
      expect(Object.keys(r.value.selections).sort()).toEqual(Object.keys(base.selections).sort());
    }
  });

  it("clearing any attribute A leaves every other attribute set and unchanged", () => {
    const base = deepFreeze(fullSpec(reg));
    for (const a of attrs) {
      const cleared = clearSelection(base, a.id);
      expect(a.id in cleared.selections).toBe(false);
      for (const b of attrs) if (b.id !== a.id) expect(cleared.selections[b.id]).toBe(base.selections[b.id]);
    }
  });

  it("operations never mutate their input (frozen input does not throw)", () => {
    const base = deepFreeze(createEmptySpec(reg));
    expect(() => applySelection(base, reg, "subject.kind", single("animal"))).not.toThrow();
    expect(base.selections).toEqual({});
  });
});

describe("4b. independence of the Basic Composer dimensions (core)", () => {
  const core = getCoreRegistry();

  it("framing, viewing direction and camera angle are separate attributes and never change each other", () => {
    let spec = buildSpec(core, [
      ["subject.kind", single("person")],
      ["composition.framing", single("full_body")],
      ["composition.view_direction", single("three_quarter")],
      ["camera.angle", single("low_angle")],
    ]);
    const before = spec;
    const r = applySelection(spec, core, "camera.angle", single("high_angle"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    spec = r.value;
    expect(spec.selections["composition.framing"]).toBe(before.selections["composition.framing"]);
    expect(spec.selections["composition.view_direction"]).toBe(before.selections["composition.view_direction"]);
  });

  it("choosing a style or lighting PRESET sets only that attribute (classification is never applied)", () => {
    const spec = buildSpec(core, [
      ["style.preset", single("anime")],
      ["lighting.preset", single("golden_hour")],
    ]);
    expect(Object.keys(spec.selections).sort()).toEqual(["lighting.preset", "style.preset"]);
    for (const axis of ["style.medium", "style.realism", "style.technique", "style.aesthetic", "lighting.source", "lighting.direction", "lighting.softness", "lighting.color_temperature"]) {
      expect(axis in spec.selections, axis).toBe(false);
    }
    // the prompt contains only the preset phrases — no axis text is invented
    expect(compilePrompt(spec, core).prompt).toBe("Visual style: anime-style illustration. Lighting: warm golden-hour sunlight.");
  });

  it("setting place does not change background treatment and vice versa", () => {
    const spec = buildSpec(core, [["scene.setting", single("forest")]]);
    const r = applySelection(spec, core, "scene.background", single("blurred"));
    expect(r.ok && r.value.selections["scene.setting"]).toBe(spec.selections["scene.setting"]);
  });

  it("mood changes never touch any other attribute", () => {
    const spec = buildSpec(core, [
      ["subject.kind", single("person")],
      ["style.preset", single("photography")],
      ["mood.tone", multi("calm")],
    ]);
    const r = applySelection(spec, core, "mood.tone", multi("calm", "romantic", "dramatic"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.selections["subject.kind"]).toBe(spec.selections["subject.kind"]);
    expect(r.value.selections["style.preset"]).toBe(spec.selections["style.preset"]);
  });

  it("changing a value keeps that attribute's priority", () => {
    const spec = buildSpec(core, [["style.preset", single("photography")]]);
    const prioritized: ImageSpec = { ...spec, selections: { "style.preset": { ...spec.selections["style.preset"]!, priority: 5 } } };
    const r = applySelection(prioritized, core, "style.preset", single("oil_painting"));
    expect(r.ok && r.value.selections["style.preset"]).toEqual({ value: single("oil_painting"), source: "user", priority: 5 });
  });
});

describe("4c. context changes preserve inapplicable selections (extended)", () => {
  const reg = extendedRegistry();

  it("changing the subject does not delete or rewrite a dependent attribute", () => {
    const spec = buildSpec(reg, [
      ["subject.kind", single("person")],
      ["x.expression", single("smiling")],
    ]);
    expect(compilePrompt(spec, reg).prompt).toContain("Facial expression: smiling.");

    const r = applySelection(spec, reg, "subject.kind", single("landscape"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.selections["x.expression"]).toBe(spec.selections["x.expression"]);
    const c = compilePrompt(r.value, reg);
    expect(c.prompt).not.toContain("expression");
    expect(c.diagnostics.map((d) => d.code)).toContain("selection.inactive");
    const back = applySelection(r.value, reg, "subject.kind", single("person"));
    expect(back.ok && compilePrompt(back.value, reg).prompt).toContain("Facial expression: smiling.");
  });

  it("rejects invalid values without changing the spec", () => {
    const spec = buildSpec(reg, [["subject.kind", single("person")]]);
    const bad = [
      applySelection(spec, reg, "subject.kind", single("dragon")),
      applySelection(spec, reg, "subject.kind", { kind: "text", text: "person" }),
      applySelection(spec, reg, "x.focal_length", { kind: "number", value: 5000 }),
      applySelection(spec, reg, "x.palette", { kind: "multi", optionIds: ["warm", "cool", "pastel"] }),
      applySelection(spec, reg, "does.not_exist", single("x")),
    ];
    for (const r of bad) expect(r.ok).toBe(false);
    expect(spec.selections).toEqual({ "subject.kind": { value: single("person"), source: "user" } });
  });

  it("multi-select without maxSelections has no artificial limit (core mood)", () => {
    const core = getCoreRegistry();
    const mood = core.getAttribute("mood.tone")!;
    expect(mood.type === "multi" && mood.maxSelections).toBeUndefined();
    const all = mood.type === "multi" ? mood.options.map((o) => o.id) : [];
    expect(applySelection(createEmptySpec(core), core, "mood.tone", { kind: "multi", optionIds: all }).ok).toBe(true);
  });
});
