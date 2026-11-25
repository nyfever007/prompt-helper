import { describe, expect, it } from "vitest";
import { compilePrompt, getCoreRegistry, isOptionAttribute, setPromptExclusion, type SelectionValue } from "@/domain";
import { CAMERA_BINDINGS, cameraSketchState, frameSize, LIGHT_BINDINGS, lightSketchState } from "@/components/scene/sceneSketchState";
import { cameraLayers } from "@/visual/camera-sketch";
import { effectiveLight, lightLayers, neutralLight } from "@/visual/light-sketch";
import { layersString } from "@/visual/sketch-core";
import { buildSpec, multi, single } from "../fixtures/specs";

/** Sprint 2-D.4 — camera (reference scene) and lighting (head-sphere) previews; read-only mapping. */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const draw = (id: string, entries: Array<[string, SelectionValue]>) => {
  const spec = buildSpec(core, entries);
  return id.startsWith("lighting.") ? layersString(lightLayers(lightSketchState(core, spec).params)) : layersString(cameraLayers(cameraSketchState(core, spec).params, 160, 120));
};
const stateOf = (id: string, entries: Array<[string, SelectionValue]>) => (id.startsWith("lighting.") ? lightSketchState : cameraSketchState)(core, buildSpec(core, entries));
const bindings = { ...CAMERA_BINDINGS, ...LIGHT_BINDINGS };

describe("camera and lighting previews", () => {
  it("cover every camera and lighting attribute of the catalog", () => {
    const ids = core.attributes().filter((a) => /^shared_(camera|lighting)_/.test(a.categoryId ?? "")).map((a) => a.id).sort();
    expect(Object.keys(bindings).sort()).toEqual(ids);
  });

  it.each(Object.entries(bindings).filter(([, b]) => b.kind === "degree").map(([id]) => id))("%s: five slider positions draw differently", (id) => {
    expect(new Set([1, 2, 3, 4, 5].map((v) => draw(id, [[id, num(v)]]))).size).toBe(5);
  });

  it.each(Object.entries(bindings).filter(([, b]) => b.kind === "option").map(([id]) => id))("%s: every option is drawn, each differently", (id) => {
    const a = core.getAttribute(id)!;
    if (!isOptionAttribute(a)) throw new Error("option attribute expected");
    const drawings = new Map<string, string>();
    for (const o of a.options) {
      const value = a.type === "multi" ? multi(o.id) : single(o.id);
      const s = stateOf(id, [[id, value]]);
      expect([s.drawn, s.notDrawn], o.id).toEqual([[id], []]);
      drawings.set(o.swatch ?? o.id, draw(id, [[id, value]]));
    }
    expect(new Set(drawings.values()).size).toBe(drawings.size);
  });

  it("is read-only; an excluded setting is not drawn; a preset never overrides an explicit choice", () => {
    let spec = buildSpec(core, [["lighting.preset", single("golden_hour")], ["lighting.color_temperature", single("very_cool")], ["camera.angle", single("low_angle")]]);
    spec = setPromptExclusion(spec, "camera.angle", true);
    const before = JSON.stringify(spec);
    const light = lightSketchState(core, spec);
    const cam = cameraSketchState(core, spec);
    expect(JSON.stringify(spec)).toBe(before);
    expect(cam.excluded).toEqual(["camera.angle"]);
    expect(cam.params.angle).toBeNull();
    expect(effectiveLight(light.params)).toMatchObject({ temperature: "very_cool", direction: "side" }); // explicit wins, the rest comes from the preset
    expect(effectiveLight(neutralLight())).toEqual(neutralLight());
    expect(compilePrompt(spec, core).prompt).not.toMatch(/eye level|three-quarter key/i); // the neutral preview is never prompted
  });

  it("the camera frame follows the chosen aspect ratio (3:2 when unset)", () => {
    expect(frameSize(core, buildSpec(core, []))).toEqual([240, 160]);
    expect(frameSize(core, buildSpec(core, [["output.aspect_ratio", single("portrait_9_16")]]))).toEqual([135, 240]);
    expect(frameSize(core, buildSpec(core, [["output.aspect_ratio", single("landscape_16_9")]]))).toEqual([240, 135]);
  });
});
