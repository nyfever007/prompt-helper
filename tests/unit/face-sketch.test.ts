import { describe, expect, it } from "vitest";
import { compilePrompt, getCoreRegistry, isOptionAttribute, setPromptExclusion, type SelectionValue } from "@/domain";
import { FACE_BINDINGS, faceSketchState } from "@/components/face/faceSketchState";
import { frontLayers, layersString, NEUTRAL, neutralParams, profileLayers, type FaceParams, type LayerId } from "@/visual/face-sketch";
import { neutralHair } from "@/visual/hair-sketch";
import { buildSpec, multi, single } from "../fixtures/specs";

/** Sprint 2-D.2 — face sketch geometry and the read-only ImageSpec → sketch mapping. */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const draw = (p: FaceParams) => layersString(frontLayers(p)) + "|" + layersString(profileLayers(p));
const sketchOf = (entries: Array<[string, SelectionValue]>) => draw(faceSketchState(core, buildSpec(core, entries)).params);
/** Bounding box of one layer of the front view (all path coordinates, incl. control points). */
const bbox = (p: FaceParams, layer: LayerId) => {
  const nums = frontLayers(p)
    .find((l) => l.id === layer)!
    .els.flatMap((e) => (e.t === "path" && !e.d.includes("A") ? e.d.replace(/[A-Z]/g, " ").trim().split(/\s+/).map(Number) : []));
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), minX: Math.min(...xs) };
};
const set = (patch: (p: FaceParams) => void) => {
  const p = neutralParams();
  patch(p);
  return p;
};

describe("face sketch geometry", () => {
  it("is deterministic, and the neutral form is never mutated by a preview", () => {
    expect(draw(neutralParams())).toBe(draw(neutralParams()));
    const p = neutralParams();
    p.eyes.size = 5;
    expect(NEUTRAL.eyes.size).toBe(3);
  });

  it("relative sliders move the drawing in the direction of their meaning", () => {
    expect(bbox(set((p) => (p.face.width = 5)), "face").w).toBeGreaterThan(bbox(set((p) => (p.face.width = 1)), "face").w);
    expect(bbox(set((p) => (p.face.length = 5)), "face").h).toBeGreaterThan(bbox(set((p) => (p.face.length = 1)), "face").h);
    expect(bbox(set((p) => (p.eyes.spacing = 5)), "eyes").w).toBeGreaterThan(bbox(set((p) => (p.eyes.spacing = 1)), "eyes").w);
    expect(bbox(set((p) => (p.eyes.height = 5)), "eyes").h).toBeGreaterThan(bbox(set((p) => (p.eyes.height = 1)), "eyes").h);
    expect(bbox(set((p) => (p.brows.thickness = 5)), "brows").h).toBeGreaterThan(bbox(set((p) => (p.brows.thickness = 1)), "brows").h);
    expect(bbox(set((p) => (p.nose.width = 5)), "nose").w).toBeGreaterThan(bbox(set((p) => (p.nose.width = 1)), "nose").w);
    expect(bbox(set((p) => (p.nose.length = 5)), "nose").h).toBeGreaterThan(bbox(set((p) => (p.nose.length = 1)), "nose").h);
    expect(bbox(set((p) => (p.lips.width = 5)), "lips").w).toBeGreaterThan(bbox(set((p) => (p.lips.width = 1)), "lips").w);
    expect(bbox(set((p) => ((p.lips.upper = 5), (p.lips.lower = 5))), "lips").h).toBeGreaterThan(bbox(set((p) => ((p.lips.upper = 1), (p.lips.lower = 1))), "lips").h);
  });

  // hair (Sprint 2-D.3) is covered with both the head and the figure view in figure-sketch.test.ts
  const faceOnly = Object.entries(FACE_BINDINGS).filter(([id]) => !id.startsWith("person.hair."));
  it.each(faceOnly.filter(([, b]) => b.kind === "degree").map(([id]) => id))("%s: every band (1–5) draws differently", (id) => {
    const drawings = [1, 2, 3, 4, 5].map((v) => sketchOf([[id, num(v)]]));
    expect(new Set(drawings).size).toBe(5);
  });

  // Chin: only the projection (protruding / recessed) is drawn — the other chin traits are reported as not drawn.
  const optionAttrs = faceOnly.filter(([id, b]) => b.kind === "option" && id !== "person.face.chin").map(([id]) => id);
  it.each(optionAttrs)("%s: every catalog option is drawn, and each option draws differently", (id) => {
    const a = core.getAttribute(id)!;
    if (!isOptionAttribute(a)) throw new Error("option attribute expected");
    const drawings = a.options.map((o) => {
      const value = a.type === "multi" ? multi(o.id) : single(o.id);
      const s = faceSketchState(core, buildSpec(core, [[id, value]]));
      expect([s.drawn, s.notDrawn], o.id).toEqual([[id], []]);
      return draw(s.params);
    });
    expect(new Set(drawings).size).toBe(a.options.length);
  });
});

describe("ImageSpec → sketch (read-only)", () => {
  it("unset features use the neutral preview form; nothing is added to the spec or the prompt", () => {
    const spec = buildSpec(core, [["person.eyes.size", num(5)]]);
    const before = JSON.stringify(spec);
    const s = faceSketchState(core, spec);
    expect(JSON.stringify(spec)).toBe(before);
    expect(s.params).toEqual({ ...set((p) => (p.eyes.size = 5)), hair: neutralHair() });
    expect(s.drawn).toEqual(["person.eyes.size"]);
    expect(compilePrompt(spec, core).prompt).toBe("Eye size: very large.");
  });

  it("excluded, inactive, custom and undrawable selections are not drawn and are reported", () => {
    let spec = buildSpec(core, [
      ["person.eyes.size", num(5)],
      ["person.nose.width", num(1)],
      ["person.face.cheekbones", multi("high")],
      ["person.face.chin", multi("pointed", "recessed")],
      ["person.face.shape", { kind: "single", custom: { label: "둥근 하트형" } }],
    ]);
    spec = setPromptExclusion(spec, "person.eyes.size", true);
    const s = faceSketchState(core, spec);
    expect(s.excluded).toEqual(["person.eyes.size"]);
    expect(s.params.eyes.size).toBe(3);
    expect(s.drawn.sort()).toEqual(["person.face.chin", "person.nose.width"]);
    expect(s.params.face.chin).toBe("recessed");
    expect(s.notDrawn.sort()).toEqual(["person.face.cheekbones", "person.face.chin", "person.face.shape"]);
    // a slider's own preview still explains its stored value
    expect(faceSketchState(core, spec, "person.eyes.size").params.eyes.size).toBe(5);

    const subject = core.getAttribute("subject.kind")!;
    if (!isOptionAttribute(subject)) throw new Error("option attribute expected");
    const other = subject.options.find((o) => o.id !== "person")!.id;
    const inactive = faceSketchState(core, buildSpec(core, [["subject.kind", single(other)], ["person.nose.width", num(1)]]));
    expect([inactive.inactive, inactive.drawn, inactive.params.nose.width]).toEqual([["person.nose.width"], [], 3]);
  });
});
