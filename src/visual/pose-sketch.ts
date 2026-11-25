/**
 * Pose sketch (Sprint 2-D.4) — a neutral jointed mannequin (capsule limbs, joint dots, a construction-line
 * head) posed with simple joint angles and drawn with a light 3D projection (body / camera yaw and pitch,
 * optional perspective). Used by the pose cards, the Figure Builder's pose view and the camera scene.
 * Not a 3D pose editor: every pose is a small preset of angles. Pure, deterministic, erasable TS only.
 *
 * Axes: x → the viewer's right when the person faces the camera (the PERSON's left), y ↓, z → the camera.
 */
import { neutralBody, skeleton, type BodyParams } from "./figure-sketch.ts";
import { closedSpline, pt, r1, type El, type P } from "./sketch-core.ts";

export type Posture = "standing" | "sitting" | "lying_down" | "reclining" | "kneeling" | "crouching" | "squatting";
export type Orientation = "front" | "left" | "right" | "rear" | "three_quarter";
export type Gaze = "camera" | "left" | "right" | "up" | "down" | "distance" | "away";
export interface PoseParams {
  posture: Posture | null;
  orientation: Orientation | null;
  torsoRotation: "left" | "neutral" | "right" | null;
  lean: "forward" | "upright" | "backward" | "sideways" | null;
  weight: "even" | "left_leg" | "right_leg" | null;
  headDirection: "forward" | "left" | "right" | "up" | "down" | null;
  headTilt: "left" | "upright" | "right" | null;
  chin: "lowered" | "neutral" | "raised" | null;
  gaze: Gaze | null;
  arms: "relaxed" | "crossed" | "raised" | "outstretched" | "behind_back" | null;
  elbows: "straight" | "slightly_bent" | "bent" | null;
  hands: "at_sides" | "on_hips" | "in_pockets" | "near_face" | "behind_head" | "behind_back" | "on_lap" | null;
  legs: "together" | "apart" | "crossed" | "one_bent" | "one_raised" | null;
  knees: "straight" | "slightly_bent" | "bent" | null;
  feet: "forward" | "inward" | "outward" | null;
  action: Action | null;
}
export const ACTIONS = ["walking", "running", "jumping", "dancing", "stretching", "turning", "reaching", "waving", "sitting_down", "standing_up", "reading", "writing"] as const;
export type Action = (typeof ACTIONS)[number];
export const neutralPose = (): PoseParams => ({
  posture: null, orientation: null, torsoRotation: null, lean: null, weight: null, headDirection: null, headTilt: null, chin: null, gaze: null,
  arms: null, elbows: null, hands: null, legs: null, knees: null, feet: null, action: null,
});
export const poseIsEmpty = (p: PoseParams): boolean => Object.values(p).every((v) => v === null);

// ── Joint-angle model ───────────────────────────────────────────────────────────────────────
type V = [number, number, number];
/** A limb: [flex, abduction] in degrees for the upper and the lower segment (absolute, in the body frame). */
interface Limb {
  u: [number, number];
  l: [number, number];
}
interface Def {
  arms: [Limb, Limb]; // [right (side −1), left (side +1)] — the PERSON's right / left
  legs: [Limb, Limb];
  lean: number;
  side: number;
  twist: number;
  hipRoll: number;
  head: [number, number, number]; // yaw (to the person's left +), pitch (up +), roll
  yaw: number; // whole body (to the person's left +)
  roll: number; // whole body, around the viewing axis (lying down)
  seat: boolean;
  lift: number; // in the air (× body unit)
  toe: number; // foot turn-out
  prop?: "book" | "desk";
  eyes: [number, number];
}
const limb = (u: [number, number], l: [number, number]): Limb => ({ u, l });
const RELAXED_ARM = limb([2, 8], [6, 6]);
const STRAIGHT_LEG = limb([0, 3], [0, 2]);

export const poseDef = (p: PoseParams): Def => {
  const d: Def = { arms: [RELAXED_ARM, RELAXED_ARM], legs: [STRAIGHT_LEG, STRAIGHT_LEG], lean: 0, side: 0, twist: 0, hipRoll: 0, head: [0, 0, 0], yaw: 0, roll: 0, seat: false, lift: 0, toe: 8, eyes: [0, 0] };
  const both = (a: Limb) => [a, a] as [Limb, Limb];
  switch (p.posture) {
    case "sitting":
      d.legs = both(limb([88, 6], [0, 4]));
      d.arms = both(limb([14, 8], [70, -6]));
      d.seat = true;
      break;
    case "reclining":
      d.legs = both(limb([80, 6], [10, 4]));
      d.lean = -42;
      d.arms = both(limb([-10, 22], [-5, 18]));
      d.seat = true;
      break;
    case "lying_down":
      d.roll = -90;
      break;
    case "kneeling":
      d.legs = both(limb([0, 5], [-90, 4]));
      break;
    case "crouching":
      d.legs = both(limb([115, 12], [-25, 6]));
      d.lean = 32;
      d.arms = both(limb([40, 14], [55, 6]));
      break;
    case "squatting":
      d.legs = both(limb([100, 28], [-8, 12]));
      d.lean = 14;
      d.arms = both(limb([62, 12], [70, 4]));
      break;
  }
  switch (p.action) {
    case "walking":
      d.legs = [limb([24, 3], [6, 2]), limb([-18, 3], [-38, 2])];
      d.arms = [limb([-18, 7], [-8, 6]), limb([22, 7], [40, 6])];
      break;
    case "running":
      d.lean = 12;
      d.legs = [limb([55, 3], [-30, 2]), limb([-28, 3], [-95, 2])];
      d.arms = [limb([-35, 8], [55, 4]), limb([45, 8], [110, 4])];
      break;
    case "jumping":
      d.legs = both(limb([45, 8], [-40, 5]));
      d.arms = both(limb([150, 30], [165, 22]));
      d.lift = 0.7;
      break;
    case "dancing":
      d.arms = [limb([0, 85], [0, 95]), limb([165, 25], [170, 30])];
      d.legs = [STRAIGHT_LEG, limb([30, 15], [-55, 5])];
      d.side = 8;
      break;
    case "stretching":
      d.arms = both(limb([178, 10], [180, 4]));
      d.legs = both(limb([0, 10], [0, 8]));
      break;
    case "turning":
      d.yaw = 40;
      d.twist = 30;
      d.legs = [STRAIGHT_LEG, limb([10, 6], [-15, 4])];
      break;
    case "reaching":
      d.arms = [RELAXED_ARM, limb([125, 8], [130, 6])];
      d.lean = 6;
      break;
    case "waving":
      d.arms = [RELAXED_ARM, limb([0, 72], [175, 10])];
      break;
    case "sitting_down":
      d.legs = both(limb([55, 6], [-12, 4]));
      d.lean = 22;
      d.arms = both(limb([30, 10], [35, 6]));
      break;
    case "standing_up":
      d.legs = both(limb([40, 6], [-6, 4]));
      d.lean = 34;
      d.arms = both(limb([50, 10], [60, 6]));
      break;
    case "reading":
      d.arms = both(limb([12, 10], [78, -18]));
      d.head = [0, -22, 0];
      d.prop = "book";
      break;
    case "writing":
      d.legs = both(limb([88, 6], [0, 4]));
      d.seat = true;
      d.arms = [limb([22, 8], [85, -4]), limb([22, 8], [85, -10])];
      d.head = [0, -24, 0];
      d.prop = "desk";
      break;
  }
  if (p.orientation) d.yaw += { front: 0, left: 90, right: -90, rear: 180, three_quarter: -38 }[p.orientation];
  if (p.torsoRotation) d.twist += { left: 32, neutral: 0, right: -32 }[p.torsoRotation];
  if (p.lean) {
    if (p.lean === "forward") d.lean += 26;
    if (p.lean === "backward") d.lean -= 20;
    if (p.lean === "sideways") d.side += 16;
  }
  if (p.weight === "left_leg" || p.weight === "right_leg") {
    const s = p.weight === "left_leg" ? 1 : -1;
    d.hipRoll = s * 7;
    d.side -= s * 4;
    const free = s === 1 ? 0 : 1;
    d.legs[free] = limb([8, 2], [-14, 2]);
  }
  if (p.arms) {
    const a: Record<NonNullable<PoseParams["arms"]>, [Limb, Limb]> = {
      relaxed: both(RELAXED_ARM),
      crossed: both(limb([38, 22], [88, -78])),
      raised: both(limb([176, 16], [178, 10])),
      outstretched: both(limb([0, 88], [0, 90])),
      behind_back: both(limb([-28, 6], [-50, -40])),
    };
    d.arms = a[p.arms];
  }
  if (p.hands) {
    const h: Record<NonNullable<PoseParams["hands"]>, [Limb, Limb]> = {
      at_sides: both(RELAXED_ARM),
      on_hips: both(limb([-4, 42], [6, -62])),
      in_pockets: both(limb([4, 14], [28, -18])),
      near_face: [RELAXED_ARM, limb([28, 20], [150, -42])],
      behind_head: both(limb([100, 78], [168, -70])),
      behind_back: both(limb([-28, 6], [-50, -40])),
      on_lap: both(limb([14, 8], [70, -6])),
    };
    d.arms = h[p.hands];
  }
  if (p.elbows) {
    const bend = { straight: 0, slightly_bent: 26, bent: 82 }[p.elbows];
    d.arms = d.arms.map((a) => ({ u: a.u, l: [a.u[0] + bend, a.l[1]] as [number, number] })) as [Limb, Limb];
  }
  if (p.legs) {
    const L: Record<NonNullable<PoseParams["legs"]>, [Limb, Limb]> = {
      together: both(limb([0, 0.5], [0, 0])),
      apart: both(limb([0, 13], [0, 11])),
      crossed: [limb([4, -13], [0, -11]), STRAIGHT_LEG],
      one_bent: [STRAIGHT_LEG, limb([42, 8], [-62, 3])],
      one_raised: [STRAIGHT_LEG, limb([82, 6], [12, 3])],
    };
    d.legs = L[p.legs];
  }
  if (p.knees && p.knees !== "straight") {
    const k = p.knees === "bent" ? 40 : 16;
    d.legs = d.legs.map((g) => ({ u: [g.u[0] + k * 0.7, g.u[1]], l: [g.l[0] - k, g.l[1]] })) as [Limb, Limb];
  }
  if (p.feet) d.toe = { forward: 8, inward: -16, outward: 34 }[p.feet];
  if (p.headDirection) {
    const [y, x] = { forward: [0, 0], left: [42, 0], right: [-42, 0], up: [0, 26], down: [0, -26] }[p.headDirection];
    d.head = [d.head[0] + y!, d.head[1] + x!, d.head[2]];
  }
  if (p.headTilt) d.head[2] += { left: 16, upright: 0, right: -16 }[p.headTilt];
  if (p.chin) d.head[1] += { lowered: -13, neutral: 0, raised: 13 }[p.chin];
  if (p.gaze) d.eyes = { camera: [0, 0], left: [0.8, 0], right: [-0.8, 0], up: [0, -0.8], down: [0, 0.8], distance: [0, -0.35], away: [0.7, 0.6] }[p.gaze] as [number, number];
  return d;
};

// ── Vector helpers ──────────────────────────────────────────────────────────────────────────
const R = Math.PI / 180;
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V): V => mul(a, 1 / (Math.hypot(...a) || 1));
/** Rotate v around a unit axis by deg (Rodrigues). */
const rot = (v: V, axis: V, deg: number): V => {
  const c = Math.cos(deg * R);
  const s = Math.sin(deg * R);
  return add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c)));
};
const limbDir = (f: number, a: number, side: number): [number, number, number] => [side * Math.sin(a * R) * Math.cos(f * R), Math.cos(a * R) * Math.cos(f * R), Math.sin(f * R)];

// ── Mannequin in 3D ─────────────────────────────────────────────────────────────────────────
export interface Prim {
  kind: "capsule" | "sphere" | "poly" | "line";
  pts: V[];
  r: number[];
  cls: string;
  fill?: string;
  head?: { f: V; u: V; r: V; eyes: [number, number] };
  /** Always behind the figure (the seat it rests on). */
  behind?: boolean;
}
export interface Mannequin {
  prims: Prim[];
  ground: number; // y of the floor
  bounds: { top: V; feet: V; centre: V; eyes: V; chest: V; waist: V; knee: V };
  unit: number;
}
export const mannequin = (body: BodyParams, pose: PoseParams, colors: { top?: string | null; bottom?: string | null } = {}): Mannequin => {
  const s = skeleton(body);
  const d = poseDef(pose);
  const u = s.u;
  const torsoLen = s.crotchY - s.shoulderY - u * 0.2;
  const neckLen = s.shoulderY - s.chin;
  const hipJ = s.hipJ * 0.95;
  const upArm = s.armLen * 0.47;
  const foreArm = s.armLen * 0.53;
  const thighL = s.kneeY - s.crotchY + u * 0.2;
  const shinL = s.ankleY - s.kneeY;
  const P: V = [0, 0, 0];
  // torso frame
  const up = norm([Math.sin(d.side * R) * Math.cos(d.lean * R), -Math.cos(d.side * R) * Math.cos(d.lean * R), Math.sin(d.lean * R)]);
  let rt = norm(rot([1, 0, 0], up, d.twist));
  rt = norm(add(rt, mul(up, -dot(rt, up))));
  const fw = cross(up, rt);
  const toWorld = (v: [number, number, number]): V => add(add(mul(rt, v[0]), mul(up, -v[1])), mul(fw, v[2]));
  const neckBase = add(P, mul(up, torsoLen));
  const sh = (side: number): V => add(add(neckBase, mul(rt, side * (s.shoulder - s.upperArm * 0.5))), mul(up, -u * 0.12));
  const prims: Prim[] = [];
  const top = colors.top ?? undefined;
  const bottom = colors.bottom ?? undefined;
  // legs (pelvis frame, hip roll)
  const hipUp = norm([Math.sin(d.hipRoll * R), -Math.cos(d.hipRoll * R), 0]);
  const hipRt: V = norm([Math.cos(d.hipRoll * R), Math.sin(d.hipRoll * R), 0]);
  const feet: V[] = [];
  let kneeY = 0;
  [-1, 1].forEach((side, i) => {
    const L = d.legs[i]!;
    const hip = add(P, add(mul(hipRt, side * hipJ), mul(hipUp, -u * 0.05)));
    const knee = add(hip, mul(limbDir(L.u[0], L.u[1], side), thighL));
    const ankle = add(knee, mul(limbDir(L.l[0], L.l[1], side), shinL));
    const toeDir = norm(rot([0, 0, 1], [0, 1, 0], side * d.toe));
    const toe = add(add(ankle, mul(toeDir, s.foot * 0.75)), [0, u * 0.08, 0]);
    prims.push({ kind: "capsule", pts: [hip, knee], r: [s.thigh * 0.85, s.knee], cls: "k", ...(bottom ? { fill: bottom } : {}) });
    prims.push({ kind: "capsule", pts: [knee, ankle], r: [s.calf * 0.95, s.ankle], cls: "k", ...(bottom ? { fill: bottom } : {}) });
    prims.push({ kind: "capsule", pts: [add(ankle, [0, u * 0.06, 0]), toe], r: [s.ankle * 1.1, s.ankle * 0.9], cls: "k" });
    prims.push({ kind: "sphere", pts: [knee], r: [s.knee * 0.45], cls: "jt" });
    feet.push(ankle, toe);
    kneeY += knee[1] / 2;
  });
  // torso: hull of cross-sections (shoulders, chest, waist in the torso frame; hips in the pelvis frame)
  const ring = (c: V, ax: V, az: V, wx: number, wz: number): V[] => Array.from({ length: 12 }, (_, k) => add(c, add(mul(ax, Math.cos((k / 12) * 2 * Math.PI) * wx), mul(az, Math.sin((k / 12) * 2 * Math.PI) * wz))));
  const torsoPts = [
    ...ring(add(neckBase, mul(up, -u * 0.18)), rt, fw, s.shoulder * 0.98, u * 0.34),
    ...ring(add(P, mul(up, torsoLen * 0.66)), rt, fw, s.chest, u * 0.4),
    ...ring(add(P, mul(up, torsoLen * 0.3)), rt, fw, s.waist, u * 0.36),
    ...ring(add(P, [0, -u * 0.02, 0]), hipRt, [0, 0, 1], s.hip, u * 0.4),
  ];
  prims.push({ kind: "poly", pts: torsoPts, r: [], cls: "k", ...(top ? { fill: top } : {}) });
  // neck and head (head frame: yaw, pitch, roll)
  const neckTop = add(neckBase, mul(up, neckLen * 0.95));
  prims.push({ kind: "capsule", pts: [neckBase, neckTop], r: [s.neck, s.neck * 0.95], cls: "k" });
  let hf = rot(fw, up, d.head[0]);
  let hr = rot(rt, up, d.head[0]);
  let hu = up;
  hf = rot(hf, hr, -d.head[1]);
  hu = rot(hu, hr, -d.head[1]);
  hu = rot(hu, hf, d.head[2]);
  hr = rot(hr, hf, d.head[2]);
  const headR = s.h * 0.45;
  const head = add(neckTop, mul(hu, headR * 0.95));
  // arms
  [-1, 1].forEach((side, i) => {
    const A = d.arms[i]!;
    const S = sh(side);
    const E = add(S, toWorld(mul(limbDir(A.u[0], A.u[1], side) as V, upArm) as [number, number, number]));
    const W = add(E, toWorld(mul(limbDir(A.l[0], A.l[1], side) as V, foreArm) as [number, number, number]));
    const H = add(W, toWorld(mul(limbDir(A.l[0], A.l[1], side) as V, s.hand * 0.42) as [number, number, number]));
    prims.push({ kind: "capsule", pts: [S, E], r: [s.upperArm, s.forearm * 1.02], cls: "k", ...(top ? { fill: top } : {}) });
    prims.push({ kind: "capsule", pts: [E, W], r: [s.forearm, s.wrist], cls: "k" });
    prims.push({ kind: "sphere", pts: [H], r: [s.wrist * 1.5], cls: "k" });
    prims.push({ kind: "sphere", pts: [S], r: [s.upperArm * 0.5], cls: "jt" }, { kind: "sphere", pts: [E], r: [s.forearm * 0.55], cls: "jt" });
  });
  prims.push({ kind: "sphere", pts: [head], r: [headR], cls: "k", head: { f: hf, u: hu, r: hr, eyes: d.eyes } });
  if (d.prop === "book") {
    const c = add(P, add(mul(up, torsoLen * 0.72), mul(fw, u * 0.95)));
    prims.push({ kind: "poly", pts: [add(c, add(mul(rt, -u * 0.42), mul(up, u * 0.3))), add(c, add(mul(rt, u * 0.42), mul(up, u * 0.3))), add(c, add(mul(rt, u * 0.42), mul(up, -u * 0.3))), add(c, add(mul(rt, -u * 0.42), mul(up, -u * 0.3)))], r: [], cls: "pr" });
  }
  // whole-body yaw / roll around the pelvis, then rest on the floor
  const all = (f: (v: V) => V) => prims.forEach((q) => (q.pts = q.pts.map(f)));
  const apply = (v: V) => rot(rot(v, [0, 1, 0], d.yaw), [0, 0, 1], d.roll);
  all(apply);
  const headWorld = apply(head);
  const feetWorld = feet.map(apply);
  const lowest = Math.max(...prims.flatMap((q) => q.pts.map((v, k) => v[1] + (q.r[k] ?? q.r[0] ?? 0))));
  const seatH = d.seat ? lowest : 0;
  let ground = lowest + (d.lift ? d.lift * u : 0);
  if (d.seat) {
    // the seat carries the pelvis; the feet stand on the floor below
    const feetLow = Math.max(...feetWorld.map((v) => v[1])) + s.ankle;
    ground = feetLow;
    const seatTop = apply([0, s.hip * 0.35 + u * 0.12, 0])[1];
    const c = apply([0, 0, -u * 0.25]);
    const w = s.hip * 1.4;
    // a simple stool: a thin seat and two legs (always behind the figure)
    const slab = (y0: number, y1: number): V[] => [[c[0] - w, y0, c[2] - u * 0.6], [c[0] + w, y0, c[2] - u * 0.6], [c[0] + w, y0, c[2] + u * 0.6], [c[0] - w, y0, c[2] + u * 0.6], [c[0] - w, y1, c[2] - u * 0.6], [c[0] + w, y1, c[2] - u * 0.6], [c[0] + w, y1, c[2] + u * 0.6], [c[0] - w, y1, c[2] + u * 0.6]];
    prims.unshift(
      { kind: "poly", behind: true, pts: slab(seatTop, seatTop + u * 0.22), r: [], cls: "pr" },
      { kind: "capsule", behind: true, pts: [[c[0] - w * 0.8, seatTop + u * 0.2, c[2]], [c[0] - w * 0.8, ground, c[2]]], r: [u * 0.07, u * 0.07], cls: "pr" },
      { kind: "capsule", behind: true, pts: [[c[0] + w * 0.8, seatTop + u * 0.2, c[2]], [c[0] + w * 0.8, ground, c[2]]], r: [u * 0.07, u * 0.07], cls: "pr" },
    );
    if (d.prop === "desk") {
      const dz = apply([0, 0, u * 1.6]);
      const dy = seatTop - u * 1.1;
      prims.push({ kind: "poly", pts: [[dz[0] - w * 1.6, dy, dz[2] - u * 0.7], [dz[0] + w * 1.6, dy, dz[2] - u * 0.7], [dz[0] + w * 1.6, dy, dz[2] + u * 0.7], [dz[0] - w * 1.6, dy, dz[2] + u * 0.7], [dz[0] - w * 1.6, dy + u * 0.12, dz[2] - u * 0.7], [dz[0] + w * 1.6, dy + u * 0.12, dz[2] + u * 0.7]], r: [], cls: "pr" });
    }
    void seatH;
  }
  const minY = Math.min(...prims.flatMap((q) => q.pts.map((v, k) => v[1] - (q.r[k] ?? q.r[0] ?? 0))));
  return {
    prims,
    ground,
    unit: u,
    bounds: {
      top: [headWorld[0], minY, headWorld[2]],
      feet: [0, ground, 0],
      centre: [0, (minY + ground) / 2, 0],
      eyes: add(headWorld, mul(apply(hu), -headR * 0.05)),
      chest: apply(add(P, mul(up, torsoLen * 0.6))),
      waist: apply(add(P, mul(up, torsoLen * 0.25))),
      knee: [0, apply([0, kneeY, 0])[1], 0],
    },
  };
};

// ── Projection and drawing ──────────────────────────────────────────────────────────────────
export interface View {
  yaw: number; // camera around the subject (to the person's left +)
  pitch: number; // camera above (+) / below (−)
  focal: number | null; // perspective strength (smaller = stronger); null = orthographic
  target: V; // point the camera looks at (world)
  scale: number;
  at: P; // where the target lands on the canvas
  roll?: number;
  fisheye?: number;
}
export const project = (v: V, view: View): { p: P; z: number; k: number } => {
  let w: V = [v[0] - view.target[0], v[1] - view.target[1], v[2] - view.target[2]];
  w = rot(w, [0, 1, 0], -view.yaw);
  w = rot(w, [1, 0, 0], view.pitch);
  const k = view.focal ? view.focal / Math.max(view.focal * 0.15, view.focal - w[2]) : 1;
  let x = w[0] * k * view.scale;
  let y = w[1] * k * view.scale;
  if (view.fisheye) {
    const rr = Math.hypot(x, y);
    const f = 1 / (1 + view.fisheye * (rr / 100) ** 2);
    x *= f;
    y *= f;
  }
  if (view.roll) {
    const c = Math.cos(view.roll * R);
    const sn = Math.sin(view.roll * R);
    [x, y] = [x * c - y * sn, x * sn + y * c];
  }
  return { p: [view.at[0] + x, view.at[1] + y], z: w[2], k: k * view.scale };
};
const hull = (pts: P[]): P[] => {
  const ps = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const crossP = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P[] = [];
  for (const p of ps) {
    while (lower.length >= 2 && crossP(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: P[] = [];
  for (const p of ps.slice().reverse()) {
    while (upper.length >= 2 && crossP(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
};
const capsule = (a: P, b: P, ra: number, rb: number): string => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 0.6) return circleD(a, Math.max(ra, rb));
  const nx = -dy / len;
  const ny = dx / len;
  return `M${pt([a[0] + nx * ra, a[1] + ny * ra])} L${pt([b[0] + nx * rb, b[1] + ny * rb])} A${r1(rb)} ${r1(rb)} 0 0 1 ${pt([b[0] - nx * rb, b[1] - ny * rb])} L${pt([a[0] - nx * ra, a[1] - ny * ra])} A${r1(ra)} ${r1(ra)} 0 0 1 ${pt([a[0] + nx * ra, a[1] + ny * ra])} Z`;
};
const circleD = (c: P, r: number): string => `M${pt([c[0] - r, c[1]])} A${r1(r)} ${r1(r)} 0 1 0 ${pt([c[0] + r, c[1]])} A${r1(r)} ${r1(r)} 0 1 0 ${pt([c[0] - r, c[1]])} Z`;

/** Mannequin limbs are a little fuller than the figure's measurements, so poses read at card size. */
const LIMB = 1.35;
/** Draw a posed mannequin under a view: farthest parts first. */
export const drawMannequin = (m: Mannequin, view: View, opts: { cls?: string; shadow?: boolean } = {}): El[] => {
  const out: Array<{ z: number; els: El[] }> = [];
  if (opts.shadow !== false) {
    // a soft floor shadow under the figure
    const g = project([0, m.ground, 0], view);
    const gx = project([m.unit * 1.2, m.ground, 0], view);
    const gz = project([0, m.ground, m.unit * 0.8], view);
    const rx = Math.max(4, Math.hypot(gx.p[0] - g.p[0], gx.p[1] - g.p[1]));
    const ry = Math.max(1.5, Math.abs(gz.p[1] - g.p[1]) + 1.5);
    out.push({ z: -1e9, els: [{ t: "path", c: "shd", d: `M${pt([g.p[0] - rx, g.p[1]])} A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([g.p[0] + rx, g.p[1]])} A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([g.p[0] - rx, g.p[1]])} Z` }] });
  }
  for (const q of m.prims) {
    const pr = q.pts.map((v) => project(v, view));
    const z = pr.reduce((a, b) => a + b.z, 0) / pr.length;
    const cls = opts.cls && q.cls === "k" ? opts.cls : q.cls;
    const fill = q.fill ? { fill: q.fill } : {};
    if (q.kind === "capsule") out.push({ z: q.behind ? -1e8 : z, els: [{ t: "path", c: cls, d: capsule(pr[0]!.p, pr[1]!.p, q.r[0]! * pr[0]!.k * (q.behind ? 1 : LIMB), q.r[1]! * pr[1]!.k * (q.behind ? 1 : LIMB)), ...fill }] });
    else if (q.kind === "poly") out.push({ z: q.behind ? -1e8 : z, els: [{ t: "path", c: cls, d: closedSpline(hull(pr.map((x) => x.p))), ...fill }] });
    else if (q.kind === "sphere" && !q.head) out.push({ z: z + 0.01, els: [{ t: "path", c: cls, d: circleD(pr[0]!.p, q.r[0]! * pr[0]!.k) }] });
    else if (q.head) {
      const c = q.pts[0]!;
      const r = q.r[0]!;
      const els: El[] = [{ t: "path", c: cls, d: circleD(pr[0]!.p, r * pr[0]!.k) }];
      const H = q.head;
      // construction lines: the face's centre line and eye line (visible half only), nose and eyes
      const arc = (a: V, b: V, lat = 0): string => {
        const pts: P[] = [];
        for (let i = 0; i <= 24; i++) {
          const t = -Math.PI / 2 + (i / 24) * Math.PI;
          const v = add(c, add(mul(a, Math.cos(t) * r * Math.cos(lat)), add(mul(b, Math.sin(t) * r * Math.cos(lat)), mul(H.u, -Math.sin(lat) * r * 0))));
          const w = project(v, view);
          if (w.z - project(c, view).z > -0.5) pts.push(w.p);
        }
        return pts.length > 1 ? `M${pts.map(pt).join(" L")}` : "";
      };
      const centre = arc(H.f, mul(H.u, -1));
      const eyeLine = arc(H.f, H.r);
      if (centre) els.push({ t: "path", c: "s", d: centre });
      if (eyeLine) els.push({ t: "path", c: "s", d: eyeLine });
      const front = add(c, mul(H.f, r));
      const fz = project(front, view).z - project(c, view).z;
      if (fz > 0) {
        // nose wedge: shows where the face points, also in side views
        const tip = project(add(add(c, mul(H.f, r * 1.32)), mul(H.u, -r * 0.3)), view).p;
        const nb = project(add(add(c, mul(H.f, r * 0.98)), mul(H.u, -r * 0.02)), view).p;
        const nb2 = project(add(add(c, mul(H.f, r * 0.97)), mul(H.u, -r * 0.42)), view).p;
        els.push({ t: "path", c: "k", d: `M${pt(nb)} L${pt(tip)} L${pt(nb2)} Z` });
        for (const sd of [-1, 1]) {
          const e = add(add(c, mul(norm(add(mul(H.f, Math.cos(0.5)), mul(H.r, sd * Math.sin(0.5)))), r * 0.97)), mul(H.u, r * 0.08));
          const ep = project(e, view);
          if (ep.z - project(c, view).z > 0) {
            const off: P = [H.eyes[0] * r * 0.09 * pr[0]!.k, H.eyes[1] * r * 0.07 * pr[0]!.k];
            els.push({ t: "circle", c: "p", cx: r1(ep.p[0] + off[0]), cy: r1(ep.p[1] + off[1]), r: r1(Math.max(0.7, r * 0.09 * pr[0]!.k)) });
          }
        }
      }
      out.push({ z: z + 0.02, els });
    }
  }
  out.sort((a, b) => a.z - b.z);
  return out.flatMap((o) => o.els);
};

/** A posed mannequin alone (pose cards, Figure Builder pose view): fits the figure into box `[x, y, w, h]`. */
export const POSE_BOX = [0, 0, 200, 250] as const;
export const poseLayers = (
  body: BodyParams,
  pose: PoseParams,
  opts: { yaw?: number; pitch?: number; colors?: { top?: string | null; bottom?: string | null }; box?: readonly [number, number, number, number]; zoom?: "head" } = {},
) => {
  const m = mannequin(body, pose, opts.colors ?? {});
  const [bx, by, bw, bh] = opts.box ?? POSE_BOX;
  const base: View = { yaw: opts.yaw ?? 0, pitch: opts.pitch ?? 6, focal: null, target: [0, 0, 0], scale: 1, at: [0, 0] };
  const all = m.prims.flatMap((q) => q.pts.map((v, k) => ({ p: project(v, base).p, r: q.r[k] ?? q.r[0] ?? 0 })));
  const g = project([0, m.ground, 0], base).p;
  const xs = all.map((a) => [a.p[0] - a.r, a.p[0] + a.r]).flat();
  const ys = all.map((a) => [a.p[1] - a.r, a.p[1] + a.r]).flat().concat([g[1]]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // one scale for every pose of the same body: a standing figure fills ~85% of the height
  const ref = mannequin(body, neutralPose());
  const refH = ref.ground - ref.bounds.top[1];
  const scale = Math.min((bh * 0.86) / refH, (bw * 0.92) / Math.max(1, x1 - x0), (bh * 0.92) / Math.max(1, y1 - y0));
  let view: View = { ...base, scale, at: [bx + bw / 2 - ((x0 + x1) / 2) * scale, by + bh * 0.95 - y1 * scale] };
  if (opts.zoom === "head") {
    // head and shoulders: same pose, the head fills the box
    const hs = (bh * 0.9) / (m.bounds.chest[1] - m.bounds.top[1]);
    const c = project(m.bounds.eyes, base).p;
    view = { ...base, scale: hs, at: [bx + bw / 2 - c[0] * hs, by + bh * 0.38 - c[1] * hs] };
  }
  const floorY = project([0, m.ground, 0], view).p[1];
  return [
    { id: "scene" as const, els: opts.zoom ? [] : [{ t: "path" as const, c: "s", d: `M${pt([bx + 6, floorY])} L${pt([bx + bw - 6, floorY])}` }] },
    { id: "body" as const, els: drawMannequin(m, view) },
  ];
};
export { neutralBody };
