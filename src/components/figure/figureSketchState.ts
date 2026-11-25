import type { CatalogRegistry, ImageSpec } from "@/domain";
import {
  BOTTOM_TYPES,
  DRESS_TYPES,
  emptyBottom,
  emptyDress,
  emptyTop,
  neutralBody,
  noHair,
  TOP_TYPES,
  type BodyParams,
  type BottomSpec,
  type DressSpec,
  type FigureHair,
  type Fit,
  type Outfit,
  type TopSpec,
} from "@/visual/figure-sketch";
import { HAIR_STYLES, hairIsEmpty, type HairStyle } from "@/visual/hair-sketch";
import { ACTIONS, neutralPose, type PoseParams } from "@/visual/pose-sketch";
import { color, degree, runBindings, single, type Binding, type SketchState } from "../sketch/bindings";
import { faceSketchState } from "../face/faceSketchState";

/**
 * Sprint 2-D.3 — ImageSpec → Figure Builder parameters (read-only; rules in ../sketch/bindings.ts).
 * Body proportions on a neutral mannequin, the chosen garments (with palette colours) and the hair length.
 * Plain base clothing is the unsaved neutral form wherever no garment is chosen; an explicit “none” leaves
 * that area as the featureless mannequin. Innerwear, outerwear, footwear, hosiery, materials, patterns and
 * details are reported as text (not drawn).
 */
export interface FigureParams {
  body: BodyParams;
  outfit: Outfit & { topNone: boolean; bottomNone: boolean };
  hair: FigureHair;
  /** Sprint 2-D.4: pose (drawn on the jointed mannequin in the pose view). */
  pose: PoseParams;
}
const ROOTS = ["person_body", "person_wardrobe", "person_pose"];
export const isFigureCategory = (registry: CatalogRegistry, categoryId: string): boolean => {
  const path = registry.categoryPath(categoryId);
  return ROOTS.some((r) => path.includes(r)) && !ROOTS.includes(categoryId);
};
/** Pose pages show the posed (jointed) mannequin; body and wardrobe pages the dressed figure. */
export const isPoseCategory = (registry: CatalogRegistry, categoryId: string): boolean => registry.categoryPath(categoryId).includes("person_pose");

const FITS = ["tight", "slim", "regular", "relaxed", "loose", "oversized"] as const;
const NECKLINES = ["crew", "v_neck", "scoop", "square", "boat", "high", "turtleneck", "mock", "halter", "sweetheart", "cowl", "off_shoulder", "asymmetric"] as const;
const SLEEVE_LEN = ["sleeveless", "cap", "short", "elbow", "three_quarter", "long", "extra_long"] as const;
const SLEEVE_STYLE = ["straight", "fitted", "rolled_up", "puff", "balloon", "bell", "bishop", "raglan", "batwing", "flared"] as const;
const top = (p: FigureParams): TopSpec => (p.outfit.top ??= emptyTop());
const bottom = (p: FigureParams): BottomSpec => (p.outfit.bottom ??= emptyBottom());
const dress = (p: FigureParams): DressSpec => (p.outfit.dress ??= emptyDress());
const b = (set: (body: BodyParams, v: number) => void) => degree<FigureParams>((p, v) => set(p.body, v));
/** A garment type: catalog ids with a drawing; “none” is an explicit, drawn choice (no garment there). */
const garmentType = (known: string[], onNone: (p: FigureParams) => void, set: (p: FigureParams, id: string) => void): Binding<FigureParams> => ({
  kind: "option",
  set: (p, ids) => {
    const id = ids[0];
    if (id === "none") {
      onNone(p);
      return [];
    }
    if (id && known.includes(id)) {
      set(p, id);
      return [];
    }
    return ids;
  },
});

export const FIGURE_BINDINGS: Record<string, Binding<FigureParams>> = {
  "person.body.height": b((x, v) => (x.height = v)),
  "person.body.build": single(["lean", "slender", "average", "athletic", "muscular", "plump", "heavyset"] as const, (p, v) => (p.body.build = v)),
  "person.body.frame": b((x, v) => (x.frame = v)),
  "person.body.muscle_mass": b((x, v) => (x.muscle = v)),
  "person.body.body_fat": b((x, v) => (x.fat = v)),
  "person.body.silhouette": single(["rectangular", "hourglass", "triangular", "inverted_triangular", "oval"] as const, (p, v) => (p.body.silhouette = v)),
  "person.body.proportions": single(["natural", "elongated", "compact", "exaggerated", "chibi"] as const, (p, v) => (p.body.proportions = v)),
  "person.body.head_size": b((x, v) => (x.headSize = v)),
  "person.body.heads_tall": b((x, v) => (x.headsTall = v)),
  "person.body.upper_body_length": b((x, v) => (x.upperLen = v)),
  "person.body.lower_body_length": b((x, v) => (x.lowerLen = v)),
  "person.body.upper_lower_ratio": single(["longer_upper", "balanced", "longer_lower"] as const, (p, v) => (p.body.ratio = v)),
  "person.body.neck_length": b((x, v) => (x.neckLen = v)),
  "person.body.neck_thickness": b((x, v) => (x.neckThick = v)),
  "person.body.shoulder_width": b((x, v) => (x.shoulderWidth = v)),
  "person.body.shoulder_slope": single(["sloping", "gently_sloping", "nearly_horizontal"] as const, (p, v) => (p.body.shoulderSlope = v)),
  "person.body.rib_cage_width": b((x, v) => (x.ribWidth = v)),
  "person.body.waist_width": b((x, v) => (x.waistWidth = v)),
  "person.body.waist_curvature": b((x, v) => (x.waistCurve = v)),
  "person.body.pelvis_width": b((x, v) => (x.pelvisWidth = v)),
  "person.body.waist_hip_contrast": b((x, v) => (x.waistHip = v)),
  "person.body.arm_length": b((x, v) => (x.armLen = v)),
  "person.body.upper_arm_thickness": b((x, v) => (x.upperArm = v)),
  "person.body.forearm_thickness": b((x, v) => (x.forearm = v)),
  "person.body.hand_size": b((x, v) => (x.handSize = v)),
  "person.body.leg_length": b((x, v) => (x.legLen = v)),
  "person.body.thigh_thickness": b((x, v) => (x.thigh = v)),
  "person.body.calf_thickness": b((x, v) => (x.calf = v)),
  "person.body.ankle_thickness": b((x, v) => (x.ankle = v)),
  "person.body.foot_size": b((x, v) => (x.footSize = v)),
  "person.body.leg_alignment": single(["straight", "naturally_curved", "bow_legged", "knock_kneed"] as const, (p, v) => (p.body.legAlign = v)),
  // wardrobe
  "person.clothing.fit": single(FITS, (p, v) => (p.outfit.fit = v)),
  "person.clothing.tops.type": garmentType(Object.keys(TOP_TYPES), (p) => (p.outfit.topNone = true), (p, id) => (top(p).type = id)),
  "person.clothing.tops.fit": single(FITS, (p, v) => (top(p).fit = v)),
  "person.clothing.tops.neckline": single(NECKLINES, (p, v) => (top(p).neckline = v)),
  "person.clothing.tops.collar": single(["none", "point", "spread", "button_down", "mandarin", "stand", "peter_pan", "sailor", "shawl", "notched_lapel", "peak_lapel"] as const, (p, v) => (top(p).collar = v)),
  "person.clothing.tops.sleeve_length": single(SLEEVE_LEN, (p, v) => (top(p).sleeveLength = v)),
  "person.clothing.tops.sleeve_style": single(SLEEVE_STYLE, (p, v) => (top(p).sleeveStyle = v)),
  "person.clothing.tops.length": single(["cropped", "waist", "hip", "longline"] as const, (p, v) => (top(p).length = v)),
  "person.clothing.tops.primary_color": color((p, c) => (top(p).color = c)),
  "person.clothing.bottoms.type": garmentType(Object.keys(BOTTOM_TYPES), (p) => (p.outfit.bottomNone = true), (p, id) => (bottom(p).type = id)),
  "person.clothing.bottoms.fit": single(FITS, (p, v) => (bottom(p).fit = v)),
  "person.clothing.bottoms.waist_rise": single(["low", "mid", "high"] as const, (p, v) => (bottom(p).rise = v)),
  "person.clothing.bottoms.leg_cut": single(["straight", "tapered", "wide", "flared", "bootcut"] as const, (p, v) => (bottom(p).legCut = v)),
  "person.clothing.bottoms.hem_length": single(["short", "knee", "calf", "ankle", "full"] as const, (p, v) => (bottom(p).hem = v)),
  "person.clothing.bottoms.primary_color": color((p, c) => (bottom(p).color = c)),
  "person.clothing.one_piece.type": garmentType(Object.keys(DRESS_TYPES), () => undefined, (p, id) => (dress(p).type = id)),
  "person.clothing.one_piece.fit": single(FITS, (p, v) => (dress(p).fit = v as Fit)),
  "person.clothing.one_piece.neckline": single(NECKLINES, (p, v) => (dress(p).neckline = v)),
  "person.clothing.one_piece.sleeve_length": single(SLEEVE_LEN, (p, v) => (dress(p).sleeveLength = v)),
  "person.clothing.one_piece.sleeve_style": single(SLEEVE_STYLE, (p, v) => (dress(p).sleeveStyle = v)),
  "person.clothing.one_piece.waist_design": single(["natural", "empire", "drop", "belted", "cinched", "undefined"] as const, (p, v) => (dress(p).waist = v)),
  "person.clothing.one_piece.hem_length": single(["mini", "above_knee", "knee", "midi", "ankle", "floor"] as const, (p, v) => (dress(p).hem = v)),
  "person.clothing.one_piece.skirt_silhouette": single(["a_line", "straight", "pencil", "flared", "full", "mermaid", "tiered"] as const, (p, v) => (dress(p).skirt = v)),
  "person.clothing.one_piece.primary_color": color((p, c) => (dress(p).color = c)),
  // pose (Sprint 2-D.4); balance, tension, gestures, speed, phase and support stay text
  "person.pose.posture": single(["standing", "sitting", "lying_down", "reclining", "kneeling", "crouching", "squatting"] as const, (p, v) => (p.pose.posture = v)),
  "person.pose.body_orientation": single(["front", "left", "right", "rear", "three_quarter"] as const, (p, v) => (p.pose.orientation = v)),
  "person.pose.torso_rotation": single(["left", "neutral", "right"] as const, (p, v) => (p.pose.torsoRotation = v)),
  "person.pose.torso_lean": single(["forward", "upright", "backward", "sideways"] as const, (p, v) => (p.pose.lean = v)),
  "person.pose.weight_shift": single(["even", "left_leg", "right_leg"] as const, (p, v) => (p.pose.weight = v)),
  "person.pose.head_direction": single(["forward", "left", "right", "up", "down"] as const, (p, v) => (p.pose.headDirection = v)),
  "person.pose.head_tilt": single(["left", "upright", "right"] as const, (p, v) => (p.pose.headTilt = v)),
  "person.pose.chin": single(["lowered", "neutral", "raised"] as const, (p, v) => (p.pose.chin = v)),
  "person.pose.gaze_direction": single(["camera", "left", "right", "up", "down", "distance", "away"] as const, (p, v) => (p.pose.gaze = v)),
  "person.pose.arms": single(["relaxed", "crossed", "raised", "outstretched", "behind_back"] as const, (p, v) => (p.pose.arms = v)),
  "person.pose.elbows": single(["straight", "slightly_bent", "bent"] as const, (p, v) => (p.pose.elbows = v)),
  "person.pose.hand_position": single(["at_sides", "on_hips", "in_pockets", "near_face", "behind_head", "behind_back", "on_lap"] as const, (p, v) => (p.pose.hands = v)),
  "person.pose.legs": single(["together", "apart", "crossed", "one_bent", "one_raised"] as const, (p, v) => (p.pose.legs = v)),
  "person.pose.knees": single(["straight", "slightly_bent", "bent"] as const, (p, v) => (p.pose.knees = v)),
  "person.pose.feet": single(["forward", "inward", "outward"] as const, (p, v) => (p.pose.feet = v)),
  "person.pose.action": {
    kind: "option",
    // one action is drawn (the first chosen); further actions are reported as not drawn
    set: (p, ids) => {
      const first = ids.find((x) => (ACTIONS as readonly string[]).includes(x));
      if (first) p.pose.action = first as PoseParams["action"];
      return ids.filter((x) => x !== first);
    },
  },
};

export type FigureSketchState = SketchState<FigureParams>;

export const figureSketchState = (registry: CatalogRegistry, spec: ImageSpec, force?: string): FigureSketchState => {
  const params: FigureParams = { body: neutralBody(), outfit: { top: null, bottom: null, dress: null, fit: null, topNone: false, bottomNone: false }, hair: noHair(), pose: neutralPose() };
  const s = runBindings(registry, spec, (c) => isFigureCategory(registry, c), FIGURE_BINDINGS, params, force);
  // A one-piece is worn instead of a separate top and bottom: those settings are then not drawn.
  if (params.outfit.dress) {
    const covered = s.drawn.filter((id) => id.startsWith("person.clothing.tops.") || id.startsWith("person.clothing.bottoms."));
    s.drawn = s.drawn.filter((id) => !covered.includes(id));
    s.notDrawn.push(...covered);
  }
  // Hair on the figure follows the (applicable, included) hair settings of the Face Builder.
  const h = faceSketchState(registry, spec).params.hair;
  if (!hairIsEmpty(h) && h.presence !== "bald" && h.presence !== "shaved")
    params.hair = { length: h.length, style: h.style && h.style in HAIR_STYLES ? (h.style as HairStyle) : null, texture: h.texture, volume: h.volume, color: h.color, none: false };
  return s;
};
