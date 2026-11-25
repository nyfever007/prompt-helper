import { isOptionAttribute, type CatalogRegistry, type ImageSpec } from "@/domain";
import { neutralCamera, type CameraParams } from "@/visual/camera-sketch";
import { neutralLight, type LightParams } from "@/visual/light-sketch";
import { color, degree, runBindings, single, type Binding, type SketchState } from "../sketch/bindings";
import { figureSketchState } from "../figure/figureSketchState";

/**
 * Sprint 2-D.4 — ImageSpec → camera / lighting preview parameters (read-only; rules in ../sketch/bindings.ts).
 * Every camera and lighting attribute of the catalog is drawn; there is nothing in these areas reported as text
 * except custom values.
 */
const under = (root: string) => (registry: CatalogRegistry, categoryId: string) => registry.categoryPath(categoryId).includes(root) && categoryId !== root;
export const isCameraCategory = under("shared_camera");
export const isLightCategory = under("shared_lighting");

const multi = <T, K extends string>(known: readonly K[], set: (p: T, ids: K[]) => void): Binding<T> => ({
  kind: "option",
  set: (p, ids) => {
    const ok = ids.filter((x): x is K => (known as readonly string[]).includes(x));
    set(p, ok);
    return ids.filter((x) => !ok.includes(x as K));
  },
});
const MM = ["mm_14", "mm_20", "mm_24", "mm_28", "mm_35", "mm_50", "mm_70", "mm_85", "mm_105", "mm_135", "mm_200"] as const;
const FSTOP = ["f_1_4", "f_1_8", "f_2", "f_2_8", "f_4", "f_5_6", "f_8", "f_11", "f_16", "f_22"] as const;

export const CAMERA_BINDINGS: Record<string, Binding<CameraParams>> = {
  "composition.framing": single(["extreme_close_up", "face_close_up", "head_and_shoulders", "upper_body", "knees_up", "full_body", "group_shot", "full_view", "wide_shot", "extreme_wide", "panoramic"] as const, (p, v) => (p.framing = v)),
  "composition.view_direction": single(["front", "three_quarter", "side", "back"] as const, (p, v) => (p.viewDirection = v)),
  "camera.angle": single(["eye_level", "high_angle", "low_angle", "birds_eye", "worms_eye"] as const, (p, v) => (p.angle = v)),
  "camera.distance": degree((p, v) => (p.distance = v)),
  "camera.roll": single(["level", "tilted_left", "tilted_right", "dutch"] as const, (p, v) => (p.roll = v)),
  "composition.layout": multi(["centered", "rule_of_thirds", "symmetrical", "asymmetrical", "golden_ratio", "diagonal", "leading_lines"] as const, (p, v) => (p.layout = v)),
  "composition.negative_space": degree((p, v) => (p.negativeSpace = v)),
  "composition.subject_position": multi(["center", "left", "right", "upper", "lower"] as const, (p, v) => (p.position = v)),
  "camera.lens_type": single(["ultra_wide", "wide", "standard", "telephoto", "macro", "fisheye"] as const, (p, v) => (p.lens = v)),
  "camera.focal_length": single(MM, (p, v) => (p.focal = v)),
  "camera.projection": single(["perspective", "orthographic"] as const, (p, v) => (p.projection = v)),
  "camera.perspective": single(["compressed", "natural", "exaggerated"] as const, (p, v) => (p.perspective = v)),
  "camera.aperture": single(FSTOP, (p, v) => (p.aperture = v)),
  "camera.depth_of_field": degree((p, v) => (p.dof = v)),
  "camera.focus_target": single(["eyes", "face", "subject", "foreground", "background"] as const, (p, v) => (p.focusTarget = v)),
  "camera.focus_sharpness": degree((p, v) => (p.sharpness = v)),
  "camera.bokeh": single(["circular", "oval", "swirling", "polygonal"] as const, (p, v) => (p.bokeh = v)),
  "camera.motion_blur": single(["none", "subtle", "moderate", "strong"] as const, (p, v) => (p.motionBlur = v)),
};
const L4 = ["none", "subtle", "moderate", "strong"] as const;
export const LIGHT_BINDINGS: Record<string, Binding<LightParams>> = {
  "lighting.preset": single(["natural_daylight", "golden_hour", "midday_sun", "overcast", "blue_hour", "moonlight", "studio_softbox", "low_key", "high_key", "backlit_rim", "neon", "candlelight"] as const, (p, v) => (p.preset = v)),
  "lighting.source": single(["sun", "daylight_sky", "moon", "studio", "practical", "neon", "fire", "softbox", "led", "ambient_artificial"] as const, (p, v) => (p.source = v)),
  "lighting.direction": single(["front", "side", "three_quarter", "back", "top", "bottom", "ambient"] as const, (p, v) => (p.direction = v)),
  "lighting.key_height": degree((p, v) => (p.keyHeight = v)),
  "lighting.softness": single(["very_soft", "soft", "medium", "hard", "very_hard"] as const, (p, v) => (p.softness = v)),
  "lighting.intensity": single(["very_dim", "dim", "moderate", "bright", "very_bright"] as const, (p, v) => (p.intensity = v)),
  "lighting.color_temperature": single(["very_cool", "cool", "neutral", "warm", "very_warm", "mixed_color"] as const, (p, v) => (p.temperature = v)),
  "lighting.key_color": color((p, c) => (p.keyColor = c)),
  "lighting.contrast": single(["very_low", "low", "medium", "high", "very_high"] as const, (p, v) => (p.contrast = v)),
  "lighting.fill": single(L4, (p, v) => (p.fill = v)),
  "lighting.rim": single(L4, (p, v) => (p.rim = v)),
  "lighting.rim_color": color((p, c) => (p.rimColor = c)),
  "lighting.ambient": single(L4, (p, v) => (p.ambient = v)),
  "lighting.shadow_strength": single(["none", "light", "moderate", "strong", "deep"] as const, (p, v) => (p.shadowStrength = v)),
  "lighting.shadow_edge": degree((p, v) => (p.shadowEdge = v)),
  "lighting.reflected": single(L4, (p, v) => (p.reflected = v)),
  "lighting.volumetric": single(L4, (p, v) => (p.volumetric = v)),
  "lighting.source_visibility": single(["visible", "off_screen"] as const, (p, v) => (p.visibility = v)),
};

export const cameraSketchState = (registry: CatalogRegistry, spec: ImageSpec, force?: string): SketchState<CameraParams> =>
  runBindings(registry, spec, (c) => isCameraCategory(registry, c), CAMERA_BINDINGS, neutralCamera(), force);
export const lightSketchState = (registry: CatalogRegistry, spec: ImageSpec, force?: string): SketchState<LightParams> =>
  runBindings(registry, spec, (c) => isLightCategory(registry, c), LIGHT_BINDINGS, neutralLight(), force);

/** The preview frame follows the chosen aspect ratio (excluded or unset → 3:2); the longer side is `long`. */
export const frameSize = (registry: CatalogRegistry, spec: ImageSpec, long = 240): [number, number] => {
  const sel = spec.selections["output.aspect_ratio"];
  const a = registry.getAttribute("output.aspect_ratio");
  let ratio = 1.5;
  if (sel && !sel.excludedFromPrompt && sel.value.kind === "single" && "optionId" in sel.value && a && isOptionAttribute(a)) {
    const v = a.options.find((o) => o.id === (sel.value as { optionId: string }).optionId)?.parameterValue;
    const m = typeof v === "string" ? /^(\d+):(\d+)$/.exec(v) : null;
    if (m) ratio = Number(m[1]) / Number(m[2]);
  }
  return ratio >= 1 ? [long, Math.round(long / ratio)] : [Math.round(long * ratio), long];
};

/** The camera subject: the same mannequin as the Figure Builder (body proportions, pose, garment colours). */
export const cameraSubject = (registry: CatalogRegistry, spec: ImageSpec) => {
  const f = figureSketchState(registry, spec).params;
  return { body: f.body, pose: f.pose, colors: { top: f.outfit.dress?.color ?? f.outfit.top?.color ?? null, bottom: f.outfit.bottom?.color ?? f.outfit.dress?.color ?? null } };
};
