import { describe, expect, it } from "vitest";
import {
  CatalogRegistry,
  compilePrompt,
  coreCatalog,
  createEmptySpec,
  evaluateSafety,
  findInactiveSelections,
  getCoreRegistry,
  isAttributeActive,
  isOptionActive,
  isOptionAttribute,
  resolveText,
  validateImageSpec,
} from "@/domain";
import { buildExtendedCatalog, cloneCore, coreAttr, extendedRegistry } from "../fixtures/catalogs";
import { buildSpec, multi, single } from "../fixtures/specs";

const core = getCoreRegistry();

describe("8. core catalog 0.3.0", () => {
  it("is valid, versioned and declares its format", () => {
    expect(core.id).toBe("prompter.core");
    expect(core.version).toBe("0.3.0");
    expect(coreCatalog.formatVersion).toBe("0.3.0");
  });

  it("Basic tier attributes in order", () => {
    expect(core.attributesForTier("basic").map((a) => a.id)).toEqual([
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
  });

  it("independent style and lighting axes exist (Detailed tier, not shown in Basic)", () => {
    expect(core.attributesForTier("detailed").map((a) => a.id)).toEqual([
      "style.medium",
      "style.realism",
      "style.technique",
      "style.movement",
      "style.aesthetic",
      "lighting.source",
      "lighting.direction",
      "lighting.softness",
      "lighting.intensity",
      "lighting.color_temperature",
      "lighting.contrast",
    ]);
  });

  it("every attribute and option has English and Korean labels", () => {
    for (const a of core.attributes()) {
      expect(a.label.ko, a.id).toBeTruthy();
      if (isOptionAttribute(a)) for (const o of a.options) expect(o.label.ko, `${a.id}/${o.id}`).toBeTruthy();
    }
  });

  it("every style preset has classification on the independent style axes", () => {
    const preset = core.getAttribute("style.preset")!;
    expect(isOptionAttribute(preset) && preset.options.length).toBeGreaterThanOrEqual(20);
    if (!isOptionAttribute(preset)) return;
    for (const o of preset.options) {
      expect(o.classification, o.id).toBeDefined();
      for (const axis of Object.keys(o.classification!)) expect(axis.startsWith("style."), `${o.id}:${axis}`).toBe(true);
    }
  });

  it("every lighting preset classifies only lighting axes", () => {
    const preset = core.getAttribute("lighting.preset")!;
    if (!isOptionAttribute(preset)) throw new Error();
    for (const o of preset.options) for (const axis of Object.keys(o.classification ?? {})) expect(axis.startsWith("lighting.")).toBe(true);
  });

  it("every option phrase in the catalog alone triggers no safety signal", () => {
    for (const a of core.attributes()) {
      if (!isOptionAttribute(a)) continue;
      for (const o of a.options) {
        const r = evaluateSafety({ tags: [], texts: [{ attributeId: a.id, text: `${a.prompt.template.replace("{value}", o.prompt.text)} girl child` }] });
        // "girl child" adds age signals; any finding would mean the phrase itself carries a sexual/nudity signal
        expect(r.findings, `${a.id}/${o.id}`).toEqual([]);
      }
    }
  });

  it("compiling every single core option never blocks and never mixes languages", () => {
    for (const a of core.attributes()) {
      if (!isOptionAttribute(a)) continue;
      for (const o of a.options) {
        const spec = buildSpec(core, [[a.id, a.type === "single" ? single(o.id) : multi(o.id)]]);
        const c = compilePrompt(spec, core);
        expect(c.blocked, `${a.id}/${o.id}`).toBe(false);
        expect(c.diagnostics.map((d) => d.code)).not.toContain("prompt.mixed_language");
      }
    }
  });
});

describe("8b. subject-aware options", () => {
  const visibleFraming = (subject: string | null) => {
    const spec = subject ? buildSpec(core, [["subject.kind", single(subject)]]) : createEmptySpec(core);
    const framing = core.getAttribute("composition.framing")!;
    if (!isOptionAttribute(framing)) throw new Error();
    return framing.options.filter((o) => isOptionActive(core, o, spec)).map((o) => o.id);
  };

  it.each([
    [null, ["extreme_close_up", "face_close_up", "head_and_shoulders", "upper_body", "knees_up", "full_body", "group_shot", "full_view", "wide_shot", "extreme_wide", "panoramic"]],
    ["person", ["extreme_close_up", "face_close_up", "head_and_shoulders", "upper_body", "knees_up", "full_body", "wide_shot", "extreme_wide"]],
    ["group", ["group_shot", "wide_shot", "extreme_wide"]],
    ["animal", ["extreme_close_up", "face_close_up", "full_body", "full_view", "wide_shot"]],
    ["object", ["extreme_close_up", "full_view", "wide_shot"]],
    ["landscape", ["wide_shot", "extreme_wide", "panoramic"]],
  ])("framing options for subject %s", (subject, expected) => {
    expect(visibleFraming(subject)).toEqual(expected);
  });

  it("viewing direction and camera angle apply only where meaningful", () => {
    const view = core.getAttribute("composition.view_direction")!;
    const angle = core.getAttribute("camera.angle")!;
    const s = (k: string) => buildSpec(core, [["subject.kind", single(k)]]);
    expect(isAttributeActive(core, view, createEmptySpec(core))).toBe(true); // no context yet → not restricted
    expect(isAttributeActive(core, view, s("person"))).toBe(true);
    expect(isAttributeActive(core, view, s("landscape"))).toBe(false);
    expect(isAttributeActive(core, view, s("abstract"))).toBe(false);
    expect(isAttributeActive(core, angle, s("landscape"))).toBe(true);
    expect(isAttributeActive(core, angle, s("abstract"))).toBe(false);
    expect(isAttributeActive(core, core.getAttribute("composition.framing")!, s("abstract"))).toBe(false);
  });

  it("#11: hierarchical subject sub-categories inherit their parent's context", () => {
    const reg = extendedRegistry();
    expect(reg.lineage("subject.kind", "dog")).toEqual(["dog", "animal"]);
    const framing = reg.getAttribute("composition.framing")!;
    if (!isOptionAttribute(framing)) throw new Error();
    const ids = (subject: string) => {
      const spec = buildSpec(reg, [["subject.kind", single(subject)]]);
      return framing.options.filter((o) => isOptionActive(reg, o, spec)).map((o) => o.id);
    };
    expect(ids("dog")).toEqual(ids("animal"));
    expect(ids("cat")).toEqual(ids("animal"));
    expect(ids("car")).toEqual(ids("vehicle"));
    expect(ids("tower")).toEqual(ids("architecture"));
    expect(ids("food")).toEqual(ids("object"));
    expect(compilePrompt(buildSpec(reg, [["subject.kind", single("dog")]]), reg).prompt).toBe("Main subject: a dog.");
    // switching between sub-categories of the same parent keeps framing applicable
    const spec = buildSpec(reg, [["subject.kind", single("dog")], ["composition.framing", single("full_body")]]);
    expect(findInactiveSelections(spec, reg)).toEqual([]);
  });
});

describe("8c. catalog registry and extensibility", () => {
  it("localized text falls back to English for unknown locales", () => {
    const a = core.getAttribute("subject.kind")!;
    expect(resolveText(a.label, "ko")).toBe("피사체");
    expect(resolveText(a.label, "fr")).toBe("Main subject");
  });

  it("adding attributes/options as DATA works end-to-end without code changes", () => {
    const reg = extendedRegistry();
    expect(reg.attributesForTier("basic").map((a) => a.id)).toContain("x.palette");
    expect(reg.attributesVisibleIn("precision").length).toBe(reg.attributes().length);
    expect(reg.getOption("style.preset", "sepia_photo")?.parentId).toBe("photography");
    const spec = buildSpec(reg, [
      ["style.preset", single("sepia_photo")],
      ["x.palette", multi("cool")],
    ]);
    expect(validateImageSpec(spec, reg).ok).toBe(true);
    expect(compilePrompt(spec, reg).prompt).toBe("Visual style: sepia-toned photograph. Palette: cool tones.");
  });

  it("registry is immutable", () => {
    expect(() => (core.attributes() as unknown as unknown[]).push({})).toThrow();
    expect(Object.isFrozen(core.getAttribute("subject.kind"))).toBe(true);
  });

  type Mutator = (c: ReturnType<typeof cloneCore>) => void;
  const bad: Array<[string, Mutator, string]> = [
    ["duplicate attribute", (c) => c.attributes.push(structuredClone(c.attributes[0]!)), "catalog.duplicate_attribute"],
    ["duplicate option", (c) => coreAttr(c, "subject.kind").options.push(structuredClone(coreAttr(c, "subject.kind").options[0]!)), "catalog.duplicate_option"],
    ["unknown option parent", (c) => void (coreAttr(c, "style.preset").options[0]!.parentId = "missing"), "catalog.unknown_option_parent"],
    [
      "option hierarchy cycle",
      (c) => {
        const o = coreAttr(c, "style.preset").options;
        o[0]!.parentId = o[1]!.id;
        o[1]!.parentId = o[0]!.id;
      },
      "catalog.hierarchy_cycle",
    ],
    ["invalid default", (c) => void (coreAttr(c, "subject.kind").defaultValue = { kind: "single", optionId: "nope" }), "catalog.invalid_default"],
    ["unknown group", (c) => void (c.attributes[0]!.groupId = "nowhere"), "catalog.unknown_group"],
    ["condition on unknown attribute", (c) => void (c.attributes[0]!.appliesWhen = [{ op: "isSet", attributeId: "ghost.attr" }]), "catalog.unknown_attribute_ref"],
    ["anyOf on a text attribute", (c) => void (c.attributes[1]!.appliesWhen = [{ op: "anyOf", attributeId: "intent.description", optionIds: ["x"] }]), "catalog.invalid_condition"],
    ["option condition on its own attribute", (c) => void (coreAttr(c, "subject.kind").options[0]!.appliesWhen = [{ op: "isSet", attributeId: "subject.kind" }]), "catalog.self_condition"],
    ["classification on unknown axis", (c) => void (coreAttr(c, "style.preset").options[0]!.classification = { "style.ghost": ["x"] }), "catalog.invalid_classification"],
    ["classification with unknown value", (c) => void (coreAttr(c, "style.preset").options[0]!.classification = { "style.medium": ["marble"] }), "catalog.invalid_classification"],
    ["parameter channel without key", (c) => void (coreAttr(c, "subject.kind").prompt = { template: "{value}", channel: "both" }), "catalog.missing_parameter_key"],
    ["parameter option without value", (c) => void delete coreAttr(c, "output.aspect_ratio").options[0]!.parameterValue, "catalog.missing_parameter_value"],
    ["rule action on unknown attribute", (c) => void (c.rules![0]!.actions = [{ kind: "clear", attributeId: "ghost.attr" }]), "catalog.unknown_attribute_ref"],
    ["rule without guidance", (c) => void delete (c.rules![0] as { guidance?: unknown }).guidance, "catalog.schema"],
    ["migration to unknown attribute", (c) => void (c.migrations![0]!.changes = [{ op: "renameAttribute", from: "a.b", to: "ghost.attr", reason: { en: "x" } }]), "catalog.invalid_migration"],
    ["migration chain not ending at version", (c) => void (c.migrations![0]!.toVersion = "0.1.5"), "catalog.invalid_migration"],
    ["backward migration", (c) => void (c.migrations![0]!.fromVersion = "0.3.0"), "catalog.invalid_migration"],
    ["missing English label", (c) => void (c.attributes[0]!.label = { ko: "설명" } as never), "catalog.schema"],
    ["template without {value}", (c) => void (c.attributes[0]!.prompt = { template: "static" }), "catalog.schema"],
    ["bad version", (c) => void (c.version = "latest"), "catalog.schema"],
    ["old format version", (c) => void ((c as { formatVersion: string }).formatVersion = "0.1.0"), "catalog.schema"],
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
    c.rules![c.rules!.length - 1]!.involves = ["ghost.attr"];
    expect(() => CatalogRegistry.createOrThrow(c)).toThrow(/unknown "ghost.attr"/);
  });
});
