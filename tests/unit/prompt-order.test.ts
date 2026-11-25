import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CatalogRegistry, compilePrompt, getCoreRegistry, type CatalogInput, type CatalogRegistry as Registry, type SelectionValue } from "@/domain";
import { buildFixtureCatalog } from "@/testing/fixtureCatalog";
import { placeUnlistedByOrder } from "@/testing/promptOrder";
import { baselinePolicy020 } from "../fixtures/baselinePolicy-0.2.0";
import { buildExtendedCatalog, cloneCore, mulberry32, sampleValues } from "../fixtures/catalogs";
import { buildSpec, multi, single } from "../fixtures/specs";

/**
 * TD-08 (Sprint 2-C.2) — prompt output order is the catalog's explicit `promptOrder`, separate
 * from the UI `order`. Golden data was recorded from the 0.10.0 code (output order = `order`)
 * BEFORE the change: same specs → byte-identical prompts and fragment order. The golden data was
 * compiled with safety policy 0.2.0; the comparison uses that exact policy (test fixture) so it
 * checks ORDER only — the intended Sprint 2-C.3 policy change is covered by safety-policy tests.
 * Likewise the catalogs use the pre-2-C.3 subject scope of the appearance direction (single person
 * only); the intended TD-14 difference is asserted separately below.
 */
const policy = { safetyPolicy: baselinePolicy020 };
const AD = "person.appearance.direction";
/** The catalog as of 0.11.0 for the appearance-direction scope (only an explicit single person). */
const pre2c3 = (c: CatalogInput): Registry => {
  c.attributes.find((a) => a.id === AD)!.appliesWhen = [{ op: "anyOf", attributeId: "subject.kind", optionIds: ["person"] }];
  return CatalogRegistry.createOrThrow(c);
};
type Golden = { order: string[]; every: { prompt: string; fragments: number[] }; specs: Array<[string, number[]]> };
const golden = JSON.parse(readFileSync(new URL("../fixtures/golden-prompt-order-0.10.0.json", import.meta.url), "utf8")) as Record<string, Golden>;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const core = getCoreRegistry();
const registries: Array<[string, () => Registry]> = [["core", () => pre2c3(cloneCore())], ["fixture", () => pre2c3(buildFixtureCatalog())], ["extended", () => pre2c3(buildExtendedCatalog())]];

describe("golden: identical output to 0.10.0 (order-based) for 3 catalogs", () => {
  it.each(registries)("%s: 120 random specs + an all-attributes spec give the same prompt text and fragment order", (name, make) => {
    const reg = make();
    const g = golden[name]!;
    const all = reg.attributes();
    expect(all.map((a) => a.id)).toEqual(g.order); // the generator below sees the same attributes in the same (UI) order
    const rand = mulberry32(20261125);
    const mismatches: number[] = [];
    for (let n = 0; n < g.specs.length; n++) {
      const entries = all.filter(() => rand() < 0.5).map((a) => [a.id, sampleValues(a)[rand() < 0.5 ? 0 : 1]] as [string, SelectionValue]);
      const c = compilePrompt(buildSpec(reg, entries), reg, policy);
      const [hash, fragments] = g.specs[n]!;
      if (sha(c.prompt) !== hash || JSON.stringify(c.fragments.map((f) => g.order.indexOf(f.attributeId))) !== JSON.stringify(fragments)) mismatches.push(n);
    }
    expect(mismatches).toEqual([]);
    const every = compilePrompt(buildSpec(reg, all.map((a) => [a.id, sampleValues(a)[0]] as [string, SelectionValue])), reg, policy);
    expect(every.prompt).toBe(g.every.prompt);
    expect(every.fragments.map((f) => g.order.indexOf(f.attributeId))).toEqual(g.every.fragments);
  });

  it("TD-14 (Sprint 2-C.3): the ONLY difference to the pinned catalog is the appearance-direction sentence while no subject is chosen", () => {
    const pinned = pre2c3(cloneCore());
    const all = core.attributes();
    const rand = mulberry32(20261125);
    let differing = 0;
    for (let n = 0; n < 120; n++) {
      const entries = all.filter(() => rand() < 0.5).map((a) => [a.id, sampleValues(a)[rand() < 0.5 ? 0 : 1]] as [string, SelectionValue]);
      const now = compilePrompt(buildSpec(core, entries), core, policy).fragments.map((f) => f.attributeId);
      const before = compilePrompt(buildSpec(pinned, entries), pinned, policy).fragments.map((f) => f.attributeId);
      const subjectUnset = !entries.some(([id]) => id === "subject.kind");
      if (subjectUnset && entries.some(([id]) => id === AD) && now.includes(AD)) {
        differing++;
        expect(now.filter((id) => id !== AD), String(n)).toEqual(before); // everything else identical, same order
      } else expect(now, String(n)).toEqual(before);
    }
    expect(differing).toBeGreaterThan(0);
  });

  it("core: the full prompt order of all 348 attributes equals the 0.10.0 output order, in 15 explicit groups", () => {
    expect(core.promptAttributes().map((a) => a.id)).toEqual(golden.core!.order);
    expect(core.promptGroups.map((g) => g.id)).toEqual([
      "subject", "person_identity", "person_face", "person_skin_hair", "person_body", "person_expression", "person_wardrobe",
      "person_accessories", "person_pose", "style", "composition", "scene", "mood", "lighting", "output",
    ]);
    expect(core.promptGroupOf("camera.bokeh")).toBe("composition");
    expect(core.promptGroupOf("lighting.rim_color")).toBe("lighting");
  });
});

describe("determinism", () => {
  it("the same spec compiles to the same result every time and regardless of selection insertion order", () => {
    const entries: Array<[string, SelectionValue]> = [
      ["lighting.rim", single("subtle")], ["person.hair.length", single("shoulder")], ["subject.kind", single("person")],
      ["composition.layout", multi("rule_of_thirds", "centered")], ["person.identity.gender", single("woman")], ["camera.aperture", single("f_2_8")],
    ];
    const a = buildSpec(core, entries);
    const b = buildSpec(core, [...entries].reverse());
    const first = compilePrompt(a, core);
    for (let i = 0; i < 5; i++) expect(compilePrompt(a, core)).toEqual(first);
    expect(compilePrompt(b, core).prompt).toBe(first.prompt);
    expect(first.fragments.map((f) => f.attributeId)).toEqual([
      "subject.kind", "person.identity.gender", "person.hair.length", "composition.layout", "camera.aperture", "lighting.rim",
    ]);
  });
});

describe("UI order and categories are independent of the output order", () => {
  const spec = (reg: Registry) =>
    buildSpec(reg, [["composition.framing", single("upper_body")], ["camera.bokeh", single("oval")], ["camera.lens_type", single("telephoto")], ["lighting.rim", single("subtle")]]);
  it("moving an attribute to another subcategory and changing its UI `order` does not change the prompt", () => {
    const c = cloneCore();
    const bokeh = c.attributes.find((a) => a.id === "camera.bokeh")!;
    bokeh.categoryId = "shared_camera_framing";
    bokeh.order = 1;
    const reg = CatalogRegistry.createOrThrow(c);
    expect(reg.attributes()[0]!.id).toBe("camera.bokeh"); // UI order changed …
    expect(compilePrompt(spec(reg), reg).prompt).toBe(compilePrompt(spec(core), core).prompt); // … output did not
    expect(compilePrompt(spec(core), core).prompt).toBe("Framing: upper-body shot. Lens: telephoto lens. Bokeh: oval bokeh. Rim light: subtle.");
  });

  it("inserting a new attribute into a group changes nothing else: other ids keep their relative output order and no `order` is renumbered", () => {
    const c = cloneCore();
    c.attributes.push({ id: "camera.film_grain", domain: "camera", status: "approved", categoryId: "shared_camera_effects", type: "single", tier: "detailed", order: 1676, label: { en: "Film grain" }, prompt: { template: "Film grain: {value}." }, options: [{ id: "fine", label: { en: "Fine" }, prompt: { text: "fine" } }] });
    const comp = c.promptOrder!.find((g) => g.id === "composition")!;
    comp.attributes.splice(comp.attributes.indexOf("camera.lens_type"), 0, "camera.film_grain"); // placed by meaning, not by number
    const reg = CatalogRegistry.createOrThrow(c);
    const before = core.promptAttributes().map((a) => a.id);
    const after = reg.promptAttributes().map((a) => a.id);
    expect(after.filter((id) => id !== "camera.film_grain")).toEqual(before);
    expect(c.attributes.filter((a) => a.id !== "camera.film_grain").map((a) => a.order)).toEqual(cloneCore().attributes.map((a) => a.order));
    const s = buildSpec(reg, [["camera.film_grain", single("fine")], ["camera.lens_type", single("telephoto")], ["composition.framing", single("upper_body")]]);
    expect(compilePrompt(s, reg).prompt).toBe("Framing: upper-body shot. Film grain: fine. Lens: telephoto lens.");
  });

  it("a catalog without `promptOrder` (format-compatible) outputs in UI order, as before", () => {
    const c = cloneCore();
    delete c.promptOrder;
    const reg = CatalogRegistry.createOrThrow(c);
    expect(reg.promptAttributes()).toBe(reg.attributes());
    expect(reg.promptGroups).toEqual([]);
    expect(compilePrompt(spec(reg), reg).prompt).toBe(compilePrompt(spec(core), core).prompt);
  });
});

describe("integrity: every attribute exactly once", () => {
  const codes = (mutate: (c: CatalogInput) => void) => {
    const c = cloneCore();
    mutate(c);
    return CatalogRegistry.create(c).diagnostics.map((d) => d.code);
  };
  it.each([
    ["missing", (c: CatalogInput) => c.promptOrder![0]!.attributes.splice(0, 1), "catalog.prompt_order_missing"],
    ["listed twice", (c: CatalogInput) => c.promptOrder![1]!.attributes.push("subject.kind"), "catalog.prompt_order_duplicate"],
    ["unknown id", (c: CatalogInput) => c.promptOrder![0]!.attributes.push("x.nope"), "catalog.prompt_order_unknown"],
    ["duplicate group", (c: CatalogInput) => c.promptOrder!.push({ id: "mood", attributes: ["mood.tone"] }), "catalog.prompt_order_duplicate_group"],
  ])("%s → %s", (_n, mutate, code) => {
    expect(codes(mutate)).toContain(code);
  });
  it("a new attribute without a prompt position is rejected (it must be placed explicitly); the test helper places it by UI order", () => {
    const c = cloneCore();
    c.attributes.push({ id: "x.extra", domain: "x", status: "approved", type: "text", tier: "detailed", order: 1955, maxLength: 20, label: { en: "Extra" }, prompt: { template: "{value}" } });
    expect(CatalogRegistry.create(structuredClone(c)).diagnostics.map((d) => d.code)).toContain("catalog.prompt_order_missing");
    const placed = placeUnlistedByOrder(c);
    expect(placed.promptOrder!.find((g) => g.id === "mood")!.attributes).toEqual(["mood.tone", "x.extra"]);
  });
});
