import type { CatalogInput, Condition } from "../../schema";

/**
 * Shared data builders for person catalogs (Sprint 2-B.2, 2-B.3). They only
 * shape catalog DATA — every behavior comes from the common catalog features
 * (degree bands, custom values, palette, output toggle, rules, applicability).
 */

export type Attr = CatalogInput["attributes"][number];
export type Rule = NonNullable<CatalogInput["rules"]>[number];
export type L = { en: string; ko: string };

export const fd = (en: string, ko: string): L => ({ en, ko });
export const SLIDER = (en: string, ko: string) => fd(`${en} Relative impression only — not a measurement.`, `${ko} 상대적인 정도이며 실제 측정값이 아닙니다.`);

/** Person attributes apply to a single person; when no subject is chosen yet, do not restrict. */
export const forPerson: Condition[] = [{ op: "anyOf", attributeId: "subject.kind", optionIds: ["person"], whenUnset: "pass" }];

/** Subject scope of an attribute: person attributes by default; shared (camera, lighting) attributes pass `[]` or their own subjects. */
const base = (id: string, order: number, categoryId: string, label: L, aliases: string[], description: L, kind: "categorical" | "relative", when: Condition[] = [], scope: Condition[] = forPerson) => ({
  id,
  domain: id.startsWith("person.") ? id.split(".").slice(0, 2).join(".") : id.split(".")[0]!,
  status: "approved" as const,
  categoryId,
  tier: "detailed" as const,
  order,
  label,
  aliases,
  description,
  appliesWhen: [...scope, ...when],
  expression: { role: "direct" as const, kind },
  outputToggle: true,
});

/** Option: [id, ko, en label, prompt text, aliases?, swatch?, display group?] */
export type O = [string, string, string, string, string[]?, string?, string?];
const opts = (list: O[]) =>
  list.map(([id, ko, en, text, aliases, swatch, group]) => ({
    id,
    label: { en, ko },
    prompt: { text },
    ...(aliases?.length ? { aliases } : {}),
    ...(swatch ? { swatch } : {}),
    ...(group ? { group } : {}),
  }));

export interface ShapeOptions {
  multi?: boolean;
  /** Custom values (default on, with a name-only notice). */
  custom?: boolean;
  control?: "searchable" | "color" | "dropdown";
  /** Display-only option groups: [id, en, ko]. */
  groups?: Array<[string, string, string]>;
  /** Extra applicability conditions (kept values are restored when they apply again). */
  when?: Condition[];
  /** Subject scope (default: single person). */
  scope?: Condition[];
}

export const shape = (id: string, order: number, cat: string, label: L, aliases: string[], description: L, template: string, options: O[], o: ShapeOptions = {}): Attr =>
  ({
    ...base(id, order, cat, label, aliases, description, "categorical", o.when, o.scope),
    type: o.multi ? "multi" : "single",
    ...(o.control ? { control: o.control } : {}),
    ...(o.custom === false ? {} : { custom: { nameOnlyNotice: true } }),
    ...(o.groups ? { optionGroups: o.groups.map(([gid, en, ko], i) => ({ id: gid, label: { en, ko }, order: i })) } : {}),
    prompt: { template },
    options: opts(options),
  }) as Attr;

/** Band: [ko label, en label, prompt text] — 5 ordered qualitative bands on a 1–5 relative slider. */
export type B = [string, string, string];
export type Bands = [B, B, B, B, B];
export const degree = (id: string, order: number, cat: string, label: L, aliases: string[], description: L, template: string, bands: Bands, when: Condition[] = [], scope: Condition[] = forPerson): Attr =>
  ({
    ...base(id, order, cat, label, aliases, description, "relative", when, scope),
    type: "number",
    control: "slider",
    semantics: "degree",
    min: 1,
    max: 5,
    step: 1,
    prompt: { template },
    bands: bands.map(([ko, en, text], i) => ({ upTo: i + 1, label: { en, ko }, text })),
  }) as Attr;

// Reusable band sets (ko, en, text). Texts are relative descriptions, not measurements.
export const SIZE: Bands = [["아주 작음", "Very small", "very small"], ["작음", "Small", "small"], ["보통", "Medium", "medium-sized"], ["큼", "Large", "large"], ["아주 큼", "Very large", "very large"]];
export const LENGTH: Bands = [["아주 짧음", "Very short", "very short"], ["짧음", "Short", "short"], ["보통", "Medium", "medium length"], ["긺", "Long", "long"], ["아주 긺", "Very long", "very long"]];
export const NARROW_BROAD: Bands = [["아주 좁음", "Very narrow", "very narrow"], ["좁음", "Narrow", "narrow"], ["보통", "Medium", "medium width"], ["넓음", "Broad", "broad"], ["아주 넓음", "Very broad", "very broad"]];
export const NARROW_WIDE: Bands = [["아주 좁음", "Very narrow", "very narrow"], ["좁음", "Narrow", "narrow"], ["보통", "Medium", "medium width"], ["넓음", "Wide", "wide"], ["아주 넓음", "Very wide", "very wide"]];
export const LOW_HIGH: Bands = [["아주 낮음", "Very low", "very low"], ["낮음", "Low", "low"], ["보통", "Medium", "medium height"], ["높음", "High", "high"], ["아주 높음", "Very high", "very high"]];
export const SPARSE_DENSE: Bands = [["아주 성김", "Very sparse", "very sparse"], ["성김", "Sparse", "sparse"], ["보통", "Medium", "medium density"], ["촘촘함", "Dense", "dense"], ["아주 촘촘함", "Very dense", "very dense"]];
export const THIN_THICK: Bands = [["아주 얇음", "Very thin", "very thin"], ["얇음", "Thin", "thin"], ["보통", "Medium", "medium thickness"], ["두꺼움", "Thick", "thick"], ["아주 두꺼움", "Very thick", "very thick"]];
export const THIN_FULL: Bands = [["아주 얇음", "Very thin", "very thin"], ["얇음", "Thin", "thin"], ["보통", "Medium", "medium fullness"], ["도톰함", "Full", "full"], ["아주 도톰함", "Very full", "very full"]];
export const DOWN_UP_TURNED: Bands = [
  ["많이 처짐", "Strongly downturned", "strongly downturned"],
  ["약간 처짐", "Slightly downturned", "slightly downturned"],
  ["수평", "Level", "level"],
  ["약간 올라감", "Slightly upturned", "slightly upturned"],
  ["많이 올라감", "Strongly upturned", "strongly upturned"],
];

/** Non-blocking warning rules for genuinely opposite options inside one (multi-select) attribute. */
export const opposite = (attributes: readonly Attr[], attributeId: string, pairs: Array<[string, string]>): Rule[] => {
  const a = attributes.find((x) => x.id === attributeId) as Extract<Attr, { type: "single" | "multi" }>;
  const labelOf = (optionId: string): L => {
    const o = a.options.find((x) => x.id === optionId)!;
    return { en: o.label.en, ko: o.label.ko! };
  };
  return pairs.map(([x, y]) => {
    const lx = labelOf(x);
    const ly = labelOf(y);
    return {
      id: `${attributeId.replace(/^person\./, "").replace(/[._]/g, "-")}-${x.replace(/_/g, "-")}-vs-${y.replace(/_/g, "-")}`,
      kind: "conflict" as const,
      severity: "warning" as const,
      when: [
        { op: "anyOf" as const, attributeId, optionIds: [x] },
        { op: "anyOf" as const, attributeId, optionIds: [y] },
      ],
      involves: [attributeId],
      message: { en: `“${lx.en}” and “${ly.en}” describe opposite traits.`, ko: `‘${lx.ko}’과(와) ‘${ly.ko}’은(는) 서로 반대되는 특징입니다.` },
      guidance: {
        en: "Keep both only if this is intended (e.g. a stylized design); otherwise deselect one. Nothing is changed automatically.",
        ko: "의도한 표현(예: 스타일화된 디자인)이라면 그대로 두고, 아니라면 하나를 해제하세요. 자동으로 바꾸지 않습니다.",
      },
    };
  });
};

/** All unordered pairs of a group of mutually exclusive options. */
export const pairsOf = (group: string[]): Array<[string, string]> => group.flatMap((a, i) => group.slice(i + 1).map((b) => [a, b] as [string, string]));

/**
 * “None” selected together with any other entry of the same multi-select
 * attribute (e.g. clean-shaven + mustache): one warning, nothing rewritten.
 */
export const noneWithOthers = (attributeId: string, noneId: string, id: string, what: L): Rule => ({
  id,
  kind: "conflict",
  severity: "warning",
  when: [
    { op: "anyOf", attributeId, optionIds: [noneId] },
    { op: "selectedCount", attributeId, min: 2 },
  ],
  involves: [attributeId],
  message: { en: `“None” (${what.en}) is selected together with other entries.`, ko: `‘없음’(${what.ko})이 다른 항목과 함께 선택되었습니다.` },
  guidance: { en: "Deselect “none” or the other entries. Nothing is changed automatically.", ko: "‘없음’ 또는 다른 항목을 해제하세요. 자동으로 바꾸지 않습니다." },
});
