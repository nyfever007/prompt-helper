import type { CategoryDefinition, Condition } from "../../schema";
import { SLIDER, degree, fd, opposite as oppositeIn, shape, type Attr, type O, type Rule, type ShapeOptions } from "../person/builders";

/**
 * Sprint 2-B.6 (3) — Shared › Camera. Specification: docs/catalogs/shared/camera.md.
 *
 * Reuses the approved Basic attributes `composition.framing`, `composition.view_direction`
 * and `camera.angle` unchanged (IDs, options, output) and adds 15 Detailed attributes.
 * Camera settings apply to any subject (person, landscape, product, architecture …);
 * only person/animal-specific focus targets are limited by subject.
 * Lens type, focal length, aperture, depth of field and perspective are independent —
 * none sets another. Real values (mm, f-number) are shown and output as chosen, but an
 * image model does not reproduce exact optics. No camera models or brands are added.
 */

const CAT = "shared_camera";

/**
 * Sprint 2-C.1 — Camera subcategories (meaning groups for the Detailed navigation only).
 * Attribute IDs, options, stored values, `order` and output are unchanged; Basic still shows
 * framing, view direction and angle (same values). Single source for every camera attribute's category.
 */
export const CAMERA_SECTIONS: ReadonlyArray<readonly [id: string, en: string, ko: string, attributeIds: readonly string[]]> = [
  ["framing", "Framing & viewpoint", "프레이밍 및 시점", ["composition.framing", "composition.view_direction", "camera.angle", "camera.distance", "camera.roll"]],
  ["lens", "Lens & perspective", "렌즈 및 원근감", ["camera.lens_type", "camera.focal_length", "camera.projection", "camera.perspective"]],
  ["focus", "Focus & depth of field", "초점 및 피사계 심도", ["camera.aperture", "camera.depth_of_field", "camera.focus_target", "camera.focus_sharpness"]],
  ["composition", "Composition & placement", "구도 및 배치", ["composition.layout", "composition.negative_space", "composition.subject_position"]],
  ["effects", "Camera effects", "카메라 효과", ["camera.bokeh", "camera.motion_blur"]],
];
export const cameraCategories: CategoryDefinition[] = CAMERA_SECTIONS.map(([id, en, ko], i) => ({
  id: `${CAT}_${id}`,
  parentId: CAT,
  order: 1 + i,
  status: "approved" as const,
  label: { en, ko },
  docPath: "docs/catalogs/shared/camera.md",
}));
/** Category of a camera attribute (throws for an unmapped ID, so a new attribute must be placed explicitly). */
export const cameraCategoryOf = (attributeId: string): string => {
  const s = CAMERA_SECTIONS.find(([, , , ids]) => ids.includes(attributeId));
  if (!s) throw new Error(`camera attribute ${attributeId} has no subcategory`);
  return `${CAT}_${s[0]}`;
};
const ANY: Condition[] = [];
const OPTICS = (en: string, ko: string) => fd(`${en} Image models do not reproduce exact optics.`, `${ko} 이미지 모델이 정확한 광학 결과를 재현하지는 않습니다.`);
const cam = (id: string, order: number, label: [string, string], aliases: string[], description: ReturnType<typeof fd>, template: string, options: O[], o: ShapeOptions = {}): Attr =>
  ({ ...shape(id, order, cameraCategoryOf(id), fd(label[0], label[1]), aliases, description, template, options, { ...o, scope: ANY }), groupId: "composition" }) as Attr;
const camDegree = (id: string, order: number, label: [string, string], aliases: string[], description: ReturnType<typeof fd>, template: string, bands: Parameters<typeof degree>[7], when: Condition[] = []): Attr =>
  ({ ...degree(id, order, cameraCategoryOf(id), fd(label[0], label[1]), aliases, description, template, bands, when, ANY), groupId: "composition" }) as Attr;

const FOCAL_LENGTHS = [14, 20, 24, 28, 35, 50, 70, 85, 105, 135, 200];
const APERTURES = ["1.4", "1.8", "2", "2.8", "4", "5.6", "8", "11", "16", "22"];

export const cameraAttributes: Attr[] = [
  camDegree("camera.distance", 1605, ["Camera distance", "카메라 거리"], ["distance", "거리", "촬영 거리"], SLIDER("How far the camera is from the subject; independent of framing and lens.", "카메라와 피사체 사이의 거리이며 구도·렌즈와 독립적입니다."), "Camera distance: {value}.", [
    ["아주 가까움", "Very close", "very close"], ["가까움", "Close", "close"], ["보통", "Medium", "medium distance"], ["멂", "Distant", "distant"], ["아주 멂", "Very distant", "very distant"],
  ]),
  cam("camera.roll", 1610, ["Camera roll", "카메라 롤 (기울기)"], ["roll", "dutch angle", "더치 앵글", "기울어진 화면"], fd("Rotation of the frame around the lens axis.", "렌즈 축을 중심으로 화면이 기운 정도입니다."), "Camera roll: {value}.", [
    ["level", "수평", "Level", "level horizon"], ["tilted_left", "왼쪽으로 기움", "Tilted left", "tilted to the left"], ["tilted_right", "오른쪽으로 기움", "Tilted right", "tilted to the right"], ["dutch", "더치 앵글", "Dutch angle", "Dutch angle"],
  ], { custom: false }),
  cam("composition.layout", 1615, ["Composition", "구도 배치"], ["composition", "rule of thirds", "삼분할", "황금비", "대칭 구도"], fd("Combinable composition principles.", "함께 쓸 수 있는 구도 원칙입니다."), "Composition: {value}.", [
    ["centered", "중앙", "Centered", "centered composition"], ["rule_of_thirds", "삼분할", "Rule of thirds", "rule of thirds"], ["symmetrical", "대칭", "Symmetrical", "symmetrical composition"],
    ["asymmetrical", "비대칭", "Asymmetrical", "asymmetrical composition"], ["golden_ratio", "황금비", "Golden ratio", "golden ratio composition"], ["diagonal", "대각선", "Diagonal", "diagonal composition"], ["leading_lines", "유도선", "Leading lines", "leading lines"],
  ], { multi: true }),
  camDegree("composition.negative_space", 1620, ["Negative space", "여백"], ["negative space", "여백", "빈 공간"], SLIDER("Amount of empty space around the subject.", "피사체 주변의 빈 공간 정도입니다."), "Negative space: {value}.", [
    ["최소", "Minimal", "minimal"], ["적음", "Little", "little"], ["보통", "Moderate", "moderate"], ["넉넉함", "Ample", "ample"], ["아주 넉넉함", "Generous", "generous"],
  ]),
  cam("composition.subject_position", 1625, ["Subject position", "피사체 위치"], ["subject position", "피사체 위치", "배치"], fd("Where the subject sits in the frame; horizontal and vertical positions combine.", "화면 안 피사체의 위치이며 가로·세로 위치를 함께 고를 수 있습니다."), "Subject position: {value}.", [
    ["center", "가운데", "Center", "center of the frame"], ["left", "왼쪽", "Left", "left side of the frame"], ["right", "오른쪽", "Right", "right side of the frame"],
    ["upper", "위쪽", "Upper", "upper part of the frame"], ["lower", "아래쪽", "Lower", "lower part of the frame"],
  ], { multi: true, custom: false }),
  cam("camera.lens_type", 1630, ["Lens type", "렌즈 종류"], ["lens", "렌즈", "광각", "망원", "어안"], OPTICS("Independent of the focal length value.", "초점 거리 값과 독립적입니다."), "Lens: {value}.", [
    ["ultra_wide", "초광각", "Ultra-wide-angle", "ultra-wide-angle lens"], ["wide", "광각", "Wide-angle", "wide-angle lens"], ["standard", "표준", "Standard", "standard lens"],
    ["telephoto", "망원", "Telephoto", "telephoto lens"], ["macro", "매크로", "Macro", "macro lens", ["접사"]], ["fisheye", "어안", "Fisheye", "fisheye lens"],
  ]),
  cam("camera.focal_length", 1635, ["Focal length", "초점 거리"], ["focal length", "mm", "초점거리", "화각"], OPTICS("Full-frame-equivalent focal length in mm, output as chosen. Custom values allowed.", "풀프레임 환산 초점 거리(mm)이며 선택한 값 그대로 출력됩니다. 사용자 정의 값 가능."), "Focal length: {value}.", FOCAL_LENGTHS.map((mm): O => [`mm_${mm}`, `${mm}mm`, `${mm} mm`, `${mm} mm`, [`${mm}mm`]])),
  cam("camera.projection", 1640, ["Projection", "투영 방식"], ["projection", "투영", "orthographic", "아이소메트릭"], fd("Orthographic projection has no perspective convergence.", "직교 투영에는 원근 수렴이 없습니다."), "Projection: {value}.", [
    ["perspective", "원근 투영", "Perspective", "perspective projection"], ["orthographic", "직교 투영", "Orthographic", "orthographic projection"],
  ], { custom: false }),
  cam("camera.perspective", 1645, ["Perspective", "원근감"], ["perspective", "원근감", "압축감", "왜곡"], OPTICS("Not offered with orthographic projection.", "직교 투영에서는 적용하지 않습니다."), "Perspective: {value}.", [
    ["compressed", "압축된", "Compressed", "compressed perspective"], ["natural", "자연스러운", "Natural", "natural perspective"], ["exaggerated", "과장된", "Exaggerated", "exaggerated perspective"],
  ], { custom: false, when: [{ op: "noneOf", attributeId: "camera.projection", optionIds: ["orthographic"], whenUnset: "pass" }] }),
  cam("camera.aperture", 1650, ["Aperture", "조리개"], ["aperture", "f-stop", "f값", "조리개 값"], OPTICS("f-number, output as chosen. Independent of the depth of field setting.", "f값이며 선택한 값 그대로 출력됩니다. 피사계 심도 설정과 독립적입니다."), "Aperture: {value}.", APERTURES.map((f): O => [`f_${f.replace(".", "_")}`, `f/${f}`, `f/${f}`, `f/${f}`, [`f${f}`]])),
  camDegree("camera.depth_of_field", 1655, ["Depth of field", "피사계 심도"], ["depth of field", "DOF", "심도", "아웃포커싱", "배경 흐림"], OPTICS("How much of the scene is in focus.", "장면에서 초점이 맞는 범위입니다."), "Depth of field: {value}.", [
    ["아주 얕음", "Very shallow", "very shallow"], ["얕음", "Shallow", "shallow"], ["보통", "Moderate", "moderate"], ["깊음", "Deep", "deep"], ["아주 깊음", "Very deep", "very deep"],
  ]),
  cam("camera.focus_target", 1660, ["Focus target", "초점 대상"], ["focus", "초점", "포커스"], fd("What the focus is on. Eyes and face apply to people and animals.", "초점을 맞출 대상입니다. 눈·얼굴은 인물·동물에만 적용됩니다."), "Focus on: {value}.", [
    ["eyes", "눈", "Eyes", "the eyes"], ["face", "얼굴", "Face", "the face"], ["subject", "피사체 전체", "Entire subject", "the entire subject"], ["foreground", "전경", "Foreground", "the foreground"], ["background", "배경", "Background", "the background"],
  ]),
  camDegree("camera.focus_sharpness", 1665, ["Focus sharpness", "초점 선명도"], ["sharpness", "선명도", "소프트 포커스"], OPTICS("Sharpness of the in-focus area.", "초점 영역의 선명도입니다."), "Focus sharpness: {value}.", [
    ["아주 부드러움", "Very soft", "very soft focus"], ["부드러움", "Soft", "soft focus"], ["보통", "Moderate", "moderately sharp"], ["선명함", "Sharp", "sharp"], ["아주 선명함", "Highly sharp", "highly sharp"],
  ]),
  cam("camera.bokeh", 1670, ["Bokeh shape", "보케 형태"], ["bokeh", "보케", "빛망울"], OPTICS("Shape of out-of-focus highlights.", "초점 밖 빛망울의 모양입니다."), "Bokeh: {value}.", [
    ["circular", "원형", "Circular", "circular bokeh"], ["oval", "타원형", "Oval", "oval bokeh"], ["swirling", "회오리", "Swirling", "swirling bokeh"], ["polygonal", "다각형", "Polygonal", "polygonal bokeh"],
  ]),
  cam("camera.motion_blur", 1675, ["Motion blur", "모션 블러"], ["motion blur", "모션 블러", "흔들림", "잔상"], fd("“None” is an explicit choice.", "‘없음’은 명시적 선택입니다."), "Motion blur: {value}.", [
    ["none", "없음", "None", "none"], ["subtle", "약간", "Subtle", "subtle"], ["moderate", "보통", "Moderate", "moderate"], ["strong", "강함", "Strong", "strong"],
  ], { custom: false }),
];

// Eyes / face as a focus target only make sense for people and animals (option-level applicability).
{
  const focus = cameraAttributes.find((a) => a.id === "camera.focus_target") as Extract<Attr, { type: "single" }>;
  for (const o of focus.options) if (o.id === "eyes" || o.id === "face") o.appliesWhen = [{ op: "anyOf", attributeId: "subject.kind", optionIds: ["person", "group", "animal"], whenUnset: "pass" }];
}

const conflict = (id: string, when: Condition[], involves: string[], en: string, ko: string): Rule => ({
  id,
  kind: "conflict",
  severity: "warning",
  when,
  involves,
  message: { en, ko },
  guidance: { en: "Neither value is changed automatically. Adjust one if this is not intended.", ko: "어느 값도 자동으로 바꾸지 않습니다. 의도한 설정이 아니라면 하나를 고치세요." },
});
const any = (attributeId: string, optionIds: string[]): Condition => ({ op: "anyOf", attributeId, optionIds });

/** Real contradictions only (non-blocking). Numeric DOF ↔ aperture mismatches stay TD-10. */
export const cameraRules: Rule[] = [
  conflict("camera-telephoto-vs-short-focal-length", [any("camera.lens_type", ["telephoto"]), any("camera.focal_length", ["mm_14", "mm_20", "mm_24", "mm_28", "mm_35"])], ["camera.lens_type", "camera.focal_length"],
    "A telephoto lens is set with a short focal length.", "망원 렌즈인데 초점 거리가 짧게 설정되었습니다."),
  conflict("camera-wide-vs-long-focal-length", [any("camera.lens_type", ["ultra_wide", "wide"]), any("camera.focal_length", ["mm_70", "mm_85", "mm_105", "mm_135", "mm_200"])], ["camera.lens_type", "camera.focal_length"],
    "A wide-angle lens is set with a long focal length.", "광각 렌즈인데 초점 거리가 길게 설정되었습니다."),
  conflict("camera-fisheye-vs-orthographic", [any("camera.lens_type", ["fisheye"]), any("camera.projection", ["orthographic"])], ["camera.lens_type", "camera.projection"],
    "A fisheye lens cannot produce an orthographic projection.", "어안 렌즈와 직교 투영은 함께 쓸 수 없습니다."),
  ...oppositeIn(cameraAttributes, "composition.layout", [["centered", "rule_of_thirds"], ["symmetrical", "asymmetrical"]]),
  ...oppositeIn(cameraAttributes, "composition.subject_position", [["left", "right"], ["upper", "lower"]]),
];
