import type { CatalogRegistry, ImageSpec } from "@/domain";
import { neutralParams, type FaceParams } from "@/visual/face-sketch";
import { HAIR_STYLES, neutralHair, type HairParams, type HairStyle } from "@/visual/hair-sketch";
import { color, degree, runBindings, single, type Binding, type SketchState } from "../sketch/bindings";

/**
 * Sprint 2-D.2 — ImageSpec → face sketch parameters (read-only; see ../sketch/bindings.ts for the rules).
 * Sprint 2-D.3 adds hair, drawn on the same reference face.
 */
export const FACE_CATEGORY_IDS = ["person_face", "person_eyes", "person_eyebrows", "person_nose", "person_lips", "person_hair"] as const;
export type FaceCategoryId = (typeof FACE_CATEGORY_IDS)[number];
export type FaceSketchParams = FaceParams & { hair: HairParams };

/** Which catalog attributes the sketch draws, and how. Everything else in these areas is “not shown”. */
export const FACE_BINDINGS: Record<string, Binding<FaceSketchParams>> = {
  "person.face.shape": single(["oval", "round", "square", "rectangular", "heart", "diamond", "triangular", "inverted_triangular"], (p, v) => (p.face.shape = v)),
  "person.face.length": degree((p, v) => (p.face.length = v)),
  "person.face.width": degree((p, v) => (p.face.width = v)),
  "person.face.forehead_height": degree((p, v) => (p.face.foreheadHeight = v)),
  "person.face.forehead_width": degree((p, v) => (p.face.foreheadWidth = v)),
  "person.face.chin": {
    kind: "option",
    // profile only: projection. Rounded / pointed / square / cleft are not drawn.
    set: (p, ids) => {
      const proj = ids.filter((x) => x === "protruding" || x === "recessed");
      if (proj.length === 1) p.face.chin = proj[0] as "protruding" | "recessed";
      return ids.filter((x) => !(proj.length === 1 && x === proj[0]));
    },
  },
  "person.eyes.shape": single(["almond", "round", "oval", "elongated"], (p, v) => (p.eyes.shape = v)),
  "person.eyes.size": degree((p, v) => (p.eyes.size = v)),
  "person.eyes.width": degree((p, v) => (p.eyes.width = v)),
  "person.eyes.height": degree((p, v) => (p.eyes.height = v)),
  "person.eyes.spacing": degree((p, v) => (p.eyes.spacing = v)),
  "person.eyes.outer_corner_angle": degree((p, v) => (p.eyes.tilt = v)),
  "person.eyes.iris_size": degree((p, v) => (p.eyes.irisSize = v)),
  "person.eyes.eyelids": {
    kind: "option",
    // one crease type (the first chosen) + hooded lids, which combine with any crease
    set: (p, ids) => {
      const creases = ids.filter((x): x is "monolid" | "inner_crease" | "thin_double" | "defined_double" => ["monolid", "inner_crease", "thin_double", "defined_double"].includes(x));
      if (creases[0]) p.eyes.crease = creases[0];
      if (ids.includes("hooded")) p.eyes.hooded = true;
      return ids.filter((x) => x !== "hooded" && x !== creases[0]);
    },
  },
  "person.eyes.pupil_shape": single(["round", "vertical_slit", "horizontal_slit", "star", "heart"], (p, v) => (p.eyes.pupil = v)),
  "person.eyes.iris_color": color((p, c) => (p.eyes.irisColor = c)),
  "person.eyebrows.shape": single(["straight", "soft_arch", "high_arch", "rounded", "angular", "s_shaped"], (p, v) => (p.brows.shape = v)),
  "person.eyebrows.thickness": degree((p, v) => (p.brows.thickness = v)),
  "person.eyebrows.length": degree((p, v) => (p.brows.length = v)),
  "person.eyebrows.density": degree((p, v) => (p.brows.density = v)),
  "person.eyebrows.angle": degree((p, v) => (p.brows.angle = v)),
  "person.eyebrows.height": degree((p, v) => (p.brows.height = v)),
  "person.eyebrows.spacing": degree((p, v) => (p.brows.spacing = v)),
  "person.eyebrows.color": color((p, c) => (p.brows.color = c)),
  "person.nose.shape": single(["straight", "roman", "aquiline", "button", "upturned", "broad", "concave"], (p, v) => (p.nose.shape = v)),
  "person.nose.length": degree((p, v) => (p.nose.length = v)),
  "person.nose.width": degree((p, v) => (p.nose.width = v)),
  "person.nose.alar_width": degree((p, v) => (p.nose.alar = v)),
  "person.nose.bridge_height": degree((p, v) => (p.nose.bridgeHeight = v)),
  "person.nose.bridge_shape": single(["straight", "convex", "concave"], (p, v) => (p.nose.bridge = v)),
  "person.nose.tip_shape": single(["rounded", "pointed", "broad", "angular", "cleft"], (p, v) => (p.nose.tip = v)),
  "person.nose.tip_angle": degree((p, v) => (p.nose.tipAngle = v)),
  "person.lips.shape": {
    kind: "option",
    set: (p, ids) => {
      const known = ids.filter((x): x is FaceSketchParams["lips"]["shapes"][number] => ["thin", "full", "heart", "rounded", "wide", "balanced"].includes(x));
      p.lips.shapes = known;
      return ids.filter((x) => !known.includes(x as never));
    },
  },
  "person.lips.mouth_width": degree((p, v) => (p.lips.width = v)),
  "person.lips.upper_thickness": degree((p, v) => (p.lips.upper = v)),
  "person.lips.lower_thickness": degree((p, v) => (p.lips.lower = v)),
  "person.lips.ratio": single(["upper_dominant", "balanced", "lower_dominant"], (p, v) => (p.lips.ratio = v)),
  "person.lips.cupids_bow": single(["flat", "subtle", "defined", "deep"], (p, v) => (p.lips.bow = v)),
  "person.lips.corners": degree((p, v) => (p.lips.corners = v)),
  "person.lips.natural_color": color((p, c) => (p.lips.color = c)),
  // Sprint 2-D.3: hair (drawn on the same face; other hair attributes are reported as text)
  "person.hair.presence": single(["present", "shaved", "bald", "partial_loss"], (p, v) => (p.hair.presence = v)),
  "person.hair.length": single(["extremely_short", "ear", "chin", "neck", "shoulder", "chest", "mid_back", "waist", "hip", "knee", "floor"], (p, v) => (p.hair.length = v)),
  "person.hair.texture": single(["straight", "wavy", "curly", "tightly_curly", "coily"], (p, v) => (p.hair.texture = v)),
  "person.hair.volume": degree((p, v) => (p.hair.volume = v)),
  "person.hair.part": single(["none", "center", "left", "right", "deep_left", "deep_right"], (p, v) => (p.hair.part = v)),
  "person.hair.bangs_style": single(["none", "blunt", "wispy", "curtain", "side_swept", "choppy", "asymmetric", "micro", "feathered"], (p, v) => (p.hair.bangs = v)),
  "person.hair.bangs_length": single(["very_short", "above_brows", "brow", "eye", "long"], (p, v) => (p.hair.bangsLength = v)),
  "person.hair.style": single(Object.keys(HAIR_STYLES) as HairStyle[], (p, v) => (p.hair.style = v)),
  "person.hair.primary_color": color((p, c) => (p.hair.color = c)),
};

export type FaceSketchState = SketchState<FaceSketchParams>;
export const neutralFaceSketch = (): FaceSketchParams => ({ ...neutralParams(), hair: neutralHair() });

/** @param force draw this attribute's stored value even when excluded/inactive (a slider's own preview explains its value). */
export const faceSketchState = (registry: CatalogRegistry, spec: ImageSpec, force?: string): FaceSketchState =>
  runBindings(registry, spec, (c) => (FACE_CATEGORY_IDS as readonly string[]).includes(c), FACE_BINDINGS, neutralFaceSketch(), force);
