import type { CatalogRule, Condition } from "../schema";

/**
 * Sprint 2-C.2 (TD-10) — cross-attribute consistency diagnostics added after reviewing the 348
 * attributes and 90 existing rules. Non-blocking: rules only REPORT (never change values, never
 * block output, independent of the safety policy). Nothing is inferred: a slider condition
 * (`numberIn`) holds only when the slider was actually set.
 *
 * Two meanings (`basis`):
 * - `contradiction` (warning) — the two settings state opposite meanings (e.g. an upturned nose
 *   with a downward-pointing tip).
 * - `convention` (info) — unusual compared with common photographic practice, but legitimate
 *   (stylization, fantasy, intent). Physical realism is never enforced.
 *
 * Not added (already covered or not a clear conflict): lens type ↔ focal length (existing rules),
 * clothing type ↔ details (applicability hides them), posture ↔ action (existing rules), eyebrow
 * shape ↔ angle (independent: shape vs tilt), any combination without a clear meaning basis.
 */
const any = (attributeId: string, ...optionIds: string[]): Condition => ({ op: "anyOf", attributeId, optionIds });
const atMost = (attributeId: string, max: number): Condition => ({ op: "numberIn", attributeId, max });
const atLeast = (attributeId: string, min: number): Condition => ({ op: "numberIn", attributeId, min });

const rule = (
  basis: "contradiction" | "convention",
  id: string,
  when: Condition[],
  [en, ko]: [string, string],
  [gEn, gKo]: [string, string],
): CatalogRule => ({
  id,
  kind: "conflict",
  severity: basis === "contradiction" ? "warning" : "info",
  basis,
  when,
  involves: [...new Set(when.map((c) => ("attributeId" in c ? c.attributeId : "")).filter(Boolean))],
  message: { en, ko },
  guidance: { en: gEn, ko: gKo },
});

const KEEP_EN = "Keep both if this is intended; otherwise adjust one of them.";
const KEEP_KO = "의도한 표현이라면 그대로 두어도 됩니다. 아니라면 둘 중 하나를 조정하세요.";
const STYLE_EN = "Fine for stylized or intentional looks; nothing is changed automatically.";
const STYLE_KO = "의도적이거나 양식화된 표현이라면 그대로 두어도 됩니다. 값은 자동으로 바뀌지 않습니다.";

export const consistencyRules: CatalogRule[] = [
  // ── Face & facial features: shape choice ↔ relative slider ──────────────────
  rule("contradiction", "face-round-shape-vs-long-length", [any("person.face.shape", "round"), atLeast("person.face.length", 4)],
    ["A round face shape conflicts with a long face length setting.", "선택된 얼굴형(둥근형)과 얼굴 길이(긺) 설정의 표현이 서로 충돌할 수 있습니다."],
    ["A round face is about as long as it is wide. " + KEEP_EN, "둥근형은 세로와 가로가 비슷한 얼굴입니다. " + KEEP_KO]),
  rule("contradiction", "face-rectangular-shape-vs-short-length", [any("person.face.shape", "rectangular"), atMost("person.face.length", 2)],
    ["A rectangular face shape conflicts with a short face length setting.", "선택된 얼굴형(직사각형)과 얼굴 길이(짧음) 설정의 표현이 서로 충돌할 수 있습니다."],
    ["A rectangular face is longer than it is wide. " + KEEP_EN, "직사각형 얼굴은 세로가 긴 얼굴입니다. " + KEEP_KO]),
  rule("contradiction", "eyes-round-shape-vs-low-height", [any("person.eyes.shape", "round"), atMost("person.eyes.height", 2)],
    ["Round eyes conflict with a low eye-opening height setting.", "선택된 눈 모양(둥근)과 눈 높이(낮음) 설정의 표현이 서로 충돌할 수 있습니다."],
    ["Round eyes have a tall opening. " + KEEP_EN, "둥근 눈은 세로로 크게 열린 눈입니다. " + KEEP_KO]),
  rule("contradiction", "eyes-elongated-shape-vs-narrow-width", [any("person.eyes.shape", "elongated"), atMost("person.eyes.width", 2)],
    ["Elongated eyes conflict with a narrow eye width setting.", "선택된 눈 모양(가로로 긴)과 눈 너비(좁음) 설정의 표현이 서로 충돌할 수 있습니다."],
    ["Elongated eyes are wide horizontally. " + KEEP_EN, "가로로 긴 눈은 가로 길이가 긴 눈입니다. " + KEEP_KO]),
  rule("contradiction", "nose-upturned-shape-vs-downward-tip", [any("person.nose.shape", "upturned"), atMost("person.nose.tip_angle", 2)],
    ["An upturned nose conflicts with a downward-pointing tip angle.", "선택된 코 모양(들린 코)과 코끝 각도(아래로) 설정의 표현이 서로 충돌할 수 있습니다."],
    ["An upturned nose has a tip that points up. " + KEEP_EN, "들린 코는 코끝이 위를 향하는 코입니다. " + KEEP_KO]),
  rule("contradiction", "lips-thin-shape-vs-full-thickness", [any("person.lips.shape", "thin"), atLeast("person.lips.upper_thickness", 4), atLeast("person.lips.lower_thickness", 4)],
    ["Thin lips conflict with full upper and lower lip thickness settings.", "선택된 입술 모양(얇은)과 윗입술·아랫입술 두께(도톰함) 설정의 표현이 서로 충돌할 수 있습니다."],
    [KEEP_EN, KEEP_KO]),
  rule("contradiction", "lips-full-shape-vs-thin-thickness", [any("person.lips.shape", "full"), atMost("person.lips.upper_thickness", 2), atMost("person.lips.lower_thickness", 2)],
    ["Full lips conflict with thin upper and lower lip thickness settings.", "선택된 입술 모양(도톰한)과 윗입술·아랫입술 두께(얇음) 설정의 표현이 서로 충돌할 수 있습니다."],
    [KEEP_EN, KEEP_KO]),
  rule("contradiction", "lips-upper-dominant-vs-thickness", [any("person.lips.ratio", "upper_dominant"), atMost("person.lips.upper_thickness", 2), atLeast("person.lips.lower_thickness", 4)],
    ["“Upper lip fuller” conflicts with a thin upper lip and a full lower lip.", "입술 비율(윗입술이 더 도톰)과 윗입술(얇음)·아랫입술(도톰함) 두께 설정의 표현이 서로 충돌할 수 있습니다."],
    [KEEP_EN, KEEP_KO]),
  rule("contradiction", "lips-lower-dominant-vs-thickness", [any("person.lips.ratio", "lower_dominant"), atMost("person.lips.lower_thickness", 2), atLeast("person.lips.upper_thickness", 4)],
    ["“Lower lip fuller” conflicts with a thin lower lip and a full upper lip.", "입술 비율(아랫입술이 더 도톰)과 아랫입술(얇음)·윗입술(도톰함) 두께 설정의 표현이 서로 충돌할 수 있습니다."],
    [KEEP_EN, KEEP_KO]),

  // ── Body: build / silhouette / proportion style ↔ relative slider ──────────
  rule("contradiction", "body-muscular-build-vs-low-muscle-mass", [any("person.body.build", "muscular"), atMost("person.body.muscle_mass", 2)],
    ["A muscular build conflicts with a low muscle mass setting.", "선택된 체형(근육질)과 근육량(적음) 설정의 표현이 서로 충돌할 수 있습니다."],
    [KEEP_EN, KEEP_KO]),
  rule("contradiction", "body-plump-build-vs-low-body-fat", [any("person.body.build", "plump"), atMost("person.body.body_fat", 2)],
    ["A plump build conflicts with a low body fat setting.", "선택된 체형(통통한)과 체지방 정도(적음) 설정의 표현이 서로 충돌할 수 있습니다."],
    [KEEP_EN, KEEP_KO]),
  rule("contradiction", "body-slender-build-vs-high-body-fat", [any("person.body.build", "slender"), atLeast("person.body.body_fat", 4)],
    ["A slender build conflicts with a high body fat setting.", "선택된 체형(가녀린)과 체지방 정도(많음) 설정의 표현이 서로 충돌할 수 있습니다."],
    [KEEP_EN, KEEP_KO]),
  rule("contradiction", "body-hourglass-vs-low-waist-hip-contrast", [any("person.body.silhouette", "hourglass"), atMost("person.body.waist_hip_contrast", 2)],
    ["An hourglass silhouette conflicts with a low waist–hip contrast setting.", "선택된 신체 실루엣(모래시계형)과 허리·골반 대비(낮음) 설정의 표현이 서로 충돌할 수 있습니다."],
    ["An hourglass silhouette is defined by a clear waist–hip contrast. " + KEEP_EN, "모래시계형은 허리와 골반의 대비가 뚜렷한 실루엣입니다. " + KEEP_KO]),
  rule("contradiction", "body-chibi-vs-tall-head-ratio", [any("person.body.proportions", "chibi"), atLeast("person.body.heads_tall", 5)],
    ["Chibi proportions conflict with a heads-tall value of 5 or more.", "선택된 신체 비율(치비)과 등신 비율(5등신 이상) 설정의 표현이 서로 충돌할 수 있습니다."],
    ["Chibi proportions are usually 2–3 heads tall. " + KEEP_EN, "치비 비율은 보통 2–3등신입니다. " + KEEP_KO]),

  // ── Expression ──────────────────────────────────────────────────────────────
  rule("contradiction", "expression-neutral-with-other-emotions", [any("person.expression.emotion", "neutral"), { op: "selectedCount", attributeId: "person.expression.emotion", min: 2 }],
    ["“Neutral” is selected together with other emotions.", "‘무표정’이 다른 감정과 함께 선택되었습니다."],
    ["A neutral face shows no particular emotion. " + KEEP_EN, "무표정은 특정 감정을 드러내지 않는 표정입니다. " + KEEP_KO]),
  rule("contradiction", "expression-neutral-vs-strong-intensity", [any("person.expression.emotion", "neutral"), atLeast("person.expression.emotion_intensity", 4)],
    ["A neutral expression conflicts with a strong emotion intensity setting.", "선택된 감정(무표정)과 감정 강도(강함) 설정의 표현이 서로 충돌할 수 있습니다."],
    [KEEP_EN, KEEP_KO]),
  rule("contradiction", "expression-closed-mouth-vs-open-mouth-smile", [any("person.expression.mouth_openness", "closed"), any("person.expression.smile", "open_mouth")],
    ["A closed mouth conflicts with an open-mouthed smile.", "입 벌림 정도(다문)와 미소 형태(입을 벌린 미소)가 서로 충돌합니다."],
    [KEEP_EN, KEEP_KO]),

  // ── Camera: common photographic practice (convention, not physics) ─────────
  rule("convention", "camera-wide-aperture-vs-deep-dof", [any("camera.aperture", "f_1_4", "f_1_8", "f_2"), atLeast("camera.depth_of_field", 4)],
    ["A wide aperture (f/1.4–f/2) with a deep depth of field may differ from common photographic practice.", "선택된 조리개(f/1.4–f/2)와 깊은 피사계 심도의 조합은 일반적인 사진 촬영 관례와 다를 수 있습니다."],
    ["A wide aperture usually gives a shallow depth of field. " + STYLE_EN, "조리개를 넓게 열면 보통 피사계 심도가 얕아집니다. " + STYLE_KO]),
  rule("convention", "camera-narrow-aperture-vs-shallow-dof", [any("camera.aperture", "f_11", "f_16", "f_22"), atMost("camera.depth_of_field", 2)],
    ["A narrow aperture (f/11–f/22) with a shallow depth of field may differ from common photographic practice.", "선택된 조리개(f/11–f/22)와 얕은 피사계 심도의 조합은 일반적인 사진 촬영 관례와 다를 수 있습니다."],
    ["A narrow aperture usually gives a deep depth of field. " + STYLE_EN, "조리개를 좁히면 보통 피사계 심도가 깊어집니다. " + STYLE_KO]),
  rule("convention", "camera-telephoto-vs-exaggerated-perspective", [any("camera.lens_type", "telephoto"), any("camera.perspective", "exaggerated")],
    ["A telephoto lens with an exaggerated perspective may differ from common photographic practice.", "선택된 렌즈 종류(망원)와 과장된 원근감의 조합은 일반적인 사진 촬영 관례와 다를 수 있습니다."],
    ["Telephoto lenses usually compress perspective. " + STYLE_EN, "망원 렌즈는 보통 원근감을 압축합니다. " + STYLE_KO]),
  rule("convention", "camera-wide-lens-vs-compressed-perspective", [any("camera.lens_type", "ultra_wide", "wide", "fisheye"), any("camera.perspective", "compressed")],
    ["A wide-angle or fisheye lens with a compressed perspective may differ from common photographic practice.", "선택된 렌즈 종류(광각·초광각·어안)와 압축된 원근감의 조합은 일반적인 사진 촬영 관례와 다를 수 있습니다."],
    ["Wide-angle lenses usually exaggerate perspective. " + STYLE_EN, "광각 렌즈는 보통 원근감을 강조합니다. " + STYLE_KO]),

  // ── Lighting (convention) ───────────────────────────────────────────────────
  rule("convention", "lighting-soft-light-vs-sharp-shadow-edge", [any("lighting.softness", "very_soft", "soft"), atLeast("lighting.shadow_edge", 4)],
    ["Soft light with sharply defined shadow edges may differ from common lighting practice.", "선택된 빛의 질감(부드러운)과 뚜렷한 그림자 경계의 조합은 일반적인 조명 관례와 다를 수 있습니다."],
    ["Soft light usually casts soft-edged shadows. " + STYLE_EN, "부드러운 빛은 보통 그림자 경계도 부드럽습니다. " + STYLE_KO]),
  rule("convention", "lighting-hard-light-vs-soft-shadow-edge", [any("lighting.softness", "hard", "very_hard"), atMost("lighting.shadow_edge", 2)],
    ["Hard light with soft shadow edges may differ from common lighting practice.", "선택된 빛의 질감(딱딱한)과 부드러운 그림자 경계의 조합은 일반적인 조명 관례와 다를 수 있습니다."],
    ["Hard light usually casts crisp shadows. " + STYLE_EN, "딱딱한 빛은 보통 그림자 경계가 뚜렷합니다. " + STYLE_KO]),
  rule("convention", "lighting-high-contrast-vs-no-shadows", [any("lighting.contrast", "high", "very_high"), any("lighting.shadow_strength", "none")],
    ["High lighting contrast with no visible shadows may differ from common lighting practice.", "선택된 명암 대비(높음)와 ‘그림자 없음’의 조합은 일반적인 조명 관례와 다를 수 있습니다."],
    ["High contrast usually comes with visible shadows. " + STYLE_EN, "높은 명암 대비는 보통 뚜렷한 그림자를 동반합니다. " + STYLE_KO]),
];
