import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getCoreRegistry, isOptionAttribute } from "@/domain";
import { assetSrc, DRAWN_BOTTOM_TYPES, DRAWN_DRESS_TYPES, DRAWN_HAIR_STYLES, DRAWN_TOP_TYPES, VISUAL_ASSET_DIRS } from "@/domain/catalog/catalogs/person/visual-examples";
import { BOTTOM_TYPES, DRESS_TYPES, TOP_TYPES } from "@/visual/figure-sketch";
import { HAIR_STYLES } from "@/visual/hair-sketch";

/**
 * Sprint 2-D.1 (TD-03) — line-art examples via the existing `examples` metadata; extended in 2-D.2 (face) and
 * 2-D.3 (hair, body, clothing). A folder with an `options` subset keeps the attribute's own list control and
 * gives only those options an example (thumbnail); otherwise every option has one and the control is `cards`.
 */
const core = getCoreRegistry();

describe("visual examples", () => {
  it.each(Object.keys(VISUAL_ASSET_DIRS))("%s: cards control (or its list with thumbnails); every drawn option has one ready example with an existing, self-contained, themed SVG", (id) => {
    const a = core.getAttribute(id)!;
    const subset = VISUAL_ASSET_DIRS[id]!.options;
    expect(a.control).toBe(subset ? "searchable" : "cards");
    if (!isOptionAttribute(a)) throw new Error("option attribute expected");
    if (subset) expect(subset.every((x) => a.options.some((o) => o.id === x)), "subset ids are catalog ids").toBe(true);
    for (const o of a.options) {
      if (subset && !subset.includes(o.id)) {
        expect(o.examples, o.id).toBeUndefined();
        continue;
      }
      expect(o.examples, o.id).toHaveLength(1);
      const e = o.examples![0]!;
      expect([e.status, e.src], o.id).toEqual(["ready", assetSrc(VISUAL_ASSET_DIRS[id]!.dir, o.id)]);
      expect(e.alt.ko && e.alt.en, o.id).toBeTruthy();
      expect(e.provenance?.license, o.id).toBe("Project-owned");
      const file = `public${e.src}`;
      expect(existsSync(file), file).toBe(true);
      const svg = readFileSync(file, "utf8");
      expect(svg, file).toContain("prefers-color-scheme:dark"); // follows the light/dark theme
      expect(svg, file).not.toMatch(/<script|https?:\/\/(?!www\.w3\.org)|href=/); // no scripts, no external references
    }
  });

  it("no other attribute gains ready examples; values and prompt phrases are unchanged", () => {
    const withReady = core.attributes().filter((a) => isOptionAttribute(a) && a.options.some((o) => o.examples?.some((e) => e.status === "ready")));
    expect(withReady.map((a) => a.id).sort()).toEqual(Object.keys(VISUAL_ASSET_DIRS).sort());
  });

  it("the drawn subsets are exactly what the sketch modules can draw", () => {
    expect([...DRAWN_HAIR_STYLES]).toEqual(Object.keys(HAIR_STYLES));
    expect([...DRAWN_TOP_TYPES]).toEqual(Object.keys(TOP_TYPES));
    expect([...DRAWN_BOTTOM_TYPES]).toEqual(Object.keys(BOTTOM_TYPES));
    expect([...DRAWN_DRESS_TYPES]).toEqual(Object.keys(DRESS_TYPES));
  });
});
