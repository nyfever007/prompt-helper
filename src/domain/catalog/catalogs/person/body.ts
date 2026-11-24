import type { CategoryDefinition } from "../../schema";
import { LENGTH, NARROW_BROAD, SIZE, SLIDER, degree, fd, forPerson, shape, type Attr, type Bands, type L } from "./builders";

/**
 * Person › Body (Sprint 2-B.4) — 45 APPROVED attributes in 7 subcategories.
 * Specification: docs/catalogs/person/body.md.
 *
 * Principles (Sprint 2-B.4 approval §10–§11):
 * - Neutral anatomy / character-design description. Selecting a body attribute is
 *   never treated as sexual intent; body, clothing, exposure, pose and appeal stay
 *   independent axes. The existing safety policy and age assessment are unchanged.
 * - Every attribute is an independent Direct axis: the overall build never sets
 *   body parts; height ≠ proportions; frame ≠ muscle mass ≠ definition ≠ body fat;
 *   shoulders ≠ pelvis; waist width ≠ waist curvature; heads-tall ≠ head size.
 * - Nothing is inferred from gender, nationality, ethnicity or age, and nothing
 *   (expression, personality, attractiveness, health, diagnosis) is inferred from
 *   body features.
 * - Relative sizes use the 5-band slider (labels only, never numbers). The
 *   heads-tall ratio is a separate number (2–10) that IS output as written,
 *   without any guarantee that a model reproduces it exactly.
 */

const P = "person.body.";
const sub = (id: string) => `person_body_${id}`;

export const BODY_CATEGORY_DESCRIPTION: L = fd(
  "Neutral body description for anatomy and character design. Never inferred from gender, nationality, ethnicity or age; independent of clothing, exposure, pose and appeal.",
  "해부학·캐릭터 디자인을 위한 중립적인 신체 묘사입니다. 성별·국적·민족·연령에서 추론하지 않으며 의상·노출·자세·매력도와 독립적입니다.",
);

export const bodyCategories: CategoryDefinition[] = (
  [
    ["general", "General body", "전체 신체"],
    ["proportions", "Body proportions", "신체 비율"],
    ["neck_shoulders", "Neck & shoulders", "목·어깨"],
    ["torso", "Torso", "몸통"],
    ["hips", "Hips & pelvis", "엉덩이·골반"],
    ["arms_hands", "Arms & hands", "팔·손"],
    ["legs_feet", "Legs & feet", "다리·발"],
  ] as const
).map(([id, en, ko], i) => ({ id: sub(id), parentId: "person_body", order: 1 + i, status: "approved" as const, label: { en, ko }, docPath: "docs/catalogs/person/body.md" }));

// Band sets (ko, en, text) — relative impressions, not measurements.
const LOW_HIGH_AMOUNT: Bands = [["아주 적음", "Very low", "very low"], ["적음", "Low", "low"], ["보통", "Moderate", "moderate"], ["많음", "High", "high"], ["아주 많음", "Very high", "very high"]];
const SLENDER_THICK: Bands = [["아주 가늚", "Very slender", "very slender"], ["가늚", "Slender", "slender"], ["보통", "Medium", "medium thickness"], ["굵음", "Thick", "thick"], ["아주 굵음", "Very thick", "very thick"]];
const DEVELOPED: Bands = [["거의 없음", "Minimal", "minimal"], ["약간", "Slight", "slightly developed"], ["보통", "Moderate", "moderately developed"], ["발달", "Well-developed", "well-developed"], ["아주 발달", "Highly developed", "highly developed"]];
const DEFINED: Bands = [["거의 없음", "Minimal", "minimal"], ["은은함", "Subtle", "subtle"], ["보통", "Moderate", "moderate"], ["선명함", "Well-defined", "well-defined"], ["아주 선명함", "Highly defined", "highly defined"]];

const NEUTRAL = (en: string, ko: string) => SLIDER(`${en} Neutral description; nothing else is inferred.`, `${ko} 중립적인 묘사이며 다른 값을 추론하지 않습니다.`);

// ── General body (8) ─────────────────────────────────────────────────────────
const G = sub("general");
const general: Attr[] = [
  degree(`${P}height`, 309, G, fd("Height", "신장"), ["height", "키", "신장", "tall", "short"], NEUTRAL("Overall stature.", "전체 키입니다."), "Height: {value}.", [
    ["아주 작음", "Very short", "very short"],
    ["작음", "Short", "short"],
    ["보통", "Average", "average height"],
    ["큼", "Tall", "tall"],
    ["아주 큼", "Very tall", "very tall"],
  ]),
  shape(`${P}build`, 310, G, fd("Body build", "전체 체형"), ["build", "body type", "체형", "몸매"], fd("Overall build only — it never sets any body part.", "전체 체형만 뜻하며 개별 부위를 자동으로 정하지 않습니다."), "Body build: {value}.", [
    ["lean", "마른 근육형", "Lean", "lean"],
    ["slender", "가녀린", "Slender", "slender", ["slim", "날씬한"]],
    ["average", "보통", "Average build", "average"],
    ["athletic", "운동형", "Athletic build", "athletic", ["탄탄한"]],
    ["muscular", "근육질", "Muscular build", "muscular"],
    ["plump", "통통한", "Plump", "plump", ["chubby"]],
    ["heavyset", "체격이 큰", "Heavyset", "heavyset", ["stocky", "건장한"]],
  ]),
  degree(`${P}frame`, 311, G, fd("Skeletal frame", "골격 크기"), ["frame", "bone structure", "골격", "뼈대"], NEUTRAL("Size of the skeletal frame; independent of muscle mass.", "뼈대의 크기이며 근육량과 독립적입니다."), "Skeletal frame: {value}.", SIZE),
  degree(`${P}muscle_mass`, 312, G, fd("Muscle mass", "근육량"), ["muscle mass", "근육량"], NEUTRAL("Amount of muscle; independent of definition and body fat.", "근육의 양이며 선명도·체지방과 독립적입니다."), "Muscle mass: {value}.", LOW_HIGH_AMOUNT),
  degree(`${P}muscle_definition`, 313, G, fd("Muscle definition", "근육 선명도"), ["muscle definition", "근육 선명도", "toned"], NEUTRAL("How visible muscle contours are.", "근육 윤곽이 드러나는 정도입니다."), "Muscle definition: {value}.", DEFINED),
  degree(`${P}body_fat`, 314, G, fd("Body fat", "체지방 정도"), ["body fat", "체지방"], NEUTRAL("Visual amount of body fat — not a health assessment.", "보이는 체지방의 정도이며 건강 평가가 아닙니다."), "Body fat: {value}.", LOW_HIGH_AMOUNT),
  shape(`${P}silhouette`, 315, G, fd("Body silhouette", "신체 실루엣"), ["silhouette", "실루엣", "body shape"], fd("Overall outline; never sets individual body parts.", "전체 윤곽이며 개별 부위 크기를 정하지 않습니다."), "Body silhouette: {value}.", [
    ["rectangular", "직사각형", "Rectangular", "rectangular", ["H형"]],
    ["hourglass", "모래시계형", "Hourglass-shaped", "hourglass-shaped", ["X형"]],
    ["triangular", "삼각형", "Triangular", "triangular", ["A형", "pear"]],
    ["inverted_triangular", "역삼각형", "Inverted triangular", "inverted triangular", ["V형"]],
    ["oval", "타원형", "Oval", "oval", ["O형"]],
  ]),
  shape(`${P}proportions`, 316, G, fd("Body proportions", "신체 비율"), ["proportions", "비율", "chibi", "SD"], fd("Style of proportions; independent of height and of the heads-tall value.", "비율의 스타일이며 신장·등신 값과 독립적입니다."), "Body proportions: {value}.", [
    ["natural", "자연스러운", "Natural", "natural", ["realistic proportions"]],
    ["elongated", "길쭉한", "Elongated", "elongated"],
    ["compact", "압축된", "Compact", "compact"],
    ["exaggerated", "과장된", "Exaggerated", "exaggerated", ["stylized"]],
    ["chibi", "치비", "Chibi", "chibi", ["SD 캐릭터", "super deformed"]],
  ]),
];

// ── Body proportions (5) ─────────────────────────────────────────────────────
const R = sub("proportions");
const headsTall = {
  id: `${P}heads_tall`,
  domain: "person.body",
  status: "approved",
  categoryId: R,
  tier: "detailed",
  order: 318,
  label: { en: "Heads tall", ko: "등신 비율" },
  aliases: ["heads tall", "head-to-body ratio", "등신", "8등신", "두신"],
  description: {
    en: "Height measured in head lengths (2–10, half steps). Output as written; image models do not guarantee exact proportions. Separate from relative head size.",
    ko: "머리 길이로 잰 키입니다(2–10, 0.5 단위). 입력값 그대로 출력되지만 이미지 모델이 정확한 비율을 보장하지 않습니다. 상대적 머리 크기와 별개입니다.",
  },
  appliesWhen: forPerson,
  expression: { role: "direct", kind: "numeric" },
  outputToggle: true,
  type: "number",
  control: "slider",
  semantics: "ratio",
  min: 2,
  max: 10,
  step: 0.5,
  unit: "heads tall",
  prompt: { template: "Head-to-body proportions: {value}." },
} as Attr;
const proportions: Attr[] = [
  degree(`${P}head_size`, 317, R, fd("Head size", "머리 크기"), ["head size", "머리 크기", "얼굴 크기"], NEUTRAL("Head size relative to the body; separate from the heads-tall value.", "몸에 대한 머리의 상대적 크기이며 등신 값과 별개입니다."), "Head size relative to body: {value}.", SIZE),
  headsTall,
  degree(`${P}upper_body_length`, 319, R, fd("Upper body length", "상체 길이"), ["upper body", "상체", "torso length"], NEUTRAL("Length of the upper body.", "상체의 길이입니다."), "Upper body length: {value}.", LENGTH),
  degree(`${P}lower_body_length`, 320, R, fd("Lower body length", "하체 길이"), ["lower body", "하체"], NEUTRAL("Length of the lower body.", "하체의 길이입니다."), "Lower body length: {value}.", LENGTH),
  shape(`${P}upper_lower_ratio`, 321, R, fd("Upper-to-lower body ratio", "상하체 비율"), ["upper lower ratio", "상하체 비율", "다리가 긴"], fd("Which half is longer.", "어느 쪽이 더 긴지입니다."), "Upper-to-lower body proportion: {value}.", [
    ["longer_upper", "상체가 더 긺", "Longer upper body", "longer upper body"],
    ["balanced", "균형", "Balanced", "balanced"],
    ["longer_lower", "하체가 더 긺", "Longer lower body", "longer lower body"],
  ], { custom: false }),
];

// ── Neck & shoulders (5) ─────────────────────────────────────────────────────
const N = sub("neck_shoulders");
const neckShoulders: Attr[] = [
  degree(`${P}neck_length`, 322, N, fd("Neck length", "목 길이"), ["neck length", "목"], NEUTRAL("Length of the neck.", "목의 길이입니다."), "Neck length: {value}.", LENGTH),
  degree(`${P}neck_thickness`, 323, N, fd("Neck thickness", "목 굵기"), ["neck thickness", "목 굵기"], NEUTRAL("Thickness of the neck.", "목의 굵기입니다."), "Neck thickness: {value}.", SLENDER_THICK),
  degree(`${P}shoulder_width`, 324, N, fd("Shoulder width", "어깨 너비"), ["shoulders", "어깨", "어깨 너비"], NEUTRAL("Width of the shoulders; independent of the pelvis.", "어깨의 너비이며 골반과 독립적입니다."), "Shoulder width: {value}.", NARROW_BROAD),
  shape(`${P}shoulder_slope`, 325, N, fd("Shoulder slope", "어깨 기울기"), ["shoulder slope", "처진 어깨", "직각 어깨"], fd("Angle of the shoulder line.", "어깨선의 기울기입니다."), "Shoulder slope: {value}.", [
    ["sloping", "처진", "Sloping", "sloping"],
    ["gently_sloping", "약간 처진", "Gently sloping", "gently sloping"],
    ["nearly_horizontal", "거의 수평", "Nearly horizontal", "nearly horizontal", ["직각 어깨"]],
  ], { custom: false }),
  degree(`${P}collarbones`, 326, N, fd("Collarbone visibility", "쇄골 선명도"), ["collarbones", "쇄골"], NEUTRAL("How visible the collarbones are.", "쇄골이 드러나는 정도입니다."), "Collarbones: {value}.", [
    ["거의 안 보임", "Barely visible", "barely visible"],
    ["약간 보임", "Slightly visible", "slightly visible"],
    ["보임", "Visible", "visible"],
    ["뚜렷함", "Prominent", "prominent"],
    ["아주 뚜렷함", "Highly prominent", "highly prominent"],
  ]),
];

// ── Torso (9) ────────────────────────────────────────────────────────────────
const T = sub("torso");
const torso: Attr[] = [
  degree(`${P}rib_cage_width`, 327, T, fd("Rib cage width", "흉곽 너비"), ["rib cage", "흉곽"], NEUTRAL("Width of the rib cage.", "흉곽의 너비입니다."), "Rib cage width: {value}.", NARROW_BROAD),
  degree(`${P}chest_volume`, 328, T, fd("Chest volume", "가슴 볼륨"), ["chest", "가슴"], NEUTRAL("Neutral anatomical volume of the chest.", "가슴의 중립적인 해부학적 볼륨입니다."), "Chest volume: {value}.", SIZE),
  degree(`${P}pectorals`, 329, T, fd("Pectoral development", "가슴 근육 발달"), ["pectorals", "pecs", "가슴 근육", "대흉근"], NEUTRAL("Development of the pectoral muscles.", "가슴 근육의 발달 정도입니다."), "Pectoral muscles: {value}.", DEVELOPED),
  degree(`${P}waist_width`, 330, T, fd("Waist width", "허리 너비"), ["waist", "허리", "허리 둘레"], NEUTRAL("Width of the waist; independent of waist curvature.", "허리의 너비이며 허리 굴곡과 독립적입니다."), "Waist width: {value}.", NARROW_BROAD),
  degree(`${P}waist_curvature`, 331, T, fd("Waist curvature", "허리 굴곡"), ["waist curve", "허리 라인", "잘록한 허리"], NEUTRAL("How strongly the waist curves in.", "허리가 들어간 굴곡의 정도입니다."), "Waist curvature: {value}.", [
    ["거의 없음", "Minimal", "minimal"],
    ["약간", "Slight", "slight"],
    ["보통", "Moderate", "moderate"],
    ["뚜렷함", "Noticeable", "noticeable"],
    ["아주 뚜렷함", "Pronounced", "pronounced"],
  ]),
  shape(`${P}abdomen`, 332, T, fd("Abdomen shape", "복부 형태"), ["abdomen", "belly", "배", "복부"], fd("Shape of the abdomen — appearance only, not health.", "복부의 형태이며 건강 상태가 아닙니다."), "Abdomen: {value}.", [
    ["flat", "평평한", "Flat", "flat"],
    ["softly_rounded", "부드럽게 둥근", "Softly rounded", "softly rounded"],
    ["protruding", "나온", "Protruding", "protruding"],
  ], { custom: false }),
  degree(`${P}abs_definition`, 333, T, fd("Abdominal definition", "복근 선명도"), ["abs", "six-pack", "복근", "식스팩"], NEUTRAL("How visible the abdominal muscles are.", "복근이 드러나는 정도입니다."), "Abdominal definition: {value}.", DEFINED),
  degree(`${P}back_width`, 334, T, fd("Back width", "등 너비"), ["back width", "등", "광배"], NEUTRAL("Width of the back.", "등의 너비입니다."), "Back width: {value}.", NARROW_BROAD),
  degree(`${P}back_muscles`, 335, T, fd("Back muscle development", "등 근육 발달"), ["back muscles", "등 근육"], NEUTRAL("Development of the back muscles.", "등 근육의 발달 정도입니다."), "Back muscles: {value}.", DEVELOPED),
];

// ── Hips & pelvis (4) ────────────────────────────────────────────────────────
const H = sub("hips");
const hips: Attr[] = [
  degree(`${P}pelvis_width`, 336, H, fd("Pelvis width", "골반 너비"), ["pelvis", "hips", "골반"], NEUTRAL("Width of the pelvis; independent of the shoulders.", "골반의 너비이며 어깨와 독립적입니다."), "Pelvis width: {value}.", NARROW_BROAD),
  degree(`${P}gluteal_volume`, 337, H, fd("Gluteal volume", "엉덩이 볼륨"), ["glutes", "buttocks", "엉덩이"], NEUTRAL("Neutral anatomical volume of the glutes.", "엉덩이의 중립적인 해부학적 볼륨입니다."), "Gluteal volume: {value}.", SIZE),
  shape(`${P}gluteal_shape`, 338, H, fd("Gluteal shape", "엉덩이 형태"), ["glute shape", "엉덩이 형태"], fd("Neutral anatomical shape.", "중립적인 해부학적 형태입니다."), "Gluteal shape: {value}.", [
    ["flat", "평평한", "Flat", "flat"],
    ["rounded", "둥근", "Rounded", "rounded"],
    ["angular", "각진", "Angular", "angular"],
    ["gently_contoured", "완만한 굴곡", "Gently contoured", "gently contoured"],
  ]),
  degree(`${P}waist_hip_contrast`, 339, H, fd("Waist-to-hip contrast", "허리·골반 대비"), ["waist-to-hip ratio", "허리 골반 비율"], NEUTRAL("Contrast between waist and hips; independent of waist width and pelvis width.", "허리와 골반의 대비이며 허리 너비·골반 너비와 독립적입니다."), "Waist-to-hip contrast: {value}.", LOW_HIGH_AMOUNT),
];

// ── Arms & hands (7) ─────────────────────────────────────────────────────────
const A = sub("arms_hands");
const armsHands: Attr[] = [
  degree(`${P}arm_length`, 340, A, fd("Arm length", "팔 길이"), ["arm length", "팔"], NEUTRAL("Length of the arms.", "팔의 길이입니다."), "Arm length: {value}.", LENGTH),
  degree(`${P}upper_arm_thickness`, 341, A, fd("Upper arm thickness", "위팔 굵기"), ["upper arms", "위팔", "팔뚝"], NEUTRAL("Thickness of the upper arms.", "위팔의 굵기입니다."), "Upper arm thickness: {value}.", SLENDER_THICK),
  degree(`${P}forearm_thickness`, 342, A, fd("Forearm thickness", "아래팔 굵기"), ["forearms", "아래팔"], NEUTRAL("Thickness of the forearms.", "아래팔의 굵기입니다."), "Forearm thickness: {value}.", SLENDER_THICK),
  degree(`${P}arm_muscles`, 343, A, fd("Arm muscle development", "팔 근육 발달"), ["arm muscles", "팔 근육", "이두"], NEUTRAL("Development of the arm muscles.", "팔 근육의 발달 정도입니다."), "Arm muscles: {value}.", DEVELOPED),
  degree(`${P}hand_size`, 344, A, fd("Hand size", "손 크기"), ["hands", "손", "손 크기"], NEUTRAL("Size of the hands.", "손의 크기입니다."), "Hand size: {value}.", SIZE),
  degree(`${P}finger_length`, 345, A, fd("Finger length", "손가락 길이"), ["fingers", "손가락"], NEUTRAL("Length of the fingers.", "손가락의 길이입니다."), "Finger length: {value}.", LENGTH),
  degree(`${P}finger_thickness`, 346, A, fd("Finger thickness", "손가락 굵기"), ["finger thickness", "손가락 굵기"], NEUTRAL("Thickness of the fingers.", "손가락의 굵기입니다."), "Finger thickness: {value}.", SLENDER_THICK),
];

// ── Legs & feet (7) ──────────────────────────────────────────────────────────
const E = sub("legs_feet");
const legsFeet: Attr[] = [
  degree(`${P}leg_length`, 347, E, fd("Leg length", "다리 길이"), ["leg length", "다리"], NEUTRAL("Length of the legs.", "다리의 길이입니다."), "Leg length: {value}.", LENGTH),
  degree(`${P}thigh_thickness`, 348, E, fd("Thigh thickness", "허벅지 굵기"), ["thighs", "허벅지"], NEUTRAL("Thickness of the thighs.", "허벅지의 굵기입니다."), "Thigh thickness: {value}.", SLENDER_THICK),
  degree(`${P}calf_thickness`, 349, E, fd("Calf thickness", "종아리 굵기"), ["calves", "종아리"], NEUTRAL("Thickness of the calves.", "종아리의 굵기입니다."), "Calf thickness: {value}.", SLENDER_THICK),
  degree(`${P}leg_muscles`, 350, E, fd("Leg muscle development", "다리 근육 발달"), ["leg muscles", "다리 근육"], NEUTRAL("Development of the leg muscles.", "다리 근육의 발달 정도입니다."), "Leg muscles: {value}.", DEVELOPED),
  degree(`${P}ankle_thickness`, 351, E, fd("Ankle thickness", "발목 굵기"), ["ankles", "발목"], NEUTRAL("Thickness of the ankles.", "발목의 굵기입니다."), "Ankle thickness: {value}.", SLENDER_THICK),
  degree(`${P}foot_size`, 352, E, fd("Foot size", "발 크기"), ["feet", "발", "발 크기"], NEUTRAL("Size of the feet.", "발의 크기입니다."), "Foot size: {value}.", SIZE),
  shape(`${P}leg_alignment`, 353, E, fd("Leg shape", "다리 형태"), ["leg shape", "다리 모양", "O다리", "X다리", "bow legs"], fd("Natural alignment of the legs — appearance only, not a diagnosis.", "다리의 자연스러운 정렬이며 진단이 아닙니다."), "Leg alignment: {value}.", [
    ["straight", "곧은 다리", "Straight legs", "straight"],
    ["naturally_curved", "자연스럽게 휜 다리", "Naturally curved legs", "naturally curved"],
    ["bow_legged", "O자 다리", "Bow-legged", "bow-legged", ["O다리"]],
    ["knock_kneed", "X자 다리", "Knock-kneed", "knock-kneed", ["X다리"]],
  ], { custom: false }),
];

export const bodyAttributes: Attr[] = [...general, ...proportions, ...neckShoulders, ...torso, ...hips, ...armsHands, ...legsFeet];
