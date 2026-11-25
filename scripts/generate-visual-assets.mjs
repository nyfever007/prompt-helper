#!/usr/bin/env node
/**
 * Visual example assets (Sprint 2-D.1 TD-03, extended in Sprint 2-D.2) — original line art drawn by the
 * SAME geometry as the live Face Builder (src/visual/face-sketch.ts), so every card of an attribute uses
 * the same canvas, scale, strokes and neutral face, and only the compared feature changes.
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

const OUT = "public/visual/person";
const with_ = (patch) => {
  const p = neutralParams();
  patch(p);
  return p;
};
const front = (p, box) => ({ layers: frontLayers(p), box });
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
