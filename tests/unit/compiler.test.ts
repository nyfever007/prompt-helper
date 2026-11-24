import { describe, expect, it } from "vitest";
import {
  CatalogRegistry,
  COMPILER_VERSION,
  compilePrompt,
  createEmptySpec,
  ensureSentence,
  getCoreRegistry,
  type ImageSpec,
  type PromptAdapter,
  type SelectionValue,
} from "@/domain";
import { cloneCore, extendedRegistry, mulberry32, sampleValues } from "../fixtures/catalogs";
import { buildSpec, multi, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

const sample = (): ImageSpec =>
  buildSpec(core, [
    ["style.preset", single("photography")],
    ["subject.kind", single("person")],
    ["intent.description", text("Someone reading a book by a rainy café window")],
  ]);

const fullBasic = (): ImageSpec =>
  buildSpec(core, [
    ["output.aspect_ratio", single("portrait_4_5")],
    ["lighting.preset", single("natural_daylight")],
    ["mood.tone", multi("nostalgic", "cozy")],
    ["scene.background", single("blurred")],
    ["scene.setting", single("cafe")],
    ["camera.angle", single("eye_level")],
    ["composition.view_direction", single("three_quarter")],
    ["composition.framing", single("upper_body")],
    ["style.preset", single("watercolor")],
    ["subject.kind", single("person")],
    ["intent.description", text("Someone reading a book by a rainy café window")],
  ]);

describe("5. deterministic prompt compilation", () => {
  it(`golden output — minimal spec (compiler ${COMPILER_VERSION})`, () => {
    const c = compilePrompt(sample(), core);
    expect(c.prompt).toBe("Someone reading a book by a rainy café window. Main subject: a single person. Visual style: photograph.");
    expect(c.negativePrompt).toBe("");
    expect(c.blocked).toBe(false);
    expect(c.meta).toEqual({
      compilerVersion: "0.4.0",
      adapterId: "generic-en",
      adapterVersion: "0.1.0",
      specSchemaVersion: "0.3.0",
      catalogId: "prompter.core",
      catalogVersion: "0.7.0",
      safetyPolicyId: "prompter.baseline",
      safetyPolicyVersion: "0.2.0",
    });
  });

  it("golden output — every Basic Composer attribute", () => {
    const c = compilePrompt(fullBasic(), core);
    expect(c.prompt).toBe(
      "Someone reading a book by a rainy café window. Main subject: a single person. Visual style: watercolor painting. " +
        "Framing: upper-body shot. Viewing direction: three-quarter view. Camera angle: eye-level angle. Setting: a café. " +
        "Background: softly blurred background. Mood: cozy, nostalgic. Lighting: soft natural daylight. Aspect ratio: vertical 4:5.",
    );
    expect(c.parameters).toEqual({ aspectRatio: "4:5" });
    expect(c.parameterSources).toEqual({ aspectRatio: "output.aspect_ratio" });
    expect(c.fragments.map((f) => f.attributeId)).toEqual([
      "intent.description",
      "subject.kind",
      "style.preset",
      "composition.framing",
      "composition.view_direction",
      "camera.angle",
      "scene.setting",
      "scene.background",
      "mood.tone",
      "lighting.preset",
      "output.aspect_ratio",
    ]);
    // accented Latin text is not "mixed language"
    expect(c.diagnostics.map((d) => d.code)).not.toContain("prompt.mixed_language");
  });

  it("same spec → identical compilation, every time", () => {
    const spec = fullBasic();
    const first = compilePrompt(spec, core);
    for (let i = 0; i < 20; i++) expect(compilePrompt(spec, core)).toEqual(first);
    expect(compilePrompt(structuredClone(spec), core)).toEqual(first);
  });

  it("is independent of selection key insertion order and multi-select click order", () => {
    const a = buildSpec(core, [
      ["subject.kind", single("animal")],
      ["mood.tone", multi("dramatic", "calm")],
      ["style.preset", single("watercolor")],
    ]);
    const b = buildSpec(core, [
      ["style.preset", single("watercolor")],
      ["mood.tone", multi("calm", "dramatic")],
      ["subject.kind", single("animal")],
    ]);
    expect(Object.keys(a.selections)).not.toEqual(Object.keys(b.selections));
    expect(compilePrompt(a, core).prompt).toBe(compilePrompt(b, core).prompt);
    expect(compilePrompt(a, core).prompt).toBe("Main subject: an animal. Visual style: watercolor painting. Mood: calm, dramatic.");
  });

  it("the prompt consists ONLY of fragments from explicit, applicable selections (500 random specs)", () => {
    for (const reg of [core, extendedRegistry()]) {
      const all = reg.attributes();
      const rand = mulberry32(42);
      for (let n = 0; n < 250; n++) {
        const entries = all
          .filter(() => rand() < 0.4)
          .map((a) => [a.id, sampleValues(a)[rand() < 0.5 ? 0 : 1]] as [string, SelectionValue]);
        const spec = buildSpec(reg, entries);
        const c = compilePrompt(spec, reg);
        expect(c.prompt).toBe(c.fragments.map((f) => ensureSentence(f.text)).join(" "));
        for (const f of c.fragments) expect(spec.selections[f.attributeId]).toBeDefined();
        expect(compilePrompt(spec, reg)).toEqual(c);
      }
    }
  });

  it("a person subject adds no appearance, nationality, body, clothing or exposure words", () => {
    const c = compilePrompt(buildSpec(core, [["subject.kind", single("person")]]), core);
    expect(c.prompt).toBe("Main subject: a single person.");
    expect(c.prompt).not.toMatch(/woman|man|girl|boy|beautiful|sexy|slim|asian|korean|dress|skin|body|nude|young/i);
  });

  it("free text is inserted literally (no template/regex injection) and whitespace-normalized for output only", () => {
    const raw = "  A sign that reads {value} and $& and $1  \n\n twice  ";
    const spec = buildSpec(core, [["intent.description", text(raw)]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("A sign that reads {value} and $& and $1 twice.");
    expect(spec.selections["intent.description"]!.value).toEqual({ kind: "text", text: raw }); // spec untouched
  });

  it("keeps existing terminal punctuation", () => {
    const spec = buildSpec(core, [["intent.description", text("Is it raining?")]]);
    expect(compilePrompt(spec, core).prompt).toBe("Is it raining?");
  });

  it("uses adapter-specific phrasing from the catalog without compiler changes", () => {
    const reg = extendedRegistry();
    const adapter: PromptAdapter = {
      id: "test-adapter",
      version: "1.0.0",
      outputLanguage: "en",
      supportsPriority: true,
      render: (fs) => ({ prompt: fs.map((f) => f.text).join(" | "), negativePrompt: "" }),
    };
    const spec = buildSpec(reg, [
      ["style.preset", single("charcoal")],
      ["subject.kind", single("vehicle")],
    ]);
    expect(compilePrompt(spec, reg, adapter).prompt).toBe("Main subject: a vehicle. | Visual style: CHARCOAL.");
    expect(compilePrompt(spec, reg).prompt).toBe("Main subject: a vehicle. Visual style: charcoal sketch.");
  });

  it("renders number and range values with units", () => {
    const reg = extendedRegistry();
    const spec = buildSpec(reg, [
      ["x.focal_length", { kind: "number", value: 85 }],
      ["x.people_count", { kind: "range", min: 2, max: 4 }],
    ]);
    expect(compilePrompt(spec, reg).prompt).toBe("Lens: 85 mm focal length. From 2 to 4 people in the scene.");
  });

  it("reports (does not silently honour) unsupported priorities", () => {
    const spec = sample();
    const p: ImageSpec = { ...spec, selections: { ...spec.selections, "style.preset": { ...spec.selections["style.preset"]!, priority: 5 } } };
    const c = compilePrompt(p, core);
    expect(c.prompt).toBe(compilePrompt(spec, core).prompt);
    expect(c.diagnostics.map((d) => d.code)).toContain("compiler.priority_unsupported");
  });

  it("surfaces catalog rules as diagnostics without changing the prompt or spec", () => {
    const reg = extendedRegistry();
    const spec = buildSpec(reg, [
      ["style.preset", single("pixel_art")],
      ["x.focal_length", { kind: "number", value: 35 }],
    ]);
    const before = structuredClone(spec);
    const c = compilePrompt(spec, reg);
    const d = c.diagnostics.find((x) => x.code === "rule.pixel-art-lens");
    expect(d?.severity).toBe("warning");
    expect(d?.involves).toEqual(["style.preset", "x.focal_length"]);
    expect(c.prompt).toContain("Lens: 35 mm focal length.");
    expect(spec).toEqual(before);
  });

  it("refuses to compile against a different catalog", () => {
    const spec = { ...createEmptySpec(core), catalog: { id: "other.catalog", version: "1.0.0" } };
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("");
    expect(c.diagnostics.map((d) => d.code)).toContain("spec.catalog_mismatch");
  });

  it("a parameter-only attribute contributes no prompt text", () => {
    const c = cloneCore();
    const ar = c.attributes.find((a) => a.id === "output.aspect_ratio")!;
    ar.prompt = { ...ar.prompt, channel: "parameter" };
    const reg = CatalogRegistry.createOrThrow(c);
    const out = compilePrompt(buildSpec(reg, [["output.aspect_ratio", single("landscape_16_9")]]), reg);
    expect(out.prompt).toBe("");
    expect(out.fragments).toEqual([]);
    expect(out.parameters).toEqual({ aspectRatio: "16:9" });
  });
});
