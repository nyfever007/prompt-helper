import { describe, expect, it } from "vitest";
import {
  analyzeSpecInput,
  baselinePolicy,
  compilePrompt,
  createMemoryStore,
  createSpecStorage,
  evaluateSafety,
  exportPromptText,
  exportSpecJson,
  getCoreRegistry,
  getPromptOutput,
  importSpecJson,
} from "@/domain";
import { policyRegistry } from "../fixtures/catalogs";
import { buildSpec, single, text } from "../fixtures/specs";

const core = getCoreRegistry();
const check = (t: string) => evaluateSafety({ tags: [], texts: [{ attributeId: "intent.description", text: t }] });
const compileText = (t: string) => compilePrompt(buildSpec(core, [["intent.description", text(t)]]), core);

describe("safety: prohibited content is blocked", () => {
  it.each([
    ["sexy schoolgirl", "minor-sexualization"],
    ["a seductive little girl", "minor-sexualization"],
    ["teenager in lingerie", "minor-sexualization"],
    ["a 15-year-old, sensual pose", "minor-sexualization"],
    ["a cute girl in lingerie", "minor-sexualization"], // ambiguous-age word + sexual wording (approved conservative rule)
    ["sexy boy", "minor-sexualization"],
    ["섹시한 여고생", "minor-sexualization"],
    ["야한 교복 차림의 소녀", "minor-sexualization"],
    ["관능적인 17세 소년", "minor-sexualization"],
    ["로리 캐릭터, 야한 포즈", "minor-sexualization"],
    ["pornographic scene", "explicit-sexual-content"],
    ["two adults having sex", "explicit-sexual-content"],
    ["성행위 장면", "explicit-sexual-content"],
    ["nude woman on a bed", "nudity"],
    ["a naked man", "nudity"],
    ["topless model", "nudity"],
    ["알몸의 여성", "nudity"],
    ["나체 조각상 같은 성인 남성", "nudity"],
  ])("%s → blocked (%s)", (input, ruleId) => {
    const r = check(input);
    expect(r.blocked).toBe(true);
    expect(r.findings.map((f) => f.ruleId)).toContain(ruleId);
  });

  it("explicit content involving minors reports both rules", () => {
    const r = check("naked child");
    expect(r.findings.map((f) => f.ruleId)).toEqual(["minor-sexualization", "nudity"]);
  });

  it("obfuscation with spacing, width and case variants of the same words is still caught", () => {
    expect(check("SEXY   SchoolGirl").blocked).toBe(true);
    expect(check("ｓｅｘｙ schoolgirl").blocked).toBe(true); // full-width (NFKC)
    expect(check("sexy school​girl").blocked).toBe(true); // zero-width joiner removed
  });
});

describe("safety: legitimate content stays permitted", () => {
  it.each([
    "An adult woman in an elegant evening gown with a plunging neckline",
    "Confident adult model in lingerie, tasteful editorial fashion photo",
    "A sensual, moody portrait of an adult man",
    "Curvy adult woman in a fitted bodycon dress",
    "Slim adult woman with a large bust, wearing a turtleneck sweater",
    "Athletic bodybuilder, shirtless at the gym",
    "Swimwear photoshoot on the beach, bikini, adult models",
    "Children playing soccer in a park",
    "A mother holding her baby",
    "A boy and a girl reading books in a library",
    "Kids in swimsuits splashing at the beach",
    "Nude lipstick and nude heels, beige palette",
    "Seen with the naked eye",
    "A 25-year-old woman, sexy evening look",
    "baby blue sports car, sexy curves",
    "섹시한 정장을 입은 성인 여성, 아기자기한 카페",
    "칼로리 높은 디저트 광고, 섹시한 분위기",
    "전라도 시골 마을 풍경",
    "성교육 포스터 일러스트",
    "자위대 기지의 전경",
    "판타지 게임 속 성기사",
    "교복을 입은 학생들이 운동장에서 뛰어노는 모습",
    "대학생 커플의 로맨틱한 데이트, 섹시한 드레스",
    "장노출로 찍은 도시 야경",
    "누드톤 메이크업의 성인 모델",
    "Erection of a steel tower, construction site",
    "5세대 이동통신 광고, 19세기 거리",
  ])("%s → not blocked", (input) => {
    const r = check(input);
    expect(r.blocked, JSON.stringify(r.findings)).toBe(false);
  });
});

describe("safety: structured selections (policy tags on independent axes)", () => {
  const reg = policyRegistry();
  const compile = (entries: Array<[string, string]>) => compilePrompt(buildSpec(reg, entries.map(([a, o]) => [a, single(o)])), reg);

  it("minor + suggestive appeal → blocked", () => {
    expect(compile([["x.age_group", "child"], ["x.appeal", "alluring"]]).blocked).toBe(true);
  });

  it("minor + unclothed → blocked; adult + unclothed → blocked (nudity)", () => {
    expect(compile([["x.age_group", "child"], ["x.exposure", "unclothed_figure"]]).safety.findings.map((f) => f.ruleId)).toEqual(["minor-sexualization", "nudity"]);
    expect(compile([["x.age_group", "adult"], ["x.exposure", "unclothed_figure"]]).safety.findings.map((f) => f.ruleId)).toEqual(["nudity"]);
  });

  it("body proportions, fit and coverage are NOT sexual signals", () => {
    expect(compile([["x.age_group", "child"], ["x.coverage", "minimal_coverage"]]).blocked).toBe(false); // e.g. swimwear at the beach
    expect(compile([["x.age_group", "child"], ["x.fit", "tight_fit"]]).blocked).toBe(false);
    expect(compile([["x.age_group", "child"], ["x.body", "athletic"]]).blocked).toBe(false);
  });

  it("adult + suggestive appeal + minimal coverage + tight fit + any body type → permitted", () => {
    for (const body of ["slim", "curvy", "athletic"]) {
      const c = compile([["x.age_group", "adult"], ["x.appeal", "alluring"], ["x.coverage", "minimal_coverage"], ["x.fit", "tight_fit"], ["x.body", body]]);
      expect(c.blocked).toBe(false);
      expect(c.prompt).not.toBe("");
    }
  });

  it("structured tags combine with free text (child tag + 'sexy' in text → blocked)", () => {
    const spec = buildSpec(reg, [["x.age_group", single("child")], ["intent.description", text("a sexy pose")]]);
    const c = compilePrompt(spec, reg);
    expect(c.blocked).toBe(true);
    expect(c.diagnostics.find((d) => d.code === "safety.minor-sexualization")?.involves).toEqual(["x.age_group", "intent.description"]);
  });

  it("inapplicable (not compiled) selections are not part of the output check", () => {
    // policy evaluates what would be output; an excluded selection cannot leak
    const c = compile([["x.age_group", "adult"]]);
    expect(c.safety.findings).toEqual([]);
  });
});

describe("safety: every output path is gated; original data is preserved", () => {
  const blockedSpec = () =>
    buildSpec(core, [
      ["subject.kind", single("person")],
      ["intent.description", text("sexy schoolgirl in a classroom")],
      ["output.aspect_ratio", single("square")],
    ]);

  it("compilation withholds prompt, fragments and parameters and explains why", () => {
    const c = compilePrompt(blockedSpec(), core);
    expect(c.blocked).toBe(true);
    expect(c.prompt).toBe("");
    expect(c.fragments).toEqual([]);
    expect(c.parameters).toEqual({});
    const d = c.diagnostics.find((x) => x.code === "safety.minor-sexualization")!;
    expect(d.severity).toBe("error");
    expect(d.params?.terms).toBe("schoolgirl, sexy");
    expect(d.involves).toEqual(["intent.description"]);
  });

  it("getPromptOutput / exportPromptText refuse blocked compilations", () => {
    const c = compilePrompt(blockedSpec(), core);
    expect(getPromptOutput(c)).toEqual({ ok: false, reason: "blocked" });
    expect(exportPromptText(c)).toBeNull();
    // and a tampered compilation object still cannot pass the gate
    expect(getPromptOutput({ ...c, prompt: "leak" })).toEqual({ ok: false, reason: "blocked" });
  });

  it("the original spec is never rewritten and JSON export/import/save keep it losslessly", () => {
    const spec = blockedSpec();
    const json = exportSpecJson(spec);
    expect(json).toContain("sexy schoolgirl in a classroom");
    const imported = importSpecJson(json, core);
    expect(imported.status).toBe("valid");
    expect(imported.status === "valid" && imported.spec).toEqual(spec);
    const store = createMemoryStore();
    createSpecStorage(store, core).save(spec);
    const loaded = createSpecStorage(store, core).load();
    expect(loaded.status === "loaded" && loaded.spec).toEqual(spec);
    // …while the compiled output of the imported spec is still blocked
    expect(imported.status === "valid" && compilePrompt(imported.spec, core).blocked).toBe(true);
  });

  it("analysis of an imported spec does not alter text to make it pass", () => {
    const raw = JSON.parse(exportSpecJson(blockedSpec()));
    const r = analyzeSpecInput(raw, core);
    expect(r.status === "valid" && r.spec.selections["intent.description"]!.value).toEqual({ kind: "text", text: "sexy schoolgirl in a classroom" });
  });

  it("text outside the user's data that the adapter adds is checked too", () => {
    const c = compilePrompt(buildSpec(core, [["subject.kind", single("person")]]), core, {
      adapter: { id: "leaky", version: "1", outputLanguage: "en", supportsPriority: false, render: () => ({ prompt: "nude figure", negativePrompt: "" }) },
    });
    expect(c.blocked).toBe(true);
    expect(c.safety.findings[0]!.signals[0]!.sources).toEqual([{ kind: "text", attributeId: "$prompt", term: "nude" }]);
  });

  it("is deterministic and versioned", () => {
    const a = compileText("sexy schoolgirl");
    expect(compileText("sexy schoolgirl")).toEqual(a);
    expect(a.meta.safetyPolicyVersion).toBe(baselinePolicy.version);
  });
});

describe("safety evaluation pre-filter (Sprint 2-B.2 performance) gives identical results", () => {
  it("every signal is detected exactly as by a per-entry reference scan, over lexicon terms, exceptions, near-misses and all catalog phrases", async () => {
    const { baselinePolicy, evaluateSafety, matchEntry, normalizeForSafety, getCoreRegistry, isOptionAttribute } = await import("@/domain");
    // One rule per signal exposes the detected signals through findings.
    const probe = { ...baselinePolicy, rules: baselinePolicy.signals.map((sg) => ({ id: sg.id, category: "probe", severity: "warn" as const, allOf: [[sg.id]], message: { en: "" }, guidance: { en: "" } })) };
    const core = getCoreRegistry();
    const corpus = [
      ...baselinePolicy.signals.flatMap((sg) => sg.lexicon.flatMap((e) => [e.term ?? "", ...(e.except ?? []), `x${e.term ?? ""}x`, `the ${e.term ?? ""}s here`])),
      "a 12 years old", "aged 15", "a 7yo", "17세", "300 years old", "28–32 years old", "baby blue sky", "칼로리 계산", "nude lipstick and nudes",
      ...core.attributes().flatMap((a) => (isOptionAttribute(a) ? a.options.flatMap((o) => [o.prompt.text, ...(o.prompt.variants ?? []).map((v) => v.text)]) : a.type === "number" ? (a.bands ?? []).map((b) => b.text) : [])),
    ].filter(Boolean);
    expect(corpus.length).toBeGreaterThan(900);
    for (const text of corpus) {
      const reference = baselinePolicy.signals.filter((sg) => sg.lexicon.some((e) => matchEntry(e, normalizeForSafety(text)).length > 0)).map((sg) => sg.id);
      const actual = evaluateSafety({ tags: [], texts: [{ attributeId: "t", text }] }, probe).findings.map((f) => f.ruleId);
      expect(actual, text).toEqual(reference);
    }
  });
});
