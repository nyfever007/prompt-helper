import { describe, expect, it } from "vitest";
import {
  applyRandomComposition,
  applySelection,
  compilePrompt,
  composeRandom,
  createEmptySpec,
  exportSpecJson,
  getCoreRegistry,
  hexToRgb,
  importSpecJson,
  nearestSwatchOption,
  normalizeHex,
  RANDOM_STYLES,
  rgbToHex,
  selectedCustomEntries,
  validateImageSpec,
  type ImageSpec,
  type SelectionValue,
} from "@/domain";
import { faceSketchState } from "@/components/face/faceSketchState";
import { figureSketchState } from "@/components/figure/figureSketchState";
import { lightSketchState } from "@/components/scene/sceneSketchState";
import { buildSpec, single } from "../fixtures/specs";

/** Sprint 3.2 — user-defined colors: a custom entry with `color` on color attributes (ImageSpec 0.4.0). */
const core = getCoreRegistry();
const userColor = (hex: string, label = hex): SelectionValue => ({ kind: "single", custom: { label, color: hex } });
const set = (spec: ImageSpec, id: string, value: SelectionValue) => {
  const r = applySelection(spec, core, id, value);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.value;
};

describe("color helpers", () => {
  it("normalizes #RGB / #RRGGBB in any case; rejects anything else", () => {
    expect(normalizeHex("#3a7bd5")).toBe("#3A7BD5");
    expect(normalizeHex(" 3A7BD5 ")).toBe("#3A7BD5");
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    for (const bad of ["", "#12345", "#GGGGGG", "blue", "#1234567", "rgb(1,2,3)"]) expect(normalizeHex(bad), bad).toBeNull();
    expect(hexToRgb("#3A7BD5")).toEqual([58, 123, 213]);
    expect(rgbToHex([58, 123, 213])).toBe("#3A7BD5");
    expect(rgbToHex([300, -4, 12.6])).toBe("#FF000D"); // clamped and rounded
  });

  it("finds the nearest palette color", () => {
    const hair = core.getAttribute("person.hair.primary_color")!;
    if (hair.type !== "single") throw new Error("type");
    expect(nearestSwatchOption(hair.options, "#0B0B0C")?.id).toBe("jet_black");
  });
});

describe("prompt output", () => {
  it("states the exact color (hex, RGB) and the nearest catalog color; palette output is unchanged", () => {
    const palette = set(createEmptySpec(core), "person.hair.primary_color", single("jet_black"));
    expect(compilePrompt(palette, core).prompt).toBe("Primary hair color: jet black.");
    const custom = set(createEmptySpec(core), "person.hair.primary_color", userColor("#3A7BD5"));
    expect(compilePrompt(custom, core).prompt).toMatch(/^Primary hair color: custom color #3A7BD5 \(RGB 58, 123, 213, close to [a-z -]+\)\.$/);
    // a name or wording of the user's own comes first; the exact color is always stated
    const named = set(createEmptySpec(core), "person.clothing.tops.primary_color", { kind: "single", custom: { label: "brand blue", expression: "corporate brand blue", color: "#1C4E9A" } });
    expect(compilePrompt(named, core).prompt).toMatch(/^Top primary color: corporate brand blue, custom color #1C4E9A \(RGB 28, 78, 154, close to /);
    // multi-select (eyeshadow): palette options and user colors together
    const makeup = set(set(createEmptySpec(core), "person.makeup.presence", single("applied")), "person.makeup.eyeshadow_color", {
      kind: "multi",
      optionIds: ["gold"],
      custom: [{ label: "#7A3EA0", color: "#7A3EA0" }],
    });
    expect(compilePrompt(makeup, core).prompt).toMatch(/gold, custom color #7A3EA0 \(RGB 122, 62, 160/);
    // no "missing visual description" notice for a color
    expect(compilePrompt(custom, core).diagnostics.map((d) => d.code)).not.toContain("selection.custom_name_only");
  });

  it("safety and locks behave as before (a custom color is checked like any custom value, locks keep it)", () => {
    const spec = set(createEmptySpec(core), "person.hair.primary_color", userColor("#3A7BD5"));
    expect(compilePrompt(spec, core).blocked).toBe(false);
    const locked = { ...spec, selections: { ...spec.selections, "person.hair.primary_color": { ...spec.selections["person.hair.primary_color"]!, locked: true as const } } };
    const after = applyRandomComposition(locked, core, composeRandom(locked, core, 3, "chaos")).spec;
    expect(after.selections["person.hair.primary_color"]).toBe(locked.selections["person.hair.primary_color"]);
  });
});

describe("validation and storage", () => {
  it("a custom color is only allowed on color attributes and only as canonical #RRGGBB", () => {
    expect(applySelection(createEmptySpec(core), core, "person.identity.occupation", { kind: "multi", optionIds: [], custom: [{ label: "x", color: "#112233" }] }).ok).toBe(false);
    const raw = JSON.parse(exportSpecJson(createEmptySpec(core)));
    raw.selections["person.hair.primary_color"] = { value: { kind: "single", custom: { label: "x", color: "#abc" } }, source: "user" };
    expect(validateImageSpec(raw, core).ok).toBe(false);
  });

  it("export → import keeps the color exactly; 0.3.0 files (no colors) import unchanged as 0.4.0", () => {
    const spec = set(createEmptySpec(core), "person.hair.primary_color", userColor("#3A7BD5", "ocean"));
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status).toBe("valid");
    if (back.status === "valid") expect(back.spec.selections).toEqual(spec.selections);
    const old = JSON.parse(exportSpecJson(set(createEmptySpec(core), "person.hair.primary_color", single("jet_black"))));
    old.schemaVersion = "0.3.0";
    const migrated = importSpecJson(JSON.stringify(old), core);
    expect(migrated.status).toBe("valid");
    if (migrated.status === "valid") {
      expect(migrated.spec.schemaVersion).toBe("0.4.0");
      expect(migrated.spec.selections).toEqual(old.selections);
    }
  });

  it.each(RANDOM_STYLES)("%s random generation never creates a custom color (catalog colors only)", (style) => {
    for (const seed of [1, 2, 3]) {
      const { spec } = applyRandomComposition(createEmptySpec(core), core, composeRandom(createEmptySpec(core), core, seed, style));
      expect(Object.values(spec.selections).flatMap((s) => selectedCustomEntries(s.value))).toEqual([]);
    }
  });
});

describe("sketches draw a user color live (face, figure, lighting)", () => {
  it("iris, top and key light take the custom color; the palette swatch still wins when both are set", () => {
    let spec = buildSpec(core, [["subject.kind", single("person")]]);
    spec = set(spec, "person.eyes.iris_color", userColor("#12AB34"));
    spec = set(spec, "person.clothing.tops.type", single("t_shirt"));
    spec = set(spec, "person.clothing.tops.primary_color", userColor("#C0FFEE"));
    spec = set(spec, "lighting.key_color", userColor("#FF8800"));
    const face = faceSketchState(core, spec);
    expect(face.params.eyes.irisColor).toBe("#12AB34");
    expect(face.drawn).toContain("person.eyes.iris_color");
    expect(face.notDrawn).not.toContain("person.eyes.iris_color");
    expect(JSON.stringify(figureSketchState(core, spec).params)).toContain("#C0FFEE");
    expect(lightSketchState(core, spec).params.keyColor).toBe("#FF8800");
  });
});
