import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Sprint 2-C.4 (TD-16) — text colour pairs of BOTH themes (light tokens and the
 * `prefers-color-scheme: dark` overrides in globals.css) meet WCAG 2.x AA (4.5:1 for normal text).
 */
const css = readFileSync("src/app/globals.css", "utf8");
const tokens = (block: string) => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1]!, m[2]!]));
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const light = tokens(css.slice(0, darkStart));
const dark = { ...light, ...tokens(css.slice(darkStart, css.indexOf("}\n}", darkStart))) };
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const PAIRS: Array<[string, string]> = [
  ["text", "bg"], ["text", "surface"], ["text", "surface-2"], ["muted", "bg"], ["muted", "surface"], ["muted", "surface-2"],
  ["accent", "surface"], ["accent", "accent-soft"], ["accent-contrast", "accent"],
  ["warn", "surface"], ["warn", "warn-soft"], ["danger", "surface"], ["danger", "danger-soft"], ["ok", "surface"], ["ok", "ok-soft"],
];

describe.each([["light", light], ["dark", dark]] as const)("%s theme", (_name, t) => {
  it.each(PAIRS)("%s on %s ≥ 4.5:1", (fg, bg) => {
    expect(t[fg], fg).toBeDefined();
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
});
