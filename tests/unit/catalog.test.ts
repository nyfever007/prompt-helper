import { describe, expect, it } from "vitest";
import {
  CatalogRegistry,
  compilePrompt,
  coreCatalog,
  createEmptySpec,
  getCoreRegistry,
  resolveText,
  validateImageSpec,
} from "@/domain";
import { buildExtendedCatalog, cloneCore, extendedRegistry } from "../fixtures/catalogs";
import { buildSpec, multi, single } from "../fixtures/specs";

describe("8. catalog registry and extensibility", () => {
  it("the bundled core catalog is valid and versioned", () => {
    const core = getCoreRegistry();
    expect(core.id).toBe("prompter.core");
    expect(core.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(coreCatalog.formatVersion).toBe("0.1.0");
    expect(core.attributesForTier("basic").map((a) => a.id)).toEqual(["intent.description", "subject.kind", "style.visual"]);
    expect(core.attributesForTier("detailed")).toEqual([]);
  });

  it("every core option/attribute has English and Korean labels", () => {
    for (const a of getCoreRegistry().attributes()) {
      expect(a.label.ko, a.id).toBeTruthy();
      if (a.type === "single" || a.type === "multi") for (const o of a.options) expect(o.label.ko, `${a.id}/${o.id}`).toBeTruthy();
    }
  });

  it("localized text falls back to English for unknown locales", () => {
    const a = getCoreRegistry().getAttribute("subject.kind")!;
    expect(resolveText(a.label, "ko")).toBe("피사체");
    expect(resolveText(a.label, "fr")).toBe("Main subject");
  });

  it("adding attributes/options as DATA works end-to-end without code changes", () => {
    const reg = extendedRegistry();
    // registry
    expect(reg.attributesForTier("basic").map((a) => a.id)).toEqual([
      "intent.description",
      "subject.kind",
      "style.visual",
      "mood.tone",
      "output.aspect_ratio",
      "person.expression",
    ]);
    expect(reg.attributesVisibleIn("precision").length).toBe(reg.attributes().length);
    expect(reg.getOption("style.visual", "film_photography")?.parentId).toBe("photography");
    // validator + compiler
    const spec = buildSpec(reg, [
      ["style.visual", single("film_photography")],
      ["mood.tone", multi("dramatic")],
    ]);
    expect(validateImageSpec(spec, reg).ok).toBe(true);
    expect(compilePrompt(spec, reg).prompt).toBe("Visual style: 35mm film photograph. Mood: dramatic.");
    // core specs remain valid in the extended catalog (backward compatible)
    expect(validateImageSpec(createEmptySpec(getCoreRegistry()), reg).ok).toBe(true);
  });

  it("registry is immutable", () => {
    const reg = getCoreRegistry();
    expect(() => (reg.attributes() as unknown as unknown[]).push({})).toThrow();
    expect(Object.isFrozen(reg.getAttribute("subject.kind"))).toBe(true);
  });

  type Mutator = (c: ReturnType<typeof cloneCore>) => void;
  const bad: Array<[string, Mutator, string]> = [
    ["duplicate attribute", (c) => c.attributes.push(structuredClone(c.attributes[0]!)), "catalog.duplicate_attribute"],
    [
      "duplicate option",
      (c) => {
        const s = c.attributes.find((a) => a.id === "subject.kind")!;
        if (s.type === "single") s.options.push(structuredClone(s.options[0]!));
      },
      "catalog.duplicate_option",
    ],
    [
      "unknown option parent",
      (c) => {
        const s = c.attributes.find((a) => a.id === "style.visual")!;
        if (s.type === "single") s.options[0]!.parentId = "missing";
      },
      "catalog.unknown_option_parent",
    ],
    [
      "option hierarchy cycle",
      (c) => {
        const s = c.attributes.find((a) => a.id === "style.visual")!;
        if (s.type === "single") {
          s.options[0]!.parentId = s.options[1]!.id;
          s.options[1]!.parentId = s.options[0]!.id;
        }
      },
      "catalog.hierarchy_cycle",
    ],
    ["invalid default", (c) => void (c.attributes[1]!.defaultValue = { kind: "single", optionId: "nope" }), "catalog.invalid_default"],
    ["unknown group", (c) => void (c.attributes[0]!.groupId = "nowhere"), "catalog.unknown_group"],
    [
      "condition on unknown attribute",
      (c) => void (c.attributes[0]!.appliesWhen = [{ op: "isSet", attributeId: "ghost.attr" }]),
      "catalog.unknown_attribute_ref",
    ],
    [
      "anyOf on a text attribute",
      (c) => void (c.attributes[1]!.appliesWhen = [{ op: "anyOf", attributeId: "intent.description", optionIds: ["x"] }]),
      "catalog.invalid_condition",
    ],
    ["missing English label", (c) => void (c.attributes[0]!.label = { ko: "설명" } as never), "catalog.schema"],
    ["template without {value}", (c) => void (c.attributes[0]!.prompt = { template: "static" }), "catalog.schema"],
    ["bad version", (c) => void (c.version = "latest"), "catalog.schema"],
  ];

  it.each(bad)("rejects an invalid catalog: %s", (_n, mutate, code) => {
    const c = cloneCore();
    mutate(c);
    const r = CatalogRegistry.create(c);
    expect(r.ok).toBe(false);
    expect(r.diagnostics.map((d) => d.code)).toContain(code);
  });

  it("createOrThrow throws with readable diagnostics", () => {
    const c = buildExtendedCatalog();
    c.rules![0]!.involves = ["ghost.attr"];
    expect(() => CatalogRegistry.createOrThrow(c)).toThrow(/unknown "ghost.attr"/);
  });
});
