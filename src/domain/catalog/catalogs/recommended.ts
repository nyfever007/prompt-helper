import type { CatalogInput } from "../schema";

/**
 * Recommended concepts (Sprint 2-D.5) — product presets that suggest the OVERALL DIRECTION of an image:
 * style, scene, mood, framing, camera, lighting, aspect ratio and, for person concepts, wardrobe style,
 * posture or action. They reuse the preset system (plan → confirm → apply, origin, undo).
 *
 * Rules (Sprint 2-D.5 directive §2):
 * - A concept never fills every attribute.
 * - It never infers race/species, gender, nationality, age, body, face, skin, hair or appearance
 *   (unit-tested: no patch under person.identity / body / face / eyes / eyebrows / nose / lips / skin /
 *   hair / facial_hair / appearance / makeup / expression).
 * - Only person-themed concepts (a character, a portrait, a model, an athlete) set the subject to one person.
 * - Values the user set are kept by default (`keepUser` apply mode in the Recommended mode).
 * Presets without `categoryId` are concepts; category presets (fixture catalog) keep their category.
 */
type Preset = NonNullable<CatalogInput["presets"]>[number];
type Patch = Preset["patches"][number];
const s = (attributeId: string, optionId: string): Patch => ({ attributeId, value: { kind: "single", optionId } });
const m = (attributeId: string, ...optionIds: string[]): Patch => ({ attributeId, value: { kind: "multi", optionIds } });
const n = (attributeId: string, value: number): Patch => ({ attributeId, value: { kind: "number", value } });
const concept = (id: string, en: string, ko: string, descEn: string, descKo: string, patches: Patch[]): Preset => ({
  id: `concept_${id}`,
  version: "1.0.0",
  status: "approved",
  label: { en, ko },
  description: { en: descEn, ko: descKo },
  provenance: { source: "Prompter recommended concepts", note: "Sprint 2-D.5 — designed from the core catalog; no AI" },
  patches,
});
const PERSON = s("subject.kind", "person");

export const recommendedPresets: Preset[] = [
  concept("natural_lifestyle", "Natural Lifestyle", "자연스러운 일상", "Everyday moments in soft daylight, like a candid photo at home.", "집 안의 부드러운 자연광 속 일상의 한순간, 꾸미지 않은 사진처럼.", [
    s("style.preset", "photography"),
    s("style.realism", "photorealistic"),
    s("scene.setting", "home_interior"),
    s("scene.background", "blurred"),
    m("mood.tone", "calm", "cozy"),
    s("composition.framing", "upper_body"),
    s("camera.lens_type", "standard"),
    n("camera.depth_of_field", 2),
    s("lighting.preset", "natural_daylight"),
    s("output.aspect_ratio", "portrait_4_5"),
  ]),
  concept("fashion_editorial", "Fashion Editorial", "패션 화보", "A magazine-style studio shoot: full figure, strong lines, controlled light.", "잡지 화보 같은 스튜디오 촬영: 전신, 선이 강한 구도, 정돈된 조명.", [
    PERSON,
    s("style.preset", "photography"),
    s("scene.setting", "studio"),
    s("scene.background", "plain"),
    m("mood.tone", "dramatic"),
    s("composition.framing", "full_body"),
    s("camera.angle", "low_angle"),
    s("camera.focal_length", "mm_85"),
    s("lighting.preset", "studio_softbox"),
    s("lighting.contrast", "high"),
    m("person.clothing.fashion_style", "haute_couture"),
    s("person.pose.posture", "standing"),
    s("output.aspect_ratio", "portrait_2_3"),
  ]),
  concept("cinematic_character", "Cinematic Character", "영화 속 주인공", "A film-still look: widescreen, off-centre framing, moody contrast and a rim of light.", "영화 스틸 같은 느낌: 와이드 화면, 삼분할 배치, 대비 있는 조명과 림 라이트.", [
    PERSON,
    s("style.preset", "cinematic_still"),
    m("style.aesthetic", "cinematic"),
    m("mood.tone", "dramatic"),
    s("composition.framing", "upper_body"),
    m("composition.layout", "rule_of_thirds"),
    s("camera.focal_length", "mm_50"),
    n("camera.depth_of_field", 2),
    s("lighting.direction", "three_quarter"),
    s("lighting.contrast", "high"),
    s("lighting.rim", "moderate"),
    s("output.aspect_ratio", "ultrawide_21_9"),
  ]),
  concept("fantasy_character", "Fantasy Character", "판타지 캐릭터", "An illustrated hero in a fantasy world, seen from below with shafts of light.", "판타지 세계의 일러스트 주인공, 아래에서 올려다본 구도와 빛줄기.", [
    PERSON,
    s("style.preset", "fantasy_art"),
    m("style.aesthetic", "fantasy"),
    s("scene.setting", "fantasy_world"),
    m("mood.tone", "epic", "mysterious"),
    s("composition.framing", "full_body"),
    s("camera.angle", "low_angle"),
    s("lighting.volumetric", "moderate"),
    s("lighting.rim", "subtle"),
    m("person.clothing.fashion_style", "fantasy"),
    s("output.aspect_ratio", "portrait_2_3"),
  ]),
  concept("cyberpunk", "Cyberpunk", "미래 도시", "A neon-lit future city street at night, wide and atmospheric.", "네온이 빛나는 밤의 미래 도시 거리, 넓고 분위기 있게.", [
    s("style.preset", "cyberpunk_art"),
    m("style.aesthetic", "cyberpunk"),
    s("scene.setting", "city_street"),
    m("mood.tone", "mysterious", "tense"),
    s("composition.framing", "wide_shot"),
    s("camera.angle", "low_angle"),
    s("lighting.preset", "neon"),
    s("lighting.color_temperature", "mixed_color"),
    s("output.aspect_ratio", "landscape_16_9"),
  ]),
  concept("romance_webtoon", "Romance Webtoon", "로맨스 웹툰", "A soft, warm webtoon panel with a romantic mood and gentle bokeh.", "부드럽고 따뜻한 웹툰 한 컷, 로맨틱한 분위기와 은은한 보케.", [
    s("style.preset", "webtoon"),
    m("mood.tone", "romantic"),
    s("scene.background", "blurred"),
    s("composition.framing", "upper_body"),
    s("camera.bokeh", "circular"),
    s("lighting.softness", "very_soft"),
    s("lighting.color_temperature", "warm"),
    s("output.aspect_ratio", "portrait_9_16"),
  ]),
  concept("professional_portrait", "Professional Portrait", "비즈니스 프로필", "A clean head-and-shoulders profile photo with flattering studio light.", "깔끔한 바스트 샷 프로필 사진, 은은한 스튜디오 조명.", [
    PERSON,
    s("style.preset", "photography"),
    s("style.realism", "photorealistic"),
    s("scene.setting", "studio"),
    s("scene.background", "gradient"),
    m("mood.tone", "calm"),
    s("composition.framing", "head_and_shoulders"),
    s("camera.focal_length", "mm_85"),
    s("lighting.preset", "studio_softbox"),
    s("lighting.fill", "moderate"),
    m("person.clothing.fashion_style", "business"),
    s("output.aspect_ratio", "portrait_4_5"),
  ]),
  concept("vintage_film", "Vintage Film", "빈티지 감성", "The warm, grainy look of an old film photograph.", "따뜻하고 거친 입자의 오래된 필름 사진 느낌.", [
    s("style.preset", "film_photography"),
    m("style.technique", "film_grain"),
    m("style.aesthetic", "retro"),
    m("mood.tone", "nostalgic"),
    s("lighting.color_temperature", "warm"),
    s("lighting.contrast", "low"),
    s("output.aspect_ratio", "landscape_3_2"),
  ]),
  concept("dreamlike_art", "Dreamlike Art", "몽환적인 이미지", "A surreal, soft-focus scene with open space and floating light.", "초현실적이고 부드러운 초점, 넉넉한 여백과 떠다니는 빛.", [
    s("style.movement", "surrealism"),
    s("style.realism", "semi_realistic"),
    m("mood.tone", "whimsical", "mysterious"),
    n("composition.negative_space", 4),
    n("camera.depth_of_field", 1),
    s("camera.bokeh", "circular"),
    s("lighting.softness", "very_soft"),
    s("lighting.color_temperature", "cool"),
    s("lighting.volumetric", "subtle"),
    s("output.aspect_ratio", "square"),
  ]),
  concept("travel_outdoor", "Travel & Outdoor", "여행 및 아웃도어", "A wide mountain view in golden-hour light, composed on the thirds.", "황금빛 시간대의 넓은 산 풍경, 삼분할 구도.", [
    s("style.preset", "photography"),
    s("scene.setting", "mountains"),
    m("mood.tone", "epic"),
    s("composition.framing", "wide_shot"),
    m("composition.layout", "rule_of_thirds"),
    s("camera.lens_type", "wide"),
    s("lighting.preset", "golden_hour"),
    s("output.aspect_ratio", "landscape_16_9"),
  ]),
  concept("sports_action", "Sports & Action", "스포츠 및 액션", "A dynamic moment: running, a long lens, a hint of motion blur.", "역동적인 순간: 달리는 동작, 망원 렌즈, 약간의 모션 블러.", [
    PERSON,
    s("style.preset", "photography"),
    m("mood.tone", "energetic"),
    s("composition.framing", "full_body"),
    s("camera.angle", "low_angle"),
    s("camera.focal_length", "mm_200"),
    s("camera.motion_blur", "subtle"),
    s("lighting.preset", "midday_sun"),
    m("person.pose.action", "running"),
    m("person.clothing.fashion_style", "sportswear"),
    s("output.aspect_ratio", "landscape_3_2"),
  ]),
  concept("artistic_portrait", "Artistic Portrait", "예술적 인물화", "A painted portrait with visible brushwork and a quiet, low-key light.", "붓 터치가 살아 있는 유화 인물화, 차분한 로우키 조명.", [
    PERSON,
    s("style.preset", "oil_painting"),
    m("style.technique", "painterly_brushwork"),
    s("scene.background", "plain"),
    m("mood.tone", "calm"),
    s("composition.framing", "head_and_shoulders"),
    s("lighting.preset", "low_key"),
    s("output.aspect_ratio", "portrait_4_5"),
  ]),
];
