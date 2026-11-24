import {
  CatalogRegistry,
  coreCatalog,
  type AttributeDefinition,
  type CatalogInput,
  type SelectionValue,
} from "@/domain";

/** Deep clone of the core catalog as plain mutable data. */
export const cloneCore = (): CatalogInput => structuredClone(coreCatalog) as CatalogInput;

/**
 * An "extended" catalog built purely from DATA on top of core: a new option,
 * a hierarchical option, a multi-select, a number, an attribute with a
 * suggested default, a conditional attribute, and a conflict rule.
 * No compiler/validator/UI code is changed to support it.
 */
export const buildExtendedCatalog = (): CatalogInput => {
  const c = cloneCore();
  c.version = "0.2.0";
  const style = c.attributes.find((a) => a.id === "style.visual");
  if (!style || style.type !== "single") throw new Error("fixture: style.visual missing");
  style.options.push(
    { id: "film_photography", parentId: "photography", label: { en: "Film photography", ko: "필름 사진" }, prompt: { text: "35mm film photograph" } },
    { id: "charcoal", label: { en: "Charcoal sketch" }, prompt: { text: "charcoal sketch", byAdapter: { "test-adapter": "CHARCOAL" } } },
  );
  c.attributes.push(
    {
      id: "mood.tone",
      domain: "mood",
      type: "multi",
      tier: "basic",
      order: 40,
      maxSelections: 2,
      label: { en: "Mood", ko: "분위기" },
      prompt: { template: "Mood: {value}." },
      options: [
        { id: "calm", label: { en: "Calm" }, prompt: { text: "calm" } },
        { id: "dramatic", label: { en: "Dramatic" }, prompt: { text: "dramatic" } },
        { id: "playful", label: { en: "Playful" }, prompt: { text: "playful" } },
      ],
    },
    {
      id: "output.aspect_ratio",
      domain: "output",
      type: "single",
      tier: "basic",
      order: 50,
      label: { en: "Aspect ratio" },
      prompt: { template: "Aspect ratio: {value}." },
      defaultValue: { kind: "single", optionId: "square" },
      options: [
        { id: "square", label: { en: "Square 1:1" }, prompt: { text: "square (1:1)" } },
        { id: "portrait", label: { en: "Portrait 4:5" }, prompt: { text: "portrait (4:5)" } },
        { id: "wide", label: { en: "Wide 16:9" }, prompt: { text: "wide (16:9)" } },
      ],
    },
    {
      id: "person.expression",
      domain: "person",
      type: "single",
      tier: "basic",
      order: 60,
      label: { en: "Expression" },
      prompt: { template: "Facial expression: {value}." },
      appliesWhen: [{ op: "anyOf", attributeId: "subject.kind", optionIds: ["person", "group"] }],
      options: [
        { id: "smiling", label: { en: "Smiling" }, prompt: { text: "smiling" } },
        { id: "neutral", label: { en: "Neutral" }, prompt: { text: "neutral" } },
      ],
    },
    {
      id: "camera.focal_length",
      domain: "camera",
      type: "number",
      tier: "detailed",
      order: 70,
      min: 8,
      max: 800,
      unit: "mm",
      label: { en: "Focal length" },
      prompt: { template: "Lens: {value} focal length." },
    },
    {
      id: "scene.people_count",
      domain: "scene",
      type: "range",
      tier: "precision",
      order: 80,
      min: 0,
      max: 50,
      label: { en: "People in scene" },
      prompt: { template: "Between {value} people in the scene." },
    },
  );
  c.rules = [
    {
      id: "pixel-art-lens",
      kind: "conflict",
      severity: "warning",
      when: [
        { op: "anyOf", attributeId: "style.visual", optionIds: ["pixel_art"] },
        { op: "isSet", attributeId: "camera.focal_length" },
      ],
      involves: ["style.visual", "camera.focal_length"],
      message: { en: "A lens focal length has little meaning for pixel art.", ko: "픽셀 아트에서는 초점 거리가 큰 의미가 없습니다." },
    },
  ];
  return c;
};

export const extendedRegistry = (): CatalogRegistry => CatalogRegistry.createOrThrow(buildExtendedCatalog());

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
  }
};
