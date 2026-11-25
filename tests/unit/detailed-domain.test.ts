import { readFileSync } from "node:fs";
import { placeUnlistedByOrder } from "@/testing/promptOrder";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyPresetPlan,
  applySelection,
  buildCategoryTree,
  CatalogRegistry,
  clearSelection,
  compilePrompt,
  createEmptySpec,
  createMemoryStore,
  createSpecStorage,
  exportSpecJson,
  flattenCategoryTree,
  getCoreRegistry,
  getPromptOutput,
  importSpecJson,
  markUserEdited,
  planPreset,
  renderPhraseParts,
  searchCatalog,
  undoPresetTransaction,
  validateSpecAgainstCatalog,
  WORKSPACE_STORAGE_KEY,
  type ImageSpec,
  type SelectionValue,
} from "@/domain";
import { buildFixtureCatalog, getFixtureRegistry } from "@/testing/fixtureCatalog";
import { cloneCore, coreAttr } from "../fixtures/catalogs";
import { buildSpec, multi, single, text } from "../fixtures/specs";

const core = getCoreRegistry();
const fx = getFixtureRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const fixture = (dir: string, name: string) => readFileSync(join(__dirname, "../fixtures", dir, name), "utf8");

describe("product exposure is separate from catalog expressiveness (D1)", () => {
  it("core: Detailed edits every approved Basic attribute + the camera (15 new) and lighting (6 + 11 new) attributes + the 300 person attributes (appearance 1, identity 16, facial 47, skin/hair 45, body 45, expression/makeup 34, wardrobe 72, accessories 18, pose 22), nothing else", () => {
    const ids = core.exposedAttributes("detailed").map((a) => a.id);
    expect(ids).toEqual([
      "intent.description",
      "subject.kind",
      "person.appearance.direction",
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
      ...core.attributes().filter((a) => /^person\.(face|eyes|eyebrows|nose|lips|skin|hair|facial_hair|body|expression|impression|makeup|clothing|accessories|pose)\./.test(a.id)).map((a) => a.id),
      "style.preset",
      "composition.framing",
      "composition.view_direction",
      "camera.angle",
      // Sprint 2-B.6 camera additions (order 1605–1675)
      "camera.distance", "camera.roll", "composition.layout", "composition.negative_space", "composition.subject_position", "camera.lens_type", "camera.focal_length",
      "camera.projection", "camera.perspective", "camera.aperture", "camera.depth_of_field", "camera.focus_target", "camera.focus_sharpness", "camera.bokeh", "camera.motion_blur",
      "scene.setting",
      "scene.background",
      "mood.tone",
      "lighting.preset",
      "lighting.source",
      "lighting.direction",
      "lighting.key_height",
      "lighting.softness",
      "lighting.intensity",
      "lighting.color_temperature",
      "lighting.key_color",
      "lighting.contrast",
      // Sprint 2-B.6 lighting additions (order 2065–2095)
      "lighting.fill", "lighting.rim", "lighting.rim_color", "lighting.ambient", "lighting.shadow_strength", "lighting.shadow_edge", "lighting.reflected", "lighting.volumetric", "lighting.source_visibility",
      "output.aspect_ratio",
    ]);
    // independent style axes exist as data but are deferred to Sprint 4
    for (const id of ["style.medium", "style.realism", "style.technique", "style.movement", "style.aesthetic"]) {
      expect(core.getAttribute(id)?.status).toBe("deferred");
      expect(ids).not.toContain(id);
    }
    expect(core.exposedAttributes("basic").map((a) => a.id)).toEqual(core.attributesForTier("basic").map((a) => a.id));
  });

  it("core: Identity (2-B.1), Face/Eyes/Eyebrows/Nose/Lips (2-B.2), Skin/Hair/Facial hair (2-B.3), Body (2-B.4), Expression/Makeup/Wardrobe/Accessories (2-B.5) and Pose (2-B.6) are approved — no person area is DRAFT any more", () => {
    const person = core.categories.filter((c) => c.parentId === "person");
    expect(person.map((c) => c.id)).toEqual([
      "person_identity", "person_face", "person_eyes", "person_eyebrows", "person_nose", "person_lips", "person_skin",
      "person_hair", "person_facial_hair", "person_body", "person_expression", "person_makeup", "person_wardrobe", "person_accessories", "person_pose",
    ]);
    expect(core.getCategory("person")?.status).toBe("approved");
    const approved: Record<string, number> = { person_identity: 16, person_face: 10, person_eyes: 13, person_eyebrows: 8, person_nose: 8, person_lips: 8, person_skin: 16, person_hair: 23, person_facial_hair: 6, person_body: 45, person_expression: 19 /* incl. appearance direction (2-B.6) */, person_makeup: 16, person_wardrobe: 72, person_accessories: 18, person_pose: 22 };
    expect(Object.values(approved).reduce((a, b) => a + b, 0)).toBe(300); // cumulative person attributes
    for (const c of person) {
      expect(c.docPath).toMatch(/^docs\/catalogs\/person\/.+\.md$/);
      const inSubtree = core.attributes().filter((a) => a.categoryId !== undefined && core.categoryPath(a.categoryId).includes(c.id));
      if (c.id in approved) {
        expect(c.status).toBe("approved");
        expect(inSubtree).toHaveLength(approved[c.id]!);
        expect(inSubtree.every((a) => core.isExposed(a, "detailed"))).toBe(true);
      } else {
        expect(c.status).toBe("draft");
        expect(inSubtree).toEqual([]);
      }
    }
    expect(core.presets).toEqual([]); // product composite presets need separate approval
  });

  it("fixture: draft, deferred and precision-tier attributes are never exposed in Detailed", () => {
    const ids = fx.exposedAttributes("detailed").map((a) => a.id);
    expect(ids).not.toContain("x.hidden.deferred");
    expect(ids).not.toContain("x.hidden.draft");
    expect(ids).not.toContain("x.hidden.precision");
    expect(ids).toContain("x.face.shape");
  });

  it("an approved attribute inside a draft category is not exposed", () => {
    const c = cloneCore();
    // No product person area is draft any more (2-B.6): make one draft in this clone only.
    c.categories = c.categories!.map((cat) => (cat.id === "person_pose" ? { ...cat, status: "draft" as const } : cat));
    c.attributes.push({ id: "x.face.test", domain: "person", status: "approved", categoryId: "person_pose", type: "text", tier: "detailed", order: 500, maxLength: 10, label: { en: "t" }, prompt: { template: "{value}" } });
    const reg = CatalogRegistry.createOrThrow(placeUnlistedByOrder(c));
    expect(reg.exposedAttributes("detailed").map((a) => a.id)).not.toContain("x.face.test");
  });
});

describe("data-driven categories", () => {
  it("builds the tree from catalog data with counts, applicability and badges", () => {
    const spec = buildSpec(fx, [
      ["subject.kind", single("landscape")],
      ["lighting.preset", single("golden_hour")],
      ["lighting.color_temperature", single("cool")],
      ["x.face.shape", single("oval")],
    ]);
    const c = compilePrompt(spec, fx);
    const nodes = flattenCategoryTree(buildCategoryTree(fx, spec, c.diagnostics));
    const byId = (id: string) => nodes.find((n) => n.category.id === id)!;
    expect(byId("shared_lighting").setCount).toBe(2);
    expect(byId("shared").setCount).toBe(2); // subtree
    expect(byId("essentials").setCount).toBe(1);
    expect(byId("person").applicable).toBe(false); // landscape subject
    expect(byId("person_face").applicable).toBe(false);
    expect(byId("person_face").setCount).toBe(1); // value kept even when not applicable
    expect(byId("person_pose").approved).toBe(false); // draft in the fixture catalog only (approved in the product since 2-B.6)
  });

  it("warning and block badges follow diagnostics for attributes in the subtree", () => {
    const warn = buildSpec(core, [["scene.setting", single("studio")], ["lighting.preset", single("golden_hour")]]);
    const tree = flattenCategoryTree(buildCategoryTree(core, warn, compilePrompt(warn, core).diagnostics));
    expect(tree.find((n) => n.category.id === "shared_lighting")!.warningCount).toBe(1);
    expect(tree.find((n) => n.category.id === "shared_scene")!.warningCount).toBe(1);
    expect(tree.find((n) => n.category.id === "shared_camera")!.warningCount).toBe(0);

    const blocked = buildSpec(core, [["intent.description", text("sexy schoolgirl")]]);
    const t2 = flattenCategoryTree(buildCategoryTree(core, blocked, compilePrompt(blocked, core).diagnostics));
    expect(t2.find((n) => n.category.id === "essentials")!.blocked).toBe(true);
    expect(t2.find((n) => n.category.id === "shared")!.blocked).toBe(false);
  });

  it("adding a category and attribute as DATA shows up without code changes", () => {
    const c = cloneCore();
    c.categories!.push({ id: "shared_extra", parentId: "shared", order: 99, status: "approved", label: { en: "Extra", ko: "추가" } });
    c.attributes.push({ id: "x.extra", domain: "x", status: "approved", categoryId: "shared_extra", type: "text", tier: "detailed", order: 999, maxLength: 20, label: { en: "Extra" }, prompt: { template: "{value}" } });
    const reg = CatalogRegistry.createOrThrow(placeUnlistedByOrder(c));
    const node = flattenCategoryTree(buildCategoryTree(reg, createEmptySpec(reg), [])).find((n) => n.category.id === "shared_extra")!;
    expect(node.attributes.map((a) => a.id)).toEqual(["x.extra"]);
  });
});

describe("catalog-wide search (ko/en/aliases)", () => {
  const first = (q: string) => searchCatalog(fx, q)[0];
  it.each([
    ["골든아워", "option", "lighting.preset", "golden_hour"], // “골든/golden” alone now also matches skin tone and hair colors (2-B.3)
    ["golden hour", "option", "lighting.preset", "golden_hour"],
    ["색온도", "attribute", "lighting.color_temperature", undefined],
    ["윤곽", "attribute", "person.face.shape", undefined], // product attribute alias (Sprint 2-B.2) ranks before the test-only one
    ["business suit", "option", "x.wardrobe.style", "business_suit"], // “정장” alone now also matches the product fashion style “business” (2-B.5)
    ["정장", "option", "person.clothing.fashion_style", "business"],
  ])("%s → %s %s %s", (q, kind, attributeId, optionId) => {
    const h = first(q)!;
    expect(h.kind).toBe(kind);
    expect(h.attributeId).toBe(attributeId);
    if (optionId) expect(h.optionId).toBe(optionId);
  });

  it("finds draft categories by name but never unexposed attributes", () => {
    expect(searchCatalog(core, "자세 및 행동")[0]).toMatchObject({ kind: "category", categoryId: "person_pose" });
    expect(searchCatalog(fx, "보류 샘플")).toEqual([]);
    expect(searchCatalog(core, "매체").filter((h) => h.attributeId === "style.medium")).toEqual([]);
  });
});

describe("numeric semantics (D9): raw number stored losslessly, expression by semantics", () => {
  it("degree → qualitative band text; the raw number survives JSON round-trip", () => {
    const spec = buildSpec(fx, [["x.expression.smile", num(35)]]);
    expect(compilePrompt(spec, fx).prompt).toBe("Expression: a gentle smile.");
    expect(compilePrompt(spec, fx).prompt).not.toContain("35");
    const r = importSpecJson(exportSpecJson(spec), fx);
    expect(r.status === "valid" && r.spec.selections["x.expression.smile"]!.value).toEqual({ kind: "number", value: 35 });
  });

  it("band boundaries are inclusive and deterministic", () => {
    const out = (v: number) => compilePrompt(buildSpec(fx, [["x.expression.smile", num(v)]]), fx).prompt;
    expect(out(0)).toBe("Expression: a barely-there smile.");
    expect(out(20)).toBe("Expression: a barely-there smile.");
    expect(out(25)).toBe("Expression: a gentle smile.");
    expect(out(100)).toBe("Expression: a broad, beaming smile.");
  });

  it("physical and ratio values keep their number and unit", () => {
    expect(compilePrompt(buildSpec(fx, [["x.body.height", num(172)]]), fx).prompt).toBe("Height: about 172 cm.");
    expect(compilePrompt(buildSpec(fx, [["x.camera.subject_position", num(40)]]), fx).prompt).toBe("Subject placed 40% from the left edge.");
    expect(compilePrompt(buildSpec(fx, [["x.scene.people_count", { kind: "range", min: 2, max: 4 }]]), fx).prompt).toBe("Number of people: 2 to 4.");
  });

  it("registry rejects degree numbers without bands, bands on physical numbers, physical numbers without unit", () => {
    const mk = (patch: Record<string, unknown>) => {
      const c = cloneCore();
      c.attributes.push({ id: "x.n", domain: "x", status: "approved", type: "number", tier: "detailed", order: 1, min: 0, max: 10, label: { en: "n" }, prompt: { template: "{value}" }, ...patch } as never);
      return CatalogRegistry.create(c).diagnostics.map((d) => d.code);
    };
    expect(mk({ semantics: "degree" })).toContain("catalog.missing_bands");
    expect(mk({ semantics: "physical", unit: "cm", bands: [{ upTo: 10, label: { en: "x" }, text: "x" }] })).toContain("catalog.invalid_bands");
    expect(mk({ semantics: "physical" })).toContain("catalog.missing_unit");
    expect(mk({ semantics: "degree", bands: [{ upTo: 5, label: { en: "a" }, text: "a" }] })).toContain("catalog.invalid_bands"); // does not cover max
  });
});

describe("controls vs data types", () => {
  it.each([
    [{ type: "text", maxLength: 5, control: "slider" }, "catalog.control_type_mismatch"],
    [{ type: "number", min: 0, max: 1, unit: "x", control: "dropdown" }, "catalog.control_type_mismatch"],
    [{ type: "multi", control: "dropdown", options: [{ id: "a", label: { en: "a" }, prompt: { text: "a" } }] }, "catalog.control_type_mismatch"],
    [{ type: "single", control: "color", options: [{ id: "a", label: { en: "a" }, prompt: { text: "a" } }] }, "catalog.missing_swatch"],
  ])("rejects %o", (patch, code) => {
    const c = cloneCore();
    c.attributes.push({ id: "x.c", domain: "x", status: "approved", tier: "detailed", order: 1, label: { en: "c" }, prompt: { template: "{value}" }, ...patch } as never);
    expect(CatalogRegistry.create(c).diagnostics.map((d) => d.code)).toContain(code);
  });

  it("the same single attribute can be represented by several controls", () => {
    for (const control of ["chips", "dropdown", "cards", "searchable"]) {
      const c = cloneCore();
      coreAttr(c, "scene.background").control = control as never;
      expect(CatalogRegistry.create(c).ok, control).toBe(true);
    }
  });
});

describe("policy restrictions (D5)", () => {
  it("an option restricted by age is reported and the whole output is withheld; the spec is preserved", () => {
    const spec = buildSpec(fx, [["x.expression.appeal", single("alluring")], ["x.identity.age_group", single("minor")]]);
    const before = structuredClone(spec);
    const c = compilePrompt(spec, fx);
    expect(c.blocked).toBe(true);
    expect(getPromptOutput(c)).toEqual({ ok: false, reason: "blocked" });
    expect(c.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["selection.restricted", "policy.restricted_selection"]));
    expect(spec).toEqual(before);
    expect(exportSpecJson(spec)).toContain('"alluring"');
  });

  it("the same appeal is permitted for adults, and coverage/fit are not restricted for minors", () => {
    expect(compilePrompt(buildSpec(fx, [["x.identity.age_group", single("adult")], ["x.expression.appeal", single("alluring")]]), fx).blocked).toBe(false);
    expect(compilePrompt(buildSpec(fx, [["x.identity.age_group", single("minor")], ["x.wardrobe.coverage", single("minimal")]]), fx).blocked).toBe(false);
  });
});

describe("semantic units: direct selections vs preset phrases (D3)", () => {
  it("parts of every core lighting preset render exactly the Sprint 1 text", () => {
    const lp = core.getAttribute("lighting.preset")!;
    if (lp.type !== "single") throw new Error();
    for (const o of lp.options) if (o.prompt.parts) expect(renderPhraseParts(o.prompt.parts)).toBe(o.prompt.text);
  });

  it("equivalent meaning is output once, attributed to the direct selection", () => {
    const spec = buildSpec(core, [["lighting.preset", single("golden_hour")], ["lighting.color_temperature", single("warm")]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Lighting: golden-hour sunlight. Color temperature: warm.");
    expect(c.prompt.match(/warm/g)).toHaveLength(1);
    expect(c.fragments.find((f) => f.attributeId === "lighting.preset")!.takenOverBy).toEqual([{ attributeId: "lighting.color_temperature", relation: "equivalent" }]);
    expect(c.diagnostics.map((d) => d.code)).not.toContain("preset.unit_overridden");
  });

  it("same attribute, different value: the direct choice wins, the preset's unit is replaced, the preset selection is preserved", () => {
    const spec = buildSpec(core, [["lighting.preset", single("golden_hour")], ["lighting.color_temperature", single("cool")]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Lighting: golden-hour sunlight. Color temperature: cool.");
    expect(c.prompt).not.toContain("warm");
    expect(c.diagnostics.find((d) => d.code === "preset.unit_overridden")).toMatchObject({ severity: "info", involves: ["lighting.preset", "lighting.color_temperature"] });
    expect(spec.selections["lighting.preset"]!.value).toEqual(single("golden_hour")); // never deleted
    expect(c.diagnostics.filter((d) => d.severity === "warning")).toEqual([]); // not a conflict
  });

  it("list units drop cleanly (no dangling separators)", () => {
    const out = (ct?: string, intensity?: string) =>
      compilePrompt(
        buildSpec(core, [
          ["lighting.preset", single("moonlight")],
          ...(ct ? [["lighting.color_temperature", single(ct)] as [string, SelectionValue]] : []),
          ...(intensity ? [["lighting.intensity", single(intensity)] as [string, SelectionValue]] : []),
        ]),
        core,
      ).fragments[0]!.text;
    expect(out()).toBe("Lighting: dim, cool moonlight.");
    expect(out("warm")).toBe("Lighting: dim moonlight.");
    expect(out(undefined, "bright")).toBe("Lighting: cool moonlight.");
    expect(out("warm", "bright")).toBe("Lighting: moonlight.");
  });

  it("a property the preset does not state is simply added (no dedupe, no conflict)", () => {
    const c = compilePrompt(buildSpec(core, [["lighting.preset", single("golden_hour")], ["lighting.direction", single("front")]]), core);
    expect(c.prompt).toBe("Lighting: warm golden-hour sunlight. Light direction: front lighting.");
  });

  it("different visual axes are not treated as conflicts (golden hour + cool color grading)", () => {
    const spec = buildSpec(fx, [["lighting.preset", single("golden_hour")], ["x.grading.tone", single("cool")]]);
    const c = compilePrompt(spec, fx);
    expect(c.prompt).toBe("Lighting: warm golden-hour sunlight. Color grading: cool, teal-leaning tones.");
    expect(c.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
  });

  it("a genuine conflict is a warning with guidance, distinct from a safety block", () => {
    const spec = buildSpec(core, [["lighting.preset", single("backlit_rim")], ["lighting.direction", single("front")]]);
    const c = compilePrompt(spec, core);
    const d = c.diagnostics.find((x) => x.ruleId === "backlight-vs-direction")!;
    expect(d.severity).toBe("warning");
    expect(c.blocked).toBe(false);
    expect(c.prompt).toContain("Light direction: front lighting.");
  });

  it("Sprint 1 prompts are unchanged when nothing overrides them (regression)", () => {
    const expected = JSON.parse(fixture("sprint1", "expected-prompts.json"));
    for (const [file, key] of [["export-full.json", "full"], ["export-inactive.json", "inactive"]] as const) {
      const r = importSpecJson(fixture("sprint1", file), core);
      expect(r.status).toBe("valid");
      if (r.status === "valid") expect(compilePrompt(r.spec, core).prompt).toBe(expected[key]);
    }
  });

  it("registry rejects parts that do not render to the text or use unknown axes", () => {
    const c = cloneCore();
    const gh = coreAttr(c, "lighting.preset").options.find((o) => o.id === "golden_hour")!;
    gh.prompt = { ...gh.prompt, parts: [{ axis: "lighting.color_temperature", values: ["warm"], text: "warm" }, "golden sunlight"] };
    expect(CatalogRegistry.create(c).diagnostics.map((d) => d.code)).toContain("catalog.parts_mismatch");
    gh.prompt = { ...gh.prompt, parts: [{ axis: "ghost.axis", values: ["x"], text: "warm" }, "golden-hour sunlight"] };
    expect(CatalogRegistry.create(c).diagnostics.map((d) => d.code)).toContain("catalog.invalid_parts");
  });
});

describe("composite presets (plan → confirm → apply → undo)", () => {
  const person = () => buildSpec(fx, [["subject.kind", single("person")]]);

  it("plan classifies every patch and never changes the spec", () => {
    const spec = buildSpec(fx, [
      ["subject.kind", single("person")],
      ["composition.framing", single("full_body")], // will change
      ["scene.background", single("blurred")], // same
      ["mood.tone", multi("calm")], // untouched
    ]);
    const before = structuredClone(spec);
    const plan = planPreset(spec, fx, "p_soft_portrait");
    if (!plan.ok) throw new Error();
    expect(plan.value.entries.map((e) => [e.attributeId, e.kind])).toEqual([
      ["composition.framing", "change"],
      ["scene.background", "same"],
      ["lighting.preset", "new"],
      ["x.expression.smile", "new"],
    ]);
    expect(plan.value.untouched).toEqual(["subject.kind", "mood.tone"]);
    expect(plan.value.requiresOverwriteConfirmation).toBe(true);
    expect(spec).toEqual(before);
  });

  it("marks patches that do not apply to the subject and predicts conflicts", () => {
    const plan = planPreset(person(), fx, "p_wide_landscape");
    if (!plan.ok) throw new Error();
    expect(plan.value.entries.find((e) => e.attributeId === "composition.framing")!.kind).toBe("inapplicable");
    const withStudio = planPreset(buildSpec(fx, [["scene.setting", single("studio")]]), fx, "p_golden_scene");
    if (!withStudio.ok) throw new Error();
    expect(withStudio.value.conflictsAfter.map((d) => d.ruleId)).toEqual(["sky-light-in-studio"]);
  });

  it("restricted patches are flagged and never written", () => {
    const spec = buildSpec(fx, [["x.identity.age_group", single("minor")]]);
    const plan = planPreset(spec, fx, "p_alluring_look");
    if (!plan.ok) throw new Error();
    expect(plan.value.entries.map((e) => [e.attributeId, e.kind])).toEqual([
      ["x.expression.appeal", "restricted"],
      ["x.wardrobe.coverage", "new"],
    ]);
    const { spec: after } = applyPresetPlan(spec, fx, plan.value, "all");
    expect(after.selections["x.expression.appeal"]).toBeUndefined();
    expect(compilePrompt(after, fx).blocked).toBe(false);
  });

  it("apply writes only new/changed patches with persistent provenance; unrelated attributes keep their identity", () => {
    const spec = buildSpec(fx, [["subject.kind", single("person")], ["composition.framing", single("full_body")], ["mood.tone", multi("calm")]]);
    const plan = planPreset(spec, fx, "p_soft_portrait");
    if (!plan.ok) throw new Error();
    const { spec: onlyEmpty } = applyPresetPlan(spec, fx, plan.value, "onlyEmpty");
    expect(onlyEmpty.selections["composition.framing"]).toBe(spec.selections["composition.framing"]); // not overwritten
    const { spec: all, transaction } = applyPresetPlan(spec, fx, plan.value, "all");
    expect(all.selections["composition.framing"]).toEqual({ value: single("head_and_shoulders"), source: "preset", origin: { presetId: "p_soft_portrait", presetVersion: "1.0.0" } });
    expect(all.selections["mood.tone"]).toBe(spec.selections["mood.tone"]);
    expect(all.selections["subject.kind"]).toBe(spec.selections["subject.kind"]);
    expect(transaction.changes.map((c) => c.attributeId)).toEqual(["composition.framing", "scene.background", "lighting.preset", "x.expression.smile"]);
    // provenance survives JSON and storage
    const r = importSpecJson(exportSpecJson(all), fx);
    expect(r.status === "valid" && r.spec).toEqual(all);
  });

  it("undo restores only what the preset changed and the user has not touched since", () => {
    const spec = buildSpec(fx, [["subject.kind", single("person")], ["composition.framing", single("full_body")]]);
    const plan = planPreset(spec, fx, "p_soft_portrait");
    if (!plan.ok) throw new Error();
    let { spec: s, transaction: tx } = applyPresetPlan(spec, fx, plan.value, "all");
    // user edits smile after the preset, an unrelated attribute too
    s = (applySelection(s, fx, "x.expression.smile", num(90)) as { ok: true; value: ImageSpec }).value;
    tx = markUserEdited(tx, "x.expression.smile");
    s = (applySelection(s, fx, "mood.tone", multi("dramatic")) as { ok: true; value: ImageSpec }).value;
    tx = markUserEdited(tx, "mood.tone"); // not part of the preset → no effect
    const undone = undoPresetTransaction(s, tx);
    expect(undone.restored).toEqual(["composition.framing", "scene.background", "lighting.preset"]);
    expect(undone.kept).toEqual(["x.expression.smile"]);
    expect(undone.spec.selections["composition.framing"]).toBe(spec.selections["composition.framing"]);
    expect(undone.spec.selections["lighting.preset"]).toBeUndefined();
    expect(undone.spec.selections["x.expression.smile"]!.value).toEqual(num(90));
    expect(undone.spec.selections["mood.tone"]!.value).toEqual(multi("dramatic"));
  });

  it("a value changed by the user and changed BACK to the preset value is still protected from undo", () => {
    const plan = planPreset(person(), fx, "p_soft_portrait");
    if (!plan.ok) throw new Error();
    let { spec: s, transaction: tx } = applyPresetPlan(person(), fx, plan.value, "all");
    s = (applySelection(s, fx, "lighting.preset", single("neon")) as { ok: true; value: ImageSpec }).value;
    tx = markUserEdited(tx, "lighting.preset");
    s = (applySelection(s, fx, "lighting.preset", single("studio_softbox")) as { ok: true; value: ImageSpec }).value; // same as preset again
    const undone = undoPresetTransaction(s, tx);
    expect(undone.kept).toContain("lighting.preset");
    expect(undone.spec.selections["lighting.preset"]).toEqual({ value: single("studio_softbox"), source: "user" });
  });

  it("a direct edit removes preset provenance (user > preset)", () => {
    const plan = planPreset(person(), fx, "p_soft_portrait");
    if (!plan.ok) throw new Error();
    const { spec: s } = applyPresetPlan(person(), fx, plan.value, "all");
    const edited = applySelection(s, fx, "composition.framing", single("upper_body"));
    expect(edited.ok && edited.value.selections["composition.framing"]).toEqual({ value: single("upper_body"), source: "user" });
    expect(clearSelection(s, "composition.framing").selections["composition.framing"]).toBeUndefined();
  });

  it("re-applying a preset over a user value is a 'change' requiring confirmation; a same value stays user-owned", () => {
    const spec = buildSpec(fx, [["subject.kind", single("person")], ["lighting.preset", single("studio_softbox")]]);
    const plan = planPreset(spec, fx, "p_soft_portrait");
    if (!plan.ok) throw new Error();
    expect(plan.value.entries.find((e) => e.attributeId === "lighting.preset")!.kind).toBe("same");
    const { spec: after } = applyPresetPlan(spec, fx, plan.value, "all");
    expect(after.selections["lighting.preset"]!.source).toBe("user");
  });

  it("a preset combined with the Basic lighting preset does not duplicate meaning", () => {
    const plan = planPreset(createEmptySpec(fx), fx, "p_golden_scene");
    if (!plan.ok) throw new Error();
    const { spec } = applyPresetPlan(createEmptySpec(fx), fx, plan.value, "all");
    const c = compilePrompt(spec, fx);
    expect(c.prompt).toBe("Mood: calm. Lighting: golden-hour sunlight. Color temperature: warm.");
  });

  it("registry rejects presets with invalid patches", () => {
    const c = buildFixtureCatalog();
    c.presets![0]!.patches.push({ attributeId: "composition.framing", value: single("nope") });
    expect(CatalogRegistry.create(c).diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["catalog.invalid_preset"]));
  });
});

describe("ImageSpec 0.2.0 compatibility (D2)", () => {
  it("origin is only valid with source 'preset'", () => {
    const spec = buildSpec(core, [["subject.kind", single("person")]]);
    const bad = { ...spec, selections: { "subject.kind": { value: single("person"), source: "user", origin: { presetId: "p", presetVersion: "1.0.0" } } } };
    expect(validateSpecAgainstCatalog(spec, core)).toEqual([]);
    const r = importSpecJson(JSON.stringify(bad), core);
    expect(r.status).toBe("recoverable");
  });

  it("Sprint 1 JSON and localStorage data load losslessly with no warnings", () => {
    const raw = JSON.parse(fixture("sprint1", "export-full.json"));
    const r = importSpecJson(fixture("sprint1", "export-full.json"), core);
    expect(r.status).toBe("valid");
    if (r.status !== "valid") return;
    expect(r.spec.schemaVersion).toBe("0.3.0"); // migrated 0.1.0 → 0.2.0 → 0.3.0 (version-only steps)
    expect(r.spec.catalog).toEqual({ id: "prompter.core", version: "0.14.0" });
    expect(r.spec.selections).toEqual(raw.selections);
    expect(r.migrations).toEqual([]);
    expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);

    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: fixture("sprint1", "localstorage-workspace.txt") });
    const loaded = createSpecStorage(store, core).load();
    expect(loaded.status).toBe("loaded");
    expect(loaded.status === "loaded" && loaded.spec.selections).toEqual(raw.selections);
    expect(loaded.status === "loaded" && loaded.migrations).toEqual([]);
  });

  it("Sprint 1 inapplicable selections stay kept and excluded", () => {
    const r = importSpecJson(fixture("sprint1", "export-inactive.json"), core);
    expect(r.status === "valid" && r.spec.selections["composition.framing"]!.value).toEqual(single("full_body"));
  });

  it("new exports are 0.3.0 (older apps cannot read them — documented limitation)", () => {
    expect(JSON.parse(exportSpecJson(createEmptySpec(core))).schemaVersion).toBe("0.3.0");
  });
});
