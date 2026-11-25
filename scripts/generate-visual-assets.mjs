#!/usr/bin/env node
/**
 * Visual example assets (Sprint 2-D.1, TD-03) — original line art generated from code, so every option
 * of an attribute is drawn on the SAME canvas, scale, stroke and neutral fill, and only the compared
 * feature changes. Output: public/visual/person/<attribute>/<optionId>.svg (static files, loaded lazily).
 *
 * Asset standard (docs/VISUAL_EDITOR_PRINCIPLES.md §10):
 * - explains the option's meaning; never predicts an image model's result; never ranks beauty;
 * - neutral grey fill (no skin tone, no gender, no age cues); no hair, no makeup;
 * - light/dark: colours are CSS variables switched by `prefers-color-scheme` inside the SVG
 *   (SVG-as-image follows the page's colour scheme), lines ≥ 3:1 against the card background.
 *
 * Run: `node scripts/generate-visual-assets.mjs` (deterministic; commit the output).
 */
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "public/visual/person";
const W = 160;
const H = 120;
const STYLE = `<style>
svg{--ink:#34322e;--fill:#ecebe7;--soft:#8c887f;--iris:#a9a59c}
@media (prefers-color-scheme:dark){svg{--ink:#ebe8e2;--fill:#34332f;--soft:#9d998f;--iris:#6d6a63}}
.o{fill:var(--fill);stroke:var(--ink);stroke-width:2.6;stroke-linejoin:round}
.l{fill:none;stroke:var(--ink);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.s{fill:none;stroke:var(--soft);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.b{fill:none;stroke:var(--ink);stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
.i{fill:var(--iris)}.p{fill:var(--ink)}.h{fill:var(--fill)}
</style>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${STYLE}${body}</svg>\n`;
const f = (n) => Number(n.toFixed(1));

/** Closed Catmull-Rom spline through points → cubic Bézier path (smooth outline). */
const closedSpline = (pts) => {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
};

// ── Face shape: right-half profile [halfWidth, y] from the top centre down to the chin centre ──
const CX = 80;
const FACE = {
  oval: [[0, 14], [20, 20], [28, 34], [31, 56], [29, 76], [21, 94], [10, 104], [0, 107]],
  round: [[0, 22], [22, 25], [33, 36], [38, 56], [36, 76], [27, 94], [13, 102], [0, 104]],
  square: [[0, 16], [30, 16.5], [35, 22], [35.5, 40], [35.5, 82], [34.5, 97], [27, 103], [0, 104]],
  rectangular: [[0, 8], [20, 11], [26, 24], [27, 52], [27, 82], [25, 100], [16, 108], [0, 110]],
  heart: [[0, 20], [16, 16], [32, 21], [35, 38], [32, 60], [24, 80], [12, 98], [0, 108]],
  diamond: [[0, 12], [12, 16], [21, 30], [34, 56], [26, 80], [14, 98], [0, 108]],
  triangular: [[0, 18], [16, 20], [22, 32], [27, 54], [33, 78], [33, 94], [20, 103], [0, 105]],
  inverted_triangular: [[0, 16], [26, 18], [34, 30], [32, 52], [26, 74], [18, 94], [9, 103], [0, 106]],
};
const faceFeatures = [
  // identical in every face shape (only the outline is compared)
  `<path class="s" d="M${CX - 20} 52 Q${CX - 13} 48 ${CX - 6} 52M${CX + 6} 52 Q${CX + 13} 48 ${CX + 20} 52"/>`,
  `<path class="s" d="M${CX - 19} 60 Q${CX - 13} 56 ${CX - 7} 60 Q${CX - 13} 63 ${CX - 19} 60ZM${CX + 7} 60 Q${CX + 13} 56 ${CX + 19} 60 Q${CX + 13} 63 ${CX + 7} 60Z"/>`,
  `<path class="s" d="M${CX} 62 L${CX - 2} 74 Q${CX} 76 ${CX + 3} 75"/>`,
  `<path class="s" d="M${CX - 8} 86 Q${CX} 89 ${CX + 8} 86"/>`,
].join("");
const facePath = (half) => {
  const right = half.map(([w, y]) => [CX + w, y]);
  const left = half.slice(1, -1).reverse().map(([w, y]) => [CX - w, y]);
  return closedSpline([...right, ...left]);
};

// ── Eye shape: corners at the same height (tilt is a separate attribute), same iris ────────────
const EYE = {
  //            inner corner, outer corner, upper-lid controls,    lower-lid controls
  almond: { a: [44, 60], b: [116, 60], u: [[62, 38], [98, 38]], d: [[98, 76], [62, 76]] },
  round: { a: [52, 60], b: [108, 60], u: [[54, 26], [106, 26]], d: [[106, 94], [54, 94]] },
  oval: { a: [46, 60], b: [114, 60], u: [[48, 36], [112, 36]], d: [[112, 84], [48, 84]] },
  elongated: { a: [30, 60], b: [130, 60], u: [[58, 44], [102, 44]], d: [[102, 72], [58, 72]] },
};
const eyePath = ({ a, b, u, d }) => `M${a[0]} ${a[1]} C${u[0][0]} ${u[0][1]} ${u[1][0]} ${u[1][1]} ${b[0]} ${b[1]} C${d[0][0]} ${d[0][1]} ${d[1][0]} ${d[1][1]} ${a[0]} ${a[1]}Z`;
const eyeSvg = (id) => {
  const p = eyePath(EYE[id]);
  return svg(
    `<defs><clipPath id="e"><path d="${p}"/></clipPath></defs>` +
      `<path class="o" d="${p}"/>` +
      `<g clip-path="url(#e)"><circle class="i" cx="80" cy="60" r="15"/><circle class="p" cx="80" cy="60" r="6"/><circle class="h" cx="84" cy="56" r="2.2"/></g>` +
      `<path class="l" d="${p}"/>`,
  );
};

// ── Eyebrow shape: the same reference eye; only the brow contour changes ───────────────────────
const REF_EYE = "M54 80 C64 70 96 70 106 80 C96 88 64 88 54 80Z";
const BROW = {
  straight: "M44 52 L116 50",
  soft_arch: "M44 54 C66 42 92 39 116 50",
  high_arch: "M44 58 C62 34 84 26 116 52",
  rounded: "M44 58 C48 32 112 32 116 58",
  angular: "M44 55 L94 37 L116 52",
  s_shaped: "M44 48 C56 56 70 54 84 44 C96 36 108 40 116 50",
};
const browSvg = (id) => svg(`<path class="s" d="${REF_EYE}"/><circle class="s" cx="80" cy="79" r="6"/><path class="b" d="${BROW[id]}"/>`);

const write = (dir, id, content) => {
  mkdirSync(`${OUT}/${dir}`, { recursive: true });
  writeFileSync(`${OUT}/${dir}/${id}.svg`, content);
};
for (const id of Object.keys(FACE)) write("face-shape", id, svg(`<path class="o" d="${facePath(FACE[id])}"/>${faceFeatures}`));
for (const id of Object.keys(EYE)) write("eye-shape", id, eyeSvg(id));
for (const id of Object.keys(BROW)) write("eyebrow-shape", id, browSvg(id));
console.log(`wrote ${Object.keys(FACE).length + Object.keys(EYE).length + Object.keys(BROW).length} SVGs to ${OUT}`);
