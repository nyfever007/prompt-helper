import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getCoreRegistry, isOptionAttribute } from "@/domain";
import { VISUAL_ASSET_DIRS } from "@/domain/catalog/catalogs/person/visual-examples";

/** Sprint 2-D.1 (TD-03) — line-art examples for face, eye and eyebrow shape via the existing `examples` metadata. */
const core = getCoreRegistry();

describe("visual examples", () => {
  it.each(Object.keys(VISUAL_ASSET_DIRS))("%s: cards control; every option has one ready example with an existing, self-contained, themed SVG", (id) => {
    const a = core.getAttribute(id)!;
    expect(a.control).toBe("cards");
    if (!isOptionAttribute(a)) throw new Error("option attribute expected");
    for (const o of a.options) {
      expect(o.examples, o.id).toHaveLength(1);
      const e = o.examples![0]!;
      expect([e.status, e.src], o.id).toEqual(["ready", `/visual/person/${VISUAL_ASSET_DIRS[id]!.dir}/${o.id}.svg`]);
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
});
