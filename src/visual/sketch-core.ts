/**
 * Shared sketch primitives (Sprint 2-D.2, split out in Sprint 2-D.3): element model, spline helpers,
 * theme tokens and static SVG serialisation used by face-sketch.ts, hair-sketch.ts and figure-sketch.ts.
 * Self-contained, erasable TypeScript only (Node runs the asset generator on these files directly).
 */

export type LayerId = "base" | "face" | "eyes" | "brows" | "nose" | "lips" | "hairBack" | "hair" | "body" | "clothes" | "ghost" | "scene" | "subject" | "frame" | "light";
/**
 * `fill` / `stroke` may be a colour or `grad:<id>` (a gradient declared by a `grad` element of the same drawing).
 * Sprint 2-D.4 adds groups (blur, rotation, opacity) and gradients for the camera and lighting sketches.
 */
export type El =
  | { t: "path"; d: string; c: string; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { t: "circle"; cx: number; cy: number; r: number; c: string; fill?: string; stroke?: string; opacity?: number }
  | { t: "clip"; d: string | string[]; children: El[]; evenOdd?: boolean }
  | { t: "g"; children: El[]; blur?: number; rotate?: readonly [number, number, number]; opacity?: number }
  | { t: "grad"; id: string; radial?: { cx: number; cy: number; r: number; fx: number; fy: number }; linear?: { x1: number; y1: number; x2: number; y2: number }; stops: ReadonlyArray<readonly [number, string, number?]> };
export interface Layer {
  id: LayerId;
  els: El[];
}


// ── Views (viewBox x y w h) ─────────────────────────────────────────────────────────────────
export type Box = readonly [number, number, number, number];
export const boxAttr = (b: Box): string => b.map(r1).join(" ");

// ── Small helpers ───────────────────────────────────────────────────────────────────────────
export type P = [number, number];
export const r1 = (n: number): number => Math.round(n * 10) / 10 + 0; // + 0 turns -0 into 0
export const pt = (p: P): string => `${r1(p[0])} ${r1(p[1])}`;
export const lv = (v: number): number => v - 3;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Closed Catmull-Rom spline through points → cubic Bézier path. A repeated point makes a corner. */
export const closedSpline = (pts: P[]): string => {
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
export const openSpline = (pts: P[]): string => {
  const ext = [pts[0]!, ...pts, pts[pts.length - 1]!];
  let d = `M${pt(pts[0]!)}`;
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = [ext[i - 1]!, ext[i]!, ext[i + 1]!, ext[i + 2]!];
    d += ` C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  return d;
};
export const bezier = (a: P, b: P, c: P, d: P, t: number): P => {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
};
/** Point at fraction s of a polyline (linear) — used for brow centrelines. */
export const along = (pts: P[], s: number, smooth: boolean): P => {
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
export const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${pt([cx - rx, cy])} A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([cx + rx, cy])} A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([cx - rx, cy])} Z`;
export const mirrorX = (d: string, cx = 100): string =>
  // Mirror an absolute path we generated (M/C/L/Q/A with x y pairs; A has rx ry rot large sweep x y).
  d.replace(/([MCLQ])([^MCLQAZ]*)/g, (_, cmd: string, args: string) => {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const out: string[] = [];
    for (let i = 0; i < n.length; i += 2) out.push(`${r1(2 * cx - n[i]!)} ${r1(n[i + 1]!)}`);
    return `${cmd}${out.join(" ")}${args.endsWith(" ") ? " " : ""}`;
  });

// ── Static SVG serialisation (generator) ───────────────────────────────────────────────────
/** Theme tokens; the live sketch uses the same values in globals.css (`.face-sketch`). */
export const SKETCH_STYLE = `<style>
svg{--ink:#34322e;--fill:#ecebe7;--soft:#86827a;--iris:#a9a59c;--white:#fbfaf8;--pupil:#2a2825;--hl:#ffffff;--brow:#57544e;--lip:#d3cec6;--nostril:#6f6b64;--hair:#9b968c;--strand:#5f5b54;--cloth:#d9d5cd;--ghost:#c4c0b8;--sky:#e9edf0;--ground:#e4dfd3;--tree:#c9d1c1;--flower:#d7a6a0;--mark:#3b5bdb}
@media (prefers-color-scheme:dark){svg{--ink:#ebe8e2;--fill:#34332f;--soft:#a09c92;--iris:#77736b;--white:#4a4944;--pupil:#121211;--hl:#ebe8e2;--brow:#cfcbc3;--lip:#5a5752;--nostril:#aaa69c;--hair:#66625b;--strand:#a9a59b;--cloth:#4a4843;--ghost:#5d5a54;--sky:#2a2e33;--ground:#34322c;--tree:#3d4538;--flower:#8a5d58;--mark:#7c95ff}}
path,circle{vector-effect:non-scaling-stroke}
.o{fill:var(--fill);stroke:var(--ink);stroke-width:2;stroke-linejoin:round}
.f{fill:var(--fill)}
.l{fill:none;stroke:var(--ink);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.s{fill:none;stroke:var(--soft);stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}
.w{fill:var(--white)}.i{fill:var(--iris)}.p{fill:var(--pupil)}.h{fill:var(--hl)}.b{fill:var(--brow)}.n{fill:var(--nostril)}
.lp{fill:var(--lip);stroke:var(--soft);stroke-width:1.2;stroke-linejoin:round}
.hr{fill:var(--hair);stroke:var(--ink);stroke-width:1.6;stroke-linejoin:round}
.hs{fill:none;stroke:var(--strand);stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}
.hst{fill:var(--hair);fill-opacity:.4;stroke:var(--soft);stroke-width:1.1;stroke-dasharray:2 2}
.hrl{fill:none;stroke:var(--strand);stroke-width:3;stroke-linecap:round}
.g{fill:var(--cloth);stroke:var(--ink);stroke-width:1.6;stroke-linejoin:round}
.gl{fill:none;stroke:var(--ink);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}
.gs{fill:none;stroke:var(--soft);stroke-width:1;stroke-linecap:round;stroke-dasharray:3 2}
.gh{fill:none;stroke:var(--ghost);stroke-width:1.1;stroke-linejoin:round}
.k{fill:var(--fill);stroke:var(--ink);stroke-width:1.6;stroke-linejoin:round}
.jt{fill:var(--soft)}.sky{fill:var(--sky)}.gr{fill:var(--ground);stroke:var(--soft);stroke-width:1}.tr{fill:var(--tree);stroke:var(--ink);stroke-width:1.2}.fl{fill:var(--flower);stroke:var(--ink);stroke-width:1}
.bk{fill:var(--hl);fill-opacity:.55;stroke:var(--soft);stroke-width:.8}.fm{fill:none;stroke:var(--mark);stroke-width:2;stroke-linecap:round}.gd{fill:none;stroke:var(--mark);stroke-width:1;stroke-dasharray:4 3;opacity:.8}.fb{fill:none;stroke:var(--ink);stroke-width:1.5}.lb{fill:var(--ink);opacity:.82}
.lx{stroke:none}.lb2{stroke:#2e2c28;stroke-width:1.4}.lg{fill:none;stroke:#000;stroke-opacity:.22;stroke-width:1}.ls{stroke:#2e2c28;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.shd{fill:var(--ghost);opacity:.55}.pr{fill:var(--white);stroke:var(--soft);stroke-width:1.2;stroke-linejoin:round}
</style>`;

/** Resolve `grad:<id>` to the drawing's own gradient id. */
export const paint = (v: string | undefined, scope: string): string | undefined => (v?.startsWith("grad:") ? `url(#${scope}${v.slice(5)})` : v);
const styleAttr = (e: { fill?: string; stroke?: string; sw?: number }, scope: string): string => {
  const parts = [e.fill ? `fill:${paint(e.fill, scope)}` : "", e.stroke ? `stroke:${paint(e.stroke, scope)}` : "", e.sw !== undefined ? `stroke-width:${e.sw}` : ""].filter(Boolean);
  return parts.length ? ` style="${parts.join(";")}"` : "";
};
const elString = (e: El, ids: { n: number; scope?: string }): string => {
  const scope = ids.scope ?? "";
  if (e.t === "circle") return `<circle class="${e.c}" cx="${e.cx}" cy="${e.cy}" r="${e.r}"${styleAttr(e, scope)}${e.opacity !== undefined ? ` opacity="${e.opacity}"` : ""}/>`;
  if (e.t === "path") return `<path class="${e.c}" d="${e.d}"${styleAttr(e, scope)}${e.opacity !== undefined ? ` opacity="${e.opacity}"` : ""}/>`;
  if (e.t === "grad") {
    const stops = e.stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ""}/>`).join("");
    if (e.radial) {
      const g = e.radial;
      return `<defs><radialGradient id="${scope}${e.id}" gradientUnits="userSpaceOnUse" cx="${r1(g.cx)}" cy="${r1(g.cy)}" r="${r1(g.r)}" fx="${r1(g.fx)}" fy="${r1(g.fy)}">${stops}</radialGradient></defs>`;
    }
    const g = e.linear!;
    return `<defs><linearGradient id="${scope}${e.id}" gradientUnits="userSpaceOnUse" x1="${r1(g.x1)}" y1="${r1(g.y1)}" x2="${r1(g.x2)}" y2="${r1(g.y2)}">${stops}</linearGradient></defs>`;
  }
  if (e.t === "g") {
    let pre = "";
    const attrs: string[] = [];
    if (e.blur) {
      const fid = `${scope}f${ids.n++}`;
      pre = `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r1(e.blur)}"/></filter>`;
      attrs.push(`filter="url(#${fid})"`);
    }
    if (e.rotate) attrs.push(`transform="rotate(${e.rotate.map(r1).join(" ")})"`);
    if (e.opacity !== undefined) attrs.push(`opacity="${e.opacity}"`);
    return `${pre}<g${attrs.length ? " " + attrs.join(" ") : ""}>${e.children.map((c) => elString(c, ids)).join("")}</g>`;
  }
  const id = `${scope}k${ids.n++}`;
  const shapes = (Array.isArray(e.d) ? e.d : [e.d]).map((d) => `<path d="${d}"${e.evenOdd ? ' clip-rule="evenodd"' : ""}/>`).join("");
  return `<clipPath id="${id}">${shapes}</clipPath><g clip-path="url(#${id})">${e.children.map((c) => elString(c, ids)).join("")}</g>`;
};
export const layersString = (layers: Layer[], ids: { n: number; scope?: string } = { n: 0 }, box?: Box): string =>
  layers.map((l) => l.els.filter((e) => !box || overlaps(e, box)).map((e) => elString(e, ids)).join("")).join("");
/** Rough bounding box of an element (path points incl. control points) — used to drop what a crop never shows. */
const overlaps = (e: El, [bx, by, bw, bh]: Box): boolean => {
  if (e.t === "g" || e.t === "grad") return true;
  if (e.t === "circle") return e.cx + e.r > bx && e.cx - e.r < bx + bw && e.cy + e.r > by && e.cy - e.r < by + bh;
  const d = Array.isArray(e.d) ? e.d.join(" ") : e.d;
  const xs: number[] = [];
  const ys: number[] = [];
  // coordinates of every command; an arc contributes its end point and its radii as a margin
  for (const [, cmd, args] of d.matchAll(/([MLCQAZHVhv])([^MLCQAZHVhv]*)/g)) {
    const n = args!.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === "A")
      for (let i = 0; i + 6 < n.length; i += 7) {
        const r = Math.max(n[i]!, n[i + 1]!);
        xs.push(n[i + 5]! - r, n[i + 5]! + r);
        ys.push(n[i + 6]! - r, n[i + 6]! + r);
      }
    else if (cmd !== "Z" && cmd !== "H" && cmd !== "V" && cmd !== "h" && cmd !== "v")
      for (let i = 0; i + 1 < n.length; i += 2) {
        xs.push(n[i]!);
        ys.push(n[i + 1]!);
      }
  }
  if (xs.length === 0) return true;
  const m = 2;
  return Math.max(...xs) + m > bx && Math.min(...xs) - m < bx + bw && Math.max(...ys) + m > by && Math.min(...ys) - m < by + bh;
};
/** A 160×120 card: one view, or two views side by side (e.g. nose profile + front). */
export const cardSvg = (views: Array<{ layers: Layer[]; box: Box }>, W = 160, H = 120): string => {
  const body =
    views.length === 1
      ? `<svg x="0" y="0" width="${W}" height="${H}" viewBox="${boxAttr(views[0]!.box)}" preserveAspectRatio="xMidYMid slice">${layersString(views[0]!.layers, { n: 0, scope: "a" }, views[0]!.box)}</svg>`
      : views
          .map((v, i) => {
            const w = W / views.length;
            return `<svg x="${r1(i * w)}" y="0" width="${r1(w)}" height="${H}" viewBox="${boxAttr(v.box)}" preserveAspectRatio="xMidYMid slice">${layersString(v.layers, { n: 0, scope: String.fromCharCode(97 + i) }, v.box)}</svg>`;
          })
          .join("") + views.slice(1).map((_, i) => `<path class="s" d="M${r1(((i + 1) * W) / views.length)} 8 V${H - 8}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${SKETCH_STYLE}${body}</svg>\n`;
};
