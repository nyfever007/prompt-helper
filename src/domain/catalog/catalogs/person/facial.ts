import { DOWN_UP_TURNED, LENGTH, LOW_HIGH, NARROW_BROAD, NARROW_WIDE, SIZE, SLIDER, SPARSE_DENSE, THIN_FULL, THIN_THICK, degree, fd, opposite as oppositeIn, pairsOf, shape, type Attr, type L, type Rule } from "./builders";

/**
 * Person › Face, Eyes, Eyebrows, Nose, Lips (Sprint 2-B.2) — APPROVED initial product vocabulary.
 * Specification: docs/catalogs/person/{face,eyes,eyebrows,nose,lips}.md.
 *
 * Principles (CATALOG_DESIGN_STANDARD §3, Sprint 2-B.2 approval §4):
 * - Every attribute is an independent Direct visual axis. Nothing here sets another
 *   attribute, and nothing links features to expression, personality, impression,
 *   attractiveness, gender, nationality or ethnic background.
 * - Shapes are chips/lists; relative sizes/angles/thickness/density are `degree`
 *   sliders with qualitative bands (the number is never presented as a measurement,
 *   and a displayed slider position is never stored).
 * - Traits that can coexist (e.g. high AND prominent cheekbones) are multi-select;
 *   only genuinely opposite pairs get a non-blocking conflict notice.
 * - Natural lip color is not makeup; iris/eyebrow/lip colors use the palette control.
 */

export const FACIAL_CATEGORY_DESCRIPTIONS: Record<string, L> = {
  person_face: fd("Facial outline and structure. Nothing here changes expression, impression or attractiveness.", "얼굴 윤곽과 구조입니다. 표정·인상·매력도를 바꾸지 않습니다."),
  person_eyes: fd("Eye shape, size, placement, eyelids, iris, pupils and lashes — each independent.", "눈 모양·크기·위치·눈꺼풀·홍채·동공·속눈썹이며 서로 독립적입니다."),
  person_eyebrows: fd("Eyebrow shape, angle, size, placement and color — each independent.", "눈썹 모양·각도·크기·위치·색상이며 서로 독립적입니다."),
  person_nose: fd("Overall nose shape and its detailed structure.", "코의 전체 모양과 세부 구조입니다."),
  person_lips: fd("Lip shape, fullness, proportion and natural color (not makeup).", "입술 모양·두께·비율·자연 색상입니다(메이크업 아님)."),
};

// ── Face (10) ────────────────────────────────────────────────────────────────
const F = "person_face";
const face: Attr[] = [
  shape("person.face.shape", 217, F, fd("Face shape", "얼굴형"), ["face outline", "윤곽", "얼굴 모양"], fd("Overall outline. Does not set the jawline, cheekbones or cheeks.", "전체 윤곽입니다. 턱선·광대·볼을 자동으로 정하지 않습니다."), "Face shape: {value}.", [
    ["oval", "계란형", "Oval", "oval", ["달걀형"]],
    ["round", "둥근형", "Round", "round"],
    ["square", "각진형", "Square", "square", ["사각형"]],
    ["rectangular", "직사각형", "Rectangular", "rectangular", ["oblong", "긴 얼굴형"]],
    ["heart", "하트형", "Heart-shaped", "heart-shaped"],
    ["diamond", "다이아몬드형", "Diamond-shaped", "diamond-shaped", ["마름모형"]],
    ["triangular", "삼각형", "Triangular", "triangular"],
    ["inverted_triangular", "역삼각형", "Inverted triangular", "inverted triangular"],
  ]),
  degree("person.face.length", 218, F, fd("Face length", "얼굴 길이"), ["face length", "얼굴 길이"], SLIDER("Vertical length of the face.", "얼굴의 세로 길이입니다."), "Face length: {value}.", LENGTH),
  degree("person.face.width", 219, F, fd("Face width", "얼굴 너비"), ["face width", "얼굴 폭"], SLIDER("Horizontal width of the face.", "얼굴의 가로 너비입니다."), "Face width: {value}.", NARROW_BROAD),
  degree("person.face.forehead_height", 220, F, fd("Forehead height", "이마 높이"), ["forehead height", "이마"], SLIDER("Height of the forehead.", "이마의 세로 높이입니다."), "Forehead height: {value}.", LOW_HIGH),
  degree("person.face.forehead_width", 221, F, fd("Forehead width", "이마 너비"), ["forehead width", "이마 폭"], SLIDER("Width of the forehead.", "이마의 가로 너비입니다."), "Forehead width: {value}.", NARROW_BROAD),
  shape("person.face.cheekbones", 222, F, fd("Cheekbones", "광대"), ["cheekbones", "광대뼈", "광대"], fd("Projection (flat / softly contoured / prominent) and position (high / low) can be combined, e.g. high and prominent.", "돌출 정도(평평·부드러운 윤곽·돌출)와 위치(높음·낮음)를 함께 고를 수 있습니다. 예: 높고 돌출된 광대."), "Cheekbones: {value}.", [
    ["flat", "평평한", "Flat", "flat"],
    ["softly_contoured", "부드러운 윤곽", "Softly contoured", "softly contoured"],
    ["prominent", "돌출된", "Prominent", "prominent", ["도드라진"]],
    ["high", "높은", "High", "high"],
    ["low", "낮은", "Low", "low"],
  ], { multi: true }),
  shape("person.face.jawline", 223, F, fd("Jawline", "턱선"), ["jawline", "jaw", "턱", "턱라인"], fd("Combinable traits, e.g. soft and rounded. Independent of the face shape.", "함께 쓸 수 있는 특징입니다(예: 부드럽고 둥근). 얼굴형과 독립적입니다."), "Jawline: {value}.", [
    ["rounded", "둥근", "Rounded", "rounded"],
    ["soft", "부드러운", "Soft", "soft"],
    ["angular", "각진", "Angular", "angular", ["사각턱"]],
    ["defined", "선명한", "Defined", "defined", ["sharp jawline"]],
    ["v_shaped", "V자형", "V-shaped", "V-shaped", ["브이라인", "V라인"]],
    ["u_shaped", "U자형", "U-shaped", "U-shaped", ["유라인", "U라인"]],
  ], { multi: true }),
  shape("person.face.chin", 224, F, fd("Chin", "턱끝"), ["chin", "턱끝", "턱"], fd("Shape (rounded / pointed / square), cleft and projection (protruding / recessed) can be combined.", "모양(둥근·뾰족한·각진), 갈라진 턱, 돌출 정도(나온·들어간)를 함께 고를 수 있습니다."), "Chin: {value}.", [
    ["rounded", "둥근", "Rounded", "rounded"],
    ["pointed", "뾰족한", "Pointed", "pointed"],
    ["square", "각진", "Square", "square"],
    ["cleft", "갈라진", "Cleft", "cleft", ["dimpled chin", "보조개 턱"]],
    ["protruding", "앞으로 나온", "Protruding", "protruding", ["돌출된 턱"]],
    ["recessed", "들어간", "Recessed", "recessed", ["무턱"]],
  ], { multi: true }),
  shape("person.face.cheeks", 225, F, fd("Cheeks", "볼"), ["cheeks", "볼살", "뺨"], fd("Fullness (hollow / flat / full) and roundness.", "볼의 양감(홀쭉·평평·통통)과 둥근 정도입니다."), "Cheeks: {value}.", [
    ["hollow", "홀쭉한", "Hollow", "hollow"],
    ["flat", "평평한", "Flat", "flat"],
    ["full", "통통한", "Full", "full", ["plump cheeks"]],
    ["rounded", "둥근", "Rounded", "rounded"],
  ], { multi: true }),
  degree("person.face.symmetry", 226, F, fd("Facial symmetry", "얼굴 대칭성"), ["symmetry", "대칭", "비대칭"], SLIDER("Natural asymmetry is normal and is not a defect.", "자연스러운 비대칭은 정상이며 결점이 아닙니다."), "Facial symmetry: {value}.", [
    ["자연스러운 비대칭", "Naturally asymmetrical", "naturally asymmetrical features"],
    ["약간 비대칭", "Slightly asymmetrical", "slightly asymmetrical features"],
    ["균형 잡힘", "Balanced", "balanced features"],
    ["매우 대칭", "Very symmetrical", "very symmetrical features"],
    ["아주 대칭", "Highly symmetrical", "highly symmetrical features"],
  ]),
];

// ── Eyes (13) ────────────────────────────────────────────────────────────────
const E = "person_eyes";
const eyes: Attr[] = [
  shape("person.eyes.shape", 227, E, fd("Eye shape", "눈 모양"), ["eye shape", "눈매"], fd("Outline of the eye. Separate from eyelids, size, width and height.", "눈의 윤곽입니다. 눈꺼풀·크기·너비·높이와 별개입니다."), "Eye shape: {value}.", [
    ["almond", "아몬드형", "Almond-shaped", "almond-shaped"],
    ["round", "둥근", "Round", "round", ["동그란 눈"]],
    ["oval", "타원형", "Oval", "oval"],
    ["elongated", "가로로 긴", "Elongated", "elongated", ["long eyes", "긴 눈"]],
  ]),
  degree("person.eyes.size", 228, E, fd("Eye size", "눈 크기"), ["eye size", "큰 눈", "작은 눈"], SLIDER("Overall size of the eyes.", "눈의 전체 크기입니다."), "Eye size: {value}.", SIZE),
  degree("person.eyes.width", 229, E, fd("Eye width", "눈 너비"), ["eye width", "눈 가로"], SLIDER("Horizontal length of the eye opening.", "눈의 가로 길이입니다."), "Eye width: {value}.", NARROW_WIDE),
  degree("person.eyes.height", 230, E, fd("Eye height", "눈 높이"), ["eye opening height", "눈 세로"], SLIDER("Vertical height of the eye opening.", "눈을 뜬 세로 높이입니다."), "Eye opening height: {value}.", [
    ["아주 낮음", "Very low", "very low"],
    ["낮음", "Low", "low"],
    ["보통", "Medium", "medium height"],
    ["높음", "Tall", "tall"],
    ["아주 높음", "Very tall", "very tall"],
  ]),
  degree("person.eyes.spacing", 231, E, fd("Eye spacing", "눈 간격"), ["eye spacing", "미간", "close-set", "wide-set"], SLIDER("Distance between the eyes.", "두 눈 사이의 거리입니다."), "Eye spacing: {value}.", [
    ["아주 가까움", "Very close-set", "very close-set"],
    ["가까움", "Close-set", "close-set"],
    ["보통", "Average", "average spacing"],
    ["넓음", "Wide-set", "wide-set"],
    ["아주 넓음", "Very wide-set", "very wide-set"],
  ]),
  degree("person.eyes.outer_corner_angle", 232, E, fd("Outer eye corner angle", "눈꼬리 각도"), ["eye corners", "눈꼬리", "올라간 눈", "처진 눈", "cat eye"], SLIDER("Tilt of the outer eye corners (anatomy, not an expression).", "바깥 눈꼬리의 기울기입니다(표정이 아닌 생김새)."), "Outer eye corners: {value}.", DOWN_UP_TURNED),
  shape("person.eyes.depth", 233, E, fd("Eye depth", "눈 깊이"), ["eye depth", "deep-set", "눈 깊이"], fd("How deeply the eyes sit in the face.", "눈이 얼굴에 들어간 깊이입니다."), "Eye depth: {value}.", [
    ["deep_set", "깊은", "Deep-set", "deep-set", ["움푹한 눈"]],
    ["average", "보통", "Average-set", "average-set"],
    ["prominent", "돌출된", "Prominent", "prominent", ["튀어나온 눈"]],
  ], { custom: false }),
  shape("person.eyes.eyelids", 234, E, fd("Eyelids", "쌍꺼풀"), ["eyelids", "눈꺼풀", "쌍꺼풀", "외꺼풀", "속쌍"], fd("Eyelid crease type, separate from the eye shape. Hooded lids can be combined with any crease type.", "눈꺼풀 주름 형태로 눈 모양과 별개입니다. 덮인 눈꺼풀은 어떤 형태와도 함께 고를 수 있습니다."), "Eyelids: {value}.", [
    ["monolid", "외꺼풀", "Monolids", "monolids", ["무쌍", "monolid"]],
    ["inner_crease", "속쌍꺼풀", "Subtle inner creases", "subtle inner eyelid creases", ["속쌍", "inner double eyelid"]],
    ["thin_double", "얇은 쌍꺼풀", "Thin double eyelids", "thin double eyelid creases"],
    ["defined_double", "뚜렷한 쌍꺼풀", "Defined double eyelids", "defined double eyelid creases", ["진한 쌍꺼풀"]],
    ["hooded", "덮인 눈꺼풀", "Hooded eyelids", "hooded eyelids", ["hooded"]],
  ], { multi: true }),
  shape("person.eyes.iris_color", 235, E, fd("Iris color", "홍채 색상"), ["eye color", "눈동자 색", "눈 색깔", "iris"], fd("Natural or fantasy iris colors. Not linked to nationality or ethnicity.", "자연 또는 판타지 홍채 색입니다. 국적·민족과 연결하지 않습니다."), "Iris color: {value}.", [
    ["brown", "갈색", "Brown", "brown", [], "#7b4a26"],
    ["dark_brown", "짙은 갈색", "Dark brown", "dark brown", [], "#4a2b16"],
    ["near_black", "흑갈색", "Near-black brown", "near-black brown", ["black eyes", "검은 눈"], "#22160f"],
    ["hazel", "헤이즐", "Hazel", "hazel", [], "#8e7240"],
    ["amber", "호박색", "Amber", "amber", [], "#c68a1b"],
    ["green", "녹색", "Green", "green", [], "#4f7a3a"],
    ["blue", "파란색", "Blue", "blue", [], "#3f6fb0"],
    ["gray", "회색", "Gray", "gray", ["grey"], "#8a9098"],
    ["violet", "보라색", "Violet", "violet", ["purple"], "#7a4fa8"],
    ["red", "빨간색", "Red", "red", [], "#b3262e"],
    ["gold", "금색", "Gold", "gold", [], "#d4a72c"],
    ["silver", "은색", "Silver", "silver", [], "#c3c7cc"],
  ], { control: "color" }),
  degree("person.eyes.iris_size", 236, E, fd("Iris size", "홍채 크기"), ["iris size", "눈동자 크기"], SLIDER("Size of the iris relative to the eye.", "눈에 대한 홍채의 상대적 크기입니다."), "Iris size: {value}.", SIZE),
  shape("person.eyes.pupil_shape", 237, E, fd("Pupil shape", "동공 모양"), ["pupil", "동공", "slit pupils"], fd("Includes fantasy shapes; no species is implied.", "판타지 형태를 포함하며 종족을 뜻하지 않습니다."), "Pupils: {value}.", [
    ["round", "둥근", "Round", "round"],
    ["vertical_slit", "세로 틈", "Vertical slit", "vertical slit", ["cat pupils", "고양이 눈"]],
    ["horizontal_slit", "가로 틈", "Horizontal slit", "horizontal slit"],
    ["star", "별 모양", "Star-shaped", "star-shaped"],
    ["heart", "하트 모양", "Heart-shaped", "heart-shaped"],
  ]),
  degree("person.eyes.lash_length", 238, E, fd("Eyelash length", "속눈썹 길이"), ["eyelashes", "lashes", "속눈썹"], SLIDER("Natural lash length (not makeup).", "자연 속눈썹 길이입니다(메이크업 아님)."), "Eyelash length: {value}.", LENGTH),
  degree("person.eyes.lash_density", 239, E, fd("Eyelash density", "속눈썹 밀도"), ["eyelash density", "속눈썹 숱"], SLIDER("Natural lash density (not makeup).", "자연 속눈썹 숱입니다(메이크업 아님)."), "Eyelash density: {value}.", SPARSE_DENSE),
];

// ── Eyebrows (8) ─────────────────────────────────────────────────────────────
const W = "person_eyebrows";
const eyebrows: Attr[] = [
  shape("person.eyebrows.shape", 240, W, fd("Eyebrow shape", "눈썹 모양"), ["eyebrow shape", "brows", "눈썹"], fd("Contour of the brow, separate from its overall angle.", "눈썹의 형태이며 전체 기울기(각도)와 별개입니다."), "Eyebrow shape: {value}.", [
    ["straight", "일자", "Straight", "straight", ["일자 눈썹"]],
    ["soft_arch", "완만한 아치", "Softly arched", "softly arched"],
    ["high_arch", "높은 아치", "Highly arched", "highly arched"],
    ["rounded", "둥근", "Rounded", "rounded"],
    ["angular", "각진", "Angular", "angular"],
    ["s_shaped", "S자형", "S-shaped", "S-shaped"],
  ]),
  degree("person.eyebrows.thickness", 241, W, fd("Eyebrow thickness", "눈썹 두께"), ["eyebrow thickness", "굵은 눈썹", "얇은 눈썹"], SLIDER("Vertical thickness of the brow.", "눈썹의 굵기입니다."), "Eyebrow thickness: {value}.", THIN_THICK),
  degree("person.eyebrows.length", 242, W, fd("Eyebrow length", "눈썹 길이"), ["eyebrow length"], SLIDER("Horizontal length of the brow.", "눈썹의 가로 길이입니다."), "Eyebrow length: {value}.", LENGTH),
  degree("person.eyebrows.density", 243, W, fd("Eyebrow density", "눈썹 밀도"), ["eyebrow density", "눈썹 숱"], SLIDER("How full the brow hair is.", "눈썹 숱의 정도입니다."), "Eyebrow density: {value}.", SPARSE_DENSE),
  degree("person.eyebrows.angle", 244, W, fd("Eyebrow angle", "눈썹 각도"), ["eyebrow angle", "눈썹 기울기", "처진 눈썹", "올라간 눈썹"], SLIDER("Overall slope of the brow (anatomy, not an expression).", "눈썹 전체의 기울기입니다(표정이 아닌 생김새)."), "Eyebrow angle: {value}.", [
    ["많이 내려감", "Strongly downward-sloping", "strongly downward-sloping"],
    ["약간 내려감", "Slightly downward-sloping", "slightly downward-sloping"],
    ["수평", "Level", "level"],
    ["약간 올라감", "Slightly upward-sloping", "slightly upward-sloping"],
    ["많이 올라감", "Strongly upward-sloping", "strongly upward-sloping"],
  ]),
  degree("person.eyebrows.height", 245, W, fd("Eyebrow height", "눈썹 높이"), ["brow position", "눈썹 위치"], SLIDER("Distance of the brows above the eyes.", "눈에서 눈썹까지의 높이입니다."), "Eyebrow position: {value}.", [
    ["아주 낮음", "Very low-set", "very low-set"],
    ["낮음", "Low-set", "low-set"],
    ["보통", "Medium", "medium height"],
    ["높음", "High-set", "high-set"],
    ["아주 높음", "Very high-set", "very high-set"],
  ]),
  degree("person.eyebrows.spacing", 246, W, fd("Eyebrow spacing", "눈썹 간격"), ["brow spacing", "눈썹 사이"], SLIDER("Distance between the two brows.", "두 눈썹 사이의 거리입니다."), "Eyebrow spacing: {value}.", [
    ["아주 가까움", "Very closely spaced", "very closely spaced"],
    ["가까움", "Closely spaced", "closely spaced"],
    ["보통", "Average", "average spacing"],
    ["넓음", "Widely spaced", "widely spaced"],
    ["아주 넓음", "Very widely spaced", "very widely spaced"],
  ]),
  shape("person.eyebrows.color", 247, W, fd("Eyebrow color", "눈썹 색상"), ["eyebrow color", "눈썹 색"], fd("Natural brow color; independent of hair color.", "자연 눈썹 색이며 머리색과 독립적입니다."), "Eyebrow color: {value}.", [
    ["black", "검은색", "Black", "black", [], "#1c1a18"],
    ["dark_brown", "짙은 갈색", "Dark brown", "dark brown", [], "#3b2617"],
    ["brown", "갈색", "Brown", "brown", [], "#6b4428"],
    ["light_brown", "밝은 갈색", "Light brown", "light brown", [], "#9c7350"],
    ["blond", "금발", "Blond", "blond", ["blonde"], "#c9a66b"],
    ["gray", "회색", "Gray", "gray", ["grey"], "#8d8d8a"],
    ["white", "흰색", "White", "white", [], "#e9e6df"],
  ], { control: "color" }),
];

// ── Nose (8) ─────────────────────────────────────────────────────────────────
const N = "person_nose";
const nose: Attr[] = [
  shape("person.nose.shape", 248, N, fd("Nose shape", "코 전체 모양"), ["nose shape", "코 모양", "코"], fd("Overall shape. Detailed structure (bridge, tip, width) is set separately; when the same meaning is chosen twice it is written once.", "전체 모양입니다. 콧대·코끝·너비 등 세부 구조는 따로 정하며, 같은 의미가 두 번 선택되면 한 번만 출력합니다."), "Nose shape: {value}.", [
      ["straight", "직선형", "Straight", "straight"],
      ["roman", "로마형", "Roman", "Roman", ["roman nose"]],
      ["aquiline", "매부리형", "Aquiline", "aquiline", ["hooked nose", "매부리코"]],
      ["button", "버튼형", "Button", "button", ["button nose", "작고 둥근 코"]],
      ["upturned", "들린 코", "Upturned", "upturned", ["snub nose", "들창코"]],
      ["broad", "넓은 코", "Broad", "broad"],
      ["concave", "오목한 코", "Concave", "concave", ["ski-slope nose"]],
    ]),
  degree("person.nose.length", 249, N, fd("Nose length", "코 길이"), ["nose length"], SLIDER("Length from bridge to tip.", "콧대에서 코끝까지의 길이입니다."), "Nose length: {value}.", LENGTH),
  degree("person.nose.width", 250, N, fd("Nose width", "코 너비"), ["nose width"], SLIDER("Overall width of the nose.", "코 전체의 너비입니다."), "Nose width: {value}.", NARROW_WIDE),
  degree("person.nose.bridge_height", 251, N, fd("Nasal bridge height", "콧대 높이"), ["nose bridge", "콧대"], SLIDER("Height of the nasal bridge.", "콧대의 높이입니다."), "Nasal bridge height: {value}.", LOW_HIGH),
  shape("person.nose.bridge_shape", 252, N, fd("Nasal bridge shape", "콧대 모양"), ["bridge shape", "콧대 모양", "hump"], fd("Profile of the bridge.", "옆에서 본 콧대의 모양입니다."), "Nasal bridge shape: {value}.", [
    ["straight", "곧은", "Straight", "straight"],
    ["convex", "볼록한", "Convex", "convex", ["humped", "매부리"]],
    ["concave", "오목한", "Concave", "concave"],
  ], { custom: false }),
  shape("person.nose.tip_shape", 253, N, fd("Nasal tip shape", "코끝 모양"), ["nose tip", "코끝"], fd("Shape of the tip.", "코끝의 모양입니다."), "Nasal tip: {value}.", [
    ["rounded", "둥근", "Rounded", "rounded"],
    ["pointed", "뾰족한", "Pointed", "pointed"],
    ["broad", "넓은", "Broad", "broad"],
    ["angular", "각진", "Angular", "angular"],
    ["cleft", "갈라진", "Cleft", "cleft", ["bifid tip"]],
  ]),
  degree("person.nose.tip_angle", 254, N, fd("Nasal tip angle", "코끝 각도"), ["tip angle", "들린 코끝", "처진 코끝"], SLIDER("Whether the tip points down or up.", "코끝이 아래 또는 위를 향하는 정도입니다."), "Nasal tip angle: {value}.", [
    ["많이 아래로", "Strongly downward-pointing", "strongly downward-pointing"],
    ["약간 아래로", "Slightly downward-pointing", "slightly downward-pointing"],
    ["정면", "Straight", "pointing straight ahead"],
    ["약간 위로", "Slightly upward-pointing", "slightly upward-pointing"],
    ["많이 위로", "Strongly upward-pointing", "strongly upward-pointing"],
  ]),
  degree("person.nose.alar_width", 255, N, fd("Nostril width", "콧볼 너비"), ["alar width", "nostrils", "콧볼"], SLIDER("Width of the nostril wings (alae).", "콧방울(콧볼)의 너비입니다."), "Nostril wing (alar) width: {value}.", NARROW_WIDE),
];

// ── Lips (8) ─────────────────────────────────────────────────────────────────
const P = "person_lips";
const lips: Attr[] = [
  shape("person.lips.shape", 256, P, fd("Lip shape", "입술 전체 모양"), ["lip shape", "입술 모양", "lips"], fd("Overall impression of the lips; upper and lower lip fullness are set separately.", "입술 전체의 형태입니다. 윗입술·아랫입술 두께는 따로 정합니다."), "Lips: {value}.", [
    ["thin", "얇은", "Thin", "thin"],
    ["full", "도톰한", "Full", "full", ["plump lips"]],
    ["heart", "하트형", "Heart-shaped", "heart-shaped"],
    ["rounded", "둥근", "Rounded", "rounded"],
    ["wide", "넓은", "Wide", "wide"],
    ["balanced", "균형 잡힌", "Balanced", "balanced"],
  ], { multi: true }),
  degree("person.lips.mouth_width", 257, P, fd("Mouth width", "입 너비"), ["mouth width", "입 크기"], SLIDER("Width of the mouth.", "입의 가로 너비입니다."), "Mouth width: {value}.", NARROW_WIDE),
  degree("person.lips.upper_thickness", 258, P, fd("Upper lip fullness", "윗입술 두께"), ["upper lip", "윗입술"], SLIDER("Fullness of the upper lip.", "윗입술의 두께입니다."), "Upper lip: {value}.", THIN_FULL),
  degree("person.lips.lower_thickness", 259, P, fd("Lower lip fullness", "아랫입술 두께"), ["lower lip", "아랫입술"], SLIDER("Fullness of the lower lip.", "아랫입술의 두께입니다."), "Lower lip: {value}.", THIN_FULL),
  shape("person.lips.ratio", 260, P, fd("Lip proportion", "입술 비율"), ["lip ratio", "입술 비율"], fd("Which lip is fuller.", "어느 입술이 더 도톰한지입니다."), "Lip proportion: {value}.", [
    ["upper_dominant", "윗입술이 더 도톰", "Upper-lip dominant", "upper-lip dominant"],
    ["balanced", "균형", "Balanced", "balanced"],
    ["lower_dominant", "아랫입술이 더 도톰", "Lower-lip dominant", "lower-lip dominant"],
  ], { custom: false }),
  shape("person.lips.cupids_bow", 261, P, fd("Cupid's bow", "큐피드 보우"), ["cupid's bow", "입술산", "인중 입술선"], fd("Definition of the upper-lip curve.", "윗입술 가운데 곡선의 뚜렷한 정도입니다."), "Cupid's bow: {value}.", [
    ["flat", "평평한", "Flat", "flat"],
    ["subtle", "은은한", "Subtle", "subtle"],
    ["defined", "뚜렷한", "Defined", "defined"],
    ["deep", "깊은", "Deep", "deep"],
  ], { custom: false }),
  degree("person.lips.corners", 262, P, fd("Mouth corners", "입꼬리"), ["mouth corners", "입꼬리"], SLIDER("Resting position of the mouth corners (anatomy, not a smile or expression).", "가만히 있을 때의 입꼬리 위치입니다(미소·표정이 아님)."), "Mouth corners at rest: {value}.", DOWN_UP_TURNED),
  shape("person.lips.natural_color", 263, P, fd("Natural lip color", "자연 입술 색상"), ["lip color", "입술 색", "natural lips"], fd("The natural color of the lips — not lipstick or makeup.", "입술 본래의 색입니다 — 립스틱·메이크업이 아닙니다."), "Natural lip color: {value}.", [
    ["pale_pink", "연분홍", "Pale pink", "pale pink", [], "#e8b4b0"],
    ["pink", "분홍", "Pink", "pink", [], "#d9898b"],
    ["rose", "장밋빛", "Rose", "rose", [], "#c56a72"],
    ["coral", "코랄", "Coral", "coral", [], "#d9765f"],
    ["red", "붉은", "Red", "red", [], "#b03a3e"],
    ["mauve", "모브", "Mauve", "mauve", [], "#a8737e"],
    ["brown_toned", "갈색 톤", "Brown-toned", "brown-toned", ["brown"], "#8c5a4a"],
    ["plum_toned", "자두색 톤", "Plum-toned", "plum-toned", ["plum"], "#7a3f55"],
  ], { control: "color" }),
];

// Overall nose shape ↔ bridge profile: the same meaning is written once (covers);
// a contradiction is reported, never rewritten.
const noseShape = nose[0] as Extract<Attr, { type: "single" }>;
for (const [id, bridge] of [["straight", ["straight"]], ["roman", ["convex"]], ["aquiline", ["convex"]], ["concave", ["concave"]]] as const) {
  noseShape.options.find((o) => o.id === id)!.covers = [{ attributeId: "person.nose.bridge_shape", optionIds: [...bridge] }];
}

export const facialAttributes: Attr[] = [...face, ...eyes, ...eyebrows, ...nose, ...lips];

// ── Rules: genuinely opposite traits inside multi-select attributes, and nose shape vs bridge.
const opposite = (attributeId: string, pairs: Array<[string, string]>): Rule[] => oppositeIn(facialAttributes, attributeId, pairs);

export const facialRules: Rule[] = [
  ...opposite("person.face.cheekbones", [...pairsOf(["flat", "softly_contoured", "prominent"]), ["high", "low"]]),
  ...opposite("person.face.jawline", [["rounded", "angular"], ["soft", "angular"], ["v_shaped", "u_shaped"]]),
  ...opposite("person.face.chin", [...pairsOf(["rounded", "pointed", "square"]), ["protruding", "recessed"]]),
  ...opposite("person.face.cheeks", [...pairsOf(["hollow", "flat", "full"]), ["hollow", "rounded"], ["flat", "rounded"]]),
  ...opposite("person.eyes.eyelids", pairsOf(["monolid", "inner_crease", "thin_double", "defined_double"])),
  ...opposite("person.lips.shape", [["thin", "full"]]),
  ...(
    [
      ["nose-convex-shape-vs-bridge", ["roman", "aquiline"], ["straight", "concave"]],
      ["nose-concave-shape-vs-bridge", ["concave"], ["straight", "convex"]],
      ["nose-straight-shape-vs-bridge", ["straight"], ["convex", "concave"]],
    ] as const
  ).map(([id, shapes, bridges]) => ({
    id,
    kind: "conflict" as const,
    severity: "warning" as const,
    when: [
      { op: "anyOf" as const, attributeId: "person.nose.shape", optionIds: [...shapes] },
      { op: "anyOf" as const, attributeId: "person.nose.bridge_shape", optionIds: [...bridges] },
    ],
    involves: ["person.nose.shape", "person.nose.bridge_shape"],
    message: { en: "The overall nose shape and the nasal bridge profile contradict each other.", ko: "코 전체 모양과 콧대 모양이 서로 맞지 않습니다." },
    guidance: {
      en: "Neither is changed automatically. Adjust one of them if this is not intended.",
      ko: "어느 쪽도 자동으로 바꾸지 않습니다. 의도한 설정이 아니라면 하나를 고치세요.",
    },
  })),
];
