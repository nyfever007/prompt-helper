import { describe, expect, it } from "vitest";
import { getCoreRegistry, isOptionAttribute, searchOptions, type OptionAttributeDefinition } from "@/domain";

const core = getCoreRegistry();
const attr = (id: string) => {
  const a = core.getAttribute(id)!;
  if (!isOptionAttribute(a)) throw new Error(id);
  return a as OptionAttributeDefinition;
};
const style = attr("style.preset");
const ids = (q: string, a = style) => searchOptions(a, q).map((h) => h.option.id);

describe("style search (labels in all locales + aliases)", () => {
  it.each([
    ["수채", "watercolor"],
    ["watercolor", "watercolor"],
    ["aquarelle", "watercolor"],
    ["애니", "anime"],
    ["anime", "anime"],
    ["수묵", "ink_wash"],
    ["sumi-e", "ink_wash"],
    ["도트", "pixel_art"],
    ["PIXEL", "pixel_art"],
    ["웹툰", "webtoon"],
    ["사이버펑크", "cyberpunk_art"],
    ["우키요에", "ukiyo_e"],
  ])("%s → %s first", (q, expected) => {
    expect(ids(q)[0]).toBe(expected);
  });

  it("ignores spacing/case/hyphen differences", () => {
    expect(ids("3D렌더")[0]).toBe("render_3d");
    expect(ids("3d 렌더")[0]).toBe("render_3d");
    expect(ids("lowpoly")).toContain("low_poly");
    expect(ids("low-poly")).toContain("low_poly");
  });

  it("multiple words are ANDed", () => {
    expect(ids("흑백 사진")).toEqual(["bw_photography"]);
    expect(ids("film photo")).toContain("film_photography");
  });

  it("partial Korean matches find all related presets", () => {
    const r = ids("사진");
    expect(r).toEqual(expect.arrayContaining(["photography", "film_photography", "bw_photography"]));
  });

  it("an empty query returns every option in catalog order (no result limit)", () => {
    expect(ids("")).toEqual(style.options.map((o) => o.id));
    expect(ids("   ")).toEqual(style.options.map((o) => o.id));
  });

  it("no match → empty list", () => {
    expect(ids("zzzz-no-such-style")).toEqual([]);
  });

  it("is deterministic", () => {
    const first = searchOptions(style, "art");
    for (let i = 0; i < 10; i++) expect(searchOptions(style, "art")).toEqual(first);
  });

  it("place search uses aliases too", () => {
    expect(ids("바다", attr("scene.setting"))[0]).toBe("beach");
    expect(ids("coffee", attr("scene.setting"))[0]).toBe("cafe");
  });
});
