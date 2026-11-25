import type { OptionDefinition } from "../catalog/schema";
import { HEX_COLOR } from "./values";

/**
 * User-defined colors (Sprint 3.2, ADR-071): a custom entry may carry `color: "#RRGGBB"` (uppercase).
 * Pure helpers shared by the validator, the compiler, the sketches and the color control.
 */
export type Rgb = readonly [number, number, number];

/** Accepts `#RGB`, `#RRGGBB`, `RGB`, `RRGGBB` (any case, surrounding spaces); returns `#RRGGBB` or null. */
export const normalizeHex = (input: string): string | null => {
  const s = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) return `#${[...s].map((c) => c + c).join("")}`.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`.toUpperCase();
  return null;
};

export const isHexColor = (s: string): boolean => HEX_COLOR.test(s);

export const hexToRgb = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(Number.isFinite(v) ? v : 0)));
export const rgbToHex = (rgb: Rgb): string => `#${rgb.map((v) => clampByte(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/** Perceptual-ish distance ("redmean" weighting of sRGB) — enough to name the nearest palette color. */
export const colorDistance = (a: Rgb, b: Rgb): number => {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
};

/** The palette option (with a swatch) closest to a color; ties keep catalog order. */
export const nearestSwatchOption = (options: readonly OptionDefinition[], hex: string): OptionDefinition | undefined => {
  const target = hexToRgb(hex);
  let best: OptionDefinition | undefined;
  let bestD = Infinity;
  for (const o of options) {
    if (!o.swatch) continue;
    const d = colorDistance(target, hexToRgb(o.swatch.toUpperCase()));
    if (d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
};
