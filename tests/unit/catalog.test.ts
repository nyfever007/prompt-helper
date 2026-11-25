import { describe, expect, it } from "vitest";
import { INTIMATE_INNERWEAR } from "@/domain/catalog/catalogs/person/clothing";
import { placeUnlistedByOrder } from "@/testing/promptOrder";
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
const BODY_IDS = [
  "height", "build", "frame", "muscle_mass", "muscle_definition", "body_fat", "silhouette", "proportions",
  "head_size", "heads_tall", "upper_body_length", "lower_body_length", "upper_lower_ratio",
  "neck_length", "neck_thickness", "shoulder_width", "shoulder_slope", "collarbones",
  "rib_cage_width", "chest_volume", "pectorals", "waist_width", "waist_curvature", "abdomen", "abs_definition", "back_width", "back_muscles",
  "pelvis_width", "gluteal_volume", "gluteal_shape", "waist_hip_contrast",
  "arm_length", "upper_arm_thickness", "forearm_thickness", "arm_muscles", "hand_size", "finger_length", "finger_thickness",
  "leg_length", "thigh_thickness", "calf_thickness", "leg_muscles", "ankle_thickness", "foot_size", "leg_alignment",
].map((x) => `person.body.${x}`);
/** Sprint 2-B.5 (order 354–477), listed explicitly so registration and order are checked. */
const EXPRESSION_MAKEUP_IDS = [
  ...["emotion", "emotion_intensity", "smile", "mouth_openness", "teeth", "eye_openness", "brow_movement", "gaze_state", "tears", "facial_tension"].map((x) => `person.expression.${x}`),
  ...["overall", "vibe", "attractiveness", "cuteness", "elegance", "charisma", "androgyny", "maturity"].map((x) => `person.impression.${x}`),
  ...["presence", "style", "intensity", "base_coverage", "base_finish", "eyeshadow_color", "eyeshadow_style", "eyeliner_style", "eyeliner_color", "mascara", "false_lashes", "blush_color", "blush_placement", "lip_color", "lip_finish", "contour"].map((x) => `person.makeup.${x}`),
];
const CLOTHING_IDS = [
  ...["fashion_style", "formality", "fit", "season", "era", "condition", "layering", "coverage"].map((x) => `person.clothing.${x}`),
  ...["type", "primary_color", "secondary_color", "material", "pattern", "fit", "neckline", "collar", "sleeve_length", "sleeve_style", "length", "details"].map((x) => `person.clothing.tops.${x}`),
  ...["type", "primary_color", "secondary_color", "material", "pattern", "fit", "waist_rise", "leg_cut", "hem_length", "details"].map((x) => `person.clothing.bottoms.${x}`),
  ...["type", "primary_color", "secondary_color", "material", "pattern", "fit", "neckline", "sleeve_length", "sleeve_style", "waist_design", "hem_length", "skirt_silhouette", "details"].map((x) => `person.clothing.one_piece.${x}`),
  ...["type", "primary_color", "secondary_color", "material", "pattern", "fit", "length", "closure_state", "closure_type", "hood", "details"].map((x) => `person.clothing.outerwear.${x}`),
  ...["type", "primary_color", "material", "pattern"].map((x) => `person.clothing.innerwear.${x}`),
  ...["type", "primary_color", "secondary_color", "material", "heel_height", "heel_type", "toe_shape", "closure"].map((x) => `person.clothing.footwear.${x}`),
  ...["type", "primary_color", "pattern", "length", "opacity", "thickness"].map((x) => `person.clothing.hosiery.${x}`),
];
/** Sprint 2-B.6 pose (478–499), camera (1605–1675) and lighting (2025–2095), listed explicitly. */
const POSE_IDS = [
  "posture", "body_orientation", "torso_rotation", "torso_lean", "weight_shift", "balance", "tension", "head_direction", "head_tilt", "chin", "gaze_direction",
  "arms", "elbows", "hand_position", "hand_gesture", "legs", "knees", "feet", "action", "speed", "phase", "support",
].map((x) => `person.pose.${x}`);
const CAMERA_IDS = [
  "camera.distance", "camera.roll", "composition.layout", "composition.negative_space", "composition.subject_position", "camera.lens_type", "camera.focal_length",
  "camera.projection", "camera.perspective", "camera.aperture", "camera.depth_of_field", "camera.focus_target", "camera.focus_sharpness", "camera.bokeh", "camera.motion_blur",
];
const ACCESSORY_IDS = [
  "eyewear", "frame_shape", "frame_color", "hat", "hat_color", "hair_accessories", "earrings", "necklace", "bracelets",
  "rings", "watch", "belt", "bag", "scarf", "gloves", "necktie", "piercings", "decorative",
].map((x) => `person.accessories.${x}`);
const SKIN_HAIR_IDS = [
  ...["tone", "undertone", "texture", "sheen", "hydration", "pores", "translucency", "evenness", "freckle_density", "freckle_placement", "moles", "mole_placement", "wrinkles", "wrinkle_placement", "scars", "features"].map((x) => `person.skin.${x}`),
  ...["presence", "length", "primary_color", "secondary_color", "color_pattern", "texture", "thickness", "density", "volume", "shine", "condition", "curl_size", "curl_tightness", "part", "hairline", "bangs_style", "bangs_length", "bangs_density", "style", "tie_position", "layering", "flyaways", "movement"].map((x) => `person.hair.${x}`),
  ...["style", "length", "density", "color", "grooming", "texture"].map((x) => `person.facial_hair.${x}`),
];
const FACIAL_IDS = [
  ...["shape", "length", "width", "forehead_height", "forehead_width", "cheekbones", "jawline", "chin", "cheeks", "symmetry"].map((x) => `person.face.${x}`),
  ...["shape", "size", "width", "height", "spacing", "outer_corner_angle", "depth", "eyelids", "iris_color", "iris_size", "pupil_shape", "lash_length", "lash_density"].map((x) => `person.eyes.${x}`),
  ...["shape", "thickness", "length", "density", "angle", "height", "spacing", "color"].map((x) => `person.eyebrows.${x}`),
  ...["shape", "length", "width", "bridge_height", "bridge_shape", "tip_shape", "tip_angle", "alar_width"].map((x) => `person.nose.${x}`),
  ...["shape", "mouth_width", "upper_thickness", "lower_thickness", "ratio", "cupids_bow", "corners", "natural_color"].map((x) => `person.lips.${x}`),
];

describe("8. core catalog 0.15.0", () => {
  it("is valid, versioned and declares its format", () => {
    expect(core.id).toBe("prompter.core");
    expect(core.version).toBe("0.15.0");
    expect(coreCatalog.formatVersion).toBe("0.5.0");
  });

  it("Basic tier attributes in order", () => {
    expect(core.attributesForTier("basic").map((a) => a.id)).toEqual([
      "intent.description",
      "subject.kind",
      "person.appearance.direction", // Sprint 2-B.6: right after the subject (shown once the subject is a person)
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
      // Person › Identity (Sprint 2-B.1, order 201–216: right after the subject)
      "person.identity.entity_type",
      "person.identity.species",
      "person.identity.character_origin",
      "person.identity.age_group",
      "person.identity.age",
      "person.identity.apparent_age",
      "person.identity.gender",
      "person.identity.gender_presentation",
      "person.identity.nationality",
      "person.identity.ethnic_background",
      "person.identity.cultural_background",
      "person.identity.historical_period",
      "person.identity.occupation",
      "person.identity.narrative_role",
      "person.identity.social_status",
      "person.identity.description",
      // Person › Face, Eyes, Eyebrows, Nose, Lips (Sprint 2-B.2, order 217–263)
      ...FACIAL_IDS,
      // Person › Skin, Hair, Facial hair (Sprint 2-B.3, order 264–308)
      ...SKIN_HAIR_IDS,
      // Person › Body (Sprint 2-B.4, order 309–353)
      ...BODY_IDS,
      // Person › Expression & impression, Makeup (2-B.5A, 354–387), Wardrobe (2-B.5B, 388–459), Accessories (2-B.5C, 460–477)
      ...EXPRESSION_MAKEUP_IDS,
      ...CLOTHING_IDS,
      ...ACCESSORY_IDS,
      ...POSE_IDS,
      "style.medium",
      "style.realism",
      "style.technique",
      "style.movement",
      "style.aesthetic",
      ...CAMERA_IDS,
      "lighting.source",
      "lighting.direction",
      "lighting.key_height",
      "lighting.softness",
      "lighting.intensity",
      "lighting.color_temperature",
      "lighting.key_color",
      "lighting.contrast",
      "lighting.fill",
      "lighting.rim",
      "lighting.rim_color",
      "lighting.ambient",
      "lighting.shadow_strength",
      "lighting.shadow_edge",
      "lighting.reflected",
      "lighting.volumetric",
      "lighting.source_visibility",
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

  // Innerwear (Sprint 2-B.5) is neutral garment wording, but the EXISTING lexicon treats
  // “underwear” / “bra” as appeal wording. The policy is not relaxed and the phrases are not
  // reworded around it: combined with minor/ambiguous-age wording they must keep blocking.
  // Sprint 2-B.6: the appearance direction “sexy” is sexual-appeal wording by design — same existing protection.
  // Policy 0.3.0 (Sprint 2-C.3): intimate innerwear → `minor-intimate-apparel` (all 8, consistently; 0.2.0: 4 of them as
  // sexual wording); appearance “sexy” → `minor-sexualization`, and alone (no age) → withheld until an adult age is set.
  const MINOR_PROTECTED: Record<string, string> = {
    ...Object.fromEntries(INTIMATE_INNERWEAR.map((o) => [`person.clothing.innerwear.type/${o}`, "minor-intimate-apparel"])),
    "person.appearance.direction/sexy": "minor-sexualization",
  };
  const AGE_UNCONFIRMED = new Set(["person.appearance.direction/sexy"]);
  it("every option phrase in the catalog alone triggers no safety signal (innerwear: minor protection; appearance “sexy”: needs an adult age)", () => {
    const flagged: string[] = [];
    for (const a of core.attributes()) {
      if (!isOptionAttribute(a)) continue;
      for (const o of a.options) {
        const r = evaluateSafety({ tags: [], texts: [{ attributeId: a.id, text: `${a.prompt.template.replace("{value}", o.prompt.text)} girl child` }] });
        // "girl child" adds age signals; any finding would mean the phrase itself carries a sexual/nudity signal
        const key = `${a.id}/${o.id}`;
        if (key in MINOR_PROTECTED) {
          flagged.push(key);
          expect(r.findings.map((f) => f.ruleId), key).toEqual([MINOR_PROTECTED[key]]);
        } else expect(r.findings, key).toEqual([]);
        // On its own (no age wording) no option phrase raises any finding — except sexual appeal, which waits for an adult age
        const alone = evaluateSafety({ tags: [], texts: [{ attributeId: a.id, text: a.prompt.template.replace("{value}", o.prompt.text) }] }).findings.map((f) => f.ruleId);
        expect(alone, key).toEqual(AGE_UNCONFIRMED.has(key) ? ["appeal-age-unconfirmed"] : []);
      }
    }
    expect(flagged.sort()).toEqual(Object.keys(MINOR_PROTECTED).sort());
  });

  it("compiling every single core option never blocks (except appearance “sexy” without an adult age — policy 0.3.0) and never mixes languages", () => {
    for (const a of core.attributes()) {
      if (!isOptionAttribute(a)) continue;
      for (const o of a.options) {
        const spec = buildSpec(core, [[a.id, a.type === "single" ? single(o.id) : multi(o.id)]]);
        const c = compilePrompt(spec, core);
        const key = `${a.id}/${o.id}`;
        expect(c.blocked, key).toBe(AGE_UNCONFIRMED.has(key));
        if (AGE_UNCONFIRMED.has(key)) {
          expect(c.diagnostics.filter((d) => d.code.startsWith("safety.")).map((d) => d.code), key).toEqual(["safety.appeal-age-unconfirmed"]);
          const adult = buildSpec(core, [[a.id, multi(o.id)], ["person.identity.age", { kind: "number", value: 30, unit: "years" }]]);
          expect(compilePrompt(adult, core).blocked, `${key} adult`).toBe(false);
        }
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
    expect(() => CatalogRegistry.createOrThrow(placeUnlistedByOrder(c))).toThrow(/unknown "ghost.attr"/);
  });
});
