/**
 * Hair on the face sketch (Sprint 2-D.3) — the SAME reference face and front view as the Face Builder,
 * so hairstyle cards compare the style itself. Pure, deterministic, erasable TypeScript only.
 *
 * Model: a crown (“cap”) over the skull whose inner edge is the face outline's hairline, optional side
 * curtains that frame the face, back hair behind the neck, bangs, and extras (buns, tails, braids).
 * Representative hairstyles are descriptors over these parts; anything not representable is reported
 * as text by the caller. “Left/right” part and side follow the PERSON's left/right (viewer's right/left).
 */
import { CX, EYE_Y, faceFrame, frontLayers, halfAt, type FaceParams, type Frame } from "./face-sketch.ts";
import { closedSpline, lv, openSpline, pt, type El, type Layer, type P } from "./sketch-core.ts";

export type HairLength = "extremely_short" | "ear" | "chin" | "neck" | "shoulder" | "chest" | "mid_back" | "waist" | "hip" | "knee" | "floor";
export type Texture = "straight" | "wavy" | "curly" | "tightly_curly" | "coily";
export type Part = "none" | "center" | "left" | "right" | "deep_left" | "deep_right";
export type Bangs = "none" | "blunt" | "wispy" | "curtain" | "side_swept" | "choppy" | "asymmetric" | "micro" | "feathered";
export type BangsLength = "very_short" | "above_brows" | "brow" | "eye" | "long";
export type Presence = "present" | "shaved" | "bald" | "partial_loss";

export interface HairParams {
  presence: Presence | null;
  length: HairLength | null;
  texture: Texture | null;
  volume: number;
  part: Part | null;
  bangs: Bangs | null;
  bangsLength: BangsLength | null;
  style: HairStyle | null;
  color: string | null;
}
export const neutralHair = (): HairParams => ({ presence: null, length: null, texture: null, volume: 3, part: null, bangs: null, bangsLength: null, style: null, color: null });
/** Nothing about the hair is set → the sketch draws no hair (neutral, as before Sprint 2-D.3). */
export const hairIsEmpty = (h: HairParams): boolean =>
  !h.presence && !h.length && !h.texture && h.volume === 3 && !h.part && !h.bangs && !h.bangsLength && !h.style && !h.color;

type Ends = "blunt" | "layered" | "rounded" | "shaggy" | "inverted" | "asym";
type Extra =
  | { k: "bun"; x: number; dy: number; r: number; front?: boolean }
  | { k: "tail"; side: -1 | 1; y: number; len: number; front: boolean; braid?: boolean; out?: number }
  | { k: "crown" }
  | { k: "rows" };
interface Look {
  len: HairLength;
  ends: Ends;
  top: number;
  front: number; // extra height at the front (pompadour)
  sides: "full" | "close" | "shaved" | "fade";
  down: boolean;
  tucked: boolean;
  sweep: "none" | "back" | "side";
  part: Part | null;
  bangs: Bangs | null;
  bangsLength: BangsLength | null;
  extras: Extra[];
  cap?: "stubble";
  spikes?: boolean;
  strip?: boolean;
  big?: boolean;
  halfUp?: boolean;
  sidelocks?: boolean;
  rope?: "box" | "locs";
  texture?: Texture;
}
const look = (o: Partial<Look>): Look => ({ len: "chest", ends: "rounded", top: 0, front: 0, sides: "full", down: true, tucked: false, sweep: "none", part: null, bangs: null, bangsLength: null, extras: [], ...o });

/** Representative hairstyles drawn as cards (catalog ids). Other styles keep the text list. */
export const HAIR_STYLES = {
  buzz_cut: look({ len: "extremely_short", sides: "close", down: false, cap: "stubble" }),
  crew_cut: look({ len: "extremely_short", top: 5, sides: "close", down: false }),
  pixie_cut: look({ len: "extremely_short", top: 5, sides: "close", down: false, bangs: "side_swept", bangsLength: "above_brows" }),
  spiky: look({ len: "extremely_short", top: 9, sides: "close", down: false, spikes: true }),
  classic_bob: look({ len: "chin", ends: "rounded" }),
  blunt_bob: look({ len: "chin", ends: "blunt" }),
  layered_bob: look({ len: "chin", ends: "layered", top: 3 }),
  asymmetrical_bob: look({ len: "chin", ends: "asym", part: "deep_left" }),
  inverted_bob: look({ len: "chin", ends: "inverted" }),
  long_bob: look({ len: "neck", ends: "blunt" }),
  layered_cut: look({ len: "chest", ends: "layered", top: 3 }),
  shag: look({ len: "neck", ends: "shaggy", top: 6, bangs: "curtain", bangsLength: "eye" }),
  wolf_cut: look({ len: "neck", ends: "shaggy", top: 9, bangs: "choppy", bangsLength: "brow" }),
  hime_cut: look({ len: "mid_back", ends: "blunt", bangs: "blunt", bangsLength: "brow", sidelocks: true }),
  blunt_cut: look({ len: "chest", ends: "blunt" }),
  worn_down: look({ len: "chest", ends: "rounded", part: "center" }),
  slicked_back: look({ len: "extremely_short", top: 2, sides: "close", down: false, tucked: true, sweep: "back" }),
  side_swept: look({ len: "chest", sweep: "side", part: "deep_right" }),
  tucked_behind_ears: look({ len: "chest", tucked: true, part: "center" }),
  pompadour: look({ len: "extremely_short", front: 16, top: 6, sides: "close", down: false, sweep: "back" }),
  afro: look({ len: "chin", big: true, down: false, texture: "coily", ends: "rounded" }),
  mohawk: look({ len: "extremely_short", sides: "shaved", down: false, strip: true, top: 14 }),
  undercut: look({ len: "extremely_short", top: 7, sides: "shaved", down: false, sweep: "side" }),
  fade: look({ len: "extremely_short", top: 5, sides: "fade", down: false }),
  ponytail: look({ down: false, tucked: true, sweep: "back", extras: [{ k: "bun", x: 0, dy: -2, r: 8 }, { k: "tail", side: -1, y: 40, len: 150, front: false, out: 34 }] }),
  twin_ponytails: look({ down: false, tucked: true, part: "center", extras: [{ k: "tail", side: -1, y: 98, len: 105, front: true, out: 16 }, { k: "tail", side: 1, y: 98, len: 105, front: true, out: 16 }] }),
  side_ponytail: look({ down: false, tucked: true, sweep: "side", extras: [{ k: "tail", side: -1, y: 150, len: 100, front: true, out: 4 }] }),
  bun: look({ down: false, tucked: true, sweep: "back", extras: [{ k: "bun", x: 0, dy: -4, r: 22 }] }),
  top_knot: look({ down: false, tucked: true, sweep: "back", extras: [{ k: "bun", x: 0, dy: -16, r: 14 }] }),
  double_buns: look({ down: false, tucked: true, part: "center", extras: [{ k: "bun", x: -40, dy: 10, r: 16 }, { k: "bun", x: 40, dy: 10, r: 16 }] }),
  half_up: look({ len: "chest", halfUp: true, extras: [{ k: "bun", x: 0, dy: -2, r: 9 }] }),
  single_braid: look({ down: false, tucked: true, sweep: "back", extras: [{ k: "tail", side: -1, y: 150, len: 110, front: true, braid: true, out: 2 }] }),
  twin_braids: look({ down: false, tucked: true, part: "center", extras: [{ k: "tail", side: -1, y: 132, len: 110, front: true, braid: true, out: 4 }, { k: "tail", side: 1, y: 132, len: 110, front: true, braid: true, out: 4 }] }),
  crown_braid: look({ down: false, tucked: true, sweep: "back", extras: [{ k: "crown" }] }),
  box_braids: look({ len: "chest", rope: "box", part: "center" }),
  cornrows: look({ len: "extremely_short", sides: "close", down: false, extras: [{ k: "rows" }] }),
  locs: look({ len: "chest", rope: "locs" }),
} as const satisfies Record<string, Look>;
export type HairStyle = keyof typeof HAIR_STYLES;

const LEN_Y: Record<HairLength, number> = { extremely_short: 0, ear: 150, chin: 204, neck: 232, shoulder: 262, chest: 262, mid_back: 262, waist: 262, hip: 262, knee: 262, floor: 262 };
const TEX_VOL: Record<Texture, number> = { straight: 0, wavy: 3, curly: 8, tightly_curly: 12, coily: 16 };
const TEX_WAVE: Record<Texture, { a: number; l: number; bump: boolean }> = {
  straight: { a: 0, l: 1, bump: false },
  wavy: { a: 1.6, l: 26, bump: false },
  curly: { a: 2.8, l: 10, bump: true },
  tightly_curly: { a: 2.5, l: 7, bump: true },
  coily: { a: 2.2, l: 5.5, bump: true },
};

/** Resample a polyline (~2.5 points per wave) and push points along the normal (texture of an edge or strand). */
const textured = (pts: P[], tex: Texture, outward = 1): P[] => {
  const w = TEX_WAVE[tex];
  if (w.a === 0) return pts;
  const out: P[] = [];
  let dist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i]!, pts[i + 1]!];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const n = Math.max(1, Math.round(len / (w.bump ? w.l / 4 : w.l / 2.5)));
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const s = Math.sin((2 * Math.PI * (dist + len * t)) / w.l);
      const off = (w.bump ? Math.abs(s) : s) * w.a * outward;
      out.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
    }
    dist += len;
  }
  out.push(pts[pts.length - 1]!);
  return out;
};
// Curly textures are drawn as short straight segments (scallops) — as readable at card size and far smaller.
const poly = (pts: P[], close: boolean): string => `M${pts.map(pt).join(" L")}${close ? " Z" : ""}`;
const line = (pts: P[], tex: Texture): string => (TEX_WAVE[tex].a === 0 ? openSpline(pts) : TEX_WAVE[tex].bump ? poly(textured(pts, tex), false) : openSpline(textured(pts, tex)));
const edge = (pts: P[], tex: Texture, outward = 1): string => (TEX_WAVE[tex].a === 0 ? closedSpline(pts) : TEX_WAVE[tex].bump ? poly(textured(pts, tex, outward), true) : closedSpline(textured(pts, tex, outward)));

/** y on the hairline (upper face outline) at horizontal offset dx from the centre. */
const hairlineY = (fr: Frame, dx: number): number => {
  const h = fr.half;
  const ax = Math.abs(dx);
  for (let i = 0; i < h.length - 1; i++) {
    const [w1, y1] = h[i]!;
    const [w2, y2] = h[i + 1]!;
    if (ax >= w1 && ax <= w2) return y1 + ((y2 - y1) * (ax - w1)) / (w2 - w1 || 1);
  }
  return h[0]![1];
};
const PART_X: Record<Part, number> = { none: 0, center: 0, left: 16, right: -16, deep_left: 30, deep_right: -30 };

export interface HairGeo {
  back: El[];
  front: El[];
}
export const hairGeometry = (face: FaceParams["face"], h: HairParams): HairGeo => {
  const empty = { back: [], front: [] };
  if (hairIsEmpty(h) || h.presence === "bald") return empty;
  const fr = faceFrame(face);
  const L: Look = h.style ? { ...HAIR_STYLES[h.style] } : look({ len: h.length ?? "chin", down: (h.length ?? "chin") !== "extremely_short" });
  if (h.length && (L.down || h.style == null)) L.len = h.length;
  if (h.length && !L.down && L.len === "extremely_short" && h.length !== "extremely_short" && !h.style) L.down = true;
  if (h.bangs) L.bangs = h.bangs;
  if (h.bangsLength) L.bangsLength = h.bangsLength;
  if (h.bangsLength && !L.bangs) L.bangs = "blunt"; // a bangs length alone: neutral blunt bangs at that length
  if (h.part) L.part = h.part;
  const tex: Texture = h.texture ?? L.texture ?? "straight";
  const fill = h.color ? { fill: h.color } : {};
  const shaved = h.presence === "shaved";
  const thin = h.presence === "partial_loss";
  const C = (c: string) => (shaved ? "hst" : c);

  const TY = EYE_Y - 16;
  const faceTop = fr.half[0]![1];
  const faceT = halfAt(fr.half, TY);
  const V = shaved ? 1.5 : Math.max(1.5, 4 + lv(h.volume) * 3 + TEX_VOL[tex] + (L.big ? 26 : 0));
  const sideV = shaved ? 1.5 : L.sides === "full" ? V : L.sides === "close" ? 2.5 : 1.5;
  const top = faceTop - 13;
  const rx = faceT + 7;
  const crown = shaved ? 1.5 : V + L.top;

  // ── crown (cap): skull outline + volume outside, the face's hairline inside
  const capPts = (cutY: number, v: number, vSide: number, frontLift: number, narrow = 1): P[] => {
    const inner: P[] = fr.half.filter(([, y]) => y < cutY).map(([w, y]) => [w, y]);
    inner.push([halfAt(fr.half, cutY), cutY]);
    const R = (rx + vSide) * narrow;
    const outer: P[] = [
      [0, top - v - frontLift],
      [R * 0.52, top - v * 0.9 - frontLift * 0.6 + 4],
      [R * 0.84, top + 16 - v * 0.55],
      [R, Math.min(cutY - 20, TY - 22)],
      [R + vSide * 0.15, cutY],
    ];
    const right = [...outer, outer[outer.length - 1]!, ...inner.reverse().map(([w, y]) => [w * Math.min(1, narrow * 1.6), y] as P)];
    const pts: P[] = [...right.map(([w, y]) => [CX + w, y] as P), ...right.slice(1, -1).reverse().map(([w, y]) => [CX - w, y] as P)];
    return pts;
  };
  const back: El[] = [];
  const front: El[] = [];
  const strand = (pts: P[]) => front.push({ t: "path", c: "hs", d: line(pts, tex) });

  // back hair (behind ears and neck)
  const yL = LEN_Y[L.len];
  const spread = L.big ? 0.05 : 0.08 + TEX_VOL[tex] * 0.004;
  const outerX = (y: number) => rx + sideV + Math.max(0, y - TY) * spread;
  if ((L.down || L.halfUp) && yL > TY + 20 && !shaved) {
    const endY = (side: number, inner: boolean) => yL + (L.ends === "inverted" ? (inner ? 10 : -8) : L.ends === "asym" ? side * 14 : 0);
    const R: P[] = [
      [CX + rx * 0.7, top + 10],
      [CX + outerX(TY), TY],
      [CX + outerX((TY + yL) / 2), (TY + yL) / 2],
      [CX + outerX(yL), endY(1, false)],
      [CX + outerX(yL) * 0.25, endY(1, true) + 2],
    ];
    const Lp: P[] = R.map(([x, y]) => [2 * CX - x, y] as P).reverse();
    const pts = [...R, ...Lp];
    back.push({ t: "path", c: C("hr"), d: edge(pts, tex), ...fill });
  }
  if (L.big && !shaved) {
    const cy = top + 70;
    const pts = circlePts(CX, cy, 1, 48).map(([x, y]) => [CX + (x - CX) * (rx + V * 0.75), cy + (y - cy) * (66 + V * 0.35)] as P);
    back.push({ t: "path", c: "hr", d: edge(pts, tex), ...fill });
  }
  // extras that sit behind the head
  for (const e of L.extras) {
    if (e.k === "bun" && !e.front) {
      const x = CX + e.x;
      const y = top - V + e.dy;
      back.push({ t: "path", c: "hr", d: edge(circlePts(x, y, e.r), tex), ...fill }, { t: "path", c: "hs", d: `M${pt([x - e.r * 0.6, y])} Q${pt([x, y - e.r * 0.8])} ${pt([x + e.r * 0.6, y - e.r * 0.1])} Q${pt([x, y + e.r * 0.6])} ${pt([x - e.r * 0.3, y + e.r * 0.2])}` });
    }
    if (e.k === "tail" && !e.front) back.push(...tail(e, rx + sideV, tex, fill));
  }

  // crown
  if (L.strip) {
    front.push({ t: "path", c: "hst", d: closedSpline(capPts(TY, 1.5, 1.5, 0)) });
    const y0 = hairlineY(fr, 0);
    const fin: P[] = [[CX - 9, y0 + 1], [CX - 12, y0 - 18], [CX - 7, top - crown], [CX, top - crown - 4], [CX + 7, top - crown], [CX + 12, y0 - 18], [CX + 9, y0 + 1]];
    front.push({ t: "path", c: "hr", d: closedSpline(fin), ...fill }, { t: "path", c: "hs", d: openSpline([[CX, y0 - 2], [CX, top - crown + 4]]) });
  } else if (L.sides === "shaved" || L.sides === "fade") {
    front.push({ t: "path", c: "hst", d: closedSpline(capPts(TY, 1.5, 1.5, 0)), ...(L.sides === "fade" ? { opacity: 0.6 } : {}) });
    front.push({ t: "path", c: C("hr"), d: closedSpline(capPts(TY - 24, crown, 2, L.front, 0.9)), ...fill });
  } else {
    const pts = capPts(TY, crown, sideV, L.front);
    const d = L.spikes ? closedSpline(spikes(pts)) : edge(pts, tex);
    front.push({ t: "path", c: L.cap === "stubble" ? "hst" : C("hr"), d, ...fill, ...(thin ? { opacity: 0.45 } : {}) });
  }

  // parting and flow lines
  if (!shaved && L.cap !== "stubble" && !L.strip) {
    const px = PART_X[L.part ?? "none"];
    const hasPart = L.part != null && L.part !== "none";
    if (hasPart) front.push({ t: "path", c: "hs", d: openSpline([[CX + px, hairlineY(fr, px) - 1], [CX + px * 0.8, top - crown * 0.6 + 8], [CX + px * 0.5, top - crown + 6]]) });
    const from = (side: number, k: number): P =>
      L.sweep === "back" ? [CX + side * 8 * k, hairlineY(fr, side * 8 * k) - 2] : hasPart ? [CX + px + side * 2, top - crown * 0.4 + 8 + k * 14] : [CX + side * 6 * k, top - crown * 0.5 + 6];
    for (const side of [-1, 1])
      for (const k of [0.35, 0.65, 0.95]) {
        const a = from(side, k);
        const b: P = L.sweep === "back" ? [CX + side * (rx * 0.25 + k * 18), top - crown * 0.7 + 4] : [CX + side * (faceT + (sideV * 0.6 + 4) * k), TY - 4 + k * 4];
        const m: P = [(a[0] + b[0]) / 2 + side * 6, Math.min(a[1], b[1]) - 6 - crown * 0.2];
        strand([a, m, b]);
      }
  }

  // side curtains that frame the face (over the ears)
  if (L.down && !L.tucked && yL > TY + 20 && !shaved) {
    const neck = 25 * (1 + lv(face.width) * 0.04);
    for (const side of [-1, 1] as const) {
      if (L.sweep === "side" && side === -1) continue;
      const end = L.sidelocks ? Math.min(yL, fr.chinY - 18) : yL;
      const endO = end + (L.ends === "inverted" ? -8 : L.ends === "asym" ? side * 14 : 0);
      const endI = end + (L.ends === "inverted" ? 10 : L.ends === "asym" ? side * 14 : 0) + (L.ends === "layered" ? -14 : 0);
      const innerX = (y: number) => (y < fr.chinY - 8 ? Math.max(4, halfAt(fr.half, Math.min(y, fr.chinY)) - 5) : neck + 6 + (y - fr.chinY) * 0.25);
      const ys = [TY, TY + 24, (TY + end) / 2, end - 10].filter((y, i, a) => i === 0 || y > a[i - 1]!);
      const outer: P[] = ys.map((y) => [CX + side * (outerX(y) - 1 + (L.sweep === "side" ? 8 : 0)), y]);
      outer.push([CX + side * (outerX(end) + (L.sweep === "side" ? 8 : 0)), endO]);
      const inner: P[] = ys.slice(1).reverse().map((y) => [CX + side * innerX(y), y]);
      const bottom: P[] = endsEdge(L.ends, [CX + side * (outerX(end) - 1), endO], [CX + side * innerX(end), endI]);
      const pts: P[] = [...outer, ...bottom, ...inner, [CX + side * (faceT - 4), TY - 6]];
      front.push({ t: "path", c: C("hr"), d: edge(pts, tex), ...fill });
      for (const k of [0.3, 0.62]) {
        const x0 = faceT + (outerX(TY) - faceT) * k;
        const x1 = innerX(end) + (outerX(end) - innerX(end)) * k;
        strand([[CX + side * x0, TY + 4], [CX + side * (x0 + x1) * 0.5 + side * 3, (TY + end) / 2], [CX + side * x1, Math.min(endO, endI) - 6]]);
      }
    }
  }
  if (L.halfUp) front.push({ t: "path", c: "hs", d: openSpline([[CX - rx - sideV * 0.5, TY - 26], [CX - rx * 0.5, top - crown * 0.6 + 2], [CX, top - crown * 0.8], [CX + rx * 0.5, top - crown * 0.6 + 2], [CX + rx + sideV * 0.5, TY - 26]]) });

  // bangs
  if (L.bangs && L.bangs !== "none" && !shaved) front.push(...bangs(fr, L.bangs, L.bangsLength, tex, fill, TY));

  // extras in front
  for (const e of L.extras) {
    if (e.k === "tail" && e.front) front.push(...tail(e, rx + sideV, tex, fill));
    if (e.k === "crown") {
      const pts: P[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i / 12) * Math.PI;
        pts.push([CX + Math.cos(a) * (rx + 2), top + 30 + Math.sin(a) * (top + 30 - (top - crown + 6))]);
      }
      front.push({ t: "path", c: "hrl", d: openSpline(pts), ...(h.color ? { fill: "none" } : {}) });
      front.push({ t: "path", c: "hs", d: chevrons(pts, 5) });
    }
    if (e.k === "rows")
      for (const dx of [-30, -15, 0, 15, 30]) {
        const pts: P[] = [[CX + dx * 1.1, hairlineY(fr, dx) - 1], [CX + dx * 0.9, top + 8], [CX + dx * 0.6, top - 4]];
        front.push({ t: "path", c: "hs", d: chevrons(pts, 4) });
      }
  }
  // rope textures (box braids, locs) — thin strands down the curtains
  if (L.rope && !shaved)
    for (const side of [-1, 1])
      for (const k of [0.15, 0.4, 0.65, 0.9]) {
        const x0 = faceT - 2 + (outerX(TY) - faceT) * k;
        const pts: P[] = [[CX + side * x0, TY - 2], [CX + side * (x0 + 4), (TY + yL) / 2], [CX + side * (x0 + 8 + k * 6), yL - 6]];
        front.push({ t: "path", c: L.rope === "locs" ? "hrl" : "hs", d: L.rope === "box" ? chevrons(pts, 3) : openSpline(pts), ...(h.color ? { fill: "none" } : {}) });
      }
  return { back, front };
};

const circlePts = (x: number, y: number, r: number, n = 32): P[] => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * 2 * Math.PI) * r, y + Math.sin((i / n) * 2 * Math.PI) * r] as P);
const spikes = (pts: P[]): P[] => {
  // the upper half of the crown gets pointed tips
  const out: P[] = [];
  pts.forEach((p, i) => {
    out.push(p);
    const q = pts[(i + 1) % pts.length]!;
    if (p[1] < 60 && q[1] < 60) {
      const mx = (p[0] + q[0]) / 2;
      const my = (p[1] + q[1]) / 2;
      const dx = mx - CX;
      const dy = my - 92;
      const n = Math.hypot(dx, dy) || 1;
      out.push([mx + (dx / n) * 9, my + (dy / n) * 9], [mx + (dx / n) * 9, my + (dy / n) * 9]);
    }
  });
  return out;
};
const endsEdge = (ends: Ends, o: P, i: P): P[] => {
  const mid: P = [(o[0] + i[0]) / 2, (o[1] + i[1]) / 2];
  switch (ends) {
    case "blunt":
      return [o, o, i, i];
    case "layered":
      return [o, [o[0] + (i[0] - o[0]) * 0.35, o[1] - 2], [mid[0], mid[1] - 8], [o[0] + (i[0] - o[0]) * 0.7, i[1] + 2], i];
    case "shaggy":
      return [o, [o[0] + (i[0] - o[0]) * 0.25, o[1] - 9], [mid[0], mid[1] + 2], [o[0] + (i[0] - o[0]) * 0.75, mid[1] - 10], i];
    default:
      return [o, [mid[0], Math.max(o[1], i[1]) + 3], i];
  }
};
const chevrons = (pts: P[], step: number): string => {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i]!, pts[i + 1]!];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / step));
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    for (let k = 0; k < n; k++) {
      const c: P = [a[0] + ux * step * k, a[1] + uy * step * k];
      d += ` M${pt([c[0] - uy * 3 - ux * 2, c[1] + ux * 3 - uy * 2])} L${pt(c)} L${pt([c[0] + uy * 3 - ux * 2, c[1] - ux * 3 - uy * 2])}`;
    }
  }
  return d.trim();
};
const tail = (e: Extract<Extra, { k: "tail" }>, R: number, tex: Texture, fill: { fill?: string }): El[] => {
  const s = e.side;
  const x0 = CX + s * (R - 6);
  const out = e.out ?? 10;
  const centre: P[] = [
    [x0, e.y],
    [x0 + s * out, e.y + e.len * 0.3],
    [x0 + s * (out * 0.9), e.y + e.len * 0.7],
    [x0 + s * (out * 0.6 + 4), e.y + e.len],
  ];
  const width = (k: number) => (e.braid ? 9 : 12) * (1 - k * 0.55);
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    const seg = Math.min(2, Math.floor(k * 3));
    const t = k * 3 - seg;
    const a = centre[seg]!;
    const b = centre[seg + 1]!;
    const c: P = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    left.push([c[0] - width(k), c[1]]);
    right.push([c[0] + width(k), c[1]]);
  }
  const els: El[] = [{ t: "path", c: "hr", d: edge([...left, centre[3]!, ...right.reverse()], tex), ...fill }];
  els.push({ t: "path", c: "hs", d: e.braid ? chevrons(centre, 7) : openSpline(centre) });
  els.push({ t: "path", c: "l", d: `M${pt([x0 - 7, e.y + 2])} L${pt([x0 + 7, e.y + 2])}` }); // the tie
  return els;
};
const bangs = (fr: Frame, style: Bangs, length: BangsLength | null, tex: Texture, fill: { fill?: string }, TY: number): El[] => {
  const faceTop = fr.half[0]![1];
  const def: Record<Bangs, BangsLength> = { none: "brow", blunt: "brow", wispy: "brow", curtain: "eye", side_swept: "eye", choppy: "above_brows", asymmetric: "brow", micro: "very_short", feathered: "eye" };
  const Y: Record<BangsLength, number> = { very_short: faceTop + 10, above_brows: EYE_Y - 26, brow: EYE_Y - 17, eye: EYE_Y - 6, long: EYE_Y + 6 };
  const yB = Y[length ?? def[style]];
  const W = (y: number) => halfAt(fr.half, Math.min(y, TY)) - 1;
  const topEdge: P[] = [];
  for (const [w, y] of fr.half) if (y < TY) topEdge.push([CX + w, y - 3]);
  topEdge.push([CX + W(TY) + 1, TY - 2]);
  const right = topEdge.slice().reverse(); // temple → top
  const left = topEdge.slice(1).map(([x, y]) => [2 * CX - x, y] as P); // top → left temple
  const arc = [...right, ...left]; // right temple → left temple over the top
  let bottom: P[]; // left temple → right temple
  const xs = (n: number) => Array.from({ length: n + 1 }, (_, i) => -1 + (2 * i) / n);
  switch (style) {
    case "curtain":
    case "feathered":
      bottom = [
        [CX - W(yB), yB + 4],
        [CX - W(yB) * 0.55, yB - 6],
        [CX - 4, faceTop + 8],
        [CX, faceTop + 6],
        [CX + 4, faceTop + 8],
        [CX + W(yB) * 0.55, yB - 6],
        [CX + W(yB), yB + 4],
      ];
      if (style === "feathered") bottom = textured(bottom, "curly", -1);
      break;
    case "side_swept":
      bottom = [[CX - W(TY), faceTop + 16], [CX - 10, faceTop + 22], [CX + W(yB) * 0.6, yB - 2], [CX + W(yB), yB + 6]];
      break;
    case "asymmetric":
      bottom = [[CX - W(yB), yB - 12], [CX + W(yB), yB + 6]];
      break;
    case "choppy":
      bottom = xs(10).map((k, i) => [CX + k * W(yB), yB + (i % 2 ? -5 : 1) + ((i * 7) % 3)]);
      break;
    case "wispy":
      bottom = xs(14).map((k, i) => [CX + k * W(yB), i % 2 ? yB - 8 : yB + 1]);
      break;
    default:
      bottom = xs(6).map((k) => [CX + k * W(yB), yB + (1 - k * k) * 1.2]);
  }
  const shape = [...arc, ...bottom];
  const els: El[] = [{ t: "path", c: "hr", d: style === "blunt" || style === "micro" ? closedSpline(shape) : edge(shape, tex), ...fill, ...(style === "wispy" ? { opacity: 0.85 } : {}) }];
  const bot = (x: number) => {
    let best = bottom[0]!;
    for (const p of bottom) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    return best[1];
  };
  for (const k of [-0.6, -0.2, 0.2, 0.6]) {
    const x = CX + k * W(yB) * 0.9;
    const lean = style === "side_swept" ? 10 : style === "curtain" || style === "feathered" ? k * 10 : 0;
    const y0 = faceTop + 2;
    const y1 = bot(x) - 3;
    if (y1 - y0 < 6) continue;
    els.push({ t: "path", c: "hs", d: line([[x - lean, y0], [x - lean * 0.3, (y0 + y1) / 2], [x, y1]], tex) });
  }
  return els;
};

/** Head view with hair: back hair first, the face, then the crown, curtains, bangs and extras. */
export const headLayers = (face: FaceParams, hair: HairParams): Layer[] => {
  const g = hairGeometry(face.face, hair);
  const layers = frontLayers(face);
  return [{ id: "hairBack", els: g.back }, ...layers, { id: "hair", els: g.front }];
};

/** A neutral face, so every hair card compares the hair only. */
export const HEAD_CROPS = {
  head: [-25, 0, 250, 187.5],
  full: [-66.7, 0, 333.3, 250],
  top: [10, 6, 180, 135],
  bangs: [25, 24, 150, 112.5],
} as const;
