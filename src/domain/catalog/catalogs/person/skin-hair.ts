import type { Condition } from "../../schema";
import { SLIDER, SPARSE_DENSE, degree, fd, noneWithOthers, opposite as oppositeIn, pairsOf, shape, type Attr, type Bands, type L, type O, type Rule } from "./builders";

/**
 * Person › Skin (16), Hair (23), Facial hair (6) — Sprint 2-B.3, APPROVED initial product vocabulary.
 * Specification: docs/catalogs/person/{skin,hair,facial-hair}.md.
 *
 * Principles (Sprint 2-B.3 approval §2–§5):
 * - Every attribute is an independent Direct visual axis; nothing sets another value.
 * - Skin features are never linked to age, gender, nationality, ethnicity or
 *   attractiveness (no wrinkles from age, no tone from nationality); hairstyles and
 *   facial hair are never restricted by gender.
 * - Explicit “none” is a real choice, distinct from unset. Dependent attributes
 *   (placements, bangs details, beard details, most hair attributes when bald) are
 *   kept but not compiled while not applicable, and return when they apply again.
 * - Skin conditions are visual descriptions only (no medical diagnosis); scars are
 *   non-graphic appearance descriptions. Palette swatches are visual references,
 *   not exact output colors.
 */

const P = "person.";
export const SKIN_HAIR_CATEGORY_DESCRIPTIONS: Record<string, L> = {
  person_skin: fd(
    "Skin tone, undertone, surface and marks — visual descriptions only (no medical diagnosis). Never derived from age, gender, nationality or ethnicity.",
    "피부색·언더톤·표면·특징입니다. 시각적 묘사일 뿐 의학적 진단이 아니며, 나이·성별·국적·민족에서 자동으로 정해지지 않습니다.",
  ),
  person_hair: fd(
    "Hair presence, length, color, texture, styling and movement — each independent; hairstyles are never limited by gender.",
    "모발 유무·길이·색상·형태·스타일·움직임이며 서로 독립적입니다. 헤어스타일은 성별과 무관하게 고를 수 있습니다.",
  ),
  person_facial_hair: fd(
    "Facial hair style and its length, density, color, grooming and texture. Never limited by gender or linked to age or personality.",
    "수염 형태와 길이·밀도·색상·정돈 상태·질감입니다. 성별로 제한하지 않고 나이·성격과 연결하지 않습니다.",
  ),
};

const notNone = (attributeId: string, noneId: string): Condition[] => [{ op: "noneOf", attributeId, optionIds: [noneId], whenUnset: "pass" }];
const PRESENCE = `${P}hair.presence`;
/** Applies unless the head is explicitly bald. */
const hasHair: Condition[] = [{ op: "noneOf", attributeId: PRESENCE, optionIds: ["bald"], whenUnset: "pass" }];
/** Applies unless explicitly bald or shaved (styling, length, bangs, movement…). */
const hasStylableHair: Condition[] = [{ op: "noneOf", attributeId: PRESENCE, optionIds: ["bald", "shaved"], whenUnset: "pass" }];

// ── Skin (16) ────────────────────────────────────────────────────────────────
const S = "person_skin";
const SKIN_TONES: O[] = [
  ["very_fair", "매우 밝은", "Very fair", "very fair", ["아주 흰 피부"], "#f6e3d4", "natural"],
  ["fair", "밝은", "Fair", "fair", ["흰 피부"], "#efd3bd", "natural"],
  ["light", "라이트", "Light", "light", [], "#e6c3a6", "natural"],
  ["light_beige", "밝은 베이지", "Light beige", "light beige", [], "#dcb38e", "natural"],
  ["medium_beige", "중간 베이지", "Medium beige", "medium beige", [], "#cfa07a", "natural"],
  ["golden", "골든", "Golden", "golden", [], "#c99a5b", "natural"],
  ["tan", "태닝된", "Tan", "tan", ["tanned", "구릿빛"], "#b98257", "natural"],
  ["olive_brown", "올리브 브라운", "Olive brown", "olive brown", ["olive"], "#9b7a52", "natural"],
  ["light_brown", "밝은 갈색", "Light brown", "light brown", [], "#a36f4a", "natural"],
  ["medium_brown", "중간 갈색", "Medium brown", "medium brown", [], "#87573a", "natural"],
  ["deep_brown", "짙은 갈색", "Deep brown", "deep brown", ["dark brown"], "#5f3b27", "natural"],
  ["very_deep_brown", "매우 짙은 갈색", "Very deep brown", "very deep brown", [], "#3e261a", "natural"],
  ["green", "초록", "Green", "green", [], "#6f9f6a", "fantasy"],
  ["blue", "파랑", "Blue", "blue", [], "#5b7fbf", "fantasy"],
  ["violet", "보라", "Violet", "violet", ["purple"], "#8566b0", "fantasy"],
  ["gray", "회색", "Gray", "gray", ["grey"], "#8f9296", "fantasy"],
  ["red", "빨강", "Red", "red", [], "#b5524a", "fantasy"],
  ["pure_white", "순백색", "Pure white", "pure white", [], "#f7f7f5", "fantasy"],
  ["metallic_gold", "메탈릭 골드", "Metallic gold", "metallic gold", [], "#c8a24a", "fantasy"],
  ["metallic_silver", "메탈릭 실버", "Metallic silver", "metallic silver", [], "#b9bdc3", "fantasy"],
];

const skin: Attr[] = [
  shape(`${P}skin.tone`, 264, S, fd("Skin tone", "피부색"), ["skin color", "skin tone", "피부 톤", "피부 색"], fd("Natural and fantasy tones. Swatches are visual references, not exact output colors. Independent of nationality and ethnicity.", "자연색과 판타지 색입니다. 견본은 시각적 참고이며 실제 결과 색을 보장하지 않습니다. 국적·민족과 독립적입니다."), "Skin tone: {value}.", SKIN_TONES, { control: "color", groups: [["natural", "Natural", "자연색"], ["fantasy", "Fantasy", "판타지"]] }),
  shape(`${P}skin.undertone`, 265, S, fd("Skin undertone", "피부 언더톤"), ["undertone", "언더톤", "웜톤", "쿨톤"], fd("Separate from the skin tone itself.", "피부색과 별개인 속성입니다."), "Skin undertone: {value}.", [
    ["warm", "웜", "Warm", "warm", ["웜톤"]],
    ["cool", "쿨", "Cool", "cool", ["쿨톤"]],
    ["neutral", "뉴트럴", "Neutral", "neutral", ["뉴트럴톤"]],
    ["olive", "올리브", "Olive", "olive"],
  ], { custom: false }),
  shape(`${P}skin.texture`, 266, S, fd("Skin texture", "피부결"), ["skin texture", "피부결"], fd("Surface texture; can coexist with freckles, visible pores or moles.", "피부 표면의 결이며 주근깨·모공·점과 함께 있을 수 있습니다."), "Skin texture: {value}.", [
    ["silky_smooth", "아주 매끄러운", "Silky smooth", "silky smooth"],
    ["smooth", "매끄러운", "Smooth", "smooth"],
    ["natural", "자연스러운", "Natural", "natural", ["natural skin texture"]],
    ["uneven", "고르지 않은", "Uneven", "uneven"],
    ["rough", "거친", "Rough", "rough"],
  ], { custom: false }),
  shape(`${P}skin.sheen`, 267, S, fd("Skin sheen", "피부 광택"), ["skin sheen", "광", "윤기", "glow"], fd("How much the skin reflects light.", "피부가 빛을 반사하는 정도입니다."), "Skin sheen: {value}.", [
    ["matte", "매트", "Matte", "matte"],
    ["low", "은은한 광", "Low sheen", "low", ["subtle sheen"]],
    ["natural", "자연스러운 광", "Natural sheen", "natural"],
    ["dewy", "촉촉한 광", "Dewy", "dewy", ["물광"]],
    ["glossy", "유광", "Glossy", "glossy"],
  ], { custom: false }),
  shape(`${P}skin.hydration`, 268, S, fd("Skin hydration", "피부 수분감"), ["hydration", "수분", "건성", "촉촉함"], fd("Apparent dryness or hydration (appearance only).", "보이는 건조함·촉촉함입니다(외형 묘사)."), "Skin hydration: {value}.", [
    ["very_dry", "매우 건조", "Very dry", "very dry"],
    ["dry", "건조", "Dry", "dry"],
    ["natural", "자연스러운 수분", "Naturally hydrated", "naturally hydrated"],
    ["moisturized", "촉촉한", "Moisturized", "moisturized"],
    ["highly_hydrated", "매우 촉촉한", "Highly hydrated", "highly hydrated"],
  ], { custom: false }),
  degree(`${P}skin.pores`, 269, S, fd("Pore visibility", "모공 가시성"), ["pores", "모공"], SLIDER("How visible the pores are.", "모공이 보이는 정도입니다."), "Pores: {value}.", [
    ["거의 안 보임", "Barely visible", "barely visible"],
    ["약간 보임", "Slightly visible", "slightly visible"],
    ["보통", "Moderately visible", "moderately visible"],
    ["잘 보임", "Clearly visible", "clearly visible"],
    ["매우 잘 보임", "Highly visible", "highly visible"],
  ]),
  degree(`${P}skin.translucency`, 270, S, fd("Skin translucency", "피부 투명감"), ["translucency", "투명감", "투명 피부"], SLIDER("How translucent the skin looks.", "피부가 맑고 투명해 보이는 정도입니다."), "Skin translucency: {value}.", [
    ["아주 낮음", "Very low", "very low"],
    ["낮음", "Low", "low"],
    ["보통", "Medium", "medium"],
    ["높음", "High", "high"],
    ["아주 높음", "Very high", "very high"],
  ]),
  degree(`${P}skin.evenness`, 271, S, fd("Skin tone evenness", "피부 균일도"), ["evenness", "피부톤 균일", "톤 균일"], SLIDER("How uniform the skin tone is.", "피부 톤이 고른 정도입니다."), "Skin tone evenness: {value}.", [
    ["매우 고르지 않음", "Very uneven", "very uneven"],
    ["약간 고르지 않음", "Slightly uneven", "slightly uneven"],
    ["보통", "Moderately even", "moderately even"],
    ["고름", "Even", "even"],
    ["매우 고름", "Highly even", "highly even"],
  ]),
  shape(`${P}skin.freckle_density`, 272, S, fd("Freckles", "주근깨 밀도"), ["freckles", "주근깨"], fd("“None” is an explicit choice, different from not set.", "‘없음’은 미설정과 다른 명시적 선택입니다."), "Freckles: {value}.", [
    ["none", "없음", "None", "none", ["no freckles"]],
    ["very_sparse", "아주 적음", "Very sparse", "very sparse"],
    ["sparse", "적음", "Sparse", "sparse"],
    ["moderate", "보통", "Moderate", "moderate"],
    ["dense", "많음", "Dense", "dense"],
    ["very_dense", "아주 많음", "Very dense", "very dense"],
  ], { custom: false }),
  shape(`${P}skin.freckle_placement`, 273, S, fd("Freckle placement", "주근깨 위치"), ["freckle placement", "주근깨 위치"], fd("Not output when freckles are explicitly “none”. Choosing a placement alone can express freckles.", "주근깨 ‘없음’이면 출력하지 않습니다. 위치만 골라도 주근깨를 표현할 수 있습니다."), "Freckle placement: {value}.", [
    ["nose", "코", "Nose", "nose"],
    ["cheeks", "볼", "Cheeks", "cheeks"],
    ["forehead", "이마", "Forehead", "forehead"],
    ["chin", "턱", "Chin", "chin"],
    ["across_face", "얼굴 전체", "Across the face", "across the face"],
    ["neck", "목", "Neck", "neck"],
    ["shoulders", "어깨", "Shoulders", "shoulders"],
    ["arms", "팔", "Arms", "arms"],
    ["body", "몸 전체", "Body", "body"],
  ], { multi: true, custom: false, when: notNone(`${P}skin.freckle_density`, "none") }),
  shape(`${P}skin.moles`, 274, S, fd("Moles and beauty marks", "점·미인점"), ["moles", "beauty mark", "점", "미인점"], fd("“None” is an explicit choice, different from not set.", "‘없음’은 미설정과 다른 명시적 선택입니다."), "Moles and beauty marks: {value}.", [
    ["none", "없음", "None", "none", ["no moles"]],
    ["single", "하나", "Single", "a single beauty mark"],
    ["a_few", "몇 개", "A few", "a few beauty marks"],
    ["multiple", "여러 개", "Multiple", "multiple beauty marks or visible moles"],
  ], { custom: false }),
  shape(`${P}skin.mole_placement`, 275, S, fd("Mole placement", "점·미인점 위치"), ["mole placement", "점 위치"], fd("Not output when moles are explicitly “none”. Left/right placement is out of scope.", "점 ‘없음’이면 출력하지 않습니다. 좌우 구분은 범위 밖입니다."), "Mole placement: {value}.", [
    ["below_eye", "눈 아래", "Below the eye", "below the eye", ["눈물점"]],
    ["beside_eye", "눈 옆", "Beside the eye", "beside the eye"],
    ["cheek", "볼", "Cheek", "on the cheek"],
    ["nose", "코", "Nose", "on the nose"],
    ["above_lip", "입술 위", "Above the lip", "above the lip"],
    ["below_lip", "입술 아래", "Below the lip", "below the lip"],
    ["chin", "턱", "Chin", "on the chin"],
    ["neck", "목", "Neck", "on the neck"],
  ], { multi: true, custom: false, when: notNone(`${P}skin.moles`, "none") }),
  shape(`${P}skin.wrinkles`, 276, S, fd("Wrinkles", "주름 정도"), ["wrinkles", "주름", "lines"], fd("Never added from age. “None” is an explicit choice.", "나이에서 자동으로 추가되지 않습니다. ‘없음’은 명시적 선택입니다."), "Wrinkles: {value}.", [
    ["none", "없음", "None", "none", ["no wrinkles"]],
    ["fine_lines", "잔주름", "Fine lines", "fine lines"],
    ["subtle", "옅은 주름", "Subtle", "subtle wrinkles"],
    ["moderate", "보통 주름", "Moderate", "moderate wrinkles"],
    ["pronounced", "뚜렷한 주름", "Pronounced", "pronounced wrinkles"],
    ["deep", "깊은 주름", "Deep", "deep wrinkles"],
  ], { custom: false }),
  shape(`${P}skin.wrinkle_placement`, 277, S, fd("Wrinkle placement", "주름 위치"), ["wrinkle placement", "주름 위치", "팔자주름", "눈가 주름"], fd("Not output when wrinkles are explicitly “none”.", "주름 ‘없음’이면 출력하지 않습니다."), "Wrinkle placement: {value}.", [
    ["forehead", "이마", "Forehead", "forehead"],
    ["around_eyes", "눈가", "Around the eyes", "around the eyes", ["crow's feet", "눈가 주름"]],
    ["between_brows", "미간", "Between the eyebrows", "between the eyebrows"],
    ["around_mouth", "입가", "Around the mouth", "around the mouth", ["laugh lines", "팔자주름"]],
    ["neck", "목", "Neck", "neck"],
  ], { multi: true, custom: false, when: notNone(`${P}skin.wrinkles`, "none") }),
  shape(`${P}skin.scars`, 278, S, fd("Scars", "흉터"), ["scars", "흉터"], fd("Non-graphic appearance descriptions. “None” is an explicit choice.", "자극적이지 않은 외형 묘사입니다. ‘없음’은 명시적 선택입니다."), "Scars: {value}.", [
    ["none", "없음", "None", "none", ["no scars"]],
    ["subtle", "옅은 흉터", "Subtle", "subtle"],
    ["linear", "선형 흉터", "Linear", "linear"],
    ["surgical", "수술 흉터", "Surgical", "surgical"],
    ["burn", "화상 흉터", "Burn", "burn"],
    ["acne", "여드름 흉터", "Acne", "acne"],
    ["healed", "아문 흉터", "Healed", "healed"],
  ], { multi: true }),
  shape(`${P}skin.features`, 279, S, fd("Skin features", "피부 특징"), ["skin features", "피부 특징", "홍조", "기미", "백반"], fd("Visual features only — not a medical diagnosis.", "시각적 특징이며 의학적 진단이 아닙니다."), "Skin features: {value}.", [
    ["natural_blush", "자연스러운 홍조", "Natural blush", "natural blush"],
    ["redness", "붉은 기", "Redness", "redness"],
    ["hyperpigmentation", "색소 침착", "Hyperpigmentation", "hyperpigmentation", ["기미", "잡티"]],
    ["vitiligo", "백반 반점", "Vitiligo patches", "vitiligo patches", ["백반증"]],
    ["acne", "여드름", "Acne", "acne"],
    ["blemishes", "잡티", "Blemishes", "blemishes"],
    ["stretch_marks", "튼살", "Stretch marks", "stretch marks"],
    ["birthmarks", "모반", "Birthmarks", "birthmarks", ["반점"]],
    ["visible_veins", "보이는 혈관", "Visible veins", "visible veins"],
    ["dry_patches", "건조한 부위", "Dry patches", "dry patches"],
    ["calluses", "굳은살", "Calluses", "calluses"],
  ], { multi: true }),
];

// ── Hair color palette (shared by primary, secondary and facial hair color) ──
const HAIR_COLOR_GROUPS: Array<[string, string, string]> = [
  ["black", "Black", "검정 계열"],
  ["brown", "Brown", "갈색 계열"],
  ["blonde", "Blonde", "금발 계열"],
  ["red", "Red", "적색 계열"],
  ["gray", "Gray", "회색 계열"],
  ["fantasy", "Fantasy", "판타지 계열"],
];
const HAIR_COLORS: O[] = [
  ["jet_black", "칠흑색", "Jet black", "jet black", ["흑발"], "#0b0b0c", "black"],
  ["soft_black", "부드러운 검정", "Soft black", "soft black", [], "#1f1c1b", "black"],
  ["blue_black", "푸른 검정", "Blue-black", "blue-black", [], "#141a2b", "black"],
  ["dark_brown", "짙은 갈색", "Dark brown", "dark brown", [], "#3a2417", "brown"],
  ["chocolate_brown", "초콜릿 브라운", "Chocolate brown", "chocolate brown", [], "#4a2c1d", "brown"],
  ["chestnut_brown", "밤색", "Chestnut brown", "chestnut brown", ["chestnut"], "#6e3b22", "brown"],
  ["medium_brown", "중간 갈색", "Medium brown", "medium brown", [], "#6b4a32", "brown"],
  ["light_brown", "밝은 갈색", "Light brown", "light brown", [], "#8f6a4a", "brown"],
  ["ash_brown", "애쉬 브라운", "Ash brown", "ash brown", [], "#6f6255", "brown"],
  ["dark_blonde", "다크 블론드", "Dark blonde", "dark blonde", [], "#9c7c52", "blonde"],
  ["golden_blonde", "골든 블론드", "Golden blonde", "golden blonde", ["금발"], "#d1a656", "blonde"],
  ["honey_blonde", "허니 블론드", "Honey blonde", "honey blonde", [], "#c9974f", "blonde"],
  ["ash_blonde", "애쉬 블론드", "Ash blonde", "ash blonde", [], "#b8ab8a", "blonde"],
  ["platinum_blonde", "플래티넘 블론드", "Platinum blonde", "platinum blonde", [], "#e6dfc8", "blonde"],
  ["strawberry_blonde", "스트로베리 블론드", "Strawberry blonde", "strawberry blonde", [], "#d39a6f", "blonde"],
  ["auburn", "적갈색", "Auburn", "auburn", [], "#7f3a22", "red"],
  ["copper", "구리색", "Copper", "copper", [], "#b35f2c", "red"],
  ["ginger", "진저", "Ginger", "ginger", ["빨간 머리"], "#c46a2e", "red"],
  ["deep_red", "짙은 빨강", "Deep red", "deep red", [], "#7d1c1c", "red"],
  ["burgundy", "버건디", "Burgundy", "burgundy", ["와인색"], "#5e1a2b", "red"],
  ["dark_gray", "짙은 회색", "Dark gray", "dark gray", ["dark grey"], "#4a4a4c", "gray"],
  ["gray", "회색", "Gray", "gray", ["grey", "흰머리"], "#8a8a8a", "gray"],
  ["silver_gray", "은회색", "Silver gray", "silver gray", [], "#a9adb2", "gray"],
  ["silver", "은색", "Silver", "silver", [], "#c8ccd1", "gray"],
  ["white", "흰색", "White", "white", [], "#eeeeec", "gray"],
  ["salt_and_pepper", "희끗희끗한", "Salt-and-pepper", "salt-and-pepper", [], "#7d7d7a", "gray"],
  ["pink", "핑크", "Pink", "pink", [], "#e889b0", "fantasy"],
  ["pastel_pink", "파스텔 핑크", "Pastel pink", "pastel pink", [], "#f4c2d3", "fantasy"],
  ["rose_gold", "로즈 골드", "Rose gold", "rose gold", [], "#d8a49a", "fantasy"],
  ["purple", "보라", "Purple", "purple", [], "#7d3fa0", "fantasy"],
  ["lavender", "라벤더", "Lavender", "lavender", [], "#b9a3dc", "fantasy"],
  ["blue", "파랑", "Blue", "blue", [], "#3c63c4", "fantasy"],
  ["pastel_blue", "파스텔 블루", "Pastel blue", "pastel blue", [], "#a9c8ee", "fantasy"],
  ["turquoise", "청록", "Turquoise", "turquoise", [], "#2fb3b0", "fantasy"],
  ["green", "초록", "Green", "green", [], "#3e9a4f", "fantasy"],
  ["mint_green", "민트", "Mint green", "mint green", [], "#a7dcc3", "fantasy"],
  ["orange", "주황", "Orange", "orange", [], "#e07a2c", "fantasy"],
  ["yellow", "노랑", "Yellow", "yellow", [], "#e8cf3a", "fantasy"],
];

// ── Hairstyles (display groups only; groups are never output) ────────────────
const HAIRSTYLE_GROUPS: Array<[string, string, string]> = [
  ["short", "Short styles", "짧은 스타일"],
  ["bob", "Bobs", "보브·단발"],
  ["layered", "Mid-length & layered", "중장발·레이어"],
  ["down", "Worn down", "풀어 내린 스타일"],
  ["volume", "Volume & shaped", "볼륨·성형 스타일"],
  ["sides", "Undercuts & fades", "옆머리 스타일"],
  ["ponytail", "Ponytails", "포니테일"],
  ["bun", "Buns & updos", "번·올림머리"],
  ["half_up", "Half-up", "반묶음"],
  ["braids", "Braids", "땋은 머리"],
  ["other", "Other", "기타"],
];
const hs = (group: string, items: Array<[string, string, string, string[]?]>): O[] =>
  items.map(([id, ko, text, aliases]) => [id, ko, text.charAt(0).toUpperCase() + text.slice(1), text, aliases, undefined, group]);
const HAIRSTYLES: O[] = [
  ...hs("short", [["buzz_cut", "버즈컷", "buzz cut", ["삭발 스타일"]], ["crew_cut", "크루컷", "crew cut"], ["pixie_cut", "픽시컷", "pixie cut", ["숏컷"]], ["cropped", "크롭컷", "cropped haircut"], ["caesar_cut", "시저컷", "Caesar cut"], ["french_crop", "프렌치 크롭", "French crop"], ["short_textured", "짧은 텍스처 컷", "short textured haircut"], ["spiky", "삐죽 세운 머리", "spiky hair"]]),
  ...hs("bob", [["classic_bob", "클래식 보브", "classic bob", ["단발"]], ["blunt_bob", "일자 보브", "blunt bob", ["일자 단발"]], ["layered_bob", "레이어드 보브", "layered bob"], ["asymmetrical_bob", "비대칭 보브", "asymmetrical bob"], ["inverted_bob", "인버티드 보브", "inverted bob"], ["wavy_bob", "웨이브 보브", "wavy bob", ["단발 펌"]], ["long_bob", "롱 보브", "long bob", ["lob", "중단발"]], ["pageboy", "페이지보이", "pageboy haircut"]]),
  ...hs("layered", [["layered_cut", "레이어드 컷", "layered haircut"], ["shag", "섀그 컷", "shag haircut"], ["wolf_cut", "울프컷", "wolf cut"], ["butterfly_cut", "버터플라이 컷", "butterfly cut"], ["feathered_cut", "페더 컷", "feathered haircut"], ["blunt_cut", "일자 컷", "blunt cut"], ["step_cut", "스텝 컷", "step cut"], ["hime_cut", "히메컷", "hime cut"], ["jellyfish_cut", "해파리컷", "jellyfish haircut"]]),
  ...hs("down", [["worn_down", "풀어 내린 머리", "hair worn down", ["생머리"]], ["swept_back", "뒤로 넘긴 머리", "swept-back hair"], ["slicked_back", "올백", "slicked-back hair", ["올백머리"]], ["side_swept", "옆으로 넘긴 머리", "side-swept hair"], ["tucked_behind_ears", "귀 뒤로 넘긴 머리", "hair tucked behind the ears"]]),
  ...hs("volume", [["pompadour", "퐁파두르", "pompadour"], ["quiff", "퀴프", "quiff"], ["bouffant", "부팡", "bouffant"], ["afro", "아프로", "afro"], ["flat_top", "플랫톱", "flat top"], ["mohawk", "모히칸", "mohawk", ["모호크"]], ["faux_hawk", "포호크", "faux hawk"]]),
  ...hs("sides", [["undercut", "투블럭", "undercut", ["언더컷"]], ["disconnected_undercut", "디스커넥티드 언더컷", "disconnected undercut"], ["side_shaved", "사이드 쉐이브", "side-shaved hairstyle"], ["fade", "페이드컷", "fade haircut"], ["taper", "테이퍼컷", "taper haircut"]]),
  ...hs("ponytail", [["ponytail", "포니테일", "ponytail", ["묶은 머리"]], ["twin_ponytails", "트윈 포니테일", "twin ponytails", ["양갈래"]], ["bubble_ponytail", "버블 포니테일", "bubble ponytail"], ["braided_ponytail", "땋은 포니테일", "braided ponytail"], ["side_ponytail", "사이드 포니테일", "side ponytail"]]),
  ...hs("bun", [["bun", "번", "hair bun", ["똥머리", "올림머리"]], ["messy_bun", "메시 번", "messy bun"], ["sleek_bun", "슬릭 번", "sleek bun"], ["top_knot", "탑 노트", "top knot"], ["double_buns", "더블 번", "double buns"], ["space_buns", "스페이스 번", "space buns"], ["french_twist", "프렌치 트위스트", "French twist"], ["chignon", "시뇽", "chignon"], ["twisted_updo", "트위스트 업도", "twisted updo"]]),
  ...hs("half_up", [["half_up", "반묶음", "half-up hairstyle"], ["half_up_ponytail", "반묶음 포니테일", "half-up ponytail"], ["half_up_bun", "반묶음 번", "half-up bun", ["반묶음 똥머리"]], ["half_up_braid", "반묶음 땋은 머리", "half-up braid"]]),
  ...hs("braids", [["single_braid", "외가닥 땋기", "single braid"], ["twin_braids", "양갈래 땋기", "twin braids"], ["french_braid", "프렌치 브레이드", "French braid"], ["dutch_braid", "더치 브레이드", "Dutch braid"], ["fishtail_braid", "피시테일 브레이드", "fishtail braid"], ["crown_braid", "크라운 브레이드", "crown braid"], ["waterfall_braid", "워터폴 브레이드", "waterfall braid"], ["box_braids", "박스 브레이드", "box braids"], ["cornrows", "콘로우", "cornrows"]]),
  ...hs("other", [["locs", "록스", "locs", ["dreadlocks", "드레드"]], ["finger_waves", "핑거 웨이브", "finger waves"], ["pin_curls", "핀 컬", "pin curls"], ["finger_coils", "핑거 코일", "finger coils"], ["traditional_updo", "전통 올림머리", "traditional updo", ["쪽머리"]]]),
];
const UNTIED_STYLES = HAIRSTYLES.filter(([, , , , , , g]) => ["short", "bob", "layered", "down", "volume", "sides"].includes(g!)).map(([id]) => id).concat(["finger_waves", "pin_curls", "finger_coils"]);
const SHORT_STYLES = HAIRSTYLES.filter(([, , , , , , g]) => g === "short").map(([id]) => id);
const BOB_STYLES = HAIRSTYLES.filter(([, , , , , , g]) => g === "bob").map(([id]) => id);

// ── Hair (23) ────────────────────────────────────────────────────────────────
const H = "person_hair";
const hair: Attr[] = [
  shape(PRESENCE, 280, H, fd("Hair presence", "모발 유무"), ["bald", "shaved", "대머리", "삭발", "탈모"], fd("Bald hides every other hair attribute; shaved hides styling but keeps color, texture, thickness, density, shine, hairline and condition; partial hair loss hides nothing. Hidden values are kept.", "대머리는 다른 헤어 속성을 모두, 삭발은 스타일 관련 속성을 숨깁니다(색상·형태·굵기·밀도·광택·헤어라인·상태는 유지). 부분 탈모는 숨기지 않습니다. 숨겨진 값은 보존됩니다."), "Hair presence: {value}.", [
    ["present", "모발 있음", "Hair present", "hair present"],
    ["shaved", "삭발", "Shaved head", "shaved head", ["buzzed head", "까까머리"]],
    ["bald", "대머리", "Bald head", "bald head", ["민머리"]],
    ["partial_loss", "부분 탈모", "Partial hair loss", "partial hair loss", ["thinning hair", "탈모"]],
  ], { custom: false }),
  shape(`${P}hair.length`, 281, H, fd("Hair length", "헤어 길이"), ["hair length", "머리 길이", "기장"], fd("Independent of the hairstyle.", "헤어스타일과 독립적입니다."), "Hair length: {value}.", [
    ["extremely_short", "아주 짧은", "Extremely short", "extremely short"],
    ["ear", "귀 길이", "Ear-length", "ear-length"],
    ["chin", "턱 길이", "Chin-length", "chin-length", ["단발"]],
    ["neck", "목 길이", "Neck-length", "neck-length"],
    ["shoulder", "어깨 길이", "Shoulder-length", "shoulder-length", ["중단발"]],
    ["chest", "가슴 길이", "Chest-length", "chest-length", ["장발"]],
    ["mid_back", "등 중간 길이", "Mid-back-length", "mid-back-length"],
    ["waist", "허리 길이", "Waist-length", "waist-length"],
    ["hip", "엉덩이 길이", "Hip-length", "hip-length"],
    ["knee", "무릎 길이", "Knee-length", "knee-length"],
    ["floor", "바닥 길이", "Floor-length", "floor-length"],
  ], { custom: false, when: hasStylableHair }),
  shape(`${P}hair.primary_color`, 282, H, fd("Primary hair color", "기본 헤어 색상"), ["hair color", "머리색", "염색"], fd("Swatches are visual references. Managed independently from the secondary color and the color pattern.", "견본은 시각적 참고입니다. 보조 색상·컬러 패턴과 독립적으로 관리합니다."), "Primary hair color: {value}.", HAIR_COLORS, { control: "color", groups: HAIR_COLOR_GROUPS, when: hasHair }),
  shape(`${P}hair.secondary_color`, 283, H, fd("Secondary hair color", "보조 헤어 색상"), ["secondary hair color", "투톤 색", "포인트 컬러"], fd("Same palette as the primary color; chosen independently.", "기본 색상과 같은 팔레트에서 독립적으로 고릅니다."), "Secondary hair color: {value}.", HAIR_COLORS, { control: "color", groups: HAIR_COLOR_GROUPS, when: hasHair }),
  shape(`${P}hair.color_pattern`, 284, H, fd("Hair color pattern", "컬러 패턴"), ["color pattern", "염색 패턴", "하이라이트", "옴브레"], fd("How colors are distributed; independent of the colors themselves.", "색이 배치되는 방식이며 색상 자체와 독립적입니다."), "Hair color pattern: {value}.", [
    ["solid", "단색", "Solid color", "solid color"],
    ["two_tone", "투톤", "Two-tone", "two-tone"],
    ["ombre", "옴브레", "Ombré", "ombré", ["ombre", "그라데이션"]],
    ["balayage", "발레아쥬", "Balayage", "balayage"],
    ["highlights", "하이라이트", "Highlights", "highlights"],
    ["lowlights", "로우라이트", "Lowlights", "lowlights"],
    ["contrasting_roots", "대비되는 뿌리", "Contrasting roots", "contrasting roots", ["뿌리 염색"]],
    ["dip_dyed", "끝부분 염색", "Dip-dyed ends", "dip-dyed ends"],
    ["split_dyed", "좌우 반반 염색", "Split-dyed", "split-dyed hair"],
  ], { multi: true, when: hasHair }),
  shape(`${P}hair.texture`, 285, H, fd("Hair texture", "모발 형태"), ["hair texture", "곱슬", "생머리", "웨이브"], fd("Natural strand pattern; independent of the hairstyle.", "모발 본래의 형태이며 헤어스타일과 독립적입니다."), "Hair texture: {value}.", [
    ["straight", "직모", "Straight", "straight", ["생머리"]],
    ["wavy", "웨이브", "Wavy", "wavy"],
    ["curly", "곱슬", "Curly", "curly"],
    ["tightly_curly", "강한 곱슬", "Tightly curly", "tightly curly"],
    ["coily", "코일리", "Coily", "coily", ["4c"]],
  ], { when: hasHair }),
  degree(`${P}hair.thickness`, 286, H, fd("Strand thickness", "모발 굵기"), ["strand thickness", "모발 굵기", "가는 머리", "굵은 머리"], SLIDER("Thickness of individual strands (not density).", "한 가닥의 굵기입니다(밀도와 다름)."), "Hair strand thickness: {value}.", [
    ["아주 가늚", "Very fine", "very fine"],
    ["가늚", "Fine", "fine"],
    ["보통", "Medium", "medium"],
    ["굵음", "Coarse", "coarse"],
    ["아주 굵음", "Very coarse", "very coarse"],
  ], hasHair),
  degree(`${P}hair.density`, 287, H, fd("Hair density", "모발 밀도"), ["hair density", "숱", "머리숱"], SLIDER("How many strands (not volume).", "모발의 숱입니다(볼륨과 다름)."), "Hair density: {value}.", SPARSE_DENSE, hasHair),
  degree(`${P}hair.volume`, 288, H, fd("Hair volume", "헤어 볼륨"), ["hair volume", "볼륨", "뿌리 볼륨"], SLIDER("Overall lift and fullness of the style.", "스타일의 전체 부피감입니다."), "Hair volume: {value}.", [
    ["아주 낮음", "Very low", "very low"],
    ["낮음", "Low", "low"],
    ["보통", "Medium", "medium"],
    ["높음", "High", "high"],
    ["아주 높음", "Very high", "very high"],
  ], hasStylableHair),
  degree(`${P}hair.shine`, 289, H, fd("Hair shine", "모발 광택"), ["hair shine", "윤기", "머릿결 광"], SLIDER("How glossy the hair looks.", "모발이 윤기 있어 보이는 정도입니다."), "Hair shine: {value}.", [
    ["매트", "Matte", "matte"],
    ["약한 윤기", "Low shine", "low shine"],
    ["자연스러운 윤기", "Natural shine", "natural shine"],
    ["윤기", "Glossy", "glossy"],
    ["아주 윤기", "Highly glossy", "highly glossy"],
  ], hasHair),
  shape(`${P}hair.condition`, 290, H, fd("Hair condition", "모발 상태"), ["hair condition", "부스스", "젖은 머리", "정돈"], fd("Grooming and wetness; independent of movement.", "정돈 상태와 젖은 정도이며 움직임과 독립적입니다."), "Hair condition: {value}.", [
    ["groomed", "단정한", "Neatly groomed", "neatly groomed"],
    ["tousled", "자연스럽게 흐트러진", "Naturally tousled", "naturally tousled"],
    ["messy", "헝클어진", "Messy", "messy"],
    ["unkempt", "손질 안 된", "Unkempt", "unkempt"],
    ["wet", "젖은", "Wet", "wet"],
    ["damp", "촉촉하게 젖은", "Damp", "damp"],
    ["dry_looking", "건조해 보이는", "Dry-looking", "dry-looking"],
    ["frizzy", "부스스한", "Frizzy", "frizzy"],
  ], { multi: true, when: hasHair }),
  degree(`${P}hair.curl_size`, 291, H, fd("Curl size", "컬 크기"), ["curl size", "컬 크기", "펌"], SLIDER("Diameter of curls or waves.", "컬·웨이브의 크기입니다."), "Curl size: {value}.", [
    ["아주 작음", "Very small", "very small"],
    ["작음", "Small", "small"],
    ["보통", "Medium", "medium-sized"],
    ["큼", "Large", "large"],
    ["아주 큼", "Very large", "very large"],
  ], hasStylableHair),
  degree(`${P}hair.curl_tightness`, 292, H, fd("Curl tightness", "컬 강도"), ["curl tightness", "컬 강도"], SLIDER("How tightly the curls are wound.", "컬이 감긴 강도입니다."), "Curl tightness: {value}.", [
    ["아주 느슨", "Very loose", "very loose"],
    ["느슨", "Loose", "loose"],
    ["보통", "Medium", "medium"],
    ["촘촘", "Tight", "tight"],
    ["아주 촘촘", "Very tight", "very tight"],
  ], hasStylableHair),
  shape(`${P}hair.part`, 293, H, fd("Hair part", "가르마"), ["hair part", "가르마", "parting"], fd("Left/right are from the subject's perspective.", "좌우는 인물 기준입니다."), "Hair part: {value}.", [
    ["none", "가르마 없음", "No visible part", "no visible part"],
    ["center", "가운데 가르마", "Center part", "center part", ["5대5"]],
    ["left", "왼쪽 가르마", "Left side part", "left side part"],
    ["right", "오른쪽 가르마", "Right side part", "right side part"],
    ["deep_left", "깊은 왼쪽 가르마", "Deep left side part", "deep left side part"],
    ["deep_right", "깊은 오른쪽 가르마", "Deep right side part", "deep right side part"],
  ], { custom: false, when: hasStylableHair }),
  shape(`${P}hair.hairline`, 294, H, fd("Hairline", "헤어라인"), ["hairline", "헤어라인", "이마 라인"], fd("Shape of the front hairline.", "앞머리선의 모양입니다."), "Hairline: {value}.", [
    ["rounded", "둥근", "Rounded", "rounded"],
    ["straight", "일자", "Straight", "straight"],
    ["m_shaped", "M자", "M-shaped", "M-shaped", ["M자 탈모"]],
    ["v_shaped", "V자 (뾰족한)", "V-shaped", "V-shaped", ["widow's peak"]],
    ["irregular", "불규칙한", "Irregular", "irregular"],
  ], { when: hasHair }),
  shape(`${P}hair.bangs_style`, 295, H, fd("Bangs", "앞머리 형태"), ["bangs", "fringe", "앞머리"], fd("“No bangs” hides bangs length and density (their values are kept).", "‘앞머리 없음’이면 앞머리 길이·밀도를 출력하지 않습니다(값은 보존)."), "Bangs: {value}.", [
    ["none", "앞머리 없음", "No bangs", "none", ["no bangs"]],
    ["blunt", "일자 앞머리", "Blunt bangs", "blunt"],
    ["wispy", "시스루 앞머리", "Wispy bangs", "wispy", ["시스루뱅"]],
    ["curtain", "커튼 앞머리", "Curtain bangs", "curtain", ["커튼뱅"]],
    ["side_swept", "옆으로 넘긴 앞머리", "Side-swept bangs", "side-swept"],
    ["choppy", "층진 앞머리", "Choppy bangs", "choppy"],
    ["asymmetric", "비대칭 앞머리", "Asymmetric bangs", "asymmetric"],
    ["micro", "아주 짧은 앞머리", "Micro bangs", "micro", ["baby bangs"]],
    ["feathered", "페더 앞머리", "Feathered bangs", "feathered"],
  ], { when: hasStylableHair }),
  shape(`${P}hair.bangs_length`, 296, H, fd("Bangs length", "앞머리 길이"), ["bangs length", "앞머리 길이"], fd("Not output when “no bangs” is chosen; usable when the bangs style is not set.", "‘앞머리 없음’이면 출력하지 않으며, 형태가 미설정이면 사용할 수 있습니다."), "Bangs length: {value}.", [
    ["very_short", "아주 짧은", "Very short", "very short"],
    ["above_brows", "눈썹 위", "Above the eyebrows", "above the eyebrows"],
    ["brow", "눈썹 길이", "Eyebrow-length", "eyebrow-length"],
    ["eye", "눈 길이", "Eye-length", "eye-length"],
    ["long", "긴", "Long", "long"],
  ], { custom: false, when: [...hasStylableHair, ...notNone(`${P}hair.bangs_style`, "none")] }),
  degree(`${P}hair.bangs_density`, 297, H, fd("Bangs density", "앞머리 밀도"), ["bangs density", "앞머리 숱"], SLIDER("Not output when “no bangs” is chosen.", "‘앞머리 없음’이면 출력하지 않습니다."), "Bangs density: {value}.", SPARSE_DENSE, [...hasStylableHair, ...notNone(`${P}hair.bangs_style`, "none")]),
  shape(`${P}hair.style`, 298, H, fd("Hairstyle", "헤어스타일"), ["hairstyle", "헤어스타일", "머리 모양"], fd("Choosing a style never sets length, tie position or other values. All styles are available regardless of gender.", "스타일을 골라도 길이·묶는 위치 등은 자동으로 정해지지 않습니다. 모든 스타일은 성별과 무관합니다."), "Hairstyle: {value}.", HAIRSTYLES, { control: "searchable", groups: HAIRSTYLE_GROUPS, when: hasStylableHair }),
  shape(`${P}hair.tie_position`, 299, H, fd("Tie position", "묶는 위치"), ["tie position", "묶는 위치", "번 위치"], fd("Height and side of a ponytail, bun or braid; independent of the hairstyle.", "포니테일·번·땋은 머리의 높이와 방향이며 헤어스타일과 독립적입니다."), "Hair tie position: {value}.", [
    ["low", "낮게", "Low", "low"],
    ["mid", "중간 높이", "Mid-height", "mid-height"],
    ["high", "높게", "High", "high"],
    ["left", "왼쪽", "Left side", "on the left side"],
    ["right", "오른쪽", "Right side", "on the right side"],
  ], { multi: true, custom: false, when: hasStylableHair }),
  shape(`${P}hair.layering`, 300, H, fd("Hair layering", "레이어 정도"), ["layering", "레이어", "층"], fd("“None” is an explicit choice.", "‘없음’은 명시적 선택입니다."), "Hair layering: {value}.", [
    ["none", "없음", "None", "none"],
    ["subtle", "아주 약하게", "Subtle", "subtle"],
    ["light", "약하게", "Light", "light"],
    ["moderate", "보통", "Moderate", "moderate"],
    ["heavy", "많이", "Heavy", "heavy"],
  ], { custom: false, when: hasStylableHair }),
  shape(`${P}hair.flyaways`, 301, H, fd("Flyaway hairs", "잔머리 정도"), ["flyaways", "잔머리", "baby hairs"], fd("“None” is an explicit choice.", "‘없음’은 명시적 선택입니다."), "Flyaway hairs: {value}.", [
    ["none", "없음", "None", "none"],
    ["very_few", "아주 조금", "Very few", "very few"],
    ["few", "조금", "Few", "few"],
    ["some", "보통", "Some", "some"],
    ["many", "많이", "Many", "many"],
    ["abundant", "아주 많이", "Abundant", "abundant"],
  ], { custom: false, when: hasStylableHair }),
  shape(`${P}hair.movement`, 302, H, fd("Hair movement", "헤어 움직임"), ["hair movement", "바람에 날리는", "흩날리는"], fd("Motion of the hair; independent of its condition.", "머리카락의 움직임이며 모발 상태와 독립적입니다."), "Hair movement: {value}.", [
    ["still", "정지", "Still", "still"],
    ["gently_flowing", "부드럽게 흐르는", "Gently flowing", "gently flowing"],
    ["softly_swaying", "살랑이는", "Softly swaying", "softly swaying"],
    ["windblown", "바람에 날리는", "Windblown", "windblown"],
    ["strongly_windblown", "강하게 날리는", "Strongly windblown", "strongly windblown"],
    ["floating", "떠 있는", "Floating", "floating", ["무중력"]],
  ], { custom: false, when: hasStylableHair }),
];

// ── Facial hair (6) ──────────────────────────────────────────────────────────
const B = "person_facial_hair";
const FH = `${P}facial_hair.style`;
const hasFacialHair = notNone(FH, "clean_shaven");
const FACIAL_HAIR_BANDS = (unit: "length" | "density"): Bands =>
  unit === "length"
    ? [["아주 짧음", "Very short", "very short"], ["짧음", "Short", "short"], ["보통", "Medium", "medium length"], ["긺", "Long", "long"], ["아주 긺", "Very long", "very long"]]
    : SPARSE_DENSE;
const facialHair: Attr[] = [
  shape(FH, 303, B, fd("Facial hair style", "수염 형태"), ["beard", "mustache", "수염", "콧수염", "턱수염"], fd("Coexisting features (e.g. mustache + goatee + sideburns) can be combined. Not limited by gender. “Clean-shaven” hides the other facial hair attributes.", "함께 있는 특징(콧수염+염소수염+구레나룻 등)을 함께 고를 수 있습니다. 성별로 제한하지 않습니다. ‘수염 없음’이면 다른 수염 속성을 출력하지 않습니다."), "Facial hair: {value}.", [
    ["clean_shaven", "수염 없음", "Clean-shaven", "clean-shaven", ["no beard", "면도한"]],
    ["light_stubble", "옅은 수염 자국", "Light stubble", "light stubble", ["까칠한 수염"]],
    ["heavy_stubble", "짙은 수염 자국", "Heavy stubble", "heavy stubble"],
    ["mustache", "콧수염", "Mustache", "mustache", ["moustache"]],
    ["pencil_mustache", "펜슬 콧수염", "Pencil mustache", "pencil mustache"],
    ["handlebar_mustache", "핸들바 콧수염", "Handlebar mustache", "handlebar mustache"],
    ["chevron_mustache", "셰브론 콧수염", "Chevron mustache", "chevron mustache"],
    ["goatee", "염소수염", "Goatee", "goatee"],
    ["van_dyke", "반다이크 수염", "Van Dyke beard", "Van Dyke beard"],
    ["soul_patch", "소울 패치", "Soul patch", "soul patch"],
    ["chin_beard", "턱수염", "Chin beard", "chin beard"],
    ["chinstrap", "턱끈 수염", "Chinstrap beard", "chinstrap beard"],
    ["sideburns", "구레나룻", "Sideburns", "sideburns"],
    ["mutton_chops", "머튼 찹스", "Mutton chops", "mutton chops"],
    ["short_boxed", "짧게 다듬은 박스 수염", "Short boxed beard", "short boxed beard"],
    ["full_beard", "풍성한 수염", "Full beard", "full beard"],
    ["long_beard", "긴 수염", "Long beard", "long beard"],
    ["braided_beard", "땋은 수염", "Braided beard", "braided beard"],
  ], { multi: true, control: "searchable" }),
  degree(`${P}facial_hair.length`, 304, B, fd("Facial hair length", "수염 길이"), ["beard length", "수염 길이"], SLIDER("Not output when clean-shaven.", "‘수염 없음’이면 출력하지 않습니다."), "Facial hair length: {value}.", FACIAL_HAIR_BANDS("length"), hasFacialHair),
  degree(`${P}facial_hair.density`, 305, B, fd("Facial hair density", "수염 밀도"), ["beard density", "수염 숱"], SLIDER("Not output when clean-shaven.", "‘수염 없음’이면 출력하지 않습니다."), "Facial hair density: {value}.", FACIAL_HAIR_BANDS("density"), hasFacialHair),
  shape(`${P}facial_hair.color`, 306, B, fd("Facial hair color", "수염 색상"), ["beard color", "수염 색"], fd("Same palette as hair color, chosen independently. Not output when clean-shaven.", "헤어 색상과 같은 팔레트에서 독립적으로 고릅니다. ‘수염 없음’이면 출력하지 않습니다."), "Facial hair color: {value}.", HAIR_COLORS, { control: "color", groups: HAIR_COLOR_GROUPS, when: hasFacialHair }),
  shape(`${P}facial_hair.grooming`, 307, B, fd("Facial hair grooming", "수염 정돈 상태"), ["beard grooming", "수염 정돈"], fd("Not output when clean-shaven.", "‘수염 없음’이면 출력하지 않습니다."), "Facial hair grooming: {value}.", [
    ["neatly_trimmed", "깔끔하게 다듬은", "Neatly trimmed", "neatly trimmed"],
    ["sculpted", "모양을 낸", "Sculpted", "sculpted"],
    ["natural", "자연스럽게 정돈된", "Naturally groomed", "naturally groomed"],
    ["untamed", "자유롭게 자란", "Untamed", "untamed"],
    ["unkempt", "손질 안 된", "Unkempt", "unkempt"],
  ], { custom: false, when: hasFacialHair }),
  shape(`${P}facial_hair.texture`, 308, B, fd("Facial hair texture", "수염 질감"), ["beard texture", "수염 질감"], fd("Not output when clean-shaven.", "‘수염 없음’이면 출력하지 않습니다."), "Facial hair texture: {value}.", [
    ["straight", "직모", "Straight", "straight"],
    ["wavy", "웨이브", "Wavy", "wavy"],
    ["curly", "곱슬", "Curly", "curly"],
    ["tightly_curly", "강한 곱슬", "Tightly curly", "tightly curly"],
    ["coily", "코일리", "Coily", "coily"],
  ], { custom: false, when: hasFacialHair }),
];

export const skinHairAttributes: Attr[] = [...skin, ...hair, ...facialHair];
const opposite = (attributeId: string, pairs: Array<[string, string]>): Rule[] => oppositeIn(skinHairAttributes, attributeId, pairs);

const styleVsLength = (id: string, styles: string[], lengths: string[], en: string, ko: string): Rule => ({
  id,
  kind: "conflict",
  severity: "warning",
  when: [
    { op: "anyOf", attributeId: `${P}hair.style`, optionIds: styles },
    { op: "anyOf", attributeId: `${P}hair.length`, optionIds: lengths },
  ],
  involves: [`${P}hair.style`, `${P}hair.length`],
  message: { en, ko },
  guidance: { en: "Neither value is changed automatically. Adjust one if this is not intended.", ko: "어느 값도 자동으로 바꾸지 않습니다. 의도한 설정이 아니라면 하나를 고치세요." },
});

export const skinHairRules: Rule[] = [
  noneWithOthers(`${P}skin.scars`, "none", "skin-scars-none-with-others", fd("scars", "흉터")),
  noneWithOthers(`${P}hair.color_pattern`, "solid", "hair-color-pattern-solid-with-others", fd("solid color", "단색")),
  noneWithOthers(FH, "clean_shaven", "facial-hair-clean-shaven-with-others", fd("clean-shaven", "수염 없음")),
  ...opposite(`${P}hair.condition`, [["groomed", "messy"], ["groomed", "unkempt"], ["groomed", "tousled"], ...pairsOf(["wet", "damp", "dry_looking"])]),
  ...opposite(`${P}hair.tie_position`, [...pairsOf(["low", "mid", "high"]), ["left", "right"]]),
  ...opposite(FH, [["light_stubble", "heavy_stubble"], ...pairsOf(["pencil_mustache", "handlebar_mustache", "chevron_mustache"]), ["short_boxed", "long_beard"]]),
  styleVsLength("hair-short-style-vs-long-length", SHORT_STYLES, ["chest", "mid_back", "waist", "hip", "knee", "floor"], "A short haircut is selected with a long hair length.", "짧은 헤어스타일과 긴 머리 길이가 함께 선택되었습니다."),
  styleVsLength("hair-bob-vs-long-length", BOB_STYLES, ["mid_back", "waist", "hip", "knee", "floor"], "A bob is selected with a very long hair length.", "보브(단발) 스타일과 매우 긴 머리 길이가 함께 선택되었습니다."),
  {
    id: "hair-tie-position-without-tied-style",
    kind: "conflict",
    severity: "warning",
    when: [
      { op: "anyOf", attributeId: `${P}hair.style`, optionIds: UNTIED_STYLES },
      { op: "isSet", attributeId: `${P}hair.tie_position` },
    ],
    involves: [`${P}hair.tie_position`, `${P}hair.style`],
    message: { en: "A tie position is set, but the hairstyle is not tied (no ponytail, bun or braid).", ko: "묶는 위치가 설정되었지만 헤어스타일은 묶는 스타일(포니테일·번·땋은 머리)이 아닙니다." },
    guidance: { en: "Neither value is changed automatically. Clear the tie position or choose a tied style.", ko: "자동으로 바꾸지 않습니다. 묶는 위치를 해제하거나 묶는 스타일을 고르세요." },
  },
];
