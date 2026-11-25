/**
 * Camera sketch (Sprint 2-D.4) — ONE reference scene (the posed mannequin on the ground, a tree behind it, a
 * post in front of it, the horizon) seen through a frame. Framing, view direction, angle, distance, lens /
 * focal length / perspective, roll, composition, subject position, negative space, depth of field, focus,
 * bokeh and motion blur change how the SAME scene is framed and drawn. Explanatory only — not an optical
 * simulation. Pure, deterministic, erasable TypeScript only.
 */
import type { BodyParams } from "./figure-sketch.ts";
import { drawMannequin, mannequin, neutralBody, neutralPose, project, type Mannequin, type PoseParams, type View } from "./pose-sketch.ts";
import { closedSpline, pt, r1, type El, type Layer, type P } from "./sketch-core.ts";

export type Framing = "extreme_close_up" | "face_close_up" | "head_and_shoulders" | "upper_body" | "knees_up" | "full_body" | "group_shot" | "full_view" | "wide_shot" | "extreme_wide" | "panoramic";
export type Angle = "eye_level" | "high_angle" | "low_angle" | "birds_eye" | "worms_eye";
export type LensType = "ultra_wide" | "wide" | "standard" | "telephoto" | "macro" | "fisheye";
export type Layout = "centered" | "rule_of_thirds" | "symmetrical" | "asymmetrical" | "golden_ratio" | "diagonal" | "leading_lines";
export type Position = "center" | "left" | "right" | "upper" | "lower";
export interface CameraParams {
  framing: Framing | null;
  viewDirection: "front" | "three_quarter" | "side" | "back" | null;
  angle: Angle | null;
  distance: number;
  roll: "level" | "tilted_left" | "tilted_right" | "dutch" | null;
  layout: Layout[];
  negativeSpace: number;
  position: Position[];
  lens: LensType | null;
  focal: string | null; // mm_14 … mm_200
  projection: "perspective" | "orthographic" | null;
  perspective: "compressed" | "natural" | "exaggerated" | null;
  aperture: string | null; // f_1_4 … f_22
  dof: number | null;
  focusTarget: "eyes" | "face" | "subject" | "foreground" | "background" | null;
  sharpness: number;
  bokeh: "circular" | "oval" | "swirling" | "polygonal" | null;
  motionBlur: "none" | "subtle" | "moderate" | "strong" | null;
}
export const neutralCamera = (): CameraParams => ({
  framing: null, viewDirection: null, angle: null, distance: 3, roll: null, layout: [], negativeSpace: 3, position: [], lens: null, focal: null, projection: null, perspective: null,
  aperture: null, dof: null, focusTarget: null, sharpness: 3, bokeh: null, motionBlur: null,
});

const FRAMING: Record<Framing, { region: "eyes" | "face" | "chest" | "waist" | "knee" | "feet"; fill: number; D: number }> = {
  extreme_close_up: { region: "eyes", fill: 1, D: 260 },
  face_close_up: { region: "face", fill: 0.88, D: 360 },
  head_and_shoulders: { region: "chest", fill: 0.9, D: 460 },
  upper_body: { region: "waist", fill: 0.9, D: 600 },
  knees_up: { region: "knee", fill: 0.92, D: 780 },
  full_body: { region: "feet", fill: 0.82, D: 1000 },
  group_shot: { region: "feet", fill: 0.62, D: 1300 },
  full_view: { region: "feet", fill: 0.6, D: 1250 },
  wide_shot: { region: "feet", fill: 0.36, D: 1700 },
  extreme_wide: { region: "feet", fill: 0.14, D: 2600 },
  panoramic: { region: "feet", fill: 0.26, D: 2200 },
};
const ANGLE: Record<Angle, number> = { eye_level: 0, high_angle: 28, low_angle: -22, birds_eye: 72, worms_eye: -58 };
const LENS: Record<LensType, number> = { ultra_wide: 0.42, wide: 0.62, standard: 1, telephoto: 2.6, macro: 0.3, fisheye: 0.38 };
const MM = (id: string) => Number(id.replace("mm_", "")) || 50;
const FNUM = (id: string) => Number(id.replace("f_", "").replace("_", ".")) || 4;

/** Blur (px) of what is out of the focal plane: from the aperture and/or the depth-of-field slider. */
export const defocus = (c: CameraParams): number => {
  const a = c.aperture ? Math.max(0.1, 3.6 - Math.log2(FNUM(c.aperture)) * 0.78) : null;
  const d = c.dof !== null ? [3.4, 2.2, 1.2, 0.5, 0][Math.round(c.dof) - 1]! : null;
  if (a === null && d === null) return 0.6;
  if (a === null) return d!;
  if (d === null) return a;
  return (a + d) / 2;
};

const tree = (view: View, x: number, z: number, ground: number, u: number): El[] => {
  const base = project([x, ground, z], view);
  const top = project([x, ground - u * 5.2, z], view);
  const crown = project([x, ground - u * 6.4, z], view);
  const tw = Math.max(0.8, u * 0.32 * base.k);
  const cr = Math.max(2, u * 2.1 * crown.k);
  return [
    { t: "path", c: "k", d: `M${pt([base.p[0] - tw, base.p[1]])} L${pt([top.p[0] - tw * 0.7, top.p[1]])} L${pt([top.p[0] + tw * 0.7, top.p[1]])} L${pt([base.p[0] + tw, base.p[1]])} Z` },
    { t: "path", c: "tr", d: closedSpline(Array.from({ length: 9 }, (_, i) => [crown.p[0] + Math.cos((i / 9) * 2 * Math.PI) * cr * (1 + (i % 2) * 0.1), crown.p[1] + Math.sin((i / 9) * 2 * Math.PI) * cr * 0.9] as P)) },
  ];
};
const post = (view: View, x: number, z: number, ground: number, u: number): El[] => {
  const b = project([x, ground, z], view);
  const t = project([x, ground - u * 2.4, z], view);
  const w = Math.max(1, u * 0.22 * b.k);
  const f = project([x, ground - u * 2.75, z], view);
  const fr = Math.max(1.5, u * 0.42 * f.k);
  return [
    { t: "path", c: "k", d: `M${pt([b.p[0] - w, b.p[1]])} L${pt([t.p[0] - w, t.p[1]])} L${pt([t.p[0] + w, t.p[1]])} L${pt([b.p[0] + w, b.p[1]])} Z` },
    { t: "path", c: "fl", d: closedSpline(Array.from({ length: 10 }, (_, i) => [f.p[0] + Math.cos((i / 10) * 2 * Math.PI) * fr * (i % 2 ? 0.55 : 1), f.p[1] + Math.sin((i / 10) * 2 * Math.PI) * fr * (i % 2 ? 0.55 : 1)] as P)) },
  ];
};

/**
 * The camera view inside a W×H frame (frame coordinates 0…W, 0…H). `guides` draws the composition overlay.
 * Defaults (nothing chosen) are the neutral preview: full body, eye level, front, standard lens, centred.
 */
export const cameraLayers = (cam: CameraParams, W: number, H: number, subject: { body?: BodyParams; pose?: PoseParams; colors?: { top?: string | null; bottom?: string | null } } = {}): Layer[] => {
  const body = subject.body ?? neutralBody();
  const pose = subject.pose ?? neutralPose();
  const m: Mannequin = mannequin(body, pose, subject.colors ?? {});
  const u = m.unit;
  const framing = cam.framing ?? "full_body";
  const F = FRAMING[framing];
  const yaw = { front: 0, three_quarter: 35, side: 90, back: 180 }[cam.viewDirection ?? "front"];
  const pitch = ANGLE[cam.angle ?? "eye_level"];
  const distK = [0.62, 0.8, 1, 1.25, 1.6][Math.round(cam.distance) - 1] ?? 1;
  let D = F.D * distK;
  if (cam.lens) D *= LENS[cam.lens];
  if (cam.focal) D *= MM(cam.focal) / 50;
  if (cam.perspective) D *= { compressed: 3, natural: 1, exaggerated: 0.4 }[cam.perspective];
  const ortho = cam.projection === "orthographic";
  const macro = cam.lens === "macro";
  const b = m.bounds;
  const headR = (b.eyes[1] - b.top[1]) * 1.05;
  const regionTop = framing === "extreme_close_up" ? b.eyes[1] - headR * 0.35 : b.top[1];
  const regionBottom = { eyes: b.eyes[1] + headR * 0.35, face: b.eyes[1] + headR * 1.15, chest: b.chest[1], waist: b.waist[1], knee: b.knee[1], feet: m.ground }[F.region];
  const target: [number, number, number] = macro ? [-150, m.ground - u * 2.75, 260] : [0, (regionTop + regionBottom) / 2, 0];
  const base: View = { yaw, pitch, focal: ortho ? null : D, target, scale: 1, at: [0, 0] };
  // fit: the region's projected height fills `fill` of the frame (negative space and the slider adjust it)
  const pTop = project([target[0], regionTop, target[2]], base).p[1];
  const pBot = project([target[0], regionBottom, target[2]], base).p[1];
  const spaceK = [1.18, 1.08, 1, 0.78, 0.58][Math.round(cam.negativeSpace) - 1] ?? 1;
  const regionH = macro ? u * 1.2 : Math.max(4, Math.abs(pBot - pTop));
  // the distance slider: further away → the subject is smaller in the frame (and perspective flatter)
  const scale = ((H * F.fill * spaceK) / regionH / Math.pow(distK, 0.8)) * (framing === "panoramic" ? 0.9 : 1);
  // where the subject sits: subject position, then the composition, then negative space
  let fx = 0.5;
  let fy = 0.5;
  const pos = new Set(cam.position);
  const lay = new Set(cam.layout);
  if (lay.has("rule_of_thirds") || lay.has("asymmetrical")) fx = 1 / 3;
  if (lay.has("golden_ratio")) fx = 0.382;
  if (lay.has("diagonal")) [fx, fy] = [0.36, 0.56];
  if (pos.has("left")) fx = 1 / 3;
  if (pos.has("right")) fx = 2 / 3;
  if (pos.has("upper")) fy = 0.38;
  if (pos.has("lower")) fy = 0.64;
  if (cam.negativeSpace >= 4 && !pos.size && !lay.size) fx = cam.negativeSpace >= 5 ? 0.28 : 0.36;
  const roll = { level: 0, tilted_left: -8, tilted_right: 8, dutch: 18 }[cam.roll ?? "level"];
  const view: View = { ...base, scale, at: [W * fx, H * fy], roll, ...(cam.lens === "fisheye" ? { fisheye: 2.6 } : {}) };
  const blur = defocus(cam);
  const focus = cam.focusTarget ?? "subject";
  const bgBlur = focus === "background" ? 0 : blur;
  const fgBlur = focus === "foreground" ? 0 : blur * 1.3;
  const subjBlur = focus === "foreground" || focus === "background" ? blur * 0.8 : [1.1, 0.55, 0, 0, 0][Math.round(cam.sharpness) - 1] ?? 0;

  // ground plane and horizon
  const g = m.ground;
  const near = Math.min(D * 0.75, 2500);
  const gq: Array<[number, number, number]> = [[-9000, g, -9000], [9000, g, -9000], [9000, g, near], [-9000, g, near]];
  const groundD = `M${gq.map((v) => pt(project(v, view).p)).join(" L")} Z`;
  const scene: El[] = [{ t: "path", c: "sky", d: `M-50 -50 L${W + 50} -50 L${W + 50} ${H + 50} L-50 ${H + 50} Z` }, { t: "path", c: "gr", d: groundD }];
  const bg: El[] = [...tree(view, 300, -900, g, u), ...tree(view, -520, -1500, g, u)];
  // bokeh: highlights in the background
  const bokeh: El[] = [];
  if (cam.bokeh) {
    const cx = W / 2;
    const cy = H * 0.35;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 2 * Math.PI;
      const rr = Math.min(W, H) * (0.18 + (i % 3) * 0.1);
      const x = cx + Math.cos(a) * rr * 1.3;
      const y = cy + Math.sin(a) * rr * 0.55;
      const s = Math.min(W, H) * (0.035 + (i % 2) * 0.015);
      const tang = (a * 180) / Math.PI + 90;
      const shape = cam.bokeh === "polygonal" ? polygon(x, y, s, 6) : cam.bokeh === "circular" ? polygon(x, y, s, 24) : ellipseAt(x, y, s, s * 0.6, cam.bokeh === "swirling" ? tang : ((Math.atan2(y - H / 2, x - W / 2) * 180) / Math.PI));
      bokeh.push({ t: "path", c: "bk", d: shape });
    }
  }
  const fg: El[] = macro ? [] : post(view, -150, 260, g, u);
  const subjects: El[] = [];
  const others: Array<[number, number]> = framing === "group_shot" ? [[-170, -60], [170, -40]] : [];
  for (const [ox, oz] of others) {
    const m2 = mannequin(body, neutralPose());
    m2.prims.forEach((q) => (q.pts = q.pts.map((v) => [v[0] + ox, v[1], v[2] + oz])));
    subjects.push(...drawMannequin(m2, view));
  }
  // focus sharpness above normal: crisper outlines (below normal: a soft blur, see subjBlur)
  const crisp = cam.sharpness >= 4 ? (cam.sharpness >= 5 ? 2.4 : 2) : 0;
  const me = crisp ? drawMannequin(m, view).map((e) => withStroke(e, crisp)) : drawMannequin(m, view);
  // motion blur: trailing copies and speed lines
  const motion = cam.motionBlur && cam.motionBlur !== "none" ? { subtle: 1, moderate: 2, strong: 3 }[cam.motionBlur] : 0;
  for (let i = motion; i >= 1; i--) subjects.push({ t: "g", children: me, opacity: r1(0.18 + 0.1 * (motion - i)), blur: i * 0.6 });
  if (motion) {
    const c = project(b.chest, view).p;
    for (let k = -2; k <= 2; k++) subjects.push({ t: "path", c: "s", d: `M${pt([c[0] - W * (0.16 + motion * 0.05), c[1] + k * H * 0.07])} L${pt([c[0] - W * 0.07, c[1] + k * H * 0.07])}` });
  }
  // the motion copies sit to the left of the subject
  const shifted = subjects.map((e) => (e.t === "g" && e.opacity !== undefined && e.opacity < 1 ? { ...e, children: e.children.map((x) => shiftEl(x, -W * 0.035 * motion)) } : e));
  subjects.length = 0;
  subjects.push(...shifted, ...me);
  const macroEls: El[] = macro ? post({ ...view }, -150, 260, g, u) : [];

  const layers: Layer[] = [
    // bokeh discs are drawn crisp (they ARE the out-of-focus highlights)
    { id: "scene", els: [...scene, { t: "g", children: bg, blur: bgBlur }, ...bokeh] },
    { id: "subject", els: [{ t: "g", children: subjects, blur: subjBlur }] },
    { id: "light", els: [{ t: "g", children: [...fg, ...macroEls], blur: macro ? 0 : fgBlur }] },
  ];
  // focus marker
  const frame: El[] = [];
  if (cam.focusTarget) {
    const at = focus === "eyes" ? project(b.eyes, view).p : focus === "face" ? project([b.eyes[0], b.eyes[1] + headR * 0.25, b.eyes[2]], view).p : focus === "subject" ? project(b.chest, view).p : focus === "foreground" ? project([-150, g - u * 2.6, 260], view).p : project([300, g - u * 6.2, -900], view).p;
    const s = Math.min(W, H) * (focus === "eyes" ? 0.05 : 0.08);
    frame.push({ t: "path", c: "fm", d: corners(at, s) });
  }
  // composition guides
  for (const l of lay) frame.push(...guides(l, W, H, view, b));
  if (framing === "panoramic") {
    const bar = (H - W / 2.6) / 2;
    frame.push({ t: "path", c: "lb", d: `M0 0 L${W} 0 L${W} ${r1(bar)} L0 ${r1(bar)} Z M0 ${r1(H - bar)} L${W} ${r1(H - bar)} L${W} ${H} L0 ${H} Z` });
  }
  layers.push({ id: "frame", els: frame });
  if (roll) {
    // the scene rotates inside a level frame
    for (const L of layers.slice(0, 3)) L.els = [{ t: "g", children: L.els, rotate: [0, W / 2, H / 2] }];
  }
  return [{ id: "frame", els: [{ t: "clip", d: `M0 0 L${W} 0 L${W} ${H} L0 ${H} Z`, children: layers.flatMap((l) => l.els) }, { t: "path", c: "fb", d: `M0 0 L${W} 0 L${W} ${H} L0 ${H} Z` }] }];
};
const withStroke = (e: El, sw: number): El => (e.t === "path" && (e.c === "k" || e.c === "l") ? { ...e, sw } : e.t === "g" || e.t === "clip" ? { ...e, children: e.children.map((x) => withStroke(x, sw)) } : e);
const polygon = (x: number, y: number, r: number, n: number): string => `M${Array.from({ length: n }, (_, i) => pt([x + Math.cos((i / n) * 2 * Math.PI) * r, y + Math.sin((i / n) * 2 * Math.PI) * r])).join(" L")} Z`;
const ellipseAt = (x: number, y: number, rx: number, ry: number, deg: number): string => {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  return `M${Array.from({ length: 16 }, (_, i) => {
    const t = (i / 16) * 2 * Math.PI;
    const ex = Math.cos(t) * rx;
    const ey = Math.sin(t) * ry;
    return pt([x + ex * c - ey * s, y + ex * s + ey * c]);
  }).join(" L")} Z`;
};
const corners = ([x, y]: P, s: number): string => {
  const k = s * 0.45;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy]) => `M${pt([x + dx! * s, y + dy! * s - dy! * k])} L${pt([x + dx! * s, y + dy! * s])} L${pt([x + dx! * s - dx! * k, y + dy! * s])}`).join(" ");
};
const shiftEl = (e: El, dx: number): El => {
  if (e.t === "path") return { ...e, d: e.d.replace(/([MLCQ])([^MLCQAZ]*)/g, (_, c: string, a: string) => c + a.trim().split(/\s+/).map((v, i) => (i % 2 === 0 ? String(r1(Number(v) + dx)) : v)).join(" ") + " ").replace(/A([^MLCQAZ]*)/g, (_, a: string) => {
    const n = a.trim().split(/\s+/);
    for (let i = 5; i < n.length; i += 7) n[i] = String(r1(Number(n[i]) + dx));
    return `A${n.join(" ")} `;
  }) };
  if (e.t === "circle") return { ...e, cx: r1(e.cx + dx) };
  if (e.t === "g" || e.t === "clip") return { ...e, children: e.children.map((x) => shiftEl(x, dx)) };
  return e;
};
const guides = (l: Layout, W: number, H: number, view: View, b: Mannequin["bounds"]): El[] => {
  const line = (pts: P[]): El => ({ t: "path", c: "gd", d: `M${pts.map(pt).join(" L")}` });
  switch (l) {
    case "rule_of_thirds":
      return [line([[W / 3, 0], [W / 3, H]]), line([[(2 * W) / 3, 0], [(2 * W) / 3, H]]), line([[0, H / 3], [W, H / 3]]), line([[0, (2 * H) / 3], [W, (2 * H) / 3]])];
    case "centered":
      return [line([[W / 2, 0], [W / 2, H]]), line([[0, H / 2], [W, H / 2]])];
    case "symmetrical":
      return [line([[W / 2, 0], [W / 2, H]]), { t: "path", c: "gd", d: `M${pt([W * 0.3, H * 0.15])} L${pt([W * 0.35, H * 0.15])} M${pt([W * 0.65, H * 0.15])} L${pt([W * 0.7, H * 0.15])}` }];
    case "asymmetrical":
      return [{ t: "path", c: "gd", d: polygon(W * 0.78, H * 0.62, Math.min(W, H) * 0.06, 4) }, line([[W * 0.62, H * 0.9], [W * 0.92, H * 0.9]])];
    case "golden_ratio": {
      // a golden spiral drawn as quarter arcs
      let x = W * 0.618;
      let y = 0;
      let w = W * 0.382;
      let h = H;
      let d = `M${pt([x, y])}`;
      for (let i = 0; i < 5; i++) {
        const r = Math.min(w, h);
        const dir = i % 4;
        const end: P = dir === 0 ? [x + r, y + r] : dir === 1 ? [x - r + w, y + h] : dir === 2 ? [x, y + h - r] : [x + r, y];
        d += ` A${r1(r)} ${r1(r)} 0 0 1 ${pt(end)}`;
        if (dir === 0) {
          y += r;
          h -= r;
        } else if (dir === 1) {
          w -= r;
        } else if (dir === 2) {
          h -= r;
        } else {
          x += r;
          w -= r;
        }
      }
      return [{ t: "path", c: "gd", d }, line([[W * 0.618, 0], [W * 0.618, H]])];
    }
    case "diagonal":
      return [line([[0, H], [W, 0]])];
    case "leading_lines": {
      const c = project(b.waist, view).p;
      return [line([[0, H], c]), line([[W, H], c]), line([[W * 0.25, H], c]), line([[W * 0.75, H], c])];
    }
    default:
      return [];
  }
};
