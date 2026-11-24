import type { Condition } from "../../schema";
import { fd, shape, type Attr, type O } from "./builders";

/**
 * Sprint 2-B.6 (1) — Person › Appearance direction (`person.appearance.direction`).
 * Specification: docs/catalogs/person/expression.md §2.
 *
 * The overall look the user wants, chosen FIRST: a Basic-tier attribute shown right
 * after the subject once the subject is a single person, and the same attribute in
 * Detailed › 인상 및 매력 (one ImageSpec value). Interpretive; nothing is set
 * automatically, never limited by gender, and the age assessment is unchanged.
 * “Sexy” keeps the existing sexual-appeal signal (blocked with minor/ambiguous age).
 * Where an option states the same meaning as an impression value, the existing
 * `covers` de-duplication outputs it once (the stored values are never changed).
 */

/** Strict: only when the subject is explicitly a single person (Basic shows it right after choosing one). */
const personChosen: Condition[] = [{ op: "anyOf", attributeId: "subject.kind", optionIds: ["person"] }];

const OPTIONS: O[] = [
  ["beautiful", "아름다운", "Beautiful", "beautiful", ["미인", "beauty"]],
  ["handsome", "잘생긴", "Handsome", "handsome", ["미남", "훈훈한"]],
  ["pretty", "예쁜", "Pretty", "pretty", ["이쁜"]],
  ["cute", "귀여운", "Cute", "cute", ["큐트"]],
  ["stunning", "눈부시게 아름다운", "Stunning", "stunning"],
  ["sexy", "섹시한", "Sexy", "sexy", ["관능적인"]],
  ["gorgeous", "빼어나게 아름다운", "Gorgeous", "gorgeous", ["화려한 미모"]],
  ["attractive", "매력적인", "Attractive", "attractive"],
  ["charming", "호감 가는 매력", "Charming", "charming", ["호감형"]],
  ["elegant", "우아한", "Elegant", "elegant"],
  ["striking", "눈길을 끄는", "Striking", "striking"],
  ["refined", "세련된", "Refined", "refined"],
  ["adorable", "사랑스러운", "Adorable", "adorable"],
  ["rugged", "투박하고 강인한", "Rugged", "rugged", ["거친"]],
  ["ethereal", "몽환적인", "Ethereal", "ethereal"],
  ["androgynous", "중성적인", "Androgynous", "androgynous", ["젠더리스"]],
  ["ordinary", "평범한 외모", "Ordinary-looking", "ordinary-looking", ["평범한"]],
  ["distinctive", "개성 있는 외모", "Distinctive", "distinctive", ["개성"]],
];

const direction = shape(
  "person.appearance.direction",
  195, // right after the subject (190), before Identity (201)
  "person_expression_impression",
  fd("Appearance direction", "외모 방향"),
  ["appearance", "look", "외모", "외모 방향", "미모"],
  fd(
    "The overall look you want, set first. Combinable; never limited by gender and never sets age, face, body or clothing.",
    "원하는 전체적인 외모 방향을 먼저 정합니다. 함께 고를 수 있으며 성별로 제한하지 않고 연령·얼굴·신체·의상을 정하지 않습니다.",
  ),
  "Appearance direction: {value}.",
  OPTIONS,
  { multi: true, control: "searchable", scope: personChosen },
);

/** Same meaning as an impression value → output once (existing `covers` rule; values are kept). */
const COVERS: Record<string, Array<{ attributeId: string; optionIds: string[] }>> = {
  attractive: [{ attributeId: "person.impression.attractiveness", optionIds: ["attractive"] }],
  striking: [{ attributeId: "person.impression.attractiveness", optionIds: ["striking"] }],
  elegant: [{ attributeId: "person.impression.vibe", optionIds: ["elegant"] }],
  ethereal: [{ attributeId: "person.impression.vibe", optionIds: ["ethereal"] }],
  refined: [{ attributeId: "person.impression.overall", optionIds: ["refined"] }],
};

export const appearanceAttribute: Attr = (() => {
  const a = { ...direction, tier: "basic", groupId: "what" } as Attr & { tier: string; groupId: string };
  if (a.type !== "multi") throw new Error("appearance direction must be multi-select");
  a.options = a.options.map((o) => ({
    ...o,
    ...(COVERS[o.id] ? { covers: COVERS[o.id] } : {}),
    // The existing lexicon already treats “sexy” as sexual-appeal wording; the tag keeps the signal
    // independent of phrasing (e.g. model-specific wording), with the same minor-protection rule.
    ...(o.id === "sexy" ? { policyTags: ["appeal.suggestive"] } : {}),
  }));
  return a as Attr;
})();
