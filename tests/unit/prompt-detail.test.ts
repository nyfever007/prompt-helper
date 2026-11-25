import { countTokens } from "gpt-tokenizer/encoding/o200k_base";
import { describe, expect, it } from "vitest";
import {
  applyPresetPlan,
  applyRandomComposition,
  applySelection,
  attributeImportance,
  compilePrompt,
  composeRandom,
  createEmptySpec,
  effectivePrice,
  exportPromptText,
  formatUsd,
  getCoreRegistry,
  getPromptOutput,
  getTokenModel,
  planPreset,
  PROMPT_DETAILS,
  RANDOM_STYLES,
  setPromptExclusion,
  textInputCost,
  TOKEN_MODELS,
  viewPrompt,
  type ImageSpec,
} from "@/domain";
import { buildSpec, multi, single } from "../fixtures/specs";

/** Sprint 2-D.7 — prompt detail levels (Compact / Balanced / Full) and token / cost estimates. */
const core = getCoreRegistry();
const random = (spec: ImageSpec, seed: number, style: (typeof RANDOM_STYLES)[number] = "chaos") => applyRandomComposition(spec, core, composeRandom(spec, core, seed, style)).spec;
const views = (spec: ImageSpec) => {
  const c = compilePrompt(spec, core);
  return { c, ...Object.fromEntries(PROMPT_DETAILS.map((d) => [d, viewPrompt(c, spec, core, d)])) } as { c: ReturnType<typeof compilePrompt> } & Record<(typeof PROMPT_DETAILS)[number], ReturnType<typeof viewPrompt>>;
};

describe("prompt detail", () => {
  it("Full is the compiler's output unchanged (existing projects, compatibility)", () => {
    const spec = random(createEmptySpec(core), 3);
    const { c, full } = views(spec);
    expect(full.prompt).toBe(c.prompt);
    expect(full.fragments).toEqual(c.fragments);
    expect(full.omitted).toEqual([]);
    expect(exportPromptText(full)).toBe(exportPromptText(c));
  });

  it.each(RANDOM_STYLES)("%s result: Compact ⊂ Balanced ⊂ Full, same sentences in the same order, every omission listed, the spec untouched", (style) => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const spec = random(createEmptySpec(core), seed, style);
      const before = JSON.stringify(spec);
      const { full, balanced, compact } = views(spec);
      const sentences = (v: typeof full) => v.fragments.map((f) => f.text);
      expect(compact.fragments.length).toBeLessThan(balanced.fragments.length);
      expect(balanced.fragments.length).toBeLessThan(full.fragments.length);
      for (const v of [compact, balanced]) {
        // nothing new: each kept sentence is a Full sentence, in Full order
        const fullTexts = sentences(full);
        let at = -1;
        for (const s of sentences(v)) {
          const i = fullTexts.indexOf(s, at + 1);
          expect(i, s).toBeGreaterThan(at);
          at = i;
        }
        expect(v.fragments.length + v.omitted.length).toBe(full.fragments.length);
        expect(v.parameters).toEqual(full.parameters);
        expect(v.prompt.length).toBeLessThan(full.prompt.length);
      }
      // core attributes are always there
      for (const id of ["subject.kind", "style.preset", "scene.setting"]) if (spec.selections[id]) expect(compact.fragments.some((f) => f.attributeId === id), id).toBe(true);
      expect(JSON.stringify(spec)).toBe(before);
    }
  });

  it("keeps the user's own values first: all in Balanced, all but fine details in Compact; random values go first", () => {
    let spec = buildSpec(core, [
      ["subject.kind", single("person")],
      ["person.eyes.size", { kind: "number", value: 4 }], // fine detail (number)
      ["person.clothing.tops.material", single("linen")], // meaningful detail
    ]);
    spec = random(spec, 7);
    const { balanced, compact } = views(spec);
    const has = (v: typeof balanced, id: string) => v.fragments.some((f) => f.attributeId === id);
    expect(has(balanced, "person.eyes.size")).toBe(true);
    expect(has(balanced, "person.clothing.tops.material")).toBe(true);
    expect(has(compact, "person.clothing.tops.material")).toBe(true);
    expect(compact.omitted.find((o) => o.attributeId === "person.eyes.size")?.reason).toBe("detail");
    // random meaningful details stay in Balanced, random fine details do not
    const randomFine = balanced.omitted.filter((o) => o.reason === "detail").map((o) => o.attributeId);
    expect(randomFine.length).toBeGreaterThan(0);
    expect(randomFine.every((id) => attributeImportance(core.getAttribute(id)!) === 3)).toBe(true);
  });

  it("keeps a concept's values in Balanced", () => {
    const plan = planPreset(createEmptySpec(core), core, "concept_vintage_film");
    if (!plan.ok) throw new Error("plan");
    const spec = random(applyPresetPlan(createEmptySpec(core), core, plan.value, "keepUser").spec, 2);
    const { balanced } = views(spec);
    for (const id of Object.keys(spec.selections).filter((id) => spec.selections[id]!.origin?.presetId === "concept_vintage_film"))
      expect(balanced.omitted.some((o) => o.attributeId === id), id).toBe(false);
  });

  it("removes duplicates (a secondary colour that repeats the primary) and random “none” values; a user's “none” stays", () => {
    let spec = buildSpec(core, [
      ["subject.kind", single("person")],
      ["person.clothing.tops.type", single("t_shirt")],
      ["person.clothing.tops.primary_color", single("navy")],
      ["person.clothing.tops.secondary_color", single("navy")],
      ["person.accessories.earrings", multi("none")],
    ]);
    spec = random(spec, 11);
    const { balanced, full } = views(spec);
    expect(full.fragments.some((f) => f.attributeId === "person.clothing.tops.secondary_color")).toBe(true);
    expect(balanced.omitted.find((o) => o.attributeId === "person.clothing.tops.secondary_color")?.reason).toBe("duplicate");
    expect(balanced.fragments.some((f) => f.attributeId === "person.accessories.earrings")).toBe(true);
    const randomNone = Object.keys(spec.selections).filter((id) => spec.selections[id]!.source === "preset" && JSON.stringify(spec.selections[id]!.value).includes('"none"'));
    for (const id of randomNone) if (full.fragments.some((f) => f.attributeId === id)) expect(balanced.fragments.some((f) => f.attributeId === id), id).toBe(false);
  });

  it("safety: a held design stays held at every level, even when the held value would be left out of the text", () => {
    // the risky values are the user's; a random design around them
    const risky = random(buildSpec(core, [["person.identity.age_group", single("child")], ["person.appearance.direction", multi("sexy")]]), 4);
    const { c, compact, balanced, full } = views(risky);
    expect(c.blocked).toBe(true);
    for (const v of [compact, balanced, full]) {
      expect(v.blocked).toBe(true);
      expect(v.prompt).toBe("");
      expect(getPromptOutput(v)).toEqual({ ok: false, reason: "blocked" });
      expect(exportPromptText(v)).toBeNull();
      // the full-spec safety result and its guidance are carried unchanged
      expect(v.safety).toEqual(c.safety);
      expect(v.diagnostics).toEqual(c.diagnostics);
    }
  });

  it("safety: a design is held by values whatever the text leaves out — the check never runs on the shortened text", () => {
    // a user-set excluded value still holds the output (compiler rule); every detail level inherits it
    const s = applySelection(random(createEmptySpec(core), 5), core, "person.identity.age_group", single("child"), "user");
    if (!s.ok) throw new Error("set");
    const appeal = applySelection(s.value, core, "person.appearance.direction", multi("sexy"), "user");
    if (!appeal.ok) throw new Error("set");
    const excluded = setPromptExclusion(appeal.value, "person.appearance.direction", true);
    for (const d of PROMPT_DETAILS) expect(views(excluded)[d].blocked, d).toBe(true);
  });

  it("has no fixed attribute cap: Compact keeps every core value however many there are", () => {
    const spec = random(createEmptySpec(core), 20261125);
    const { compact } = views(spec);
    const core1 = Object.keys(spec.selections).filter((id) => attributeImportance(core.getAttribute(id)!) === 1);
    const output = compact.fragments.map((f) => f.attributeId);
    for (const id of core1) if (views(spec).full.fragments.some((f) => f.attributeId === id)) expect(output, id).toContain(id);
  });
});

describe("tokens and text input cost", () => {
  it("counts with the local o200k_base tokenizer", () => {
    expect(countTokens("hello world")).toBe(2);
    const spec = random(createEmptySpec(core), 1);
    const { compact, full } = views(spec);
    expect(countTokens(compact.prompt)).toBeLessThan(countTokens(full.prompt));
  });

  it("prices: published ones carry date and source; unknown models have none; the user's own price wins", () => {
    for (const m of TOKEN_MODELS) if (m.price) expect(m.price.source).toMatch(/^https:\/\//);
    expect(getTokenModel("gpt-image-1.5").price?.usdPerMillion).toBe(5);
    expect(effectivePrice(getTokenModel("gemini-image"), {})).toBeNull();
    expect(effectivePrice(getTokenModel("gemini-image"), { "gemini-image": 0.3 })).toEqual({ usdPerMillion: 0.3, source: "user" });
    expect(effectivePrice(getTokenModel("gpt-image-1.5"), { "gpt-image-1.5": 4 })).toEqual({ usdPerMillion: 4, source: "user" });
    expect(textInputCost(1_000_000, 5)).toBe(5);
    expect(formatUsd(textInputCost(600, 5))).toBe("$0.00300");
    expect(formatUsd(textInputCost(20_000, 5))).toBe("$0.1000");
  });
});
