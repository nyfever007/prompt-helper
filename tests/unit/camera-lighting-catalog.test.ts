import { describe, expect, it } from "vitest";
import {
  compilePrompt,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  isAttributeActive,
  isOptionActive,
  isOptionAttribute,
  resetCategory,
  restoreCategoryReset,
  searchCatalog,
  setPromptExclusion,
  type SelectionValue,
} from "@/domain";
import { CAMERA_SECTIONS } from "@/domain/catalog/catalogs/shared/camera";
import { LIGHTING_SECTIONS } from "@/domain/catalog/catalogs/shared/lighting";
import { buildSpec, multi, single } from "../fixtures/specs";

/** Sprint 2-B.6 (3)(4) — Shared › Camera and Lighting, plus the §7 integrated example. */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const out = (entries: Array<[string, SelectionValue]>) => compilePrompt(buildSpec(core, entries), core);
const prompt = (entries: Array<[string, SelectionValue]>) => out(entries).prompt;
const rules = (entries: Array<[string, SelectionValue]>) => out(entries).diagnostics.map((d) => d.code).filter((c) => c.startsWith("rule."));
const opts = (id: string) => {
  const a = core.getAttribute(id)!;
  return isOptionAttribute(a) ? a.options : [];
};

describe("integrated output (directive §7)", () => {
  it("appearance direction, identity, hair, pose, camera and lighting compile in catalog order, only chosen values", () => {
    expect(
      prompt([
        ["subject.kind", single("person")], ["person.appearance.direction", multi("beautiful", "elegant")], ["person.identity.age", { kind: "number", value: 28, unit: "years" }],
        ["person.identity.gender", single("woman")], ["person.hair.style", single("classic_bob")], ["person.hair.texture", single("wavy")],
        ["person.pose.posture", single("standing")], ["person.pose.body_orientation", single("three_quarter")], ["person.pose.gaze_direction", single("camera")],
        ["composition.framing", single("head_and_shoulders")], ["camera.focal_length", single("mm_85")], ["camera.aperture", single("f_2_8")], ["camera.depth_of_field", num(2)],
        ["lighting.direction", single("three_quarter")], ["lighting.softness", single("soft")], ["lighting.color_temperature", single("warm")], ["lighting.fill", single("subtle")],
      ]),
    ).toBe(
      "Main subject: a single person. Appearance direction: beautiful, elegant. Actual age: 28 years old. Gender: woman. Hair texture: wavy. Hairstyle: classic bob. " +
        "Posture: standing. Body orientation: three-quarter facing. Gaze direction: looking at the camera. Framing: head-and-shoulders portrait. Focal length: 85 mm. " +
        "Aperture: f/2.8. Depth of field: shallow. Light direction: three-quarter lighting. Light quality: soft light. Color temperature: warm. Fill light: subtle.",
    );
  });
});

const CAMERA_NEW = [
  "camera.distance", "camera.roll", "composition.layout", "composition.negative_space", "composition.subject_position", "camera.lens_type", "camera.focal_length",
  "camera.projection", "camera.perspective", "camera.aperture", "camera.depth_of_field", "camera.focus_target", "camera.focus_sharpness", "camera.bokeh", "camera.motion_blur",
];

describe("camera (directive §4)", () => {
  it("reuses the Basic framing / viewing direction / camera angle unchanged; 15 new Detailed attributes under Camera", () => {
    // Sprint 2-C.1: the Camera page is split into subcategories; the set and catalog order are unchanged.
    const cam = core.attributes().filter((a) => core.categoryPath(a.categoryId ?? "").includes("shared_camera")).map((a) => a.id);
    expect(cam).toEqual(["composition.framing", "composition.view_direction", "camera.angle", ...CAMERA_NEW]);
    for (const id of ["composition.framing", "composition.view_direction", "camera.angle"]) {
      const a = core.getAttribute(id)!;
      expect(a.tier, id).toBe("basic");
      expect(a.outputToggle, id).toBeUndefined();
    }
    expect(opts("composition.view_direction").map((o) => o.id)).toEqual(["front", "three_quarter", "side", "back"]);
    expect(opts("camera.angle").map((o) => o.id)).toEqual(["eye_level", "high_angle", "low_angle", "birds_eye", "worms_eye"]);
    expect(opts("composition.framing")).toHaveLength(11);
    for (const id of CAMERA_NEW) {
      const a = core.getAttribute(id)!;
      expect(a.tier, id).toBe("detailed");
      expect(a.status, id).toBe("approved");
      expect(a.outputToggle, id).toBe(true);
      expect(core.isExposed(a, "detailed"), id).toBe(true);
    }
    expect(prompt([["composition.framing", single("upper_body")], ["camera.angle", single("low_angle")]])).toBe("Framing: upper-body shot. Camera angle: low angle looking up.");
  });

  it("focal length and aperture are real values with units, output as chosen; custom values allowed", () => {
    expect(opts("camera.focal_length").map((o) => o.prompt.text)).toEqual(["14 mm", "20 mm", "24 mm", "28 mm", "35 mm", "50 mm", "70 mm", "85 mm", "105 mm", "135 mm", "200 mm"]);
    expect(opts("camera.aperture").map((o) => o.prompt.text)).toEqual(["f/1.4", "f/1.8", "f/2", "f/2.8", "f/4", "f/5.6", "f/8", "f/11", "f/16", "f/22"]);
    expect(prompt([["camera.focal_length", single("mm_35")], ["camera.aperture", single("f_1_4")]])).toBe("Focal length: 35 mm. Aperture: f/1.4.");
    expect(prompt([["camera.focal_length", { kind: "single", custom: { label: "600 mm" } }]])).toBe("Focal length: 600 mm.");
  });

  it("lens, focal length, aperture, depth of field and perspective never set each other; real mismatches warn (non-blocking)", () => {
    const spec = buildSpec(core, [["camera.lens_type", single("telephoto")]]);
    expect(Object.keys(spec.selections)).toEqual(["camera.lens_type"]);
    expect(rules([["camera.lens_type", single("telephoto")], ["camera.focal_length", single("mm_24")]])).toEqual(["rule.camera-telephoto-vs-short-focal-length"]);
    expect(rules([["camera.lens_type", single("wide")], ["camera.focal_length", single("mm_135")]])).toEqual(["rule.camera-wide-vs-long-focal-length"]);
    expect(rules([["camera.lens_type", single("fisheye")], ["camera.projection", single("orthographic")]])).toEqual(["rule.camera-fisheye-vs-orthographic"]);
    expect(rules([["composition.layout", multi("centered", "rule_of_thirds")]])).toEqual(["rule.composition-layout-centered-vs-rule-of-thirds"]);
    expect(rules([["composition.subject_position", multi("left", "right")]])).toEqual(["rule.composition-subject-position-left-vs-right"]);
    expect(rules([["camera.lens_type", single("telephoto")], ["camera.focal_length", single("mm_200")], ["camera.aperture", single("f_2_8")], ["camera.depth_of_field", num(1)], ["composition.subject_position", multi("left", "upper")]])).toEqual([]);
    expect(out([["camera.lens_type", single("wide")], ["camera.focal_length", single("mm_135")]]).blocked).toBe(false);
  });

  it("orthographic projection hides the perspective (kept, restored); eyes/face focus targets apply to people and animals only", () => {
    const spec = buildSpec(core, [["camera.projection", single("orthographic")], ["camera.perspective", single("exaggerated")]]);
    expect(compilePrompt(spec, core).prompt).toBe("Projection: orthographic projection.");
    expect(spec.selections["camera.perspective"]).toBeDefined();
    expect(prompt([["camera.projection", single("perspective")], ["camera.perspective", single("exaggerated")]])).toBe("Projection: perspective projection. Perspective: exaggerated perspective.");
    const focus = core.getAttribute("camera.focus_target")!;
    const eyes = opts("camera.focus_target").find((o) => o.id === "eyes")!;
    expect(isOptionActive(core, eyes, buildSpec(core, [["subject.kind", single("landscape")]]))).toBe(false);
    expect(isOptionActive(core, eyes, buildSpec(core, [["subject.kind", single("animal")]]))).toBe(true);
    for (const s of ["landscape", "object", "architecture", "abstract"]) expect(isAttributeActive(core, focus, buildSpec(core, [["subject.kind", single(s)]])), s).toBe(true);
  });

  it("camera settings apply to any subject (landscape, product, architecture)", () => {
    expect(prompt([["subject.kind", single("architecture")], ["camera.lens_type", single("wide")], ["camera.projection", single("perspective")], ["composition.layout", multi("symmetrical", "leading_lines")]])).toBe(
      "Main subject: an architectural structure. Composition: symmetrical composition, leading lines. Lens: wide-angle lens. Projection: perspective projection.", // catalog order
    );
    expect(prompt([["subject.kind", single("object")], ["camera.lens_type", single("macro")], ["camera.depth_of_field", num(1)], ["camera.focus_target", single("subject")]])).toBe(
      "Main subject: an object or product. Lens: macro lens. Depth of field: very shallow. Focus on: the entire subject.",
    );
  });
});

const PRESET_TEXTS: Record<string, string> = {
  natural_daylight: "soft natural daylight", golden_hour: "warm golden-hour sunlight", midday_sun: "harsh midday sunlight", overcast: "soft, diffuse overcast light",
  blue_hour: "cool blue-hour twilight", moonlight: "dim, cool moonlight", studio_softbox: "even studio softbox lighting", low_key: "dramatic low-key lighting with deep shadows",
  high_key: "bright high-key lighting", backlit_rim: "strong backlighting with a bright rim light", neon: "colorful neon lighting", candlelight: "warm, flickering candlelight",
};

describe("lighting (directive §5)", () => {
  it("Basic presets are unchanged (ids, output) and still never set the detailed lighting values", () => {
    expect(opts("lighting.preset").map((o) => o.id)).toEqual(Object.keys(PRESET_TEXTS));
    for (const [id, t] of Object.entries(PRESET_TEXTS)) {
      const spec = buildSpec(core, [["lighting.preset", single(id)]]);
      expect(compilePrompt(spec, core).prompt, id).toBe(`Lighting: ${t}.`);
      expect(Object.keys(spec.selections), id).toEqual(["lighting.preset"]);
    }
  });

  it("the six Sprint 2-A properties keep every option id and phrase; only options were added", () => {
    const kept: Record<string, Array<[string, string]>> = {
      "lighting.source": [["sun", "direct sunlight"], ["daylight_sky", "diffuse skylight"], ["moon", "moonlight"], ["studio", "studio lights"], ["practical", "practical lamps"], ["neon", "neon signs"], ["fire", "firelight"]],
      "lighting.direction": [["front", "front lighting"], ["side", "side lighting"], ["back", "backlighting"], ["top", "top lighting"], ["bottom", "lighting from below"], ["ambient", "ambient all-around light"]],
      "lighting.softness": [["soft", "soft light"], ["medium", "moderately soft light"], ["hard", "hard light"]],
      "lighting.intensity": [["dim", "dim"], ["moderate", "moderate"], ["bright", "bright"]],
      "lighting.color_temperature": [["warm", "warm"], ["neutral", "neutral"], ["cool", "cool"], ["mixed_color", "mixed colored light"]],
      "lighting.contrast": [["low", "low contrast"], ["medium", "medium contrast"], ["high", "high contrast"]],
    };
    const added: Record<string, string[]> = {
      "lighting.source": ["softbox", "led", "ambient_artificial"], "lighting.direction": ["three_quarter"], "lighting.softness": ["very_soft", "very_hard"],
      "lighting.intensity": ["very_dim", "very_bright"], "lighting.color_temperature": ["very_cool", "very_warm"], "lighting.contrast": ["very_low", "very_high"],
    };
    for (const [id, list] of Object.entries(kept)) {
      const options = opts(id);
      for (const [oid, text] of list) expect(options.find((o) => o.id === oid)?.prompt.text, `${id}/${oid}`).toBe(text);
      expect(options.map((o) => o.id).sort(), id).toEqual([...list.map(([o]) => o), ...added[id]!].sort());
      expect(core.getAttribute(id)!.outputToggle, id).toBeUndefined();
    }
    expect(opts("lighting.intensity").map((o) => o.id)).toEqual(["very_dim", "dim", "moderate", "bright", "very_bright"]);
    expect(opts("lighting.color_temperature").map((o) => o.id)).toEqual(["very_cool", "cool", "neutral", "warm", "very_warm", "mixed_color"]);
  });

  it("preset takeover/provenance is unchanged: a new direct value replaces the preset's matching part", () => {
    const c = out([["lighting.preset", single("natural_daylight")], ["lighting.softness", single("very_soft")]]);
    expect(c.prompt).toBe("Lighting: natural daylight. Light quality: very soft light.");
    expect(c.fragments.find((f) => f.attributeId === "lighting.preset")?.takenOverBy).toEqual([{ attributeId: "lighting.softness", relation: "override" }]);
    expect(out([["lighting.preset", single("golden_hour")], ["lighting.color_temperature", single("warm")]]).prompt).toBe("Lighting: golden-hour sunlight. Color temperature: warm.");
  });

  it("key, fill, rim and ambient light are independent; intensity ≠ softness; light color ≠ color temperature", () => {
    const spec = buildSpec(core, [
      ["lighting.intensity", single("very_bright")], ["lighting.softness", single("very_soft")], ["lighting.color_temperature", single("very_cool")], ["lighting.key_color", single("amber")],
      ["lighting.key_height", num(4)], ["lighting.fill", single("none")], ["lighting.rim", single("strong")], ["lighting.rim_color", single("cyan")], ["lighting.ambient", single("subtle")],
    ]);
    expect(Object.keys(spec.selections)).toHaveLength(9);
    expect(compilePrompt(spec, core).prompt).toBe(
      "Key light position: high. Light quality: very soft light. Light intensity: very bright. Color temperature: very cool. Key light color: amber. " +
        "Fill light: none. Rim light: strong. Rim light color: cyan. Ambient light: subtle.",
    );
  });

  it("no rim light hides the rim color; no visible shadows hide the shadow edge (kept, restored)", () => {
    const spec = buildSpec(core, [["lighting.rim", single("none")], ["lighting.rim_color", single("magenta")], ["lighting.shadow_strength", single("none")], ["lighting.shadow_edge", num(5)]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Rim light: none. Shadows: no visible shadows.");
    expect(c.diagnostics.filter((d) => d.code === "selection.inactive").map((d) => d.attributeId).sort()).toEqual(["lighting.rim_color", "lighting.shadow_edge"]);
    expect(prompt([["lighting.rim", single("moderate")], ["lighting.rim_color", single("magenta")], ["lighting.shadow_strength", single("deep")], ["lighting.shadow_edge", num(5)]])).toBe(
      "Rim light: moderate. Rim light color: magenta. Shadows: deep shadows. Shadow edges: sharply defined.",
    );
  });

  it("lighting palette (14 colors, 4 groups) with custom names; real contradiction warns; lighting sets no time, place, weather or skin", () => {
    for (const id of ["lighting.key_color", "lighting.rim_color"]) {
      expect(opts(id).map((o) => o.prompt.text).sort(), id).toEqual(["amber", "blue", "cool white", "cyan", "golden", "green", "magenta", "orange", "pink", "red", "violet", "warm white", "white", "yellow"]);
      expect(core.getAttribute(id)!.control, id).toBe("color");
    }
    expect(prompt([["lighting.key_color", { kind: "single", custom: { label: "청록 네온", expression: "teal neon" } }]])).toBe("Key light color: teal neon.");
    expect(rules([["lighting.contrast", single("very_low")], ["lighting.shadow_strength", single("deep")]])).toEqual(["rule.lighting-low-contrast-vs-deep-shadows"]);
    const spec = buildSpec(core, [["lighting.source", single("sun")], ["lighting.volumetric", single("strong")], ["lighting.source_visibility", single("visible")]]);
    expect(Object.keys(spec.selections).sort()).toEqual(["lighting.source", "lighting.source_visibility", "lighting.volumetric"]);
    expect(compilePrompt(spec, core).prompt).toBe("Light source: direct sunlight. Volumetric lighting: strong. Light source visibility: visible in the frame.");
  });
});

describe("common features (directive §6)", () => {
  it("every new camera/lighting option and band compiles alone to its sentence", () => {
    const ids = [...CAMERA_NEW, ...core.attributes().filter((a) => a.id.startsWith("lighting.") && a.outputToggle).map((a) => a.id)];
    expect(ids).toHaveLength(26);
    for (const id of ids) {
      const a = core.getAttribute(id)!;
      if (isOptionAttribute(a)) {
        for (const o of a.options) {
          const spec = buildSpec(core, [[id, a.type === "single" ? single(o.id) : multi(o.id)]]);
          if (!o.appliesWhen) expect(compilePrompt(spec, core).prompt, `${id}/${o.id}`).toBe(a.prompt.template.replace("{value}", o.prompt.text));
        }
      } else if (a.type === "number") {
        a.bands!.forEach((b, i) => expect(prompt([[id, num(i + 1)]]), `${id}/${i + 1}`).toBe(a.prompt.template.replace("{value}", b.text)));
      }
    }
  });

  it("exclusion, JSON round-trip, Camera and Lighting page reset and restore", () => {
    let spec = buildSpec(core, [["composition.framing", single("full_body")], ["camera.focal_length", single("mm_50")], ["lighting.preset", single("overcast")], ["lighting.rim", single("subtle")]]);
    spec = setPromptExclusion(spec, "camera.focal_length", true);
    expect(compilePrompt(spec, core).prompt).toBe("Framing: full-body shot. Lighting: soft, diffuse overcast light. Rim light: subtle.");
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
    const cam = resetCategory(spec, core, "shared_camera");
    expect(Object.keys(cam.removed).sort()).toEqual(["camera.focal_length", "composition.framing"]);
    expect(restoreCategoryReset(cam.spec, cam.removed).spec.selections).toEqual(spec.selections);
    expect(Object.keys(resetCategory(spec, core, "shared_lighting").removed).sort()).toEqual(["lighting.preset", "lighting.rim"]);
  });

  it.each([
    ["초점 거리", "attribute", "camera.focal_length"], ["85mm", "option", "camera.focal_length"], ["조리개", "attribute", "camera.aperture"], ["f2.8", "option", "camera.aperture"],
    ["아웃포커싱", "attribute", "camera.depth_of_field"], ["더치 앵글", "attribute", "camera.roll"], ["삼분할", "attribute", "composition.layout"], ["어안", "attribute", "camera.lens_type"],
    ["보케", "attribute", "camera.bokeh"], ["림 라이트", "attribute", "lighting.rim"], ["보조광", "attribute", "lighting.fill"], ["빛내림", "attribute", "lighting.volumetric"],
    ["그림자", "attribute", "lighting.shadow_strength"], ["전구색", "option", "lighting.key_color"], ["소프트박스", "option", "lighting.source"],
  ])("search “%s” finds %s %s", (q, kind, attributeId) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === attributeId)).toBe(true);
  });
});

describe("Sprint 2-C.1 — camera and lighting subcategories (navigation only)", () => {
  const under = (parent: string) => core.attributes().filter((a) => core.categoryPath(a.categoryId ?? "").includes(parent));
  const subcats = (parent: string) => core.categories.filter((c) => c.parentId === parent).sort((a, b) => a.order - b.order);

  it("Camera: 5 meaning groups holding all 18 attributes; nothing stays on the parent page", () => {
    expect(subcats("shared_camera").map((c) => c.label.ko)).toEqual(["프레이밍 및 시점", "렌즈 및 원근감", "초점 및 피사계 심도", "구도 및 배치", "카메라 효과"]);
    expect(subcats("shared_camera").every((c) => c.status === "approved")).toBe(true);
    const byCat = Object.fromEntries(subcats("shared_camera").map((c) => [c.id, core.attributes().filter((a) => a.categoryId === c.id).map((a) => a.id)]));
    expect(byCat).toEqual({
      shared_camera_framing: ["composition.framing", "composition.view_direction", "camera.angle", "camera.distance", "camera.roll"],
      shared_camera_lens: ["camera.lens_type", "camera.focal_length", "camera.projection", "camera.perspective"],
      shared_camera_focus: ["camera.aperture", "camera.depth_of_field", "camera.focus_target", "camera.focus_sharpness"],
      shared_camera_composition: ["composition.layout", "composition.negative_space", "composition.subject_position"],
      shared_camera_effects: ["camera.bokeh", "camera.motion_blur"],
    });
    expect(under("shared_camera")).toHaveLength(18);
    expect(core.attributes().filter((a) => a.categoryId === "shared_camera")).toEqual([]);
    expect(CAMERA_SECTIONS.flatMap(([, , , ids]) => ids)).toHaveLength(18);
  });

  it("Lighting: 6 meaning groups holding all 18 attributes; the Basic preset keeps its 12 options and output", () => {
    expect(subcats("shared_lighting").map((c) => c.label.ko)).toEqual(["조명 프리셋 및 광원", "주광", "보조광 및 환경광", "색상 및 색온도", "그림자 및 대비", "조명 효과"]);
    const byCat = Object.fromEntries(subcats("shared_lighting").map((c) => [c.id, core.attributes().filter((a) => a.categoryId === c.id).map((a) => a.id)]));
    expect(byCat).toEqual({
      shared_lighting_source: ["lighting.preset", "lighting.source"],
      shared_lighting_key: ["lighting.direction", "lighting.key_height", "lighting.softness", "lighting.intensity"],
      shared_lighting_fill: ["lighting.fill", "lighting.rim", "lighting.rim_color", "lighting.ambient", "lighting.reflected"], // rim color next to rim strength
      shared_lighting_color: ["lighting.color_temperature", "lighting.key_color"],
      shared_lighting_shadow: ["lighting.contrast", "lighting.shadow_strength", "lighting.shadow_edge"],
      shared_lighting_effects: ["lighting.volumetric", "lighting.source_visibility"],
    });
    expect(under("shared_lighting")).toHaveLength(18);
    expect(LIGHTING_SECTIONS.flatMap(([, , , ids]) => ids)).toHaveLength(18);
    expect(opts("lighting.preset")).toHaveLength(12);
    expect(core.getAttribute("lighting.preset")!.tier).toBe("basic");
  });

  it("the attribute set, catalog order and Basic tier are unchanged (348 attributes; output order follows `order`, not the category)", () => {
    expect(core.attributes()).toHaveLength(348);
    expect(core.attributesForTier("basic").map((a) => a.id)).toContain("composition.framing");
    // A value from every camera/lighting group compiles in catalog order, independent of the navigation group.
    expect(
      prompt([
        ["camera.motion_blur", single("subtle")], ["composition.layout", multi("rule_of_thirds")], ["camera.aperture", single("f_2_8")], ["camera.lens_type", single("standard")], ["composition.framing", single("upper_body")],
        ["lighting.volumetric", single("subtle")], ["lighting.contrast", single("high")], ["lighting.key_color", single("amber")], ["lighting.fill", single("subtle")], ["lighting.direction", single("side")], ["lighting.preset", single("golden_hour")],
      ]),
    ).toBe(
      "Framing: upper-body shot. Composition: rule of thirds. Lens: standard lens. Aperture: f/2.8. Motion blur: subtle. Lighting: warm golden-hour sunlight. " +
        "Light direction: side lighting. Key light color: amber. Lighting contrast: high contrast. Fill light: subtle. Volumetric lighting: subtle.",
    );
  });

  it("resetting a subcategory clears only that group; resetting Camera or Lighting still clears every subcategory", () => {
    const spec = buildSpec(core, [["camera.focal_length", single("mm_85")], ["camera.aperture", single("f_2_8")], ["camera.bokeh", single("oval")], ["lighting.rim_color", single("cyan")], ["lighting.rim", single("subtle")], ["lighting.key_color", single("amber")]]);
    expect(Object.keys(resetCategory(spec, core, "shared_camera_lens").removed)).toEqual(["camera.focal_length"]);
    expect(Object.keys(resetCategory(spec, core, "shared_camera").removed).sort()).toEqual(["camera.aperture", "camera.bokeh", "camera.focal_length"]);
    expect(Object.keys(resetCategory(spec, core, "shared_lighting_color").removed)).toEqual(["lighting.key_color"]);
    expect(Object.keys(resetCategory(spec, core, "shared_lighting_fill").removed).sort()).toEqual(["lighting.rim", "lighting.rim_color"]); // rim strength + its color together
    expect(Object.keys(resetCategory(spec, core, "shared_lighting").removed).sort()).toEqual(["lighting.key_color", "lighting.rim", "lighting.rim_color"]);
  });
});
