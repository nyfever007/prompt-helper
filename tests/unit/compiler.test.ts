import { describe, expect, it } from "vitest";
import {
  COMPILER_VERSION,
  compilePrompt,
  createEmptySpec,
  ensureSentence,
  getCoreRegistry,
  type ImageSpec,
  type PromptAdapter,
} from "@/domain";
import { extendedRegistry, sampleValues } from "../fixtures/catalogs";
import { buildSpec, multi, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

const sample = (): ImageSpec =>
  buildSpec(core, [
    ["style.visual", single("photography")],
    ["subject.kind", single("person")],
    ["intent.description", text("Someone reading a book by a rainy café window")],
  ]);

describe("5. deterministic prompt compilation", () => {
  it("produces the exact golden output for compiler " + COMPILER_VERSION, () => {
    const c = compilePrompt(sample(), core);
    expect(c.prompt).toBe(
      "Someone reading a book by a rainy café window. Main subject: a single person. Visual style: photograph.",
    );
    expect(c.negativePrompt).toBe("");
    expect(c.meta).toEqual({
      compilerVersion: "0.1.0",
      adapterId: "generic-en",
      adapterVersion: "0.1.0",
      specSchemaVersion: "0.1.0",
      catalogId: "prompter.core",
      catalogVersion: "0.1.0",
    });
  });

  it("same spec → identical compilation, every time", () => {
    const spec = sample();
    const first = compilePrompt(spec, core);
    for (let i = 0; i < 20; i++) expect(compilePrompt(spec, core)).toEqual(first);
    expect(compilePrompt(structuredClone(spec), core)).toEqual(first);
  });

  it("is independent of selection key insertion order and multi-select click order", () => {
    const reg = extendedRegistry();
    const a = buildSpec(reg, [
      ["subject.kind", single("animal")],
      ["mood.tone", multi("dramatic", "calm")],
      ["style.visual", single("watercolor")],
    ]);
    const b = buildSpec(reg, [
      ["style.visual", single("watercolor")],
      ["mood.tone", multi("calm", "dramatic")],
      ["subject.kind", single("animal")],
    ]);
    expect(Object.keys(a.selections)).not.toEqual(Object.keys(b.selections));
    expect(compilePrompt(a, reg).prompt).toBe(compilePrompt(b, reg).prompt);
    expect(compilePrompt(a, reg).prompt).toBe("Main subject: an animal. Visual style: watercolor painting. Mood: calm, dramatic.");
  });

  it("the prompt consists ONLY of fragments from explicit selections (nothing invented)", () => {
    const reg = extendedRegistry();
    // exhaustive-ish: every subset of attributes, each with its first sample value
    const all = reg.attributes();
    for (let mask = 0; mask < 1 << all.length; mask++) {
      const entries = all.filter((_, i) => mask & (1 << i)).map((a) => [a.id, sampleValues(a)[0]] as [string, ReturnType<typeof sampleValues>[0]]);
      const spec = buildSpec(reg, entries);
      const c = compilePrompt(spec, reg);
      expect(c.prompt).toBe(c.fragments.map((f) => ensureSentence(f.text)).join(" "));
      for (const f of c.fragments) expect(spec.selections[f.attributeId]).toBeDefined();
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
      ["style.visual", single("charcoal")],
      ["subject.kind", single("vehicle")],
    ]);
    expect(compilePrompt(spec, reg, adapter).prompt).toBe("Main subject: a vehicle. | Visual style: CHARCOAL.");
    expect(compilePrompt(spec, reg).prompt).toBe("Main subject: a vehicle. Visual style: charcoal sketch.");
  });

  it("renders number and range values with units", () => {
    const reg = extendedRegistry();
    const spec = buildSpec(reg, [
      ["camera.focal_length", { kind: "number", value: 85 }],
      ["scene.people_count", { kind: "range", min: 2, max: 4 }],
    ]);
    expect(compilePrompt(spec, reg).prompt).toBe("Lens: 85 mm focal length. Between 2 to 4 people in the scene.");
  });

  it("reports (does not silently honour) unsupported priorities", () => {
    const spec = sample();
    const p: ImageSpec = { ...spec, selections: { ...spec.selections, "style.visual": { ...spec.selections["style.visual"]!, priority: 5 } } };
    const c = compilePrompt(p, core);
    expect(c.prompt).toBe(compilePrompt(spec, core).prompt);
    expect(c.diagnostics.map((d) => d.code)).toContain("compiler.priority_unsupported");
  });

  it("surfaces catalog rules as diagnostics without changing the prompt or spec", () => {
    const reg = extendedRegistry();
    const spec = buildSpec(reg, [
      ["style.visual", single("pixel_art")],
      ["camera.focal_length", { kind: "number", value: 35 }],
    ]);
    const before = structuredClone(spec);
    const c = compilePrompt(spec, reg);
    expect(c.diagnostics.find((d) => d.code === "rule.pixel-art-lens")?.severity).toBe("warning");
    expect(c.prompt).toContain("Lens: 35 mm focal length.");
    expect(spec).toEqual(before);
  });

  it("refuses to compile against a different catalog", () => {
    const spec = { ...createEmptySpec(core), catalog: { id: "other.catalog", version: "1.0.0" } };
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("");
    expect(c.diagnostics.map((d) => d.code)).toContain("spec.catalog_mismatch");
  });
});
