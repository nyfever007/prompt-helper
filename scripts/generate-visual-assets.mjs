#!/usr/bin/env node
/**
 * Visual example assets (Sprint 2-D.1 TD-03, extended in Sprint 2-D.2 and 2-D.3) — original line art drawn
 * by the SAME geometry as the live Face Builder / Figure Builder (src/visual/*-sketch.ts), so every card of
 * an attribute uses the same canvas, scale, strokes and neutral face / figure, and only the compared
 * feature changes. Clothing cards show the garment over a faint ghost figure (fashion-flat style).
 * Output: public/visual/person/<dir>/<optionId>.svg (static files, loaded lazily by the cards control).
 *
 * Asset standard (docs/VISUAL_EDITOR_PRINCIPLES.md §10):
 * - explains the option's meaning; never predicts an image model's result; never ranks beauty;
 * - neutral grey fill (no skin tone, no gender, no age cues); no hair, no makeup;
 * - light/dark: colours are CSS variables switched by `prefers-color-scheme` inside the SVG
 *   (SVG-as-image follows the page's colour scheme).
 *
 * Run: `node scripts/generate-visual-assets.mjs` (Node ≥ 22.18 strips the module's types; deterministic — commit the output).
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { CROPS, cardSvg, frontLayers, neutralParams, profileLayers } from "../src/visual/face-sketch.ts";
import { HAIR_STYLES, HEAD_CROPS, headLayers, neutralHair } from "../src/visual/hair-sketch.ts";
import { BOTTOM_TYPES, DRESS_TYPES, emptyBottom, emptyDress, emptyTop, FIG_CROPS, figureLayers, neutralBody, noHair, TOP_TYPES } from "../src/visual/figure-sketch.ts";

const OUT = "public/visual/person";
const with_ = (patch) => {
  const p = neutralParams();
  patch(p);
  return p;
};
const front = (p, box) => ({ layers: frontLayers(p), box });
const head = (hair, box = HEAD_CROPS.full) => ({ layers: headLayers(neutralParams(), { ...neutralHair(), ...hair }), box });
const outfit = (o = {}) => ({ top: null, bottom: null, dress: null, fit: null, ...o });
const fig = (body, o, box, { hair = noHair(), ghost = false } = {}) => ({ layers: figureLayers({ ...neutralBody(), ...body }, o, hair, { ghost, base: !ghost }), box });
const garment = (o, box) => fig({}, o, box, { ghost: true });
const top = (t) => outfit({ top: { ...emptyTop(), ...t } });
const dress = (d) => outfit({ dress: { ...emptyDress(), ...d } });
const ids = (record) => Object.keys(record);
const side = (p, box) => ({ layers: profileLayers(p), box });

/** dir → [option ids, (id) => views]. Option ids are the catalog's (checked by tests/unit/visual-examples.test.ts). */
const CARDS = {
  "face-shape": [["oval", "round", "square", "rectangular", "heart", "diamond", "triangular", "inverted_triangular"], (id) => [front(with_((p) => (p.face.shape = id)), CROPS.face)]],
  jawline: [["rounded", "soft", "angular", "defined", "v_shaped", "u_shaped"], (id) => [front(with_((p) => (p.face.jaw = id)), CROPS.jaw)]],
  "eye-shape": [["almond", "round", "oval", "elongated"], (id) => [front(with_((p) => (p.eyes.shape = id)), CROPS.eye)]],
  eyelids: [
    ["monolid", "inner_crease", "thin_double", "defined_double", "hooded"],
    (id) => [front(with_((p) => (id === "hooded" ? (p.eyes.hooded = true) : (p.eyes.crease = id))), CROPS.eye)],
  ],
  "pupil-shape": [["round", "vertical_slit", "horizontal_slit", "star", "heart"], (id) => [front(with_((p) => (p.eyes.pupil = id)), CROPS.pupil)]],
  "eyebrow-shape": [["straight", "soft_arch", "high_arch", "rounded", "angular", "s_shaped"], (id) => [front(with_((p) => (p.brows.shape = id)), CROPS.brow)]],
  "nose-shape": [
    ["straight", "roman", "aquiline", "button", "upturned", "broad", "concave"],
    (id) => {
      const p = with_((q) => (q.nose.shape = id));
      return [side(p, CROPS.noseProfileTall), front(p, CROPS.noseFrontTall)];
    },
  ],
  "nose-bridge": [["straight", "convex", "concave"], (id) => [side(with_((p) => (p.nose.bridge = id)), CROPS.noseProfile)]],
  "nose-tip": [["rounded", "pointed", "broad", "angular", "cleft"], (id) => [front(with_((p) => (p.nose.tip = id)), CROPS.noseFront)]],
  "lip-shape": [["thin", "full", "heart", "rounded", "wide", "balanced"], (id) => [front(with_((p) => (p.lips.shapes = [id])), CROPS.lips)]],
  "cupids-bow": [["flat", "subtle", "defined", "deep"], (id) => [front(with_((p) => (p.lips.bow = id)), CROPS.lips)]],
  "lip-ratio": [["upper_dominant", "balanced", "lower_dominant"], (id) => [front(with_((p) => (p.lips.ratio = id)), CROPS.lips)]],
  // ── Sprint 2-D.3: hair (same reference face) ──
  "hair-style": [ids(HAIR_STYLES), (id) => [head({ style: id })]],
  "hair-texture": [["straight", "wavy", "curly", "tightly_curly", "coily"], (id) => [head({ texture: id, length: "shoulder" })]],
  "hair-length": [
    ["extremely_short", "ear", "chin", "neck", "shoulder", "chest", "mid_back", "waist", "hip", "knee", "floor"],
    (id) => [fig({}, outfit(), FIG_CROPS.figure, { hair: { ...noHair(), none: false, length: id } })],
  ],
  bangs: [["none", "blunt", "wispy", "curtain", "side_swept", "choppy", "asymmetric", "micro", "feathered"], (id) => [head({ bangs: id, length: "chin" }, HEAD_CROPS.bangs)]],
  "hair-part": [["none", "center", "left", "right", "deep_left", "deep_right"], (id) => [head({ part: id, length: "chin" }, HEAD_CROPS.top)]],
  // ── body (neutral mannequin with plain base clothing) ──
  "body-build": [["lean", "slender", "average", "athletic", "muscular", "plump", "heavyset"], (id) => [fig({ build: id }, outfit(), FIG_CROPS.body)]],
  "body-silhouette": [["rectangular", "hourglass", "triangular", "inverted_triangular", "oval"], (id) => [fig({ silhouette: id }, outfit(), FIG_CROPS.torso)]],
  "body-proportions": [["natural", "elongated", "compact", "exaggerated", "chibi"], (id) => [fig({ proportions: id }, outfit(), FIG_CROPS.figure)]],
  "upper-lower": [["longer_upper", "balanced", "longer_lower"], (id) => [fig({ ratio: id }, outfit(), FIG_CROPS.figure)]],
  "shoulder-slope": [["sloping", "gently_sloping", "nearly_horizontal"], (id) => [fig({ shoulderSlope: id }, outfit(), FIG_CROPS.shoulders)]],
  "leg-alignment": [["straight", "naturally_curved", "bow_legged", "knock_kneed"], (id) => [fig({ legAlign: id }, outfit(), FIG_CROPS.legs)]],
  // ── clothing (garment over a ghost figure) ──
  neckline: [["crew", "v_neck", "scoop", "square", "boat", "high", "turtleneck", "mock", "halter", "sweetheart", "cowl", "off_shoulder", "asymmetric"], (id) => [garment(top({ neckline: id }), FIG_CROPS.upper)]],
  collar: [["none", "point", "spread", "button_down", "mandarin", "stand", "peter_pan", "sailor", "shawl", "notched_lapel", "peak_lapel"], (id) => [garment(top({ collar: id }), FIG_CROPS.upper)]],
  "sleeve-length": [["sleeveless", "cap", "short", "elbow", "three_quarter", "long", "extra_long"], (id) => [garment(top({ sleeveLength: id }), FIG_CROPS.topArms)]],
  "sleeve-style": [["straight", "fitted", "rolled_up", "puff", "balloon", "bell", "bishop", "raglan", "batwing", "flared"], (id) => [garment(top({ sleeveStyle: id, sleeveLength: id === "rolled_up" ? "elbow" : "long" }), FIG_CROPS.topArms)]],
  "top-length": [["cropped", "waist", "hip", "longline"], (id) => [garment(top({ length: id }), FIG_CROPS.topArms)]],
  fit: [["tight", "slim", "regular", "relaxed", "loose", "oversized"], (id) => [garment(outfit({ fit: id, top: emptyTop(), bottom: emptyBottom() }), FIG_CROPS.figure)]],
  "top-type": [ids(TOP_TYPES), (id) => [garment(top({ type: id }), FIG_CROPS.topArms)]],
  "bottom-type": [ids(BOTTOM_TYPES), (id) => [garment(outfit({ bottom: { ...emptyBottom(), type: id } }), FIG_CROPS.lower)]],
  "leg-cut": [["straight", "tapered", "wide", "flared", "bootcut"], (id) => [garment(outfit({ bottom: { ...emptyBottom(), legCut: id } }), FIG_CROPS.lower)]],
  "bottom-hem": [["short", "knee", "calf", "ankle", "full"], (id) => [garment(outfit({ bottom: { ...emptyBottom(), hem: id } }), FIG_CROPS.lower)]],
  "waist-rise": [["low", "mid", "high"], (id) => [garment(outfit({ bottom: { ...emptyBottom(), rise: id } }), FIG_CROPS.torso)]],
  "dress-type": [ids(DRESS_TYPES), (id) => [garment(dress({ type: id }), FIG_CROPS.figure)]],
  "skirt-silhouette": [["a_line", "straight", "pencil", "flared", "full", "mermaid", "tiered"], (id) => [garment(dress({ skirt: id }), FIG_CROPS.figure)]],
  "waist-design": [["natural", "empire", "drop", "belted", "cinched", "undefined"], (id) => [garment(dress({ waist: id }), FIG_CROPS.figure)]],
  "dress-hem": [["mini", "above_knee", "knee", "midi", "ankle", "floor"], (id) => [garment(dress({ hem: id }), FIG_CROPS.figure)]],
};

let n = 0;
for (const [dir, [ids, views]] of Object.entries(CARDS)) {
  rmSync(`${OUT}/${dir}`, { recursive: true, force: true });
  mkdirSync(`${OUT}/${dir}`, { recursive: true });
  for (const id of ids) {
    writeFileSync(`${OUT}/${dir}/${id}.svg`, cardSvg(views(id)));
    n++;
  }
}
console.log(`wrote ${n} SVGs to ${OUT}`);
