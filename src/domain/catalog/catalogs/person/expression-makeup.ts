import type { CategoryDefinition, Condition } from "../../schema";
import { SLIDER, degree, fd, noneWithOthers, opposite as oppositeIn, shape, type Attr, type Bands, type L, type O, type Rule } from "./builders";

/**
 * Sprint 2-B.5A — Person › Expression (10), Visual impression & appeal (8), Makeup (16).
 * Specification: docs/catalogs/person/{expression,makeup}.md.
 *
 * - Expression is a temporary state, separate from facial anatomy; an emotion never
 *   sets eyes, mouth or brows, and no personality is inferred. Gaze STATE only
 *   (direction belongs to pose/camera, Sprint 2-B.6).
 * - Impression & appeal are interpretive and never converted into face, skin or body
 *   features. Attractiveness is a qualitative wording, not a score. “Youthful-looking”
 *   / “mature-looking” impressions are NOT age inputs; the age assessment is unchanged
 *   (“youthful-looking” carries the existing ambiguous-age tag, like “young-looking”).
 * - Makeup is independent of natural skin, lips and lashes and is never limited by gender.
 *   “No makeup” hides the other makeup attributes (values kept); “no eyeliner” hides
 *   the eyeliner color.
 */

const P = "person.";

export const expressionCategories: CategoryDefinition[] = (
  [
    ["face", "Expression", "표정"],
    ["impression", "Impression & appeal", "인상 및 매력"],
  ] as const
).map(([id, en, ko], i) => ({ id: `person_expression_${id}`, parentId: "person_expression", order: 1 + i, status: "approved" as const, label: { en, ko }, docPath: "docs/catalogs/person/expression.md" }));

export const EXPRESSION_MAKEUP_DESCRIPTIONS: Record<string, L> = {
  person_expression: fd(
    "Temporary facial expression and interpretive impression — separate from facial anatomy; no personality or age is inferred.",
    "일시적인 표정과 해석적 인상입니다. 얼굴 생김새와 별개이며 성격이나 나이를 추론하지 않습니다.",
  ),
  person_makeup: fd(
    "Makeup, independent of natural skin, lips and lashes; never limited by gender. “No makeup” hides the other makeup values (kept).",
    "메이크업이며 자연 피부·입술·속눈썹과 독립적이고 성별로 제한하지 않습니다. ‘메이크업 없음’이면 다른 메이크업 값은 출력하지 않습니다(보존).",
  ),
};

const notNone = (attributeId: string, noneId = "none"): Condition[] => [{ op: "noneOf", attributeId, optionIds: [noneId], whenUnset: "pass" }];

// ── Expression (10) ──────────────────────────────────────────────────────────
const X = "person_expression_face";
const E = `${P}expression.`;
const expression: Attr[] = [
  shape(`${E}emotion`, 354, X, fd("Emotion", "기본 감정"), ["emotion", "감정", "기분"], fd("Combinable for mixed emotions. Never sets the eyes, mouth or brows; no personality is inferred.", "복합 감정을 위해 함께 고를 수 있습니다. 눈·입·눈썹을 자동으로 정하지 않으며 성격을 추론하지 않습니다."), "Emotion: {value}.", [
    ["neutral", "무표정", "Neutral", "neutral"], ["happy", "기쁨", "Happy", "happy"], ["sad", "슬픔", "Sad", "sad"], ["angry", "분노", "Angry", "angry"],
    ["surprised", "놀람", "Surprised", "surprised"], ["fearful", "두려움", "Fearful", "fearful"], ["disgusted", "혐오", "Disgusted", "disgusted"], ["contemptuous", "경멸", "Contemptuous", "contemptuous"],
    ["embarrassed", "당황", "Embarrassed", "embarrassed", ["부끄러움"]], ["curious", "호기심", "Curious", "curious"], ["bored", "지루함", "Bored", "bored"], ["content", "만족", "Content", "content"],
    ["confused", "혼란", "Confused", "confused"], ["worried", "걱정", "Worried", "worried"], ["determined", "결연함", "Determined", "determined"], ["excited", "들뜸", "Excited", "excited", ["신남"]],
  ], { multi: true, control: "searchable" }),
  degree(`${E}emotion_intensity`, 355, X, fd("Emotion intensity", "감정 강도"), ["intensity", "감정 강도"], SLIDER("Strength of the emotional expression; independent of the emotion itself.", "감정 표현의 세기이며 감정 종류와 독립적입니다."), "Emotional expression intensity: {value}.", [
    ["아주 은은함", "Very subtle", "very subtle"], ["은은함", "Subtle", "subtle"], ["보통", "Moderate", "moderate"], ["강함", "Strong", "strong"], ["아주 강함", "Very intense", "very intense"],
  ]),
  shape(`${E}smile`, 356, X, fd("Smile", "미소 형태"), ["smile", "미소", "웃음"], fd("Degree (faint / gentle / broad), mouth (closed / open) and asymmetry can be combined.", "정도(옅은·부드러운·활짝), 입 모양(다문·벌린), 비대칭을 함께 고를 수 있습니다."), "Smile: {value}.", [
    ["none", "미소 없음", "No smile", "no smile"], ["gentle", "부드러운 미소", "Gentle smile", "gentle smile"], ["faint", "옅은 미소", "Faint smile", "faint smile"],
    ["broad", "활짝 웃는", "Broad smile", "broad smile"], ["closed_mouth", "입을 다문 미소", "Closed-mouth smile", "closed-mouth smile"],
    ["open_mouth", "입을 벌린 미소", "Open-mouth smile", "open-mouth smile"], ["asymmetric", "비대칭 미소", "Asymmetric smile", "asymmetric smile", ["smirk", "썩소"]],
  ], { multi: true, custom: false }),
  shape(`${E}mouth_openness`, 357, X, fd("Mouth openness", "입 벌림 정도"), ["mouth open", "입 벌림"], fd("Temporary; separate from lip anatomy.", "일시적인 상태이며 입술 생김새와 별개입니다."), "Mouth: {value}.", [
    ["closed", "다문", "Closed", "closed"], ["slightly_parted", "살짝 벌린", "Slightly parted", "slightly parted"], ["open", "벌린", "Open", "open"], ["wide_open", "크게 벌린", "Wide open", "wide open"],
  ], { custom: false }),
  shape(`${E}teeth`, 358, X, fd("Teeth visibility", "치아 노출"), ["teeth", "치아", "이"], fd("“No visible teeth” is an explicit choice, distinct from unset.", "‘안 보임’은 미설정과 다른 명시적 선택입니다."), "Teeth: {value}.", [
    ["none", "안 보임", "No visible teeth", "no visible teeth"], ["partial", "일부 보임", "Partially visible", "partially visible teeth"], ["clear", "잘 보임", "Clearly visible", "clearly visible teeth"],
  ], { custom: false }),
  shape(`${E}eye_openness`, 359, X, fd("Eye openness", "눈 개방 정도"), ["eyes open", "눈 뜸", "눈 감음"], fd("Temporary; separate from eye shape and size.", "일시적인 상태이며 눈 모양·크기와 별개입니다."), "Eyes: {value}.", [
    ["closed", "감은", "Closed", "closed"], ["half_closed", "반쯤 감은", "Half-closed", "half-closed"], ["natural", "자연스럽게 뜬", "Naturally open", "naturally open"], ["wide_open", "크게 뜬", "Wide open", "wide open"],
  ], { custom: false }),
  shape(`${E}brow_movement`, 360, X, fd("Eyebrow movement", "눈썹 움직임"), ["brow movement", "눈썹 움직임", "찡그림"], fd("Temporary movement; separate from eyebrow shape and angle.", "일시적인 움직임이며 눈썹 모양·각도와 별개입니다."), "Eyebrow movement: {value}.", [
    ["neutral", "자연스러운", "Neutral", "neutral"], ["raised", "치켜올린", "Raised", "raised"], ["lowered", "내린", "Lowered", "lowered"],
    ["furrowed", "찌푸린", "Furrowed", "furrowed", ["미간 찌푸림"]], ["one_raised", "한쪽만 올린", "One eyebrow raised", "one eyebrow raised"],
  ], { custom: false }),
  shape(`${E}gaze_state`, 361, X, fd("Gaze state", "시선 상태"), ["gaze", "시선", "눈빛"], fd("Quality of the gaze only — the gaze direction is not covered here.", "시선의 상태만 다룹니다. 시선 방향은 포함하지 않습니다."), "Gaze: {value}.", [
    ["focused", "집중한", "Focused", "focused"], ["relaxed", "편안한", "Relaxed", "relaxed"], ["distant", "먼 곳을 보는", "Distant", "distant"],
    ["alert", "경계하는", "Alert", "alert"], ["distracted", "산만한", "Distracted", "distracted"], ["thoughtful", "생각에 잠긴", "Thoughtful", "thoughtful"],
  ]),
  shape(`${E}tears`, 362, X, fd("Tears", "눈물"), ["tears", "눈물", "울음"], fd("“No tears” is an explicit choice, distinct from unset.", "‘없음’은 미설정과 다른 명시적 선택입니다."), "Tears: {value}.", [
    ["none", "없음", "No tears", "no tears"], ["watery", "촉촉한 눈", "Watery eyes", "watery eyes"], ["welling", "고인 눈물", "Tears welling up", "tears welling up"], ["streaming", "흐르는 눈물", "Tears streaming down", "tears streaming down"],
  ], { custom: false }),
  degree(`${E}facial_tension`, 363, X, fd("Facial tension", "얼굴 긴장도"), ["tension", "긴장", "굳은 표정"], SLIDER("How relaxed or tense the expression is.", "표정이 이완·긴장된 정도입니다."), "Facial tension: {value}.", [
    ["아주 편안함", "Very relaxed", "very relaxed"], ["편안함", "Relaxed", "relaxed"], ["보통", "Moderate", "moderate"], ["긴장", "Tense", "tense"], ["아주 긴장", "Highly tense", "highly tense"],
  ]),
];

// ── Visual impression & appeal (8) ───────────────────────────────────────────
const I = "person_expression_impression";
const M = `${P}impression.`;
const DEGREE_FROM = (lo: [string, string, string], hi: [string, string, string]): Bands => [
  lo,
  ["약간", "Slight", `slight`],
  ["보통", "Moderate", "moderate"],
  ["뚜렷함", "Notable", "notable"],
  hi,
];
const impression: Attr[] = [
  shape(`${M}overall`, 364, I, fd("Overall impression", "전체 인상"), ["impression", "인상", "첫인상"], fd("Interpretive; combinable. Never converted into face, skin or body features.", "해석적 속성이며 함께 고를 수 있습니다. 얼굴·피부·신체 특징으로 바꾸지 않습니다."), "Visual impression: {value}.", [
    ["approachable", "친근한", "Approachable", "approachable"], ["gentle", "온화한", "Gentle", "gentle"], ["reserved", "절제된", "Reserved", "reserved"], ["cool", "차가운", "Cool", "cool", ["시크"]],
    ["warm", "따뜻한", "Warm", "warm"], ["strong", "강인한", "Strong", "strong"], ["mysterious", "신비로운", "Mysterious", "mysterious"], ["dignified", "위엄 있는", "Dignified", "dignified"],
    ["relaxed", "여유로운", "Relaxed", "relaxed"], ["refined", "세련된", "Refined", "refined"], ["intimidating", "위압적인", "Intimidating", "intimidating"], ["innocent", "순수해 보이는", "Innocent-looking", "innocent-looking"],
  ], { multi: true }),
  shape(`${M}vibe`, 365, I, fd("Personal vibe", "분위기"), ["vibe", "분위기", "무드"], fd("Interpretive; combinable. Separate from the scene mood.", "해석적 속성이며 함께 고를 수 있습니다. 장면 분위기와 별개입니다."), "Personal vibe: {value}.", [
    ["elegant", "우아한", "Elegant", "elegant"], ["sophisticated", "세련된", "Sophisticated", "sophisticated"], ["luxurious", "고급스러운", "Luxurious", "luxurious"], ["understated", "절제된", "Understated", "understated"],
    ["urban", "도시적인", "Urban", "urban"], ["classic", "클래식한", "Classic", "classic"], ["rustic", "소박한", "Rustic", "rustic"], ["ethereal", "몽환적인", "Ethereal", "ethereal"],
    ["graceful", "기품 있는", "Graceful", "graceful"], ["playful", "장난스러운", "Playful", "playful"], ["rebellious", "반항적인", "Rebellious", "rebellious"],
  ], { multi: true }),
  shape(`${M}attractiveness`, 366, I, fd("Visual appeal", "시각적 매력도"), ["attractiveness", "매력", "미모"], fd("A qualitative wording, not an objective score. Never sexual by itself.", "객관적 점수가 아닌 정성적 표현이며, 그 자체로 성적 표현이 아닙니다."), "Visual appeal: {value}.", [
    ["natural", "자연스러운", "Natural-looking", "natural-looking"], ["subtle", "은은한 매력", "Subtly attractive", "subtly attractive"], ["attractive", "매력적인", "Attractive", "attractive"],
    ["striking", "눈에 띄게 매력적인", "Strikingly attractive", "strikingly attractive"], ["exceptional", "아주 매력적인", "Exceptionally attractive", "exceptionally attractive"],
  ], { custom: false }),
  degree(`${M}cuteness`, 367, I, fd("Cuteness", "귀여움"), ["cute", "귀여운", "귀여움"], SLIDER("Non-sexual cuteness of the appearance.", "비성적인 귀여운 인상의 정도입니다."), "Cute appearance: {value}.", DEGREE_FROM(["거의 없음", "Minimal", "minimal"], ["아주 뚜렷함", "Pronounced", "pronounced"])),
  degree(`${M}elegance`, 368, I, fd("Elegance", "우아함"), ["elegance", "우아함", "기품"], SLIDER("Elegance of the appearance.", "외모의 우아한 정도입니다."), "Elegance: {value}.", [
    ["은은함", "Subtle", "subtle"], ["약간", "Slight", "slightly elegant"], ["보통", "Moderate", "moderately elegant"], ["우아함", "Elegant", "elegant"], ["아주 우아함", "Highly elegant", "highly elegant"],
  ]),
  degree(`${M}charisma`, 369, I, fd("Charisma", "카리스마"), ["charisma", "카리스마", "존재감"], SLIDER("Visual presence.", "시각적 존재감입니다."), "Visual presence: {value}.", [
    ["은은함", "Subtle", "subtle"], ["약간", "Slight", "noticeable"], ["보통", "Moderate", "moderate"], ["강함", "Strong", "strong"], ["압도적", "Commanding", "commanding"],
  ]),
  degree(`${M}androgyny`, 370, I, fd("Androgynous impression", "중성적 인상"), ["androgynous", "중성적", "젠더리스"], SLIDER("Independent of gender and gender presentation values.", "성별·성별 표현 값과 독립적입니다."), "Androgynous appearance: {value}.", DEGREE_FROM(["은은함", "Subtle", "subtle"], ["아주 뚜렷함", "Pronounced", "pronounced"])),
  shape(`${M}maturity`, 371, I, fd("Mature impression", "성숙한 인상"), ["maturity", "성숙", "동안", "노안"], fd("An impression only — not an age input. Actual age, apparent age and the safety age assessment are unaffected.", "인상일 뿐 연령 입력이 아닙니다. 실제·외형 연령과 안전 정책의 연령 판단에 영향을 주지 않습니다."), "Apparent maturity: {value}.", [
    ["youthful", "앳된", "Youthful-looking", "youthful-looking", ["동안"]], ["neutral", "중간", "Neutral", "neutral"], ["mature", "성숙한", "Mature-looking", "mature-looking"], ["highly_mature", "아주 성숙한", "Highly mature-looking", "highly mature-looking"],
  ], { custom: false }),
];
// “Youthful-looking” is ambiguous-age wording, like the lexicon's “young-looking” (conservative; no age is inferred).
{
  const maturity = impression[impression.length - 1] as Extract<Attr, { type: "single" }>;
  maturity.options.find((o) => o.id === "youthful")!.policyTags = ["age.ambiguous_young"];
}

// ── Makeup (16) ──────────────────────────────────────────────────────────────
const K = "person_makeup";
const MK = `${P}makeup.`;
const MAKEUP_GROUPS: Array<[string, string, string]> = [
  ["neutral", "Neutral", "뉴트럴"], ["pink", "Pink", "핑크"], ["red", "Red", "레드"], ["orange", "Orange", "오렌지"],
  ["purple", "Purple", "퍼플"], ["dark", "Dark", "다크"], ["metallic", "Metallic", "메탈릭"], ["creative", "Creative", "크리에이티브"],
];
const MAKEUP_COLORS: O[] = [
  ["ivory", "아이보리", "Ivory", "ivory", [], "#f3ead8", "neutral"], ["beige", "베이지", "Beige", "beige", [], "#d9c0a0", "neutral"], ["nude_beige", "누드 베이지", "Nude beige", "nude beige", [], "#c9a48a", "neutral"],
  ["taupe", "토프", "Taupe", "taupe", [], "#8b7b6e", "neutral"], ["caramel", "캐러멜", "Caramel", "caramel", [], "#b07a45", "neutral"], ["brown", "브라운", "Brown", "brown", [], "#6e4a32", "neutral"],
  ["pale_pink", "연핑크", "Pale pink", "pale pink", [], "#f2c9cf", "pink"], ["soft_pink", "소프트 핑크", "Soft pink", "soft pink", [], "#e9a8b4", "pink"], ["dusty_pink", "더스티 핑크", "Dusty pink", "dusty pink", [], "#c98f97", "pink"],
  ["rose", "로즈", "Rose", "rose", [], "#c56a7a", "pink"], ["dusty_rose", "더스티 로즈", "Dusty rose", "dusty rose", ["말린 장미"], "#b07078", "pink"], ["hot_pink", "핫핑크", "Hot pink", "hot pink", [], "#e0408a", "pink"],
  ["coral_red", "코랄 레드", "Coral red", "coral red", [], "#e05a4e", "red"], ["classic_red", "클래식 레드", "Classic red", "classic red", ["레드 립"], "#c0182a", "red"], ["cherry_red", "체리 레드", "Cherry red", "cherry red", [], "#a8132c", "red"],
  ["crimson", "크림슨", "Crimson", "crimson", [], "#9b1030", "red"], ["brick_red", "벽돌색", "Brick red", "brick red", [], "#9a3b2c", "red"], ["burgundy", "버건디", "Burgundy", "burgundy", [], "#6b1a2c", "red"],
  ["peach", "피치", "Peach", "peach", [], "#f2b08f", "orange"], ["apricot", "살구색", "Apricot", "apricot", [], "#eba06e", "orange"], ["coral", "코랄", "Coral", "coral", [], "#ec7a62", "orange"], ["terracotta", "테라코타", "Terracotta", "terracotta", [], "#c0603e", "orange"],
  ["mauve", "모브", "Mauve", "mauve", [], "#a87a90", "purple"], ["plum", "플럼", "Plum", "plum", [], "#7a3a5e", "purple"], ["lavender", "라벤더", "Lavender", "lavender", [], "#b9a3dc", "purple"], ["violet", "바이올렛", "Violet", "violet", [], "#7d4fb0", "purple"],
  ["charcoal", "차콜", "Charcoal", "charcoal", [], "#3b3b3d", "dark"], ["black", "블랙", "Black", "black", [], "#111111", "dark"], ["deep_brown", "딥 브라운", "Deep brown", "deep brown", [], "#3e2618", "dark"],
  ["gold", "골드", "Gold", "gold", [], "#c9a24a", "metallic"], ["rose_gold", "로즈 골드", "Rose gold", "rose gold", [], "#d8a49a", "metallic"], ["bronze", "브론즈", "Bronze", "bronze", [], "#a0703a", "metallic"],
  ["copper", "코퍼", "Copper", "copper", [], "#b3632f", "metallic"], ["silver", "실버", "Silver", "silver", [], "#c3c7cc", "metallic"],
  ["white", "화이트", "White", "white", [], "#f7f7f5", "creative"], ["blue", "블루", "Blue", "blue", [], "#3c63c4", "creative"], ["teal", "틸", "Teal", "teal", [], "#1f8a8a", "creative"],
  ["green", "그린", "Green", "green", [], "#3e9a4f", "creative"], ["mint", "민트", "Mint", "mint", [], "#a7dcc3", "creative"], ["yellow", "옐로", "Yellow", "yellow", [], "#e8cf3a", "creative"],
];
const madeUp = notNone(`${MK}presence`);
const makeup: Attr[] = [
  shape(`${MK}presence`, 372, K, fd("Makeup", "메이크업 유무"), ["makeup", "화장", "메이크업", "쌩얼"], fd("“No makeup” hides the other makeup attributes (values kept). Unset leaves them usable.", "‘메이크업 없음’이면 다른 메이크업 속성을 출력하지 않습니다(값 보존). 미설정이면 그대로 사용할 수 있습니다."), "Makeup: {value}.", [
    ["none", "메이크업 없음", "No makeup", "no makeup", ["bare face", "민낯"]], ["applied", "메이크업 함", "Makeup applied", "makeup applied"],
  ], { custom: false }),
  shape(`${MK}style`, 373, K, fd("Makeup style", "메이크업 스타일"), ["makeup style", "메이크업 스타일"], fd("Combinable styles; never limited by gender.", "함께 쓸 수 있는 스타일이며 성별로 제한하지 않습니다."), "Makeup style: {value}.", [
    ["natural", "내추럴", "Natural", "natural", ["노메이크업 메이크업"]], ["everyday", "데일리", "Everyday", "everyday"], ["soft_glam", "소프트 글램", "Soft glam", "soft glam"], ["full_glam", "풀 글램", "Full glam", "full glam"],
    ["smoky", "스모키", "Smoky", "smoky"], ["vintage", "빈티지", "Vintage", "vintage"], ["retro", "레트로", "Retro", "retro"], ["gothic", "고딕", "Gothic", "gothic"],
    ["editorial", "에디토리얼", "Editorial", "editorial"], ["theatrical", "무대", "Theatrical", "theatrical"], ["fantasy", "판타지", "Fantasy", "fantasy"], ["avant_garde", "아방가르드", "Avant-garde", "avant-garde"],
    ["korean_style", "한국식", "Korean-style", "Korean-style", ["K-뷰티"]], ["graphic", "그래픽", "Graphic", "graphic"],
  ], { multi: true, control: "searchable", when: madeUp }),
  degree(`${MK}intensity`, 374, K, fd("Makeup intensity", "메이크업 강도"), ["makeup intensity", "화장 강도", "진한 화장"], SLIDER("How heavy the makeup is.", "메이크업이 진한 정도입니다."), "Makeup intensity: {value}.", [
    ["아주 옅음", "Very subtle", "very subtle"], ["옅음", "Subtle", "subtle"], ["보통", "Moderate", "moderate"], ["진함", "Heavy", "heavy"], ["아주 진함", "Very heavy", "very heavy"],
  ], madeUp),
  shape(`${MK}base_coverage`, 375, K, fd("Base coverage", "베이스 커버리지"), ["foundation", "coverage", "커버력", "파운데이션"], fd("Makeup base; separate from natural skin evenness.", "메이크업 베이스이며 자연 피부 균일도와 별개입니다."), "Foundation coverage: {value}.", [
    ["sheer", "아주 얇게", "Sheer", "sheer"], ["light", "가볍게", "Light", "light"], ["medium", "보통", "Medium", "medium"], ["full", "풀 커버", "Full", "full"],
  ], { custom: false, when: madeUp }),
  shape(`${MK}base_finish`, 376, K, fd("Base finish", "베이스 마무리"), ["finish", "피니시", "물광", "매트"], fd("Makeup finish; separate from natural skin sheen.", "메이크업 마무리이며 자연 피부 광택과 별개입니다."), "Foundation finish: {value}.", [
    ["matte", "매트", "Matte", "matte"], ["semi_matte", "세미 매트", "Semi-matte", "semi-matte"], ["satin", "새틴", "Satin", "satin"],
    ["natural", "내추럴", "Natural", "natural"], ["dewy", "듀이", "Dewy", "dewy", ["촉촉"]], ["luminous", "루미너스", "Luminous", "luminous", ["광채"]],
  ], { custom: false, when: madeUp }),
  shape(`${MK}eyeshadow_color`, 377, K, fd("Eyeshadow colors", "아이섀도 색상"), ["eyeshadow", "섀도"], fd("Several colors can be combined.", "여러 색을 함께 고를 수 있습니다."), "Eyeshadow colors: {value}.", MAKEUP_COLORS, { multi: true, control: "color", groups: MAKEUP_GROUPS, when: madeUp }),
  shape(`${MK}eyeshadow_style`, 378, K, fd("Eyeshadow style", "아이섀도 스타일"), ["eyeshadow style", "섀도 스타일", "그라데이션"], fd("Combinable techniques.", "함께 쓸 수 있는 기법입니다."), "Eyeshadow style: {value}.", [
    ["single", "단색", "Single-color", "single-color"], ["gradient", "그라데이션", "Gradient", "gradient"], ["smoky", "스모키", "Smoky", "smoky"], ["shimmer", "시머", "Shimmer", "shimmer"],
    ["glitter", "글리터", "Glitter", "glitter"], ["cut_crease", "컷 크리즈", "Cut crease", "cut crease"], ["graphic", "그래픽", "Graphic", "graphic"],
  ], { multi: true, custom: false, when: madeUp }),
  shape(`${MK}eyeliner_style`, 379, K, fd("Eyeliner style", "아이라인 스타일"), ["eyeliner", "아이라인"], fd("“None” hides the eyeliner color.", "‘없음’이면 아이라인 색상을 출력하지 않습니다."), "Eyeliner: {value}.", [
    ["none", "없음", "None", "none"], ["natural", "자연스러운", "Natural", "natural"], ["tightline", "점막 채우기", "Tightline", "tightline"], ["winged", "윙", "Winged", "winged"],
    ["cat_eye", "캣아이", "Cat-eye", "cat-eye"], ["graphic", "그래픽", "Graphic", "graphic"], ["double_wing", "더블 윙", "Double-wing", "double-wing"],
  ], { custom: false, when: madeUp }),
  shape(`${MK}eyeliner_color`, 380, K, fd("Eyeliner color", "아이라인 색상"), ["eyeliner color", "아이라인 색"], fd("Not output when eyeliner is “none”.", "아이라인 ‘없음’이면 출력하지 않습니다."), "Eyeliner color: {value}.", MAKEUP_COLORS, { control: "color", groups: MAKEUP_GROUPS, when: [...madeUp, ...notNone(`${MK}eyeliner_style`)] }),
  shape(`${MK}mascara`, 381, K, fd("Mascara", "마스카라"), ["mascara", "마스카라"], fd("Makeup only; natural lash length/density are separate.", "메이크업이며 자연 속눈썹 길이·밀도와 별개입니다."), "Mascara: {value}.", [
    ["none", "없음", "None", "none"], ["natural", "자연스러운", "Natural", "natural"], ["lengthening", "롱래시", "Lengthening", "lengthening"], ["volumizing", "볼륨", "Volumizing", "volumizing"], ["dramatic", "드라마틱", "Dramatic", "dramatic"],
  ], { custom: false, when: madeUp }),
  shape(`${MK}false_lashes`, 382, K, fd("False eyelashes", "인조 속눈썹"), ["false lashes", "인조 속눈썹", "속눈썹 연장"], fd("Separate from natural lashes.", "자연 속눈썹과 별개입니다."), "False eyelashes: {value}.", [
    ["none", "없음", "None", "none"], ["natural", "자연스러운", "Natural-looking", "natural-looking"], ["wispy", "가닥가닥", "Wispy", "wispy"], ["full", "풍성한", "Full", "full"], ["dramatic", "드라마틱", "Dramatic", "dramatic"],
  ], { custom: false, when: madeUp }),
  shape(`${MK}blush_color`, 383, K, fd("Blush color", "블러셔 색상"), ["blush", "블러셔", "치크"], fd("Makeup blush; separate from natural blush.", "메이크업 블러셔이며 자연 홍조와 별개입니다."), "Blush color: {value}.", MAKEUP_COLORS, { control: "color", groups: MAKEUP_GROUPS, when: madeUp }),
  shape(`${MK}blush_placement`, 384, K, fd("Blush placement", "블러셔 위치"), ["blush placement", "블러셔 위치"], fd("Combinable placements.", "함께 고를 수 있는 위치입니다."), "Blush placement: {value}.", [
    ["apples", "볼 앞쪽", "Apples of the cheeks", "apples of the cheeks"], ["cheekbones", "광대", "Cheekbones", "cheekbones"], ["temples", "관자놀이", "Temples", "temples"],
    ["across_nose", "코를 가로질러", "Across the nose", "across the nose"], ["under_eyes", "눈 밑", "Under the eyes", "under the eyes", ["애교살 블러셔"]],
  ], { multi: true, custom: false, when: madeUp }),
  shape(`${MK}lip_color`, 385, K, fd("Lip makeup color", "립 메이크업 색상"), ["lipstick", "립스틱", "립 색"], fd("Lip makeup; separate from the natural lip color.", "립 메이크업이며 자연 입술 색과 별개입니다."), "Lip makeup color: {value}.", MAKEUP_COLORS, { control: "color", groups: MAKEUP_GROUPS, when: madeUp }),
  shape(`${MK}lip_finish`, 386, K, fd("Lip finish", "립 마무리"), ["lip finish", "립 제형", "글로스"], fd("Finish of the lip makeup.", "립 메이크업의 마무리입니다."), "Lip finish: {value}.", [
    ["matte", "매트", "Matte", "matte"], ["velvet", "벨벳", "Velvet", "velvet"], ["satin", "새틴", "Satin", "satin"], ["glossy", "글로시", "Glossy", "glossy"], ["sheer", "시어", "Sheer", "sheer"], ["metallic", "메탈릭", "Metallic", "metallic"],
  ], { custom: false, when: madeUp }),
  shape(`${MK}contour`, 387, K, fd("Contour & highlight", "컨투어·하이라이터"), ["contour", "highlighter", "쉐딩", "하이라이터"], fd("Makeup contouring; separate from facial structure.", "메이크업 윤곽이며 얼굴 구조와 별개입니다."), "Contouring and highlighting: {value}.", [
    ["none", "없음", "None", "none"], ["subtle", "은은한", "Subtle", "subtle"], ["moderate", "보통", "Moderate", "moderate"], ["defined", "선명한", "Defined", "defined"], ["dramatic", "드라마틱", "Dramatic", "dramatic"],
  ], { custom: false, when: madeUp }),
];

export const expressionMakeupAttributes: Attr[] = [...expression, ...impression, ...makeup];
const opposite = (attributeId: string, pairs: Array<[string, string]>): Rule[] => oppositeIn(expressionMakeupAttributes, attributeId, pairs);

export const expressionMakeupRules: Rule[] = [
  noneWithOthers(`${E}smile`, "none", "expression-smile-none-with-others", fd("no smile", "미소 없음")),
  // Real contradictions only: a faint/gentle smile is not a broad one; a smile is not both closed- and open-mouthed (faint + gentle is fine).
  ...opposite(`${E}smile`, [["faint", "broad"], ["gentle", "broad"], ["closed_mouth", "open_mouth"]]),
  {
    id: "expression-closed-mouth-vs-visible-teeth",
    kind: "conflict",
    severity: "warning",
    when: [
      { op: "anyOf", attributeId: `${E}mouth_openness`, optionIds: ["closed"] },
      { op: "anyOf", attributeId: `${E}teeth`, optionIds: ["partial", "clear"] },
    ],
    involves: [`${E}mouth_openness`, `${E}teeth`],
    message: { en: "The mouth is closed, but teeth are set to be visible.", ko: "입을 다문 상태인데 치아가 보이도록 설정되었습니다." },
    guidance: { en: "Neither value is changed automatically. Adjust one if this is not intended.", ko: "어느 값도 자동으로 바꾸지 않습니다. 의도한 설정이 아니라면 하나를 고치세요." },
  },
  {
    id: "expression-closed-eyes-vs-gaze",
    kind: "conflict",
    severity: "warning",
    when: [
      { op: "anyOf", attributeId: `${E}eye_openness`, optionIds: ["closed"] },
      { op: "isSet", attributeId: `${E}gaze_state` },
    ],
    involves: [`${E}eye_openness`, `${E}gaze_state`],
    message: { en: "The eyes are closed, but a gaze state is set.", ko: "눈을 감은 상태인데 시선 상태가 설정되었습니다." },
    guidance: { en: "Neither value is changed automatically. Clear the gaze state or open the eyes.", ko: "자동으로 바꾸지 않습니다. 시선 상태를 해제하거나 눈 개방 정도를 바꾸세요." },
  },
];
