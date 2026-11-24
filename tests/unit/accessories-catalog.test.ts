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
import { buildSpec, multi, single } from "../fixtures/specs";

/** Sprint 2-B.5C — Person › Accessories (18 attributes). */
const core = getCoreRegistry();
const out = (entries: Array<[string, SelectionValue]>) => compilePrompt(buildSpec(core, entries), core);
const prompt = (entries: Array<[string, SelectionValue]>) => out(entries).prompt;
const A = (x: string) => `person.accessories.${x}`;
const accessories = core.attributes().filter((a) => a.id.startsWith("person.accessories."));
const opt = (id: string) => {
  const a = core.getAttribute(id)!;
  return isOptionAttribute(a) ? a.options : [];
};

/** Directive §9 — id → [multi?, approved English options (after “none”)]. Colors use the shared palette. */
const APPROVED: Record<string, [boolean, string[]]> = {
  eyewear: [false, ["Eyeglasses", "Sunglasses", "Reading glasses", "Protective goggles", "Fashion goggles", "Monocle"]],
  frame_shape: [false, ["Round", "Oval", "Rectangular", "Square", "Cat-eye", "Aviator", "Browline", "Rimless", "Geometric"]],
  frame_color: [false, []],
  hat: [false, ["Baseball cap", "Flat cap", "Beanie", "Beret", "Fedora", "Bucket hat", "Straw hat", "Sun hat", "Cowboy hat", "Top hat", "Bowler hat", "Bonnet", "Headscarf"]],
  hat_color: [false, []],
  hair_accessories: [true, ["Hairpin", "Barrette", "Hair clip", "Claw clip", "Headband", "Hair ribbon", "Scrunchie", "Decorative hair comb", "Floral hair accessory"]],
  earrings: [true, ["Stud earrings", "Hoop earrings", "Drop earrings", "Dangle earrings", "Chandelier earrings", "Ear cuffs"]],
  necklace: [true, ["Chain necklace", "Pendant necklace", "Choker", "Pearl necklace", "Beaded necklace", "Layered necklaces", "Locket"]],
  bracelets: [true, ["Chain bracelet", "Bangle", "Cuff bracelet", "Beaded bracelet", "Leather bracelet", "Charm bracelet"]],
  rings: [true, ["Simple ring", "Gemstone ring", "Signet ring", "Band ring", "Multiple rings"]],
  watch: [false, ["Analog wristwatch", "Digital wristwatch", "Smartwatch", "Pocket watch"]],
  belt: [false, ["Leather belt", "Fabric belt", "Woven belt", "Decorative belt", "Chain belt"]],
  bag: [false, ["Backpack", "Shoulder bag", "Crossbody bag", "Tote bag", "Clutch bag", "Messenger bag", "Briefcase", "Satchel", "Waist bag", "Handbag"]],
  scarf: [false, ["Silk scarf", "Knitted scarf", "Wool scarf", "Neck scarf", "Shawl", "Bandana"]],
  gloves: [false, ["Leather gloves", "Knitted gloves", "Dress gloves", "Fingerless gloves", "Mittens"]],
  necktie: [false, ["Necktie", "Bow tie", "Bolo tie", "Cravat"]],
  piercings: [true, ["Ear piercing", "Nose stud", "Nose ring", "Septum piercing", "Eyebrow piercing", "Lip piercing"]],
  decorative: [true, ["Brooch", "Lapel pin", "Badge", "Cufflinks", "Pocket square", "Decorative chain"]],
};

describe("registration and integrity (18 new attributes, order 460–477; 277 cumulative person attributes)", () => {
  it("registers exactly the approved attributes on one page as approved Direct attributes with the output toggle", () => {
    expect(accessories.map((a) => a.id)).toEqual(Object.keys(APPROVED).map(A));
    expect(accessories.map((a) => a.order)).toEqual(Array.from({ length: 18 }, (_, i) => 460 + i));
    for (const a of accessories) {
      const [isMulti, list] = APPROVED[a.id.split(".")[2]!]!;
      expect(a.categoryId, a.id).toBe("person_accessories");
      expect(a.type, a.id).toBe(isMulti ? "multi" : "single");
      expect(a.status, a.id).toBe("approved");
      expect(a.expression?.role, a.id).toBe("direct");
      expect(a.outputToggle, a.id).toBe(true);
      expect(isOptionAttribute(a) && a.custom, a.id).toBeTruthy();
      if (list.length) {
        expect(opt(a.id).map((o) => o.label.en), a.id).toEqual(a.id.endsWith("frame_shape") ? list : ["None", ...list]);
      }
    }
    expect(core.categories.filter((c) => c.parentId === "person_accessories")).toEqual([]);
    // 277 cumulative after 2-B.5; 300 after Sprint 2-B.6 added the appearance direction and 22 pose attributes
    expect(core.attributes().filter((a) => a.id.startsWith("person.") && !/^person\.(appearance|pose)\./.test(a.id) && core.isExposed(a, "detailed"))).toHaveLength(277);
  });

  it("frame and hat colors use the shared 55-color palette in 10 groups", () => {
    for (const id of [A("frame_color"), A("hat_color")]) {
      expect(opt(id)).toHaveLength(55);
      expect(opt(id).map((o) => o.id)).toEqual(opt("person.clothing.tops.primary_color").map((o) => o.id));
    }
  });

  it("every option compiles alone to exactly its sentence; “none” is explicit (“Earrings: none.”)", () => {
    for (const a of accessories) {
      for (const o of opt(a.id)) expect(prompt([[a.id, a.type === "single" ? single(o.id) : multi(o.id)]]), `${a.id}/${o.id}`).toBe(a.prompt.template.replace("{value}", o.prompt.text));
    }
    expect(prompt([[A("earrings"), multi("none")], [A("hat"), single("none")]])).toBe("Hat: none. Earrings: none.");
  });
});

describe("rules and applicability (directive §9)", () => {
  it("directive §10 example and multi-select accessories worn together", () => {
    expect(prompt([[A("eyewear"), single("eyeglasses")], [A("frame_shape"), single("round")], [A("necklace"), multi("pendant")]])).toBe("Eyewear: eyeglasses. Eyewear frame shape: round frames. Necklace: pendant necklace.");
    expect(prompt([[A("earrings"), multi("stud", "hoop", "ear_cuff")], [A("rings"), multi("signet", "band")], [A("piercings"), multi("nose_stud", "septum")]])).toBe(
      "Earrings: stud earrings, hoop earrings, ear cuffs. Rings: signet ring, band ring. Piercings: nose stud, septum piercing.",
    );
  });

  it("no eyewear hides frame shape and color; no hat hides the hat color (values kept, restored when worn again)", () => {
    const frames: Array<[string, SelectionValue]> = [[A("frame_shape"), single("aviator")], [A("frame_color"), single("gold")], [A("hat_color"), single("navy")]];
    const spec = buildSpec(core, [[A("eyewear"), single("none")], [A("hat"), single("none")], ...frames]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Eyewear: none. Hat: none.");
    expect(Object.keys(spec.selections)).toHaveLength(5);
    expect(c.diagnostics.filter((d) => d.code === "selection.inactive").map((d) => d.attributeId).sort()).toEqual([A("frame_color"), A("frame_shape"), A("hat_color")]);
    expect(prompt([[A("eyewear"), single("sunglasses")], [A("hat"), single("beret")], ...frames])).toBe(
      "Eyewear: sunglasses. Eyewear frame shape: aviator frames. Eyewear frame color: gold. Hat: beret. Hat color: navy.",
    );
    expect(prompt(frames)).toBe("Eyewear frame shape: aviator frames. Eyewear frame color: gold. Hat color: navy."); // unset parent → usable
  });

  it("“none” together with other entries warns for every multi-select accessory (non-blocking, nothing changed)", () => {
    for (const key of ["hair_accessories", "earrings", "necklace", "bracelets", "rings", "piercings", "decorative"]) {
      const second = opt(A(key))[1]!.id;
      const c = out([[A(key), multi("none", second)]]);
      expect(c.diagnostics.map((d) => d.code), key).toContain(`rule.accessories-${key.replace(/_/g, "-")}-none-with-others`);
      expect(c.blocked, key).toBe(false);
      expect(out([[A(key), multi(second)]]).diagnostics.filter((d) => d.code.startsWith("rule.")), key).toEqual([]);
    }
  });

  it("nothing adds other accessories; no gender, occupation or status restriction", () => {
    const spec = buildSpec(core, [[A("necktie"), single("bow_tie")]]);
    expect(Object.keys(spec.selections)).toEqual([A("necktie")]);
    for (const g of ["man", "woman", "nonbinary"]) {
      expect(out([["person.identity.gender", single(g)], [A("earrings"), multi("chandelier")], [A("necktie"), single("necktie")], [A("bag"), single("clutch")]]).diagnostics.filter((d) => d.severity !== "info"), g).toEqual([]);
    }
  });

  it("custom accessory (name + expression), exclusion, JSON round-trip, reset and restore", () => {
    let spec = buildSpec(core, [
      [A("decorative"), { kind: "multi", optionIds: ["brooch"], custom: [{ label: "회중 체인", expression: "a fob chain" }] }],
      [A("watch"), single("pocket")],
      ["person.clothing.outerwear.type", single("blazer")],
    ]);
    expect(compilePrompt(spec, core).prompt).toBe("Outerwear: blazer. Watch: pocket watch. Decorative accessories: brooch, a fob chain.");
    spec = setPromptExclusion(spec, A("watch"), true);
    expect(compilePrompt(spec, core).prompt).toBe("Outerwear: blazer. Decorative accessories: brooch, a fob chain.");
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
    const { spec: cleared, removed } = resetCategory(spec, core, "person_accessories");
    expect(Object.keys(removed).sort()).toEqual([A("decorative"), A("watch")]);
    expect(Object.keys(cleared.selections)).toEqual(["person.clothing.outerwear.type"]);
    expect(restoreCategoryReset(cleared, removed).spec.selections).toEqual(spec.selections);
  });

  it("no accessory phrase raises a safety signal", () => {
    for (const a of accessories) {
      const report = evaluateSafety({ tags: [], texts: opt(a.id).map((o) => ({ attributeId: a.id, text: `${a.prompt.template.replace("{value}", o.prompt.text)} girl child` })) }, baselinePolicy);
      expect(report.findings, a.id).toEqual([]);
    }
  });

  it.each([
    ["안경", "attribute", A("eyewear")],
    ["선글라스", "option", A("eyewear")],
    ["뿔테", "attribute", A("frame_shape")],
    ["모자", "attribute", A("hat")],
    ["벙거지", "option", A("hat")],
    ["곱창", "option", A("hair_accessories")],
    ["귀걸이", "attribute", A("earrings")],
    ["초커", "option", A("necklace")],
    ["반지", "attribute", A("rings")],
    ["스마트워치", "option", A("watch")],
    ["에코백", "option", A("bag")],
    ["목도리", "attribute", A("scarf")],
    ["나비넥타이", "option", A("necktie")],
    ["piercing", "attribute", A("piercings")],
    ["커프스", "option", A("decorative")],
  ])("search “%s” finds %s %s", (q, kind, attributeId) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === attributeId)).toBe(true);
  });
});
