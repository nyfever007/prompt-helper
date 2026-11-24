import { describe, expect, it } from "vitest";
import { applySelection, clearSelection, compilePrompt, createEmptySpec, type ImageSpec } from "@/domain";
import { extendedRegistry, sampleValues } from "../fixtures/catalogs";
import { buildSpec, single } from "../fixtures/specs";

const reg = extendedRegistry();
const attrs = reg.attributes();

const fullSpec = (): ImageSpec =>
  attrs.reduce((spec, a) => {
    const r = applySelection(spec, reg, a.id, sampleValues(a)[0]);
    if (!r.ok) throw new Error(a.id);
    return r.value;
  }, createEmptySpec(reg));

const deepFreeze = <T>(v: T): T => {
  if (v && typeof v === "object") {
    Object.freeze(v);
    Object.values(v).forEach(deepFreeze);
  }
  return v;
};

describe("4. attributes change independently", () => {
  it("changing any attribute A leaves every other attribute B identical (all pairs)", () => {
    const base = deepFreeze(fullSpec());
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
    const base = deepFreeze(fullSpec());
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

  it("changing the subject does not delete or rewrite a dependent attribute", () => {
    const spec = buildSpec(reg, [
      ["subject.kind", single("person")],
      ["person.expression", single("smiling")],
    ]);
    expect(compilePrompt(spec, reg).prompt).toContain("Facial expression: smiling.");

    const r = applySelection(spec, reg, "subject.kind", single("landscape"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // kept in the spec…
    expect(r.value.selections["person.expression"]).toBe(spec.selections["person.expression"]);
    // …but not compiled, and the user is told why
    const c = compilePrompt(r.value, reg);
    expect(c.prompt).not.toContain("expression");
    expect(c.diagnostics.map((d) => d.code)).toContain("selection.inactive");
    // switching back restores it in the prompt without re-entry
    const back = applySelection(r.value, reg, "subject.kind", single("person"));
    expect(back.ok && compilePrompt(back.value, reg).prompt).toContain("Facial expression: smiling.");
  });

  it("changing a value keeps that attribute's priority", () => {
    const spec = buildSpec(reg, [["style.visual", single("photography")]]);
    const prioritized: ImageSpec = {
      ...spec,
      selections: { "style.visual": { ...spec.selections["style.visual"]!, priority: 5 } },
    };
    const r = applySelection(prioritized, reg, "style.visual", single("oil_painting"));
    expect(r.ok && r.value.selections["style.visual"]).toEqual({ value: single("oil_painting"), source: "user", priority: 5 });
  });

  it("rejects invalid values without changing the spec", () => {
    const spec = buildSpec(reg, [["subject.kind", single("person")]]);
    const bad = [
      applySelection(spec, reg, "subject.kind", single("dragon")),
      applySelection(spec, reg, "subject.kind", { kind: "text", text: "person" }),
      applySelection(spec, reg, "camera.focal_length", { kind: "number", value: 5000 }),
      applySelection(spec, reg, "mood.tone", { kind: "multi", optionIds: ["calm", "dramatic", "playful"] }),
      applySelection(spec, reg, "does.not_exist", single("x")),
    ];
    for (const r of bad) expect(r.ok).toBe(false);
    expect(spec.selections).toEqual({ "subject.kind": { value: single("person"), source: "user" } });
  });
});
