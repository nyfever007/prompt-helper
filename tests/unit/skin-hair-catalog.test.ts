import { describe, expect, it } from "vitest";
import {
  baselinePolicy,
  compilePrompt,
  conditionAttributeIds,
  evaluateSafety,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  isOptionAttribute,
  resetCategory,
  restoreCategoryReset,
  searchCatalog,
  searchOptions,
  setPromptExclusion,
  type OptionAttributeDefinition,
  type SelectionValue,
} from "@/domain";
import { buildSpec, multi, single, text } from "../fixtures/specs";

/** Sprint 2-B.3 — Person › Skin (16), Hair (23), Facial hair (6). Approved vocabulary reproduced independently. */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const out = (entries: Array<[string, SelectionValue]>) => compilePrompt(buildSpec(core, entries), core);
const prompt = (entries: Array<[string, SelectionValue]>) => out(entries).prompt;
const S = (x: string) => `person.skin.${x}`;
const H = (x: string) => `person.hair.${x}`;
const F = (x: string) => `person.facial_hair.${x}`;
const area = /^person\.(skin|hair|facial_hair)\./;
const attrs = core.attributes().filter((a) => area.test(a.id));
const opt = (id: string) => core.getAttribute(id) as OptionAttributeDefinition;

const HAIR_COLORS = ["jet_black", "soft_black", "blue_black", "dark_brown", "chocolate_brown", "chestnut_brown", "medium_brown", "light_brown", "ash_brown", "dark_blonde", "golden_blonde", "honey_blonde", "ash_blonde", "platinum_blonde", "strawberry_blonde", "auburn", "copper", "ginger", "deep_red", "burgundy", "dark_gray", "gray", "silver_gray", "silver", "white", "salt_and_pepper", "pink", "pastel_pink", "rose_gold", "purple", "lavender", "blue", "pastel_blue", "turquoise", "green", "mint_green", "orange", "yellow"];
const HAIRSTYLE_TEXT: Record<string, string[]> = {
  short: ["buzz cut", "crew cut", "pixie cut", "cropped haircut", "Caesar cut", "French crop", "short textured haircut", "spiky hair"],
  bob: ["classic bob", "blunt bob", "layered bob", "asymmetrical bob", "inverted bob", "wavy bob", "long bob", "pageboy haircut"],
  layered: ["layered haircut", "shag haircut", "wolf cut", "butterfly cut", "feathered haircut", "blunt cut", "step cut", "hime cut", "jellyfish haircut"],
  down: ["hair worn down", "swept-back hair", "slicked-back hair", "side-swept hair", "hair tucked behind the ears"],
  volume: ["pompadour", "quiff", "bouffant", "afro", "flat top", "mohawk", "faux hawk"],
  sides: ["undercut", "disconnected undercut", "side-shaved hairstyle", "fade haircut", "taper haircut"],
  ponytail: ["ponytail", "twin ponytails", "bubble ponytail", "braided ponytail", "side ponytail"],
  bun: ["hair bun", "messy bun", "sleek bun", "top knot", "double buns", "space buns", "French twist", "chignon", "twisted updo"],
  half_up: ["half-up hairstyle", "half-up ponytail", "half-up bun", "half-up braid"],
  braids: ["single braid", "twin braids", "French braid", "Dutch braid", "fishtail braid", "crown braid", "waterfall braid", "box braids", "cornrows"],
  other: ["locs", "finger waves", "pin curls", "finger coils", "traditional updo"],
};

describe("registration and integrity (45 new, 108 cumulative person attributes)", () => {
  it("registers 16 skin + 23 hair + 6 facial-hair attributes at order 264–308, approved Direct attributes with the output toggle", () => {
    expect(attrs.map((a) => a.categoryId).filter((c) => c === "person_skin")).toHaveLength(16);
    expect(attrs.filter((a) => a.categoryId === "person_hair")).toHaveLength(23);
    expect(attrs.filter((a) => a.categoryId === "person_facial_hair")).toHaveLength(6);
    expect(attrs.map((a) => a.order)).toEqual(Array.from({ length: 45 }, (_, i) => 264 + i));
    for (const a of attrs) {
      expect(core.isExposed(a, "detailed"), a.id).toBe(true);
      expect(a.expression?.role, a.id).toBe("direct");
      expect(a.outputToggle, a.id).toBe(true);
      expect(a.label.ko && a.label.en && a.aliases?.length, a.id).toBeTruthy();
    }
    expect(core.attributes().filter((a) => a.id.startsWith("person.") && core.isExposed(a, "detailed"))).toHaveLength(108);
    expect(core.getCategory("person_facial_hair")).toMatchObject({ parentId: "person", status: "approved", docPath: "docs/catalogs/person/facial-hair.md" });
  });

  it("skin tone: 20 swatches in natural (12) and fantasy (8) display groups, custom allowed", () => {
    const a = opt(S("tone"));
    expect(a.control).toBe("color");
    expect(a.custom).toBeDefined();
    expect(a.options.map((o) => o.prompt.text)).toEqual([
      "very fair", "fair", "light", "light beige", "medium beige", "golden", "tan", "olive brown", "light brown", "medium brown", "deep brown", "very deep brown",
      "green", "blue", "violet", "gray", "red", "pure white", "metallic gold", "metallic silver",
    ]);
    expect(a.options.filter((o) => o.group === "natural")).toHaveLength(12);
    expect(a.options.filter((o) => o.group === "fantasy")).toHaveLength(8);
    expect(a.options.every((o) => /^#[0-9a-f]{6}$/i.test(o.swatch ?? ""))).toBe(true);
  });

  it("one shared 38-color hair palette (6 groups) reused by primary, secondary and facial hair color — values stay independent", () => {
    for (const id of [H("primary_color"), H("secondary_color"), F("color")]) {
      const a = opt(id);
      expect(a.options.map((o) => o.id), id).toEqual(HAIR_COLORS);
      expect(a.optionGroups!.map((g) => g.id)).toEqual(["black", "brown", "blonde", "red", "gray", "fantasy"]);
      expect(a.control).toBe("color");
      expect(a.custom).toBeDefined();
    }
    expect(prompt([[H("primary_color"), single("dark_brown")], [H("secondary_color"), single("honey_blonde")], [F("color"), single("auburn")]])).toBe(
      "Primary hair color: dark brown. Secondary hair color: honey blonde. Facial hair color: auburn.",
    );
  });

  it("hairstyles: 74 approved styles in 11 display groups (groups never output), searchable, custom allowed", () => {
    const a = opt(H("style"));
    expect(a.control).toBe("searchable");
    expect(a.custom).toBeDefined();
    for (const [group, texts] of Object.entries(HAIRSTYLE_TEXT)) {
      expect(a.options.filter((o) => o.group === group).map((o) => o.prompt.text), group).toEqual(texts);
    }
    expect(a.options).toHaveLength(74);
    expect(prompt([[H("style"), single("half_up_bun")]])).toBe("Hairstyle: half-up bun.");
    expect(searchOptions(a, "반묶음")[0]?.option.group).toBe("half_up");
  });

  it("every option and band compiles alone to exactly its template sentence, with no digits", () => {
    for (const a of attrs) {
      const values: SelectionValue[] = isOptionAttribute(a) ? a.options.map((o) => (a.type === "multi" ? multi(o.id) : single(o.id))) : a.type === "number" ? [1, 2, 3, 4, 5].map(num) : [];
      for (const v of values) {
        const c = out([[a.id, v]]);
        expect(c.fragments.map((f) => f.attributeId), `${a.id} ${JSON.stringify(v)}`).toEqual([a.id]);
        expect(c.prompt).not.toMatch(/\d/u);
        expect(c.blocked).toBe(false);
      }
    }
  });

  it("no phrase raises a safety signal (existing policy unchanged); scars are non-graphic", () => {
    for (const a of attrs) {
      const texts = isOptionAttribute(a) ? a.options.map((o) => o.prompt.text) : a.type === "number" ? (a.bands ?? []).map((b) => b.text) : [];
      const report = evaluateSafety({ tags: [], texts: texts.map((t) => ({ attributeId: a.id, text: a.prompt.template.replace("{value}", t) })) }, baselinePolicy);
      expect(report.findings, a.id).toEqual([]);
    }
    expect(opt(S("scars")).options.map((o) => o.prompt.text).join(" ")).not.toMatch(/blood|gore|wound|gash|bleed|fresh/iu);
  });
});

describe("independence (approval §2–§4)", () => {
  it("no skin, hair or facial-hair attribute depends on age, gender, nationality or ethnicity", () => {
    const forbidden = /^person\.identity\./;
    for (const a of attrs) {
      const refs = [...(a.appliesWhen ?? []), ...(isOptionAttribute(a) ? a.options.flatMap((o) => [...(o.appliesWhen ?? []), ...(o.suggestedWhen ?? []), ...(o.restriction?.when ?? [])]) : [])].flatMap(conditionAttributeIds);
      expect(refs.filter((r) => forbidden.test(r)), a.id).toEqual([]);
    }
    expect(core.rules.filter((r) => r.involves.some((id) => area.test(id)) && r.involves.some((id) => id.startsWith("person.identity.")))).toEqual([]);
  });

  it("identity values (age 80, woman, nationality, ethnicity) set no skin, wrinkle, hair or beard value; any hairstyle and beard is allowed for any gender", () => {
    const spec = buildSpec(core, [
      ["person.identity.age", { kind: "number", value: 80, unit: "years" }],
      ["person.identity.gender", single("woman")],
      ["person.identity.nationality", { kind: "multi", optionIds: ["ng"] }],
      ["person.identity.ethnic_background", multi("yoruba")],
      [H("style"), single("buzz_cut")],
      [F("style"), multi("full_beard")],
    ]);
    expect(Object.keys(spec.selections).filter((k) => area.test(k)).sort()).toEqual([F("style"), H("style")]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).not.toMatch(/Skin|Wrinkle/u);
    expect(c.prompt).toContain("Hairstyle: buzz cut. Facial hair: full beard.");
    expect(c.blocked).toBe(false);
  });

  it("smooth skin can coexist with freckles, pores and moles (no conflict)", () => {
    const c = out([[S("texture"), single("smooth")], [S("pores"), num(2)], [S("freckle_density"), single("sparse")], [S("moles"), single("single")]]);
    expect(c.prompt).toBe("Skin texture: smooth. Pores: slightly visible. Freckles: sparse. Moles and beauty marks: a single beauty mark.");
    expect(c.diagnostics.filter((d) => d.code.startsWith("rule."))).toEqual([]);
  });

  it("a hairstyle never sets length or tie position; length/texture/style/tie are independent", () => {
    const spec = buildSpec(core, [[H("style"), single("ponytail")]]);
    expect(Object.keys(spec.selections)).toEqual([H("style")]);
    expect(prompt([[H("length"), single("waist")], [H("texture"), single("wavy")], [H("style"), single("ponytail")], [H("tie_position"), multi("high")]])).toBe(
      "Hair length: waist-length. Hair texture: wavy. Hairstyle: ponytail. Hair tie position: high.",
    );
  });
});

describe("explicit none vs unset, applicability and value preservation (approval §5)", () => {
  it("freckles / moles / wrinkles: explicit “none” hides the placement (kept); unset lets the placement express the feature", () => {
    for (const [feature, placement, place, phrase] of [
      [S("freckle_density"), S("freckle_placement"), "nose", "Freckle placement: nose."],
      [S("moles"), S("mole_placement"), "below_eye", "Mole placement: below the eye."],
      [S("wrinkles"), S("wrinkle_placement"), "around_eyes", "Wrinkle placement: around the eyes."],
    ] as const) {
      expect(prompt([[placement, multi(place)]]), placement).toBe(phrase); // feature unset → placement is the intent
      const none = out([[feature, single("none")], [placement, multi(place)]]);
      expect(none.prompt).toMatch(/: none\.$/u); // explicit none is output as a statement
      expect(none.prompt).not.toContain(phrase);
      expect(none.diagnostics.some((d) => d.code === "selection.inactive" && d.attributeId === placement)).toBe(true);
    }
  });

  it("hair presence: bald hides every hair attribute; shaved keeps color/texture/thickness/density/shine/hairline/condition; partial loss hides nothing — values are preserved and return", () => {
    const all: Array<[string, SelectionValue]> = [
      [H("length"), single("shoulder")], [H("primary_color"), single("jet_black")], [H("texture"), single("curly")], [H("thickness"), num(4)],
      [H("shine"), num(4)], [H("hairline"), single("rounded")], [H("condition"), multi("wet")], [H("style"), single("afro")],
      [H("bangs_style"), single("blunt")], [H("part"), single("center")], [H("movement"), single("windblown")],
    ];
    const produced = (presence?: string) => out([...(presence ? [[H("presence"), single(presence)] as [string, SelectionValue]] : []), ...all]).fragments.map((f) => f.attributeId).filter((id) => id !== H("presence"));
    expect(produced()).toHaveLength(11);
    expect(produced("partial_loss")).toHaveLength(11);
    expect(produced("bald")).toEqual([]);
    expect(produced("shaved").sort()).toEqual([H("condition"), H("hairline"), H("primary_color"), H("shine"), H("texture"), H("thickness")].sort());
    // preserved and restored
    const bald = buildSpec(core, [[H("presence"), single("bald")], ...all]);
    expect(Object.keys(bald.selections)).toHaveLength(12);
    const back = buildSpec(core, [[H("presence"), single("present")], ...all]);
    expect(compilePrompt(back, core).fragments).toHaveLength(12);
    expect(prompt([[H("presence"), single("shaved")], [H("primary_color"), single("platinum_blonde")]])).toBe("Hair presence: shaved head. Primary hair color: platinum blonde.");
  });

  it("“no bangs” hides bangs length and density; an unset bangs style keeps them", () => {
    expect(prompt([[H("bangs_length"), single("brow")], [H("bangs_density"), num(2)]])).toBe("Bangs length: eyebrow-length. Bangs density: sparse.");
    expect(prompt([[H("bangs_style"), single("none")], [H("bangs_length"), single("brow")], [H("bangs_density"), num(2)]])).toBe("Bangs: none.");
    expect(prompt([[H("bangs_style"), single("curtain")], [H("bangs_length"), single("eye")]])).toBe("Bangs: curtain. Bangs length: eye-length.");
  });

  it("clean-shaven hides beard length, density, color, grooming and texture (kept); unset style keeps them; clean-shaven + another style warns", () => {
    const details: Array<[string, SelectionValue]> = [[F("length"), num(4)], [F("density"), num(4)], [F("color"), single("salt_and_pepper")], [F("grooming"), single("neatly_trimmed")], [F("texture"), single("wavy")]];
    expect(prompt(details)).toBe("Facial hair length: long. Facial hair density: dense. Facial hair color: salt-and-pepper. Facial hair grooming: neatly trimmed. Facial hair texture: wavy.");
    expect(prompt([[F("style"), multi("clean_shaven")], ...details])).toBe("Facial hair: clean-shaven.");
    const both = out([[F("style"), multi("clean_shaven", "mustache")]]);
    expect(both.diagnostics.find((d) => d.code === "rule.facial-hair-clean-shaven-with-others")?.severity).toBe("warning");
    expect(both.fragments[0]!.optionIds).toEqual(["clean_shaven", "mustache"]); // nothing rewritten
    expect(prompt([[F("style"), multi("mustache", "goatee", "sideburns")]])).toBe("Facial hair: mustache, goatee, sideburns.");
  });

  it.each([
    [[[S("scars"), multi("none", "acne")]], "rule.skin-scars-none-with-others"],
    [[[H("color_pattern"), multi("solid", "highlights")]], "rule.hair-color-pattern-solid-with-others"],
    [[[H("condition"), multi("groomed", "messy")]], "rule.hair-condition-groomed-vs-messy"],
    [[[H("tie_position"), multi("low", "high")]], "rule.hair-tie-position-low-vs-high"],
    [[[H("style"), single("pixie_cut")], [H("length"), single("waist")]], "rule.hair-short-style-vs-long-length"],
    [[[H("style"), single("classic_bob")], [H("length"), single("hip")]], "rule.hair-bob-vs-long-length"],
    [[[H("style"), single("pixie_cut")], [H("tie_position"), multi("high")]], "rule.hair-tie-position-without-tied-style"],
  ] as Array<[Array<[string, SelectionValue]>, string]>)("obvious mismatch %j → %s warning; values kept", (entries, code) => {
    const c = out(entries);
    expect(c.diagnostics.find((d) => d.code === code)?.severity).toBe("warning");
    expect(c.blocked).toBe(false);
    expect(c.fragments).toHaveLength(entries.length);
  });

  it("combinable entries do not warn (highlights + lowlights, wet + frizzy, high + left side)", () => {
    const c = out([[H("color_pattern"), multi("highlights", "lowlights")], [H("condition"), multi("wet", "frizzy")], [H("tie_position"), multi("high", "left")]]);
    expect(c.diagnostics.filter((d) => d.code.startsWith("rule."))).toEqual([]);
  });
});

describe("approval §7 example and common features", () => {
  it("compiles the illustrative skin and hair set (only set values)", () => {
    const c = out([
      [S("tone"), single("light_beige")], [S("undertone"), single("warm")], [S("texture"), single("natural")], [S("sheen"), single("low")],
      [S("pores"), num(2)], [S("freckle_density"), single("sparse")], [S("freckle_placement"), multi("nose", "cheeks")],
      [H("length"), single("waist")], [H("primary_color"), single("dark_brown")], [H("secondary_color"), single("honey_blonde")],
      [H("color_pattern"), multi("balayage")], [H("texture"), single("wavy")], [H("volume"), num(4)], [H("part"), single("center")],
      [H("style"), single("half_up_bun")], [H("tie_position"), multi("high")], [H("layering"), single("moderate")], [H("movement"), single("gently_flowing")],
    ]);
    expect(c.prompt).toBe(
      "Skin tone: light beige. Skin undertone: warm. Skin texture: natural. Skin sheen: low. Pores: slightly visible. Freckles: sparse. Freckle placement: nose, cheeks. " +
        "Hair length: waist-length. Primary hair color: dark brown. Secondary hair color: honey blonde. Hair color pattern: balayage. Hair texture: wavy. Hair volume: high. " +
        "Hair part: center part. Hairstyle: half-up bun. Hair tie position: high. Hair layering: moderate. Hair movement: gently flowing.",
    );
    expect(c.diagnostics.filter((d) => d.code.startsWith("rule."))).toEqual([]);
  });

  it("custom skin tone / hair color / hairstyle (name + expression) compile verbatim", () => {
    expect(
      prompt([
        [S("tone"), { kind: "single", custom: { label: "별빛 피부", expression: "pale skin with a faint starlight shimmer" } }],
        [H("primary_color"), { kind: "single", custom: { label: "Sunset gradient", expression: "sunset orange fading to pink" } }],
        [H("style"), { kind: "single", custom: { label: "높은 쪽진 머리", expression: "a tall traditional chignon" } }],
      ]),
    ).toBe("Skin tone: pale skin with a faint starlight shimmer. Primary hair color: sunset orange fading to pink. Hairstyle: a tall traditional chignon.");
  });

  it("exclusion, JSON round-trip and category reset/restore work for the new areas", () => {
    let spec = buildSpec(core, [[S("tone"), single("tan")], [H("style"), single("wolf_cut")], [H("presence"), single("bald")], [F("style"), multi("goatee")]]);
    spec = setPromptExclusion(spec, S("tone"), true);
    expect(compilePrompt(spec, core).prompt).toBe("Hair presence: bald head. Facial hair: goatee.");
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
    const { spec: cleared, removed } = resetCategory(spec, core, "person_hair");
    expect(Object.keys(removed).sort()).toEqual([H("presence"), H("style")]); // inactive hairstyle included
    expect(Object.keys(cleared.selections).sort()).toEqual([F("style"), S("tone")]);
    expect(restoreCategoryReset(cleared, removed).spec.selections).toEqual(spec.selections);
  });

  it("existing safety rules still apply with these areas set (minor + sexual wording blocks; adult does not)", () => {
    const set: Array<[string, SelectionValue]> = [[S("tone"), single("fair")], [H("style"), single("twin_ponytails")], [S("freckle_density"), single("dense")]];
    expect(out([["intent.description", text("a sexy pose")], ["person.identity.age_group", single("child")], ...set]).blocked).toBe(true);
    expect(out([["intent.description", text("a sexy pose")], ["person.identity.age", { kind: "number", value: 30, unit: "years" }], ...set]).blocked).toBe(false);
  });

  it.each([
    ["피부색", "attribute", S("tone")],
    ["undertone", "attribute", S("undertone")],
    ["주근깨", "attribute", S("freckle_density")],
    ["눈물점", "option", S("mole_placement")],
    ["팔자주름", "option", S("wrinkle_placement")],
    ["앞머리", "attribute", H("bangs_style")],
    ["시스루뱅", "option", H("bangs_style")],
    ["wolf cut", "option", H("style")],
    ["똥머리", "option", H("style")],
    ["투블럭", "option", H("style")],
    ["콧수염", "option", F("style")],
    ["구레나룻", "option", F("style")],
    ["salt", "option", H("primary_color")],
  ])("search “%s” finds %s %s", (q, kind, attributeId) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === attributeId)).toBe(true);
  });
});
