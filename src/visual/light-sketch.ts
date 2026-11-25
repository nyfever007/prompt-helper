/**
 * Lighting sketch (Sprint 2-D.4) — a neutral head-sphere (construction lines and a nose wedge, so the
 * direction reads like a face) on a bust in front of a backdrop. Key direction / height, softness,
 * intensity, colour temperature or key colour, fill, rim (+ colour), ambient, reflected light, shadow
 * strength / edge, contrast, volumetric light and the source are combined into one shaded drawing.
 * Explanatory only — not physically based rendering. Colours are explicit (light colour IS the subject),
 * so the drawing looks the same in light and dark themes. Pure, deterministic, erasable TypeScript only.
 */
import { lv, pt, r1, type El, type Layer, type P } from "./sketch-core.ts";

export type Direction = "front" | "side" | "three_quarter" | "back" | "top" | "bottom" | "ambient";
export type Level4 = "none" | "subtle" | "moderate" | "strong";
export type Preset = "natural_daylight" | "golden_hour" | "midday_sun" | "overcast" | "blue_hour" | "moonlight" | "studio_softbox" | "low_key" | "high_key" | "backlit_rim" | "neon" | "candlelight";
export type Source = "sun" | "daylight_sky" | "moon" | "studio" | "practical" | "neon" | "fire" | "softbox" | "led" | "ambient_artificial";
export interface LightParams {
  preset: Preset | null;
  source: Source | null;
  direction: Direction | null;
  keyHeight: number | null;
  softness: "very_soft" | "soft" | "medium" | "hard" | "very_hard" | null;
  intensity: "very_dim" | "dim" | "moderate" | "bright" | "very_bright" | null;
  temperature: "very_cool" | "cool" | "neutral" | "warm" | "very_warm" | "mixed_color" | null;
  keyColor: string | null;
  contrast: "very_low" | "low" | "medium" | "high" | "very_high" | null;
  fill: Level4 | null;
  rim: Level4 | null;
  rimColor: string | null;
  ambient: Level4 | null;
  shadowStrength: "none" | "light" | "moderate" | "strong" | "deep" | null;
  shadowEdge: number | null;
  reflected: Level4 | null;
  volumetric: Level4 | null;
  visibility: "visible" | "off_screen" | null;
}
export const neutralLight = (): LightParams => ({
  preset: null, source: null, direction: null, keyHeight: null, softness: null, intensity: null, temperature: null, keyColor: null, contrast: null, fill: null, rim: null,
  rimColor: null, ambient: null, shadowStrength: null, shadowEdge: null, reflected: null, volumetric: null, visibility: null,
});

/** What a preset implies for settings the user has NOT set (presets never override an explicit choice). */
const PRESETS: Record<Preset, Partial<LightParams>> = {
  natural_daylight: { direction: "three_quarter", softness: "soft", temperature: "neutral", intensity: "bright", contrast: "medium", fill: "moderate" },
  golden_hour: { direction: "side", keyHeight: 2, softness: "medium", temperature: "very_warm", intensity: "moderate", rim: "subtle", rimColor: "#ffc06a" },
  midday_sun: { direction: "top", keyHeight: 5, softness: "very_hard", temperature: "neutral", intensity: "very_bright", contrast: "high", shadowStrength: "strong" },
  overcast: { direction: "ambient", softness: "very_soft", temperature: "cool", intensity: "moderate", contrast: "very_low", shadowStrength: "light" },
  blue_hour: { direction: "front", softness: "very_soft", temperature: "very_cool", intensity: "dim", contrast: "low" },
  moonlight: { direction: "side", softness: "medium", temperature: "very_cool", intensity: "very_dim", contrast: "high" },
  studio_softbox: { direction: "three_quarter", softness: "soft", temperature: "neutral", intensity: "bright", fill: "moderate", source: "softbox" },
  low_key: { direction: "side", softness: "hard", intensity: "dim", contrast: "very_high", fill: "none", shadowStrength: "deep" },
  high_key: { direction: "front", softness: "very_soft", intensity: "very_bright", contrast: "very_low", fill: "strong", shadowStrength: "none" },
  backlit_rim: { direction: "back", rim: "strong", contrast: "high", intensity: "moderate" },
  neon: { direction: "side", temperature: "mixed_color", intensity: "dim", contrast: "high", softness: "medium", source: "neon" },
  candlelight: { direction: "front", keyHeight: 1, temperature: "very_warm", intensity: "dim", softness: "soft", source: "fire" },
};
export const effectiveLight = (p: LightParams): LightParams => {
  if (!p.preset) return p;
  const d = PRESETS[p.preset];
  const out = { ...p };
  for (const k of Object.keys(d) as Array<keyof LightParams>) if (out[k] === null) (out as Record<string, unknown>)[k] = d[k];
  return out;
};

// ── colour helpers ──────────────────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c: RGB): string => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const times = (a: RGB, b: RGB, k = 1): RGB => [(a[0] * b[0] * k) / 255, (a[1] * b[1] * k) / 255, (a[2] * b[2] * k) / 255];
const TEMP: Record<NonNullable<LightParams["temperature"]>, string> = { very_cool: "#9dbcff", cool: "#c6d7ff", neutral: "#ffffff", warm: "#ffe0b5", very_warm: "#ffc58a", mixed_color: "#ff6fb4" };
const INTENSITY = { very_dim: 0.42, dim: 0.62, moderate: 0.82, bright: 1, very_bright: 1.14 };
const LEVEL: Record<Level4, number> = { none: 0, subtle: 1, moderate: 2, strong: 3 };

const DIR: Record<Exclude<Direction, "ambient">, [number, number, number]> = {
  front: [0.05, -0.2, 1],
  side: [1, -0.15, 0.12],
  three_quarter: [0.7, -0.35, 0.62],
  back: [0.35, -0.35, -1],
  top: [0.05, -1, 0.22],
  bottom: [0, 1, 0.45],
};

export const LIGHT_BOX = [0, 0, 200, 150] as const;
const C: P = [100, 62];
const RAD = 34;

export const lightLayers = (input: LightParams): Layer[] => {
  const p = effectiveLight(input);
  const ambientOnly = p.direction === "ambient";
  let L = [...DIR[p.direction && p.direction !== "ambient" ? p.direction : "three_quarter"]] as [number, number, number];
  if (p.keyHeight !== null) L[1] += -lv(p.keyHeight) * 0.3;
  const n = Math.hypot(...L);
  L = [L[0] / n, L[1] / n, L[2] / n];
  const I = INTENSITY[p.intensity ?? "moderate"];
  const lightRGB: RGB = hex(p.keyColor ?? TEMP[p.temperature ?? "neutral"]);
  const fillRGB: RGB = p.temperature === "mixed_color" && !p.keyColor ? hex("#5fa8ff") : mix(lightRGB, [200, 210, 225], 0.5);
  const albedo: RGB = [206, 202, 194];
  const lit = mix(times(albedo, lightRGB, I * 1.12), [255, 255, 255], p.intensity === "very_bright" ? 0.12 : 0);
  const shadowK = { none: 0.86, light: 0.68, moderate: 0.48, strong: 0.32, deep: 0.17 }[p.shadowStrength ?? "moderate"];
  const lift = (LEVEL[p.fill ?? "none"] * 0.08 + LEVEL[p.ambient ?? "none"] * 0.06) * 1;
  let shadow = times(albedo, fillRGB, (shadowK + lift) * I);
  const contrastMix = { very_low: 0.55, low: 0.3, medium: 0, high: -0.25, very_high: -0.5 }[p.contrast ?? "medium"];
  shadow = contrastMix >= 0 ? mix(shadow, lit, contrastMix) : mix(shadow, [10, 10, 12], -contrastMix);
  const soft = { very_soft: 1, soft: 0.75, medium: 0.5, hard: 0.25, very_hard: 0.05 }[p.softness ?? "medium"];
  const edge = p.shadowEdge !== null ? [1, 0.75, 0.5, 0.25, 0.05][Math.round(p.shadowEdge) - 1]! : soft;
  const back = L[2] < -0.2;
  const backdrop = mix(times([226, 224, 220], lightRGB, I * 0.95), [40, 40, 44], p.contrast === "very_high" || p.preset === "low_key" ? 0.55 : 0.1);
  const floor = mix(backdrop, [120, 116, 108], 0.25);
  const els: El[] = [];
  els.push(
    { t: "grad", id: "bd", linear: { x1: 0, y1: 0, x2: 0, y2: 112 }, stops: [[0, toHex(mix(backdrop, [255, 255, 255], 0.08))], [1, toHex(mix(backdrop, [0, 0, 0], 0.12))]] },
    { t: "path", c: "lx", d: "M0 0 L200 0 L200 112 L0 112 Z", fill: "grad:bd" },
    { t: "path", c: "lx", d: "M0 112 L200 112 L200 150 L0 150 Z", fill: toHex(floor) },
  );
  // shadows: on the backdrop (frontal light) and on the floor
  const sAlpha = (1 - shadowK) * (ambientOnly ? 0.35 : 0.85);
  if (!ambientOnly && L[2] > 0.2) els.push({ t: "g", blur: 1 + edge * 7, opacity: r1(sAlpha * 0.7), children: [{ t: "path", c: "lx", d: ellipse(C[0] - L[0] * 26, C[1] - L[1] * 16 + 6, RAD * 0.95, RAD * 1.15), fill: "#000000" }] });
  const fx = C[0] - L[0] * (28 + (1 - Math.abs(L[1])) * 22);
  els.push({ t: "g", blur: 1 + edge * 5, opacity: r1(sAlpha * (ambientOnly ? 0.6 : 0.8)), children: [{ t: "path", c: "lx", d: ellipse(fx, 120 + (back ? 8 : 0), 40 + (1 - Math.abs(L[1])) * 26, 6 + (back ? 4 : 0)), fill: "#000000" }] });
  // volumetric beams
  const vol = LEVEL[p.volumetric ?? "none"];
  if (vol && !ambientOnly) {
    const src: P = [C[0] + L[0] * 160, C[1] + L[1] * 120];
    const beams: El[] = [];
    for (const k of [-1, 0, 1]) {
      const a: P = [C[0] + k * 22 + L[1] * 10, C[1] + k * 10 - L[0] * 10];
      beams.push({ t: "path", c: "lx", d: `M${pt(src)} L${pt([a[0] - 9, a[1] + 30])} L${pt([a[0] + 9, a[1] + 30])} Z`, fill: toHex(lightRGB) });
    }
    els.push({ t: "g", blur: 3, opacity: r1(0.08 * vol + 0.04), children: beams });
  }
  // the bust: shoulders and neck, then the head-sphere
  const hx = ambientOnly ? 0 : L[0];
  const hy = ambientOnly ? -0.2 : L[1];
  const fxH = back ? C[0] + hx * RAD * 1.1 : C[0] + hx * RAD * 0.55;
  const fyH = back ? C[1] + hy * RAD * 1.1 : C[1] + hy * RAD * 0.55;
  const t1 = ambientOnly ? 0.5 : 0.18 + (1 - soft) * 0.3;
  const t2 = ambientOnly ? 1 : 0.5 + soft * 0.42;
  const litC = back ? toHex(mix(shadow, lit, 0.25)) : toHex(lit);
  els.push(
    { t: "grad", id: "hd", radial: { cx: fxH, cy: fyH, r: RAD * (back ? 1.6 : 1.75), fx: fxH, fy: fyH }, stops: [[0, litC], [r1(t1), litC], [r1(Math.min(0.98, t2)), toHex(shadow)], [1, toHex(shadow)]] },
    { t: "grad", id: "bs", linear: { x1: 100 + hx * 60, y1: 90, x2: 100 - hx * 60, y2: 118 }, stops: [[0, back ? toHex(shadow) : toHex(mix(lit, shadow, 0.25))], [1, toHex(shadow)]] },
    { t: "path", c: "lb2", d: `M${pt([52, 112])} C${pt([56, 96])} ${pt([78, 92])} ${pt([90, 90])} L${pt([90, 82])} L${pt([110, 82])} L${pt([110, 90])} C${pt([122, 92])} ${pt([144, 96])} ${pt([148, 112])} Z`, fill: "grad:bs" },
    { t: "path", c: "lb2", d: ellipse(C[0], C[1], RAD, RAD), fill: "grad:hd" },
  );
  // reflected (bounce) light on the lower shadow side
  const refl = LEVEL[p.reflected ?? "none"];
  if (refl) els.push({ t: "g", blur: 2, opacity: r1(0.15 * refl), children: [{ t: "path", c: "lx", d: arcPath(C, RAD - 3, 50, 130), stroke: toHex(mix(lightRGB, [255, 236, 210], 0.5)), sw: 4, fill: "none" }] });
  // rim light: an edge highlight from behind (opposite the key, or both sides with a back key)
  // a rim colour alone implies a (subtle) rim light
  const rim = LEVEL[p.rim ?? (p.rimColor ? "subtle" : "none")] + (back ? 1 : 0);
  if (rim) {
    const rc = p.rimColor ?? (back ? toHex(lightRGB) : "#ffffff");
    const centre = back ? (L[0] >= 0 ? -40 : -140) : L[0] >= 0 ? -150 : -30;
    els.push({ t: "g", blur: 0.8, children: [{ t: "path", c: "lx", d: arcPath(C, RAD - 0.8, centre - 55, centre + 55), stroke: rc, sw: 1 + rim * 0.9, fill: "none" }] });
    if (back) els.push({ t: "g", blur: 0.8, children: [{ t: "path", c: "lx", d: arcPath(C, RAD - 0.8, -150, -95), stroke: rc, sw: 1 + rim * 0.6, fill: "none" }] });
  }
  // construction lines and nose: the head faces the viewer
  els.push(
    { t: "path", c: "lg", d: `M${pt([C[0], C[1] - RAD])} Q${pt([C[0] - 6, C[1]])} ${pt([C[0], C[1] + RAD])}` },
    { t: "path", c: "lg", d: `M${pt([C[0] - RAD, C[1] + 2])} Q${pt([C[0], C[1] + 9])} ${pt([C[0] + RAD, C[1] + 2])}` },
  );
  const noseShadow = ambientOnly ? 0 : -L[0] * 7;
  els.push({ t: "path", c: "lx", d: `M${pt([C[0], C[1] + 4])} L${pt([C[0] + 3.5, C[1] + 16])} L${pt([C[0] - 1, C[1] + 17])} Z`, fill: toHex(mix(lit, shadow, 0.35)) });
  if (!ambientOnly && !back) els.push({ t: "g", blur: 0.6 + edge * 1.5, opacity: r1(1 - shadowK), children: [{ t: "path", c: "lx", d: `M${pt([C[0], C[1] + 6])} L${pt([C[0] + noseShadow, C[1] + 18 - L[1] * 5])} L${pt([C[0] - 1, C[1] + 17])} Z`, fill: "#000000" }] });
  // light source (only when visible, or when its kind is chosen)
  const showSource = p.visibility === "visible" || (p.source !== null && p.visibility !== "off_screen");
  const frame: El[] = [];
  if (!ambientOnly && showSource) {
    const at: P = [Math.min(182, Math.max(18, C[0] + L[0] * 70)), Math.min(100, Math.max(16, C[1] + L[1] * 52 - (back ? 24 : 0)))];
    frame.push(...sourceIcon(p.source ?? "studio", at, toHex(lightRGB)));
  }
  if (p.temperature === "mixed_color" && !p.keyColor) frame.push({ t: "g", blur: 0.8, children: [{ t: "path", c: "lx", d: arcPath(C, RAD - 0.8, 120, 220), stroke: "#5fa8ff", sw: 2.2, fill: "none" }] });
  return [
    { id: "scene", els },
    { id: "light", els: frame },
  ];
};
const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${pt([cx - rx, cy])} A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([cx + rx, cy])} A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([cx - rx, cy])} Z`;
/** Arc on a circle from deg a to b (0° = right, clockwise, y down). */
const arcPath = (c: P, r: number, a: number, b: number): string => {
  const p = (d: number): P => [c[0] + Math.cos((d * Math.PI) / 180) * r, c[1] + Math.sin((d * Math.PI) / 180) * r];
  return `M${pt(p(a))} A${r1(r)} ${r1(r)} 0 ${b - a > 180 ? 1 : 0} 1 ${pt(p(b))}`;
};
const sourceIcon = (s: Source, [x, y]: P, color: string): El[] => {
  const o = { c: "ls", fill: color };
  switch (s) {
    case "sun":
      return [{ t: "path", ...o, d: ellipse(x, y, 7, 7) }, { t: "path", c: "ls", fill: "none", d: Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * 2 * Math.PI; return `M${pt([x + Math.cos(a) * 10, y + Math.sin(a) * 10])} L${pt([x + Math.cos(a) * 14, y + Math.sin(a) * 14])}`; }).join(" ") }];
    case "moon":
      return [{ t: "path", ...o, d: `M${pt([x + 2, y - 8])} A8 8 0 1 0 ${pt([x + 2, y + 8])} A6 6 0 1 1 ${pt([x + 2, y - 8])} Z` }];
    case "daylight_sky":
      return [{ t: "path", ...o, d: `M${pt([x - 12, y + 4])} Q${pt([x - 12, y - 4])} ${pt([x - 5, y - 4])} Q${pt([x - 2, y - 11])} ${pt([x + 5, y - 6])} Q${pt([x + 13, y - 6])} ${pt([x + 12, y + 4])} Z` }];
    case "studio":
      // a round reflector on a stand
      return [{ t: "path", ...o, d: `M${pt([x - 9, y - 6])} L${pt([x + 9, y - 6])} L${pt([x + 5, y + 6])} L${pt([x - 5, y + 6])} Z` }, { t: "path", c: "ls", fill: "none", d: `M${pt([x, y + 6])} L${pt([x, y + 20])} M${pt([x - 6, y + 20])} L${pt([x + 6, y + 20])}` }];
    case "softbox":
      return [{ t: "path", ...o, d: `M${pt([x - 9, y - 11])} L${pt([x + 9, y - 11])} L${pt([x + 9, y + 11])} L${pt([x - 9, y + 11])} Z` }, { t: "path", c: "ls", fill: "none", d: `M${pt([x, y + 11])} L${pt([x, y + 22])}` }];
    case "led":
      return [{ t: "path", ...o, d: `M${pt([x - 12, y - 7])} L${pt([x + 12, y - 7])} L${pt([x + 12, y + 7])} L${pt([x - 12, y + 7])} Z` }, ...[-6, 0, 6].map((dx) => ({ t: "path" as const, c: "ls", fill: "none", d: `M${pt([x + dx, y - 5])} L${pt([x + dx, y + 5])}` }))];
    case "neon":
      return [{ t: "path", c: "ls", fill: "none", sw: 3, stroke: color, d: `M${pt([x - 12, y + 6])} L${pt([x - 4, y - 6])} L${pt([x + 4, y + 6])} L${pt([x + 12, y - 6])}` }];
    case "fire":
      return [{ t: "path", ...o, d: `M${pt([x, y - 12])} Q${pt([x + 9, y])} ${pt([x + 3, y + 8])} Q${pt([x, y + 10])} ${pt([x - 3, y + 8])} Q${pt([x - 9, y])} ${pt([x, y - 12])} Z` }, { t: "path", c: "ls", fill: "none", d: `M${pt([x - 3, y + 9])} L${pt([x - 3, y + 18])} L${pt([x + 3, y + 18])} L${pt([x + 3, y + 9])}` }];
    case "practical":
      return [{ t: "path", ...o, d: `M${pt([x - 8, y + 2])} L${pt([x - 4, y - 8])} L${pt([x + 4, y - 8])} L${pt([x + 8, y + 2])} Z` }, { t: "path", c: "ls", fill: "none", d: `M${pt([x, y + 2])} L${pt([x, y + 16])} M${pt([x - 5, y + 16])} L${pt([x + 5, y + 16])}` }];
    default:
      return [{ t: "path", ...o, d: ellipse(x, y - 2, 6, 6) }, { t: "path", c: "ls", fill: "none", d: `M${pt([x - 3, y + 5])} L${pt([x + 3, y + 5])} M${pt([x - 2, y + 8])} L${pt([x + 2, y + 8])}` }];
  }
};
