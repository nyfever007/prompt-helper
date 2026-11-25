import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  applyRandomComposition,
  compilePrompt,
  composeRandom,
  createEmptySpec,
  getCoreRegistry,
  isAttributeActive,
  isOptionAttribute,
  isRandomSelection,
  selectedOptionIds,
  type ImageSpec,
  type RandomStyle,
} from "@/domain";
import { ODD, OPTIONAL, RARE, RELATIONS } from "@/domain/random/styles";
import { buildSpec, single } from "../fixtures/specs";

/** Sprint 2-D.7 — random styles: Natural (default), Creative, Chaos (2-D.6 unchanged). */
const core = getCoreRegistry();
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 1);
const run = (spec: ImageSpec, seed: number, style: RandomStyle) => applyRandomComposition(spec, core, composeRandom(spec, core, seed, style)).spec;
const optionIds = (spec: ImageSpec, id: string) => (spec.selections[id] ? selectedOptionIds(spec.selections[id]!.value) : []);
const unusualCount = (spec: ImageSpec) =>
  Object.keys(spec.selections).filter((id) => {
    const a = core.getAttribute(id)!;
    if (!isOptionAttribute(a)) return false;
    return a.options.some((o) => optionIds(spec, id).includes(o.id) && [...(ODD[id] ?? []), ...(RARE[id] ?? [])].some((k) => k === o.id || k === o.parentId || k === `group:${o.group}`));
  }).length;
const conflicts = (spec: ImageSpec) => compilePrompt(spec, core).diagnostics.filter((d) => d.params?.kind === "conflict");

describe("random style data", () => {
  it("every attribute, option and group it names exists in the core catalog", () => {
    const missing: string[] = [];
    const check = (attributeId: string, keys: readonly string[]) => {
      const a = core.getAttribute(attributeId);
      if (!a || !isOptionAttribute(a)) return void missing.push(attributeId);
      for (const k of keys) if (!a.options.some((o) => (k.startsWith("group:") ? o.group === k.slice(6) : o.id === k))) missing.push(`${attributeId}:${k}`);
    };
    for (const table of [ODD, RARE]) for (const [id, keys] of Object.entries(table)) check(id, keys);
    for (const r of RELATIONS) {
      for (const c of r.when) if (c.op === "anyOf") check(c.attributeId, c.optionIds);
      for (const table of [r.prefer ?? {}, r.avoid ?? {}]) for (const [id, keys] of Object.entries(table)) check(id, keys);
    }
    expect(missing).toEqual([]);
    const ids = [...core.attributes()].map((a) => a.id);
    expect(OPTIONAL.filter((re) => !ids.some((id) => re.test(id))).map(String)).toEqual([]);
  });

  it("covers the relation areas of the sprint: subject and species, hair, clothing and place, accessories, emotion and mood, pose, camera, lighting", () => {
    const targets = new Set(RELATIONS.flatMap((r) => [...r.when.map((c) => ("attributeId" in c ? c.attributeId : "")), ...Object.keys(r.prefer ?? {}), ...Object.keys(r.avoid ?? {})]));
    for (const prefix of ["person.identity.", "person.hair.", "person.clothing.", "scene.setting", "person.accessories.", "person.expression.", "mood.tone", "person.pose.", "camera.", "composition.framing", "lighting."])
      expect([...targets].some((id) => id.startsWith(prefix)), prefix).toBe(true);
  });
});

describe("Chaos = the Sprint 2-D.6 generation, unchanged", () => {
  // fingerprints of composeRandom from main@08ecfab (2-D.6) for an empty spec
  it.each([
    [1, 298, "6882fa8838b2c2e0"],
    [20261125, 318, "4a2b9e8403884872"],
    [987654321, 298, "b042a9b6701acc98"],
  ])("seed %i → %i values, same composition", (seed, count, hash) => {
    const c = composeRandom(createEmptySpec(core), core, seed, "chaos");
    expect(c.patches.length).toBe(count);
    expect(createHash("sha256").update(JSON.stringify(c)).digest("hex").slice(0, 16)).toBe(hash);
  });
});

describe.each(["natural", "creative"] as const)("%s", (style) => {
  it.each(SEEDS)("seed %i: valid, applicable, coherent and not held", (seed) => {
    const spec = run(createEmptySpec(core), seed, style);
    const ids = Object.keys(spec.selections);
    expect(spec.selections["subject.kind"]!.value).toEqual(single("person"));
    for (const id of ids) {
      const a = core.getAttribute(id)!;
      expect(isRandomSelection(spec.selections[id]), id).toBe(true);
      expect(isAttributeActive(core, a, spec), id).toBe(true);
      if (isOptionAttribute(a)) for (const o of optionIds(spec, id)) expect(a.options.some((x) => x.id === o), `${id}:${o}`).toBe(true);
    }
    expect(compilePrompt(spec, core).blocked).toBe(false);
    // Natural avoids every conflict rule; Creative avoids contradictions (convention notes may remain)
    const c = conflicts(spec);
    if (style === "natural") expect(c.map((d) => d.code)).toEqual([]);
    else expect(c.filter((d) => d.params?.basis === "contradiction").map((d) => d.code)).toEqual([]);
    // limited decoration and unusual choices
    const accessories = ids.filter((id) => /^person\.accessories\.(?!frame_shape|frame_color|hat_color)/.test(id) && optionIds(spec, id).some((o) => o !== "none"));
    expect(accessories.length).toBeLessThanOrEqual(style === "natural" ? 2 : 4);
    expect(unusualCount(spec)).toBeLessThanOrEqual(style === "natural" ? 2 : 6);
    // a garment's details only with the garment
    for (const id of ids) {
      const m = /^person\.clothing\.(tops|bottoms|one_piece|outerwear|footwear|hosiery)\.(?!type$)/.exec(id);
      if (m) expect(optionIds(spec, `person.clothing.${m[1]}.type`).filter((o) => o !== "none").length, id).toBe(1);
    }
    if (style === "natural") {
      // one value per multi-select, sliders in the middle half of their range
      for (const id of ids) {
        const a = core.getAttribute(id)!;
        if (a.type === "multi") expect(optionIds(spec, id).length, id).toBe(1);
        const v = spec.selections[id]!.value;
        if (a.type === "number" && v.kind === "number") {
          const quarter = (a.max - a.min) / 4;
          expect(v.value >= a.min + quarter - (a.step ?? 1) && v.value <= a.max - quarter + (a.step ?? 1), `${id}=${v.value}`).toBe(true);
        }
      }
    }
  });
});

describe("styles compared over 40 seeds", () => {
  const stats = (style: RandomStyle) => {
    let values = 0;
    let nonHuman = 0;
    let conflictCount = 0;
    for (const seed of SEEDS) {
      const spec = run(createEmptySpec(core), seed, style);
      values += Object.keys(spec.selections).length;
      if (optionIds(spec, "person.identity.entity_type").some((o) => o !== "human")) nonHuman++;
      conflictCount += conflicts(spec).length;
    }
    return { values: values / SEEDS.length, nonHuman, conflictCount };
  };
  it("Natural < Creative < Chaos in values, unusual beings and conflict notices; the default is Natural", () => {
    const n = stats("natural");
    const c = stats("creative");
    const x = stats("chaos");
    expect(n.values).toBeLessThan(c.values);
    expect(c.values).toBeLessThan(x.values);
    expect(n.nonHuman).toBeLessThanOrEqual(c.nonHuman);
    expect(c.nonHuman).toBeLessThan(x.nonHuman);
    expect(n.nonHuman).toBeLessThan(SEEDS.length * 0.25);
    expect(n.conflictCount).toBe(0);
    expect(x.conflictCount).toBeGreaterThan(c.conflictCount);
    expect(composeRandom(createEmptySpec(core), core, 9)).toEqual(composeRandom(createEmptySpec(core), core, 9, "natural"));
  });

  it("relations take effect in Natural: place → season, lighting → light source, close-up → lens", () => {
    let summer = 0;
    let moon = 0;
    let wideOnCloseUp = 0;
    for (const seed of SEEDS) {
      if (optionIds(run(buildSpec(core, [["scene.setting", single("beach")]]), seed, "natural"), "person.clothing.season").includes("summer")) summer++;
      if (optionIds(run(buildSpec(core, [["lighting.preset", single("moonlight")]]), seed, "natural"), "lighting.source").includes("moon")) moon++;
      const close = run(buildSpec(core, [["subject.kind", single("person")], ["composition.framing", single("face_close_up")]]), seed, "natural");
      if (optionIds(close, "camera.lens_type").some((o) => o === "ultra_wide" || o === "fisheye")) wideOnCloseUp++;
    }
    // counted over all runs (an unset season or source counts as a miss), so the thresholds are conservative
    expect(summer).toBeGreaterThan(SEEDS.length * 0.4);
    expect(moon).toBeGreaterThan(SEEDS.length * 0.3);
    expect(wideOnCloseUp).toBeLessThanOrEqual(1);
  });
});
