import type { Condition } from "../../schema";
import { fd, noneWithOthers, shape, type Attr, type L, type O, type Rule } from "./builders";
import { GARMENT_COLORS, GARMENT_COLOR_GROUPS } from "./clothing";

/**
 * Sprint 2-B.5C — Person › Accessories (18). Specification: docs/catalogs/person/accessories.md.
 *
 * - Every attribute has an explicit “none”, distinct from unset (“Earrings: none.”).
 * - Accessories worn together are multi-select; “none” with other entries is a
 *   non-blocking warning. No eyewear hides frame shape/color, no hat hides hat color
 *   (values kept).
 * - Nothing adds other accessories; nothing is limited by gender, occupation,
 *   nationality or social status; no brands. Left/right settings, repeated objects
 *   and detailed materials/gemstones are later extensions.
 */

const P = "person.accessories.";
const CAT = "person_accessories";

export const ACCESSORIES_CATEGORY_DESCRIPTION: L = fd(
  "Accessories, each with an explicit “none”. Nothing adds other accessories; never limited by gender, occupation, nationality or status; no brands.",
  "액세서리이며 각각 명시적인 ‘없음’이 있습니다. 다른 액세서리를 자동으로 추가하지 않고 성별·직업·국적·지위로 제한하지 않으며 브랜드를 만들지 않습니다.",
);

const NONE: O = ["none", "없음", "None", "none"];
const opts = (rows: Array<[string, string, string, string[]?]>): O[] => [NONE, ...rows.map(([id, ko, en, aliases]): O => [id, ko, en, en.toLowerCase(), aliases ?? []])];
const without = (attributeId: string): Condition[] => [{ op: "noneOf", attributeId, optionIds: ["none"], whenUnset: "pass" }];
const acc = (key: string, order: number, label: L, aliases: string[], noun: string, rows: Array<[string, string, string, string[]?]>, o: { multi?: boolean; searchable?: boolean; note?: L } = {}) =>
  shape(
    `${P}${key}`,
    order,
    CAT,
    label,
    aliases,
    o.note ?? (o.multi ? fd("Combinable; “none” is an explicit choice.", "함께 고를 수 있으며 ‘없음’은 명시적 선택입니다.") : fd("“None” is an explicit choice, distinct from unset.", "‘없음’은 미설정과 다른 명시적 선택입니다.")),
    `${noun}: {value}.`,
    opts(rows),
    { ...(o.multi ? { multi: true } : {}), ...(o.searchable ? { control: "searchable" as const } : {}) },
  );
const palette = (key: string, order: number, label: L, aliases: string[], noun: string, parent: string, parentLabel: L) =>
  shape(
    `${P}${key}`,
    order,
    CAT,
    label,
    aliases,
    fd(`Shared color palette. Not output when ${parentLabel.en} is “none”.`, `공통 색상 팔레트입니다. ${parentLabel.ko}이(가) ‘없음’이면 출력하지 않습니다.`),
    `${noun}: {value}.`,
    GARMENT_COLORS,
    { control: "color", groups: GARMENT_COLOR_GROUPS, when: without(`${P}${parent}`) },
  );

export const accessoriesAttributes: Attr[] = [
  acc("eyewear", 460, fd("Eyewear", "안경"), ["glasses", "eyewear", "안경", "선글라스", "고글"], "Eyewear", [
    ["eyeglasses", "안경", "Eyeglasses", ["glasses"]], ["sunglasses", "선글라스", "Sunglasses", ["색안경"]], ["reading_glasses", "돋보기안경", "Reading glasses", ["돋보기"]],
    ["protective_goggles", "보호 고글", "Protective goggles", ["보안경"]], ["fashion_goggles", "패션 고글", "Fashion goggles"], ["monocle", "외알 안경", "Monocle", ["모노클"]],
  ], { note: fd("“None” hides the frame shape and color (values kept).", "‘없음’이면 안경테 형태·색상을 출력하지 않습니다(값 보존).") }),
  shape(`${P}frame_shape`, 461, CAT, fd("Frame shape", "안경테 형태"), ["frame shape", "안경테", "뿔테", "무테"], fd("Not output when eyewear is “none”.", "안경이 ‘없음’이면 출력하지 않습니다."), "Eyewear frame shape: {value}.", [
    ["round", "둥근", "Round", "round frames", ["동그란 안경"]], ["oval", "타원", "Oval", "oval frames"], ["rectangular", "직사각", "Rectangular", "rectangular frames"], ["square", "사각", "Square", "square frames"],
    ["cat_eye", "캣아이", "Cat-eye", "cat-eye frames"], ["aviator", "보잉", "Aviator", "aviator frames", ["에비에이터"]], ["browline", "하금테", "Browline", "browline frames", ["브로우라인"]],
    ["rimless", "무테", "Rimless", "rimless frames"], ["geometric", "기하학", "Geometric", "geometric frames", ["다각형"]],
  ], { when: without(`${P}eyewear`) }),
  palette("frame_color", 462, fd("Frame color", "안경테 색상"), ["frame color", "안경테 색"], "Eyewear frame color", "eyewear", fd("eyewear", "안경")),
  acc("hat", 463, fd("Hat", "모자"), ["hat", "cap", "모자", "캡", "비니"], "Hat", [
    ["baseball_cap", "야구 모자", "Baseball cap", ["볼캡"]], ["flat_cap", "헌팅캡", "Flat cap", ["플랫캡"]], ["beanie", "비니", "Beanie"], ["beret", "베레모", "Beret"], ["fedora", "페도라", "Fedora", ["중절모"]],
    ["bucket_hat", "버킷햇", "Bucket hat", ["벙거지"]], ["straw_hat", "밀짚모자", "Straw hat"], ["sun_hat", "챙 넓은 모자", "Sun hat", ["썬햇"]], ["cowboy_hat", "카우보이모자", "Cowboy hat"],
    ["top_hat", "실크햇", "Top hat"], ["bowler_hat", "볼러햇", "Bowler hat"], ["bonnet", "보닛", "Bonnet"], ["headscarf", "머릿수건", "Headscarf", ["두건"]],
  ], { searchable: true, note: fd("“None” hides the hat color (value kept).", "‘없음’이면 모자 색상을 출력하지 않습니다(값 보존).") }),
  palette("hat_color", 464, fd("Hat color", "모자 색상"), ["hat color", "모자 색"], "Hat color", "hat", fd("the hat", "모자")),
  acc("hair_accessories", 465, fd("Hair accessories", "헤어 액세서리"), ["hair accessory", "헤어 액세서리", "머리핀", "머리띠", "곱창"], "Hair accessories", [
    ["hairpin", "실핀", "Hairpin", ["머리핀"]], ["barrette", "바레트", "Barrette"], ["hair_clip", "헤어핀", "Hair clip", ["똑딱핀"]], ["claw_clip", "집게핀", "Claw clip"], ["headband", "머리띠", "Headband"],
    ["ribbon", "헤어 리본", "Hair ribbon", ["리본"]], ["scrunchie", "곱창 밴드", "Scrunchie", ["스크런치"]], ["comb", "장식 빗", "Decorative hair comb", ["뒤꽂이"]], ["floral", "꽃 장식", "Floral hair accessory", ["화관"]],
  ], { multi: true }),
  acc("earrings", 466, fd("Earrings", "귀걸이"), ["earrings", "귀걸이", "이어링"], "Earrings", [
    ["stud", "스터드", "Stud earrings", ["피어스"]], ["hoop", "링 귀걸이", "Hoop earrings", ["후프"]], ["drop", "드롭 귀걸이", "Drop earrings"], ["dangle", "댕글 귀걸이", "Dangle earrings", ["롱 귀걸이"]],
    ["chandelier", "샹들리에 귀걸이", "Chandelier earrings"], ["ear_cuff", "이어 커프", "Ear cuffs", ["이어커프"]],
  ], { multi: true }),
  acc("necklace", 467, fd("Necklace", "목걸이"), ["necklace", "목걸이", "펜던트"], "Necklace", [
    ["chain", "체인 목걸이", "Chain necklace"], ["pendant", "펜던트 목걸이", "Pendant necklace"], ["choker", "초커", "Choker"], ["pearl", "진주 목걸이", "Pearl necklace"], ["beaded", "비즈 목걸이", "Beaded necklace"],
    ["layered", "레이어드 목걸이", "Layered necklaces"], ["locket", "로켓 목걸이", "Locket", ["사진 목걸이"]],
  ], { multi: true }),
  acc("bracelets", 468, fd("Bracelets", "팔찌"), ["bracelet", "팔찌", "뱅글"], "Bracelets", [
    ["chain", "체인 팔찌", "Chain bracelet"], ["bangle", "뱅글", "Bangle"], ["cuff", "커프 팔찌", "Cuff bracelet"], ["beaded", "비즈 팔찌", "Beaded bracelet"], ["leather", "가죽 팔찌", "Leather bracelet"], ["charm", "참 팔찌", "Charm bracelet"],
  ], { multi: true }),
  acc("rings", 469, fd("Rings", "반지"), ["ring", "반지", "링"], "Rings", [
    ["simple", "심플 반지", "Simple ring"], ["gemstone", "보석 반지", "Gemstone ring"], ["signet", "시그넷 반지", "Signet ring", ["인장 반지"]], ["band", "밴드 반지", "Band ring", ["커플링"]], ["multiple", "여러 개의 반지", "Multiple rings", ["레이어드 반지"]],
  ], { multi: true }),
  acc("watch", 470, fd("Watch", "시계"), ["watch", "시계", "손목시계"], "Watch", [
    ["analog", "아날로그 손목시계", "Analog wristwatch"], ["digital", "디지털 손목시계", "Digital wristwatch", ["전자시계"]], ["smartwatch", "스마트워치", "Smartwatch"], ["pocket", "회중시계", "Pocket watch"],
  ]),
  acc("belt", 471, fd("Belt", "벨트"), ["belt", "벨트", "허리띠"], "Belt", [
    ["leather", "가죽 벨트", "Leather belt"], ["fabric", "천 벨트", "Fabric belt"], ["woven", "꼬임 벨트", "Woven belt"], ["decorative", "장식 벨트", "Decorative belt"], ["chain", "체인 벨트", "Chain belt"],
  ]),
  acc("bag", 472, fd("Bag", "가방"), ["bag", "가방", "백팩", "핸드백"], "Bag", [
    ["backpack", "백팩", "Backpack", ["책가방"]], ["shoulder", "숄더백", "Shoulder bag"], ["crossbody", "크로스백", "Crossbody bag"], ["tote", "토트백", "Tote bag", ["에코백"]], ["clutch", "클러치", "Clutch bag"],
    ["messenger", "메신저백", "Messenger bag"], ["briefcase", "서류 가방", "Briefcase"], ["satchel", "새철백", "Satchel"], ["waist", "힙색", "Waist bag", ["웨이스트백"]], ["handbag", "핸드백", "Handbag"],
  ], { searchable: true }),
  acc("scarf", 473, fd("Scarf", "스카프·머플러"), ["scarf", "스카프", "머플러", "목도리"], "Scarf", [
    ["silk", "실크 스카프", "Silk scarf"], ["knitted", "니트 머플러", "Knitted scarf", ["목도리"]], ["wool", "울 머플러", "Wool scarf"], ["neck", "넥 스카프", "Neck scarf", ["쁘띠 스카프"]], ["shawl", "숄", "Shawl"], ["bandana", "반다나", "Bandana", ["두건"]],
  ]),
  acc("gloves", 474, fd("Gloves", "장갑"), ["gloves", "장갑", "벙어리장갑"], "Gloves", [
    ["leather", "가죽 장갑", "Leather gloves"], ["knitted", "니트 장갑", "Knitted gloves"], ["dress", "드레스 장갑", "Dress gloves", ["오페라 장갑"]], ["fingerless", "손가락 없는 장갑", "Fingerless gloves"], ["mittens", "벙어리장갑", "Mittens"],
  ]),
  acc("necktie", 475, fd("Necktie", "넥타이"), ["tie", "necktie", "넥타이", "나비넥타이"], "Neckwear", [
    ["necktie", "넥타이", "Necktie"], ["bow_tie", "나비넥타이", "Bow tie", ["보타이"]], ["bolo_tie", "볼로 타이", "Bolo tie"], ["cravat", "크라바트", "Cravat"],
  ]),
  acc("piercings", 476, fd("Piercings", "피어싱"), ["piercing", "피어싱"], "Piercings", [
    ["ear", "귀 피어싱", "Ear piercing"], ["nose_stud", "코 스터드", "Nose stud"], ["nose_ring", "코걸이", "Nose ring"], ["septum", "셉텀 피어싱", "Septum piercing"], ["eyebrow", "눈썹 피어싱", "Eyebrow piercing"], ["lip", "입술 피어싱", "Lip piercing"],
  ], { multi: true }),
  acc("decorative", 477, fd("Decorative accessories", "장식 소품"), ["brooch", "decorative", "브로치", "장식", "커프스"], "Decorative accessories", [
    ["brooch", "브로치", "Brooch"], ["lapel_pin", "라펠 핀", "Lapel pin"], ["badge", "배지", "Badge"], ["cufflinks", "커프스 단추", "Cufflinks", ["커프스"]], ["pocket_square", "포켓 스퀘어", "Pocket square", ["행커치프"]], ["chain", "장식 체인", "Decorative chain"],
  ], { multi: true }),
];

const MULTI: Array<[string, L]> = [
  ["hair_accessories", fd("hair accessories", "헤어 액세서리")],
  ["earrings", fd("earrings", "귀걸이")],
  ["necklace", fd("necklace", "목걸이")],
  ["bracelets", fd("bracelets", "팔찌")],
  ["rings", fd("rings", "반지")],
  ["piercings", fd("piercings", "피어싱")],
  ["decorative", fd("decorative accessories", "장식 소품")],
];
export const accessoriesRules: Rule[] = MULTI.map(([key, what]) => noneWithOthers(`${P}${key}`, "none", `accessories-${key.replace(/_/g, "-")}-none-with-others`, what));
