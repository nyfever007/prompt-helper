import { describe, expect, it } from "vitest";
import {
  baselinePolicy,
  compilePrompt,
  evaluateSafety,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  isOptionAttribute,
  resetCategory,
  restoreCategoryReset,
  searchCatalog,
  setPromptExclusion,
  type SelectionValue,
} from "@/domain";
import { buildSpec, multi, single, text } from "../fixtures/specs";

/** Sprint 2-B.5A — Person › Expression (10), Visual impression & appeal (8), Makeup (16). */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const out = (entries: Array<[string, SelectionValue]>) => compilePrompt(buildSpec(core, entries), core);
const prompt = (entries: Array<[string, SelectionValue]>) => out(entries).prompt;
const codes = (entries: Array<[string, SelectionValue]>) => out(entries).diagnostics.map((d) => d.code);
const E = (x: string) => `person.expression.${x}`;
const I = (x: string) => `person.impression.${x}`;
const M = (x: string) => `person.makeup.${x}`;
const area = core.attributes().filter((a) => /^person\.(expression|impression|makeup)\./.test(a.id));

/** Approved English vocabulary (directive §2–§4), reproduced independently: id → [category, template, option ids | band texts]. */
const APPROVED: Record<string, [string, string, string[]]> = {
  [E("emotion")]: ["person_expression_face", "Emotion: {value}.", ["neutral", "happy", "sad", "angry", "surprised", "fearful", "disgusted", "contemptuous", "embarrassed", "curious", "bored", "content", "confused", "worried", "determined", "excited"]],
  [E("emotion_intensity")]: ["person_expression_face", "Emotional expression intensity: {value}.", ["very subtle", "subtle", "moderate", "strong", "very intense"]],
  [E("smile")]: ["person_expression_face", "Smile: {value}.", ["none", "gentle", "faint", "broad", "closed_mouth", "open_mouth", "asymmetric"]],
  [E("mouth_openness")]: ["person_expression_face", "Mouth: {value}.", ["closed", "slightly_parted", "open", "wide_open"]],
  [E("teeth")]: ["person_expression_face", "Teeth: {value}.", ["none", "partial", "clear"]],
  [E("eye_openness")]: ["person_expression_face", "Eyes: {value}.", ["closed", "half_closed", "natural", "wide_open"]],
  [E("brow_movement")]: ["person_expression_face", "Eyebrow movement: {value}.", ["neutral", "raised", "lowered", "furrowed", "one_raised"]],
  [E("gaze_state")]: ["person_expression_face", "Gaze: {value}.", ["focused", "relaxed", "distant", "alert", "distracted", "thoughtful"]],
  [E("tears")]: ["person_expression_face", "Tears: {value}.", ["none", "watery", "welling", "streaming"]],
  [E("facial_tension")]: ["person_expression_face", "Facial tension: {value}.", ["very relaxed", "relaxed", "moderate", "tense", "highly tense"]],
  [I("overall")]: ["person_expression_impression", "Visual impression: {value}.", ["approachable", "gentle", "reserved", "cool", "warm", "strong", "mysterious", "dignified", "relaxed", "refined", "intimidating", "innocent"]],
  [I("vibe")]: ["person_expression_impression", "Personal vibe: {value}.", ["elegant", "sophisticated", "luxurious", "understated", "urban", "classic", "rustic", "ethereal", "graceful", "playful", "rebellious"]],
  [I("attractiveness")]: ["person_expression_impression", "Visual appeal: {value}.", ["natural", "subtle", "attractive", "striking", "exceptional"]],
  [I("cuteness")]: ["person_expression_impression", "Cute appearance: {value}.", ["minimal", "slight", "moderate", "notable", "pronounced"]],
  [I("elegance")]: ["person_expression_impression", "Elegance: {value}.", ["subtle", "slightly elegant", "moderately elegant", "elegant", "highly elegant"]],
  [I("charisma")]: ["person_expression_impression", "Visual presence: {value}.", ["subtle", "noticeable", "moderate", "strong", "commanding"]],
  [I("androgyny")]: ["person_expression_impression", "Androgynous appearance: {value}.", ["subtle", "slight", "moderate", "notable", "pronounced"]],
  [I("maturity")]: ["person_expression_impression", "Apparent maturity: {value}.", ["youthful", "neutral", "mature", "highly_mature"]],
  [M("presence")]: ["person_makeup", "Makeup: {value}.", ["none", "applied"]],
  [M("style")]: ["person_makeup", "Makeup style: {value}.", ["natural", "everyday", "soft_glam", "full_glam", "smoky", "vintage", "retro", "gothic", "editorial", "theatrical", "fantasy", "avant_garde", "korean_style", "graphic"]],
  [M("intensity")]: ["person_makeup", "Makeup intensity: {value}.", ["very subtle", "subtle", "moderate", "heavy", "very heavy"]],
  [M("base_coverage")]: ["person_makeup", "Foundation coverage: {value}.", ["sheer", "light", "medium", "full"]],
  [M("base_finish")]: ["person_makeup", "Foundation finish: {value}.", ["matte", "semi_matte", "satin", "natural", "dewy", "luminous"]],
  [M("eyeshadow_color")]: ["person_makeup", "Eyeshadow colors: {value}.", []],
  [M("eyeshadow_style")]: ["person_makeup", "Eyeshadow style: {value}.", ["single", "gradient", "smoky", "shimmer", "glitter", "cut_crease", "graphic"]],
  [M("eyeliner_style")]: ["person_makeup", "Eyeliner: {value}.", ["none", "natural", "tightline", "winged", "cat_eye", "graphic", "double_wing"]],
  [M("eyeliner_color")]: ["person_makeup", "Eyeliner color: {value}.", []],
  [M("mascara")]: ["person_makeup", "Mascara: {value}.", ["none", "natural", "lengthening", "volumizing", "dramatic"]],
  [M("false_lashes")]: ["person_makeup", "False eyelashes: {value}.", ["none", "natural", "wispy", "full", "dramatic"]],
  [M("blush_color")]: ["person_makeup", "Blush color: {value}.", []],
  [M("blush_placement")]: ["person_makeup", "Blush placement: {value}.", ["apples", "cheekbones", "temples", "across_nose", "under_eyes"]],
  [M("lip_color")]: ["person_makeup", "Lip makeup color: {value}.", []],
  [M("lip_finish")]: ["person_makeup", "Lip finish: {value}.", ["matte", "velvet", "satin", "glossy", "sheer", "metallic"]],
  [M("contour")]: ["person_makeup", "Contouring and highlighting: {value}.", ["none", "subtle", "moderate", "defined", "dramatic"]],
};

/** Directive §4 makeup color vocabulary (8 display groups). */
const MAKEUP_PALETTE: Record<string, string[]> = {
  neutral: ["ivory", "beige", "nude beige", "taupe", "caramel", "brown"],
  pink: ["pale pink", "soft pink", "dusty pink", "rose", "dusty rose", "hot pink"],
  red: ["coral red", "classic red", "cherry red", "crimson", "brick red", "burgundy"],
  orange: ["peach", "apricot", "coral", "terracotta"],
  purple: ["mauve", "plum", "lavender", "violet"],
  dark: ["charcoal", "black", "deep brown"],
  metallic: ["gold", "rose gold", "bronze", "copper", "silver"],
  creative: ["white", "blue", "teal", "green", "mint", "yellow"],
};

describe("registration and integrity (34 new attributes, order 354–387)", () => {
  it("registers exactly the approved attributes in catalog order as approved Direct attributes with the output toggle", () => {
    expect(area.map((a) => a.id)).toEqual(Object.keys(APPROVED));
    expect(area.map((a) => a.order)).toEqual(Array.from({ length: 34 }, (_, i) => 354 + i));
    for (const a of area) {
      const [cat, template, list] = APPROVED[a.id]!;
      expect(a.categoryId, a.id).toBe(cat);
      expect(a.prompt.template, a.id).toBe(template);
      expect(a.status, a.id).toBe("approved");
      expect(a.expression?.role, a.id).toBe("direct");
      expect(a.outputToggle, a.id).toBe(true);
      expect(a.label.ko && a.label.en && a.aliases?.length, a.id).toBeTruthy();
      expect(core.isExposed(a, "detailed"), a.id).toBe(true);
      if (list.length === 0) continue;
      if (isOptionAttribute(a)) expect(a.options.map((o) => o.id), a.id).toEqual(list);
      else expect(a.type === "number" && a.bands?.map((b) => b.text), a.id).toEqual(list);
    }
  });

  it("expression has 2 subcategories (표정 / 인상 및 매력); makeup is one page", () => {
    expect(core.categories.filter((c) => c.parentId === "person_expression").map((c) => [c.id, c.label.ko])).toEqual([
      ["person_expression_face", "표정"],
      ["person_expression_impression", "인상 및 매력"],
    ]);
    expect(core.getCategory("person_makeup")?.status).toBe("approved");
    expect(core.categories.filter((c) => c.parentId === "person_makeup")).toEqual([]);
  });

  it("the four makeup color attributes share the 40-color makeup palette in 8 display groups, with custom names allowed", () => {
    for (const id of [M("eyeshadow_color"), M("eyeliner_color"), M("blush_color"), M("lip_color")]) {
      const a = core.getAttribute(id)!;
      expect(a.type === "multi" || a.type === "single").toBe(true);
      if (!isOptionAttribute(a)) continue;
      expect(a.control, id).toBe("color");
      expect(a.optionGroups?.map((g) => g.id), id).toEqual(Object.keys(MAKEUP_PALETTE));
      for (const [group, colors] of Object.entries(MAKEUP_PALETTE)) {
        expect(a.options.filter((o) => o.group === group).map((o) => o.prompt.text), `${id}/${group}`).toEqual(colors);
      }
      expect(a.options).toHaveLength(40);
      expect(a.options.every((o) => /^#[0-9a-f]{6}$/.test(o.swatch ?? ""))).toBe(true);
      expect(a.custom, id).toBeDefined();
    }
    expect(core.getAttribute(M("eyeshadow_color"))!.type).toBe("multi"); // several eyeshadow colors combine
  });

  it("every option and band compiles alone to exactly its sentence", () => {
    for (const a of area) {
      if (isOptionAttribute(a)) {
        for (const o of a.options) {
          expect(prompt([[a.id, a.type === "single" ? single(o.id) : multi(o.id)]]), `${a.id}/${o.id}`).toBe(a.prompt.template.replace("{value}", o.prompt.text));
        }
      } else if (a.type === "number") {
        a.bands!.forEach((b, i) => expect(prompt([[a.id, num(i + 1)]]), `${a.id}/${i + 1}`).toBe(a.prompt.template.replace("{value}", b.text)));
      }
    }
  });
});

describe("expression (directive §2)", () => {
  it("emotion and intensity are independent; an emotion sets no eyes, mouth or brows; mixed emotions combine", () => {
    const spec = buildSpec(core, [[E("emotion"), multi("happy", "surprised")]]);
    expect(Object.keys(spec.selections)).toEqual([E("emotion")]);
    expect(compilePrompt(spec, core).prompt).toBe("Emotion: happy, surprised.");
    expect(prompt([[E("emotion"), multi("sad")], [E("emotion_intensity"), num(2)]])).toBe("Emotion: sad. Emotional expression intensity: subtle.");
    expect(prompt([[E("emotion_intensity"), num(5)]])).toBe("Emotional expression intensity: very intense."); // intensity alone, no emotion
  });

  it("explicit “no smile / no tears / no visible teeth” differ from unset", () => {
    expect(prompt([[E("smile"), multi("none")], [E("teeth"), single("none")], [E("tears"), single("none")]])).toBe("Smile: no smile. Teeth: no visible teeth. Tears: no tears.");
    expect(prompt([[E("gaze_state"), single("thoughtful")]])).toBe("Gaze: thoughtful.");
  });

  it("smile: degree × mouth × asymmetry combine; only real contradictions warn (non-blocking, nothing changed)", () => {
    expect(prompt([[E("smile"), multi("gentle", "closed_mouth", "asymmetric")]])).toBe("Smile: gentle smile, closed-mouth smile, asymmetric smile.");
    expect(codes([[E("smile"), multi("gentle", "closed_mouth", "asymmetric")]]).filter((c) => c.startsWith("rule."))).toEqual([]);
    expect(codes([[E("smile"), multi("none", "gentle")]])).toContain("rule.expression-smile-none-with-others");
    expect(codes([[E("smile"), multi("faint", "broad")]])).toContain("rule.expression-smile-faint-vs-broad");
    expect(codes([[E("smile"), multi("faint", "gentle")]]).filter((c) => c.startsWith("rule."))).toEqual([]); // a faint, gentle smile is not a contradiction
    expect(codes([[E("smile"), multi("closed_mouth", "open_mouth")]])).toContain("rule.expression-smile-closed-mouth-vs-open-mouth");
    const c = out([[E("mouth_openness"), single("closed")], [E("teeth"), single("clear")]]);
    expect(c.diagnostics.map((d) => d.code)).toContain("rule.expression-closed-mouth-vs-visible-teeth");
    expect(c.blocked).toBe(false);
    expect(c.prompt).toBe("Mouth: closed. Teeth: clearly visible teeth.");
    expect(codes([[E("eye_openness"), single("closed")], [E("gaze_state"), single("focused")]])).toContain("rule.expression-closed-eyes-vs-gaze");
    expect(codes([[E("eye_openness"), single("half_closed")], [E("gaze_state"), single("focused")]])).not.toContain("rule.expression-closed-eyes-vs-gaze");
  });

  it("temporary expression is independent of facial anatomy: both are stored and output separately", () => {
    const spec = buildSpec(core, [["person.eyes.size", num(4)], ["person.lips.upper_thickness", num(2)], [E("eye_openness"), single("wide_open")], [E("mouth_openness"), single("slightly_parted")]]);
    expect(compilePrompt(spec, core).prompt).toBe("Eye size: large. Upper lip: thin. Mouth: slightly parted. Eyes: wide open.");
    const changed = buildSpec(core, [["person.eyes.size", num(4)], ["person.lips.upper_thickness", num(2)], [E("eye_openness"), single("closed")], [E("mouth_openness"), single("slightly_parted")]]);
    expect(changed.selections["person.eyes.size"]).toEqual(spec.selections["person.eyes.size"]);
    expect(changed.selections["person.lips.upper_thickness"]).toEqual(spec.selections["person.lips.upper_thickness"]);
  });
});

describe("impression & appeal (directive §3)", () => {
  it("impressions and vibes combine; nothing is converted into face, skin or body values", () => {
    const spec = buildSpec(core, [[I("overall"), multi("approachable", "refined")], [I("vibe"), multi("elegant", "urban")], [I("attractiveness"), single("striking")]]);
    expect(Object.keys(spec.selections).sort()).toEqual([I("attractiveness"), I("overall"), I("vibe")]);
    expect(compilePrompt(spec, core).prompt).toBe("Visual impression: approachable, refined. Personal vibe: elegant, urban. Visual appeal: strikingly attractive.");
  });

  it("maturity impressions never change the age assessment (not an adulthood basis)", () => {
    for (const m of ["youthful", "neutral", "mature", "highly_mature"]) {
      expect(out([[I("maturity"), single(m)]]).age.ageClass, m).toBe("unknown");
      expect(out([["person.identity.age_group", single("adolescent")], [I("maturity"), single(m)]]).age.ageClass, m).toBe("minor");
      expect(out([["person.identity.age", { kind: "number", value: 30, unit: "years" }], [I("maturity"), single(m)]]).age.ageClass, m).toBe("adult");
    }
  });

  it("“youthful-looking” keeps the existing ambiguous-age protection; appeal wording alone never blocks", () => {
    const youthful = buildSpec(core, [["intent.description", text("a sexy pose")], [I("maturity"), single("youthful")]]);
    expect(compilePrompt(youthful, core).blocked).toBe(true);
    expect(compilePrompt(setPromptExclusion(youthful, I("maturity"), true), core).blocked).toBe(true); // excluded values are still checked
    expect(out([["intent.description", text("a sexy pose")], [I("maturity"), single("mature")]]).blocked).toBe(false);
    // Non-sexual appeal / cuteness for any age is allowed
    expect(out([["person.identity.age_group", single("child")], [I("attractiveness"), single("exceptional")], [I("cuteness"), num(5)], [I("overall"), multi("innocent")]]).blocked).toBe(false);
  });

  it("no expression, impression or makeup phrase raises a safety signal on its own", () => {
    for (const a of area) {
      const texts = isOptionAttribute(a) ? a.options.map((o) => o.prompt.text) : a.type === "number" ? (a.bands ?? []).map((b) => b.text) : [];
      const report = evaluateSafety({ tags: [], texts: texts.map((t) => ({ attributeId: a.id, text: a.prompt.template.replace("{value}", t) })) }, baselinePolicy);
      expect(report.findings, a.id).toEqual([]);
    }
  });
});

describe("makeup applicability (directive §4)", () => {
  it("“no makeup” hides every other makeup value (kept); unset presence leaves them usable; restoring brings them back", () => {
    const values: Array<[string, SelectionValue]> = [[M("style"), multi("natural")], [M("base_finish"), single("dewy")], [M("lip_color"), single("dusty_rose")]];
    expect(prompt(values)).toBe("Makeup style: natural. Foundation finish: dewy. Lip makeup color: dusty rose.");
    const none = buildSpec(core, [[M("presence"), single("none")], ...values]);
    const c = compilePrompt(none, core);
    expect(c.prompt).toBe("Makeup: no makeup.");
    expect(Object.keys(none.selections)).toHaveLength(4); // kept
    expect(c.diagnostics.filter((d) => d.code === "selection.inactive").map((d) => d.attributeId).sort()).toEqual(values.map(([id]) => id).sort());
    expect(prompt([[M("presence"), single("applied")], ...values])).toBe("Makeup: makeup applied. Makeup style: natural. Foundation finish: dewy. Lip makeup color: dusty rose.");
  });

  it("“no eyeliner” hides only the eyeliner color", () => {
    expect(prompt([[M("eyeliner_style"), single("none")], [M("eyeliner_color"), single("black")], [M("mascara"), single("natural")]])).toBe("Eyeliner: none. Mascara: natural.");
    expect(prompt([[M("eyeliner_style"), single("winged")], [M("eyeliner_color"), single("black")]])).toBe("Eyeliner: winged. Eyeliner color: black.");
    expect(prompt([[M("eyeliner_color"), single("deep_brown")]])).toBe("Eyeliner color: deep brown."); // style unset → usable
  });

  it("makeup is independent of natural skin, lips and lashes (separate values, both output)", () => {
    const spec = buildSpec(core, [["person.skin.sheen", single("matte")], ["person.lips.natural_color", single("rose")], [M("base_finish"), single("dewy")], [M("lip_color"), single("classic_red")]]);
    expect(Object.keys(spec.selections)).toHaveLength(4);
    const p = compilePrompt(spec, core).prompt;
    expect(p).toBe("Natural lip color: rose. Skin sheen: matte. Foundation finish: dewy. Lip makeup color: classic red."); // catalog order: lips (263) before skin (264)
    expect(p).toContain("Foundation finish: dewy.");
    expect(p).toContain("Lip makeup color: classic red.");
    expect(spec.selections["person.skin.sheen"]!.value).toEqual(single("matte"));
  });

  it("makeup is never limited by gender", () => {
    for (const g of ["man", "woman", "nonbinary"]) {
      expect(prompt([["person.identity.gender", single(g)], [M("style"), multi("full_glam")]]), g).toContain("Makeup style: full glam.");
    }
  });

  it("custom color name + expression, exclusion, JSON round-trip, reset and restore", () => {
    let spec = buildSpec(core, [
      [M("lip_color"), { kind: "single", custom: { label: "말린 체리", expression: "a dried-cherry red" } }],
      [M("eyeshadow_color"), multi("taupe", "gold")],
      [E("emotion"), multi("content")],
    ]);
    expect(compilePrompt(spec, core).prompt).toBe("Emotion: content. Eyeshadow colors: taupe, gold. Lip makeup color: a dried-cherry red.");
    spec = setPromptExclusion(spec, M("eyeshadow_color"), true);
    expect(compilePrompt(spec, core).prompt).toBe("Emotion: content. Lip makeup color: a dried-cherry red.");
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
    const { spec: cleared, removed } = resetCategory(spec, core, "person_makeup");
    expect(Object.keys(removed).sort()).toEqual([M("eyeshadow_color"), M("lip_color")]);
    expect(Object.keys(cleared.selections)).toEqual([E("emotion")]);
    expect(restoreCategoryReset(cleared, removed).spec.selections).toEqual(spec.selections);
    expect(Object.keys(resetCategory(spec, core, "person_expression").removed)).toEqual([E("emotion")]);
  });
});

describe("search (ko / en / aliases)", () => {
  it.each([
    ["감정", "attribute", E("emotion")],
    ["미소", "attribute", E("smile")],
    ["눈물", "attribute", E("tears")],
    ["시선", "attribute", E("gaze_state")],
    ["smirk", "option", E("smile")],
    ["인상", "attribute", I("overall")],
    ["카리스마", "attribute", I("charisma")],
    ["동안", "option", I("maturity")],
    ["중성적", "attribute", I("androgyny")],
    ["화장", "attribute", M("presence")],
    ["아이라인", "attribute", M("eyeliner_style")],
    ["립스틱", "attribute", M("lip_color")],
    ["말린 장미", "option", M("lip_color")],
    ["contour", "attribute", M("contour")],
  ])("“%s” finds %s %s", (q, kind, attributeId) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === attributeId)).toBe(true);
  });
});
