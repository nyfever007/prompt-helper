import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compilePrompt, getCoreRegistry, isOptionAttribute, searchCatalog, searchOptions, type OptionAttributeDefinition } from "@/domain";
import { REGION_DATA_VERSION, REGIONS } from "@/domain/catalog/catalogs/person/regions";
import { buildSpec, single } from "../fixtures/specs";

/**
 * Sprint 2-B.1 — the APPROVED identity vocabulary (docs/SPRINT_2B1_SPEC_REVIEW.md 3rd revision,
 * Appendix B/C) is reproduced here independently of the catalog code, so any accidental
 * change of an id, a label rule or an English expression fails a test.
 */
const core = getCoreRegistry();
const P = "person.identity.";

const TEMPLATES: Record<string, string> = {
  entity_type: "Type of being: {value}.",
  species: "Species: {value}.",
  character_origin: "Character origin: {value}.",
  age_group: "Age group: {value}.",
  age: "Actual age: {value} old.",
  apparent_age: "Apparent age: approximately {value} old.",
  gender: "Gender: {value}.",
  gender_presentation: "Gender presentation: {value}.",
  nationality: "Nationality (country or region): {value}.",
  ethnic_background: "Ethnic background: {value}.",
  cultural_background: "Cultural background: {value}.",
  historical_period: "Character's historical era: {value}.",
  occupation: "Occupation: {value}.",
  narrative_role: "Narrative role: {value}.",
  social_status: "Social status: {value}.",
  description: "Character description: {value}",
};

/** option id → approved English expression (Appendix B). Gender woman/man: non-adult default (adult variant tested separately). */
const EXPRESSIONS: Record<string, Record<string, string>> = {
  entity_type: { human: "human", fantasy_humanoid: "fantasy humanoid", alien_humanoid: "alien humanoid", android: "android", cyborg: "cyborg", humanoid_robot: "humanoid robot", anthropomorphic: "anthropomorphic character", supernatural: "supernatural being", mythological: "mythological being", artificial_life: "artificial life form" },
  species: { human: "human", elf: "elf", dwarf: "fantasy dwarf", orc: "orc", goblin: "goblin", giant: "fantasy giant", dragon_humanoid: "dragon humanoid", beastfolk: "beastfolk", catfolk: "feline beastfolk", foxfolk: "fox beastfolk", wolffolk: "wolf beastfolk", fairy: "fairy", elemental: "elemental being", angel: "angel", demon: "demon", vampire: "vampire", undead: "undead being", hybrid: "hybrid species" },
  character_origin: { fictional: "fictional character", real: "real person", historical: "historical figure", mythological: "mythological figure", original: "original character" },
  age_group: { newborn: "newborn", infant: "infant", toddler: "toddler", preschool: "preschool-aged child", child: "child", adolescent: "adolescent", young_adult: "young adult", adult: "adult aged 30–44", middle_aged: "middle-aged adult", older_adult: "older adult", advanced_age: "adult aged 80 or older", ageless: "ageless" },
  gender: { woman: "female character", man: "male character", nonbinary: "non-binary person", genderless: "genderless character", genderfluid: "genderfluid person" },
  gender_presentation: { feminine: "feminine", masculine: "masculine", androgynous: "androgynous", mixed: "mixed masculine and feminine", neutral: "gender-neutral" },
  ethnic_background: { korean: "Korean", japanese: "Japanese", han: "Han Chinese", tamil: "Tamil", yoruba: "Yoruba", maori: "Māori", arab: "Arab", mixed: "mixed" },
  cultural_background: { korean: "Korean", japanese: "Japanese", chinese: "Chinese", mediterranean: "Mediterranean", diaspora: "diaspora", multicultural: "multicultural", fictional: "fictional culture" },
  historical_period: { prehistoric: "prehistoric era", ancient: "ancient era", medieval: "medieval era", renaissance: "Renaissance", early_modern: "early modern era", industrial: "industrial era", early_20c: "early 20th century", mid_20c: "mid-20th century", late_20c: "late 20th century", contemporary: "contemporary era", future: "future era", far_future: "far future", joseon: "Joseon era (Korea)", edo: "Edo period (Japan)", fictional: "fictional era" },
  occupation: { doctor: "physician", nurse: "nurse", pharmacist: "pharmacist", developer: "software developer", engineer: "engineer", researcher: "researcher", architect: "architect", designer: "designer", artist: "artist", teacher: "teacher", professor: "professor", student: "student", merchant: "merchant", executive: "business executive", entrepreneur: "entrepreneur", chef: "chef", mechanic: "mechanic", driver: "driver", farmer: "farmer", fisher: "fisher", sailor: "sailor", soldier: "soldier", police: "police officer", firefighter: "firefighter", writer: "writer", musician: "musician", actor: "actor", mage: "mage", knight: "knight", alchemist: "alchemist", healer: "healer", explorer: "explorer", adventurer: "adventurer", pilot: "pilot" },
  narrative_role: { protagonist: "protagonist", antagonist: "antagonist", supporting: "supporting character", rival: "rival", guardian: "guardian", mentor: "mentor", companion: "companion", civilian: "civilian", wanderer: "wanderer", leader: "leader", observer: "observer" },
  social_status: { royalty: "royalty", nobility: "nobility", commoner: "commoner", clergy: "clergy", executive: "corporate leadership", official: "public official", independent: "independent social standing" },
};

const optionAttr = (suffix: string) => core.getAttribute(P + suffix) as OptionAttributeDefinition;

describe("identity catalog: approved structure (D2, D12, N2)", () => {
  it("has exactly the 16 approved attributes, in order 201–216, all approved Detailed attributes of person_identity subtree", () => {
    const ids = core.attributes().filter((a) => a.id.startsWith(P));
    expect(ids.map((a) => a.id.slice(P.length))).toEqual(Object.keys(TEMPLATES));
    expect(ids.map((a) => a.order)).toEqual(Array.from({ length: 16 }, (_, i) => 201 + i));
    for (const a of ids) {
      expect(a.status).toBe("approved");
      expect(a.tier).toBe("detailed");
      expect(core.categoryPath(a.categoryId!)).toEqual(["person", "person_identity", a.categoryId]);
      expect(a.prompt.template).toBe(TEMPLATES[a.id.slice(P.length)]);
      expect(a.outputToggle).toBe(true);
      expect(a.label.ko && a.label.en).toBeTruthy();
      expect(a.aliases?.length).toBeGreaterThan(0);
    }
  });

  it("uses the approved selection types (nationality is MULTI; social status and historical period single + custom; age group single)", () => {
    const types = Object.fromEntries(core.attributes().filter((a) => a.id.startsWith(P)).map((a) => [a.id.slice(P.length), a.type]));
    expect(types).toEqual({
      entity_type: "single", species: "single", character_origin: "single", age_group: "single", age: "quantity", apparent_age: "quantity",
      gender: "single", gender_presentation: "single", nationality: "multi", ethnic_background: "multi", cultural_background: "multi",
      historical_period: "single", occupation: "multi", narrative_role: "multi", social_status: "single", description: "text",
    });
    const withCustom = core.attributes().filter((a) => a.id.startsWith(P) && isOptionAttribute(a) && a.custom).map((a) => a.id.slice(P.length));
    expect(withCustom).toEqual([
      "entity_type", "species", "gender", "gender_presentation", "nationality", "ethnic_background", "cultural_background",
      "historical_period", "occupation", "narrative_role", "social_status",
    ]);
    const nameOnly = core.attributes().filter((a) => a.id.startsWith(P) && isOptionAttribute(a) && a.custom?.nameOnlyNotice).map((a) => a.id.slice(P.length));
    expect(nameOnly).toEqual(["entity_type", "species", "gender_presentation"]); // Direct roles
  });

  it("declares the approved expression roles (Direct/Context) and kinds", () => {
    const roles = Object.fromEntries(core.attributes().filter((a) => a.id.startsWith(P)).map((a) => [a.id.slice(P.length), a.expression?.role]));
    expect(Object.entries(roles).filter(([, r]) => r === "direct").map(([k]) => k)).toEqual(["entity_type", "species", "age_group", "apparent_age", "gender_presentation"]);
    expect(Object.values(roles).every((r) => r === "direct" || r === "context")).toBe(true);
  });

  it("“custom” is never a registered option: user-defined values are CustomEntry values", () => {
    for (const a of core.attributes()) if (isOptionAttribute(a)) expect(a.options.some((o) => o.id === "custom")).toBe(false);
  });

  it("every registered option keeps its approved id and English expression (Appendix B); no option was dropped or added", () => {
    for (const [suffix, map] of Object.entries(EXPRESSIONS)) {
      const a = optionAttr(suffix);
      expect(Object.fromEntries(a.options.map((o) => [o.id, o.prompt.text])), suffix).toEqual(map);
    }
  });

  it("every option has Korean and English labels; the antagonist is labelled 대립자 (D14); the 30–44 bin is “일반 성인 (30–44세)”", () => {
    for (const a of core.attributes().filter((x) => x.id.startsWith(P))) {
      if (!isOptionAttribute(a)) continue;
      for (const o of a.options) {
        expect(o.label.ko, `${a.id}/${o.id}`).toBeTruthy();
        expect(o.label.en, `${a.id}/${o.id}`).toBeTruthy();
      }
    }
    expect(optionAttr("narrative_role").options.find((o) => o.id === "antagonist")!.label.ko).toBe("대립자");
    expect(optionAttr("age_group").options.find((o) => o.id === "adult")!.label).toEqual({ en: "Adult (30–44)", ko: "일반 성인 (30–44세)" });
  });

  it("occupation groups are display-only and cover all 34 occupations; beastfolk children are hierarchical", () => {
    const occ = optionAttr("occupation");
    expect(occ.optionGroups!.map((g) => g.id)).toEqual(["medicine", "technology", "design", "education", "business", "services", "land_sea", "public", "arts_media", "fantasy", "exploration"]);
    expect(occ.options).toHaveLength(34);
    expect(occ.options.every((o) => o.group && !o.parentId)).toBe(true);
    expect(occ.options.some((o) => occ.optionGroups!.some((g) => g.id === o.id))).toBe(false); // groups are not options
    expect(core.lineage(P + "species", "catfolk")).toEqual(["catfolk", "beastfolk"]);
  });

  it("Identity has its 6 subcategories; approved person areas are exactly Identity (2-B.1) and the 5 facial areas (2-B.2)", () => {
    expect(core.categories.filter((c) => c.parentId === "person_identity").map((c) => c.id)).toEqual([
      "person_identity_being", "person_identity_age", "person_identity_gender", "person_identity_background", "person_identity_social", "person_identity_other",
    ]);
    const approvedPerson = core.categories.filter((c) => core.categoryPath(c.id)[0] === "person" && core.isCategoryApproved(c.id)).map((c) => c.id);
    expect(approvedPerson.sort()).toEqual(
      ["person", "person_identity", "person_identity_being", "person_identity_age", "person_identity_gender", "person_identity_background", "person_identity_social", "person_identity_other",
        "person_face", "person_eyes", "person_eyebrows", "person_nose", "person_lips"].sort(),
    );
  });
});

describe("countries and regions (N2, §6)", () => {
  const nat = optionAttr("nationality");
  const appendixA = readFileSync(join(__dirname, "../../docs/SPRINT_2B1_SPEC_REVIEW.md"), "utf8")
    .split("## 부록 A")[1]!
    .split("## 부록 B")[0]!
    .split("\n")
    .map((l) => l.match(/^\| `([a-z]{2})` \| [^|]+ \| [^|]+ \| ([^|]+) \|$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1]!, m[2]!.replace(/[†‡]/gu, "").trim()] as const);

  it("contains every approved entry of Appendix A (193 UN members + VA, PS + TW, HK, MO, XK) with its approved expression, plus stateless", () => {
    expect(appendixA).toHaveLength(199);
    expect(REGIONS).toHaveLength(199);
    expect(Object.fromEntries(REGIONS.map((r) => [r.id, r.expression]))).toEqual(Object.fromEntries(appendixA));
    expect(nat.options).toHaveLength(200);
    expect(nat.options[nat.options.length - 1]!.id).toBe("stateless");
    for (const id of ["kr", "jp", "cn", "in", "us", "ca", "gb", "fr", "de", "br", "au", "ng", "tw", "hk", "mo", "xk", "va", "ps"]) expect(nat.options.some((o) => o.id === id), id).toBe(true);
  });

  it("uses the approved display names, “and” instead of “&”, and keeps display name ≠ prompt expression", () => {
    const by = (id: string) => nat.options.find((o) => o.id === id)!;
    expect([by("ps").label, by("hk").label, by("mo").label, by("cg").label, by("cd").label, by("ne").label, by("ng").label]).toEqual([
      { en: "Palestine", ko: "팔레스타인" },
      { en: "Hong Kong", ko: "홍콩" },
      { en: "Macao", ko: "마카오" },
      { en: "Republic of the Congo", ko: "콩고공화국" },
      { en: "Democratic Republic of the Congo", ko: "콩고민주공화국" },
      { en: "Niger", ko: "니제르" },
      { en: "Nigeria", ko: "나이지리아" },
    ]);
    expect(by("ne").prompt.text).toBe("Nigerien (Niger)"); // distinguishable from “Nigerian”
    for (const o of nat.options) {
      expect(o.label.en).not.toContain("&");
      expect(o.prompt.text).not.toContain("&");
    }
    expect(new Set(nat.options.map((o) => o.prompt.text)).size).toBe(200); // confusable entries are distinct
    expect(by("ag").aliases).toContain("Antigua & Barbuda"); // “&” still searchable
  });

  it("records data sources and versions", () => {
    expect(REGION_DATA_VERSION).toEqual({ regions: "0.1.0", demonyms: "0.1.0", aliases: "0.1.0", cldr: "48" });
    const src = readFileSync(join(__dirname, "../../src/domain/catalog/catalogs/person/regions.ts"), "utf8");
    expect(src).toMatch(/Unicode CLDR 48/);
    expect(src).toMatch(/Prompter-authored, no external dataset/);
  });

  it("supports Korean, English, code and alias search", () => {
    const top = (q: string) => searchOptions(nat, q)[0]?.option.id;
    expect(top("대한민국")).toBe("kr");
    expect(top("한국")).toBe("kr");
    expect(top("South Korea")).toBe("kr");
    expect(top("USA")).toBe("us");
    expect(top("콩고민주")).toBe("cd");
    expect(top("Burma")).toBe("mm");
    expect(top("무국적")).toBe("stateless");
  });
});

describe("compiled output of every option (N4 review basis, Appendix B)", () => {
  it("each option alone compiles to its approved sentence, right after the subject, with nothing added", () => {
    for (const [suffix, map] of Object.entries(EXPRESSIONS)) {
      for (const [id, expr] of Object.entries(map)) {
        const c = compilePrompt(buildSpec(core, [["subject.kind", single("person")], [P + suffix, suffix === "nationality" || optionAttr(suffix).type === "multi" ? { kind: "multi", optionIds: [id] } : single(id)]]), core);
        expect(c.blocked, `${suffix}/${id}`).toBe(false);
        expect(c.prompt, `${suffix}/${id}`).toBe(`Main subject: a single person. ${TEMPLATES[suffix]!.replace("{value}", expr)}`);
      }
    }
  });

  it("nationality options compile with the approved frame", () => {
    const c = compilePrompt(buildSpec(core, [[P + "nationality", { kind: "multi", optionIds: ["kr", "jp", "stateless"] }]]), core);
    expect(c.prompt).toBe("Nationality (country or region): Japanese, South Korean, stateless.");
  });

  it("no identity phrase adds appearance, wardrobe, pose or props (independence principle)", () => {
    const forbidden = /\b(skin|hair|eyes?|ears?|face|body|tall|short|slim|curvy|wearing|dressed|clothing|outfit|uniform|costume|robe|armor|smil|pose|holding|tattoo|makeup)\b/iu;
    for (const a of core.attributes().filter((x) => x.id.startsWith(P))) {
      if (!isOptionAttribute(a)) continue;
      for (const o of a.options) {
        for (const text of [o.prompt.text, ...(o.prompt.variants ?? []).map((v) => v.text)]) expect(text, `${a.id}/${o.id}`).not.toMatch(forbidden);
      }
    }
  });
});

describe("catalog-wide search finds identity attributes and options (Korean/English/aliases)", () => {
  const hits = (q: string) => searchCatalog(core, q).map((h) => `${h.kind}:${h.attributeId ?? h.categoryId}${h.optionId ? `/${h.optionId}` : ""}`);
  it.each([
    ["elf", "option:person.identity.species/elf"],
    ["엘프", "option:person.identity.species/elf"],
    ["developer", "option:person.identity.occupation/developer"],
    ["software developer", "option:person.identity.occupation/developer"],
    ["개발자", "option:person.identity.occupation/developer"],
    ["apparent age", "attribute:person.identity.apparent_age"],
    ["외형적 연령", "attribute:person.identity.apparent_age"],
    ["악역", "option:person.identity.narrative_role/antagonist"],
  ])("“%s” → %s", (q, expected) => {
    expect(hits(q)).toContain(expected);
  });
});
