import type { Condition } from "../../schema";
import { SLIDER, degree, fd, shape, type Attr, type O, type Rule, type ShapeOptions } from "../person/builders";

/**
 * Sprint 2-B.6 (4) — Shared › Lighting additions. Specification: docs/catalogs/shared/lighting.md.
 *
 * The Sprint 2-A lighting structure stays: the Basic preset (`lighting.preset`) and the six
 * Detailed properties keep their IDs, options, output and takeover/provenance behavior;
 * they only gain extra options in core.ts (very dim … very bright etc.). The attributes
 * below are new and independent: key, fill, rim and ambient light are separate values;
 * intensity ≠ softness; light color ≠ color temperature; shadow strength ≠ shadow edge.
 * “No rim light” hides the rim color (kept). Lighting never sets time, place, weather or
 * skin tone. No 3D light editor or multi-light objects.
 */

const CAT = "shared_lighting";
const ANY: Condition[] = [];
const lit = (id: string, order: number, label: [string, string], aliases: string[], description: ReturnType<typeof fd>, template: string, options: O[], o: ShapeOptions = {}): Attr =>
  ({ ...shape(id, order, CAT, fd(label[0], label[1]), aliases, description, template, options, { custom: false, ...o, scope: ANY }), groupId: "lighting_axes" }) as Attr;
const litDegree = (id: string, order: number, label: [string, string], aliases: string[], description: ReturnType<typeof fd>, template: string, bands: Parameters<typeof degree>[7], when: Condition[] = []): Attr =>
  ({ ...degree(id, order, CAT, fd(label[0], label[1]), aliases, description, template, bands, when, ANY), groupId: "lighting_axes" }) as Attr;

export const LIGHT_COLOR_GROUPS: Array<[string, string, string]> = [["whites", "Whites", "화이트"], ["warm", "Warm", "따뜻한 색"], ["cool", "Cool", "차가운 색"], ["vivid", "Vivid", "비비드"]];
export const LIGHT_COLORS: O[] = [
  ["white", "화이트", "White", "white", [], "#ffffff", "whites"], ["warm_white", "웜 화이트", "Warm white", "warm white", ["전구색"], "#ffe9c4", "whites"], ["cool_white", "쿨 화이트", "Cool white", "cool white", ["주광색"], "#e3efff", "whites"],
  ["amber", "앰버", "Amber", "amber", [], "#ffb000", "warm"], ["golden", "골든", "Golden", "golden", ["금빛"], "#f5c542", "warm"], ["orange", "오렌지", "Orange", "orange", [], "#ff7a1a", "warm"], ["red", "레드", "Red", "red", [], "#e0201b", "warm"],
  ["yellow", "옐로", "Yellow", "yellow", [], "#ffe14d", "vivid"], ["green", "그린", "Green", "green", [], "#2fc24a", "vivid"],
  ["cyan", "시안", "Cyan", "cyan", [], "#1fd3e0", "cool"], ["blue", "블루", "Blue", "blue", [], "#2b5cff", "cool"], ["violet", "바이올렛", "Violet", "violet", [], "#7b3fe4", "cool"],
  ["magenta", "마젠타", "Magenta", "magenta", [], "#e0249a", "vivid"], ["pink", "핑크", "Pink", "pink", [], "#ff7ab8", "vivid"],
];
/** Explicit “none” (≠ unset) to strong. */
const NONE_TO_STRONG: O[] = [["none", "없음", "None", "none"], ["subtle", "약간", "Subtle", "subtle"], ["moderate", "보통", "Moderate", "moderate"], ["strong", "강함", "Strong", "strong"]];

export const lightingAttributes: Attr[] = [
  litDegree("lighting.key_height", 2025, ["Key light height", "주광 높이"], ["light height", "광원 높이", "조명 높이"], SLIDER("Height of the key light relative to the subject; separate from its direction.", "피사체 대비 주광의 높이이며 방향과 별개입니다."), "Key light position: {value}.", [
    ["아주 낮음", "Very low", "very low"], ["낮음", "Low", "low"], ["눈높이", "Level", "level with the subject"], ["높음", "High", "high"], ["아주 높음", "Very high", "very high"],
  ]),
  lit("lighting.key_color", 2055, ["Key light color", "주광 색상"], ["light color", "조명 색", "컬러 조명"], fd("Color of the key light — separate from the color temperature. Custom color names allowed.", "주광의 색이며 색온도와 별개입니다. 사용자 정의 색 이름 가능."), "Key light color: {value}.", LIGHT_COLORS, { control: "color", groups: LIGHT_COLOR_GROUPS, custom: true }),
  lit("lighting.fill", 2065, ["Fill light", "보조광"], ["fill light", "보조광", "필 라이트"], fd("Strength of the fill light; “none” is explicit.", "보조광의 세기이며 ‘없음’은 명시적 선택입니다."), "Fill light: {value}.", NONE_TO_STRONG),
  lit("lighting.rim", 2070, ["Rim light", "림 라이트"], ["rim light", "림 라이트", "윤곽광", "헤어 라이트"], fd("Strength of the rim light; “none” hides the rim light color (kept).", "림 라이트의 세기이며 ‘없음’이면 림 라이트 색상을 출력하지 않습니다(보존)."), "Rim light: {value}.", NONE_TO_STRONG),
  lit("lighting.rim_color", 2072, ["Rim light color", "림 라이트 색상"], ["rim color", "림 라이트 색"], fd("Not output when the rim light is “none”.", "림 라이트가 ‘없음’이면 출력하지 않습니다."), "Rim light color: {value}.", LIGHT_COLORS, {
    control: "color", groups: LIGHT_COLOR_GROUPS, custom: true, when: [{ op: "noneOf", attributeId: "lighting.rim", optionIds: ["none"], whenUnset: "pass" }],
  }),
  lit("lighting.ambient", 2075, ["Ambient light", "환경광"], ["ambient light", "환경광", "주변광"], fd("Overall surrounding light; “none” is explicit.", "주변 전체의 빛이며 ‘없음’은 명시적 선택입니다."), "Ambient light: {value}.", NONE_TO_STRONG),
  lit("lighting.shadow_strength", 2080, ["Shadow strength", "그림자 강도"], ["shadows", "그림자", "그림자 진하기"], fd("How dark the shadows are; separate from their edge.", "그림자의 진하기이며 경계 형태와 별개입니다."), "Shadows: {value}.", [
    ["none", "그림자 없음", "No visible shadows", "no visible shadows"], ["light", "옅은", "Light", "light shadows"], ["moderate", "보통", "Moderate", "moderate shadows"], ["strong", "진한", "Strong", "strong shadows"], ["deep", "깊은", "Deep", "deep shadows"],
  ]),
  litDegree("lighting.shadow_edge", 2082, ["Shadow edge", "그림자 경계"], ["shadow edge", "그림자 경계", "그림자 윤곽"], SLIDER("Softness of shadow edges; not output when there are no visible shadows.", "그림자 경계의 부드러운 정도이며 ‘그림자 없음’이면 출력하지 않습니다."), "Shadow edges: {value}.", [
    ["아주 부드러움", "Very soft", "very soft"], ["부드러움", "Soft", "soft"], ["보통", "Moderate", "moderately defined"], ["뚜렷함", "Defined", "defined"], ["아주 뚜렷함", "Sharply defined", "sharply defined"],
  ], [{ op: "noneOf", attributeId: "lighting.shadow_strength", optionIds: ["none"], whenUnset: "pass" }]),
  lit("lighting.reflected", 2085, ["Reflected light", "반사광"], ["reflected light", "반사광", "바운스"], fd("Light bounced from surfaces; “none” is explicit.", "주변 면에서 반사된 빛이며 ‘없음’은 명시적 선택입니다."), "Reflected light: {value}.", NONE_TO_STRONG),
  lit("lighting.volumetric", 2090, ["Volumetric light", "볼류메트릭 조명"], ["volumetric", "god rays", "빛내림", "빛줄기"], fd("Visible light beams in the air; “none” is explicit.", "공기 중에 보이는 빛줄기이며 ‘없음’은 명시적 선택입니다."), "Volumetric lighting: {value}.", NONE_TO_STRONG),
  lit("lighting.source_visibility", 2095, ["Light source visibility", "광원 가시성"], ["light source visible", "광원 노출", "화면 밖 조명"], fd("Whether the light source itself is in frame.", "광원이 화면 안에 보이는지입니다."), "Light source visibility: {value}.", [
    ["visible", "화면 안", "Visible", "visible in the frame"], ["off_screen", "화면 밖", "Off-screen", "off-screen"],
  ]),
];

/** Real contradiction only (non-blocking). */
export const lightingRules: Rule[] = [
  {
    id: "lighting-low-contrast-vs-deep-shadows",
    kind: "conflict",
    severity: "warning",
    when: [
      { op: "anyOf", attributeId: "lighting.contrast", optionIds: ["very_low", "low"] },
      { op: "anyOf", attributeId: "lighting.shadow_strength", optionIds: ["deep"] },
    ],
    involves: ["lighting.contrast", "lighting.shadow_strength"],
    message: { en: "Low lighting contrast is combined with deep shadows.", ko: "낮은 명암 대비에 깊은 그림자가 함께 설정되었습니다." },
    guidance: { en: "Neither value is changed automatically. Adjust one if this is not intended.", ko: "어느 값도 자동으로 바꾸지 않습니다. 의도한 설정이 아니라면 하나를 고치세요." },
  },
];
