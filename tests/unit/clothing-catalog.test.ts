import { describe, expect, it } from "vitest";
import { INTIMATE_INNERWEAR } from "@/domain/catalog/catalogs/person/clothing";
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

/** Sprint 2-B.5B — Person › Wardrobe: 8 global + 7 garment categories (72 attributes). */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const out = (entries: Array<[string, SelectionValue]>) => compilePrompt(buildSpec(core, entries), core);
const prompt = (entries: Array<[string, SelectionValue]>) => out(entries).prompt;
const C = (x: string) => `person.clothing.${x}`;
const wardrobe = core.attributes().filter((a) => a.id.startsWith("person.clothing."));
const opt = (id: string) => {
  const a = core.getAttribute(id)!;
  return isOptionAttribute(a) ? a.options : [];
};

/** Directive §6 garment type lists (English names, in order) — reproduced independently. */
const TYPES: Record<string, string[]> = {
  tops: ["T-shirt", "Graphic T-shirt", "Polo shirt", "Button-down shirt", "Dress shirt", "Oxford shirt", "Linen shirt", "Blouse", "Henley shirt", "Tank top", "Sleeveless top", "Crop top", "Camisole", "Sweater", "Knit sweater", "Turtleneck", "Mock-neck top", "Sweatshirt", "Hoodie", "Tunic top", "Peplum top", "Wrap top", "Vest"],
  bottoms: ["Jeans", "Straight-leg jeans", "Skinny jeans", "Wide-leg jeans", "Flared jeans", "Tailored trousers", "Slacks", "Chinos", "Cargo pants", "Joggers", "Sweatpants", "Leggings", "Shorts", "Bermuda shorts", "Cycling shorts", "Pencil skirt", "A-line skirt", "Pleated skirt", "Wrap skirt", "Denim skirt", "Flared skirt", "Maxi skirt", "Culottes"],
  one_piece: ["Casual dress", "A-line dress", "Shirt dress", "Wrap dress", "Sheath dress", "Shift dress", "Slip dress", "Sundress", "Sweater dress", "Cocktail dress", "Evening gown", "Ball gown", "Jumpsuit", "Romper", "Overalls", "Dungarees", "Robe", "Tunic", "Kimono", "Hanbok", "Cheongsam", "Sari", "Traditional costume"],
  outerwear: ["Jacket", "Denim jacket", "Leather jacket", "Bomber jacket", "Biker jacket", "Varsity jacket", "Blazer", "Suit jacket", "Cardigan", "Trench coat", "Overcoat", "Peacoat", "Duffle coat", "Parka", "Puffer jacket", "Windbreaker", "Raincoat", "Fleece jacket", "Utility jacket", "Cloak", "Cape", "Poncho", "Shawl"],
  innerwear: ["Undershirt", "Base layer", "Thermal underwear", "Camisole", "Sports bra", "Everyday bra", "Briefs", "Boxer briefs", "Boxer shorts", "Full-coverage underwear", "Shapewear"],
  footwear: ["Sneakers", "Running shoes", "High-top sneakers", "Canvas shoes", "Loafers", "Oxford shoes", "Derby shoes", "Brogues", "Dress shoes", "Ballet flats", "Mary Janes", "Pumps", "Platform shoes", "Ankle boots", "Chelsea boots", "Knee-high boots", "Combat boots", "Hiking boots", "Cowboy boots", "Sandals", "Strappy sandals", "Slides", "Flip-flops", "Slippers", "Clogs"],
  hosiery: ["No-show socks", "Ankle socks", "Crew socks", "Mid-calf socks", "Knee-high socks", "Over-the-knee socks", "Tights", "Opaque tights", "Sheer tights", "Stockings", "Compression socks", "Leg warmers"],
};
const FIELDS: Record<string, string[]> = {
  tops: ["type", "primary_color", "secondary_color", "material", "pattern", "fit", "neckline", "collar", "sleeve_length", "sleeve_style", "length", "details"],
  bottoms: ["type", "primary_color", "secondary_color", "material", "pattern", "fit", "waist_rise", "leg_cut", "hem_length", "details"],
  one_piece: ["type", "primary_color", "secondary_color", "material", "pattern", "fit", "neckline", "sleeve_length", "sleeve_style", "waist_design", "hem_length", "skirt_silhouette", "details"],
  outerwear: ["type", "primary_color", "secondary_color", "material", "pattern", "fit", "length", "closure_state", "closure_type", "hood", "details"],
  innerwear: ["type", "primary_color", "material", "pattern"],
  footwear: ["type", "primary_color", "secondary_color", "material", "heel_height", "heel_type", "toe_shape", "closure"],
  hosiery: ["type", "primary_color", "pattern", "length", "opacity", "thickness"],
};
const NOUN: Record<string, string> = { tops: "Top", bottoms: "Bottom", one_piece: "One-piece garment", outerwear: "Outerwear", innerwear: "Innerwear", footwear: "Footwear", hosiery: "Hosiery" };

/** Directive §7 vocabularies (English, in order). */
const COLORS: Record<string, string[]> = {
  neutrals: ["white", "off-white", "ivory", "cream", "beige", "taupe", "gray", "charcoal", "black"],
  browns: ["tan", "camel", "khaki", "light brown", "chocolate brown", "dark brown"],
  reds: ["red", "crimson", "burgundy", "wine red", "brick red"],
  pinks: ["pale pink", "dusty pink", "rose pink", "hot pink"],
  oranges: ["orange", "peach", "coral", "rust", "terracotta"],
  yellows: ["yellow", "mustard", "golden yellow", "pale yellow"],
  greens: ["olive", "moss green", "forest green", "sage green", "mint", "emerald"],
  blues: ["sky blue", "light blue", "royal blue", "navy", "teal", "turquoise"],
  purples: ["lavender", "lilac", "violet", "purple", "plum"],
  metallics: ["gold", "silver", "bronze", "copper", "rose gold"],
};
const MATERIALS = ["Cotton", "Linen", "Wool", "Cashmere", "Silk", "Satin", "Velvet", "Denim", "Leather", "Suede", "Faux leather", "Polyester", "Nylon", "Rayon", "Viscose", "Chiffon", "Organza", "Lace", "Mesh", "Jersey", "Knit fabric", "Fleece", "Canvas", "Corduroy", "Tweed", "Brocade", "Jacquard", "Sequin fabric", "Metallic fabric", "Rubber", "Waterproof fabric"];
const PATTERNS = ["Solid color", "Horizontal stripes", "Vertical stripes", "Pinstripes", "Plaid", "Gingham", "Tartan", "Houndstooth", "Polka dots", "Floral", "Botanical", "Paisley", "Geometric", "Abstract", "Camouflage", "Animal print", "Checkered", "Argyle", "Chevron", "Color-blocked", "Tie-dye", "Gradient", "Graphic print"];
const NECKLINES = ["Crew neck", "V-neck", "Scoop neck", "Square neck", "Boat neck", "High neck", "Turtleneck", "Mock neck", "Halter neck", "Sweetheart neckline", "Cowl neck", "Off-the-shoulder neckline", "Asymmetric neckline"];
const COLLARS = ["No collar", "Point collar", "Spread collar", "Button-down collar", "Mandarin collar", "Stand collar", "Peter Pan collar", "Sailor collar", "Shawl collar", "Notched lapel", "Peak lapel"];
const SLEEVE_LENGTHS = ["Sleeveless", "Cap sleeves", "Short sleeves", "Elbow-length sleeves", "Three-quarter sleeves", "Long sleeves", "Extra-long sleeves"];
const SLEEVE_STYLES = ["Straight sleeves", "Fitted sleeves", "Rolled-up sleeves", "Puff sleeves", "Balloon sleeves", "Bell sleeves", "Bishop sleeves", "Raglan sleeves", "Batwing sleeves", "Flared sleeves"];
const DETAILS = ["Buttons", "Decorative buttons", "Zippers", "Pockets", "Patch pockets", "Belted waist", "Drawstrings", "Pleats", "Ruffles", "Frills", "Embroidery", "Lace trim", "Contrast stitching", "Decorative stitching", "Metal hardware", "Studs", "Rivets", "Beading", "Sequins", "Appliqué", "Fringe", "Tassels", "Slits", "Asymmetric hem", "Distressed detailing", "Layered fabric"];
const FIT = ["Tight-fitting", "Slim-fit", "Regular-fit", "Relaxed-fit", "Loose-fitting", "Oversized"];

describe("registration and integrity (72 new attributes, order 388–459)", () => {
  it("8 global + 7 garment subcategories, each garment in its own ID area, in catalog order", () => {
    expect(core.categories.filter((c) => c.parentId === "person_wardrobe").map((c) => c.label.ko)).toEqual(["전체 설정", "상의", "하의", "원피스 및 일체형", "아우터", "내의", "신발", "양말 및 스타킹"]);
    const expected = [
      ...["fashion_style", "formality", "fit", "season", "era", "condition", "layering", "coverage"].map(C),
      ...Object.entries(FIELDS).flatMap(([g, fields]) => fields.map((f) => C(`${g}.${f}`))),
    ];
    expect(wardrobe.map((a) => a.id)).toEqual(expected);
    expect(wardrobe).toHaveLength(72);
    expect(wardrobe.map((a) => a.order)).toEqual(Array.from({ length: 72 }, (_, i) => 388 + i));
    for (const a of wardrobe) {
      const garment = a.id.split(".")[2]!;
      expect(a.categoryId, a.id).toBe(garment in FIELDS ? `person_wardrobe_${garment}` : "person_wardrobe_general");
      expect(a.status, a.id).toBe("approved");
      expect(a.expression?.role, a.id).toBe("direct");
      expect(a.outputToggle, a.id).toBe(true);
      expect(a.label.ko && a.label.en && a.aliases?.length, a.id).toBeTruthy();
      if (garment in FIELDS) expect(a.prompt.template.startsWith(`${NOUN[garment]}`), a.id).toBe(true); // a garment's value never reads as another garment's
    }
  });

  it("every garment type list is the approved list after an explicit “none”; single-select with custom values and display groups", () => {
    for (const [g, names] of Object.entries(TYPES)) {
      const a = core.getAttribute(C(`${g}.type`))!;
      expect(a.type, g).toBe("single");
      expect(isOptionAttribute(a) && a.custom, g).toBeTruthy();
      expect(isOptionAttribute(a) && a.optionGroups?.length, g).toBeGreaterThan(1);
      const options = opt(C(`${g}.type`));
      expect(options[0]!.id, g).toBe("none");
      expect(options.slice(1).map((o) => o.label.en), g).toEqual(expect.arrayContaining(names));
      expect(options, g).toHaveLength(names.length + 1);
      expect(options.slice(1).every((o) => o.group), g).toBe(true);
    }
  });

  it("shared vocabularies: 55 colors in 10 groups, 31 materials, 23 patterns, 13 necklines, 11 collars, 7 + 10 sleeve values, 26 details, 6 fits", () => {
    for (const id of wardrobe.filter((a) => /_color$/.test(a.id)).map((a) => a.id)) {
      const a = core.getAttribute(id)!;
      expect(isOptionAttribute(a) && a.optionGroups?.map((g) => g.id), id).toEqual(Object.keys(COLORS));
      for (const [group, colors] of Object.entries(COLORS)) expect(opt(id).filter((o) => o.group === group).map((o) => o.prompt.text), `${id}/${group}`).toEqual(colors);
      expect(opt(id).every((o) => /^#[0-9a-f]{6}$/.test(o.swatch ?? "")), id).toBe(true);
    }
    for (const g of ["tops", "bottoms", "one_piece", "outerwear", "innerwear", "footwear"]) expect(opt(C(`${g}.material`)).map((o) => o.label.en), g).toEqual(MATERIALS);
    for (const g of ["tops", "bottoms", "one_piece", "outerwear", "innerwear", "hosiery"]) expect(opt(C(`${g}.pattern`)).map((o) => o.label.en), g).toEqual(PATTERNS);
    for (const g of ["tops", "one_piece"]) {
      expect(opt(C(`${g}.neckline`)).map((o) => o.label.en), g).toEqual(NECKLINES);
      expect(opt(C(`${g}.sleeve_length`)).map((o) => o.label.en), g).toEqual(SLEEVE_LENGTHS);
      expect(opt(C(`${g}.sleeve_style`)).map((o) => o.label.en), g).toEqual(SLEEVE_STYLES);
    }
    expect(opt(C("tops.collar")).map((o) => o.label.en)).toEqual(COLLARS);
    for (const g of ["tops", "bottoms", "one_piece", "outerwear"]) {
      expect(opt(C(`${g}.details`)).map((o) => o.label.en), g).toEqual(DETAILS);
      expect(core.getAttribute(C(`${g}.details`))!.type, g).toBe("multi");
    }
    for (const id of [C("fit"), ...["tops", "bottoms", "one_piece", "outerwear"].map((g) => C(`${g}.fit`))]) expect(opt(id).map((o) => o.label.en), id).toEqual(FIT);
    expect(opt(C("fashion_style"))).toHaveLength(24);
    expect(opt(C("era")).map((o) => o.prompt.text)).toEqual(["ancient", "medieval", "Renaissance", "Baroque", "Victorian", "Edwardian", "1920s", "1930s", "1940s", "1950s", "1960s", "1970s", "1980s", "1990s", "contemporary", "futuristic"]);
  });

  it("every option and band compiles alone to exactly its sentence", () => {
    for (const a of wardrobe) {
      if (isOptionAttribute(a)) {
        for (const o of a.options) expect(prompt([[a.id, a.type === "single" ? single(o.id) : multi(o.id)]]), `${a.id}/${o.id}`).toBe(a.prompt.template.replace("{value}", o.prompt.text));
      } else if (a.type === "number") {
        a.bands!.forEach((b, i) => expect(prompt([[a.id, num(i + 1)]]), `${a.id}/${i + 1}`).toBe(a.prompt.template.replace("{value}", b.text)));
      }
    }
  });
});

describe("garment independence and combinations (directive §5, §8)", () => {
  it("directive §10 example: each garment's color, material and fit stay with that garment", () => {
    expect(
      prompt([
        [C("fashion_style"), multi("smart_casual")],
        [C("tops.type"), single("button_down")], [C("tops.primary_color"), single("ivory")], [C("tops.material"), single("linen")], [C("tops.fit"), single("oversized")],
        [C("bottoms.type"), single("tailored_trousers")], [C("bottoms.primary_color"), single("navy")],
        [C("footwear.type"), single("loafers")], [C("footwear.primary_color"), single("chocolate_brown")], [C("footwear.material"), single("leather")],
      ]),
    ).toBe(
      "Fashion style: smart casual. Top: button-down shirt. Top primary color: ivory. Top material: linen. Top fit: oversized. " +
        "Bottom: tailored trousers. Bottom primary color: navy. Footwear: loafers. Footwear primary color: chocolate brown. Footwear material: leather.",
    );
  });

  it("the same palette value is stored independently per garment and per color attribute", () => {
    let spec = buildSpec(core, [[C("tops.primary_color"), single("navy")], [C("tops.secondary_color"), single("white")], [C("bottoms.primary_color"), single("navy")]]);
    const before = spec.selections[C("bottoms.primary_color")];
    spec = buildSpec(core, [[C("tops.primary_color"), single("red")], [C("tops.secondary_color"), single("white")], [C("bottoms.primary_color"), single("navy")]]);
    expect(spec.selections[C("bottoms.primary_color")]).toEqual(before);
    expect(compilePrompt(spec, core).prompt).toBe("Top primary color: red. Top secondary color: white. Bottom primary color: navy.");
  });

  it("global style / fit / coverage never set individual garments; garment fit is separate from the overall fit", () => {
    const spec = buildSpec(core, [[C("fashion_style"), multi("streetwear", "techwear")], [C("fit"), single("oversized")], [C("coverage"), single("full")], [C("tops.fit"), single("slim")]]);
    expect(Object.keys(spec.selections).sort()).toEqual([C("coverage"), C("fashion_style"), C("fit"), C("tops.fit")]);
    expect(compilePrompt(spec, core).prompt).toBe("Fashion style: streetwear, techwear. Overall clothing fit: oversized. Clothing coverage: full coverage. Top fit: slim-fit.");
  });

  it("a one-piece never clears tops or bottoms; layering combinations are not diagnosed", () => {
    const c = out([[C("one_piece.type"), single("overalls")], [C("tops.type"), single("t_shirt")], [C("bottoms.type"), single("leggings")], [C("outerwear.type"), single("cardigan")], [C("layering"), single("moderate")]]);
    expect(c.prompt).toBe("Clothing layering: moderately layered. Top: T-shirt. Bottom: leggings. One-piece garment: overalls. Outerwear: cardigan.");
    expect(c.diagnostics.filter((d) => d.code.startsWith("rule."))).toEqual([]);
  });

  it("type unset → details are usable; explicit “none” hides only that garment's details (kept, restored) and is never nudity wording", () => {
    expect(prompt([[C("tops.primary_color"), single("white")], [C("tops.neckline"), single("v_neck")]])).toBe("Top primary color: white. Top neckline: V-neck.");
    const spec = buildSpec(core, [[C("tops.type"), single("none")], [C("tops.primary_color"), single("white")], [C("tops.neckline"), single("v_neck")], [C("bottoms.primary_color"), single("black")]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Top: no separate top garment. Bottom primary color: black.");
    expect(Object.keys(spec.selections)).toHaveLength(4);
    expect(c.diagnostics.filter((d) => d.code === "selection.inactive").map((d) => d.attributeId).sort()).toEqual([C("tops.neckline"), C("tops.primary_color")]);
    expect(prompt([[C("tops.type"), single("blouse")], [C("tops.primary_color"), single("white")], [C("tops.neckline"), single("v_neck")]])).toBe("Top: blouse. Top primary color: white. Top neckline: V-neck.");
    for (const g of Object.keys(TYPES)) {
      const none = opt(C(`${g}.type`))[0]!;
      const sentence = core.getAttribute(C(`${g}.type`))!.prompt.template.replace("{value}", none.prompt.text);
      expect(evaluateSafety({ tags: [], texts: [{ attributeId: g, text: `${sentence} a young girl` }] }, baselinePolicy).findings, g).toEqual([]);
    }
  });
});

describe("type-dependent applicability (directive §6–§7: only meaningful details are output)", () => {
  const hidden = (entries: Array<[string, SelectionValue]>) =>
    out(entries).diagnostics.filter((d) => d.code === "selection.inactive").map((d) => d.attributeId);

  it("tops: sleeve attributes do not apply to sleeveless types", () => {
    for (const t of ["tank_top", "sleeveless_top", "camisole", "vest"]) expect(hidden([[C("tops.type"), single(t)], [C("tops.sleeve_length"), single("long")], [C("tops.sleeve_style"), single("puff")]]), t).toEqual([C("tops.sleeve_length"), C("tops.sleeve_style")]);
    expect(prompt([[C("tops.type"), single("blouse")], [C("tops.sleeve_style"), single("puff")]])).toBe("Top: blouse. Top sleeve style: puff sleeves.");
  });

  it("bottoms: the leg cut applies only to trousers whose type does not already state a cut", () => {
    for (const t of ["pencil_skirt", "maxi_skirt", "shorts", "leggings", "skinny_jeans", "flared_jeans"]) expect(hidden([[C("bottoms.type"), single(t)], [C("bottoms.leg_cut"), single("bootcut")]]), t).toEqual([C("bottoms.leg_cut")]);
    expect(prompt([[C("bottoms.type"), single("jeans")], [C("bottoms.leg_cut"), single("bootcut")], [C("bottoms.waist_rise"), single("high")]])).toBe("Bottom: jeans. Bottom waist rise: high-rise. Bottom leg cut: bootcut.");
    expect(prompt([[C("bottoms.type"), single("pleated_skirt")], [C("bottoms.hem_length"), single("knee")]])).toBe("Bottom: pleated skirt. Bottom hem length: knee-length.");
  });

  it("one-piece: no skirt silhouette for jumpsuits/rompers/overalls/dungarees; no neckline or sleeves for strap-only overalls", () => {
    for (const t of ["jumpsuit", "romper", "overalls", "dungarees"]) expect(hidden([[C("one_piece.type"), single(t)], [C("one_piece.skirt_silhouette"), single("a_line")]]), t).toEqual([C("one_piece.skirt_silhouette")]);
    expect(hidden([[C("one_piece.type"), single("dungarees")], [C("one_piece.neckline"), single("v_neck")], [C("one_piece.sleeve_length"), single("long")]])).toEqual([C("one_piece.neckline"), C("one_piece.sleeve_length")]);
    expect(prompt([[C("one_piece.type"), single("wrap_dress")], [C("one_piece.waist_design"), single("empire")], [C("one_piece.hem_length"), single("midi")], [C("one_piece.skirt_silhouette"), single("a_line")]])).toBe(
      "One-piece garment: wrap dress. One-piece garment waist design: empire waist. One-piece garment hem length: midi-length. One-piece garment skirt silhouette: A-line.",
    );
  });

  it("outerwear: no closure for ponchos/shawls, no hood for shawls", () => {
    expect(hidden([[C("outerwear.type"), single("shawl")], [C("outerwear.closure_state"), single("open")], [C("outerwear.closure_type"), single("buttons")], [C("outerwear.hood"), single("up")]])).toEqual([C("outerwear.closure_state"), C("outerwear.closure_type"), C("outerwear.hood")]);
    expect(prompt([[C("outerwear.type"), single("parka")], [C("outerwear.closure_state"), single("open")], [C("outerwear.hood"), single("up")]])).toBe("Outerwear: parka. Outerwear closure: worn open. Outerwear hood: hood up.");
  });

  it("footwear: no heel type for flat heels; hosiery: length only when the type does not state it, opacity only for tights/stockings", () => {
    expect(hidden([[C("footwear.heel_height"), single("flat")], [C("footwear.heel_type"), single("stiletto")]])).toEqual([C("footwear.heel_type")]);
    expect(prompt([[C("footwear.type"), single("pumps")], [C("footwear.heel_height"), single("high")], [C("footwear.heel_type"), single("block")]])).toBe("Footwear: pumps. Footwear heel height: high-heeled. Footwear heel type: block heel.");
    expect(hidden([[C("hosiery.type"), single("crew")], [C("hosiery.length"), single("knee")], [C("hosiery.opacity"), single("sheer")]])).toEqual([C("hosiery.length"), C("hosiery.opacity")]);
    expect(prompt([[C("hosiery.type"), single("stockings")], [C("hosiery.length"), single("thigh")], [C("hosiery.opacity"), single("sheer")], [C("hosiery.thickness"), num(1)]])).toBe(
      "Hosiery: stockings. Hosiery length: thigh-high. Hosiery opacity: sheer. Hosiery thickness: very thin.",
    );
  });

  it("only real contradictions warn: opaque tights + sheer, sheer tights + opaque (non-blocking, nothing changed)", () => {
    const c = out([[C("hosiery.type"), single("opaque_tights")], [C("hosiery.opacity"), single("sheer")]]);
    expect(c.diagnostics.map((d) => d.code)).toContain("rule.clothing-hosiery-opaque-tights-vs-opacity");
    expect(c.blocked).toBe(false);
    expect(c.prompt).toBe("Hosiery: opaque tights. Hosiery opacity: sheer.");
    expect(out([[C("hosiery.type"), single("sheer_tights")], [C("hosiery.opacity"), single("opaque")]]).diagnostics.map((d) => d.code)).toContain("rule.clothing-hosiery-sheer-tights-vs-opacity");
    expect(out([[C("hosiery.type"), single("tights")], [C("hosiery.opacity"), single("opaque")]]).diagnostics.filter((d) => d.code.startsWith("rule."))).toEqual([]);
  });
});

describe("common features", () => {
  it("custom garment type (name + expression), exclusion, JSON round-trip, reset of the parent and of one garment, restore", () => {
    let spec = buildSpec(core, [
      [C("one_piece.type"), { kind: "single", custom: { label: "작업복 점프슈트", expression: "a utility boilersuit" } }],
      [C("one_piece.primary_color"), single("olive")],
      [C("footwear.type"), single("combat_boots")],
      [C("era"), single("decade_1990s")],
      ["person.makeup.presence", single("none")],
    ]);
    expect(compilePrompt(spec, core).prompt).toBe("Makeup: no makeup. Clothing era: 1990s. One-piece garment: a utility boilersuit. One-piece garment primary color: olive. Footwear: combat boots.");
    spec = setPromptExclusion(spec, C("footwear.type"), true);
    expect(compilePrompt(spec, core).prompt).not.toContain("Footwear");
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
    const { spec: cleared, removed } = resetCategory(spec, core, "person_wardrobe");
    expect(Object.keys(removed).sort()).toEqual([C("era"), C("footwear.type"), C("one_piece.primary_color"), C("one_piece.type")]);
    expect(Object.keys(cleared.selections)).toEqual(["person.makeup.presence"]);
    expect(restoreCategoryReset(cleared, removed).spec.selections).toEqual(spec.selections);
    expect(Object.keys(resetCategory(spec, core, "person_wardrobe_one_piece").removed).sort()).toEqual([C("one_piece.primary_color"), C("one_piece.type")]);
  });

  it("no gender, occupation or nationality restriction; traditional garments set nothing else", () => {
    for (const g of ["man", "woman", "nonbinary"]) expect(out([["person.identity.gender", single(g)], [C("one_piece.type"), single("ball_gown")], [C("bottoms.type"), single("pleated_skirt")]]).diagnostics.filter((d) => d.severity !== "info"), g).toEqual([]);
    const spec = buildSpec(core, [[C("one_piece.type"), single("hanbok")]]);
    expect(Object.keys(spec.selections)).toEqual([C("one_piece.type")]);
    expect(compilePrompt(spec, core).prompt).toBe("One-piece garment: hanbok.");
  });

  it.each([
    ["상의", "attribute", C("tops.type")],
    ["청바지", "option", C("bottoms.type")],
    ["청치마", "option", C("bottoms.type")],
    ["원피스", "attribute", C("one_piece.type")],
    ["치파오", "option", C("one_piece.type")],
    ["qipao", "option", C("one_piece.type")],
    ["패딩", "option", C("outerwear.type")],
    ["후드", "attribute", C("outerwear.hood")],
    ["운동화", "option", C("footwear.type")],
    ["니삭스", "option", C("hosiery.type")],
    ["골덴", "option", C("tops.material")],
    ["체크", "option", C("tops.pattern")],
    ["넥라인", "attribute", C("tops.neckline")],
    ["격식", "attribute", C("formality")],
    ["커버리지", "attribute", C("coverage")],
    ["oversized", "option", C("fit")],
  ])("search “%s” finds %s %s", (q, kind, attributeId) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === attributeId)).toBe(true);
  });
});

describe("safety (directive §12): neutral clothing description, existing policy unchanged", () => {
  it("policy 0.3.0 (TD-12): no clothing phrase is sexual wording; intimate innerwear is classified as intimate apparel — blocked only with minor/ambiguous age, the same for every intimate garment", () => {
    const flagged: string[] = [];
    const rules = new Set<string>();
    for (const a of wardrobe) {
      const texts = isOptionAttribute(a) ? a.options.map((o) => [o.id, o.prompt.text] as const) : a.type === "number" ? (a.bands ?? []).map((b, i) => [String(i), b.text] as const) : [];
      for (const [id, t] of texts) {
        const r = evaluateSafety({ tags: [], texts: [{ attributeId: a.id, text: `${a.prompt.template.replace("{value}", t)} girl child` }] }, baselinePolicy);
        if (r.findings.length) flagged.push(`${a.id}/${id}`);
        for (const f of r.findings) rules.add(f.ruleId);
        // Without age wording no clothing phrase raises any finding (also no “sexual appeal” withholding).
        expect(evaluateSafety({ tags: [], texts: [{ attributeId: a.id, text: a.prompt.template.replace("{value}", t) }] }, baselinePolicy).findings, `${a.id}/${id}`).toEqual([]);
      }
    }
    // 0.2.0 flagged only thermal / sports_bra / everyday_bra / full_coverage (as sexual wording) and let briefs, boxers, shapewear pass.
    expect(flagged).toEqual([...INTIMATE_INNERWEAR].map((o) => `${C("innerwear.type")}/${o}`));
    expect([...rules]).toEqual(["minor-intimate-apparel"]);
    // The registered options carry the same structured classification.
    const type = core.getAttribute(C("innerwear.type"))!;
    expect(isOptionAttribute(type) && type.options.filter((o) => o.policyTags?.includes("garment.intimate")).map((o) => o.id)).toEqual([...INTIMATE_INNERWEAR]);
  });

  it("innerwear: adults are not blocked; a minor (or ambiguous age) is blocked, also when the innerwear value is excluded or the age is hidden", () => {
    const bra: Array<[string, SelectionValue]> = [[C("innerwear.type"), single("sports_bra")]];
    expect(out(bra).blocked).toBe(false);
    expect(out([["person.identity.age", { kind: "number", value: 30, unit: "years" }], ...bra]).blocked).toBe(false);
    expect(out([["person.identity.age_group", single("adolescent")], ...bra]).blocked).toBe(true);
    expect(out([["person.identity.apparent_age", { kind: "number", value: 15, unit: "years" }], ...bra]).blocked).toBe(true);
    const excluded = setPromptExclusion(buildSpec(core, [["person.identity.age_group", single("child")], ...bra]), C("innerwear.type"), true);
    expect(compilePrompt(excluded, core).blocked).toBe(true);
    // Layering tops are not intimate apparel (unchanged)
    expect(out([["person.identity.age_group", single("child")], [C("innerwear.type"), single("undershirt")]]).blocked).toBe(false);
    // Consistency (0.3.0): briefs, boxer shorts and shapewear now behave exactly like the bras / underwear
    for (const o of INTIMATE_INNERWEAR) {
      const v: Array<[string, SelectionValue]> = [[C("innerwear.type"), single(o)]];
      expect(out(v).blocked, `${o} unknown age`).toBe(false);
      expect(out([["person.identity.age", { kind: "number", value: 30, unit: "years" }], ...v]).blocked, `${o} adult`).toBe(false);
      const minor = out([["person.identity.age_group", single("adolescent")], ...v]);
      expect(minor.diagnostics.filter((d) => d.code.startsWith("safety.")).map((d) => d.code), `${o} minor`).toEqual(["safety.minor-intimate-apparel"]);
    }
  });

  it("coverage, fit and garment “none” add no exposure: never blocked with a minor", () => {
    for (const cov of ["full", "high", "moderate", "light", "minimal"]) {
      expect(out([["person.identity.age_group", single("child")], [C("coverage"), single(cov)], [C("fit"), single("tight")]]).blocked, cov).toBe(false);
    }
    const nones: Array<[string, SelectionValue]> = Object.keys(TYPES).map((g) => [C(`${g}.type`), single("none")]);
    const c = out([["person.identity.age_group", single("child")], ...nones]);
    expect(c.blocked).toBe(false);
    expect(c.prompt).not.toMatch(/nude|naked|topless|bottomless|unclothed|no clothes/i);
  });

  it("custom garment names are safety-checked like any text", () => {
    expect(out([["person.identity.age_group", single("child")], [C("tops.type"), { kind: "single", custom: { label: "lingerie top" } }]]).blocked).toBe(true);
    expect(out([["intent.description", text("portrait")], [C("tops.type"), { kind: "single", custom: { label: "linen tunic" } }]]).blocked).toBe(false);
  });
});
