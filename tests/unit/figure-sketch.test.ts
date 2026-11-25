import { describe, expect, it } from "vitest";
import { compilePrompt, getCoreRegistry, isOptionAttribute, type SelectionValue } from "@/domain";
import { VISUAL_ASSET_DIRS } from "@/domain/catalog/catalogs/person/visual-examples";
import { FACE_BINDINGS, faceSketchState } from "@/components/face/faceSketchState";
import { FIGURE_BINDINGS, figureSketchState } from "@/components/figure/figureSketchState";
import { layersString } from "@/visual/sketch-core";
import { figureLayers, neutralBody, skeleton } from "@/visual/figure-sketch";
import { headLayers } from "@/visual/hair-sketch";
import { buildSpec, multi, single } from "../fixtures/specs";

/** Sprint 2-D.3 — hair (head + figure view), body (neutral mannequin) and clothing sketches, read-only mapping. */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const drawSpec = (entries: Array<[string, SelectionValue]>) => {
  const spec = buildSpec(core, entries);
  const f = faceSketchState(core, spec).params;
  const g = figureSketchState(core, spec).params;
  return `${layersString(headLayers(f, f.hair))}|${layersString(figureLayers(g.body, g.outfit, g.hair))}`;
};
const stateOf = (id: string, entries: Array<[string, SelectionValue]>) => (id.startsWith("person.hair.") ? faceSketchState : figureSketchState)(core, buildSpec(core, entries));
const bindings = { ...Object.fromEntries(Object.entries(FACE_BINDINGS).filter(([id]) => id.startsWith("person.hair."))), ...FIGURE_BINDINGS };

describe("hair, body and clothing sketches", () => {
  it.each(Object.entries(bindings).filter(([, b]) => b.kind === "degree").map(([id]) => id))("%s: five slider positions draw differently", (id) => {
    const a = core.getAttribute(id)!;
    if (a.type !== "number") throw new Error("number attribute expected");
    const values = [0, 1, 2, 3, 4].map((i) => a.min + ((a.max - a.min) * i) / 4);
    expect(new Set(values.map((v) => drawSpec([[id, num(v)]]))).size).toBe(5);
  });

  it.each(Object.entries(bindings).filter(([, b]) => b.kind === "option").map(([id]) => id))("%s: every drawable option is drawn (others are reported), each differently", (id) => {
    const a = core.getAttribute(id)!;
    if (!isOptionAttribute(a)) throw new Error("option attribute expected");
    const subset = VISUAL_ASSET_DIRS[id]?.options;
    const drawn = new Map<string, string>();
    for (const o of a.options) {
      const value = a.type === "multi" ? multi(o.id) : single(o.id);
      const s = stateOf(id, [[id, value]]);
      const drawable = !subset || subset.includes(o.id) || o.id === "none";
      expect([s.drawn.includes(id), s.notDrawn.includes(id)], o.id).toEqual([drawable, !drawable]);
      if (drawable) drawn.set(o.swatch ?? o.id, drawSpec([[id, value]]));
    }
    expect(new Set(drawn.values()).size).toBe(drawn.size);
  });

  it("relative sliders change the matching proportions", () => {
    const at = (patch: Partial<ReturnType<typeof neutralBody>>) => skeleton({ ...neutralBody(), ...patch });
    expect(at({ shoulderWidth: 5 }).shoulder).toBeGreaterThan(at({ shoulderWidth: 1 }).shoulder);
    expect(at({ legLen: 5 }).crotchY).toBeLessThan(at({ legLen: 1 }).crotchY); // longer legs start higher
    expect(at({ headsTall: 3 }).h).toBeGreaterThan(at({ headsTall: 9 }).h);
    expect(at({ waistWidth: 5 }).waist).toBeGreaterThan(at({ waistWidth: 1 }).waist);
    expect(at({ armLen: 5 }).armLen).toBeGreaterThan(at({ armLen: 1 }).armLen);
  });

  it("is read-only; traits without a drawing (incl. innerwear and chest) are reported, and the drawing stays neutral", () => {
    const neutral = drawSpec([]);
    const entries: Array<[string, SelectionValue]> = [
      ["person.clothing.innerwear.type", single("everyday_bra")],
      ["person.body.chest_volume", num(5)],
      ["person.body.gluteal_volume", num(5)],
      ["person.clothing.tops.material", single("silk")],
    ];
    const spec = buildSpec(core, entries);
    const before = JSON.stringify(spec);
    const s = figureSketchState(core, spec);
    expect(JSON.stringify(spec)).toBe(before);
    expect(s.drawn).toEqual([]);
    expect(s.notDrawn.sort()).toEqual(["person.body.chest_volume", "person.body.gluteal_volume", "person.clothing.innerwear.type", "person.clothing.tops.material"]);
    expect(drawSpec(entries)).toBe(neutral);
    expect(compilePrompt(spec, core).prompt).not.toContain("base"); // nothing from the preview's base clothing is prompted
  });

  it("a one-piece is drawn instead of a separate top / bottom, which are then reported as not drawn", () => {
    const s = figureSketchState(core, buildSpec(core, [["person.clothing.one_piece.type", single("a_line_dress")], ["person.clothing.tops.type", single("hoodie")]]));
    expect(s.drawn).toEqual(["person.clothing.one_piece.type"]);
    expect(s.notDrawn).toContain("person.clothing.tops.type");
  });
});
