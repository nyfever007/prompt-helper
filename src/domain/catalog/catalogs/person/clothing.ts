import type { CategoryDefinition, Condition } from "../../schema";
import { SLIDER, degree, fd, shape, type Attr, type L, type O, type Rule, type ShapeOptions } from "./builders";

/**
 * Sprint 2-B.5B — Person › Wardrobe: 8 global settings + 7 garment categories (64).
 * Specification: docs/catalogs/person/wardrobe.md.
 *
 * - Each garment category is its own ID area (`person.clothing.<garment>.*`) and every
 *   value is stored independently: a top's color never becomes a bottom's color.
 * - The garment type is single-select with custom values (multiple garments per
 *   category are a later extension, not a permanent limit). Details are usable even
 *   when the type is unset.
 * - An explicit “none” type hides only that garment's details (values kept). It means
 *   the ABSENCE of that garment category and never becomes nudity wording.
 * - A one-piece never clears tops/bottoms; layering is allowed. Only real conflicts
 *   are diagnosed (non-blocking).
 * - Global style / fit / coverage never set individual garments. Coverage only says
 *   how much the clothing covers; it never adds exposure, appeal or pose.
 * - No gender, occupation, nationality or status restriction; traditional garments
 *   never set gender, nationality or ethnicity. No brands.
 */

const P = "person.clothing.";
const sub = (id: string) => `person_wardrobe_${id}`;

export const wardrobeCategories: CategoryDefinition[] = (
  [
    ["general", "General", "전체 설정"],
    ["tops", "Tops", "상의"],
    ["bottoms", "Bottoms", "하의"],
    ["one_piece", "One-piece garments", "원피스 및 일체형"],
    ["outerwear", "Outerwear", "아우터"],
    ["innerwear", "Innerwear", "내의"],
    ["footwear", "Footwear", "신발"],
    ["hosiery", "Socks & hosiery", "양말 및 스타킹"],
  ] as const
).map(([id, en, ko], i) => ({ id: sub(id), parentId: "person_wardrobe", order: 1 + i, status: "approved" as const, label: { en, ko }, docPath: "docs/catalogs/person/wardrobe.md" }));

export const WARDROBE_CATEGORY_DESCRIPTION: L = fd(
  "Clothing by garment category; every garment's color, material and fit is stored independently. “None” means only that garment is absent. Never limited by gender, occupation or nationality.",
  "의복 카테고리별 의상입니다. 각 의복의 색상·소재·핏은 독립적으로 저장됩니다. ‘없음’은 해당 의복이 없다는 뜻일 뿐입니다. 성별·직업·국적으로 제한하지 않습니다.",
);

// ── Shared vocabularies (catalog data, reused by every garment) ──────────────
const g = (group: string, list: Array<[string, string, string, string, string[]?]>): O[] => list.map(([id, ko, en, text, aliases]) => [id, ko, en, text, aliases ?? [], undefined, group]);

export const GARMENT_COLOR_GROUPS: Array<[string, string, string]> = [
  ["neutrals", "Neutrals", "뉴트럴"], ["browns", "Browns", "브라운"], ["reds", "Reds", "레드"], ["pinks", "Pinks", "핑크"], ["oranges", "Oranges", "오렌지"],
  ["yellows", "Yellows", "옐로"], ["greens", "Greens", "그린"], ["blues", "Blues", "블루"], ["purples", "Purples", "퍼플"], ["metallics", "Metallics", "메탈릭"],
];
const c = (id: string, ko: string, en: string, hex: string, group: string, aliases: string[] = []): O => [id, ko, en, en.toLowerCase(), aliases, hex, group];
export const GARMENT_COLORS: O[] = [
  c("white", "화이트", "White", "#fafafa", "neutrals", ["흰색"]), c("off_white", "오프화이트", "Off-white", "#f3efe6", "neutrals"), c("ivory", "아이보리", "Ivory", "#f2ead3", "neutrals"),
  c("cream", "크림", "Cream", "#f1e3c2", "neutrals"), c("beige", "베이지", "Beige", "#d8c3a0", "neutrals"), c("taupe", "토프", "Taupe", "#8b7d6f", "neutrals"),
  c("gray", "그레이", "Gray", "#9a9a9a", "neutrals", ["grey", "회색"]), c("charcoal", "차콜", "Charcoal", "#3c3e42", "neutrals"), c("black", "블랙", "Black", "#121212", "neutrals", ["검정"]),
  c("tan", "탄", "Tan", "#c8a47a", "browns"), c("camel", "카멜", "Camel", "#b9874f", "browns"), c("khaki", "카키", "Khaki", "#b8a77a", "browns"),
  c("light_brown", "연갈색", "Light brown", "#a07850", "browns"), c("chocolate_brown", "초콜릿 브라운", "Chocolate brown", "#5a3824", "browns"), c("dark_brown", "다크 브라운", "Dark brown", "#3e2618", "browns"),
  c("red", "레드", "Red", "#c62828", "reds", ["빨강"]), c("crimson", "크림슨", "Crimson", "#9b1030", "reds"), c("burgundy", "버건디", "Burgundy", "#6b1a2c", "reds"),
  c("wine_red", "와인", "Wine red", "#722f37", "reds"), c("brick_red", "벽돌색", "Brick red", "#9a3b2c", "reds"),
  c("pale_pink", "연핑크", "Pale pink", "#f4cfd6", "pinks"), c("dusty_pink", "더스티 핑크", "Dusty pink", "#c98f97", "pinks"), c("rose_pink", "로즈 핑크", "Rose pink", "#e07a99", "pinks"), c("hot_pink", "핫핑크", "Hot pink", "#e0408a", "pinks"),
  c("orange", "오렌지", "Orange", "#ef7d22", "oranges", ["주황"]), c("peach", "피치", "Peach", "#f2b08f", "oranges"), c("coral", "코랄", "Coral", "#ec7a62", "oranges"), c("rust", "러스트", "Rust", "#a7471f", "oranges"), c("terracotta", "테라코타", "Terracotta", "#c0603e", "oranges"),
  c("yellow", "옐로", "Yellow", "#f2d230", "yellows", ["노랑"]), c("mustard", "머스터드", "Mustard", "#c9a227", "yellows"), c("golden_yellow", "골든 옐로", "Golden yellow", "#e0a922", "yellows"), c("pale_yellow", "연노랑", "Pale yellow", "#f6e9a6", "yellows"),
  c("olive", "올리브", "Olive", "#6b6b2a", "greens"), c("moss_green", "모스 그린", "Moss green", "#6f7a3a", "greens"), c("forest_green", "포레스트 그린", "Forest green", "#2f5a34", "greens"),
  c("sage_green", "세이지 그린", "Sage green", "#9caf88", "greens"), c("mint", "민트", "Mint", "#a7dcc3", "greens"), c("emerald", "에메랄드", "Emerald", "#1f8a5a", "greens"),
  c("sky_blue", "스카이 블루", "Sky blue", "#8ec5ea", "blues", ["하늘색"]), c("light_blue", "연파랑", "Light blue", "#b5d3ec", "blues"), c("royal_blue", "로열 블루", "Royal blue", "#2e4fb5", "blues"),
  c("navy", "네이비", "Navy", "#1c2a4a", "blues", ["남색"]), c("teal", "틸", "Teal", "#1f7a7a", "blues"), c("turquoise", "터콰이즈", "Turquoise", "#3cc0c0", "blues"),
  c("lavender", "라벤더", "Lavender", "#b9a3dc", "purples"), c("lilac", "라일락", "Lilac", "#c8a2c8", "purples"), c("violet", "바이올렛", "Violet", "#7d4fb0", "purples"), c("purple", "퍼플", "Purple", "#6a2c91", "purples", ["보라"]), c("plum", "플럼", "Plum", "#7a3a5e", "purples"),
  c("gold", "골드", "Gold", "#c9a24a", "metallics", ["금색"]), c("silver", "실버", "Silver", "#c3c7cc", "metallics", ["은색"]), c("bronze", "브론즈", "Bronze", "#a0703a", "metallics"), c("copper", "코퍼", "Copper", "#b3632f", "metallics"), c("rose_gold", "로즈 골드", "Rose gold", "#d8a49a", "metallics"),
];

const MATERIALS: O[] = (
  [
    ["cotton", "면", "Cotton", ["코튼"]], ["linen", "린넨", "Linen", ["마"]], ["wool", "울", "Wool", ["모직"]], ["cashmere", "캐시미어", "Cashmere"], ["silk", "실크", "Silk", ["비단"]],
    ["satin", "새틴", "Satin"], ["velvet", "벨벳", "Velvet"], ["denim", "데님", "Denim", ["청"]], ["leather", "가죽", "Leather", ["레더"]], ["suede", "스웨이드", "Suede"],
    ["faux_leather", "인조 가죽", "Faux leather", ["비건 레더"]], ["polyester", "폴리에스터", "Polyester"], ["nylon", "나일론", "Nylon"], ["rayon", "레이온", "Rayon"], ["viscose", "비스코스", "Viscose"],
    ["chiffon", "시폰", "Chiffon"], ["organza", "오간자", "Organza"], ["lace", "레이스", "Lace"], ["mesh", "메시", "Mesh", ["망사"]], ["jersey", "저지", "Jersey"],
    ["knit", "니트 원단", "Knit fabric", ["니트"]], ["fleece", "플리스", "Fleece", ["후리스"]], ["canvas", "캔버스", "Canvas"], ["corduroy", "코듀로이", "Corduroy", ["골덴"]], ["tweed", "트위드", "Tweed"],
    ["brocade", "브로케이드", "Brocade"], ["jacquard", "자카드", "Jacquard"], ["sequin", "스팽글 원단", "Sequin fabric", ["시퀸"]], ["metallic", "메탈릭 원단", "Metallic fabric"], ["rubber", "고무", "Rubber"],
    ["waterproof", "방수 원단", "Waterproof fabric"],
  ] as Array<[string, string, string, string[]?]>
).map(([id, ko, en, aliases]) => [id, ko, en, en.toLowerCase(), aliases ?? []]);

const PATTERNS: O[] = (
  [
    ["solid", "단색", "Solid color", ["무지"]], ["horizontal_stripes", "가로 줄무늬", "Horizontal stripes", ["스트라이프"]], ["vertical_stripes", "세로 줄무늬", "Vertical stripes"], ["pinstripes", "핀스트라이프", "Pinstripes"],
    ["plaid", "플래드", "Plaid", ["체크"]], ["gingham", "깅엄", "Gingham"], ["tartan", "타탄", "Tartan"], ["houndstooth", "하운드투스", "Houndstooth"], ["polka_dots", "물방울무늬", "Polka dots", ["도트"]],
    ["floral", "꽃무늬", "Floral", ["플로럴"]], ["botanical", "식물 무늬", "Botanical"], ["paisley", "페이즐리", "Paisley"], ["geometric", "기하학 무늬", "Geometric"], ["abstract", "추상 무늬", "Abstract"],
    ["camouflage", "카무플라주", "Camouflage", ["밀리터리 무늬", "camo"]], ["animal_print", "애니멀 프린트", "Animal print", ["호피"]], ["checkered", "체커보드", "Checkered", ["바둑판"]], ["argyle", "아가일", "Argyle"],
    ["chevron", "셰브론", "Chevron"], ["color_blocked", "컬러 블록", "Color-blocked"], ["tie_dye", "타이다이", "Tie-dye"], ["gradient", "그라데이션", "Gradient"], ["graphic_print", "그래픽 프린트", "Graphic print"],
  ] as Array<[string, string, string, string[]?]>
).map(([id, ko, en, aliases]) => [id, ko, en, en.toLowerCase(), aliases ?? []]);

const FIT: O[] = [
  ["tight", "몸에 딱 붙는", "Tight-fitting", "tight-fitting"], ["slim", "슬림 핏", "Slim-fit", "slim-fit"], ["regular", "레귤러 핏", "Regular-fit", "regular-fit", ["기본 핏"]],
  ["relaxed", "릴랙스 핏", "Relaxed-fit", "relaxed-fit"], ["loose", "루즈 핏", "Loose-fitting", "loose-fitting"], ["oversized", "오버사이즈", "Oversized", "oversized", ["오버핏"]],
];

const NECKLINES: O[] = [
  ["crew", "라운드넥", "Crew neck", "crew neck", ["크루넥"]], ["v_neck", "브이넥", "V-neck", "V-neck"], ["scoop", "스쿱넥", "Scoop neck", "scoop neck", ["유넥"]], ["square", "스퀘어넥", "Square neck", "square neck"],
  ["boat", "보트넥", "Boat neck", "boat neck"], ["high", "하이넥", "High neck", "high neck"], ["turtleneck", "터틀넥", "Turtleneck", "turtleneck", ["폴라"]], ["mock", "모크넥", "Mock neck", "mock neck"],
  ["halter", "홀터넥", "Halter neck", "halter neck"], ["sweetheart", "스위트하트 넥라인", "Sweetheart neckline", "sweetheart neckline"], ["cowl", "카울넥", "Cowl neck", "cowl neck"],
  ["off_shoulder", "오프숄더", "Off-the-shoulder neckline", "off-the-shoulder neckline"], ["asymmetric", "비대칭 넥라인", "Asymmetric neckline", "asymmetric neckline", ["원숄더"]],
];
const COLLARS: O[] = [
  ["none", "칼라 없음", "No collar", "no collar", ["collarless"]], ["point", "포인트 칼라", "Point collar", "point collar"], ["spread", "스프레드 칼라", "Spread collar", "spread collar"],
  ["button_down", "버튼다운 칼라", "Button-down collar", "button-down collar"], ["mandarin", "차이나 칼라", "Mandarin collar", "mandarin collar", ["만다린 칼라"]], ["stand", "스탠드 칼라", "Stand collar", "stand collar"],
  ["peter_pan", "피터팬 칼라", "Peter Pan collar", "Peter Pan collar", ["둥근 칼라"]], ["sailor", "세일러 칼라", "Sailor collar", "sailor collar"], ["shawl", "숄 칼라", "Shawl collar", "shawl collar"],
  ["notched_lapel", "노치드 라펠", "Notched lapel", "notched lapel"], ["peak_lapel", "피크드 라펠", "Peak lapel", "peak lapel"],
];
const SLEEVE_LENGTHS: O[] = [
  ["sleeveless", "민소매", "Sleeveless", "sleeveless"], ["cap", "캡 소매", "Cap sleeves", "cap sleeves"], ["short", "반소매", "Short sleeves", "short sleeves", ["반팔"]],
  ["elbow", "팔꿈치 길이", "Elbow-length sleeves", "elbow-length sleeves"], ["three_quarter", "7부 소매", "Three-quarter sleeves", "three-quarter sleeves"],
  ["long", "긴소매", "Long sleeves", "long sleeves", ["긴팔"]], ["extra_long", "아주 긴 소매", "Extra-long sleeves", "extra-long sleeves", ["손등 덮는 소매"]],
];
const SLEEVE_STYLES: O[] = [
  ["straight", "일자 소매", "Straight sleeves", "straight sleeves"], ["fitted", "피트 소매", "Fitted sleeves", "fitted sleeves"], ["rolled_up", "걷어 올린 소매", "Rolled-up sleeves", "rolled-up sleeves"],
  ["puff", "퍼프 소매", "Puff sleeves", "puff sleeves"], ["balloon", "벌룬 소매", "Balloon sleeves", "balloon sleeves"], ["bell", "벨 소매", "Bell sleeves", "bell sleeves"],
  ["bishop", "비숍 소매", "Bishop sleeves", "bishop sleeves"], ["raglan", "래글런 소매", "Raglan sleeves", "raglan sleeves"], ["batwing", "배트윙 소매", "Batwing sleeves", "batwing sleeves", ["돌먼 소매"]],
  ["flared", "플레어 소매", "Flared sleeves", "flared sleeves"],
];
const DETAILS: O[] = (
  [
    ["buttons", "단추", "Buttons"], ["decorative_buttons", "장식 단추", "Decorative buttons"], ["zippers", "지퍼", "Zippers"], ["pockets", "주머니", "Pockets", ["포켓"]], ["patch_pockets", "패치 포켓", "Patch pockets"],
    ["belted_waist", "벨트 허리", "Belted waist"], ["drawstrings", "스트링", "Drawstrings", ["끈 조임"]], ["pleats", "주름", "Pleats", ["플리츠"]], ["ruffles", "러플", "Ruffles"], ["frills", "프릴", "Frills"],
    ["embroidery", "자수", "Embroidery"], ["lace_trim", "레이스 트림", "Lace trim"], ["contrast_stitching", "대비 스티치", "Contrast stitching"], ["decorative_stitching", "장식 스티치", "Decorative stitching"],
    ["metal_hardware", "금속 장식", "Metal hardware"], ["studs", "스터드", "Studs", ["징"]], ["rivets", "리벳", "Rivets"], ["beading", "비즈 장식", "Beading"], ["sequins", "스팽글", "Sequins"],
    ["applique", "아플리케", "Appliqué", ["applique"]], ["fringe", "프린지", "Fringe"], ["tassels", "태슬", "Tassels"], ["slits", "트임", "Slits", ["슬릿"]], ["asymmetric_hem", "비대칭 밑단", "Asymmetric hem"],
    ["distressed", "디스트레스드", "Distressed detailing", ["워싱", "찢어진"]], ["layered_fabric", "레이어드 원단", "Layered fabric"],
  ] as Array<[string, string, string, string[]?]>
).map(([id, ko, en, aliases]) => [id, ko, en, en.toLowerCase(), aliases ?? []]);

// ── Garment factory: only the fields a garment declares are created ──────────
interface Garment {
  key: string;
  /** Output / label nouns: “Top”, “상의”. */
  en: string;
  ko: string;
  cat: string;
}
const id = (gm: Garment, field: string) => `${P}${gm.key}.${field}`;
const notNoneType = (gm: Garment, extra: string[] = []): Condition[] => [{ op: "noneOf", attributeId: id(gm, "type"), optionIds: ["none", ...extra], whenUnset: "pass" }];
const field = (gm: Garment, f: string, order: number, label: L, aliases: string[], description: L, noun: string, options: O[], o: ShapeOptions = {}) =>
  shape(id(gm, f), order, gm.cat, label, aliases, description, `${gm.en} ${noun}: {value}.`, options, { ...o, when: [...notNoneType(gm), ...(o.when ?? [])] });

const typeAttr = (gm: Garment, order: number, aliases: string[], noneEntry: O, list: O[], groups: Array<[string, string, string]>, note?: L) =>
  shape(
    id(gm, "type"),
    order,
    gm.cat,
    fd(`${gm.en} type`, `${gm.ko} 종류`),
    aliases,
    fd(
      `Single garment (custom allowed). “None” only means no ${gm.en.toLowerCase()} garment and hides its details (values kept); it never implies nudity.${note ? ` ${note.en}` : ""}`,
      `한 벌을 고릅니다(사용자 정의 가능). ‘없음’은 해당 의복이 없다는 뜻일 뿐이며 세부 값을 출력하지 않습니다(보존). 노출 표현으로 바뀌지 않습니다.${note ? ` ${note.ko}` : ""}`,
    ),
    `${gm.en}: {value}.`,
    [noneEntry, ...list],
    { control: "searchable", groups },
  );
const colors = (gm: Garment, order: number, which: "primary" | "secondary", o: ShapeOptions = {}) =>
  field(
    gm,
    `${which}_color`,
    order,
    fd(`${gm.en} ${which} color`, `${gm.ko} ${which === "primary" ? "기본" : "보조"} 색상`),
    which === "primary" ? [`${gm.en.toLowerCase()} color`, `${gm.ko} 색`, `${gm.ko} 색상`] : [`${gm.en.toLowerCase()} accent color`, `${gm.ko} 보조색`, `${gm.ko} 포인트 색`],
    fd("Shared garment palette; stored only for this garment. Swatches are visual references.", "공통 의상 팔레트이며 이 의복에만 저장됩니다. 견본은 시각적 참고입니다."),
    `${which} color`,
    GARMENT_COLORS,
    { ...o, control: "color", groups: GARMENT_COLOR_GROUPS },
  );
const material = (gm: Garment, order: number) =>
  field(gm, "material", order, fd(`${gm.en} material`, `${gm.ko} 소재`), [`${gm.en.toLowerCase()} material`, `${gm.ko} 소재`, `${gm.ko} 원단`], fd("Material only; sheen and transparency are not implied.", "소재만 나타내며 광택·투명도를 함께 정하지 않습니다."), "material", MATERIALS, { control: "searchable" });
const pattern = (gm: Garment, order: number) =>
  field(gm, "pattern", order, fd(`${gm.en} pattern`, `${gm.ko} 패턴`), [`${gm.en.toLowerCase()} pattern`, `${gm.ko} 무늬`, `${gm.ko} 패턴`], fd("Pattern of this garment only.", "이 의복의 무늬입니다."), "pattern", PATTERNS, { control: "searchable" });
const fit = (gm: Garment, order: number) =>
  field(gm, "fit", order, fd(`${gm.en} fit`, `${gm.ko} 핏`), [`${gm.en.toLowerCase()} fit`, `${gm.ko} 핏`], fd("Independent of the overall clothing fit.", "전체 핏과 독립적으로 저장됩니다."), "fit", FIT, { custom: false });
const details = (gm: Garment, order: number) =>
  field(gm, "details", order, fd(`${gm.en} details`, `${gm.ko} 디테일`), [`${gm.en.toLowerCase()} details`, `${gm.ko} 디테일`, `${gm.ko} 장식`], fd("Combinable details.", "함께 고를 수 있는 디테일입니다."), "details", DETAILS, { multi: true, control: "searchable" });
const neckline = (gm: Garment, order: number, when: Condition[] = []) =>
  field(gm, "neckline", order, fd(`${gm.en} neckline`, `${gm.ko} 넥라인`), [`${gm.en.toLowerCase()} neckline`, `${gm.ko} 넥라인`, `${gm.ko} 목선`], fd("Neckline shape only; it adds no exposure.", "목선 모양만 나타내며 노출을 추가하지 않습니다."), "neckline", NECKLINES, { control: "searchable", when });
const sleeves = (gm: Garment, order: number, when: Condition[] = []) => [
  field(gm, "sleeve_length", order, fd(`${gm.en} sleeve length`, `${gm.ko} 소매 길이`), [`${gm.en.toLowerCase()} sleeve length`, `${gm.ko} 소매 길이`, `${gm.ko} 소매`], fd("Not offered for sleeveless garment types.", "소매가 없는 종류에서는 출력하지 않습니다."), "sleeve length", SLEEVE_LENGTHS, { custom: false, when }),
  field(gm, "sleeve_style", order + 1, fd(`${gm.en} sleeve style`, `${gm.ko} 소매 형태`), [`${gm.en.toLowerCase()} sleeve style`, `${gm.ko} 소매 형태`], fd("Independent of the sleeve length.", "소매 길이와 독립적입니다."), "sleeve style", SLEEVE_STYLES, { when }),
];
const t = (rows: Array<[string, string, string, string?, string[]?]>): Array<[string, string, string, string, string[]?]> =>
  rows.map(([oid, ko, en, text, aliases]) => [oid, ko, en, text ?? en.toLowerCase(), aliases]);

// ── General (8) ──────────────────────────────────────────────────────────────
const GEN = sub("general");
const general: Attr[] = [
  shape(`${P}fashion_style`, 388, GEN, fd("Fashion style", "패션 스타일"), ["fashion", "style", "패션", "룩", "코디"], fd("Overall direction; combinable. Never sets individual garments.", "전체 방향이며 함께 고를 수 있습니다. 개별 의복을 자동으로 정하지 않습니다."), "Fashion style: {value}.", [
    ["casual", "캐주얼", "Casual", "casual"], ["smart_casual", "스마트 캐주얼", "Smart casual", "smart casual"], ["formal", "포멀", "Formal", "formal"], ["business", "비즈니스", "Business", "business", ["정장"]],
    ["business_casual", "비즈니스 캐주얼", "Business casual", "business casual", ["비캐주얼"]], ["streetwear", "스트리트", "Streetwear", "streetwear"], ["sportswear", "스포츠웨어", "Sportswear", "sportswear", ["애슬레저"]],
    ["outdoor", "아웃도어", "Outdoor", "outdoor"], ["military", "밀리터리", "Military-inspired", "military-inspired"], ["preppy", "프레피", "Preppy", "preppy"], ["minimalist", "미니멀", "Minimalist", "minimalist"],
    ["vintage", "빈티지", "Vintage", "vintage"], ["retro", "레트로", "Retro", "retro"], ["bohemian", "보헤미안", "Bohemian", "bohemian", ["보호"]], ["gothic", "고딕", "Gothic", "gothic"], ["punk", "펑크", "Punk", "punk"],
    ["grunge", "그런지", "Grunge", "grunge"], ["techwear", "테크웨어", "Techwear", "techwear"], ["futuristic", "미래적", "Futuristic", "futuristic"], ["cyberpunk", "사이버펑크", "Cyberpunk", "cyberpunk"],
    ["steampunk", "스팀펑크", "Steampunk", "steampunk"], ["fantasy", "판타지", "Fantasy", "fantasy"], ["traditional", "전통", "Traditional", "traditional"], ["haute_couture", "오트 쿠튀르", "Haute couture", "haute couture"],
  ], { multi: true, control: "searchable" }),
  degree(`${P}formality`, 389, GEN, fd("Formality", "격식 수준"), ["formality", "격식", "포멀함"], SLIDER("How formal the clothing is.", "의상이 격식을 갖춘 정도입니다."), "Clothing formality: {value}.", [
    ["아주 캐주얼", "Very casual", "very casual"], ["캐주얼", "Casual", "casual"], ["세미 포멀", "Semi-formal", "semi-formal"], ["포멀", "Formal", "formal"], ["아주 포멀", "Highly formal", "highly formal"],
  ]),
  shape(`${P}fit`, 390, GEN, fd("Overall fit", "전체 핏"), ["overall fit", "전체 핏", "핏"], fd("Overall impression; each garment's own fit is stored separately.", "전체 인상이며 각 의복의 핏은 따로 저장됩니다."), "Overall clothing fit: {value}.", FIT, { custom: false }),
  shape(`${P}season`, 391, GEN, fd("Season", "계절"), ["season", "계절", "여름옷", "겨울옷"], fd("Combinable.", "함께 고를 수 있습니다."), "Clothing season: {value}.", [
    ["spring", "봄", "Spring", "spring"], ["summer", "여름", "Summer", "summer"], ["autumn", "가을", "Autumn", "autumn", ["fall"]], ["winter", "겨울", "Winter", "winter"], ["all_season", "사계절", "All-season", "all-season"],
  ], { multi: true, custom: false }),
  shape(`${P}era`, 392, GEN, fd("Clothing era", "의상 시대"), ["era", "시대", "시대 의상", "decade"], fd("Historical or future period of the clothing.", "의상의 역사적·미래적 시대입니다."), "Clothing era: {value}.", [
    ["ancient", "고대", "Ancient", "ancient"], ["medieval", "중세", "Medieval", "medieval"], ["renaissance", "르네상스", "Renaissance", "Renaissance"], ["baroque", "바로크", "Baroque", "Baroque"],
    ["victorian", "빅토리아 시대", "Victorian", "Victorian"], ["edwardian", "에드워드 시대", "Edwardian", "Edwardian"],
    ...[2, 3, 4, 5, 6, 7, 8, 9].map((d): O => [`decade_19${d}0s`, `19${d}0년대`, `19${d}0s`, `19${d}0s`, [`${d}0년대`, `${d}0s`]]),
    ["contemporary", "현대", "Contemporary", "contemporary"], ["futuristic", "미래", "Futuristic", "futuristic"],
  ], { control: "searchable" }),
  shape(`${P}condition`, 393, GEN, fd("Clothing condition", "의상 상태"), ["condition", "상태", "낡은 옷", "새 옷"], fd("Wear and age of the clothing.", "의상의 마모·낡음 정도입니다."), "Clothing condition: {value}.", [
    ["brand_new", "새것", "Brand-new", "brand-new"], ["clean", "깨끗한", "Clean", "clean"], ["lightly_worn", "약간 입은", "Lightly worn", "lightly worn"], ["worn", "낡은", "Worn", "worn"],
    ["weathered", "해진", "Weathered", "weathered"], ["distressed", "디스트레스드", "Distressed", "distressed"], ["patched", "덧댄", "Patched", "patched"], ["tattered", "너덜너덜한", "Tattered", "tattered"],
  ], { custom: false }),
  shape(`${P}layering`, 394, GEN, fd("Layering", "레이어링"), ["layering", "레이어드", "겹쳐 입기"], fd("How many layers are worn; garments are not added automatically.", "겹쳐 입은 정도이며 의복을 자동으로 추가하지 않습니다."), "Clothing layering: {value}.", [
    ["single", "한 겹", "Single-layer", "single-layer"], ["light", "가볍게 겹침", "Lightly layered", "lightly layered"], ["moderate", "적당히 겹침", "Moderately layered", "moderately layered"], ["heavy", "많이 겹침", "Heavily layered", "heavily layered"],
  ], { custom: false }),
  shape(`${P}coverage`, 395, GEN, fd("Overall coverage", "전체 커버리지"), ["coverage", "커버리지", "노출도"], fd("Only how much of the body the clothing covers. It never adds exposure, appeal or pose; the safety policy is unchanged.", "의상이 몸을 덮는 정도만 나타냅니다. 노출·매력·포즈를 추가하지 않으며 안전 정책은 그대로입니다."), "Clothing coverage: {value}.", [
    ["full", "전체", "Full coverage", "full coverage"], ["high", "높음", "High coverage", "high coverage"], ["moderate", "보통", "Moderate coverage", "moderate coverage"],
    ["light", "낮음", "Light coverage", "light coverage"], ["minimal", "최소", "Minimal garment coverage", "minimal garment coverage"],
  ], { custom: false }),
];

// ── Tops (12) ────────────────────────────────────────────────────────────────
const TOP: Garment = { key: "tops", en: "Top", ko: "상의", cat: sub("tops") };
const SLEEVELESS_TOPS = ["tank_top", "sleeveless_top", "camisole", "vest"];
const tops: Attr[] = [
  typeAttr(TOP, 396, ["top", "상의", "윗옷", "셔츠"], ["none", "없음", "No separate top", "no separate top garment"], [
    ...g("tees", t([["t_shirt", "티셔츠", "T-shirt", "T-shirt", ["tee", "반팔티"]], ["graphic_tee", "그래픽 티셔츠", "Graphic T-shirt", "graphic T-shirt", ["프린팅 티"]], ["polo", "폴로 셔츠", "Polo shirt", "polo shirt", ["카라티", "피케 셔츠"]], ["henley", "헨리넥 셔츠", "Henley shirt", "Henley shirt"]])),
    ...g("shirts", t([["button_down", "버튼다운 셔츠", "Button-down shirt", "button-down shirt", ["남방"]], ["dress_shirt", "드레스 셔츠", "Dress shirt", "dress shirt", ["와이셔츠"]], ["oxford_shirt", "옥스퍼드 셔츠", "Oxford shirt"], ["linen_shirt", "린넨 셔츠", "Linen shirt"], ["blouse", "블라우스", "Blouse"]])),
    ...g("sleeveless", t([["tank_top", "탱크톱", "Tank top", "tank top", ["나시"]], ["sleeveless_top", "민소매 상의", "Sleeveless top"], ["crop_top", "크롭톱", "Crop top", "crop top", ["크롭 티"]], ["camisole", "캐미솔", "Camisole"], ["vest", "조끼", "Vest", "vest", ["베스트"]]])),
    ...g("knits", t([["sweater", "스웨터", "Sweater"], ["knit_sweater", "니트 스웨터", "Knit sweater", "knit sweater", ["니트"]], ["turtleneck", "터틀넥", "Turtleneck", "turtleneck top", ["폴라티"]], ["mock_neck", "모크넥 상의", "Mock-neck top", "mock-neck top"], ["sweatshirt", "맨투맨", "Sweatshirt", "sweatshirt", ["스웨트셔츠"]], ["hoodie", "후드티", "Hoodie", "hoodie", ["후디"]]])),
    ...g("other", t([["tunic_top", "튜닉 상의", "Tunic top"], ["peplum_top", "페플럼 상의", "Peplum top"], ["wrap_top", "랩 상의", "Wrap top"]])),
  ], [["tees", "T-shirts & polos", "티셔츠·폴로"], ["shirts", "Shirts & blouses", "셔츠·블라우스"], ["sleeveless", "Sleeveless & cropped", "민소매·크롭"], ["knits", "Knits & sweatshirts", "니트·스웨트"], ["other", "Other", "기타"]]),
  colors(TOP, 397, "primary"),
  colors(TOP, 398, "secondary"),
  material(TOP, 399),
  pattern(TOP, 400),
  fit(TOP, 401),
  neckline(TOP, 402),
  field(TOP, "collar", 403, fd("Top collar", "상의 칼라"), ["collar", "칼라", "깃"], fd("“No collar” is an explicit choice.", "‘칼라 없음’은 명시적 선택입니다."), "collar", COLLARS, { custom: false }),
  ...sleeves(TOP, 404, [{ op: "noneOf", attributeId: id(TOP, "type"), optionIds: SLEEVELESS_TOPS, whenUnset: "pass" }]),
  field(TOP, "length", 406, fd("Top length", "상의 기장"), ["top length", "상의 기장", "크롭"], fd("Length of the top only.", "상의의 기장입니다."), "length", [
    ["cropped", "크롭", "Cropped", "cropped"], ["waist", "허리 길이", "Waist-length", "waist-length"], ["hip", "엉덩이 길이", "Hip-length", "hip-length"], ["longline", "롱 기장", "Longline", "longline", ["튜닉 기장"]],
  ], { custom: false }),
  details(TOP, 407),
];

// ── Bottoms (10) ─────────────────────────────────────────────────────────────
const BOTTOM: Garment = { key: "bottoms", en: "Bottom", ko: "하의", cat: sub("bottoms") };
const SKIRTS = ["pencil_skirt", "a_line_skirt", "pleated_skirt", "wrap_skirt", "denim_skirt", "flared_skirt", "maxi_skirt"];
const SHORTS = ["shorts", "bermuda_shorts", "cycling_shorts"];
/** The type already states the leg cut (cut jeans, leggings), or there is no leg (skirts, shorts). */
const FIXED_CUT = ["straight_jeans", "skinny_jeans", "wide_jeans", "flared_jeans", "leggings", ...SHORTS, ...SKIRTS];
const bottoms: Attr[] = [
  typeAttr(BOTTOM, 408, ["bottom", "하의", "바지", "치마", "pants", "skirt"], ["none", "없음", "No separate bottom", "no separate bottom garment"], [
    ...g("jeans", t([["jeans", "청바지", "Jeans", "jeans", ["데님 팬츠"]], ["straight_jeans", "일자 청바지", "Straight-leg jeans"], ["skinny_jeans", "스키니진", "Skinny jeans"], ["wide_jeans", "와이드 청바지", "Wide-leg jeans"], ["flared_jeans", "플레어 청바지", "Flared jeans"]])),
    ...g("trousers", t([["tailored_trousers", "테일러드 바지", "Tailored trousers", "tailored trousers", ["정장 바지"]], ["slacks", "슬랙스", "Slacks"], ["chinos", "치노 팬츠", "Chinos"], ["cargo_pants", "카고 팬츠", "Cargo pants"], ["joggers", "조거 팬츠", "Joggers"], ["sweatpants", "트레이닝 바지", "Sweatpants", "sweatpants", ["추리닝"]], ["leggings", "레깅스", "Leggings"], ["culottes", "퀼로트", "Culottes", "culottes", ["치마바지"]]])),
    ...g("shorts", t([["shorts", "반바지", "Shorts", "shorts", ["쇼츠"]], ["bermuda_shorts", "버뮤다 팬츠", "Bermuda shorts"], ["cycling_shorts", "사이클 쇼츠", "Cycling shorts", "cycling shorts", ["바이커 쇼츠"]]])),
    ...g("skirts", t([["pencil_skirt", "펜슬 스커트", "Pencil skirt"], ["a_line_skirt", "A라인 스커트", "A-line skirt", "A-line skirt"], ["pleated_skirt", "플리츠 스커트", "Pleated skirt", "pleated skirt", ["주름 치마"]], ["wrap_skirt", "랩 스커트", "Wrap skirt"], ["denim_skirt", "데님 스커트", "Denim skirt", "denim skirt", ["청치마"]], ["flared_skirt", "플레어 스커트", "Flared skirt"], ["maxi_skirt", "맥시 스커트", "Maxi skirt", "maxi skirt", ["롱스커트"]]])),
  ], [["jeans", "Jeans", "청바지"], ["trousers", "Trousers", "바지"], ["shorts", "Shorts", "반바지"], ["skirts", "Skirts", "스커트"]]),
  colors(BOTTOM, 409, "primary"),
  colors(BOTTOM, 410, "secondary"),
  material(BOTTOM, 411),
  pattern(BOTTOM, 412),
  fit(BOTTOM, 413),
  field(BOTTOM, "waist_rise", 414, fd("Bottom waist rise", "하의 밑위"), ["rise", "밑위", "하이웨이스트"], fd("Where the waistband sits.", "허리선 위치입니다."), "waist rise", [
    ["low", "로우라이즈", "Low-rise", "low-rise"], ["mid", "미드라이즈", "Mid-rise", "mid-rise"], ["high", "하이라이즈", "High-rise", "high-rise", ["하이웨이스트"]],
  ], { custom: false }),
  field(BOTTOM, "leg_cut", 415, fd("Bottom leg cut", "하의 바지 통"), ["leg cut", "바지 통", "부츠컷", "와이드"], fd("Only for trousers whose type does not already state a cut (not for skirts, shorts, leggings or cut-named jeans).", "종류에 이미 통이 정해지지 않은 바지에만 적용합니다(스커트·반바지·레깅스·통이 정해진 청바지 제외)."), "leg cut", [
    ["straight", "일자", "Straight", "straight-leg"], ["tapered", "테이퍼드", "Tapered", "tapered"], ["wide", "와이드", "Wide-leg", "wide-leg"], ["flared", "플레어", "Flared", "flared"], ["bootcut", "부츠컷", "Bootcut", "bootcut"],
  ], { custom: false, when: [{ op: "noneOf", attributeId: id(BOTTOM, "type"), optionIds: FIXED_CUT, whenUnset: "pass" }] }),
  field(BOTTOM, "hem_length", 416, fd("Bottom hem length", "하의 기장"), ["hem length", "기장", "바지 길이", "치마 길이"], fd("Length of the bottom.", "하의의 기장입니다."), "hem length", [
    ["short", "짧은", "Short", "short"], ["knee", "무릎 길이", "Knee-length", "knee-length"], ["calf", "종아리 길이", "Calf-length", "calf-length"], ["ankle", "발목 길이", "Ankle-length", "ankle-length"], ["full", "전체 길이", "Full-length", "full-length"],
  ], { custom: false }),
  details(BOTTOM, 417),
];

// ── One-piece (13) ───────────────────────────────────────────────────────────
const ONE: Garment = { key: "one_piece", en: "One-piece garment", ko: "원피스", cat: sub("one_piece") };
const NO_SKIRT = ["jumpsuit", "romper", "overalls", "dungarees"];
const STRAP_ONLY = ["overalls", "dungarees"];
const onePiece: Attr[] = [
  typeAttr(ONE, 418, ["dress", "one-piece", "원피스", "드레스", "점프슈트"], ["none", "없음", "No one-piece garment", "no one-piece garment"], [
    ...g("dresses", t([["casual_dress", "캐주얼 원피스", "Casual dress"], ["a_line_dress", "A라인 원피스", "A-line dress", "A-line dress"], ["shirt_dress", "셔츠 원피스", "Shirt dress"], ["wrap_dress", "랩 원피스", "Wrap dress"], ["sheath_dress", "시스 드레스", "Sheath dress"], ["shift_dress", "시프트 드레스", "Shift dress"], ["slip_dress", "슬립 드레스", "Slip dress"], ["sundress", "선드레스", "Sundress"], ["sweater_dress", "니트 원피스", "Sweater dress"]])),
    ...g("formal", t([["cocktail_dress", "칵테일 드레스", "Cocktail dress"], ["evening_gown", "이브닝 가운", "Evening gown", "evening gown", ["이브닝 드레스"]], ["ball_gown", "볼 가운", "Ball gown", "ball gown", ["파티 드레스"]]])),
    ...g("all_in_one", t([["jumpsuit", "점프슈트", "Jumpsuit"], ["romper", "롬퍼", "Romper", "romper", ["플레이수트"]], ["overalls", "오버올", "Overalls", "overalls", ["멜빵바지"]], ["dungarees", "던가리", "Dungarees"]])),
    ...g("robes", t([["robe", "로브", "Robe"], ["tunic", "튜닉", "Tunic"]])),
    ...g("traditional", t([["kimono", "기모노", "Kimono"], ["hanbok", "한복", "Hanbok"], ["cheongsam", "치파오", "Cheongsam", "cheongsam", ["qipao", "치파오"]], ["sari", "사리", "Sari", "sari", ["saree"]], ["traditional_costume", "전통 의상", "Traditional costume"]])),
  ], [["dresses", "Dresses", "원피스"], ["formal", "Formal gowns", "드레스·가운"], ["all_in_one", "Jumpsuits & overalls", "점프슈트·오버올"], ["robes", "Robes & tunics", "로브·튜닉"], ["traditional", "Traditional", "전통 복식"]],
  fd("Never clears tops or bottoms. Traditional garments never set gender, nationality or ethnicity.", "상의·하의 값을 지우지 않습니다. 전통 복식은 성별·국적·민족을 자동으로 정하지 않습니다.")),
  colors(ONE, 419, "primary"),
  colors(ONE, 420, "secondary"),
  material(ONE, 421),
  pattern(ONE, 422),
  fit(ONE, 423),
  neckline(ONE, 424, [{ op: "noneOf", attributeId: id(ONE, "type"), optionIds: STRAP_ONLY, whenUnset: "pass" }]),
  ...sleeves(ONE, 425, [{ op: "noneOf", attributeId: id(ONE, "type"), optionIds: STRAP_ONLY, whenUnset: "pass" }]),
  field(ONE, "waist_design", 427, fd("One-piece waist design", "원피스 허리 디자인"), ["waist design", "허리선", "엠파이어"], fd("Where and how the waist is defined.", "허리선의 위치와 형태입니다."), "waist design", [
    ["natural", "자연 허리선", "Natural waist", "natural waist"], ["empire", "엠파이어 라인", "Empire waist", "empire waist"], ["drop", "드롭 웨이스트", "Drop waist", "drop waist"],
    ["belted", "벨트 허리", "Belted waist", "belted waist"], ["cinched", "조인 허리", "Cinched waist", "cinched waist"], ["undefined", "허리선 없음", "No defined waist", "no defined waist"],
  ], { custom: false }),
  field(ONE, "hem_length", 428, fd("One-piece hem length", "원피스 기장"), ["hem length", "기장", "미니", "미디", "맥시"], fd("Length of the one-piece garment.", "원피스의 기장입니다."), "hem length", [
    ["mini", "미니", "Mini", "mini-length"], ["above_knee", "무릎 위", "Above-knee", "above-knee"], ["knee", "무릎 길이", "Knee-length", "knee-length"], ["midi", "미디", "Midi", "midi-length"],
    ["ankle", "발목 길이", "Ankle-length", "ankle-length", ["맥시"]], ["floor", "바닥 길이", "Floor-length", "floor-length"],
  ], { custom: false }),
  field(ONE, "skirt_silhouette", 429, fd("One-piece skirt silhouette", "원피스 스커트 실루엣"), ["skirt silhouette", "스커트 라인", "머메이드"], fd("Not offered for jumpsuits, rompers, overalls or dungarees.", "점프슈트·롬퍼·오버올·던가리에는 적용하지 않습니다."), "skirt silhouette", [
    ["a_line", "A라인", "A-line", "A-line"], ["straight", "일자", "Straight", "straight"], ["pencil", "펜슬", "Pencil", "pencil"], ["flared", "플레어", "Flared", "flared"],
    ["full", "풍성한", "Full", "full", ["볼륨"]], ["mermaid", "머메이드", "Mermaid", "mermaid"], ["tiered", "티어드", "Tiered", "tiered", ["캉캉"]],
  ], { custom: false, when: [{ op: "noneOf", attributeId: id(ONE, "type"), optionIds: NO_SKIRT, whenUnset: "pass" }] }),
  details(ONE, 430),
];

// ── Outerwear (11) ───────────────────────────────────────────────────────────
const OUTER: Garment = { key: "outerwear", en: "Outerwear", ko: "아우터", cat: sub("outerwear") };
const NO_CLOSURE = ["poncho", "shawl"];
const outerwear: Attr[] = [
  typeAttr(OUTER, 431, ["outerwear", "아우터", "겉옷", "재킷", "코트", "jacket", "coat"], ["none", "없음", "No outerwear", "no outerwear"], [
    ...g("jackets", t([["jacket", "재킷", "Jacket", "jacket", ["자켓"]], ["denim_jacket", "데님 재킷", "Denim jacket", "denim jacket", ["청자켓"]], ["leather_jacket", "가죽 재킷", "Leather jacket"], ["bomber_jacket", "봄버 재킷", "Bomber jacket", "bomber jacket", ["항공 점퍼"]], ["biker_jacket", "바이커 재킷", "Biker jacket", "biker jacket", ["라이더 재킷"]], ["varsity_jacket", "바시티 재킷", "Varsity jacket", "varsity jacket", ["야구 점퍼"]], ["fleece_jacket", "플리스 재킷", "Fleece jacket", "fleece jacket", ["후리스"]], ["utility_jacket", "유틸리티 재킷", "Utility jacket"], ["puffer_jacket", "패딩 재킷", "Puffer jacket", "puffer jacket", ["패딩", "puffer"]], ["windbreaker", "바람막이", "Windbreaker"]])),
    ...g("tailored", t([["blazer", "블레이저", "Blazer"], ["suit_jacket", "정장 재킷", "Suit jacket", "suit jacket", ["수트 재킷"]], ["cardigan", "카디건", "Cardigan", "cardigan", ["가디건"]]])),
    ...g("coats", t([["trench_coat", "트렌치코트", "Trench coat"], ["overcoat", "오버코트", "Overcoat"], ["peacoat", "피코트", "Peacoat"], ["duffle_coat", "더플코트", "Duffle coat", "duffle coat", ["떡볶이 코트"]], ["parka", "파카", "Parka"], ["raincoat", "레인코트", "Raincoat", "raincoat", ["우비"]]])),
    ...g("wraps", t([["cloak", "클로크", "Cloak", "cloak", ["망토"]], ["cape", "케이프", "Cape"], ["poncho", "판초", "Poncho"], ["shawl", "숄", "Shawl"]])),
  ], [["jackets", "Jackets", "재킷"], ["tailored", "Tailored & knit", "테일러드·니트"], ["coats", "Coats", "코트"], ["wraps", "Cloaks & wraps", "망토·숄"]]),
  colors(OUTER, 432, "primary"),
  colors(OUTER, 433, "secondary"),
  material(OUTER, 434),
  pattern(OUTER, 435),
  fit(OUTER, 436),
  field(OUTER, "length", 437, fd("Outerwear length", "아우터 기장"), ["outerwear length", "아우터 기장", "롱코트"], fd("Length of the outerwear only.", "아우터의 기장입니다."), "length", [
    ["cropped", "크롭", "Cropped", "cropped"], ["waist", "허리 길이", "Waist-length", "waist-length"], ["hip", "엉덩이 길이", "Hip-length", "hip-length"], ["thigh", "허벅지 길이", "Thigh-length", "thigh-length"],
    ["knee", "무릎 길이", "Knee-length", "knee-length"], ["calf", "종아리 길이", "Calf-length", "calf-length"], ["ankle", "발목 길이", "Ankle-length", "ankle-length"],
  ], { custom: false }),
  field(OUTER, "closure_state", 438, fd("Outerwear closure state", "아우터 여밈 상태"), ["open jacket", "여밈", "단추 풀린", "지퍼 올린"], fd("Not offered for ponchos or shawls.", "판초·숄에는 적용하지 않습니다."), "closure", [
    ["open", "열림", "Open", "worn open"], ["partial", "일부 잠김", "Partially closed", "partially closed"], ["closed", "잠김", "Closed", "closed"],
  ], { custom: false, when: [{ op: "noneOf", attributeId: id(OUTER, "type"), optionIds: NO_CLOSURE, whenUnset: "pass" }] }),
  field(OUTER, "closure_type", 439, fd("Outerwear closure type", "아우터 여밈 방식"), ["closure type", "여밈 방식", "단추", "지퍼"], fd("Not offered for ponchos or shawls.", "판초·숄에는 적용하지 않습니다."), "closure type", [
    ["buttons", "단추", "Buttons", "buttons"], ["zipper", "지퍼", "Zipper", "zipper"], ["toggles", "토글", "Toggles", "toggles", ["떡볶이 단추"]], ["belt", "벨트", "Belt", "belt"], ["snaps", "스냅", "Snaps", "snaps", ["똑딱이"]],
  ], { custom: false, when: [{ op: "noneOf", attributeId: id(OUTER, "type"), optionIds: NO_CLOSURE, whenUnset: "pass" }] }),
  field(OUTER, "hood", 440, fd("Outerwear hood", "아우터 후드"), ["hood", "후드", "모자 달린"], fd("“No hood” is an explicit choice. Not offered for shawls.", "‘후드 없음’은 명시적 선택입니다. 숄에는 적용하지 않습니다."), "hood", [
    ["none", "후드 없음", "No hood", "no hood"], ["down", "후드 내림", "Hood down", "hood down"], ["up", "후드 씀", "Hood up", "hood up"],
  ], { custom: false, when: [{ op: "noneOf", attributeId: id(OUTER, "type"), optionIds: ["shawl"], whenUnset: "pass" }] }),
  details(OUTER, 441),
];

// ── Innerwear (4) ────────────────────────────────────────────────────────────
const INNER: Garment = { key: "innerwear", en: "Innerwear", ko: "이너웨어", cat: sub("innerwear") };
const innerwear: Attr[] = [
  typeAttr(INNER, 442, ["innerwear", "이너웨어", "내의", "내복"], ["none", "없음", "No visible innerwear", "no visible innerwear"], [
    ...g("tops", t([["undershirt", "언더셔츠", "Undershirt", "undershirt", ["런닝셔츠"]], ["base_layer", "베이스 레이어", "Base layer", "base layer"], ["thermal", "내복", "Thermal underwear", "thermal underwear", ["발열 내의"]], ["camisole", "캐미솔", "Camisole"]])),
    ...g("support", t([["sports_bra", "스포츠 브라", "Sports bra"], ["everyday_bra", "일상용 브라", "Everyday bra"], ["shapewear", "보정 이너웨어", "Shapewear"]])),
    ...g("bottoms", t([["briefs", "브리프", "Briefs"], ["boxer_briefs", "드로즈", "Boxer briefs", "boxer briefs", ["복서 브리프"]], ["boxer_shorts", "트렁크", "Boxer shorts", "boxer shorts"], ["full_coverage", "풀커버리지 하의", "Full-coverage underwear", "full-coverage underwear"]])),
  ], [["tops", "Undershirts & layers", "언더셔츠·레이어"], ["support", "Support", "브라·보정"], ["bottoms", "Briefs & shorts", "하의 이너"]],
  fd("Neutral garment classification for fashion design. The existing safety policy (incl. minor protection) applies unchanged.", "패션 디자인을 위한 중립적인 의복 분류입니다. 기존 안전 정책(미성년자 보호 포함)이 그대로 적용됩니다.")),
  colors(INNER, 443, "primary"),
  material(INNER, 444),
  pattern(INNER, 445),
];

// ── Footwear (8) ─────────────────────────────────────────────────────────────
const FOOT: Garment = { key: "footwear", en: "Footwear", ko: "신발", cat: sub("footwear") };
const footwear: Attr[] = [
  typeAttr(FOOT, 446, ["footwear", "shoes", "신발", "구두", "운동화"], ["none", "없음", "No footwear", "no footwear", ["barefoot", "맨발"]], [
    ...g("sneakers", t([["sneakers", "스니커즈", "Sneakers", "sneakers", ["운동화"]], ["running_shoes", "러닝화", "Running shoes"], ["high_tops", "하이탑 스니커즈", "High-top sneakers"], ["canvas_shoes", "캔버스화", "Canvas shoes", "canvas shoes", ["단화"]]])),
    ...g("shoes", t([["loafers", "로퍼", "Loafers"], ["oxford_shoes", "옥스퍼드화", "Oxford shoes"], ["derby_shoes", "더비 슈즈", "Derby shoes"], ["brogues", "브로그", "Brogues"], ["dress_shoes", "정장 구두", "Dress shoes", "dress shoes", ["구두"]], ["ballet_flats", "플랫 슈즈", "Ballet flats", "ballet flats", ["발레리나 슈즈"]], ["mary_janes", "메리제인", "Mary Janes", "Mary Jane shoes"], ["pumps", "펌프스", "Pumps", "pumps", ["하이힐"]], ["platform_shoes", "플랫폼 슈즈", "Platform shoes", "platform shoes", ["통굽"]], ["clogs", "클로그", "Clogs"]])),
    ...g("boots", t([["ankle_boots", "앵클 부츠", "Ankle boots"], ["chelsea_boots", "첼시 부츠", "Chelsea boots"], ["knee_high_boots", "니하이 부츠", "Knee-high boots", "knee-high boots", ["롱부츠"]], ["combat_boots", "컴뱃 부츠", "Combat boots", "combat boots", ["워커"]], ["hiking_boots", "등산화", "Hiking boots"], ["cowboy_boots", "카우보이 부츠", "Cowboy boots", "cowboy boots", ["웨스턴 부츠"]]])),
    ...g("open", t([["sandals", "샌들", "Sandals"], ["strappy_sandals", "스트랩 샌들", "Strappy sandals"], ["slides", "슬라이드", "Slides", "slide sandals", ["슬리퍼"]], ["flip_flops", "플립플롭", "Flip-flops", "flip-flops", ["쪼리"]], ["slippers", "실내화", "Slippers", "slippers", ["룸슈즈"]]])),
  ], [["sneakers", "Sneakers", "스니커즈"], ["shoes", "Shoes", "구두·단화"], ["boots", "Boots", "부츠"], ["open", "Sandals & slippers", "샌들·슬리퍼"]]),
  colors(FOOT, 447, "primary"),
  colors(FOOT, 448, "secondary"),
  material(FOOT, 449),
  field(FOOT, "heel_height", 450, fd("Footwear heel height", "신발 굽 높이"), ["heel height", "굽 높이", "굽", "힐"], fd("Relative heel height.", "상대적인 굽 높이입니다."), "heel height", [
    ["flat", "플랫", "Flat", "flat"], ["low", "낮은 굽", "Low", "low-heeled"], ["medium", "중간 굽", "Medium", "medium-heeled"], ["high", "높은 굽", "High", "high-heeled"],
  ], { custom: false }),
  field(FOOT, "heel_type", 451, fd("Footwear heel type", "신발 굽 형태"), ["heel type", "굽 형태", "웨지", "스틸레토"], fd("Not offered when the heel height is “flat”.", "굽 높이가 ‘플랫’이면 출력하지 않습니다."), "heel type", [
    ["block", "블록 힐", "Block heel", "block heel"], ["wedge", "웨지 힐", "Wedge heel", "wedge heel"], ["stiletto", "스틸레토 힐", "Stiletto heel", "stiletto heel"], ["platform", "플랫폼", "Platform", "platform"],
  ], { custom: false, when: [{ op: "noneOf", attributeId: id(FOOT, "heel_height"), optionIds: ["flat"], whenUnset: "pass" }] }),
  field(FOOT, "toe_shape", 452, fd("Footwear toe shape", "신발 앞코 형태"), ["toe shape", "앞코", "뾰족코"], fd("Shape of the toe.", "신발 앞코의 형태입니다."), "toe shape", [
    ["rounded", "라운드 토", "Rounded", "rounded toe"], ["pointed", "포인티드 토", "Pointed", "pointed toe", ["뾰족코"]], ["square", "스퀘어 토", "Square", "square toe"], ["open", "오픈 토", "Open toe", "open toe"],
  ], { custom: false }),
  field(FOOT, "closure", 453, fd("Footwear closure", "신발 여밈 방식"), ["shoe closure", "끈", "벨크로", "슬립온"], fd("How the footwear is fastened.", "신발을 여미는 방식입니다."), "closure", [
    ["lace_up", "끈", "Lace-up", "lace-up"], ["slip_on", "슬립온", "Slip-on", "slip-on"], ["buckle", "버클", "Buckle", "buckle"], ["zipper", "지퍼", "Zipper", "zipper"], ["strap", "스트랩", "Strap", "strap", ["벨크로"]],
  ], { custom: false }),
];

// ── Hosiery (6) ──────────────────────────────────────────────────────────────
const HOSE: Garment = { key: "hosiery", en: "Hosiery", ko: "양말·스타킹", cat: sub("hosiery") };
const TIGHTS = ["tights", "opaque_tights", "sheer_tights", "stockings"];
/** Types whose name already states the length. */
const LENGTH_NAMED = ["no_show", "ankle", "crew", "mid_calf", "knee_high", "over_the_knee", "tights", "opaque_tights", "sheer_tights"];
const hosiery: Attr[] = [
  typeAttr(HOSE, 454, ["socks", "hosiery", "양말", "스타킹", "타이츠"], ["none", "없음", "No socks or hosiery", "no socks or hosiery"], [
    ...g("socks", t([["no_show", "덧신 양말", "No-show socks", "no-show socks", ["페이크삭스"]], ["ankle", "발목 양말", "Ankle socks"], ["crew", "크루 양말", "Crew socks", "crew socks", ["중목 양말"]], ["mid_calf", "종아리 양말", "Mid-calf socks"], ["knee_high", "니삭스", "Knee-high socks", "knee-high socks", ["무릎 양말"]], ["over_the_knee", "오버니삭스", "Over-the-knee socks"], ["compression", "압박 양말", "Compression socks"]])),
    ...g("tights", t([["tights", "타이츠", "Tights"], ["opaque_tights", "불투명 타이츠", "Opaque tights"], ["sheer_tights", "비침 타이츠", "Sheer tights"], ["stockings", "스타킹", "Stockings"]])),
    ...g("other", t([["leg_warmers", "레그 워머", "Leg warmers"]])),
  ], [["socks", "Socks", "양말"], ["tights", "Tights & stockings", "타이츠·스타킹"], ["other", "Other", "기타"]]),
  colors(HOSE, 455, "primary"),
  pattern(HOSE, 456),
  field(HOSE, "length", 457, fd("Hosiery length", "양말·스타킹 길이"), ["sock length", "양말 길이", "스타킹 길이"], fd("Only when the type does not already state its length (stockings, compression socks, leg warmers, custom or unset).", "종류에 길이가 이미 정해지지 않은 경우(스타킹·압박 양말·레그 워머·사용자 정의·미설정)에만 적용합니다."), "length", [
    ["ankle", "발목", "Ankle", "ankle-length"], ["mid_calf", "종아리 중간", "Mid-calf", "mid-calf"], ["knee", "무릎", "Knee-high", "knee-high"], ["over_knee", "무릎 위", "Over-the-knee", "over-the-knee"],
    ["thigh", "허벅지", "Thigh-high", "thigh-high"], ["waist", "허리", "Waist-high", "waist-high"],
  ], { custom: false, when: [{ op: "noneOf", attributeId: id(HOSE, "type"), optionIds: LENGTH_NAMED, whenUnset: "pass" }] }),
  field(HOSE, "opacity", 458, fd("Hosiery opacity", "스타킹 비침 정도"), ["opacity", "비침", "불투명"], fd("Only for tights and stockings (or when the type is unset).", "타이츠·스타킹(또는 종류 미설정)에만 적용합니다."), "opacity", [
    ["sheer", "비침", "Sheer", "sheer"], ["semi_opaque", "반투명", "Semi-opaque", "semi-opaque"], ["opaque", "불투명", "Opaque", "opaque"],
  ], { custom: false, when: [{ op: "anyOf", attributeId: id(HOSE, "type"), optionIds: TIGHTS, whenUnset: "pass" }] }),
  degree(id(HOSE, "thickness"), 459, HOSE.cat, fd("Hosiery thickness", "양말·스타킹 두께"), ["thickness", "두께", "도톰한 양말"], SLIDER("Thickness of the hosiery.", "양말·스타킹의 두께입니다."), "Hosiery thickness: {value}.", [
    ["아주 얇음", "Very thin", "very thin"], ["얇음", "Thin", "thin"], ["보통", "Medium", "medium thickness"], ["두꺼움", "Thick", "thick"], ["아주 두꺼움", "Very thick", "very thick"],
  ], notNoneType(HOSE)),
];

export const clothingAttributes: Attr[] = [...general, ...tops, ...bottoms, ...onePiece, ...outerwear, ...innerwear, ...footwear, ...hosiery];

const hoseConflict = (type: string, opacities: string[], en: string, ko: string): Rule => ({
  id: `clothing-hosiery-${type.replace(/_/g, "-")}-vs-opacity`,
  kind: "conflict",
  severity: "warning",
  when: [
    { op: "anyOf", attributeId: id(HOSE, "type"), optionIds: [type] },
    { op: "anyOf", attributeId: id(HOSE, "opacity"), optionIds: opacities },
  ],
  involves: [id(HOSE, "type"), id(HOSE, "opacity")],
  message: { en, ko },
  guidance: { en: "Neither value is changed automatically. Adjust the type or the opacity.", ko: "어느 값도 자동으로 바꾸지 않습니다. 종류나 비침 정도를 고치세요." },
});

/** Only real contradictions; garment combinations (one-piece + top, layering) are never diagnosed. */
export const clothingRules: Rule[] = [
  hoseConflict("opaque_tights", ["sheer", "semi_opaque"], "Opaque tights are set with a sheer opacity.", "불투명 타이츠인데 비침 정도가 비치는 쪽으로 설정되었습니다."),
  hoseConflict("sheer_tights", ["opaque"], "Sheer tights are set with an opaque opacity.", "비침 타이츠인데 비침 정도가 불투명으로 설정되었습니다."),
];
