/**
 * Face sketch geometry (Sprint 2-D.2) — ONE drawing model for the static visual-choice cards
 * (scripts/generate-visual-assets.mjs) and the live Face Builder / slider previews (React).
 *
 * - Pure and deterministic: parameters in, primitive elements out (numbers rounded to 0.1).
 * - Self-contained (no imports, erasable TypeScript only) so Node can run the generator directly.
 * - Explains MEANING with simple, neutral line art: no skin tone, hair, makeup, age or gender cues;
 *   it never predicts what an image model will generate and never ranks appearance.
 * - Every relative slider is 1–5 with 3 = neutral; option ids are the catalog's own ids.
 * - Colours are CSS classes (see SKETCH_STYLE / globals.css `.face-sketch`) so light/dark themes work;
 *   only chosen iris / lip / brow swatches are applied as explicit fills.
 */

export type FaceShape = "oval" | "round" | "square" | "rectangular" | "heart" | "diamond" | "triangular" | "inverted_triangular";
export type JawShape = "rounded" | "soft" | "angular" | "defined" | "v_shaped" | "u_shaped";
export type EyeShape = "almond" | "round" | "oval" | "elongated";
export type Crease = "none" | "monolid" | "inner_crease" | "thin_double" | "defined_double";
export type Pupil = "round" | "vertical_slit" | "horizontal_slit" | "star" | "heart";
export type BrowShape = "straight" | "soft_arch" | "high_arch" | "rounded" | "angular" | "s_shaped";
export type NoseShape = "straight" | "roman" | "aquiline" | "button" | "upturned" | "broad" | "concave";
export type BridgeShape = "straight" | "convex" | "concave";
export type TipShape = "rounded" | "pointed" | "broad" | "angular" | "cleft";
export type LipShape = "thin" | "full" | "heart" | "rounded" | "wide" | "balanced";
export type CupidsBow = "flat" | "subtle" | "defined" | "deep";
export type LipRatio = "upper_dominant" | "balanced" | "lower_dominant";
export type ChinProjection = "neutral" | "protruding" | "recessed";

export interface FaceParams {
  face: { shape: FaceShape; jaw: JawShape | null; length: number; width: number; foreheadHeight: number; foreheadWidth: number; chin: ChinProjection };
  eyes: { shape: EyeShape; size: number; width: number; height: number; spacing: number; tilt: number; irisSize: number; crease: Crease; hooded: boolean; pupil: Pupil; irisColor: string | null };
  brows: { shape: BrowShape; thickness: number; length: number; density: number; angle: number; height: number; spacing: number; color: string | null };
  nose: { shape: NoseShape | null; length: number; width: number; alar: number; bridgeHeight: number; bridge: BridgeShape | null; tip: TipShape; tipAngle: number | null };
  lips: { shapes: LipShape[]; width: number; upper: number; lower: number; ratio: LipRatio; bow: CupidsBow; corners: number; color: string | null };
}

/** Preview-only neutral form for anything the user has not set (never stored, never in the prompt). */
export const NEUTRAL: FaceParams = {
  face: { shape: "oval", jaw: null, length: 3, width: 3, foreheadHeight: 3, foreheadWidth: 3, chin: "neutral" },
  eyes: { shape: "almond", size: 3, width: 3, height: 3, spacing: 3, tilt: 3, irisSize: 3, crease: "none", hooded: false, pupil: "round", irisColor: null },
  brows: { shape: "soft_arch", thickness: 3, length: 3, density: 3, angle: 3, height: 3, spacing: 3, color: null },
  nose: { shape: null, length: 3, width: 3, alar: 3, bridgeHeight: 3, bridge: null, tip: "rounded", tipAngle: null },
  lips: { shapes: [], width: 3, upper: 3, lower: 3, ratio: "balanced", bow: "subtle", corners: 3, color: null },
};

export const neutralParams = (): FaceParams => JSON.parse(JSON.stringify(NEUTRAL)) as FaceParams;

export type LayerId = "base" | "face" | "eyes" | "brows" | "nose" | "lips";
export type El =
  | { t: "path"; d: string; c: string; fill?: string; opacity?: number }
  | { t: "circle"; cx: number; cy: number; r: number; c: string; fill?: string }
  | { t: "clip"; d: string; children: El[] };
export interface Layer {
  id: LayerId;
  els: El[];
}

// ── Views and crops (viewBox x y w h) ───────────────────────────────────────────────────────
export type Box = readonly [number, number, number, number];
export const FRONT_BOX: Box = [0, 0, 200, 250];
export const PROFILE_BOX: Box = [20, 14, 180, 236];
export const CROPS = {
  face: [-41.3, 14, 282.7, 212],
  jaw: [17.3, 94, 165.3, 124],
  eye: [99, 96, 60, 45],
  pupil: [109, 110, 40, 30],
  brow: [97, 86.5, 68, 51],
  eyes: [48, 80, 104, 78],
  noseFront: [70, 129, 60, 45],
  noseFrontWide: [62, 110, 76, 57],
  lips: [76, 161, 48, 36],
  lipsWide: [77, 163, 46, 34.5],
  noseProfile: [122, 106, 72, 54],
  noseProfileTall: [142, 112, 32, 48],
  noseFrontTall: [84, 124, 32, 48],
} as const satisfies Record<string, Box>;
export const boxAttr = (b: Box): string => b.map(r1).join(" ");

// ── Small helpers ───────────────────────────────────────────────────────────────────────────
type P = [number, number];
const r1 = (n: number): number => Math.round(n * 10) / 10 + 0; // + 0 turns -0 into 0
const pt = (p: P): string => `${r1(p[0])} ${r1(p[1])}`;
const lv = (v: number): number => v - 3;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Closed Catmull-Rom spline through points → cubic Bézier path. A repeated point makes a corner. */
const closedSpline = (pts: P[]): string => {
  const n = pts.length;
  let d = `M${pt(pts[0]!)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    d += ` C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  return `${d} Z`;
};
/** Open Catmull-Rom spline (end points repeated as phantoms). */
const openSpline = (pts: P[]): string => {
  const ext = [pts[0]!, ...pts, pts[pts.length - 1]!];
  let d = `M${pt(pts[0]!)}`;
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = [ext[i - 1]!, ext[i]!, ext[i + 1]!, ext[i + 2]!];
    d += ` C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  return d;
};
const bezier = (a: P, b: P, c: P, d: P, t: number): P => {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
};
/** Point at fraction s of a polyline (linear) — used for brow centrelines. */
const along = (pts: P[], s: number, smooth: boolean): P => {
  const segs = pts.length - 1;
  const x = clamp(s, 0, 1) * segs;
  const i = Math.min(segs - 1, Math.floor(x));
  const t = x - i;
  const p1 = pts[i]!;
  const p2 = pts[i + 1]!;
  if (!smooth) return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
  const p0 = pts[i - 1] ?? p1;
  const p3 = pts[i + 2] ?? p2;
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
};
const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${pt([cx - rx, cy])} A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([cx + rx, cy])} A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([cx - rx, cy])} Z`;
const mirrorX = (d: string, cx = 100): string =>
  // Mirror an absolute path we generated (M/C/L/Q/A with x y pairs; A has rx ry rot large sweep x y).
  d.replace(/([MCLQ])([^MCLQAZ]*)/g, (_, cmd: string, args: string) => {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const out: string[] = [];
    for (let i = 0; i < n.length; i += 2) out.push(`${r1(2 * cx - n[i]!)} ${r1(n[i + 1]!)}`);
    return `${cmd}${out.join(" ")}${args.endsWith(" ") ? " " : ""}`;
  });

// ── Front view ──────────────────────────────────────────────────────────────────────────────
const CX = 100;
const EYE_Y = 122;
const SCALE = 1.85;
/** Right-half profiles [halfWidth, y] in drawing units (eye line at y = 60), top centre → chin centre. */
const FACE: Record<FaceShape, P[]> = {
  oval: [[0, 14], [20, 20], [28, 34], [31, 56], [29, 76], [21, 94], [10, 104], [0, 107]],
  round: [[0, 20], [22, 23], [33, 35], [37, 56], [35, 76], [26, 94], [13, 102], [0, 104]],
  square: [[0, 16], [27, 16.5], [33, 22], [34, 40], [34, 82], [33, 96], [25, 103], [0, 104]],
  rectangular: [[0, 8], [20, 10], [26, 22], [27, 52], [27, 84], [25, 100], [16, 108], [0, 110]],
  heart: [[0, 19], [17, 16], [31, 22], [34, 40], [31, 62], [23, 82], [11, 99], [0, 107]],
  diamond: [[0, 12], [11, 16], [21, 30], [33, 56], [25, 80], [13, 98], [0, 107]],
  triangular: [[0, 18], [15, 20], [21, 32], [26, 54], [32, 78], [32, 94], [20, 103], [0, 105]],
  inverted_triangular: [[0, 16], [26, 18], [34, 30], [32, 52], [25, 74], [17, 94], [8, 103], [0, 106]],
};
/** Lower-face replacements (points below the eye line) for the jawline cards. */
const JAW: Record<JawShape, P[]> = {
  rounded: [[32, 74], [27, 92], [15, 103], [0, 107]],
  soft: [[29, 76], [21, 94], [10, 104], [0, 107]],
  angular: [[31, 80], [31, 80], [24, 99], [0, 104]],
  defined: [[30, 78], [25, 94], [11, 104], [0, 107]],
  v_shaped: [[29, 74], [19, 93], [6, 105], [0, 107]],
  u_shaped: [[31, 84], [27, 99], [14, 106], [0, 107]],
};

interface Frame {
  mapY(y: number): number;
  half: P[]; // transformed half profile [halfWidth, y]
  chinY: number;
}
const frame = (f: FaceParams["face"]): Frame => {
  const len = 1 + lv(f.length) * 0.05;
  const wid = 1 + lv(f.width) * 0.07;
  const mapY = (y: number) => EYE_Y + (y - EYE_Y) * len;
  let src = FACE[f.shape];
  if (f.jaw) src = [...src.filter(([, y]) => y <= 60), ...JAW[f.jaw]];
  const top = EYE_Y + (src[0]![1] - 60) * SCALE;
  const BROW = 104;
  const half: P[] = src.map(([w, y]) => {
    let Y = EYE_Y + (y - 60) * SCALE;
    let H = w * SCALE;
    if (Y < BROW) Y -= lv(f.foreheadHeight) * 5 * clamp((BROW - Y) / (BROW - top), 0, 1);
    if (Y < EYE_Y) H *= 1 + lv(f.foreheadWidth) * 0.08 * clamp((EYE_Y - Y) / (EYE_Y - top), 0, 1);
    return [H * wid, mapY(Y)];
  });
  return { mapY, half, chinY: half[half.length - 1]![1] };
};
const halfAt = (half: P[], y: number): number => {
  for (let i = 0; i < half.length - 1; i++) {
    const [w1, y1] = half[i]!;
    const [w2, y2] = half[i + 1]!;
    if (y >= y1 && y <= y2) return y2 === y1 ? Math.max(w1, w2) : w1 + ((w2 - w1) * (y - y1)) / (y2 - y1);
  }
  return half[0]![0];
};

const baseLayer = (p: FaceParams, fr: Frame): Layer => {
  const els: El[] = [];
  const wid = 1 + lv(p.face.width) * 0.04;
  const nw = 25 * wid;
  const ny = fr.chinY - 34;
  els.push({ t: "path", c: "f", d: `M${pt([CX - nw, ny])} L${pt([CX - nw - 3, 250])} L${pt([CX + nw + 3, 250])} L${pt([CX + nw, ny])} Z` });
  els.push({ t: "path", c: "l", d: `M${pt([CX - nw, ny])} C${pt([CX - nw, ny + 30])} ${pt([CX - nw - 2, 236])} ${pt([CX - nw - 3, 250])}` });
  els.push({ t: "path", c: "l", d: `M${pt([CX + nw, ny])} C${pt([CX + nw, ny + 30])} ${pt([CX + nw + 2, 236])} ${pt([CX + nw + 3, 250])}` });
  // Ears sit behind the outline, so every face shape keeps its full contour.
  const ey = fr.mapY(EYE_Y - 4);
  const ex = halfAt(fr.half, ey) - 3;
  const ear = `M${pt([CX + ex, ey])} C${pt([CX + ex + 11, ey - 9])} ${pt([CX + ex + 15, ey + 12])} ${pt([CX + ex + 9, ey + 24])} C${pt([CX + ex + 6, ey + 32])} ${pt([CX + ex, ey + 33])} ${pt([CX + ex - 2, ey + 30])} Z`;
  const inner = `M${pt([CX + ex + 3, ey + 2])} C${pt([CX + ex + 9, ey - 1])} ${pt([CX + ex + 10, ey + 12])} ${pt([CX + ex + 6, ey + 20])}`;
  els.push({ t: "path", c: "o", d: ear }, { t: "path", c: "s", d: inner }, { t: "path", c: "o", d: mirrorX(ear) }, { t: "path", c: "s", d: mirrorX(inner) });
  return { id: "base", els };
};

const faceLayer = (p: FaceParams, fr: Frame): Layer => {
  const right: P[] = fr.half.map(([w, y]) => [CX + w, y]);
  const left: P[] = fr.half.slice(1, -1).reverse().map(([w, y]) => [CX - w, y]);
  const els: El[] = [{ t: "path", c: "o", d: closedSpline([...right, ...left]) }];
  if (p.face.jaw === "defined") {
    // a crisp jaw edge: soft definition lines just inside the outline
    const pts = (s: number): P[] => [0.5, 0.64, 0.78].map((k) => {
      const y = fr.mapY(EYE_Y + 22) + (fr.chinY - fr.mapY(EYE_Y + 22)) * k;
      return [CX + s * (halfAt(fr.half, y) - 3.5), y];
    });
    els.push({ t: "path", c: "s", d: openSpline(pts(1)) }, { t: "path", c: "s", d: openSpline(pts(-1)) });
  }
  return { id: "face", els };
};

// Eyes — template in drawing units around the eye centre, outer corner towards +x (viewer's right eye).
const EYE: Record<EyeShape, { a: P; b: P; u: [P, P]; d: [P, P] }> = {
  almond: { a: [-36, 1], b: [36, -1], u: [[-20, -23], [16, -22]], d: [[18, 15], [-16, 16]] },
  round: { a: [-28, 1], b: [28, -1], u: [[-26, -34], [26, -34]], d: [[26, 33], [-26, 33]] },
  oval: { a: [-34, 1], b: [34, -1], u: [[-31, -25], [31, -25]], d: [[31, 23], [-31, 23]] },
  elongated: { a: [-44, 1], b: [44, -1], u: [[-20, -17], [20, -17]], d: [[20, 12], [-20, 12]] },
};
const ES = 0.4;
interface EyeGeo {
  white: string;
  upper: [P, P, P, P];
  lower: string;
  iris: P;
  r: number;
}
const eyeGeo = (e: FaceParams["eyes"], side: 1 | -1): EyeGeo => {
  const s = 1 + lv(e.size) * 0.1;
  const sx = ES * s * (1 + lv(e.width) * 0.08);
  const sy = ES * s * (1 + lv(e.height) * 0.14);
  const tilt = lv(e.tilt) * 0.09;
  const cx = CX + side * (29 + lv(e.spacing) * 3.2);
  const tr = ([x, y]: P): P => {
    const X = x * sx;
    return [cx + side * X, EYE_Y + y * sy - X * tilt];
  };
  const t = EYE[e.shape];
  const [a, b, u1, u2, d1, d2] = [tr(t.a), tr(t.b), tr(t.u[0]), tr(t.u[1]), tr(t.d[0]), tr(t.d[1])];
  return {
    white: `M${pt(a)} C${pt(u1)} ${pt(u2)} ${pt(b)} C${pt(d1)} ${pt(d2)} ${pt(a)} Z`,
    upper: [a, u1, u2, b],
    lower: `M${pt(b)} C${pt(d1)} ${pt(d2)} ${pt(a)}`,
    iris: [cx, EYE_Y + 0.8 * s],
    r: 6.3 * s * (1 + lv(e.irisSize) * 0.1),
  };
};
/** Curve following the upper lid between t0 and t1, raised by dist (can vary along the curve). */
const lidOffset = (u: [P, P, P, P], t0: number, t1: number, dist: (k: number) => number): P[] => {
  const out: P[] = [];
  const N = 8;
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N;
    const p = bezier(u[0], u[1], u[2], u[3], t);
    const q = bezier(u[0], u[1], u[2], u[3], Math.min(1, t + 0.01));
    const r = bezier(u[0], u[1], u[2], u[3], Math.max(0, t - 0.01));
    const dx = q[0] - r[0];
    const dy = q[1] - r[1];
    const len = Math.hypot(dx, dy) || 1;
    let nx = dy / len;
    let ny = -dx / len;
    if (ny > 0) [nx, ny] = [-nx, -ny]; // always "up"
    const k = dist(i / N);
    out.push([p[0] + nx * k, p[1] + ny * k]);
  }
  return out;
};
const pupilEl = (shape: Pupil, x: number, y: number, r: number): El => {
  const q = r * 0.42;
  switch (shape) {
    case "vertical_slit":
      return { t: "path", c: "p", d: `M${pt([x, y - r * 0.82])} Q${pt([x + q * 0.75, y])} ${pt([x, y + r * 0.82])} Q${pt([x - q * 0.75, y])} ${pt([x, y - r * 0.82])} Z` };
    case "horizontal_slit":
      return { t: "path", c: "p", d: `M${pt([x - r * 0.82, y])} Q${pt([x, y - q * 0.75])} ${pt([x + r * 0.82, y])} Q${pt([x, y + q * 0.75])} ${pt([x - r * 0.82, y])} Z` };
    case "star": {
      const pts: P[] = [];
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? q * 1.55 : q * 0.62;
        pts.push([x + rr * Math.cos(ang), y + rr * Math.sin(ang)]);
      }
      return { t: "path", c: "p", d: `M${pts.map(pt).join(" L")} Z` };
    }
    case "heart": {
      const h = q * 1.35;
      return {
        t: "path",
        c: "p",
        d: `M${pt([x, y + h])} C${pt([x - h * 1.5, y])} ${pt([x - h * 0.9, y - h * 1.2])} ${pt([x, y - h * 0.4])} C${pt([x + h * 0.9, y - h * 1.2])} ${pt([x + h * 1.5, y])} ${pt([x, y + h])} Z`,
      };
    }
    default:
      return { t: "circle", c: "p", cx: r1(x), cy: r1(y), r: r1(q) };
  }
};
const oneEye = (e: FaceParams["eyes"], side: 1 | -1): El[] => {
  const g = eyeGeo(e, side);
  const s = 1 + lv(e.size) * 0.1;
  const [ix, iy] = g.iris;
  const els: El[] = [
    { t: "path", c: "w", d: g.white },
    {
      t: "clip",
      d: g.white,
      children: [
        { t: "circle", c: "i", cx: r1(ix), cy: r1(iy), r: r1(g.r), ...(e.irisColor ? { fill: e.irisColor } : {}) },
        pupilEl(e.pupil, ix, iy, g.r),
        { t: "circle", c: "h", cx: r1(ix + side * g.r * 0.36), cy: r1(iy - g.r * 0.4), r: r1(Math.max(0.9, g.r * 0.17)) },
      ],
    },
    { t: "path", c: "s", d: g.lower },
  ];
  const crease =
    e.crease === "inner_crease" ? { t0: 0.5, t1: 0.95, k: 1.4, c: "s" } : e.crease === "thin_double" ? { t0: 0.2, t1: 0.98, k: 2.4, c: "s" } : e.crease === "defined_double" ? { t0: 0.1, t1: 1, k: 3.8, c: "l" } : null;
  if (crease) els.push({ t: "path", c: crease.c, d: openSpline(lidOffset(g.upper, crease.t0, crease.t1, (k) => crease.k * s * (0.7 + 0.3 * Math.sin(Math.PI * k)))) });
  if (e.hooded) {
    // A skin fold that sinks over the outer part of the lid.
    const edge = lidOffset(g.upper, 0.22, 1, (k) => (5.2 - 7.4 * k) * s);
    edge.push([edge[edge.length - 1]![0] + side * 2.5 * s, edge[edge.length - 1]![1] + 1]);
    const top = lidOffset(g.upper, 0.22, 1, () => 9 * s).reverse();
    els.push({ t: "path", c: "l", d: `M${pt(g.upper[0])} C${pt(g.upper[1])} ${pt(g.upper[2])} ${pt(g.upper[3])}` });
    els.push({ t: "path", c: "f", d: `${openSpline(edge)} L${top.map(pt).join(" L")} Z` });
    els.push({ t: "path", c: "l", d: openSpline(edge) });
  } else {
    els.push({ t: "path", c: "l", d: `M${pt(g.upper[0])} C${pt(g.upper[1])} ${pt(g.upper[2])} ${pt(g.upper[3])}` });
  }
  return els;
};
const eyesLayer = (p: FaceParams): Layer => ({ id: "eyes", els: [...oneEye(p.eyes, -1), ...oneEye(p.eyes, 1)] });

// Eyebrows — centreline [u along the brow 0 (inner) → 1 (outer), v up] in brow lengths.
const BROW: Record<BrowShape, { pts: P[]; smooth: boolean }> = {
  straight: { pts: [[0, 0], [0.5, 0.025], [1, 0.035]], smooth: true },
  soft_arch: { pts: [[0, 0], [0.35, 0.1], [0.68, 0.13], [1, 0.04]], smooth: true },
  high_arch: { pts: [[0, -0.03], [0.38, 0.2], [0.62, 0.27], [1, 0.02]], smooth: true },
  rounded: { pts: [[0, -0.06], [0.22, 0.14], [0.5, 0.22], [0.78, 0.14], [1, -0.06]], smooth: true },
  angular: { pts: [[0, 0], [0.64, 0.22], [1, 0.03]], smooth: false },
  s_shaped: { pts: [[0, 0.04], [0.18, -0.02], [0.42, 0.05], [0.68, 0.15], [1, 0.07]], smooth: true },
};
const oneBrow = (p: FaceParams, side: 1 | -1, fr: Frame): El => {
  const b = p.brows;
  const s = 1 + lv(p.eyes.size) * 0.1;
  const L = 40 * (1 + lv(b.length) * 0.09);
  const eyeCx = 29 + lv(p.eyes.spacing) * 3.2;
  const ix = CX + side * (eyeCx - 16 + lv(b.spacing) * 2.6);
  const iy = fr.mapY(EYE_Y - 15) - lv(b.height) * 2.4 - lv(p.eyes.size) * 1.2 - lv(p.eyes.height) * 0.8;
  const th = (lv(b.angle) * 4.5 * Math.PI) / 180;
  const T0 = 4.3 * (1 + lv(b.thickness) * 0.22);
  const def = BROW[b.shape];
  const centre = (u: number): P => {
    const [x, y] = along(def.pts, u, def.smooth);
    const X = x * L;
    const Y = -y * L;
    const rx = X * Math.cos(th) + Y * Math.sin(th);
    const ry = -X * Math.sin(th) + Y * Math.cos(th);
    return [ix + side * rx, iy + ry];
  };
  const width = (u: number): number => T0 * (u < 0.18 ? 0.78 + (u / 0.18) * 0.22 : 1 - ((u - 0.18) / 0.82) * 0.66);
  const N = 18;
  const top: P[] = [];
  const bot: P[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const c = centre(u);
    const a = centre(Math.max(0, u - 0.02));
    const z = centre(Math.min(1, u + 0.02));
    const dx = z[0] - a[0];
    const dy = z[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    let nx = dy / len;
    let ny = -dx / len;
    if (ny > 0) [nx, ny] = [-nx, -ny];
    const w = (width(u) * s) / 2;
    top.push([c[0] + nx * w, c[1] + ny * w]);
    bot.push([c[0] - nx * w, c[1] - ny * w]);
  }
  return { t: "path", c: "b", d: closedSpline([...top, ...bot.reverse()]), opacity: r1(0.55 + (b.density - 1) * 0.1125), ...(b.color ? { fill: b.color } : {}) };
};
const browsLayer = (p: FaceParams, fr: Frame): Layer => ({ id: "brows", els: [oneBrow(p, -1, fr), oneBrow(p, 1, fr)] });

// Nose (front).
const noseTipY = (p: FaceParams, fr: Frame): number => {
  const n = p.nose;
  const adj = n.shape === "button" ? -3 : n.shape === "upturned" ? -1.5 : 0;
  return fr.mapY(152 + lv(n.length) * 3.8 + adj);
};
const noseLayer = (p: FaceParams, fr: Frame): Layer => {
  const n = p.nose;
  const ty = noseTipY(p, fr);
  const W = 11.5 * (1 + lv(n.width) * 0.1) * (n.shape === "broad" ? 1.2 : n.shape === "button" ? 0.9 : 1);
  const A = W * (1 + lv(n.alar) * 0.09);
  const up = n.shape === "upturned" || (n.tipAngle ?? 3) >= 4;
  const top = fr.mapY(EYE_Y - 8);
  const els: El[] = [];
  els.push({ t: "path", c: "s", d: `M${pt([CX - 7, top])} C${pt([CX - 6, top + 14])} ${pt([CX - W * 0.45, ty - 18])} ${pt([CX - W * 0.5, ty - 6])}` });
  const wing = `M${pt([CX + W * 0.5, ty - 6])} C${pt([CX + A + 2.5, ty - 7])} ${pt([CX + A + 2.5, ty + 4])} ${pt([CX + A * 0.62, ty + 4.5])}`;
  els.push({ t: "path", c: "l", d: wing }, { t: "path", c: "l", d: mirrorX(wing) });
  const nr = 2.5 * (1 + lv(n.alar) * 0.1);
  const nh = up ? 1.9 : 1.15;
  els.push({ t: "path", c: "n", d: ellipse(CX + W * 0.4, ty + 2.6, nr, nh) }, { t: "path", c: "n", d: ellipse(CX - W * 0.4, ty + 2.6, nr, nh) });
  const tipTop = n.tip === "pointed" ? 7.5 : n.tip === "broad" ? 4 : 5.5;
  const tw = n.tip === "broad" ? 0.42 : n.tip === "pointed" ? 0.24 : 0.32;
  els.push({ t: "path", c: "s", d: `M${pt([CX - W * tw, ty - 3])} Q${pt([CX, ty - tipTop])} ${pt([CX + W * tw, ty - 3])}` });
  const y = ty + 3;
  let base: string;
  switch (n.tip) {
    case "pointed":
      base = `M${pt([CX - W * 0.3, y])} Q${pt([CX - 2.2, y + 2.2])} ${pt([CX, y + 4.4])} Q${pt([CX + 2.2, y + 2.2])} ${pt([CX + W * 0.3, y])}`;
      break;
    case "broad":
      base = `M${pt([CX - W * 0.52, y])} C${pt([CX - W * 0.32, y + 4.2])} ${pt([CX + W * 0.32, y + 4.2])} ${pt([CX + W * 0.52, y])}`;
      break;
    case "angular":
      base = `M${pt([CX - W * 0.36, y])} L${pt([CX - W * 0.18, y + 3])} L${pt([CX + W * 0.18, y + 3])} L${pt([CX + W * 0.36, y])}`;
      break;
    case "cleft":
      base = `M${pt([CX - W * 0.34, y])} Q${pt([CX - 2.4, y + 4.6])} ${pt([CX, y + 2.4])} Q${pt([CX + 2.4, y + 4.6])} ${pt([CX + W * 0.34, y])}`;
      break;
    default:
      base = `M${pt([CX - W * 0.34, y])} Q${pt([CX, y + 4.4])} ${pt([CX + W * 0.34, y])}`;
  }
  els.push({ t: "path", c: "l", d: base });
  return { id: "nose", els };
};

// Lips (front).
const BOW: Record<CupidsBow, number> = { flat: 0.1, subtle: 0.9, defined: 1.9, deep: 3 };
export const lipMetrics = (l: FaceParams["lips"]) => {
  const has = (s: LipShape) => l.shapes.includes(s);
  const shapeK = has("thin") && !has("full") ? 0.72 : has("full") && !has("thin") ? 1.3 : 1;
  const w = 17 * (1 + lv(l.width) * 0.09) * (has("wide") ? 1.14 : 1) * (has("rounded") ? 0.92 : 1);
  const up = 4.6 * (1 + lv(l.upper) * 0.22) * shapeK * (l.ratio === "upper_dominant" ? 1.25 : l.ratio === "lower_dominant" ? 0.85 : 1) * (has("heart") ? 1.12 : 1);
  const lo = 5.8 * (1 + lv(l.lower) * 0.22) * shapeK * (l.ratio === "lower_dominant" ? 1.22 : l.ratio === "upper_dominant" ? 0.85 : 1) * (has("heart") ? 0.94 : 1);
  const bow = Math.min(up * 0.7, has("heart") ? Math.max(BOW[l.bow], 2.4) : BOW[l.bow]);
  return { w, up, lo, bow, round: has("rounded"), heart: has("heart") };
};
const lipsLayer = (p: FaceParams, fr: Frame): Layer => {
  const l = p.lips;
  const m = lipMetrics(l);
  const my = fr.mapY(180);
  const c = -lv(l.corners) * 1.4;
  const pk = m.w * (m.heart ? 0.3 : 0.26);
  const X = (x: number, y: number): string => pt([CX + x, my + y]);
  const { w, up, lo, bow } = m;
  const mouth = `M${X(-w, c)} C${X(-w * 0.6, c * 0.4 + 0.4)} ${X(-w * 0.25, 0.9)} ${X(0, 0.9)} C${X(w * 0.25, 0.9)} ${X(w * 0.6, c * 0.4 + 0.4)} ${X(w, c)}`;
  const upper =
    `M${X(-w, c)} C${X(-w * 0.75, c - up * 0.35)} ${X(-w * 0.48, -up)} ${X(-pk, -up)} Q${X(-pk * 0.45, -up + 0.15)} ${X(0, -up + bow)}` +
    ` Q${X(pk * 0.45, -up + 0.15)} ${X(pk, -up)} C${X(w * 0.48, -up)} ${X(w * 0.75, c - up * 0.35)} ${X(w, c)}` +
    ` C${X(w * 0.6, c * 0.4 + 0.4)} ${X(w * 0.25, 0.9)} ${X(0, 0.9)} C${X(-w * 0.25, 0.9)} ${X(-w * 0.6, c * 0.4 + 0.4)} ${X(-w, c)} Z`;
  const k = m.round ? 0.55 : 0.4;
  const lower =
    `M${X(-w, c)} C${X(-w * 0.6, c * 0.4 + 0.4)} ${X(-w * 0.25, 0.9)} ${X(0, 0.9)} C${X(w * 0.25, 0.9)} ${X(w * 0.6, c * 0.4 + 0.4)} ${X(w, c)}` +
    ` C${X(w * 0.72, c + lo * 0.55)} ${X(w * k, lo)} ${X(0, lo)} C${X(-w * k, lo)} ${X(-w * 0.72, c + lo * 0.55)} ${X(-w, c)} Z`;
  const fill = l.color ? { fill: l.color } : {};
  return {
    id: "lips",
    els: [
      { t: "path", c: "lp", d: lower, ...fill },
      { t: "path", c: "lp", d: upper, ...fill },
      { t: "path", c: "l", d: mouth },
      { t: "path", c: "s", d: `M${X(-5.5, lo + 6.5)} Q${X(0, lo + 8.5)} ${X(5.5, lo + 6.5)}` },
    ],
  };
};

export const frontLayers = (p: FaceParams): Layer[] => {
  const fr = frame(p.face);
  return [baseLayer(p, fr), faceLayer(p, fr), browsLayer(p, fr), eyesLayer(p), noseLayer(p, fr), lipsLayer(p, fr)];
};

// ── Profile view (facing right) ────────────────────────────────────────────────────────────
/** Effective bridge and tip from the overall nose shape, unless set separately. */
export const noseProfile = (n: FaceParams["nose"]) => {
  const fromShape: Record<NoseShape, { bridge: BridgeShape; tip: number; hump: number; short: number }> = {
    straight: { bridge: "straight", tip: 3, hump: 0, short: 0 },
    roman: { bridge: "convex", tip: 2.6, hump: 3.2, short: 0 },
    aquiline: { bridge: "convex", tip: 1.6, hump: 4.6, short: 0 },
    button: { bridge: "concave", tip: 3.6, hump: 1.4, short: 1 },
    upturned: { bridge: "concave", tip: 4.6, hump: 2, short: 0.4 },
    broad: { bridge: "straight", tip: 3, hump: 0, short: 0 },
    concave: { bridge: "concave", tip: 3.6, hump: 3.4, short: 0 },
  };
  const s = n.shape ? fromShape[n.shape] : { bridge: "straight" as BridgeShape, tip: 3, hump: 0, short: 0 };
  const bridge = n.bridge ?? s.bridge;
  const hump = bridge === "straight" ? 0 : n.bridge && bridge !== s.bridge ? 3.2 : s.hump || 3.2;
  return { bridge, tip: n.tipAngle ?? s.tip, hump, short: s.short };
};
export const profileLayers = (p: FaceParams): Layer[] => {
  const fr = frame(p.face);
  const Y = fr.mapY;
  const n = p.nose;
  const np = noseProfile(n);
  const proj = lv(n.bridgeHeight) * 2.2;
  const chinDx = p.face.chin === "protruding" ? 7 : p.face.chin === "recessed" ? -7 : 0;
  const nasion: P = [147 + proj * 0.4, Y(112)];
  const tip: P = [172 + proj * 0.6 - np.short * 4, Y(151 + lv(n.length) * 3.6 - np.short * 4) - (np.tip - 3) * 2.6];
  const dx = tip[0] - nasion[0];
  const dy = tip[1] - nasion[1];
  const len = Math.hypot(dx, dy);
  const nx = dy / len;
  const ny = -dx / len; // outward (up-right) normal of the bridge line
  const bulge = np.bridge === "convex" ? np.hump : np.bridge === "concave" ? -np.hump : 0;
  // bridge samples in order from the nasion to the tip; the bump peaks mid-bridge
  const bridge: P[] = [0.3, 0.52, 0.74].map((f) => {
    const k = bulge * Math.sin(Math.PI * f) + proj * 0.5 * Math.sin(Math.PI * f);
    return [nasion[0] + dx * f + nx * k, nasion[1] + dy * f + ny * k];
  });
  const under: P = [tip[0] - 5, tip[1] + 5.5 - (np.tip - 3) * 0.6];
  const sub: P = [150, Y(161)];
  const front: P[] = [
    [100, Y(26) - lv(p.face.foreheadHeight) * 5],
    [138, Y(42)],
    [150, Y(74)],
    [153, Y(100)],
    nasion,
    ...bridge,
    tip,
    under,
    sub,
    [155, Y(171)],
    [151, Y(178)],
    [154, Y(185)],
    [147 + chinDx * 0.5, Y(195)],
    [153 + chinDx, Y(207)],
    [142 + chinDx * 0.6, Y(219)],
    [122, Y(225)],
    [117, 250],
    [74, 250],
    [64, Y(190)],
    [44, Y(160)],
    [37, Y(118)],
    [44, Y(74)],
    [66, Y(38)],
  ];
  const ear = `M${pt([96, Y(116)])} C${pt([108, Y(110)])} ${pt([112, Y(136)])} ${pt([104, Y(150)])} C${pt([99, Y(156)])} ${pt([94, Y(152)])} ${pt([93, Y(146)])}`;
  const eye = `M${pt([139, Y(120)])} Q${pt([145, Y(116.5)])} ${pt([149, Y(121)])}`;
  return [
    {
      id: "base",
      els: [
        { t: "path", c: "o", d: closedSpline(front) },
        { t: "path", c: "s", d: ear },
        { t: "path", c: "l", d: eye },
        { t: "path", c: "s", d: `M${pt([141, Y(123.5)])} Q${pt([145, Y(124.5)])} ${pt([148.5, Y(122)])}` },
        { t: "path", c: "b", d: `M${pt([134, Y(107)])} Q${pt([142, Y(102)])} ${pt([151, Y(104)])} L${pt([150.5, Y(106.5)])} Q${pt([142, Y(105)])} ${pt([134, Y(109)])} Z`, opacity: 0.78 },
        { t: "path", c: "l", d: `M${pt([148, Y(178.5)])} L${pt([151, Y(178)])}` },
      ],
    },
    {
      id: "nose",
      els: [{ t: "path", c: "s", d: `M${pt([tip[0] - 13, tip[1] - 3])} C${pt([tip[0] - 9, tip[1] - 9])} ${pt([tip[0] - 3, tip[1] - 4])} ${pt([tip[0] - 7, tip[1] + 2])}` }],
    },
  ];
};

// ── Static SVG serialisation (generator) ───────────────────────────────────────────────────
/** Theme tokens; the live sketch uses the same values in globals.css (`.face-sketch`). */
export const SKETCH_STYLE = `<style>
svg{--ink:#34322e;--fill:#ecebe7;--soft:#86827a;--iris:#a9a59c;--white:#fbfaf8;--pupil:#2a2825;--hl:#ffffff;--brow:#57544e;--lip:#d3cec6;--nostril:#6f6b64}
@media (prefers-color-scheme:dark){svg{--ink:#ebe8e2;--fill:#34332f;--soft:#a09c92;--iris:#77736b;--white:#4a4944;--pupil:#121211;--hl:#ebe8e2;--brow:#cfcbc3;--lip:#5a5752;--nostril:#aaa69c}}
path,circle{vector-effect:non-scaling-stroke}
.o{fill:var(--fill);stroke:var(--ink);stroke-width:2;stroke-linejoin:round}
.f{fill:var(--fill)}
.l{fill:none;stroke:var(--ink);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.s{fill:none;stroke:var(--soft);stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}
.w{fill:var(--white)}.i{fill:var(--iris)}.p{fill:var(--pupil)}.h{fill:var(--hl)}.b{fill:var(--brow)}.n{fill:var(--nostril)}
.lp{fill:var(--lip);stroke:var(--soft);stroke-width:1.2;stroke-linejoin:round}
</style>`;

const elString = (e: El, ids: { n: number }): string => {
  if (e.t === "circle") return `<circle class="${e.c}" cx="${e.cx}" cy="${e.cy}" r="${e.r}"${e.fill ? ` style="fill:${e.fill}"` : ""}/>`;
  if (e.t === "path") return `<path class="${e.c}" d="${e.d}"${e.fill ? ` style="fill:${e.fill}"` : ""}${e.opacity !== undefined ? ` opacity="${e.opacity}"` : ""}/>`;
  const id = `k${ids.n++}`;
  return `<clipPath id="${id}"><path d="${e.d}"/></clipPath><g clip-path="url(#${id})">${e.children.map((c) => elString(c, ids)).join("")}</g>`;
};
export const layersString = (layers: Layer[], ids = { n: 0 }, box?: Box): string =>
  layers.map((l) => l.els.filter((e) => !box || overlaps(e, box)).map((e) => elString(e, ids)).join("")).join("");
/** Rough bounding box of an element (path points incl. control points) — used to drop what a crop never shows. */
const overlaps = (e: El, [bx, by, bw, bh]: Box): boolean => {
  if (e.t === "circle") return e.cx + e.r > bx && e.cx - e.r < bx + bw && e.cy + e.r > by && e.cy - e.r < by + bh;
  const d = e.d;
  let xs: number[] = [];
  let ys: number[] = [];
  if (d.includes("A")) {
    // ellipse: M x y A rx ry …
    const [mx, my, rx, ry] = d.replace(/[MA]/g, " ").trim().split(/\s+/).map(Number) as [number, number, number, number];
    xs = [mx, mx + 2 * rx];
    ys = [my - ry, my + ry];
  } else {
    const n = d.replace(/[A-Z]/g, " ").trim().split(/\s+/).filter(Boolean).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) {
      xs.push(n[i]!);
      ys.push(n[i + 1]!);
    }
  }
  const m = 2;
  return Math.max(...xs) + m > bx && Math.min(...xs) - m < bx + bw && Math.max(...ys) + m > by && Math.min(...ys) - m < by + bh;
};
/** A 160×120 card: one view, or two views side by side (e.g. nose profile + front). */
export const cardSvg = (views: Array<{ layers: Layer[]; box: Box }>, W = 160, H = 120): string => {
  const ids = { n: 0 };
  const body =
    views.length === 1
      ? `<svg x="0" y="0" width="${W}" height="${H}" viewBox="${boxAttr(views[0]!.box)}" preserveAspectRatio="xMidYMid slice">${layersString(views[0]!.layers, ids, views[0]!.box)}</svg>`
      : views
          .map((v, i) => {
            const w = W / views.length;
            return `<svg x="${r1(i * w)}" y="0" width="${r1(w)}" height="${H}" viewBox="${boxAttr(v.box)}" preserveAspectRatio="xMidYMid slice">${layersString(v.layers, ids, v.box)}</svg>`;
          })
          .join("") + views.slice(1).map((_, i) => `<path class="s" d="M${r1(((i + 1) * W) / views.length)} 8 V${H - 8}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${SKETCH_STYLE}${body}</svg>\n`;
};
