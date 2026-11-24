import {
  CatalogRegistry,
  coreCatalog,
  type AttributeDefinition,
  type CatalogInput,
  type SelectionValue,
} from "@/domain";

/** Deep clone of the core catalog as plain mutable data. */
export const cloneCore = (): CatalogInput => structuredClone(coreCatalog) as CatalogInput;

type MutableSingle = Extract<CatalogInput["attributes"][number], { type: "single" }>;
export const coreAttr = (c: CatalogInput, id: string): MutableSingle => {
  const a = c.attributes.find((x) => x.id === id);
  if (!a || a.type !== "single") throw new Error(`fixture: ${id} missing or not single`);
  return a;
};

/**
 * An "extended" catalog built purely from DATA on top of core: new options,
 * hierarchical subject sub-categories, a multi-select with a max, a number,
 * a range, a conditional attribute, a conflict rule and an option rename
 * migration. No compiler/validator/UI code is changed to support it.
 */
export const buildExtendedCatalog = (): CatalogInput => {
  const c = cloneCore();
  c.version = "0.11.0";

  // Hierarchical subject sub-categories (Sprint 4 will expand these for real).
  coreAttr(c, "subject.kind").options.push(
    { id: "dog", parentId: "animal", label: { en: "Dog", ko: "개" }, prompt: { text: "a dog" } },
    { id: "cat", parentId: "animal", label: { en: "Cat", ko: "고양이" }, prompt: { text: "a cat" } },
    { id: "car", parentId: "vehicle", label: { en: "Car", ko: "자동차" }, prompt: { text: "a car" } },
    { id: "tower", parentId: "architecture", label: { en: "Tower", ko: "탑" }, prompt: { text: "a tower" } },
    { id: "food", parentId: "object", label: { en: "Food", ko: "음식" }, prompt: { text: "food" } },
  );
  coreAttr(c, "style.preset").options.push(
    { id: "sepia_photo", parentId: "photography", label: { en: "Sepia photo", ko: "세피아 사진" }, prompt: { text: "sepia-toned photograph" } },
    { id: "charcoal", label: { en: "Charcoal sketch" }, prompt: { text: "charcoal sketch", byAdapter: { "test-adapter": "CHARCOAL" } } },
  );

  c.attributes.push(
    {
      id: "x.palette",
      status: "approved",
      domain: "color",
      type: "multi",
      tier: "basic",
      order: 1950,
      maxSelections: 2,
      label: { en: "Palette", ko: "팔레트" },
      prompt: { template: "Palette: {value}." },
      options: [
        { id: "warm", label: { en: "Warm" }, prompt: { text: "warm tones" } },
        { id: "cool", label: { en: "Cool" }, prompt: { text: "cool tones" } },
        { id: "pastel", label: { en: "Pastel" }, prompt: { text: "pastel colors" } },
      ],
    },
    {
      id: "x.expression",
      status: "approved",
      domain: "person",
      type: "single",
      tier: "basic",
      order: 250,
      label: { en: "Expression" },
      prompt: { template: "Facial expression: {value}." },
      appliesWhen: [{ op: "anyOf", attributeId: "subject.kind", optionIds: ["person", "group"] }],
      options: [
        { id: "smiling", label: { en: "Smiling" }, prompt: { text: "smiling" } },
        { id: "neutral", label: { en: "Neutral" }, prompt: { text: "neutral" } },
      ],
    },
    {
      id: "x.focal_length",
      status: "approved",
      domain: "camera",
      type: "number",
      tier: "detailed",
      order: 1650,
      min: 8,
      max: 800,
      unit: "mm",
      semantics: "physical",
      label: { en: "Focal length" },
      prompt: { template: "Lens: {value} focal length." },
    },
    {
      id: "x.people_count",
      status: "approved",
      domain: "scene",
      type: "range",
      tier: "precision",
      order: 2150,
      min: 0,
      max: 50,
      semantics: "count",
      label: { en: "People in scene" },
      prompt: { template: "From {value} people in the scene." },
    },
  );
  c.rules = [
    ...(c.rules ?? []),
    {
      id: "pixel-art-lens",
      kind: "conflict",
      severity: "warning",
      when: [
        { op: "anyOf", attributeId: "style.preset", optionIds: ["pixel_art"] },
        { op: "isSet", attributeId: "x.focal_length" },
      ],
      involves: ["style.preset", "x.focal_length"],
      message: { en: "A lens focal length has little meaning for pixel art.", ko: "픽셀 아트에서는 초점 거리가 큰 의미가 없습니다." },
      guidance: { en: "Clear the focal length.", ko: "초점 거리를 해제하세요." },
      actions: [{ kind: "clear", attributeId: "x.focal_length" }],
    },
  ];
  c.migrations = [
    ...(c.migrations ?? []),
    {
      fromVersion: "0.10.0",
      toVersion: "0.11.0",
      changes: [
        { op: "renameOption", attributeId: "style.preset", from: "render_3d", to: "cgi_render", reason: { en: "Clearer id", ko: "더 명확한 ID" } },
        { op: "renameOption", attributeId: "mood.tone", from: "eerie", to: "uncanny", reason: { en: "Clearer id", ko: "더 명확한 ID" } },
      ],
    },
  ];
  // Apply the renames to the current option definitions so the chain resolves.
  coreAttr(c, "style.preset").options.find((o) => o.id === "render_3d")!.id = "cgi_render";
  for (const o of coreAttr(c, "style.preset").options) if (o.parentId === "render_3d") o.parentId = "cgi_render";
  const mood = c.attributes.find((a) => a.id === "mood.tone");
  if (mood?.type === "multi") mood.options.find((o) => o.id === "eerie")!.id = "uncanny";
  c.rules = c.rules.map((r) => ({
    ...r,
    when: r.when.map((w) => ("optionIds" in w ? { ...w, optionIds: w.optionIds.map((id) => (id === "eerie" ? "uncanny" : id)) } : w)),
  }));
  return c;
};

export const extendedRegistry = (): CatalogRegistry => CatalogRegistry.createOrThrow(buildExtendedCatalog());

/**
 * Policy-tag fixture: independent person axes (age, appeal, coverage, fit,
 * body) as they might appear in Sprint 2. Used to prove that only
 * age × sexual-appeal/explicit/nudity combinations block, and that body
 * proportions, fit and coverage are NOT treated as sexual signals.
 */
export const buildPolicyCatalog = (): CatalogInput => {
  const c = cloneCore();
  const single = (id: string, order: number, options: Array<[string, string[]]>) => ({
    id,
    status: "approved" as const,
    domain: "person",
    type: "single" as const,
    tier: "detailed" as const,
    order,
    label: { en: id },
    prompt: { template: `${id}: {value}.` },
    // Neutral phrases on purpose: only the structured policy TAGS carry meaning here.
    options: options.map(([oid, tags], i) => ({ id: oid, label: { en: oid }, prompt: { text: `choice ${i + 1}` }, ...(tags.length ? { policyTags: tags } : {}) })),
  });
  c.attributes.push(
    single("x.age_group", 3000, [["adult", ["age.adult"]], ["child", ["age.minor"]]]),
    single("x.appeal", 3010, [["confident", []], ["elegant", []], ["alluring", ["appeal.suggestive"]]]),
    single("x.coverage", 3020, [["full_coverage", []], ["minimal_coverage", ["coverage.minimal"]]]),
    single("x.fit", 3030, [["loose", []], ["tight_fit", ["fit.tight"]]]),
    single("x.body", 3040, [["slim", ["body.slim"]], ["curvy", ["body.curvy"]], ["athletic", ["body.athletic"]]]),
    single("x.exposure", 3050, [["clothed", []], ["unclothed_figure", ["exposure.nudity"]]]),
  );
  return c;
};
export const policyRegistry = (): CatalogRegistry => CatalogRegistry.createOrThrow(buildPolicyCatalog());

/** Two distinct valid values for any attribute (used by invariant tests). */
export const sampleValues = (a: AttributeDefinition): [SelectionValue, SelectionValue] => {
  switch (a.type) {
    case "single":
      return [
        { kind: "single", optionId: a.options[0]!.id },
        { kind: "single", optionId: a.options[1]!.id },
      ];
    case "multi":
      return [
        { kind: "multi", optionIds: [a.options[0]!.id] },
        { kind: "multi", optionIds: [a.options[1]!.id] },
      ];
    case "number":
      return [
        { kind: "number", value: a.min },
        { kind: "number", value: a.max },
      ];
    case "range":
      return [
        { kind: "range", min: a.min, max: a.max },
        { kind: "range", min: a.min, max: a.min },
      ];
    case "text":
      return [
        { kind: "text", text: "first description" },
        { kind: "text", text: "second description" },
      ];
    case "quantity":
      return [
        { kind: "number", value: a.min, unit: a.units[0]!.id },
        { kind: "range", min: a.min, max: a.min + 1, unit: a.units[a.units.length - 1]!.id },
      ];
  }
};

/** Deterministic PRNG for property-style tests. */
export const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
