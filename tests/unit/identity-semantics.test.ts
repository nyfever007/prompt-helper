import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applySelection,
  assessAge,
  canonicalizeSpec,
  CatalogRegistry,
  clearSelection,
  compilePrompt,
  createEmptySpec,
  createMemoryStore,
  createSpecStorage,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  parseImageSpec,
  setPromptExclusion,
  WORKSPACE_STORAGE_KEY,
  type ImageSpec,
  type SelectionValue,
} from "@/domain";
import { buildFixtureCatalog } from "@/testing/fixtureCatalog";
import { cloneCore } from "../fixtures/catalogs";
import { buildSpec, single, text } from "../fixtures/specs";

const core = getCoreRegistry();
const P = "person.identity.";
const yrs = (value: number): SelectionValue => ({ kind: "number", value, unit: "years" });
const range = (min: number, max: number, unit = "years"): SelectionValue => ({ kind: "range", min, max, unit });
const qty = (value: number, unit: string): SelectionValue => ({ kind: "number", value, unit });
const custom = (label: string, expression?: string): SelectionValue => ({ kind: "single", custom: { label, ...(expression ? { expression } : {}) } });
const id = (entries: Array<[string, SelectionValue]>) => buildSpec(core, entries.map(([k, v]) => [P + k, v]));
const genderOut = (spec: ImageSpec) => compilePrompt(spec, core).fragments.find((f) => f.attributeId === P + "gender")?.text;

describe("age assessment decision table (spec review §5.3 — D7, N3, Q1, Q2)", () => {
  // [#, selections, ageClass, being]
  const cases: Array<[string, Array<[string, SelectionValue]>, string, string]> = [
    ["1 human, actual 28", [["entity_type", single("human")], ["age", yrs(28)]], "adult", "human"],
    ["2 human, actual 16, apparent 25", [["entity_type", single("human")], ["age", yrs(16)], ["apparent_age", yrs(25)]], "minor", "human"],
    ["3 elf, 300, apparent 30", [["species", single("elf")], ["age", yrs(300)], ["apparent_age", yrs(30)]], "adult", "nonhuman"],
    ["4 elf, 300, apparent 12", [["species", single("elf")], ["age", yrs(300)], ["apparent_age", yrs(12)]], "minor", "nonhuman"],
    ["5 elf, 300, apparent unset", [["species", single("elf")], ["age", yrs(300)]], "unknown", "nonhuman"],
    ["6 human, actual 16–20", [["entity_type", single("human")], ["age", range(16, 20)]], "ambiguous", "human"],
    ["7 human, 360 months (= 30 years)", [["entity_type", single("human")], ["age", qty(360, "months")]], "adult", "human"],
    ["8 human, 216 months (= 18 years)", [["entity_type", single("human")], ["age", qty(216, "months")]], "adult", "human"],
    ["9 human, 200 days", [["entity_type", single("human")], ["age", qty(200, "days")]], "minor", "human"],
    ["10 unset being, actual 28 (N3: human basis)", [["age", yrs(28)]], "adult", "human"],
    ["10a all unset", [], "unknown", "human"],
    ["10b android, 28", [["entity_type", single("android")], ["age", yrs(28)]], "unknown", "nonhuman"],
    ["10c orc, 40", [["species", single("orc")], ["age", yrs(40)]], "unknown", "nonhuman"],
    ["10d human cyborg (cyborg + human species), 28 (Q2)", [["entity_type", single("cyborg")], ["species", single("human")], ["age", yrs(28)]], "adult", "human"],
    ["10e custom entity, 30 (Q1)", [["entity_type", custom("별빛 정령")], ["age", yrs(30)]], "unknown", "unclassified"],
    ["10f android + human species, 28, apparent unset (Q2)", [["entity_type", single("android")], ["species", single("human")], ["age", yrs(28)]], "unknown", "nonhuman"],
    ["10g android, 100, apparent 28 (Q2)", [["entity_type", single("android")], ["age", yrs(100)], ["apparent_age", yrs(28)]], "adult", "nonhuman"],
    ["10h human cyborg, 16, apparent 30 (Q2)", [["entity_type", single("cyborg")], ["species", single("human")], ["age", yrs(16)], ["apparent_age", yrs(30)]], "minor", "human"],
    ["10i custom entity, 100, apparent unset (Q1/Q2)", [["entity_type", custom("Lumian")], ["age", yrs(100)]], "unknown", "unclassified"],
    ["10j cyborg, species unset, 28 (ambiguous → conservative)", [["entity_type", single("cyborg")], ["age", yrs(28)]], "unknown", "unclassified"],
    ["10k human + elf species (conflicting), 28", [["entity_type", single("human")], ["species", single("elf")], ["age", yrs(28)]], "unknown", "unclassified"],
    ["10l unset being, child group, 30", [["age_group", single("child")], ["age", yrs(30)]], "minor", "human"],
    ["11 young adult group", [["age_group", single("young_adult")]], "adult", "human"],
    ["12 human, adolescent group, 25", [["entity_type", single("human")], ["age_group", single("adolescent")], ["age", yrs(25)]], "minor", "human"],
    ["13 ageless", [["age_group", single("ageless")]], "unknown", "human"],
    ["14 apparent 17–19", [["apparent_age", range(17, 19)]], "ambiguous", "human"],
    ["15 elf, 10, apparent 30", [["species", single("elf")], ["age", yrs(10)], ["apparent_age", yrs(30)]], "minor", "nonhuman"],
    ["16 custom entity, apparent 30", [["entity_type", custom("Lumian")], ["apparent_age", yrs(30)]], "adult", "unclassified"],
    ["boundary: 6574 days (< 18 y)", [["age", qty(6574, "days")]], "minor", "human"],
    ["boundary: 6575 days (≥ 18 y)", [["age", qty(6575, "days")]], "adult", "human"],
    ["catfolk inherits beastfolk (nonhuman), 30", [["species", single("catfolk")], ["age", yrs(30)]], "unknown", "nonhuman"],
    ["hybrid species is unclassified, 30", [["species", single("hybrid")], ["age", yrs(30)]], "unknown", "unclassified"],
  ];
  it.each(cases)("%s", (_name, entries, ageClass, being) => {
    const spec = id(entries);
    const a = assessAge(spec, core);
    expect(a.ageClass).toBe(ageClass);
    expect(a.being).toBe(being);
    // nothing is written into the spec by the assessment (no implicit human / age / gender)
    expect(Object.keys(spec.selections).sort()).toEqual(entries.map(([k]) => P + k).sort());
  });

  it("excluded and inapplicable values still count (#17, #18)", () => {
    const excluded = setPromptExclusion(id([["species", single("elf")], ["age", yrs(300)], ["apparent_age", yrs(12)]]), P + "apparent_age", true);
    expect(assessAge(excluded, core).ageClass).toBe("minor");
    const inactive = buildSpec(core, [["subject.kind", single("landscape")], [P + "entity_type", single("human")], [P + "age", yrs(15)]]);
    expect(assessAge(inactive, core).ageClass).toBe("minor");
  });
});

describe("conditional gender wording (D7) — the stored choice never changes", () => {
  it.each([
    ["adult → woman", [["entity_type", single("human")], ["age", yrs(28)]], "Gender: woman."],
    ["unset being + 28 → woman (N3)", [["age", yrs(28)]], "Gender: woman."],
    ["no age → female character", [], "Gender: female character."],
    ["ambiguous 16–20 → female character", [["age", range(16, 20)]], "Gender: female character."],
    ["elf 300 without apparent age → female character", [["species", single("elf")], ["age", yrs(300)]], "Gender: female character."],
    ["android 100 + apparent 28 → woman", [["entity_type", single("android")], ["age", yrs(100)], ["apparent_age", yrs(28)]], "Gender: woman."],
  ] as Array<[string, Array<[string, SelectionValue]>, string]>)("%s", (_n, entries, expected) => {
    const spec = id([...entries, ["gender", single("woman")]]);
    expect(genderOut(spec)).toBe(expected);
    expect(spec.selections[P + "gender"]!.value).toEqual(single("woman"));
  });
  it("man follows the same rule; other options are fixed", () => {
    expect(genderOut(id([["age", yrs(40)], ["gender", single("man")]]))).toBe("Gender: man.");
    expect(genderOut(id([["gender", single("man")]]))).toBe("Gender: male character.");
    expect(genderOut(id([["age", yrs(40)], ["gender", single("nonbinary")]]))).toBe("Gender: non-binary person.");
  });
});

describe("spec review §7 compilation examples", () => {
  it("1 / 1b / 1c / 1d", () => {
    const base: Array<[string, SelectionValue]> = [["subject.kind", single("person")], [P + "age", yrs(28)], [P + "gender", single("woman")], [P + "nationality", { kind: "multi", optionIds: ["kr"] }], [P + "occupation", { kind: "multi", optionIds: ["architect"] }]];
    const human = buildSpec(core, [...base.slice(0, 1), [P + "entity_type", single("human")], ...base.slice(1)]);
    expect(compilePrompt(human, core).prompt).toBe(
      "Main subject: a single person. Type of being: human. Actual age: 28 years old. Gender: woman. Nationality (country or region): South Korean. Occupation: architect.",
    );
    expect(compilePrompt(buildSpec(core, base), core).prompt).toBe(
      "Main subject: a single person. Actual age: 28 years old. Gender: woman. Nationality (country or region): South Korean. Occupation: architect.",
    );
    const occExcluded = setPromptExclusion(human, P + "occupation", true);
    expect(compilePrompt(occExcluded, core).prompt).toBe(
      "Main subject: a single person. Type of being: human. Actual age: 28 years old. Gender: woman. Nationality (country or region): South Korean.",
    );
    expect(occExcluded.selections[P + "occupation"]!.value).toEqual({ kind: "multi", optionIds: ["architect"] });
    const android = buildSpec(core, [...base.slice(0, 1), [P + "entity_type", single("android")], ...base.slice(1)]);
    expect(compilePrompt(android, core).prompt).toContain("Type of being: android. Actual age: 28 years old. Gender: female character.");
  });

  it("2: fantasy humanoid + elf + 300 + apparent 30 → entity type covered once by species (provenance kept)", () => {
    const spec = buildSpec(core, [["subject.kind", single("person")], [P + "entity_type", single("fantasy_humanoid")], [P + "species", single("elf")], [P + "age", yrs(300)], [P + "apparent_age", yrs(30)]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Main subject: a single person. Species: elf. Actual age: 300 years old. Apparent age: approximately 30 years old.");
    expect(c.covered).toEqual([{ attributeId: P + "entity_type", coveredBy: P + "species", byOptionIds: ["elf"] }]);
    expect(spec.selections[P + "entity_type"]).toBeDefined(); // kept in the spec
  });

  it("2b: an atypical creative combination is kept and output, with a non-blocking notice only", () => {
    const c = compilePrompt(id([["entity_type", single("android")], ["species", single("elf")]]), core);
    expect(c.prompt).toBe("Type of being: android. Species: elf.");
    expect(c.covered).toBeUndefined();
    const atypical = c.diagnostics.filter((d) => d.code === "selection.atypical");
    expect(atypical.map((d) => d.severity)).toEqual(["info"]);
  });

  it("covers: inherited by child species; never drops custom wording; not applied when the covering value is excluded", () => {
    expect(compilePrompt(id([["entity_type", single("anthropomorphic")], ["species", single("catfolk")]]), core).prompt).toBe("Species: feline beastfolk.");
    expect(compilePrompt(id([["entity_type", custom("Starborn")], ["species", single("elf")]]), core).prompt).toBe("Type of being: Starborn. Species: elf.");
    const excl = setPromptExclusion(id([["entity_type", single("fantasy_humanoid")], ["species", single("elf")]]), P + "species", true);
    expect(compilePrompt(excl, core).prompt).toBe("Type of being: fantasy humanoid.");
    expect(compilePrompt(id([["entity_type", single("human")], ["species", single("human")]]), core).prompt).toBe("Species: human.");
  });

  it("3 / 3b: custom species — expression output verbatim; name only → name verbatim + notices, no invented traits", () => {
    const spec = id([["species", custom("루미아족", "A humanoid species with translucent crystalline skin and faintly luminous veins")]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Species: A humanoid species with translucent crystalline skin and faintly luminous veins.");
    expect(spec.selections[P + "species"]!.value).toEqual(custom("루미아족", "A humanoid species with translucent crystalline skin and faintly luminous veins"));
    const nameOnly = compilePrompt(id([["species", custom("루미아족")]]), core);
    expect(nameOnly.prompt).toBe("Species: 루미아족.");
    expect(nameOnly.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["selection.custom_name_only", "prompt.mixed_language"]));
    // Context roles do not ask for a visual description
    const occ = compilePrompt(id([["occupation", { kind: "multi", optionIds: [], custom: [{ label: "비행선 항해사" }] }]]), core);
    expect(occ.diagnostics.map((d) => d.code)).not.toContain("selection.custom_name_only");
  });

  it("4: multiple nationalities + stateless → catalog order, then warning (R2)", () => {
    const c = compilePrompt(id([["nationality", { kind: "multi", optionIds: ["kr", "jp", "stateless"] }]]), core);
    expect(c.prompt).toBe("Nationality (country or region): Japanese, South Korean, stateless.");
    expect(c.diagnostics.find((d) => d.code === "rule.identity-stateless-with-nationality")?.severity).toBe("warning");
    expect(compilePrompt(id([["nationality", { kind: "multi", optionIds: ["kr", "jp"] }]]), core).diagnostics.some((d) => d.code.startsWith("rule."))).toBe(false);
    expect(compilePrompt(id([["nationality", { kind: "multi", optionIds: ["stateless"] }]]), core).diagnostics.some((d) => d.code.startsWith("rule."))).toBe(false);
    // a custom country/region counts as “another” entry too
    const withCustom = compilePrompt(id([["nationality", { kind: "multi", optionIds: ["stateless"], custom: [{ label: "Atlantis", expression: "Atlantean" }] }]]), core);
    expect(withCustom.prompt).toBe("Nationality (country or region): stateless, Atlantean.");
    expect(withCustom.diagnostics.some((d) => d.code === "rule.identity-stateless-with-nationality")).toBe(true);
  });

  it("5: registered + custom occupation mixed (registered in catalog order, then custom in stored order)", () => {
    const v: SelectionValue = { kind: "multi", optionIds: ["pilot", "architect"], custom: [{ label: "비행선 항해사", expression: "airship navigator" }, { label: "Cartographer" }] };
    expect(compilePrompt(id([["occupation", v]]), core).prompt).toBe("Occupation: architect, pilot, airship navigator, Cartographer.");
  });

  it("6: human 16–20 + woman → female character, not blocked", () => {
    const c = compilePrompt(id([["entity_type", single("human")], ["age", range(16, 20)], ["gender", single("woman")]]), core);
    expect(c.prompt).toBe("Type of being: human. Actual age: 16–20 years old. Gender: female character.");
    expect(c.blocked).toBe(false);
  });

  it("8: era, roles, status and Korean description (mixed-language notice)", () => {
    const spec = id([["historical_period", single("joseon")], ["narrative_role", { kind: "multi", optionIds: ["protagonist", "mentor"] }], ["social_status", single("nobility")], ["description", text("몰락한 양반 가문의 장녀")]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("Character's historical era: Joseon era (Korea). Narrative role: protagonist, mentor. Social status: nobility. Character description: 몰락한 양반 가문의 장녀.");
    expect(c.diagnostics.filter((d) => d.code === "prompt.mixed_language").map((d) => d.attributeId)).toEqual([P + "description"]);
  });

  it("quantity rendering: singular units, months/days kept as entered (no conversion in output)", () => {
    expect(compilePrompt(id([["age", qty(1, "years")]]), core).prompt).toBe("Actual age: 1 year old.");
    expect(compilePrompt(id([["age", qty(8, "months")]]), core).prompt).toBe("Actual age: 8 months old.");
    expect(compilePrompt(id([["age", qty(360, "months")]]), core).prompt).toBe("Actual age: 360 months old.");
    expect(compilePrompt(id([["apparent_age", range(30, 35)]]), core).prompt).toBe("Apparent age: approximately 30–35 years old.");
    expect(compilePrompt(id([["apparent_age", yrs(30)]]), core).prompt).not.toMatch(/adult/u); // no unrequested “adult”
  });
});

describe("actual age vs age group (R1 — Q3 shared interpretation)", () => {
  const rule = (entries: Array<[string, SelectionValue]>) => compilePrompt(id(entries), core).diagnostics.some((d) => d.code === "rule.identity-age-group-mismatch");
  it.each([
    ["human 30 + child", [["entity_type", single("human")], ["age_group", single("child")], ["age", yrs(30)]], true],
    ["unset being 30 + child (Q3)", [["age_group", single("child")], ["age", yrs(30)]], true],
    ["unset being 35 + adult", [["age_group", single("adult")], ["age", yrs(35)]], false],
    ["range partly outside (28–32 + young adult)", [["age_group", single("young_adult")], ["age", range(28, 32)]], true],
    ["range inside (18–29 + young adult)", [["age_group", single("young_adult")], ["age", range(18, 29)]], false],
    ["20 days + newborn", [["age_group", single("newborn")], ["age", qty(20, "days")]], false],
    ["1 month + newborn", [["age_group", single("newborn")], ["age", qty(1, "months")]], true],
    ["elf 300 + young adult (nonhuman: no human mapping)", [["species", single("elf")], ["age_group", single("young_adult")], ["age", yrs(300)]], false],
    ["custom entity (unclassified)", [["entity_type", custom("Lumian")], ["age_group", single("child")], ["age", yrs(30)]], false],
    ["ageless group", [["age_group", single("ageless")], ["age", yrs(30)]], false],
  ] as Array<[string, Array<[string, SelectionValue]>, boolean]>)("%s → %s", (_n, entries, expected) => {
    expect(rule(entries)).toBe(expected);
  });
  it("never rewrites either value", () => {
    const spec = id([["age_group", single("child")], ["age", yrs(30)]]);
    compilePrompt(spec, core);
    expect(spec.selections[P + "age"]!.value).toEqual(yrs(30));
    expect(spec.selections[P + "age_group"]!.value).toEqual(single("child"));
  });
});

describe("safety over every output path, including values not in the prompt (D8, N3)", () => {
  const sexual: [string, SelectionValue] = ["intent.description", text("a sexy pose")];
  it("PLAUSIBLE-BUT-WRONG GUARD: an excluded minor apparent age still blocks sexualized output, naming the hidden source", () => {
    let spec = buildSpec(core, [sexual, [P + "species", single("elf")], [P + "age", yrs(300)], [P + "apparent_age", yrs(12)]]);
    spec = setPromptExclusion(spec, P + "apparent_age", true);
    const c = compilePrompt(spec, core);
    expect(c.blocked).toBe(true);
    expect(c.prompt).toBe("");
    const d = c.diagnostics.find((x) => x.code === "safety.minor-sexualization")!;
    expect(d.involves).toContain(P + "apparent_age");
    expect(String(d.params?.hiddenSources)).toContain(`${P}apparent_age:excluded`);
  });
  it("inapplicable values are checked too (subject = landscape)", () => {
    const c = compilePrompt(buildSpec(core, [sexual, ["subject.kind", single("landscape")], [P + "age", yrs(15)]]), core);
    expect(c.blocked).toBe(true);
    expect(String(c.diagnostics.find((x) => x.code === "safety.minor-sexualization")!.params?.hiddenSources)).toContain(`${P}age:inactive`);
  });
  it("high fictional age cannot override a minor apparent age; ambiguous ranges are not unambiguously adult", () => {
    expect(compilePrompt(buildSpec(core, [sexual, [P + "age", yrs(500)], [P + "apparent_age", yrs(10)]]), core).blocked).toBe(true);
    expect(compilePrompt(buildSpec(core, [sexual, [P + "apparent_age", range(16, 20)]]), core).blocked).toBe(true);
    expect(compilePrompt(buildSpec(core, [sexual, [P + "age", qty(200, "months")]]), core).blocked).toBe(true); // 16.7 y — months are normalized
  });
  it("custom NAMES are checked even when only the expression is output", () => {
    const c = compilePrompt(buildSpec(core, [sexual, [P + "species", custom("schoolgirl race", "a humanoid species")]]), core);
    expect(c.blocked).toBe(true);
  });
  it("non-sexual depictions of minors are allowed; non-explicit adult appeal is allowed", () => {
    expect(compilePrompt(id([["age_group", single("child")], ["age", yrs(8)], ["occupation", { kind: "multi", optionIds: ["student"] }]]), core).blocked).toBe(false);
    expect(compilePrompt(buildSpec(core, [sexual, [P + "age", yrs(30)]]), core).blocked).toBe(false);
    expect(compilePrompt(buildSpec(core, [sexual, [P + "age", qty(360, "months")]]), core).blocked).toBe(false); // 360 months = 30 y
  });
});

describe("Unset / Selected / Excluded states (D3)", () => {
  it("exclusion is kept when the value changes and removed with the selection", () => {
    let spec = setPromptExclusion(id([["occupation", { kind: "multi", optionIds: ["chef"] }]]), P + "occupation", true);
    const r = applySelection(spec, core, P + "occupation", { kind: "multi", optionIds: ["chef", "pilot"] });
    expect(r.ok && r.value.selections[P + "occupation"]!.excludedFromPrompt).toBe(true);
    spec = r.ok ? r.value : spec;
    const cleared = clearSelection(spec, P + "occupation");
    expect(cleared.selections[P + "occupation"]).toBeUndefined();
    const again = applySelection(cleared, core, P + "occupation", { kind: "multi", optionIds: ["chef"] });
    expect(again.ok && again.value.selections[P + "occupation"]!.excludedFromPrompt).toBeUndefined();
  });
  it("toggling never touches the value, source, provenance or other attributes; unset attributes cannot be excluded", () => {
    const spec = id([["age", yrs(28)], ["gender", single("man")]]);
    const ex = setPromptExclusion(spec, P + "age", true);
    expect(ex.selections[P + "age"]).toEqual({ ...spec.selections[P + "age"], excludedFromPrompt: true });
    expect(ex.selections[P + "gender"]).toBe(spec.selections[P + "gender"]);
    expect(setPromptExclusion(spec, P + "species", true)).toBe(spec);
    expect(setPromptExclusion(ex, P + "age", false).selections[P + "age"]).toEqual(spec.selections[P + "age"]);
  });
  it("is generic: any attribute of any catalog can be excluded (domain), output toggle UI is opt-in per attribute", () => {
    const spec = setPromptExclusion(buildSpec(core, [["subject.kind", single("person")], ["style.preset", single("anime")]]), "style.preset", true);
    expect(compilePrompt(spec, core).prompt).toBe("Main subject: a single person.");
    expect(core.attributes().filter((a) => a.outputToggle).every((a) => a.id.startsWith(P))).toBe(true);
  });
  it("Metadata role never emits prompt text but is still validated and safety-checked", () => {
    const c = cloneCore();
    c.attributes.push({ id: "x.meta.internal_id", domain: "x", status: "approved", type: "text", tier: "detailed", order: 5000, maxLength: 100, label: { en: "Internal id" }, prompt: { template: "{value}" }, expression: { role: "metadata", kind: "freeText" } });
    const reg = CatalogRegistry.createOrThrow(c);
    const spec = buildSpec(reg, [["subject.kind", single("person")], ["x.meta.internal_id", text("CHAR-0042")]]);
    expect(compilePrompt(spec, reg).prompt).toBe("Main subject: a single person.");
    const bad = buildSpec(reg, [["intent.description", text("a sexy pose")], ["x.meta.internal_id", text("schoolgirl")]]);
    expect(compilePrompt(bad, reg).blocked).toBe(true);
  });
  it("persists through JSON and localStorage (canonical form keeps the flag)", () => {
    const spec = setPromptExclusion(id([["age", yrs(28)], ["species", custom("루미아족", "A humanoid species")]]), P + "species", true);
    const json = exportSpecJson(spec);
    const back = importSpecJson(json, core);
    expect(back.status).toBe("valid");
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
    expect(canonicalizeSpec(spec).selections[P + "species"]!.excludedFromPrompt).toBe(true);
    const store = createMemoryStore();
    createSpecStorage(store, core).save(spec);
    const loaded = createSpecStorage(store, core).load();
    expect(loaded.status === "loaded" && loaded.spec.selections).toEqual(spec.selections);
  });
});

describe("custom values (D4)", () => {
  it("name ≤ 200, expression ≤ 2000, no blanks, no duplicate names inside one value", () => {
    const ok = (v: SelectionValue) => applySelection(createEmptySpec(core), core, P + "occupation", v).ok;
    expect(ok({ kind: "multi", optionIds: [], custom: [{ label: "x".repeat(200), expression: "y".repeat(2000) }] })).toBe(true);
    expect(parseImageSpec({ ...createEmptySpec(core), selections: { [P + "occupation"]: { value: { kind: "multi", optionIds: [], custom: [{ label: "x".repeat(201) }] }, source: "user" } } }).ok).toBe(false);
    expect(parseImageSpec({ ...createEmptySpec(core), selections: { [P + "occupation"]: { value: { kind: "multi", optionIds: [], custom: [{ label: "a", expression: "y".repeat(2001) }] }, source: "user" } } }).ok).toBe(false);
    expect(parseImageSpec({ ...createEmptySpec(core), selections: { [P + "occupation"]: { value: { kind: "multi", optionIds: [], custom: [{ label: "  " }] }, source: "user" } } }).ok).toBe(false);
    expect(parseImageSpec({ ...createEmptySpec(core), selections: { [P + "occupation"]: { value: { kind: "multi", optionIds: [], custom: [{ label: "Chef " }, { label: "chef" }] }, source: "user" } } }).ok).toBe(false);
  });
  it("no arbitrary count limit (100 entries)", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ label: `role ${i}` }));
    expect(applySelection(createEmptySpec(core), core, P + "occupation", { kind: "multi", optionIds: ["chef"], custom: many }).ok).toBe(true);
  });
  it("a custom value equal to a registered option is NOT merged or replaced", () => {
    const spec = id([["occupation", { kind: "multi", optionIds: ["chef"], custom: [{ label: "Chef" }] }]]);
    expect(spec.selections[P + "occupation"]!.value).toEqual({ kind: "multi", optionIds: ["chef"], custom: [{ label: "Chef" }] });
    expect(compilePrompt(spec, core).prompt).toBe("Occupation: chef, Chef.");
  });
  it("is rejected where the catalog does not allow it (age group, character origin, Basic attributes)", () => {
    for (const a of [P + "age_group", P + "character_origin", "subject.kind"]) {
      const r = applySelection(createEmptySpec(core), core, a, custom("x"));
      expect(r.ok).toBe(false);
      expect(!r.ok && r.diagnostics[0]!.code).toBe("value.custom_not_allowed");
    }
  });
  it("name and expression round-trip without mutation (original language kept)", () => {
    const v: SelectionValue = { kind: "multi", optionIds: [], custom: [{ label: "제주", expression: "Jeju islander" }, { label: "ʻŌlelo  speaker" }] };
    const spec = id([["cultural_background", v]]);
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections[P + "cultural_background"]!.value).toEqual(v);
  });
});

describe("quantity values (D5)", () => {
  const set = (v: SelectionValue) => applySelection(createEmptySpec(core), core, P + "age", v);
  it("accepts number or complete range with a known unit; integers ≥ 0; no upper cap", () => {
    expect(set(yrs(0)).ok).toBe(true);
    expect(set(yrs(100000)).ok).toBe(true);
    expect(set(range(28, 32)).ok).toBe(true);
    expect(set(qty(3, "months")).ok).toBe(true);
  });
  it.each([
    ["missing unit", { kind: "number", value: 28 }, "value.unknown_unit"],
    ["unknown unit", { kind: "number", value: 28, unit: "weeks" }, "value.unknown_unit"],
    ["negative", yrs(-1), "value.out_of_range"],
    ["fraction", yrs(28.5), "value.not_integer"],
    ["text value", text("28"), "value.kind_mismatch"],
  ] as Array<[string, SelectionValue, string]>)("rejects %s", (_n, v, code) => {
    const r = set(v);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.diagnostics.map((d) => d.code)).toContain(code);
  });
  it("an incomplete range cannot be stored (schema requires both ends; min ≤ max)", () => {
    expect(parseImageSpec({ ...createEmptySpec(core), selections: { [P + "age"]: { value: { kind: "range", min: 28, unit: "years" }, source: "user" } } }).ok).toBe(false);
    expect(parseImageSpec({ ...createEmptySpec(core), selections: { [P + "age"]: { value: { kind: "range", min: 32, max: 28, unit: "years" }, source: "user" } } }).ok).toBe(false);
  });
  it("preserves the entered unit and value losslessly through JSON", () => {
    const spec = id([["age", qty(360, "months")], ["apparent_age", range(30, 35)]]);
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
  });
});

describe("existing data compatibility (Sprint 0 · 1 · 2-A)", () => {
  const fx = (name: string) => readFileSync(join(__dirname, "../fixtures/sprint2a", name), "utf8");
  const expected = JSON.parse(fx("expected-prompts.json"));
  it("Sprint 2-A core export (ImageSpec 0.2.0) imports losslessly and compiles to the exact Sprint 2-A prompt", () => {
    const raw = JSON.parse(fx("export-core-detailed.json"));
    const r = importSpecJson(fx("export-core-detailed.json"), core);
    expect(r.status).toBe("valid");
    if (r.status !== "valid") return;
    expect(r.spec.schemaVersion).toBe("0.3.0");
    expect(r.spec.selections).toEqual(raw.selections);
    expect(r.migrations).toEqual([]);
    expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
    const c = compilePrompt(r.spec, core);
    expect(c.prompt).toBe(expected["export-core-detailed.json"].prompt);
    expect(c.fragments).toEqual(expected["export-core-detailed.json"].fragments);
    expect(c.parameters).toEqual(expected["export-core-detailed.json"].parameters);
  });
  it("Sprint 2-A localStorage workspace restores with no warnings and the same selections", () => {
    const raw = JSON.parse(fx("export-core-detailed.json"));
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: fx("localstorage-workspace.txt") });
    const loaded = createSpecStorage(store, core).load();
    expect(loaded.status).toBe("loaded");
    expect(loaded.status === "loaded" && loaded.spec.selections).toEqual(raw.selections);
    expect(loaded.status === "loaded" && loaded.migrations).toEqual([]);
    expect(loaded.status === "loaded" && loaded.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
  });
  it("Sprint 2-A preset provenance (origin) survives migration and still compiles to the Sprint 2-A prompt", () => {
    const fxReg = CatalogRegistry.createOrThrow(buildFixtureCatalog());
    const raw = JSON.parse(fx("export-fixture-preset.json"));
    const r = importSpecJson(fx("export-fixture-preset.json"), fxReg);
    expect(r.status).toBe("valid");
    if (r.status !== "valid") return;
    expect(r.spec.selections).toEqual(raw.selections);
    expect(Object.values(r.spec.selections).some((s) => s.origin?.presetId === "p_soft_portrait")).toBe(true);
    expect(compilePrompt(r.spec, fxReg).prompt).toBe(expected["export-fixture-preset.json"].prompt);
  });
});
