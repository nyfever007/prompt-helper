import type { AgeModel, CatalogInput, CategoryDefinition, Condition } from "../../schema";
import { REGIONS } from "./regions";

/**
 * Person › Identity catalog (Sprint 2-B.1) — APPROVED initial product vocabulary.
 * Specification: docs/catalogs/person/identity.md and docs/SPRINT_2B1_SPEC_REVIEW.md (3rd revision).
 *
 * Principles (CATALOG_DESIGN_STANDARD §3):
 * - Identity/context only: nothing here sets or implies face, body, skin, hair,
 *   clothing, expression, pose, props, style or lighting.
 * - Nationality, ethnicity and culture are independent of each other and of
 *   appearance; occupation, narrative role and status are independent of
 *   wardrobe, expression and props. No rule/covers/suggestion links them.
 * - Every attribute starts unset. Context values can be excluded from the prompt.
 * - "Custom" is not an option: user-defined values are CustomEntry values.
 */

export const IDENTITY = {
  entityType: "person.identity.entity_type",
  species: "person.identity.species",
  characterOrigin: "person.identity.character_origin",
  ageGroup: "person.identity.age_group",
  age: "person.identity.age",
  apparentAge: "person.identity.apparent_age",
  gender: "person.identity.gender",
  genderPresentation: "person.identity.gender_presentation",
  nationality: "person.identity.nationality",
  ethnicBackground: "person.identity.ethnic_background",
  culturalBackground: "person.identity.cultural_background",
  historicalPeriod: "person.identity.historical_period",
  occupation: "person.identity.occupation",
  narrativeRole: "person.identity.narrative_role",
  socialStatus: "person.identity.social_status",
  description: "person.identity.description",
} as const;

type Attr = CatalogInput["attributes"][number];
type Opt = { id: string; label: { en: string; ko: string }; prompt: { text: string; variants?: Array<{ when: Condition[]; text: string }> }; [k: string]: unknown };

/** Identity applies to a single person; when no subject is chosen yet, do not restrict (D11). */
const forPerson: Condition[] = [{ op: "anyOf", attributeId: "subject.kind", optionIds: ["person"], whenUnset: "pass" }];

const o = (id: string, ko: string, en: string, text: string, extra: Record<string, unknown> = {}): Opt => ({ id, label: { en, ko }, prompt: { text }, ...extra });

const base = (id: string, order: number, categoryId: string, en: string, ko: string, role: "direct" | "context", kind: "categorical" | "interpretive" | "numeric" | "freeText", aliases: string[]) => ({
  id,
  domain: "person.identity",
  status: "approved" as const,
  categoryId,
  tier: "detailed" as const,
  order,
  label: { en, ko },
  aliases,
  appliesWhen: forPerson,
  expression: { role, kind },
  outputToggle: true,
});

// ── Subcategories (navigation only) ──────────────────────────────────────────
export const identityCategories: CategoryDefinition[] = (
  [
    ["being", "Being", "존재"],
    ["age", "Age", "연령"],
    ["gender", "Gender", "성별"],
    ["background", "Background", "배경"],
    ["social", "Social", "사회"],
    ["other", "Other", "기타"],
  ] as const
).map(([id, en, ko], i) => ({
  id: `person_identity_${id}`,
  parentId: "person_identity",
  order: 1 + i,
  status: "approved" as const,
  label: { en, ko },
  docPath: "docs/catalogs/person/identity.md",
}));

// ── Entity type / species ────────────────────────────────────────────────────
const ENTITY_SUGGEST = (...ids: string[]): Condition[] => [{ op: "anyOf", attributeId: IDENTITY.entityType, optionIds: ids, whenUnset: "pass" }];
const speciesOption = (id: string, ko: string, en: string, text: string, typical: string[], extra: Record<string, unknown> = {}) =>
  o(id, ko, en, text, {
    ...(typical.length ? { suggestedWhen: ENTITY_SUGGEST(...typical), covers: [{ attributeId: IDENTITY.entityType, optionIds: typical }] } : {}),
    ...extra,
  });

const entityType: Attr = {
  ...base(IDENTITY.entityType, 201, "person_identity_being", "Entity type", "존재 유형", "direct", "categorical", ["존재 유형", "엔티티", "entity", "being type"]),
  type: "single",
  control: "searchable",
  description: {
    en: "The general nature of the being — not its style, anatomy or origin. Species gives a more precise identity.",
    ko: "존재의 일반적인 성격입니다. 스타일·신체 구조·출신을 뜻하지 않으며, 더 구체적인 정체성은 ‘종족’에서 고릅니다.",
  },
  custom: { nameOnlyNotice: true },
  prompt: { template: "Type of being: {value}." },
  options: [
    o("human", "인간", "Human", "human", { aliases: ["사람", "person"], description: { en: "Human being", ko: "인간" } }),
    o("fantasy_humanoid", "판타지 인간형 존재", "Fantasy humanoid", "fantasy humanoid", { aliases: ["판타지 종족", "fantasy race"], description: { en: "Humanoid in a fantasy setting", ko: "판타지 세계의 인간형 존재" } }),
    o("alien_humanoid", "외계 인간형 존재", "Alien humanoid", "alien humanoid", { aliases: ["외계인", "alien", "extraterrestrial"], description: { en: "Humanoid of extraterrestrial origin", ko: "외계에서 온 인간형 존재" } }),
    o("android", "안드로이드", "Android", "android", { aliases: ["인조인간", "synthetic human"], description: { en: "Humanlike artificial being", ko: "인간과 닮은 인공 존재" } }),
    o("cyborg", "사이보그", "Cyborg", "cyborg", { aliases: ["개조 인간"], description: { en: "Being with biological and technological components", ko: "생물학적 요소와 기계 요소를 함께 가진 존재" } }),
    o("humanoid_robot", "인간형 로봇", "Humanoid robot", "humanoid robot", { aliases: ["로봇", "휴머노이드", "robot"], description: { en: "Robot with humanoid form", ko: "인간 형태의 로봇" } }),
    o("anthropomorphic", "의인화 캐릭터", "Anthropomorphic character", "anthropomorphic character", { aliases: ["의인화", "anthro"], description: { en: "Nonhuman subject with humanlike qualities", ko: "인간적인 특성을 가진 비인간 대상" } }),
    o("supernatural", "초자연적 존재", "Supernatural being", "supernatural being", { aliases: ["초자연", "영적 존재"], description: { en: "Being of supernatural nature", ko: "초자연적 성격의 존재" } }),
    o("mythological", "신화적 존재", "Mythological being", "mythological being", { aliases: ["신화", "myth"], description: { en: "Being drawn from mythology", ko: "신화에서 유래한 존재" } }),
    o("artificial_life", "인공 생명체", "Artificial life form", "artificial life form", { aliases: ["인공생명", "artificial life"], description: { en: "Artificially created life", ko: "인공적으로 만들어진 생명" } }),
  ],
};

const BEAST = ["fantasy_humanoid", "anthropomorphic"];
const species: Attr = {
  ...base(IDENTITY.species, 202, "person_identity_being", "Species", "종족", "direct", "categorical", ["종족", "종", "race", "species"]),
  type: "single",
  control: "searchable",
  description: {
    en: "Choosing a species adds only its name — no ear shape, stature, skin color or other anatomy. Typical combinations are listed first; any combination is allowed.",
    ko: "종족을 고르면 이름만 반영됩니다. 귀 모양·키·피부색 같은 신체 특징은 추가되지 않습니다. 흔한 조합이 먼저 보이며, 어떤 조합도 선택할 수 있습니다.",
  },
  custom: { nameOnlyNotice: true },
  prompt: { template: "Species: {value}." },
  options: [
    speciesOption("human", "인간", "Human", "human", ["human"], { aliases: ["사람"] }),
    speciesOption("elf", "엘프", "Elf", "elf", ["fantasy_humanoid"], { aliases: ["요정족", "elves"] }),
    speciesOption("dwarf", "드워프", "Dwarf", "fantasy dwarf", ["fantasy_humanoid"], { aliases: ["난쟁이족"] }),
    speciesOption("orc", "오크", "Orc", "orc", ["fantasy_humanoid"]),
    speciesOption("goblin", "고블린", "Goblin", "goblin", ["fantasy_humanoid"]),
    speciesOption("giant", "거인족", "Giant", "fantasy giant", ["fantasy_humanoid"], { aliases: ["거인"] }),
    speciesOption("dragon_humanoid", "용인족", "Dragon humanoid", "dragon humanoid", ["fantasy_humanoid"], { aliases: ["드래곤족", "dragonkin"] }),
    speciesOption("beastfolk", "수인족", "Beastfolk", "beastfolk", BEAST, { aliases: ["수인", "kemonomimi"] }),
    o("catfolk", "고양이 수인", "Catfolk", "feline beastfolk", { parentId: "beastfolk", suggestedWhen: ENTITY_SUGGEST(...BEAST), aliases: ["묘인", "고양이 수인족"] }),
    o("foxfolk", "여우 수인", "Foxfolk", "fox beastfolk", { parentId: "beastfolk", suggestedWhen: ENTITY_SUGGEST(...BEAST), aliases: ["호인", "구미호 수인"] }),
    o("wolffolk", "늑대 수인", "Wolffolk", "wolf beastfolk", { parentId: "beastfolk", suggestedWhen: ENTITY_SUGGEST(...BEAST), aliases: ["늑대인간형 수인"] }),
    speciesOption("fairy", "요정", "Fairy", "fairy", ["fantasy_humanoid", "supernatural"], { aliases: ["페어리"] }),
    speciesOption("elemental", "정령", "Elemental", "elemental being", ["supernatural"], { aliases: ["엘리멘탈"] }),
    speciesOption("angel", "천사", "Angel", "angel", ["supernatural", "mythological"]),
    speciesOption("demon", "악마", "Demon", "demon", ["supernatural", "mythological"], { aliases: ["마족"] }),
    speciesOption("vampire", "뱀파이어", "Vampire", "vampire", ["fantasy_humanoid", "supernatural"], { aliases: ["흡혈귀"] }),
    speciesOption("undead", "언데드", "Undead", "undead being", ["supernatural"], { aliases: ["불사자"] }),
    o("hybrid", "혼합 종족", "Hybrid species", "hybrid species", {
      aliases: ["혼혈", "하이브리드"],
      description: { en: "A user-described combination — describe it in the character description.", ko: "사용자가 설명하는 조합입니다. 조합 내용은 ‘인물 설명’에 적어 주세요." },
    }),
  ],
};

const characterOrigin: Attr = {
  ...base(IDENTITY.characterOrigin, 203, "person_identity_being", "Character origin", "인물의 실재 여부", "context", "categorical", ["실재 여부", "인물 출처", "가상 인물", "실존 인물", "origin"]),
  type: "single",
  description: {
    en: "Whether the character is fictional or real. No real-person identification or reference images are involved.",
    ko: "가상의 인물인지 실존 인물인지에 대한 맥락입니다. 실존 인물 식별이나 참조 이미지를 다루지 않습니다.",
  },
  prompt: { template: "Character origin: {value}." },
  options: [
    o("fictional", "가상의 인물", "Fictional character", "fictional character"),
    o("real", "실존 인물", "Real person", "real person"),
    o("historical", "역사적 인물", "Historical figure", "historical figure"),
    o("mythological", "신화 속 인물", "Mythological figure", "mythological figure"),
    o("original", "독창적인 창작 캐릭터", "Original character", "original character", { aliases: ["오리지널 캐릭터", "OC"] }),
  ],
};

// ── Age ──────────────────────────────────────────────────────────────────────
const D = 365.25;
const group = (id: string, ko: string, en: string, text: string, min: number, maxExclusive: number | undefined, range: { en: string; ko: string }, minor: boolean) =>
  o(id, ko, en, text, {
    interval: maxExclusive === undefined ? { min } : { min, maxExclusive },
    description: range,
    ...(minor ? { policyTags: ["age.minor"] } : {}),
  });

const ageGroup: Attr = {
  ...base(IDENTITY.ageGroup, 204, "person_identity_age", "Age group", "연령대", "direct", "categorical", ["연령대", "나이대", "age group", "life stage"]),
  type: "single",
  control: "dropdown",
  description: {
    en: "Life stage as product bins for humans (not clinical definitions). No exact age is inferred from a group; nonhuman lifespans are not assumed.",
    ko: "인간 기준의 생애 단계 구분입니다(의학적 정의 아님). 연령대에서 정확한 나이를 추론하지 않으며, 비인간 존재에 인간 수명을 가정하지 않습니다.",
  },
  prompt: { template: "Age group: {value}." },
  options: [
    group("newborn", "신생아", "Newborn", "newborn", 0, 28 / D, { en: "Under 28 days", ko: "생후 28일 미만" }, true),
    group("infant", "영아", "Infant", "infant", 28 / D, 1, { en: "28 days to under 1 year", ko: "생후 28일 – 1세 미만" }, true),
    group("toddler", "걸음마기", "Toddler", "toddler", 1, 4, { en: "1–3 years", ko: "1–3세" }, true),
    group("preschool", "유아", "Preschool child", "preschool-aged child", 4, 6, { en: "4–5 years", ko: "4–5세" }, true),
    group("child", "어린이", "Child", "child", 6, 13, { en: "6–12 years", ko: "6–12세" }, true),
    group("adolescent", "청소년", "Adolescent", "adolescent", 13, 18, { en: "13–17 years", ko: "13–17세" }, true),
    group("young_adult", "젊은 성인", "Young adult", "young adult", 18, 30, { en: "18–29 years", ko: "18–29세" }, false),
    group("adult", "일반 성인 (30–44세)", "Adult (30–44)", "adult aged 30–44", 30, 45, { en: "30–44 years (a product bin, not the safety policy's adult class)", ko: "30–44세 (제품 구분이며, 안전 정책의 ‘성인’ 분류와 다릅니다)" }, false),
    group("middle_aged", "중년", "Middle-aged", "middle-aged adult", 45, 65, { en: "45–64 years", ko: "45–64세" }, false),
    group("older_adult", "노년", "Older adult", "older adult", 65, 80, { en: "65–79 years", ko: "65–79세" }, false),
    group("advanced_age", "고령", "Advanced age", "adult aged 80 or older", 80, undefined, { en: "80 years or older", ko: "80세 이상" }, false),
    o("ageless", "연령 개념 없음", "Ageless", "ageless", { description: { en: "For beings without an age concept", ko: "나이 개념이 없는 존재" } }),
  ],
};

const AGE_UNITS = [
  { id: "years", label: { en: "years", ko: "년" }, one: "year", other: "years", perBase: 1 },
  { id: "months", label: { en: "months", ko: "개월" }, one: "month", other: "months", perBase: 12 },
  { id: "days", label: { en: "days", ko: "일" }, one: "day", other: "days", perBase: D },
];

const age: Attr = {
  ...base(IDENTITY.age, 205, "person_identity_age", "Actual age", "실제 연령", "context", "numeric", ["실제 연령", "나이", "실제 나이", "age", "actual age"]),
  type: "quantity",
  forms: ["number", "range"],
  units: AGE_UNITS,
  min: 0,
  integer: true,
  description: {
    en: "Time alive, as an exact number or a complete range with a unit. Independent of apparent age; nothing is inferred from it.",
    ko: "실제로 살아온 시간입니다. 정확한 숫자 또는 완전한 범위를 단위와 함께 입력합니다. 외형적 연령과 독립적이며, 다른 값을 추론하지 않습니다.",
  },
  prompt: { template: "Actual age: {value} old." },
};

const apparentAge: Attr = {
  ...base(IDENTITY.apparentAge, 206, "person_identity_age", "Apparent age", "외형적 연령", "direct", "numeric", ["외형적 연령", "외모 나이", "보이는 나이", "apparent age", "looks age"]),
  type: "quantity",
  forms: ["number", "range"],
  units: AGE_UNITS,
  min: 0,
  integer: true,
  description: {
    en: "How old the character looks (visual age), independent of actual age. No adulthood is inferred from species or other values.",
    ko: "보이는 나이(외형상 연령)이며 실제 연령과 독립적입니다. 종족 등 다른 값으로 성인 여부를 추론하지 않습니다.",
  },
  prompt: { template: "Apparent age: approximately {value} old." },
};

// ── Gender ───────────────────────────────────────────────────────────────────
const ADULT: Condition[] = [{ op: "derived", fact: "age.class", anyOf: ["adult"] }];
const gender: Attr = {
  ...base(IDENTITY.gender, 207, "person_identity_gender", "Gender", "성별", "context", "categorical", ["성별", "gender"]),
  type: "single",
  description: {
    en: "Identity/context, not anatomy or wardrobe. “Woman”/“man” is used only when the age assessment is adult; otherwise an age-neutral wording is used. Your choice itself never changes.",
    ko: "정체성·맥락이며 신체나 의상을 뜻하지 않습니다. 연령 판단이 ‘성인’일 때만 woman/man으로, 그 외에는 연령 중립 표현으로 출력됩니다. 선택값 자체는 바뀌지 않습니다.",
  },
  custom: {},
  prompt: { template: "Gender: {value}." },
  options: [
    { id: "woman", label: { en: "Woman", ko: "여성" }, prompt: { text: "female character", variants: [{ when: ADULT, text: "woman" }] } },
    { id: "man", label: { en: "Man", ko: "남성" }, prompt: { text: "male character", variants: [{ when: ADULT, text: "man" }] } },
    o("nonbinary", "논바이너리", "Non-binary", "non-binary person", { aliases: ["non-binary", "nonbinary"] }),
    o("genderless", "성별 없음", "Genderless", "genderless character"),
    o("genderfluid", "젠더플루이드", "Genderfluid", "genderfluid person"),
  ],
};

const genderPresentation: Attr = {
  ...base(IDENTITY.genderPresentation, 208, "person_identity_gender", "Gender presentation", "성별 표현", "direct", "interpretive", ["성별 표현", "젠더 표현", "gender expression", "presentation"]),
  type: "single",
  description: {
    en: "How gender is presented, independent of gender identity. Does not prescribe body traits or outfit details.",
    ko: "성별을 드러내는 방식이며 성별 정체성과 독립적입니다. 신체 특징이나 의상을 정하지 않습니다.",
  },
  custom: { nameOnlyNotice: true },
  prompt: { template: "Gender presentation: {value}." },
  options: [
    o("feminine", "여성적인 표현", "Feminine", "feminine"),
    o("masculine", "남성적인 표현", "Masculine", "masculine"),
    o("androgynous", "중성적인 표현", "Androgynous", "androgynous"),
    o("mixed", "혼합된 표현", "Mixed", "mixed masculine and feminine"),
    o("neutral", "성별 표현을 강조하지 않음", "Not emphasized", "gender-neutral", { description: { en: "An explicit choice, different from “not set”", ko: "‘미설정’과 다른 명시적 선택입니다" } }),
  ],
};

// ── Background ───────────────────────────────────────────────────────────────
const nationality: Attr = {
  ...base(IDENTITY.nationality, 209, "person_identity_background", "Nationality / Country or Region", "국적 및 국가·지역", "context", "categorical", [
    "국적",
    "국가",
    "지역",
    "시민권",
    "nationality",
    "country",
    "region",
    "citizenship",
  ]),
  type: "multi",
  control: "searchable",
  description: {
    en: "Countries or regions associated with the person (multiple allowed). Does not assert legal nationality or political status, and never sets appearance, skin tone, clothing or body traits.",
    ko: "인물과 연결된 국가 또는 지역입니다(복수 선택 가능). 법적 국적이나 정치적 지위를 단정하지 않으며, 외모·피부색·의상·신체 특징을 설정하지 않습니다.",
  },
  custom: {},
  prompt: { template: "Nationality (country or region): {value}." },
  options: [
    ...REGIONS.map((r) => ({ id: r.id, label: { en: r.en, ko: r.ko }, aliases: [...r.aliases], prompt: { text: r.expression } })),
    o("stateless", "무국적", "Stateless", "stateless", { aliases: ["stateless person", "무국적자"] }),
  ],
};

const ethnicBackground: Attr = {
  ...base(IDENTITY.ethnicBackground, 210, "person_identity_background", "Ethnic background", "민족적 배경", "context", "categorical", ["민족", "민족적 배경", "ethnicity", "ethnic background"]),
  type: "multi",
  control: "searchable",
  description: {
    en: "Self-described or author-defined context, not a visual classification. An illustrative starter list — add your own. Never sets physical features.",
    ko: "스스로 정의하거나 작가가 정한 맥락이며 외형 분류가 아닙니다. 예시 목록이므로 필요한 항목은 직접 추가하세요. 신체 특징을 설정하지 않습니다.",
  },
  custom: {},
  prompt: { template: "Ethnic background: {value}." },
  options: [
    o("korean", "한국계", "Korean", "Korean"),
    o("japanese", "일본계", "Japanese", "Japanese"),
    o("han", "한족", "Han Chinese", "Han Chinese"),
    o("tamil", "타밀계", "Tamil", "Tamil"),
    o("yoruba", "요루바계", "Yoruba", "Yoruba"),
    o("maori", "마오리계", "Māori", "Māori", { aliases: ["Maori"] }),
    o("arab", "아랍계", "Arab", "Arab"),
    o("mixed", "복합 민족적 배경", "Mixed", "mixed", { aliases: ["mixed ethnic background", "혼혈"] }),
  ],
};

const culturalBackground: Attr = {
  ...base(IDENTITY.culturalBackground, 211, "person_identity_background", "Cultural background", "문화적 배경", "context", "categorical", ["문화", "문화적 배경", "culture"]),
  type: "multi",
  control: "searchable",
  description: {
    en: "Cultural context — not nationality or ethnicity. Religion, language and costume are not inferred.",
    ko: "문화적 맥락이며 국적·민족과 다릅니다. 종교·언어·복식을 추론하지 않습니다.",
  },
  custom: {},
  prompt: { template: "Cultural background: {value}." },
  options: [
    o("korean", "한국 문화", "Korean", "Korean"),
    o("japanese", "일본 문화", "Japanese", "Japanese"),
    o("chinese", "중국 문화", "Chinese", "Chinese"),
    o("mediterranean", "지중해 문화", "Mediterranean", "Mediterranean"),
    o("diaspora", "디아스포라 문화", "Diaspora", "diaspora"),
    o("multicultural", "다문화", "Multicultural", "multicultural"),
    o("fictional", "가상 문화", "Fictional culture", "fictional culture"),
  ],
};

const historicalPeriod: Attr = {
  ...base(IDENTITY.historicalPeriod, 212, "person_identity_background", "Historical period", "시대적 배경", "context", "categorical", ["시대", "시대적 배경", "era", "period"]),
  type: "single",
  control: "searchable",
  description: {
    en: "The character's era — independent of the scene's time and costume (time travel is valid).",
    ko: "인물이 속한 시대이며, 장면의 시간이나 복식과 자동으로 맞추지 않습니다(시간 여행 설정도 가능합니다).",
  },
  custom: {},
  prompt: { template: "Character's historical era: {value}." },
  options: [
    o("prehistoric", "선사 시대", "Prehistoric", "prehistoric era"),
    o("ancient", "고대", "Ancient", "ancient era"),
    o("medieval", "중세", "Medieval", "medieval era"),
    o("renaissance", "르네상스", "Renaissance", "Renaissance"),
    o("early_modern", "근세", "Early modern", "early modern era"),
    o("industrial", "산업화 시대", "Industrial era", "industrial era"),
    o("early_20c", "20세기 초", "Early 20th century", "early 20th century"),
    o("mid_20c", "20세기 중반", "Mid-20th century", "mid-20th century"),
    o("late_20c", "20세기 후반", "Late 20th century", "late 20th century"),
    o("contemporary", "현대", "Contemporary", "contemporary era"),
    o("future", "미래", "Future", "future era"),
    o("far_future", "먼 미래", "Far future", "far future"),
    o("joseon", "조선 시대", "Joseon era", "Joseon era (Korea)"),
    o("edo", "에도 시대", "Edo period", "Edo period (Japan)"),
    o("fictional", "가상 시대", "Fictional era", "fictional era"),
  ],
};

// ── Social ───────────────────────────────────────────────────────────────────
const occ = (group: string, items: Array<[string, string, string, string[]?]>) =>
  items.map(([id, ko, text, aliases]) => o(id, ko, text.charAt(0).toUpperCase() + text.slice(1), text, { group, ...(aliases ? { aliases } : {}) }));

const occupation: Attr = {
  ...base(IDENTITY.occupation, 213, "person_identity_social", "Occupation", "직업", "context", "categorical", ["직업", "직종", "job", "profession"]),
  type: "multi",
  control: "searchable",
  description: {
    en: "Context only — no clothing, equipment, expression or physical traits are added.",
    ko: "맥락 정보입니다. 의상·장비·표정·신체 특징을 추가하지 않습니다.",
  },
  custom: {},
  prompt: { template: "Occupation: {value}." },
  optionGroups: (
    [
      ["medicine", "Medicine", "의료"],
      ["technology", "Technology", "기술"],
      ["design", "Design", "디자인"],
      ["education", "Education", "교육"],
      ["business", "Business", "비즈니스"],
      ["services", "Services", "서비스"],
      ["land_sea", "Land and sea", "농림·해양"],
      ["public", "Public roles", "공공"],
      ["arts_media", "Arts and media", "예술·미디어"],
      ["fantasy", "Fantasy", "판타지"],
      ["exploration", "Exploration", "탐험"],
    ] as const
  ).map(([id, en, ko], i) => ({ id, label: { en, ko }, order: i })),
  options: [
    ...occ("medicine", [["doctor", "의사", "physician", ["doctor", "닥터"]], ["nurse", "간호사", "nurse"], ["pharmacist", "약사", "pharmacist"]]),
    ...occ("technology", [["developer", "개발자", "software developer", ["developer", "programmer", "프로그래머"]], ["engineer", "엔지니어", "engineer"], ["researcher", "연구원", "researcher"]]),
    ...occ("design", [["architect", "건축가", "architect"], ["designer", "디자이너", "designer"], ["artist", "예술가", "artist"]]),
    ...occ("education", [["teacher", "교사", "teacher"], ["professor", "교수", "professor"], ["student", "학생", "student"]]),
    ...occ("business", [["merchant", "상인", "merchant"], ["executive", "경영자", "business executive", ["executive", "CEO"]], ["entrepreneur", "기업가", "entrepreneur"]]),
    ...occ("services", [["chef", "요리사", "chef", ["cook", "셰프"]], ["mechanic", "정비사", "mechanic"], ["driver", "운전사", "driver"]]),
    ...occ("land_sea", [["farmer", "농부", "farmer"], ["fisher", "어부", "fisher", ["fisherman"]], ["sailor", "선원", "sailor"]]),
    ...occ("public", [["soldier", "군인", "soldier"], ["police", "경찰", "police officer", ["cop", "경찰관"]], ["firefighter", "소방관", "firefighter"]]),
    ...occ("arts_media", [["writer", "작가", "writer", ["author"]], ["musician", "음악가", "musician"], ["actor", "배우", "actor"]]),
    ...occ("fantasy", [["mage", "마법사", "mage", ["wizard", "sorcerer", "마도사"]], ["knight", "기사", "knight"], ["alchemist", "연금술사", "alchemist"], ["healer", "치유사", "healer"]]),
    ...occ("exploration", [["explorer", "탐험가", "explorer"], ["adventurer", "모험가", "adventurer"], ["pilot", "조종사", "pilot"]]),
  ],
};

const narrativeRole: Attr = {
  ...base(IDENTITY.narrativeRole, 214, "person_identity_social", "Narrative role", "서사적 역할", "context", "categorical", ["서사적 역할", "역할", "배역", "role"]),
  type: "multi",
  control: "searchable",
  description: {
    en: "The character's role in the story. Does not imply morality or appearance — an antagonist is not necessarily evil.",
    ko: "이야기 속 역할입니다. 도덕성이나 외모를 뜻하지 않으며, 대립자가 반드시 악한 인물인 것은 아닙니다.",
  },
  custom: {},
  prompt: { template: "Narrative role: {value}." },
  options: [
    o("protagonist", "주인공", "Protagonist", "protagonist"),
    o("antagonist", "대립자", "Antagonist", "antagonist", { aliases: ["악역", "villain"] }),
    o("supporting", "조력자", "Supporting character", "supporting character"),
    o("rival", "라이벌", "Rival", "rival"),
    o("guardian", "수호자", "Guardian", "guardian"),
    o("mentor", "스승", "Mentor", "mentor"),
    o("companion", "동료", "Companion", "companion"),
    o("civilian", "일반 시민", "Civilian", "civilian"),
    o("wanderer", "방랑자", "Wanderer", "wanderer"),
    o("leader", "지도자", "Leader", "leader"),
    o("observer", "관찰자", "Observer", "observer"),
  ],
};

const socialStatus: Attr = {
  ...base(IDENTITY.socialStatus, 215, "person_identity_social", "Social status", "사회적 지위", "context", "categorical", ["사회적 지위", "신분", "계층", "status", "class"]),
  type: "single",
  control: "searchable",
  description: {
    en: "Historical or institutional standing, not a universal hierarchy. Independent of occupation; no clothing or props are implied.",
    ko: "역사적·제도적 지위이며 보편적 위계가 아닙니다. 직업과 독립적이고, 의상이나 소품을 뜻하지 않습니다.",
  },
  custom: {},
  prompt: { template: "Social status: {value}." },
  options: [
    o("royalty", "왕족", "Royalty", "royalty"),
    o("nobility", "귀족", "Nobility", "nobility"),
    o("commoner", "평민", "Commoner", "commoner"),
    o("clergy", "성직 계층", "Clergy", "clergy"),
    o("executive", "기업 경영층", "Corporate leadership", "corporate leadership"),
    o("official", "공직자", "Public official", "public official"),
    o("independent", "독립적 신분", "Independent standing", "independent social standing"),
  ],
};

const description: Attr = {
  ...base(IDENTITY.description, 216, "person_identity_other", "Character description", "인물 설명", "context", "freeText", ["인물 설명", "캐릭터 설명", "character description", "bio"]),
  type: "text",
  maxLength: 2000,
  description: {
    en: "Identity or context in your own words. Used exactly as written — not translated or elaborated.",
    ko: "정체성이나 맥락을 자유롭게 적어 주세요. 입력한 그대로 사용되며 번역하거나 덧붙이지 않습니다.",
  },
  placeholder: { en: "e.g. Eldest daughter of a fallen noble family", ko: "예: 몰락한 양반 가문의 장녀" },
  prompt: { template: "Character description: {value}" },
};

export const identityAttributes: Attr[] = [
  entityType,
  species,
  characterOrigin,
  ageGroup,
  age,
  apparentAge,
  gender,
  genderPresentation,
  nationality,
  ethnicBackground,
  culturalBackground,
  historicalPeriod,
  occupation,
  narrativeRole,
  socialStatus,
  description,
];

export const identityRules: NonNullable<CatalogInput["rules"]> = [
  {
    id: "identity-age-group-mismatch",
    kind: "conflict",
    severity: "warning",
    when: [
      { op: "derived", fact: "being.class", anyOf: ["human"] },
      { op: "intervalMismatch", attributeId: IDENTITY.age, groupAttributeId: IDENTITY.ageGroup },
    ],
    involves: [IDENTITY.age, IDENTITY.ageGroup],
    message: { en: "The actual age and the age group do not match.", ko: "실제 연령과 연령대가 맞지 않습니다." },
    guidance: {
      en: "Neither value is changed automatically. Adjust one of them if this is not intended.",
      ko: "어느 값도 자동으로 바꾸지 않습니다. 의도한 설정이 아니라면 둘 중 하나를 고치세요.",
    },
  },
  {
    id: "identity-stateless-with-nationality",
    kind: "conflict",
    severity: "warning",
    when: [
      { op: "anyOf", attributeId: IDENTITY.nationality, optionIds: ["stateless"] },
      { op: "selectedCount", attributeId: IDENTITY.nationality, min: 2 },
    ],
    involves: [IDENTITY.nationality],
    message: { en: "“Stateless” is selected together with a specific country or region.", ko: "‘무국적’과 특정 국가·지역이 함께 선택되었습니다." },
    guidance: {
      en: "Keep both only if this is intended (e.g. a former nationality); otherwise deselect one.",
      ko: "의도한 설정(예: 이전 국적)이라면 그대로 두고, 아니라면 하나를 해제하세요.",
    },
  },
  {
    id: "identity-hybrid-undescribed",
    kind: "dependency",
    severity: "info",
    when: [
      { op: "anyOf", attributeId: IDENTITY.species, optionIds: ["hybrid"] },
      { op: "isUnset", attributeId: IDENTITY.description },
    ],
    involves: [IDENTITY.species, IDENTITY.description],
    message: { en: "“Hybrid species” does not say which species are combined.", ko: "‘혼합 종족’만으로는 어떤 종족의 조합인지 알 수 없습니다." },
    guidance: {
      en: "Describe the combination in the character description, or enter a custom species with a description.",
      ko: "조합 내용을 ‘인물 설명’에 적거나, 설명이 있는 사용자 정의 종족을 입력하세요.",
    },
  },
];

/** Inputs of the shared age/being assessment (spec review §5.1). */
export const identityAgeModel: AgeModel = {
  adultFrom: 18,
  actualAgeAttributeId: IDENTITY.age,
  apparentAgeAttributeId: IDENTITY.apparentAge,
  ageGroupAttributeId: IDENTITY.ageGroup,
  entityTypeAttributeId: IDENTITY.entityType,
  speciesAttributeId: IDENTITY.species,
  entityKinds: {
    human: "human",
    cyborg: "augmented",
    android: "artificial",
    humanoid_robot: "artificial",
    artificial_life: "artificial",
    fantasy_humanoid: "nonhuman",
    alien_humanoid: "nonhuman",
    anthropomorphic: "nonhuman",
    supernatural: "nonhuman",
    mythological: "nonhuman",
  },
  // `hybrid` is intentionally unlisted (may include humans) → unclassified.
  speciesKinds: {
    human: "human",
    elf: "nonhuman",
    dwarf: "nonhuman",
    orc: "nonhuman",
    goblin: "nonhuman",
    giant: "nonhuman",
    dragon_humanoid: "nonhuman",
    beastfolk: "nonhuman",
    fairy: "nonhuman",
    elemental: "nonhuman",
    angel: "nonhuman",
    demon: "nonhuman",
    vampire: "nonhuman",
    undead: "nonhuman",
  },
};
