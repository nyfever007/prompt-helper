/**
 * Full-figure sketch (Sprint 2-D.3) — ONE drawing model for body cards, clothing cards, slider previews
 * and the Figure Builder. Pure, deterministic, erasable TypeScript only (the asset generator runs it).
 *
 * - The body is a NEUTRAL, featureless mannequin (front view, arms slightly away from the body): no
 *   anatomical detail, no chest or gluteal shaping, nothing sexualised. Plain base clothing (a T-shirt and
 *   knee shorts) is the preview-only neutral form wherever no garment is chosen; it is never stored or
 *   prompted. No body type is presented as better or ideal.
 * - Garments are fashion-flat-like line art cut from the same (eased) body parts, so a card and the
 *   builder draw a garment identically. Cards show the garment over a faint ghost figure.
 * - Relative sliders are 1–5 with 3 = neutral; option ids are the catalog's ids.
 */
import { HAIR_STYLES, type HairLength, type HairStyle, type Texture } from "./hair-sketch.ts";
import { clamp, closedSpline, lv, openSpline, pt, type Box, type El, type Layer, type P } from "./sketch-core.ts";

export type Build = "lean" | "slender" | "average" | "athletic" | "muscular" | "plump" | "heavyset";
export type Silhouette = "rectangular" | "hourglass" | "triangular" | "inverted_triangular" | "oval";
export type Proportions = "natural" | "elongated" | "compact" | "exaggerated" | "chibi";
export type UpperLower = "longer_upper" | "balanced" | "longer_lower";
export type ShoulderSlope = "sloping" | "gently_sloping" | "nearly_horizontal";
export type LegAlign = "straight" | "naturally_curved" | "bow_legged" | "knock_kneed";

export interface BodyParams {
  height: number;
  frame: number;
  muscle: number;
  fat: number;
  build: Build | null;
  silhouette: Silhouette | null;
  proportions: Proportions | null;
  headSize: number;
  headsTall: number | null;
  upperLen: number;
  lowerLen: number;
  ratio: UpperLower | null;
  neckLen: number;
  neckThick: number;
  shoulderWidth: number;
  shoulderSlope: ShoulderSlope | null;
  ribWidth: number;
  waistWidth: number;
  waistCurve: number;
  pelvisWidth: number;
  waistHip: number;
  armLen: number;
  upperArm: number;
  forearm: number;
  handSize: number;
  legLen: number;
  thigh: number;
  calf: number;
  ankle: number;
  footSize: number;
  legAlign: LegAlign | null;
}
export const neutralBody = (): BodyParams => ({
  height: 3, frame: 3, muscle: 3, fat: 3, build: null, silhouette: null, proportions: null, headSize: 3, headsTall: null, upperLen: 3, lowerLen: 3, ratio: null,
  neckLen: 3, neckThick: 3, shoulderWidth: 3, shoulderSlope: null, ribWidth: 3, waistWidth: 3, waistCurve: 3, pelvisWidth: 3, waistHip: 3,
  armLen: 3, upperArm: 3, forearm: 3, handSize: 3, legLen: 3, thigh: 3, calf: 3, ankle: 3, footSize: 3, legAlign: null,
});

// ── Garments ────────────────────────────────────────────────────────────────────────────────
export type Fit = "tight" | "slim" | "regular" | "relaxed" | "loose" | "oversized";
export type Neckline = "crew" | "v_neck" | "scoop" | "square" | "boat" | "high" | "turtleneck" | "mock" | "halter" | "sweetheart" | "cowl" | "off_shoulder" | "asymmetric";
export type Collar = "none" | "point" | "spread" | "button_down" | "mandarin" | "stand" | "peter_pan" | "sailor" | "shawl" | "notched_lapel" | "peak_lapel";
export type SleeveLength = "sleeveless" | "cap" | "short" | "elbow" | "three_quarter" | "long" | "extra_long";
export type SleeveStyle = "straight" | "fitted" | "rolled_up" | "puff" | "balloon" | "bell" | "bishop" | "raglan" | "batwing" | "flared";
export type TopLength = "cropped" | "waist" | "hip" | "longline";
export type Rise = "low" | "mid" | "high";
export type LegCut = "straight" | "tapered" | "wide" | "flared" | "bootcut";
export type BottomHem = "short" | "knee" | "calf" | "ankle" | "full";
export type WaistDesign = "natural" | "empire" | "drop" | "belted" | "cinched" | "undefined";
export type DressHem = "mini" | "above_knee" | "knee" | "midi" | "ankle" | "floor";
export type SkirtShape = "a_line" | "straight" | "pencil" | "flared" | "full" | "mermaid" | "tiered";

export interface TopSpec {
  type: string | null;
  fit: Fit | null;
  neckline: Neckline | null;
  collar: Collar | null;
  sleeveLength: SleeveLength | null;
  sleeveStyle: SleeveStyle | null;
  length: TopLength | null;
  color: string | null;
}
export interface BottomSpec {
  type: string | null;
  fit: Fit | null;
  rise: Rise | null;
  legCut: LegCut | null;
  hem: BottomHem | null;
  color: string | null;
}
export interface DressSpec {
  type: string | null;
  fit: Fit | null;
  neckline: Neckline | null;
  sleeveLength: SleeveLength | null;
  sleeveStyle: SleeveStyle | null;
  waist: WaistDesign | null;
  hem: DressHem | null;
  skirt: SkirtShape | null;
  color: string | null;
}
export interface FigureHair {
  length: HairLength | null;
  style: HairStyle | null;
  texture: Texture | null;
  volume: number;
  color: string | null;
  none: boolean;
}
export interface Outfit {
  top: TopSpec | null;
  bottom: BottomSpec | null;
  dress: DressSpec | null;
  /** Overall fit (applies where a garment has no own fit). */
  fit: Fit | null;
  /** Explicit “none”: no garment there and no base clothing (the featureless mannequin). */
  topNone?: boolean;
  bottomNone?: boolean;
}
export const emptyTop = (): TopSpec => ({ type: null, fit: null, neckline: null, collar: null, sleeveLength: null, sleeveStyle: null, length: null, color: null });
export const emptyBottom = (): BottomSpec => ({ type: null, fit: null, rise: null, legCut: null, hem: null, color: null });
export const emptyDress = (): DressSpec => ({ type: null, fit: null, neckline: null, sleeveLength: null, sleeveStyle: null, waist: null, hem: null, skirt: null, color: null });
export const noHair = (): FigureHair => ({ length: null, style: null, texture: null, volume: 3, color: null, none: true });

/** Garment types the sketch can draw (catalog ids → base design). Others are reported as text. */
export const TOP_TYPES: Record<string, Partial<TopSpec> & { placket?: number; hood?: boolean; rib?: boolean; cuffs?: boolean; knit?: boolean; pocket?: boolean; graphic?: boolean; peplum?: boolean; wrap?: boolean; straps?: "thin" | "wide" }> = {
  t_shirt: { neckline: "crew", sleeveLength: "short", length: "hip" },
  graphic_tee: { neckline: "crew", sleeveLength: "short", length: "hip", graphic: true },
  polo: { collar: "point", sleeveLength: "short", length: "hip", placket: 2 },
  henley: { neckline: "crew", sleeveLength: "long", length: "hip", placket: 3 },
  button_down: { collar: "button_down", sleeveLength: "long", length: "hip", placket: 6 },
  dress_shirt: { collar: "spread", sleeveLength: "long", length: "hip", placket: 6, fit: "slim" },
  oxford_shirt: { collar: "button_down", sleeveLength: "long", length: "hip", placket: 6, pocket: true },
  linen_shirt: { collar: "point", sleeveLength: "long", length: "hip", placket: 6, fit: "relaxed" },
  blouse: { neckline: "v_neck", sleeveLength: "long", sleeveStyle: "bishop", length: "hip", fit: "relaxed" },
  tank_top: { neckline: "scoop", sleeveLength: "sleeveless", length: "hip", straps: "wide" },
  sleeveless_top: { neckline: "crew", sleeveLength: "sleeveless", length: "hip" },
  crop_top: { neckline: "crew", sleeveLength: "short", length: "cropped", fit: "slim" },
  camisole: { neckline: "v_neck", sleeveLength: "sleeveless", length: "hip", straps: "thin" },
  vest: { neckline: "v_neck", sleeveLength: "sleeveless", length: "hip", placket: 4 },
  sweater: { neckline: "crew", sleeveLength: "long", length: "hip", rib: true, fit: "relaxed" },
  knit_sweater: { neckline: "crew", sleeveLength: "long", length: "hip", rib: true, knit: true, fit: "relaxed" },
  turtleneck: { neckline: "turtleneck", sleeveLength: "long", length: "hip", rib: true, fit: "slim" },
  mock_neck: { neckline: "mock", sleeveLength: "long", length: "hip", fit: "slim" },
  sweatshirt: { neckline: "crew", sleeveLength: "long", sleeveStyle: "raglan", length: "hip", rib: true, cuffs: true, fit: "relaxed" },
  hoodie: { neckline: "crew", sleeveLength: "long", length: "hip", rib: true, hood: true, fit: "relaxed" },
  tunic_top: { neckline: "v_neck", sleeveLength: "three_quarter", length: "longline", fit: "relaxed" },
  peplum_top: { neckline: "scoop", sleeveLength: "short", length: "hip", peplum: true, fit: "slim" },
  wrap_top: { neckline: "v_neck", sleeveLength: "long", length: "waist", wrap: true },
};
export const BOTTOM_TYPES: Record<string, Partial<BottomSpec> & { skirt?: SkirtShape; pleats?: boolean; wrap?: boolean; pockets?: "jeans" | "cargo" | "slant"; cuffs?: boolean; stripe?: boolean }> = {
  jeans: { legCut: "straight", hem: "full", fit: "regular", pockets: "jeans" },
  straight_jeans: { legCut: "straight", hem: "full", fit: "slim", pockets: "jeans" },
  skinny_jeans: { legCut: "tapered", hem: "ankle", fit: "tight", pockets: "jeans" },
  wide_jeans: { legCut: "wide", hem: "full", fit: "loose", pockets: "jeans" },
  flared_jeans: { legCut: "flared", hem: "full", fit: "slim", pockets: "jeans" },
  tailored_trousers: { legCut: "straight", hem: "full", fit: "slim", rise: "mid", pockets: "slant" },
  slacks: { legCut: "straight", hem: "full", fit: "regular", pockets: "slant" },
  chinos: { legCut: "tapered", hem: "ankle", fit: "slim", pockets: "slant" },
  cargo_pants: { legCut: "straight", hem: "full", fit: "relaxed", pockets: "cargo" },
  joggers: { legCut: "tapered", hem: "ankle", fit: "relaxed", cuffs: true },
  sweatpants: { legCut: "straight", hem: "full", fit: "loose", cuffs: true },
  leggings: { legCut: "tapered", hem: "ankle", fit: "tight", rise: "high" },
  culottes: { legCut: "wide", hem: "calf", fit: "loose", rise: "high" },
  shorts: { legCut: "straight", hem: "short", fit: "regular" },
  bermuda_shorts: { legCut: "straight", hem: "knee", fit: "relaxed" },
  cycling_shorts: { legCut: "tapered", hem: "short", fit: "tight" },
  pencil_skirt: { skirt: "pencil", hem: "knee", rise: "high" },
  a_line_skirt: { skirt: "a_line", hem: "knee" },
  pleated_skirt: { skirt: "a_line", hem: "knee", pleats: true },
  wrap_skirt: { skirt: "a_line", hem: "knee", wrap: true },
  denim_skirt: { skirt: "straight", hem: "short", pockets: "jeans" },
  flared_skirt: { skirt: "flared", hem: "knee" },
  maxi_skirt: { skirt: "a_line", hem: "full" },
};
export const DRESS_TYPES: Record<string, Partial<DressSpec> & { shirt?: boolean; wrap?: boolean; straps?: "thin"; rib?: boolean; jumpsuit?: "full" | "short"; bib?: boolean }> = {
  casual_dress: { neckline: "crew", sleeveLength: "short", skirt: "a_line", hem: "knee", waist: "natural" },
  a_line_dress: { neckline: "scoop", sleeveLength: "sleeveless", skirt: "a_line", hem: "knee", waist: "natural" },
  shirt_dress: { neckline: "v_neck", sleeveLength: "short", skirt: "straight", hem: "knee", waist: "belted", shirt: true },
  wrap_dress: { neckline: "v_neck", sleeveLength: "long", skirt: "a_line", hem: "midi", waist: "cinched", wrap: true },
  sheath_dress: { neckline: "boat", sleeveLength: "sleeveless", skirt: "pencil", hem: "knee", waist: "natural", fit: "slim" },
  shift_dress: { neckline: "crew", sleeveLength: "sleeveless", skirt: "straight", hem: "above_knee", waist: "undefined", fit: "relaxed" },
  slip_dress: { neckline: "v_neck", sleeveLength: "sleeveless", skirt: "straight", hem: "midi", waist: "undefined", straps: "thin" },
  sundress: { neckline: "square", sleeveLength: "sleeveless", skirt: "flared", hem: "knee", waist: "empire", straps: "thin" },
  sweater_dress: { neckline: "turtleneck", sleeveLength: "long", skirt: "straight", hem: "knee", waist: "undefined", rib: true },
  cocktail_dress: { neckline: "sweetheart", sleeveLength: "sleeveless", skirt: "full", hem: "above_knee", waist: "cinched" },
  evening_gown: { neckline: "v_neck", sleeveLength: "sleeveless", skirt: "a_line", hem: "floor", waist: "natural" },
  ball_gown: { neckline: "off_shoulder", sleeveLength: "sleeveless", skirt: "full", hem: "floor", waist: "cinched" },
  jumpsuit: { neckline: "v_neck", sleeveLength: "sleeveless", waist: "belted", jumpsuit: "full" },
  romper: { neckline: "square", sleeveLength: "short", waist: "natural", jumpsuit: "short" },
  overalls: { neckline: "square", sleeveLength: "sleeveless", waist: "natural", jumpsuit: "full", bib: true },
};

// ── Skeleton ────────────────────────────────────────────────────────────────────────────────
const CX = 100;
const G = 392;
export const FIG_BOX: Box = [0, 0, 200, 400];
const BUILD: Record<Build, { s: number; w: number; h: number; l: number }> = {
  lean: { s: 1, w: 0.86, h: 0.9, l: 0.88 },
  slender: { s: 0.88, w: 0.82, h: 0.86, l: 0.76 },
  average: { s: 1, w: 1, h: 1, l: 1 },
  athletic: { s: 1.12, w: 0.94, h: 0.98, l: 1.08 },
  muscular: { s: 1.26, w: 1.02, h: 1.02, l: 1.35 },
  plump: { s: 1.04, w: 1.32, h: 1.22, l: 1.28 },
  heavyset: { s: 1.2, w: 1.42, h: 1.28, l: 1.4 },
};
const SIL: Record<Silhouette, { s: number; w: number; h: number }> = {
  rectangular: { s: 1, w: 1.14, h: 0.96 },
  hourglass: { s: 1.02, w: 0.84, h: 1.06 },
  triangular: { s: 0.9, w: 1, h: 1.12 },
  inverted_triangular: { s: 1.15, w: 0.95, h: 0.9 },
  oval: { s: 0.96, w: 1.26, h: 1.02 },
};
const HEADS: Record<Proportions, number> = { natural: 7.5, elongated: 8.5, compact: 6.5, exaggerated: 9, chibi: 3 };

export interface Skeleton {
  u: number;
  top: number;
  h: number;
  headRx: number;
  chin: number;
  shoulderY: number;
  slope: number;
  chestY: number;
  waistY: number;
  hipY: number;
  crotchY: number;
  kneeY: number;
  ankleY: number;
  neck: number;
  shoulder: number;
  chest: number;
  waist: number;
  hip: number;
  limb: number;
  upperArm: number;
  forearm: number;
  wrist: number;
  armLen: number;
  hand: number;
  thigh: number;
  knee: number;
  calf: number;
  ankle: number;
  foot: number;
  hipJ: number;
  kneeX: number;
  ankleX: number;
}
export const skeleton = (b: BodyParams): Skeleton => {
  const heads = b.headsTall ?? HEADS[b.proportions ?? "natural"];
  const Ht = 352 * (1 + lv(b.height) * 0.035);
  const top = G - Ht;
  const u = Ht / 7.5;
  const h = Math.min(Ht * 0.42, (Ht / heads) * (1 + lv(b.headSize) * 0.08));
  const chin = top + h;
  const neckL = u * 0.3 * (1 + lv(b.neckLen) * 0.3) * (heads < 4 ? 0.4 : 1);
  const shoulderY = chin + neckL + u * 0.1;
  const ankleY = G - u * 0.14;
  const R = ankleY - shoulderY;
  let f = 0.6 + (lv(b.lowerLen) + lv(b.legLen) - lv(b.upperLen)) * 0.022 + (b.ratio === "longer_lower" ? 0.045 : b.ratio === "longer_upper" ? -0.045 : 0);
  if (heads < 4) f = 0.48;
  f = clamp(f, 0.42, 0.72);
  const crotchY = shoulderY + R * (1 - f);
  const B = BUILD[b.build ?? "average"];
  const S = b.silhouette ? SIL[b.silhouette] : { s: 1, w: 1, h: 1 };
  const fr = 1 + lv(b.frame) * 0.05;
  const mus = lv(b.muscle);
  const fat = lv(b.fat);
  const limb = B.l * (1 + mus * 0.05) * (1 + fat * 0.06) * fr;
  const hip = u * 0.74 * (1 + lv(b.pelvisWidth) * 0.08) * B.h * S.h * (1 + fat * 0.05) * (1 + lv(b.waistHip) * 0.025) * fr;
  const thigh = Math.min(hip * 0.56, u * 0.3 * (1 + lv(b.thigh) * 0.12) * limb);
  const slope = b.shoulderSlope === "sloping" ? u * 0.32 : b.shoulderSlope === "gently_sloping" ? u * 0.21 : b.shoulderSlope === "nearly_horizontal" ? u * 0.07 : u * 0.17;
  const alignK = b.legAlign === "bow_legged" ? 0.22 : b.legAlign === "knock_kneed" ? -0.15 : b.legAlign === "naturally_curved" ? 0.07 : 0;
  const hipJ = hip * 0.5;
  const ankleX = hip * 0.34;
  return {
    u, top, h, chin, shoulderY, slope, crotchY, ankleY,
    headRx: h * 0.38,
    chestY: shoulderY + (crotchY - shoulderY) * 0.24,
    waistY: shoulderY + (crotchY - shoulderY) * 0.56,
    hipY: crotchY - u * 0.36,
    kneeY: crotchY + (ankleY - crotchY) * 0.5,
    neck: u * 0.17 * (1 + lv(b.neckThick) * 0.13) * Math.sqrt(limb),
    shoulder: u * 0.92 * (1 + lv(b.shoulderWidth) * 0.08) * B.s * S.s * fr * (1 + mus * 0.04),
    chest: u * 0.7 * (1 + lv(b.ribWidth) * 0.07) * Math.pow(B.s, 0.6) * fr * (1 + fat * 0.04),
    waist: u * 0.56 * (1 + lv(b.waistWidth) * 0.09) * B.w * S.w * (1 + fat * 0.09) * (1 - lv(b.waistCurve) * 0.035) * (1 - lv(b.waistHip) * 0.04) * fr,
    hip, limb,
    upperArm: u * 0.19 * (1 + lv(b.upperArm) * 0.13) * limb,
    forearm: u * 0.15 * (1 + lv(b.forearm) * 0.13) * limb,
    wrist: u * 0.085 * Math.sqrt(limb),
    armLen: u * 2.85 * (1 + lv(b.armLen) * 0.06) * (heads < 4 ? 0.7 : 1),
    hand: u * 0.7 * (1 + lv(b.handSize) * 0.1),
    thigh,
    knee: u * 0.17 * Math.pow(limb, 0.6),
    calf: u * 0.19 * (1 + lv(b.calf) * 0.13) * limb,
    ankle: u * 0.085 * (1 + lv(b.ankle) * 0.15),
    foot: u * 0.95 * (1 + lv(b.footSize) * 0.1),
    hipJ,
    kneeX: (hipJ + ankleX) / 2 + u * alignK,
    ankleX,
  };
};

// ── Body parts (right side; mirrored) — `e` is garment ease added to the half widths ──────────
const mirror = (pts: P[]): P[] => pts.map(([x, y]) => [2 * CX - x, y] as P);
const both = (right: P[]): P[] => [...right, ...mirror(right).reverse()];
const torso = (s: Skeleton, e = 0, taper = 1): P[] => {
  const w = (v: number, k = 1) => v + e * k;
  const waistHalf = s.waist + (Math.max(s.chest, s.hip) - s.waist) * (1 - taper) + e;
  const right: P[] = [
    [CX + s.neck * 1.05 + e * 0.3, s.shoulderY - s.u * 0.04],
    [CX + w(s.shoulder) * 0.62, s.shoulderY + s.slope * 0.35],
    [CX + w(s.shoulder), s.shoulderY + s.slope],
    [CX + w(s.shoulder) * 0.97, s.shoulderY + s.slope + s.u * 0.32],
    [CX + w(s.chest), s.chestY + s.u * 0.22],
    [CX + waistHalf, s.waistY],
    [CX + w(s.hip), s.hipY],
    [CX + w(s.hip) * 0.97, s.crotchY - s.u * 0.12],
    [CX + s.u * 0.06, s.crotchY],
  ];
  return both(right);
};
interface ArmGeo {
  pts: P[];
  axis: (k: number) => P;
  dir: P;
}
const arm = (s: Skeleton, side: 1 | -1, e = 0, style?: SleeveStyle, endK = 1.08): ArmGeo => {
  const ang = (9 * Math.PI) / 180;
  const dir: P = [side * Math.sin(ang), Math.cos(ang)];
  const o: P = [CX + side * (s.shoulder - s.upperArm * 0.55), s.shoulderY + s.slope + s.u * 0.08];
  const L = s.armLen;
  const axis = (k: number): P => [o[0] + dir[0] * L * k, o[1] + dir[1] * L * k];
  const base = (k: number) =>
    k < 0.47 ? s.upperArm * (1.05 - k * 0.25) + (s.forearm - s.upperArm * 0.93) * Math.max(0, (k - 0.3) / 0.17) : k < 1 ? s.forearm + (s.wrist - s.forearm) * ((k - 0.47) / 0.53) : s.wrist * 1.1;
  const styleW = (k: number) => {
    switch (style) {
      case "puff":
        return k < 0.28 ? Math.sin((k / 0.28) * Math.PI) * s.u * 0.16 : 0;
      case "balloon":
        return k > 0.45 && k < 0.98 ? Math.sin(((k - 0.45) / 0.53) * Math.PI) * s.u * 0.17 : 0;
      case "bishop":
        return k > 0.5 && k < 0.98 ? ((k - 0.5) / 0.48) * s.u * 0.15 : 0;
      case "bell":
        return k > 0.55 ? ((k - 0.55) / 0.45) ** 1.5 * s.u * 0.28 : 0;
      case "flared":
        return k > 0.5 ? ((k - 0.5) / 0.5) * s.u * 0.16 : 0;
      case "batwing":
        return k < 0.6 ? (1 - k / 0.6) * s.u * 0.42 : 0;
      case "fitted":
        return -e * 0.7;
      default:
        return 0;
    }
  };
  const ks = [0, 0.12, 0.25, 0.38, 0.47, 0.6, 0.75, 0.9, endK].filter((k) => k <= endK);
  const outer: P[] = [];
  const inner: P[] = [];
  for (const k of ks) {
    const c = axis(k);
    const w = base(k) + e * 0.8 + styleW(k);
    outer.push([c[0] + side * dir[1] * w, c[1] - side * dir[0] * w]);
    inner.push([c[0] - side * dir[1] * w * (style === "batwing" && k < 0.6 ? 0.2 : 1), c[1] + side * dir[0] * w]);
  }
  const top: P = [CX + side * (s.shoulder * 0.82), s.shoulderY + s.slope * 0.7];
  return { pts: [top, ...outer, ...inner.reverse()], axis, dir };
};
const hand = (s: Skeleton, side: 1 | -1): P[] => {
  const a = arm(s, side);
  const w = a.axis(1);
  const pts: P[] = [];
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * 2 * Math.PI;
    const rx = s.wrist * 1.25;
    const ry = s.hand * 0.5;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry + ry;
    pts.push([w[0] + x * a.dir[1] + y * a.dir[0], w[1] - x * a.dir[0] * 0 + y * a.dir[1]]);
  }
  return pts;
};
const leg = (s: Skeleton, side: 1 | -1, e = 0, cut?: { knee: number; hem: number; tight?: boolean }, hemY = s.ankleY): P[] => {
  const X = (v: number) => CX + side * v;
  const kneeW = cut ? s.knee + e + (cut.knee - 1) * s.u * 0.1 : s.knee;
  const hemW = (base: number) => (cut ? base + e * 0.6 + (cut.hem - 1) * s.u * 0.16 : base);
  const ty = s.crotchY + s.u * 0.45;
  const ky = s.kneeY;
  const cy = s.kneeY + (s.ankleY - s.kneeY) * 0.3;
  const c = (y: number) => {
    // x of the leg centre line at y (hip joint → knee → ankle)
    if (y <= ky) return s.hipJ + (s.kneeX - s.hipJ) * ((y - s.crotchY) / (ky - s.crotchY));
    return s.kneeX + (s.ankleX - s.kneeX) * ((y - ky) / (s.ankleY - ky));
  };
  const outer: P[] = [
    [X(s.hip * 0.97 + e), s.hipY],
    [X(c(ty) + s.thigh + e), ty],
    [X(c(ky) + kneeW), ky],
  ];
  const inner: P[] = [[X(c(ky) - kneeW), ky], [X(c(ty) - s.thigh * 0.8 - e * 0.6), ty], [X(s.u * 0.05), s.crotchY + 1]];
  if (hemY > ky + 4) {
    const hc = Math.min(hemY, cy);
    if (hemY > cy) {
      outer.push([X(c(cy) + (cut ? Math.max(s.calf + e * 0.7, (kneeW + hemW(s.ankle)) / 2) : s.calf * 1.05)), cy]);
      inner.unshift([X(c(cy) - (cut ? Math.max(s.calf * 0.9 + e * 0.7, (kneeW + hemW(s.ankle)) / 2) : s.calf * 0.9)), cy]);
    }
    const w = cut ? Math.max(hemW(s.ankle), s.ankle + e * 0.3) : s.ankle;
    const fy = hemY > cy ? hemY : hc;
    outer.push([X(c(fy) + w), fy]);
    inner.unshift([X(c(fy) - w), fy]);
  } else {
    const fy = hemY;
    outer.push([X(c(fy) + s.thigh * 0.85 + e), fy]);
    inner.unshift([X(c(fy) - s.thigh * 0.7 - e * 0.6), fy]);
  }
  return side === 1 ? [...outer, ...inner] : [...outer, ...inner].reverse();
};
const foot = (s: Skeleton, side: 1 | -1): P[] => {
  const X = (v: number) => CX + side * v;
  return [[X(s.ankleX - s.ankle), s.ankleY - 2], [X(s.ankleX - s.ankle * 1.15), G], [X(s.ankleX + s.foot * 0.32), G], [X(s.ankleX + s.ankle * 1.1), s.ankleY - 2]];
};
const headPath = (s: Skeleton): string => closedSpline(Array.from({ length: 16 }, (_, i) => [CX + Math.cos((i / 16) * 2 * Math.PI) * s.headRx, s.top + s.h / 2 + Math.sin((i / 16) * 2 * Math.PI) * (s.h / 2)] as P));
const neckPath = (s: Skeleton): string =>
  `M${pt([CX - s.neck, s.chin - s.h * 0.12])} L${pt([CX - s.neck * 1.08, s.shoulderY + 2])} L${pt([CX + s.neck * 1.08, s.shoulderY + 2])} L${pt([CX + s.neck, s.chin - s.h * 0.12])} Z`;

// ── Garment construction ────────────────────────────────────────────────────────────────────
const EASE: Record<Fit, number> = { tight: 0, slim: 0.03, regular: 0.08, relaxed: 0.14, loose: 0.22, oversized: 0.32 };
const band = (x0: number, x1: number, topEdge: P[], bottomY: number): string => `M${pt([x0, topEdge[0]![1]])} ${topEdge.map((p) => `L${pt(p)}`).join(" ")} L${pt([x1, topEdge[topEdge.length - 1]![1]])} L${pt([x1, bottomY])} L${pt([x0, bottomY])} Z`;
/** Top edge of a garment's torso region (neckline), left → right. */
const necklineEdge = (s: Skeleton, n: Neckline, e: number): { edge: P[]; tube?: number; drape?: boolean } => {
  const y0 = s.shoulderY - s.u * 0.06;
  const nw = s.neck * 1.12;
  const sh = s.shoulder + e;
  const L = (pts: P[]) => [[CX - 400, y0 - 40], ...mirror(pts).reverse(), ...pts, [CX + 400, y0 - 40]] as P[];
  switch (n) {
    case "v_neck":
      return { edge: L([[CX, s.shoulderY + s.u * 0.72], [CX + nw * 1.05, y0]]) };
    case "scoop":
      return { edge: L([[CX, s.shoulderY + s.u * 0.5], [CX + nw * 1.5, s.shoulderY + s.u * 0.32], [CX + nw * 1.7, y0]]) };
    case "square":
      return { edge: L([[CX, s.shoulderY + s.u * 0.45], [CX + nw * 1.45, s.shoulderY + s.u * 0.45], [CX + nw * 1.45, s.shoulderY + s.u * 0.44], [CX + nw * 1.5, y0]]) };
    case "boat":
      return { edge: L([[CX, s.shoulderY + s.u * 0.06], [CX + sh * 0.55, s.shoulderY + s.u * 0.02], [CX + sh * 0.6, y0]]) };
    case "high":
      return { edge: L([[CX, s.chin + s.u * 0.12], [CX + nw * 0.96, s.chin + s.u * 0.14], [CX + nw, y0]]), tube: 0.5 };
    case "turtleneck":
      return { edge: L([[CX, s.chin - s.u * 0.02], [CX + nw, s.chin], [CX + nw * 1.05, y0]]), tube: 1 };
    case "mock":
      return { edge: L([[CX, s.chin + s.u * 0.14], [CX + nw, s.chin + s.u * 0.16], [CX + nw * 1.04, y0]]), tube: 0.6 };
    case "halter":
      return { edge: [[CX - 400, s.chestY + s.u * 0.4], [CX - sh * 0.75, s.chestY + s.u * 0.3], [CX - nw * 1.2, s.chin + s.u * 0.12], [CX - nw * 0.8, s.chin + s.u * 0.1], [CX, s.shoulderY + s.u * 0.32], [CX + nw * 0.8, s.chin + s.u * 0.1], [CX + nw * 1.2, s.chin + s.u * 0.12], [CX + sh * 0.75, s.chestY + s.u * 0.3], [CX + 400, s.chestY + s.u * 0.4]] };
    case "sweetheart":
      return { edge: [[CX - 400, s.chestY + s.u * 0.1], [CX - sh * 0.8, s.chestY - s.u * 0.02], [CX - sh * 0.45, s.chestY - s.u * 0.18], [CX - sh * 0.15, s.chestY - s.u * 0.06], [CX, s.chestY + s.u * 0.12], [CX + sh * 0.15, s.chestY - s.u * 0.06], [CX + sh * 0.45, s.chestY - s.u * 0.18], [CX + sh * 0.8, s.chestY - s.u * 0.02], [CX + 400, s.chestY + s.u * 0.1]] };
    case "cowl":
      return { edge: L([[CX, s.shoulderY + s.u * 0.55], [CX + nw * 1.4, s.shoulderY + s.u * 0.25], [CX + nw * 1.6, y0]]), drape: true };
    case "off_shoulder":
      return { edge: [[CX - 400, s.shoulderY + s.u * 0.42], [CX - sh * 1.05, s.shoulderY + s.u * 0.34], [CX, s.shoulderY + s.u * 0.42], [CX + sh * 1.05, s.shoulderY + s.u * 0.34], [CX + 400, s.shoulderY + s.u * 0.42]] };
    case "asymmetric":
      return { edge: [[CX - 400, s.chestY + s.u * 0.2], [CX - sh * 0.75, s.chestY + s.u * 0.1], [CX + nw * 0.4, s.shoulderY + s.u * 0.25], [CX + nw * 1.3, y0], [CX + 400, y0 - 40]] };
    default:
      return { edge: L([[CX, s.shoulderY + s.u * 0.2], [CX + nw * 0.95, s.shoulderY + s.u * 0.08], [CX + nw * 1.05, y0]]) };
  }
};
const SLEEVE_K: Record<SleeveLength, number> = { sleeveless: 0, cap: 0.1, short: 0.3, elbow: 0.47, three_quarter: 0.68, long: 0.98, extra_long: 1.08 };

interface Piece {
  shapes: string[];
  region: string;
  cuts: string[]; // the region outline (neckline/hem) drawn where it crosses the shapes
  fill: string | null;
}
const garment = (p: Piece, cls: string): El[] => [
  { t: "clip", d: p.region, children: p.shapes.map((d) => ({ t: "path", c: cls, d, ...(p.fill ? { fill: p.fill } : {}) }) as El) },
  { t: "clip", d: p.shapes, children: p.cuts.map((d) => ({ t: "path", c: "gl", d }) as El) },
];

const topY = (s: Skeleton, l: TopLength): number => (l === "cropped" ? s.waistY - s.u * 0.28 : l === "waist" ? s.waistY + s.u * 0.12 : l === "longline" ? s.crotchY + s.u * 0.62 : s.hipY + s.u * 0.28);
/** A top or a dress bodice (neckline → hemY) with sleeves. */
const upper = (s: Skeleton, o: { fit: Fit; neckline: Neckline; sleeveLength: SleeveLength; sleeveStyle: SleeveStyle; hemY: number; fill: string | null; straps?: "thin" | "wide"; taper?: number }): El[] => {
  const e = EASE[o.fit] * s.u;
  const nk = necklineEdge(s, o.neckline, e);
  const sk = SLEEVE_K[o.sleeveLength];
  const t = closedSpline(torso(s, e, o.taper ?? (o.fit === "tight" || o.fit === "slim" ? 1 : 0.55)));
  const els: El[] = [];
  // sleeves first (behind the bodice edge at the shoulder)
  if (sk > 0 && o.neckline !== "halter")
    for (const side of [-1, 1] as const) {
      const a = arm(s, side, e, o.sleeveStyle, sk);
      const shape = closedSpline(a.pts);
      const endC = a.axis(sk);
      const w = s.u * 0.9;
      const cut = `M${pt([endC[0] - a.dir[1] * w, endC[1] + a.dir[0] * w * side])} L${pt([endC[0] + a.dir[1] * w, endC[1] - a.dir[0] * w * side])}`;
      const offTop = o.neckline === "off_shoulder" ? s.shoulderY + s.u * 0.34 : -400;
      els.push(...garment({ shapes: [shape], region: `M-400 ${offTop} L600 ${offTop} L600 600 L-400 600 Z`, cuts: [cut], fill: o.fill }, "g"));
      if (o.sleeveStyle === "rolled_up") {
        const c2 = a.axis(Math.max(0.05, sk - 0.08));
        els.push({ t: "clip", d: shape, children: [{ t: "path", c: "gl", d: `M${pt([c2[0] - a.dir[1] * w, c2[1] + a.dir[0] * w * side])} L${pt([c2[0] + a.dir[1] * w, c2[1] - a.dir[0] * w * side])}` }] });
      }
      if (o.sleeveStyle === "raglan") els.push({ t: "clip", d: [t, shape], children: [{ t: "path", c: "gs", d: `M${pt([CX + side * s.neck * 1.3, s.shoulderY])} L${pt([CX + side * s.chest * 1.02, s.chestY + s.u * 0.25])}` }] });
    }
  const region = band(CX - 400, CX + 400, nk.edge, o.hemY);
  if (o.straps || o.sleeveLength === "sleeveless") {
    // armholes: cut the shoulders away outside the straps
    const sw = o.straps === "thin" ? s.u * 0.06 : o.straps === "wide" ? s.u * 0.2 : s.u * 0.3;
    const inner = o.straps ? s.neck * 1.5 + sw : s.shoulder * 0.8 + e;
    const ah = s.chestY + s.u * 0.18;
    const cutR = `M${pt([CX + inner, s.shoulderY - 30])} L${pt([CX + inner, s.shoulderY + s.u * 0.1])} C${pt([CX + inner, ah])} ${pt([CX + s.chest + e, ah])} ${pt([CX + s.chest + e + 1, ah + 2])} L${pt([CX + 300, ah])} L${pt([CX + 300, s.shoulderY - 30])} Z`;
    // armholes are holes in the region (even-odd): the bodice is drawn only between them
    const [body, edges] = garment({ shapes: [t], region: `${region} ${cutR} ${mirrorPath(cutR)}`, cuts: [region, cutR, mirrorPath(cutR)], fill: o.fill }, "g");
    els.push({ ...(body as Extract<El, { t: "clip" }>), evenOdd: true }, edges!);
    if (o.straps)
      for (const side of [-1, 1])
        els.push({ t: "path", c: "gl", d: `M${pt([CX + side * (inner - sw / 2), s.shoulderY - s.u * 0.02])} L${pt([CX + side * (inner - sw / 2), s.shoulderY + s.u * 0.25])}` });
  } else {
    els.push(...garment({ shapes: [t], region, cuts: [region], fill: o.fill }, "g"));
  }
  if (nk.tube) {
    const y1 = s.chin + s.u * (0.04 + (1 - nk.tube) * 0.3);
    els.push({ t: "path", c: "g", d: `M${pt([CX - s.neck * 1.18, s.shoulderY + 2])} L${pt([CX - s.neck * 1.12, y1])} Q${pt([CX, y1 - s.u * 0.04])} ${pt([CX + s.neck * 1.12, y1])} L${pt([CX + s.neck * 1.18, s.shoulderY + 2])} Z`, ...(o.fill ? { fill: o.fill } : {}) });
    els.push({ t: "path", c: "gs", d: `M${pt([CX - s.neck * 0.5, y1 + 2])} L${pt([CX - s.neck * 0.5, s.shoulderY])} M${pt([CX + s.neck * 0.5, y1 + 2])} L${pt([CX + s.neck * 0.5, s.shoulderY])}` });
  }
  if (nk.drape) els.push({ t: "path", c: "gs", d: `M${pt([CX - s.neck * 1.3, s.shoulderY + s.u * 0.12])} Q${pt([CX, s.shoulderY + s.u * 0.42])} ${pt([CX + s.neck * 1.3, s.shoulderY + s.u * 0.12])}` });
  return els;
};
const mirrorPath = (d: string): string =>
  d.replace(/([MLCQ])\s*([^MLCQZ]*)/g, (_, c: string, a: string) => {
    const n = a.trim().split(/\s+/).filter(Boolean).map(Number);
    const out: string[] = [];
    for (let i = 0; i < n.length; i += 2) out.push(`${Math.round((2 * CX - n[i]!) * 10) / 10 + 0} ${n[i + 1]}`);
    return `${c}${out.join(" ")} `;
  });

const collarEls = (s: Skeleton, c: Collar, fill: string | null): El[] => {
  if (c === "none") return [];
  const f = fill ? { fill } : {};
  const y0 = s.shoulderY - s.u * 0.04;
  const n = s.neck * 1.12;
  const u = s.u;
  const R = (pts: P[]): El[] => {
    const d = closedSpline(pts);
    return [{ t: "path", c: "g", d, ...f }, { t: "path", c: "g", d: closedSpline(mirror(pts).reverse()), ...f }];
  };
  const sharp = (pts: P[]): El[] => {
    const d = `M${pts.map(pt).join(" L")} Z`;
    return [{ t: "path", c: "g", d, ...f }, { t: "path", c: "g", d: mirrorPath(d) + "Z", ...f }];
  };
  switch (c) {
    case "point":
    case "button_down":
    case "spread": {
      const tipX = c === "spread" ? n * 1.9 : n * 1.1;
      const tipY = c === "spread" ? y0 + u * 0.28 : y0 + u * 0.42;
      const els = sharp([[CX + 1, y0 + u * 0.22], [CX + n, y0 - u * 0.1], [CX + n * 1.35, y0 - u * 0.02], [CX + tipX, tipY]]);
      if (c === "button_down") els.push({ t: "circle", c: "gl", cx: CX + tipX - 2.5, cy: tipY - 3, r: 1 }, { t: "circle", c: "gl", cx: CX - tipX + 2.5, cy: tipY - 3, r: 1 });
      return els;
    }
    case "mandarin":
    case "stand": {
      const hgt = c === "stand" ? u * 0.24 : u * 0.15;
      return [{ t: "path", c: "g", d: `M${pt([CX - n * 1.02, y0 + 2])} L${pt([CX - n * 0.98, y0 - hgt])} Q${pt([CX, y0 - hgt - 1])} ${pt([CX + n * (c === "mandarin" ? 0.7 : 0.98), y0 - hgt])} L${pt([CX + n * 1.02, y0 + 2])} Z`, ...f }];
    }
    case "peter_pan":
      return R([[CX + 1, y0 + u * 0.2], [CX + n, y0 - u * 0.05], [CX + n * 1.9, y0 + u * 0.06], [CX + n * 1.6, y0 + u * 0.3], [CX + n * 0.6, y0 + u * 0.34]]);
    case "sailor":
      return [
        ...sharp([[CX, s.shoulderY + u * 0.72], [CX + n * 0.9, y0], [CX + s.shoulder * 0.72, y0 + u * 0.05], [CX + s.shoulder * 0.62, s.shoulderY + u * 0.5]]),
        { t: "path", c: "gs", d: `M${pt([CX - s.shoulder * 0.55, s.shoulderY + u * 0.42])} L${pt([CX, s.shoulderY + u * 0.62])} L${pt([CX + s.shoulder * 0.55, s.shoulderY + u * 0.42])}` },
      ];
    case "shawl":
      return R([[CX + 1, s.waistY - u * 0.3], [CX + n * 0.9, y0 - u * 0.02], [CX + n * 1.55, y0 + u * 0.1], [CX + n * 1.3, s.chestY + u * 0.3], [CX + 3, s.waistY - u * 0.28]]);
    case "notched_lapel":
    case "peak_lapel": {
      const peak = c === "peak_lapel";
      return sharp([
        [CX + 1, s.waistY - u * 0.32],
        [CX + n * 0.9, y0],
        [CX + n * 1.4, y0 + u * 0.02],
        [CX + n * 1.3, s.shoulderY + u * 0.3],
        ...(peak ? ([[CX + n * 2.15, s.shoulderY + u * 0.18], [CX + n * 1.85, s.shoulderY + u * 0.42]] as P[]) : ([[CX + n * 1.75, s.shoulderY + u * 0.32], [CX + n * 1.85, s.shoulderY + u * 0.48]] as P[])),
        [CX + 2, s.waistY - u * 0.3],
      ]);
    }
    default:
      return [];
  }
};

const bottomHemY = (s: Skeleton, h: BottomHem): number =>
  h === "short" ? s.crotchY + s.u * 0.7 : h === "knee" ? s.kneeY + s.u * 0.15 : h === "calf" ? s.kneeY + (s.ankleY - s.kneeY) * 0.55 : h === "ankle" ? s.ankleY - s.u * 0.22 : G - s.u * 0.12;
const riseY = (s: Skeleton, r: Rise): number => (r === "low" ? s.hipY - s.u * 0.12 : r === "high" ? s.waistY - s.u * 0.06 : s.waistY + (s.hipY - s.waistY) * 0.5);
const CUT: Record<LegCut, { knee: number; hem: number }> = { straight: { knee: 1.3, hem: 1.6 }, tapered: { knee: 1.05, hem: 0.95 }, wide: { knee: 2.3, hem: 3 }, flared: { knee: 1.05, hem: 3 }, bootcut: { knee: 1.15, hem: 2 } };

const pants = (s: Skeleton, b: { fit: Fit; rise: Rise; legCut: LegCut; hem: BottomHem; fill: string | null; detail?: (typeof BOTTOM_TYPES)[string] }): El[] => {
  const e = EASE[b.fit] * s.u;
  const top = riseY(s, b.rise);
  const hemY = bottomHemY(s, b.hem);
  const cut = b.fit === "tight" ? { knee: 0.9, hem: 0.8 } : CUT[b.legCut];
  const legs = [-1, 1].map((side) => closedSpline(leg(s, side as 1 | -1, e, cut, hemY)));
  const hips = closedSpline(torso(s, e, 0.5));
  const region = `M-400 ${top} L600 ${top} L600 ${hemY} L-400 ${hemY} Z`;
  const els = garment({ shapes: [...legs, hips], region, cuts: [region], fill: b.fill }, "g");
  // fly and waistband
  els.push({ t: "clip", d: [hips], children: [{ t: "path", c: "gs", d: `M${pt([CX, top + s.u * 0.12])} L${pt([CX, s.crotchY - s.u * 0.18])}` }, { t: "path", c: "gs", d: `M-400 ${top + s.u * 0.12} L600 ${top + s.u * 0.12}` }] });
  const d = b.detail;
  if (d?.pockets === "jeans" || d?.pockets === "slant")
    for (const side of [-1, 1])
      els.push({ t: "clip", d: [hips], children: [{ t: "path", c: "gs", d: `M${pt([CX + side * (s.hip * 0.45), top + s.u * 0.13])} Q${pt([CX + side * (s.hip * 0.55), top + s.u * 0.42])} ${pt([CX + side * (s.hip + e), top + s.u * (d.pockets === "jeans" ? 0.4 : 0.5)])}` }] });
  if (d?.pockets === "cargo")
    for (const side of [-1, 1] as const) {
      const y = s.crotchY + s.u * 0.6;
      const x = CX + side * (s.hipJ + s.thigh * 0.55 + e);
      els.push({ t: "path", c: "gl", d: `M${pt([x - s.u * 0.16, y])} L${pt([x + s.u * 0.16, y])} L${pt([x + s.u * 0.16, y + s.u * 0.5])} L${pt([x - s.u * 0.16, y + s.u * 0.5])} Z` });
    }
  if (d?.cuffs) els.push({ t: "clip", d: legs, children: [{ t: "path", c: "gs", d: `M-400 ${hemY - s.u * 0.15} L600 ${hemY - s.u * 0.15}` }] });
  return els;
};
const skirtEls = (s: Skeleton, o: { shape: SkirtShape; top: number; hemY: number; fit: Fit; fill: string | null; pleats?: boolean; wrap?: boolean }): El[] => {
  const e = EASE[o.fit] * s.u;
  const hipW = s.hip + e + s.u * 0.05;
  const span = o.hemY - s.hipY;
  const hemW: Record<SkirtShape, number> = { pencil: hipW * 0.9, straight: hipW * 1.02, a_line: hipW + span * 0.28, flared: hipW + span * 0.5, full: hipW + span * 0.75, mermaid: hipW * 0.85, tiered: hipW + span * 0.38 };
  const wTop = (s.waist + (s.hip - s.waist) * Math.max(0, (o.top - s.waistY) / (s.hipY - s.waistY))) + e;
  const right: P[] = [[CX + wTop, o.top], [CX + hipW, s.hipY]];
  if (o.shape === "mermaid") {
    const knee = s.kneeY;
    right.push([CX + hipW * 0.78, Math.min(knee, o.hemY - 4)], [CX + hipW * 1.5, o.hemY]);
  } else if (o.shape === "full") right.push([CX + hipW + span * 0.55, s.hipY + span * 0.5], [CX + hemW.full, o.hemY]);
  else right.push([CX + (hipW + hemW[o.shape]) / 2 + (o.shape === "pencil" ? 0 : 1), s.hipY + span * 0.5], [CX + hemW[o.shape], o.hemY]);
  const hem: P[] = o.shape === "flared" || o.shape === "full" ? textured_hem(CX + hemW[o.shape], CX - hemW[o.shape], o.hemY) : [[CX, o.hemY + 2]];
  const pts: P[] = [...right, right[right.length - 1]!, ...hem, [2 * CX - right[right.length - 1]![0], right[right.length - 1]![1]], ...mirror(right).reverse()];
  pts.push(pts[0]!);
  const d = closedSpline(pts);
  const els: El[] = [{ t: "path", c: "g", d, ...(o.fill ? { fill: o.fill } : {}) }];
  els.push({ t: "path", c: "gs", d: `M${pt([CX - wTop, o.top + s.u * 0.1])} L${pt([CX + wTop, o.top + s.u * 0.1])}` });
  if (o.pleats) for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) els.push({ t: "clip", d, children: [{ t: "path", c: "gs", d: `M${pt([CX + k * wTop, o.top + s.u * 0.12])} L${pt([CX + k * hemW[o.shape], o.hemY])}` }] });
  if (o.wrap) els.push({ t: "clip", d, children: [{ t: "path", c: "gl", d: `M${pt([CX - wTop * 0.6, o.top])} Q${pt([CX + hipW * 0.2, s.hipY + span * 0.4])} ${pt([CX + hemW[o.shape] * 0.5, o.hemY])}` }] });
  if (o.shape === "tiered") for (const k of [0.36, 0.68]) els.push({ t: "clip", d, children: [{ t: "path", c: "gl", d: `M-400 ${o.top + (o.hemY - o.top) * k} L600 ${o.top + (o.hemY - o.top) * k}` }] });
  return els;
};
const textured_hem = (xr: number, xl: number, y: number): P[] => {
  const out: P[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) out.push([xr + ((xl - xr) * i) / n, y + (i % 2 ? -4 : 2)]);
  return out;
};

// ── Hair on the figure (length / volume silhouette) ─────────────────────────────────────────
const figureHair = (s: Skeleton, h: FigureHair): { back: El[]; front: El[] } => {
  if (h.none) return { back: [], front: [] };
  const look = h.style ? HAIR_STYLES[h.style] : null;
  const len: HairLength = h.length ?? (look && "len" in look ? look.len : "chin");
  const down = look ? look.down || ("halfUp" in look && look.halfUp) : len !== "extremely_short";
  const vol = s.headRx * (0.12 + lv(h.volume) * 0.05 + (h.texture === "curly" ? 0.08 : h.texture === "tightly_curly" || h.texture === "coily" ? 0.14 : 0));
  const f = h.color ? { fill: h.color } : {};
  const cy = s.top + s.h / 2;
  const capPts: P[] = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI + (i / 12) * Math.PI;
    return [CX + Math.cos(a) * (s.headRx + vol), cy + Math.sin(a) * (s.h / 2 + vol)] as P;
  });
  const front: El[] = [{ t: "path", c: "hr", d: closedSpline([...capPts, [CX + s.headRx * 0.9, cy - s.h * 0.1], [CX, cy - s.h * 0.32], [CX - s.headRx * 0.9, cy - s.h * 0.1]]), ...f }];
  const back: El[] = [];
  const Y: Record<HairLength, number> = {
    extremely_short: 0, ear: cy + s.h * 0.12, chin: s.chin, neck: s.shoulderY - s.u * 0.05, shoulder: s.shoulderY + s.u * 0.12, chest: s.chestY + s.u * 0.4, mid_back: s.chestY + s.u * 0.95,
    waist: s.waistY, hip: s.hipY + s.u * 0.1, knee: s.kneeY, floor: G - 6,
  };
  const yL = Y[len];
  if (down && yL > cy) {
    for (const side of [-1, 1] as const) {
      const x0 = s.headRx + vol;
      const pts: P[] = [
        [CX + side * x0, cy],
        [CX + side * (x0 + s.u * 0.05), Math.min(yL, s.chin)],
        ...(yL > s.shoulderY ? ([[CX + side * Math.max(x0 * 0.9, s.neck + s.u * 0.42), s.shoulderY + s.u * 0.1]] as P[]) : []),
        [CX + side * Math.max(x0 * 0.85, s.neck + s.u * 0.36), yL],
        [CX + side * Math.max(s.headRx * 0.55, s.neck + s.u * 0.08), yL - 2],
        ...(yL > s.shoulderY ? ([[CX + side * (s.neck + s.u * 0.06), s.shoulderY]] as P[]) : []),
        [CX + side * s.headRx * 0.72, Math.min(yL - 4, s.chin - s.h * 0.1)],
        [CX + side * s.headRx * 0.8, cy - s.h * 0.1],
      ];
      front.push({ t: "path", c: "hr", d: closedSpline(pts), ...f });
      front.push({ t: "path", c: "hs", d: openSpline([[CX + side * (x0 * 0.9), cy], [CX + side * (s.neck + s.u * 0.25), (cy + yL) / 2], [CX + side * (s.neck + s.u * 0.2), yL - 6]]) });
    }
  }
  if (look && "extras" in look)
    for (const e of look.extras as ReadonlyArray<{ k: string }>)
      if (e.k === "bun") back.push({ t: "circle", c: "hr", cx: CX, cy: s.top - s.h * 0.02, r: s.h * 0.16, ...f });
  return { back, front };
};

// ── Assembly ────────────────────────────────────────────────────────────────────────────────
export interface FigureOptions {
  ghost?: boolean; // cards: the body as a faint outline, garments only
  base?: boolean; // draw neutral base clothing where nothing is chosen (default true)
}
export const figureLayers = (b: BodyParams, outfit: Outfit, hair: FigureHair, opt: FigureOptions = {}): Layer[] => {
  const s = skeleton(b);
  const bodyCls = opt.ghost ? "gh" : "k";
  const body: El[] = [];
  const parts = {
    legs: [-1, 1].map((side) => closedSpline(leg(s, side as 1 | -1))),
    feet: [-1, 1].map((side) => closedSpline(foot(s, side as 1 | -1))),
    torso: closedSpline(torso(s)),
    arms: [-1, 1].map((side) => closedSpline(arm(s, side as 1 | -1).pts)),
    hands: [-1, 1].map((side) => closedSpline(hand(s, side as 1 | -1))),
  };
  for (const d of [...parts.feet, ...parts.legs]) body.push({ t: "path", c: bodyCls, d });
  body.push({ t: "path", c: bodyCls, d: neckPath(s) }, { t: "path", c: bodyCls, d: parts.torso });
  for (const d of [...parts.arms, ...parts.hands]) body.push({ t: "path", c: bodyCls, d });
  const hairEls = figureHair(s, hair);
  const head: El[] = [...hairEls.back, { t: "path", c: bodyCls, d: headPath(s) }];

  const clothes: El[] = [];
  const base = opt.base !== false;
  const dress = outfit.dress;
  const fitOf = (f: Fit | null | undefined, dflt: Fit) => f ?? outfit.fit ?? dflt;
  if (dress) {
    const d = dress.type ? DRESS_TYPES[dress.type] ?? {} : {};
    const fit = fitOf(dress.fit ?? d.fit, "regular");
    const waistY = (dress.waist ?? d.waist ?? "natural") === "empire" ? s.chestY + s.u * 0.42 : (dress.waist ?? d.waist) === "drop" ? s.hipY : s.waistY;
    const DH: Record<DressHem, number> = { mini: s.crotchY + s.u * 0.55, above_knee: s.kneeY - s.u * 0.45, knee: s.kneeY + s.u * 0.15, midi: s.kneeY + (s.ankleY - s.kneeY) * 0.55, ankle: s.ankleY, floor: G - 2 };
    if (d.jumpsuit) {
      clothes.push(...pants(s, { fit, rise: "high", legCut: "straight", hem: d.jumpsuit === "short" ? "short" : "full", fill: dress.color }));
      if (d.bib) {
        const w = s.chest * 0.62;
        clothes.push({ t: "path", c: "g", d: `M${pt([CX - w, s.chestY + s.u * 0.05])} L${pt([CX + w, s.chestY + s.u * 0.05])} L${pt([CX + w, s.waistY])} L${pt([CX - w, s.waistY])} Z`, ...(dress.color ? { fill: dress.color } : {}) });
        for (const side of [-1, 1]) clothes.push({ t: "path", c: "gl", d: `M${pt([CX + side * w * 0.8, s.chestY + s.u * 0.05])} L${pt([CX + side * s.shoulder * 0.6, s.shoulderY])}` });
      } else clothes.push(...upper(s, { fit, neckline: dress.neckline ?? d.neckline ?? "crew", sleeveLength: dress.sleeveLength ?? d.sleeveLength ?? "short", sleeveStyle: dress.sleeveStyle ?? "straight", hemY: s.hipY - s.u * 0.1, fill: dress.color }));
      if ((dress.waist ?? d.waist) === "belted") clothes.push(beltEl(s, s.waistY, dress.color));
    } else {
      const hemY = DH[dress.hem ?? d.hem ?? "knee"];
      const shape: SkirtShape = dress.skirt ?? d.skirt ?? "a_line";
      const undefinedWaist = (dress.waist ?? d.waist) === "undefined";
      clothes.push(...skirtEls(s, { shape: undefinedWaist && shape === "a_line" ? "straight" : shape, top: undefinedWaist ? s.chestY + s.u * 0.3 : waistY - 1, hemY, fit, fill: dress.color }));
      clothes.push(
        ...upper(s, {
          fit: (dress.waist ?? d.waist) === "cinched" ? "tight" : fit,
          neckline: dress.neckline ?? d.neckline ?? "crew",
          sleeveLength: dress.sleeveLength ?? d.sleeveLength ?? (dress.sleeveStyle && dress.sleeveStyle !== "straight" ? "long" : "short"),
          sleeveStyle: dress.sleeveStyle ?? "straight",
          hemY: undefinedWaist ? s.chestY + s.u * 0.32 : waistY + 1,
          fill: dress.color,
          ...(d.straps ? { straps: d.straps } : {}),
        }),
      );
      clothes.push({ t: "path", c: "gs", d: `M${pt([CX - s.chest, waistY])} L${pt([CX + s.chest, waistY])}` });
      if ((dress.waist ?? d.waist) === "belted") clothes.push(beltEl(s, waistY, dress.color));
      if ((dress.waist ?? d.waist) === "cinched") clothes.push({ t: "path", c: "gs", d: `M${pt([CX - s.waist * 0.6, waistY + 2])} L${pt([CX - s.waist * 0.7, waistY + s.u * 0.25])} M${pt([CX + s.waist * 0.6, waistY + 2])} L${pt([CX + s.waist * 0.7, waistY + s.u * 0.25])}` });
      if (d.shirt) clothes.push(...collarEls(s, "point", dress.color), ...placket(s, s.shoulderY + s.u * 0.4, waistY, 3));
      if (d.wrap) clothes.push({ t: "path", c: "gl", d: `M${pt([CX - s.neck, s.shoulderY])} Q${pt([CX + s.chest * 0.3, s.chestY + s.u * 0.4])} ${pt([CX + s.waist * 0.9, waistY])}` });
    }
  } else {
    const bottom = outfit.bottom;
    const bt = bottom?.type ? BOTTOM_TYPES[bottom.type] : undefined;
    if (bottom || (base && !outfit.bottomNone)) {
      const fill = bottom?.color ?? null;
      const fit = fitOf(bottom?.fit ?? bt?.fit, bottom ? "regular" : "slim");
      const hem = bottom?.hem ?? bt?.hem ?? (bottom ? "full" : "knee");
      if (bt?.skirt) {
        const rTop = riseY(s, bottom?.rise ?? bt.rise ?? "mid");
        const HH: Record<BottomHem, number> = { short: s.crotchY + s.u * 0.6, knee: s.kneeY + s.u * 0.1, calf: s.kneeY + (s.ankleY - s.kneeY) * 0.55, ankle: s.ankleY - s.u * 0.1, full: s.ankleY };
        clothes.push(...skirtEls(s, { shape: bt.skirt, top: rTop, hemY: HH[hem], fit, fill, ...(bt.pleats ? { pleats: true } : {}), ...(bt.wrap ? { wrap: true } : {}) }));
      } else
        clothes.push(...pants(s, { fit, rise: bottom?.rise ?? bt?.rise ?? "mid", legCut: bottom?.legCut ?? bt?.legCut ?? "straight", hem, fill, ...(bt ? { detail: bt } : {}) }));
    }
    const top = outfit.top;
    const tt = top?.type ? TOP_TYPES[top.type] : undefined;
    if (top || (base && !outfit.topNone)) {
      const fill = top?.color ?? null;
      const fit = fitOf(top?.fit ?? tt?.fit, top ? "regular" : "slim");
      const hemY = topY(s, top?.length ?? tt?.length ?? "hip");
      const collar = top?.collar ?? tt?.collar ?? "none";
      const neckline = top?.neckline ?? tt?.neckline ?? (collar !== "none" ? "v_neck" : "crew");
      const sleeveStyle = top?.sleeveStyle ?? tt?.sleeveStyle ?? "straight";
      // a sleeve style is only visible on a long sleeve: that is the neutral length when none is chosen
      const sleeveLength = top?.sleeveLength ?? tt?.sleeveLength ?? (top?.sleeveStyle && top.sleeveStyle !== "straight" ? "long" : "short");
      clothes.push(...upper(s, { fit, neckline: collar !== "none" && !top?.neckline ? "crew" : neckline, sleeveLength, sleeveStyle, hemY, fill, ...(tt?.straps ? { straps: tt.straps } : {}) }));
      const tShape = closedSpline(torso(s, EASE[fit] * s.u, 0.55));
      if (tt?.knit) clothes.push({ t: "clip", d: tShape, children: [-0.5, -0.17, 0.17, 0.5].map((k) => ({ t: "path", c: "gs", d: `M${pt([CX + k * s.chest, s.shoulderY + s.u * 0.4])} L${pt([CX + k * s.chest, hemY - s.u * 0.2])}` }) as El) });
      if (tt?.pocket) clothes.push({ t: "path", c: "gl", d: `M${pt([CX - s.chest * 0.62, s.chestY])} h${s.u * 0.3} v${s.u * 0.32} h${-s.u * 0.3} Z` });
      if (tt?.cuffs)
        for (const side of [-1, 1] as const) {
          const a = arm(s, side, EASE[fit] * s.u, sleeveStyle, 0.98);
          const c = a.axis(0.9);
          clothes.push({ t: "clip", d: closedSpline(a.pts), children: [{ t: "path", c: "gs", d: `M${pt([c[0] - a.dir[1] * s.u, c[1] + a.dir[0] * s.u * side])} L${pt([c[0] + a.dir[1] * s.u, c[1] - a.dir[0] * s.u * side])}` }] });
        }
      if (tt?.peplum) clothes.push(...skirtEls(s, { shape: "flared", top: s.waistY, hemY: s.hipY + s.u * 0.1, fit: "slim", fill }));
      if (tt?.rib) clothes.push({ t: "clip", d: tShape, children: [{ t: "path", c: "gs", d: `M-400 ${hemY - s.u * 0.14} L600 ${hemY - s.u * 0.14}` }] });
      if (tt?.placket) clothes.push(...placket(s, s.shoulderY + s.u * 0.12, tt.placket > 4 ? hemY - s.u * 0.2 : s.shoulderY + s.u * (0.2 + tt.placket * 0.16), tt.placket));
      if (tt?.graphic) clothes.push({ t: "path", c: "gs", d: `M${pt([CX - s.u * 0.32, s.chestY])} h${s.u * 0.64} v${s.u * 0.45} h${-s.u * 0.64} Z` });
      if (tt?.wrap) clothes.push({ t: "path", c: "gl", d: `M${pt([CX - s.neck, s.shoulderY])} Q${pt([CX + s.chest * 0.3, s.chestY + s.u * 0.4])} ${pt([CX + s.waist, hemY - 2])}` });
      if (tt?.hood) clothes.push({ t: "path", c: "g", d: `M${pt([CX - s.neck * 1.9, s.shoulderY + 2])} Q${pt([CX - s.neck * 2.2, s.chin - s.u * 0.1])} ${pt([CX - s.neck * 1.2, s.chin - s.u * 0.05])} L${pt([CX + s.neck * 1.2, s.chin - s.u * 0.05])} Q${pt([CX + s.neck * 2.2, s.chin - s.u * 0.1])} ${pt([CX + s.neck * 1.9, s.shoulderY + 2])} Q${pt([CX, s.shoulderY + s.u * 0.35])} ${pt([CX - s.neck * 1.9, s.shoulderY + 2])} Z`, ...(fill ? { fill } : {}) }, { t: "path", c: "gl", d: `M${pt([CX - s.u * 0.34, s.waistY + s.u * 0.2])} L${pt([CX + s.u * 0.34, s.waistY + s.u * 0.2])} L${pt([CX + s.u * 0.42, hemY - s.u * 0.2])} L${pt([CX - s.u * 0.42, hemY - s.u * 0.2])} Z` });
      if (collar !== "none") clothes.push(...collarEls(s, collar, fill));
    }
  }
  return [
    { id: "body", els: [...head.slice(0, -1), ...body, head[head.length - 1]!] },
    { id: "clothes", els: clothes },
    { id: "hair", els: hairEls.front },
  ];
};
const beltEl = (s: Skeleton, y: number, fill: string | null): El => ({ t: "path", c: "gl", d: `M${pt([CX - s.waist * 1.1, y - s.u * 0.06])} L${pt([CX + s.waist * 1.1, y - s.u * 0.06])} M${pt([CX - s.waist * 1.1, y + s.u * 0.06])} L${pt([CX + s.waist * 1.1, y + s.u * 0.06])}`, ...(fill ? {} : {}) });
const placket = (s: Skeleton, y0: number, y1: number, n: number): El[] => {
  const els: El[] = [{ t: "path", c: "gs", d: `M${pt([CX, y0])} L${pt([CX, y1])}` }];
  for (let i = 0; i < n; i++) els.push({ t: "circle", c: "gl", cx: CX + 1.6, cy: Math.round((y0 + s.u * 0.08 + ((y1 - y0 - s.u * 0.1) * i) / Math.max(1, n - 1)) * 10) / 10, r: 0.9 });
  return els;
};

// ── Crops (from the neutral skeleton) ───────────────────────────────────────────────────────
const N = skeleton(neutralBody());
const crop = (y0: number, y1: number, cx = CX): Box => {
  const h = y1 - y0;
  const w = (h * 4) / 3;
  return [Math.round((cx - w / 2) * 10) / 10, Math.round(y0 * 10) / 10, Math.round(w * 10) / 10, Math.round(h * 10) / 10];
};
export const FIG_CROPS = {
  full: crop(2, 398),
  body: crop(N.chin - N.u * 0.25, N.kneeY + N.u * 0.25),
  figure: crop(N.top - 4, N.ankleY + N.u * 0.05),
  upper: crop(N.chin - N.u * 0.3, N.chestY + N.u * 0.9),
  shoulders: crop(N.top + N.h * 0.5, N.chestY + N.u * 0.7),
  torso: crop(N.shoulderY - N.u * 0.5, N.crotchY + N.u * 0.9),
  topArms: crop(N.chin - N.u * 0.2, N.crotchY + N.u * 0.8),
  lower: crop(N.waistY - N.u * 0.3, G + 4),
  legs: crop(N.crotchY - N.u * 0.4, G + 4),
} as const satisfies Record<string, Box>;
