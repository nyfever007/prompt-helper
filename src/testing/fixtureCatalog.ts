/**
 * ⚠️ TEST-ONLY CATALOG — NOT A PRODUCT CATALOG.
 *
 * Unapproved sample attributes and presets used to verify the Detailed Editor
 * foundation (controls, categories, presets, policy restrictions). It is used
 * by unit/component tests and by the E2E-only fixture page, which exists ONLY
 * in builds made with PROMPTER_E2E_FIXTURES=1 (see docs/DECISIONS.md ADR-031).
 * Nothing here is approved product content; option names are placeholders.
 */
import { CatalogRegistry, coreCatalog, type CatalogInput, type Condition } from "@/domain";

/** Present in every bundle that includes this file; the isolation check greps for it. */
export const FIXTURE_MARKER = "PROMPTER_E2E_FIXTURE_CATALOG_v1";
export const FIXTURE_CATALOG_ID = "prompter.e2e-fixture";

const forSubjects = (...optionIds: string[]): Condition[] => [{ op: "anyOf", attributeId: "subject.kind", optionIds, whenUnset: "pass" }];
const isMinor: Condition[] = [{ op: "anyOf", attributeId: "x.identity.age_group", optionIds: ["minor"] }];

const OVAL_FACE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#f3efe8"/>' +
      '<ellipse cx="60" cy="62" rx="32" ry="42" fill="#e8c9a8" stroke="#6b5a4a" stroke-width="2"/>' +
      '<text x="60" y="114" font-size="10" text-anchor="middle" fill="#6b5a4a">TEST SAMPLE</text></svg>',
  );

export const buildFixtureCatalog = (): CatalogInput => {
  const c = structuredClone(coreCatalog) as CatalogInput;
  c.id = FIXTURE_CATALOG_ID;
  c.version = "0.3.0";
  c.title = { en: `E2E fixture catalog (${FIXTURE_MARKER})`, ko: `E2E 테스트 전용 카탈로그 (${FIXTURE_MARKER})` };
  c.migrations = [];

  // Some person areas are "approved" HERE ONLY so the UI can be exercised; others stay draft.
  const approvedHere = new Set(["person", "person_identity", "person_face", "person_eyes", "person_hair", "person_expression", "person_body", "person_makeup", "person_wardrobe"]);
  c.categories = (c.categories ?? []).map((cat) => (approvedHere.has(cat.id) ? { ...cat, status: "approved" as const } : cat));

  const base = (id: string, categoryId: string, order: number, en: string, ko: string) => ({
    id,
    domain: id.split(".").slice(0, 2).join("."),
    status: "approved" as const,
    categoryId,
    tier: "detailed" as const,
    order,
    label: { en, ko },
  });

  c.attributes.push(
    {
      ...base("x.identity.age_group", "person_identity", 2000, "Age group (test)", "연령대 (테스트)"),
      type: "single",
      description: { en: "Test-only attribute for policy restrictions.", ko: "정책 제한 검증용 테스트 속성입니다." },
      prompt: { template: "Age group: {value}." },
      options: [
        { id: "adult", label: { en: "Adult", ko: "성인" }, prompt: { text: "adult" }, policyTags: ["age.adult"] },
        { id: "minor", label: { en: "Minor", ko: "미성년" }, prompt: { text: "young" }, policyTags: ["age.minor"] },
      ],
    },
    {
      ...base("x.identity.note", "person_identity", 2010, "Character note", "인물 메모"),
      type: "text",
      control: "text",
      maxLength: 120,
      prompt: { template: "Character note: {value}" },
    },
    {
      ...base("x.face.shape", "person_face", 2100, "Face shape (test)", "얼굴형 (테스트)"),
      type: "single",
      control: "cards",
      aliases: ["face outline", "윤곽"],
      prompt: { template: "Face shape: {value}." },
      options: [
        {
          id: "oval",
          label: { en: "Oval", ko: "계란형" },
          description: { en: "Slightly longer than wide, softly rounded.", ko: "세로가 약간 길고 부드럽게 둥근 윤곽" },
          prompt: { text: "oval face" },
          examples: [{ id: "oval-sample", status: "ready", src: OVAL_FACE_SVG, alt: { en: "Oval face test sample", ko: "계란형 테스트 예시" }, provenance: { source: "hand-drawn SVG test asset" } }],
        },
        { id: "round", label: { en: "Round", ko: "둥근형" }, description: { en: "Similar width and length.", ko: "가로세로가 비슷한 둥근 윤곽" }, prompt: { text: "round face" }, examples: [{ id: "round-sample", status: "placeholder", alt: { en: "Round face (no image yet)", ko: "둥근형 (이미지 준비 중)" } }] },
        { id: "square", label: { en: "Square", ko: "각진형" }, description: { en: "Defined jawline.", ko: "턱선이 뚜렷한 윤곽" }, prompt: { text: "square face" } },
      ],
    },
    {
      ...base("x.eyes.color", "person_eyes", 2200, "Eye color (test)", "눈동자 색 (테스트)"),
      type: "single",
      control: "color",
      prompt: { template: "Eye color: {value}." },
      options: [
        { id: "dark_brown", label: { en: "Dark brown", ko: "짙은 갈색" }, prompt: { text: "dark brown eyes" }, swatch: "#3b2417" },
        { id: "hazel", label: { en: "Hazel", ko: "헤이즐" }, prompt: { text: "hazel eyes" }, swatch: "#8e7618" },
        { id: "blue", label: { en: "Blue", ko: "파란색" }, prompt: { text: "blue eyes" }, swatch: "#3f6fb5" },
        { id: "gray", label: { en: "Gray", ko: "회색" }, prompt: { text: "gray eyes" }, swatch: "#8a8f98" },
      ],
    },
    {
      ...base("x.hair.colors", "person_hair", 2300, "Hair colors (test)", "머리색 (테스트)"),
      type: "multi",
      control: "color",
      prompt: { template: "Hair color: {value}." },
      options: [
        { id: "black", label: { en: "Black", ko: "검은색" }, prompt: { text: "black" }, swatch: "#111111" },
        { id: "brown", label: { en: "Brown", ko: "갈색" }, prompt: { text: "brown" }, swatch: "#5a3a22" },
        { id: "blonde", label: { en: "Blonde", ko: "금발" }, prompt: { text: "blonde" }, swatch: "#d8b46a" },
        { id: "silver", label: { en: "Silver", ko: "은발" }, prompt: { text: "silver" }, swatch: "#c9ccd1" },
      ],
    },
    {
      ...base("x.expression.smile", "person_expression", 2400, "Smile intensity (test)", "미소 정도 (테스트)"),
      type: "number",
      control: "slider",
      semantics: "degree",
      min: 0,
      max: 100,
      step: 5,
      prompt: { template: "Expression: {value}." },
      bands: [
        { upTo: 20, label: { en: "Barely there", ko: "아주 옅게" }, text: "a barely-there smile" },
        { upTo: 50, label: { en: "Gentle", ko: "부드럽게" }, text: "a gentle smile" },
        { upTo: 80, label: { en: "Clear", ko: "또렷하게" }, text: "a warm, clear smile" },
        { upTo: 100, label: { en: "Broad", ko: "활짝" }, text: "a broad, beaming smile" },
      ],
    },
    {
      ...base("x.expression.appeal", "person_expression", 2410, "Visual impression (test)", "시각적 인상 (테스트)"),
      type: "single",
      prompt: { template: "Impression: {value}." },
      options: [
        { id: "confident", label: { en: "Confident", ko: "자신감 있는" }, prompt: { text: "confident" } },
        { id: "elegant", label: { en: "Elegant", ko: "우아한" }, prompt: { text: "elegant" } },
        {
          id: "alluring",
          label: { en: "Alluring", ko: "매혹적인" },
          prompt: { text: "alluring" },
          policyTags: ["appeal.suggestive"],
          restriction: {
            when: isMinor,
            policyRuleId: "minor-sexualization",
            reason: {
              en: "Not available when the age group is a minor: sexualized appeal is never offered for minors.",
              ko: "연령대가 미성년일 때는 사용할 수 없습니다. 미성년자에게는 성적 매력 표현을 제공하지 않습니다.",
            },
          },
        },
      ],
    },
    {
      ...base("x.body.height", "person_body", 2500, "Height (test)", "키 (테스트)"),
      type: "number",
      control: "number",
      semantics: "physical",
      unit: "cm",
      min: 100,
      max: 230,
      step: 1,
      prompt: { template: "Height: about {value}." },
    },
    {
      ...base("x.makeup.finish", "person_makeup", 2600, "Makeup finish (test)", "메이크업 마무리 (테스트)"),
      type: "single",
      control: "dropdown",
      prompt: { template: "Makeup: {value}." },
      options: [
        { id: "natural", label: { en: "Natural", ko: "내추럴" }, prompt: { text: "natural finish" } },
        { id: "matte", label: { en: "Matte", ko: "매트" }, prompt: { text: "matte finish" } },
        { id: "dewy", label: { en: "Dewy", ko: "촉촉한" }, prompt: { text: "dewy finish" } },
      ],
    },
    {
      ...base("x.wardrobe.style", "person_wardrobe", 2700, "Outfit (test)", "의상 (테스트)"),
      type: "single",
      control: "searchable",
      prompt: { template: "Outfit: {value}." },
      options: (
        [
          ["casual", "Casual", "캐주얼", ["daily", "일상복"]],
          ["business_suit", "Business suit", "비즈니스 정장", ["suit", "정장"]],
          ["evening_gown", "Evening gown", "이브닝 드레스", ["gown", "드레스"]],
          ["streetwear", "Streetwear", "스트리트웨어", ["street"]],
          ["hanbok", "Hanbok", "한복", ["korean traditional"]],
          ["sportswear", "Sportswear", "운동복", ["athleisure", "트레이닝"]],
          ["trench_coat", "Trench coat", "트렌치코트", ["coat"]],
          ["knit_sweater", "Knit sweater", "니트 스웨터", ["sweater", "니트"]],
          ["leather_jacket", "Leather jacket", "가죽 재킷", ["biker"]],
          ["denim", "Denim set", "데님", ["jeans", "청바지"]],
        ] as const
      ).map(([id, en, ko, aliases]) => ({ id, label: { en, ko }, aliases: [...aliases], prompt: { text: en.toLowerCase() } })),
    },
    {
      ...base("x.wardrobe.coverage", "person_wardrobe", 2710, "Garment coverage (test)", "의상 노출 범위 (테스트)"),
      type: "single",
      description: { en: "Independent from body shape, fit and impression.", ko: "체형·핏·인상과 독립적인 속성입니다." },
      prompt: { template: "Coverage: {value}." },
      options: [
        { id: "full", label: { en: "Full", ko: "많이 가림" }, prompt: { text: "full coverage" } },
        { id: "moderate", label: { en: "Moderate", ko: "보통" }, prompt: { text: "moderate coverage" } },
        { id: "minimal", label: { en: "Minimal", ko: "적게 가림" }, prompt: { text: "minimal coverage" }, policyTags: ["coverage.minimal"] },
      ],
    },
    {
      ...base("x.camera.subject_position", "shared_camera", 2800, "Subject horizontal position (test)", "피사체 가로 위치 (테스트)"),
      type: "number",
      control: "slider",
      semantics: "ratio",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      prompt: { template: "Subject placed {value} from the left edge." },
    },
    {
      ...base("x.scene.people_count", "shared_scene", 2900, "People in scene (test)", "등장 인원 (테스트)"),
      type: "range",
      control: "range",
      semantics: "count",
      min: 1,
      max: 50,
      step: 1,
      prompt: { template: "Number of people: {value}." },
    },
    {
      ...base("x.grading.tone", "shared_mood", 3000, "Color grading (test)", "컬러 그레이딩 (테스트)"),
      type: "single",
      description: { en: "Image color grading — a different axis from light color temperature.", ko: "이미지 색 보정 — 광원의 색온도와는 다른 축입니다." },
      prompt: { template: "Color grading: {value}." },
      options: [
        { id: "neutral", label: { en: "Neutral", ko: "중립" }, prompt: { text: "neutral" } },
        { id: "cool", label: { en: "Cool", ko: "차가운 톤" }, prompt: { text: "cool, teal-leaning tones" } },
        { id: "warm", label: { en: "Warm", ko: "따뜻한 톤" }, prompt: { text: "warm tones" } },
      ],
    },
    // Must NEVER be exposed in the product UI even though they are approved-looking data in this file:
    { ...base("x.hidden.deferred", "person_face", 4000, "Deferred sample", "보류 샘플"), status: "deferred", type: "text", maxLength: 50, prompt: { template: "{value}" } },
    { ...base("x.hidden.draft", "person_face", 4010, "Draft sample", "초안 샘플"), status: "draft", type: "text", maxLength: 50, prompt: { template: "{value}" } },
    { ...base("x.hidden.precision", "person_face", 4020, "Precision sample", "정밀 샘플"), tier: "precision", type: "text", maxLength: 50, prompt: { template: "{value}" } },
  );

  c.presets = [
    {
      id: "p_soft_portrait",
      version: "1.0.0",
      status: "approved",
      categoryId: "person_expression",
      label: { en: "Soft portrait (test)", ko: "부드러운 인물 사진 (테스트)" },
      description: { en: "Head-and-shoulders, studio softbox, gentle smile, blurred background.", ko: "바스트 샷, 스튜디오 소프트박스, 부드러운 미소, 흐릿한 배경" },
      appliesWhen: forSubjects("person"),
      provenance: { source: "e2e-fixture", note: "test-only" },
      patches: [
        { attributeId: "composition.framing", value: { kind: "single", optionId: "head_and_shoulders" } },
        { attributeId: "scene.background", value: { kind: "single", optionId: "blurred" } },
        { attributeId: "lighting.preset", value: { kind: "single", optionId: "studio_softbox" } },
        { attributeId: "x.expression.smile", value: { kind: "number", value: 40 } },
      ],
    },
    {
      id: "p_golden_scene",
      version: "1.0.0",
      status: "approved",
      categoryId: "shared_lighting",
      label: { en: "Golden scene (test)", ko: "골든 장면 (테스트)" },
      provenance: { source: "e2e-fixture" },
      patches: [
        { attributeId: "mood.tone", value: { kind: "multi", optionIds: ["calm"] } },
        { attributeId: "lighting.preset", value: { kind: "single", optionId: "golden_hour" } },
        { attributeId: "lighting.color_temperature", value: { kind: "single", optionId: "warm" } },
      ],
    },
    {
      id: "p_wide_landscape",
      version: "1.0.0",
      status: "approved",
      categoryId: "shared_camera",
      label: { en: "Wide landscape (test)", ko: "넓은 풍경 (테스트)" },
      provenance: { source: "e2e-fixture" },
      patches: [
        { attributeId: "composition.framing", value: { kind: "single", optionId: "panoramic" } },
        { attributeId: "camera.angle", value: { kind: "single", optionId: "high_angle" } },
      ],
    },
    {
      id: "p_alluring_look",
      version: "1.0.0",
      status: "approved",
      categoryId: "person_expression",
      label: { en: "Alluring look (test)", ko: "매혹적인 분위기 (테스트)" },
      provenance: { source: "e2e-fixture" },
      patches: [
        { attributeId: "x.expression.appeal", value: { kind: "single", optionId: "alluring" } },
        { attributeId: "x.wardrobe.coverage", value: { kind: "single", optionId: "minimal" } },
      ],
    },
  ];
  return c;
};

let cached: CatalogRegistry | undefined;
export const getFixtureRegistry = (): CatalogRegistry => (cached ??= CatalogRegistry.createOrThrow(buildFixtureCatalog()));
