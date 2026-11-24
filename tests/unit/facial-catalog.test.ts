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
  type AttributeDefinition,
  type SelectionValue,
} from "@/domain";
import { buildSpec, multi, single, text } from "../fixtures/specs";

/**
 * Sprint 2-B.2 — Person › Face, Eyes, Eyebrows, Nose, Lips. The approved vocabulary
 * (Sprint 2-B.2 Implementation approval §2) is reproduced here independently of the catalog.
 */
const core = getCoreRegistry();
const num = (value: number): SelectionValue => ({ kind: "number", value });
const out = (entries: Array<[string, SelectionValue]>) => compilePrompt(buildSpec(core, entries), core);

/** attribute → [categoryId, template, kind, options or band texts] */
const S = "shape" as const;
const D = "degree" as const;
type Spec = [string, string, typeof S | typeof D, Record<string, string> | string[], ("multi" | "color" | "nocustom")?];
const SIZE = ["very small", "small", "medium-sized", "large", "very large"];
const LENGTH = ["very short", "short", "medium length", "long", "very long"];
const NB = ["very narrow", "narrow", "medium width", "broad", "very broad"];
const NW = ["very narrow", "narrow", "medium width", "wide", "very wide"];
const LH = ["very low", "low", "medium height", "high", "very high"];
const SD = ["very sparse", "sparse", "medium density", "dense", "very dense"];
const TURN = ["strongly downturned", "slightly downturned", "level", "slightly upturned", "strongly upturned"];
const FULL = ["very thin", "thin", "medium fullness", "full", "very full"];

const APPROVED: Record<string, Spec> = {
  // Face (10)
  "person.face.shape": ["person_face", "Face shape: {value}.", S, { oval: "oval", round: "round", square: "square", rectangular: "rectangular", heart: "heart-shaped", diamond: "diamond-shaped", triangular: "triangular", inverted_triangular: "inverted triangular" }],
  "person.face.length": ["person_face", "Face length: {value}.", D, LENGTH],
  "person.face.width": ["person_face", "Face width: {value}.", D, NB],
  "person.face.forehead_height": ["person_face", "Forehead height: {value}.", D, LH],
  "person.face.forehead_width": ["person_face", "Forehead width: {value}.", D, NB],
  "person.face.cheekbones": ["person_face", "Cheekbones: {value}.", S, { flat: "flat", softly_contoured: "softly contoured", prominent: "prominent", high: "high", low: "low" }, "multi"],
  "person.face.jawline": ["person_face", "Jawline: {value}.", S, { rounded: "rounded", soft: "soft", angular: "angular", defined: "defined", v_shaped: "V-shaped", u_shaped: "U-shaped" }, "multi"],
  "person.face.chin": ["person_face", "Chin: {value}.", S, { rounded: "rounded", pointed: "pointed", square: "square", cleft: "cleft", protruding: "protruding", recessed: "recessed" }, "multi"],
  "person.face.cheeks": ["person_face", "Cheeks: {value}.", S, { hollow: "hollow", flat: "flat", full: "full", rounded: "rounded" }, "multi"],
  "person.face.symmetry": ["person_face", "Facial symmetry: {value}.", D, ["naturally asymmetrical features", "slightly asymmetrical features", "balanced features", "very symmetrical features", "highly symmetrical features"]],
  // Eyes (13)
  "person.eyes.shape": ["person_eyes", "Eye shape: {value}.", S, { almond: "almond-shaped", round: "round", oval: "oval", elongated: "elongated" }],
  "person.eyes.size": ["person_eyes", "Eye size: {value}.", D, SIZE],
  "person.eyes.width": ["person_eyes", "Eye width: {value}.", D, NW],
  "person.eyes.height": ["person_eyes", "Eye opening height: {value}.", D, ["very low", "low", "medium height", "tall", "very tall"]],
  "person.eyes.spacing": ["person_eyes", "Eye spacing: {value}.", D, ["very close-set", "close-set", "average spacing", "wide-set", "very wide-set"]],
  "person.eyes.outer_corner_angle": ["person_eyes", "Outer eye corners: {value}.", D, TURN],
  "person.eyes.depth": ["person_eyes", "Eye depth: {value}.", S, { deep_set: "deep-set", average: "average-set", prominent: "prominent" }, "nocustom"],
  "person.eyes.eyelids": ["person_eyes", "Eyelids: {value}.", S, { monolid: "monolids", inner_crease: "subtle inner eyelid creases", thin_double: "thin double eyelid creases", defined_double: "defined double eyelid creases", hooded: "hooded eyelids" }, "multi"],
  "person.eyes.iris_color": ["person_eyes", "Iris color: {value}.", S, { brown: "brown", dark_brown: "dark brown", near_black: "near-black brown", hazel: "hazel", amber: "amber", green: "green", blue: "blue", gray: "gray", violet: "violet", red: "red", gold: "gold", silver: "silver" }, "color"],
  "person.eyes.iris_size": ["person_eyes", "Iris size: {value}.", D, SIZE],
  "person.eyes.pupil_shape": ["person_eyes", "Pupils: {value}.", S, { round: "round", vertical_slit: "vertical slit", horizontal_slit: "horizontal slit", star: "star-shaped", heart: "heart-shaped" }],
  "person.eyes.lash_length": ["person_eyes", "Eyelash length: {value}.", D, LENGTH],
  "person.eyes.lash_density": ["person_eyes", "Eyelash density: {value}.", D, SD],
  // Eyebrows (8)
  "person.eyebrows.shape": ["person_eyebrows", "Eyebrow shape: {value}.", S, { straight: "straight", soft_arch: "softly arched", high_arch: "highly arched", rounded: "rounded", angular: "angular", s_shaped: "S-shaped" }],
  "person.eyebrows.thickness": ["person_eyebrows", "Eyebrow thickness: {value}.", D, ["very thin", "thin", "medium thickness", "thick", "very thick"]],
  "person.eyebrows.length": ["person_eyebrows", "Eyebrow length: {value}.", D, LENGTH],
  "person.eyebrows.density": ["person_eyebrows", "Eyebrow density: {value}.", D, SD],
  "person.eyebrows.angle": ["person_eyebrows", "Eyebrow angle: {value}.", D, ["strongly downward-sloping", "slightly downward-sloping", "level", "slightly upward-sloping", "strongly upward-sloping"]],
  "person.eyebrows.height": ["person_eyebrows", "Eyebrow position: {value}.", D, ["very low-set", "low-set", "medium height", "high-set", "very high-set"]],
  "person.eyebrows.spacing": ["person_eyebrows", "Eyebrow spacing: {value}.", D, ["very closely spaced", "closely spaced", "average spacing", "widely spaced", "very widely spaced"]],
  "person.eyebrows.color": ["person_eyebrows", "Eyebrow color: {value}.", S, { black: "black", dark_brown: "dark brown", brown: "brown", light_brown: "light brown", blond: "blond", gray: "gray", white: "white" }, "color"],
  // Nose (8)
  "person.nose.shape": ["person_nose", "Nose shape: {value}.", S, { straight: "straight", roman: "Roman", aquiline: "aquiline", button: "button", upturned: "upturned", broad: "broad", concave: "concave" }],
  "person.nose.length": ["person_nose", "Nose length: {value}.", D, LENGTH],
  "person.nose.width": ["person_nose", "Nose width: {value}.", D, NW],
  "person.nose.bridge_height": ["person_nose", "Nasal bridge height: {value}.", D, LH],
  "person.nose.bridge_shape": ["person_nose", "Nasal bridge shape: {value}.", S, { straight: "straight", convex: "convex", concave: "concave" }, "nocustom"],
  "person.nose.tip_shape": ["person_nose", "Nasal tip: {value}.", S, { rounded: "rounded", pointed: "pointed", broad: "broad", angular: "angular", cleft: "cleft" }],
  "person.nose.tip_angle": ["person_nose", "Nasal tip angle: {value}.", D, ["strongly downward-pointing", "slightly downward-pointing", "pointing straight ahead", "slightly upward-pointing", "strongly upward-pointing"]],
  "person.nose.alar_width": ["person_nose", "Nostril wing (alar) width: {value}.", D, NW],
  // Lips (8)
  "person.lips.shape": ["person_lips", "Lips: {value}.", S, { thin: "thin", full: "full", heart: "heart-shaped", rounded: "rounded", wide: "wide", balanced: "balanced" }, "multi"],
  "person.lips.mouth_width": ["person_lips", "Mouth width: {value}.", D, NW],
  "person.lips.upper_thickness": ["person_lips", "Upper lip: {value}.", D, FULL],
  "person.lips.lower_thickness": ["person_lips", "Lower lip: {value}.", D, FULL],
  "person.lips.ratio": ["person_lips", "Lip proportion: {value}.", S, { upper_dominant: "upper-lip dominant", balanced: "balanced", lower_dominant: "lower-lip dominant" }, "nocustom"],
  "person.lips.cupids_bow": ["person_lips", "Cupid's bow: {value}.", S, { flat: "flat", subtle: "subtle", defined: "defined", deep: "deep" }, "nocustom"],
  "person.lips.corners": ["person_lips", "Mouth corners at rest: {value}.", D, TURN],
  "person.lips.natural_color": ["person_lips", "Natural lip color: {value}.", S, { pale_pink: "pale pink", pink: "pink", rose: "rose", coral: "coral", red: "red", mauve: "mauve", brown_toned: "brown-toned", plum_toned: "plum-toned" }, "color"],
};
const facial = core.attributes().filter((a) => /^person\.(face|eyes|eyebrows|nose|lips)\./.test(a.id));

describe("facial catalog: 5 categories, 47 approved attributes", () => {
  it("registers exactly the approved attributes per category, in order 217–263, editable in Detailed", () => {
    expect(facial.map((a) => a.id)).toEqual(Object.keys(APPROVED));
    expect(facial.map((a) => a.order)).toEqual(Array.from({ length: 47 }, (_, i) => 217 + i));
    const per = (cat: string) => facial.filter((a) => a.categoryId === cat).length;
    expect([per("person_face"), per("person_eyes"), per("person_eyebrows"), per("person_nose"), per("person_lips")]).toEqual([10, 13, 8, 8, 8]);
    for (const a of facial) {
      const [cat, template] = APPROVED[a.id]!;
      expect(a.categoryId, a.id).toBe(cat);
      expect(a.prompt.template, a.id).toBe(template);
      expect(core.isExposed(a, "detailed"), a.id).toBe(true);
      expect(a.expression?.role, a.id).toBe("direct"); // facial features are Direct by default
      expect(a.outputToggle, a.id).toBe(true);
      expect(a.label.en && a.label.ko, a.id).toBeTruthy();
      expect(a.aliases?.length, a.id).toBeGreaterThan(0);
    }
  });

  it("shapes keep their approved ids/expressions; single vs multi and color/custom are as designed", () => {
    for (const a of facial) {
      const [, , kind, vocab, flag] = APPROVED[a.id]!;
      if (kind !== "shape") continue;
      if (!isOptionAttribute(a)) throw new Error(a.id);
      expect(Object.fromEntries(a.options.map((o) => [o.id, o.prompt.text])), a.id).toEqual(vocab);
      expect(a.type, a.id).toBe(flag === "multi" ? "multi" : "single");
      expect(a.custom !== undefined, `${a.id} custom`).toBe(flag !== "nocustom");
      if (flag === "color") {
        expect(a.control).toBe("color");
        expect(a.options.every((o) => /^#[0-9a-f]{6}$/i.test(o.swatch ?? ""))).toBe(true);
      }
      for (const o of a.options) expect(o.label.ko && o.label.en, `${a.id}/${o.id}`).toBeTruthy();
    }
  });

  it("relative attributes are 1–5 degree sliders with exactly 5 qualitative bands (no measurement units)", () => {
    for (const a of facial) {
      const [, , kind, vocab] = APPROVED[a.id]!;
      if (kind !== "degree") continue;
      if (a.type !== "number") throw new Error(a.id);
      expect([a.semantics, a.control, a.min, a.max, a.step, a.unit], a.id).toEqual(["degree", "slider", 1, 5, 1, undefined]);
      expect(a.bands!.map((b) => b.text), a.id).toEqual(vocab);
      expect(a.bands!.map((b) => b.upTo)).toEqual([1, 2, 3, 4, 5]);
      expect(a.defaultValue, a.id).toBeUndefined(); // the slider's middle is never a stored default
    }
    expect(facial.filter((a) => APPROVED[a.id]![2] === "degree")).toHaveLength(28);
  });

  it("every option and every band compiles alone to its sentence (nothing else is added)", () => {
    for (const a of facial) {
      const [, template, kind, vocab] = APPROVED[a.id]!;
      const values: Array<[SelectionValue, string]> =
        kind === "degree"
          ? (vocab as string[]).map((t, i) => [num(i + 1), t])
          : Object.entries(vocab).map(([id, t]) => [a.type === "multi" ? multi(id) : single(id), t]);
      for (const [v, t] of values) {
        const c = out([[a.id, v]]);
        expect(c.prompt, `${a.id} ${JSON.stringify(v)}`).toBe(template.replace("{value}", t));
        expect(c.blocked).toBe(false);
        expect(c.prompt).not.toMatch(/\d/u); // relative numbers are never output
      }
    }
  });

  it("no facial phrase links appearance to expression, personality, impression, attractiveness, gender or ethnicity", () => {
    const linked = /\b(smil|happy|sad|angry|friendly|kind|cute|pretty|beautiful|handsome|attractive|sexy|seductive|feminine|masculine|asian|african|european|korean|caucasian|exotic|young|old)\w*/iu;
    for (const a of facial) {
      const texts = isOptionAttribute(a) ? a.options.map((o) => o.prompt.text) : a.type === "number" ? (a.bands ?? []).map((b) => b.text) : [];
      for (const t of [...texts, a.prompt.template]) expect(t, a.id).not.toMatch(linked);
    }
  });

  it("no facial phrase raises any safety signal on its own (existing policy unchanged)", () => {
    for (const a of facial) {
      const texts = isOptionAttribute(a) ? a.options.map((o) => o.prompt.text) : a.type === "number" ? (a.bands ?? []).map((b) => b.text) : [];
      const report = evaluateSafety({ tags: [], texts: texts.map((t) => ({ attributeId: a.id, text: a.prompt.template.replace("{value}", t) })) }, baselinePolicy);
      expect(report.findings, a.id).toEqual([]);
    }
  });
});

describe("independence, overlap and conflicts (approval §4)", () => {
  it("setting the face shape (or identity) sets no other facial attribute", () => {
    const spec = buildSpec(core, [
      ["subject.kind", single("person")],
      ["person.identity.gender", single("woman")],
      ["person.identity.nationality", { kind: "multi", optionIds: ["kr"] }],
      ["person.identity.ethnic_background", multi("korean")],
      ["person.face.shape", single("oval")],
    ]);
    expect(Object.keys(spec.selections).filter((k) => /^person\.(face|eyes|eyebrows|nose|lips)\./.test(k))).toEqual(["person.face.shape"]);
    expect(compilePrompt(spec, core).prompt).not.toMatch(/Jawline|Cheekbones|Cheeks|Eye|Nose|Lip/u);
  });

  it("combinable traits coexist without a conflict: high AND prominent cheekbones, soft AND rounded jawline, hooded + double eyelids", () => {
    const c = out([["person.face.cheekbones", multi("prominent", "high")], ["person.face.jawline", multi("soft", "rounded")], ["person.eyes.eyelids", multi("hooded", "defined_double")], ["person.face.chin", multi("pointed", "cleft")]]);
    expect(c.prompt).toBe("Cheekbones: prominent, high. Jawline: rounded, soft. Chin: pointed, cleft. Eyelids: defined double eyelid creases, hooded eyelids.");
    expect(c.diagnostics.filter((d) => d.code.startsWith("rule."))).toEqual([]);
  });

  it.each([
    ["person.face.cheekbones", ["flat", "prominent"]],
    ["person.face.cheekbones", ["high", "low"]],
    ["person.face.jawline", ["soft", "angular"]],
    ["person.face.jawline", ["v_shaped", "u_shaped"]],
    ["person.face.chin", ["protruding", "recessed"]],
    ["person.face.cheeks", ["hollow", "full"]],
    ["person.eyes.eyelids", ["monolid", "defined_double"]],
    ["person.lips.shape", ["thin", "full"]],
  ])("genuinely opposite traits in %s %j → warning only; both values kept and output", (id, pair) => {
    const c = out([[id, multi(...pair)]]);
    const rules = c.diagnostics.filter((d) => d.code.startsWith("rule."));
    expect(rules.map((d) => d.severity)).toEqual(["warning"]);
    expect(c.blocked).toBe(false);
    expect(c.fragments.find((f) => f.attributeId === id)!.optionIds!.sort()).toEqual([...pair].sort());
  });

  it("overall nose shape vs bridge: the same meaning is written once (covers); a contradiction is reported, not rewritten", () => {
    const same = out([["person.nose.shape", single("aquiline")], ["person.nose.bridge_shape", single("convex")], ["person.nose.bridge_height", num(4)]]);
    expect(same.prompt).toBe("Nose shape: aquiline. Nasal bridge height: high.");
    expect(same.covered).toEqual([{ attributeId: "person.nose.bridge_shape", coveredBy: "person.nose.shape", byOptionIds: ["aquiline"] }]);
    const clash = out([["person.nose.shape", single("aquiline")], ["person.nose.bridge_shape", single("concave")]]);
    expect(clash.prompt).toBe("Nose shape: aquiline. Nasal bridge shape: concave.");
    expect(clash.diagnostics.find((d) => d.code === "rule.nose-convex-shape-vs-bridge")?.severity).toBe("warning");
    const independent = out([["person.nose.shape", single("button")], ["person.nose.bridge_shape", single("straight")]]);
    expect(independent.prompt).toBe("Nose shape: button. Nasal bridge shape: straight.");
    expect(independent.diagnostics.some((d) => d.code.startsWith("rule."))).toBe(false);
  });

  it("the whole lip shape and the upper/lower lip fullness are separate; natural lip color is not makeup", () => {
    const c = out([["person.lips.shape", multi("heart")], ["person.lips.upper_thickness", num(3)], ["person.lips.lower_thickness", num(4)], ["person.lips.natural_color", single("rose")]]);
    expect(c.prompt).toBe("Lips: heart-shaped. Upper lip: medium fullness. Lower lip: full. Natural lip color: rose.");
    expect(c.prompt).not.toMatch(/lipstick|makeup|gloss/iu);
  });
});

describe("approval §7 output example (only set attributes are output)", () => {
  it("compiles the illustrative set deterministically", () => {
    const c = out([
      ["subject.kind", single("person")],
      ["person.identity.age", { kind: "number", value: 28, unit: "years" }],
      ["person.identity.gender", single("woman")],
      ["person.face.shape", single("oval")],
      ["person.face.jawline", multi("soft", "rounded")],
      ["person.face.cheeks", multi("full")],
      ["person.eyes.shape", single("almond")],
      ["person.eyes.size", num(4)],
      ["person.eyes.outer_corner_angle", num(4)],
      ["person.eyes.iris_color", single("dark_brown")],
      ["person.eyes.lash_length", num(4)],
      ["person.eyes.lash_density", num(4)],
      ["person.eyebrows.shape", single("soft_arch")],
      ["person.nose.bridge_height", num(4)],
      ["person.nose.bridge_shape", single("straight")],
      ["person.nose.tip_shape", single("rounded")],
      ["person.lips.upper_thickness", num(3)],
      ["person.lips.lower_thickness", num(4)],
      ["person.lips.natural_color", single("rose")],
    ]);
    expect(c.prompt).toBe(
      "Main subject: a single person. Actual age: 28 years old. Gender: woman. Face shape: oval. Jawline: rounded, soft. Cheeks: full. " +
        "Eye shape: almond-shaped. Eye size: large. Outer eye corners: slightly upturned. Iris color: dark brown. Eyelash length: long. Eyelash density: dense. " +
        "Eyebrow shape: softly arched. Nasal bridge height: high. Nasal bridge shape: straight. Nasal tip: rounded. Upper lip: medium fullness. Lower lip: full. Natural lip color: rose.",
    );
    expect(c.fragments.map((f) => f.attributeId)).toHaveLength(19); // exactly the 19 set attributes
  });
});

describe("reuse of the common features (approval §6)", () => {
  it("custom shape and custom color values (name + expression) compile verbatim; name-only Direct values get a notice", () => {
    const c = out([
      ["person.eyes.iris_color", { kind: "single", custom: { label: "오드아이", expression: "heterochromatic irises, one blue and one amber" } }],
      ["person.face.shape", { kind: "single", custom: { label: "Long oval" } }],
    ]);
    expect(c.prompt).toBe("Face shape: Long oval. Iris color: heterochromatic irises, one blue and one amber.");
    expect(c.diagnostics.filter((d) => d.code === "selection.custom_name_only").map((d) => d.attributeId)).toEqual(["person.face.shape"]);
  });

  it("prompt exclusion keeps the value; the raw relative number round-trips losslessly", () => {
    let spec = buildSpec(core, [["person.eyes.size", num(4)], ["person.lips.natural_color", single("coral")]]);
    spec = setPromptExclusion(spec, "person.lips.natural_color", true);
    expect(compilePrompt(spec, core).prompt).toBe("Eye size: large.");
    const back = importSpecJson(exportSpecJson(spec), core);
    expect(back.status === "valid" && back.spec.selections).toEqual(spec.selections);
  });

  it("category reset clears only that area (excluded values included) and restores exactly", () => {
    let spec = buildSpec(core, [["person.identity.age", { kind: "number", value: 30, unit: "years" }], ["person.eyes.shape", single("round")], ["person.eyes.size", num(2)], ["person.nose.shape", single("button")]]);
    spec = setPromptExclusion(spec, "person.eyes.size", true);
    const { spec: cleared, removed } = resetCategory(spec, core, "person_eyes");
    expect(Object.keys(removed).sort()).toEqual(["person.eyes.shape", "person.eyes.size"]);
    expect(Object.keys(cleared.selections).sort()).toEqual(["person.identity.age", "person.nose.shape"]);
    expect(restoreCategoryReset(cleared, removed).spec.selections).toEqual(spec.selections);
  });

  it("existing safety policy is unchanged with facial values present (minor + sexual wording still blocks; adult is fine)", () => {
    const facialSet: Array<[string, SelectionValue]> = [["person.eyes.size", num(5)], ["person.lips.shape", multi("full")], ["person.lips.natural_color", single("red")]];
    expect(out([["intent.description", text("a sexy pose")], ["person.identity.age_group", single("adolescent")], ...facialSet]).blocked).toBe(true);
    expect(out([["intent.description", text("a sexy pose")], ["person.identity.age", { kind: "number", value: 30, unit: "years" }], ...facialSet]).blocked).toBe(false);
  });

  it.each([
    ["광대", "attribute", "person.face.cheekbones"],
    ["jawline", "attribute", "person.face.jawline"],
    ["V라인", "option", "person.face.jawline"],
    ["속쌍", "option", "person.eyes.eyelids"],
    ["almond", "option", "person.eyes.shape"],
    ["눈동자 색", "attribute", "person.eyes.iris_color"],
    ["매부리코", "option", "person.nose.shape"],
    ["콧볼", "attribute", "person.nose.alar_width"],
    ["입꼬리", "attribute", "person.lips.corners"],
    ["cupid", "attribute", "person.lips.cupids_bow"],
  ])("search “%s” finds %s %s", (q, kind, attributeId) => {
    expect(searchCatalog(core, q).some((h) => h.kind === kind && h.attributeId === attributeId)).toBe(true);
  });
});

describe("Identity and Basic regression", () => {
  it("unset facial attributes add nothing to existing prompts", () => {
    const facialIds = (a: AttributeDefinition) => /^person\.(face|eyes|eyebrows|nose|lips)\./.test(a.id);
    expect(core.attributes().filter(facialIds)).toHaveLength(47);
    expect(out([["subject.kind", single("person")], ["person.identity.entity_type", single("human")]]).prompt).toBe("Main subject: a single person. Type of being: human.");
  });
});
