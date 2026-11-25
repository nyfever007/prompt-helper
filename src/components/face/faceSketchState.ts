import { isAttributeActive, isOptionAttribute, selectedCustomEntries, selectedOptionIds, type CatalogRegistry, type ImageSpec } from "@/domain";
import { neutralParams, type FaceParams } from "@/visual/face-sketch";

/**
 * Sprint 2-D.2 — ImageSpec → face sketch parameters. READ-ONLY: the sketch never writes to the spec.
 *
 * - Unset attributes keep the preview-only neutral form (NEUTRAL); nothing is stored or prompted.
 * - A selection that is excluded from the prompt, or not applicable, is NOT drawn (the sketch shows what
 *   the prompt describes) and is reported, so the user can see why.
 * - Custom values and options without a drawing are reported as “not shown in the sketch”.
 */
export const FACE_CATEGORY_IDS = ["person_face", "person_eyes", "person_eyebrows", "person_nose", "person_lips"] as const;
export type FaceCategoryId = (typeof FACE_CATEGORY_IDS)[number];

type Swatch = (optionId: string) => string | null;
type Binding =
  | { kind: "degree"; set(p: FaceParams, v: number): void }
  /** Returns the option ids it could NOT draw. */
  | { kind: "option"; set(p: FaceParams, ids: string[], swatch: Swatch): string[] };

const degree = (set: (p: FaceParams, v: number) => void): Binding => ({ kind: "degree", set });
const single = <T extends string>(known: readonly T[], set: (p: FaceParams, id: T) => void): Binding => ({
  kind: "option",
  set: (p, ids) => {
    const id = ids[0];
    if (id && (known as readonly string[]).includes(id)) {
      set(p, id as T);
      return [];
    }
    return ids;
  },
});
const color = (set: (p: FaceParams, c: string) => void): Binding => ({
  kind: "option",
  set: (p, ids, swatch) => {
    const c = ids[0] ? swatch(ids[0]) : null;
    if (c) set(p, c);
    return c ? [] : ids;
  },
});

/** Which catalog attributes the sketch draws, and how. Everything else in the five areas is “not shown”. */
export const FACE_BINDINGS: Record<string, Binding> = {
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
      const known = ids.filter((x): x is FaceParams["lips"]["shapes"][number] => ["thin", "full", "heart", "rounded", "wide", "balanced"].includes(x));
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
};

export interface FaceSketchState {
  params: FaceParams;
  /** Set and drawn. */
  drawn: string[];
  /** Set but excluded from the prompt — not drawn. */
  excluded: string[];
  /** Set but not applicable in the current context — not drawn. */
  inactive: string[];
  /** Set, but (part of) the value has no drawing (custom values, attributes without a sketch). */
  notDrawn: string[];
}

/**
 * @param force draw this attribute's stored value even when excluded/inactive (a slider's own preview explains its value).
 */
export const faceSketchState = (registry: CatalogRegistry, spec: ImageSpec, force?: string): FaceSketchState => {
  const params = neutralParams();
  const state: FaceSketchState = { params, drawn: [], excluded: [], inactive: [], notDrawn: [] };
  for (const a of registry.attributes()) {
    if (!a.categoryId || !(FACE_CATEGORY_IDS as readonly string[]).includes(a.categoryId)) continue;
    const sel = spec.selections[a.id];
    if (!sel) continue;
    if (a.id !== force) {
      if (sel.excludedFromPrompt) {
        state.excluded.push(a.id);
        continue;
      }
      if (!isAttributeActive(registry, a, spec)) {
        state.inactive.push(a.id);
        continue;
      }
    }
    const b = FACE_BINDINGS[a.id];
    if (!b) {
      state.notDrawn.push(a.id);
      continue;
    }
    if (b.kind === "degree") {
      if (sel.value.kind === "number") {
        b.set(params, sel.value.value);
        state.drawn.push(a.id);
      } else state.notDrawn.push(a.id);
      continue;
    }
    const ids = selectedOptionIds(sel.value);
    const swatch: Swatch = (id) => (isOptionAttribute(a) ? (a.options.find((o) => o.id === id)?.swatch ?? null) : null);
    const missed = b.set(params, ids, swatch);
    if (ids.length > missed.length) state.drawn.push(a.id);
    if (missed.length > 0 || selectedCustomEntries(sel.value).length > 0) state.notDrawn.push(a.id);
  }
  return state;
};
