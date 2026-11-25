# 신체 (Body) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.4 개발 승인서의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/body.ts` (core 카탈로그 0.7.0), 카테고리 `person_body` + 하위 분류 7개
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md)

## 1. 설계 목적과 원칙

해부학·캐릭터 디자인을 위한 중립적인 신체 묘사입니다. 성별·국적·민족·연령에서 추론하지 않으며 의상·노출·자세·매력도와 독립적입니다.

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 전체 체형을 골라도 개별 부위가 자동으로 정해지지 않습니다. 신장 ↔ 비율, 골격 ↔ 근육량 ↔ 근육 선명도 ↔ 체지방, 어깨 ↔ 골반, 허리 너비 ↔ 허리 굴곡, 실루엣 ↔ 부위 크기, 등신 ↔ 머리 크기는 각각 독립입니다.
- 성별·국적·민족적 배경·연령에서 신체 특징을 설정하지 않으며, 신체 특징에서 표정·성격·매력도·건강 상태·의학적 진단을 추론하지 않습니다.
- 신체 속성 선택 자체를 성적 의도로 간주하지 않습니다. 신체·노출·의상·자세·매력도는 독립적으로 관리하며 기존 안전 정책과 구조화된 연령 판단을 그대로 적용합니다(미성년자의 비성적 묘사 허용, 성적 대상화 차단).
- 상대적 크기·두께·길이·근육·선명도는 5단계 의미 구간 슬라이더(화면에는 구간 이름만)이며, 표시 위치는 저장하지 않습니다. **등신 비율**은 별도의 숫자(2–10, 0.5 단위)로, 입력값 그대로 “N heads tall”로 출력되지만 이미지 결과의 정확한 비율을 보장하지 않습니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공하며, 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다. 좌우 개별 설정·3D 모델링·정밀 치수는 범위 밖입니다.

## 2. 속성 목록 (45)

### 전체 신체 / General body (8) — `person_body_general`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 309 | `person.body.height` | 신장 / Height | 상대 슬라이더 (1–5) | `Height: {value}.` | 1 아주 작음(Very short) → very short; 2 작음(Short) → short; 3 보통(Average) → average height; 4 큼(Tall) → tall; 5 아주 큼(Very tall) → very tall | height, 키, 신장, tall, short |
| 310 | `person.body.build` | 전체 체형 / Body build | 단일 · 칩 + 사용자 정의 | `Body build: {value}.` | 마른 근육형(Lean) → lean; 가녀린(Slender) → slender; 보통(Average build) → average; 운동형(Athletic build) → athletic; 근육질(Muscular build) → muscular; 통통한(Plump) → plump; 체격이 큰(Heavyset) → heavyset | build, body type, 체형, 몸매 |
| 311 | `person.body.frame` | 골격 크기 / Skeletal frame | 상대 슬라이더 (1–5) | `Skeletal frame: {value}.` | 1 아주 작음(Very small) → very small; 2 작음(Small) → small; 3 보통(Medium) → medium-sized; 4 큼(Large) → large; 5 아주 큼(Very large) → very large | frame, bone structure, 골격, 뼈대 |
| 312 | `person.body.muscle_mass` | 근육량 / Muscle mass | 상대 슬라이더 (1–5) | `Muscle mass: {value}.` | 1 아주 적음(Very low) → very low; 2 적음(Low) → low; 3 보통(Moderate) → moderate; 4 많음(High) → high; 5 아주 많음(Very high) → very high | muscle mass, 근육량 |
| 313 | `person.body.muscle_definition` | 근육 선명도 / Muscle definition | 상대 슬라이더 (1–5) | `Muscle definition: {value}.` | 1 거의 없음(Minimal) → minimal; 2 은은함(Subtle) → subtle; 3 보통(Moderate) → moderate; 4 선명함(Well-defined) → well-defined; 5 아주 선명함(Highly defined) → highly defined | muscle definition, 근육 선명도, toned |
| 314 | `person.body.body_fat` | 체지방 정도 / Body fat | 상대 슬라이더 (1–5) | `Body fat: {value}.` | 1 아주 적음(Very low) → very low; 2 적음(Low) → low; 3 보통(Moderate) → moderate; 4 많음(High) → high; 5 아주 많음(Very high) → very high | body fat, 체지방 |
| 315 | `person.body.silhouette` | 신체 실루엣 / Body silhouette | 단일 · 칩 + 사용자 정의 | `Body silhouette: {value}.` | 직사각형(Rectangular) → rectangular; 모래시계형(Hourglass-shaped) → hourglass-shaped; 삼각형(Triangular) → triangular; 역삼각형(Inverted triangular) → inverted triangular; 타원형(Oval) → oval | silhouette, 실루엣, body shape |
| 316 | `person.body.proportions` | 신체 비율 / Body proportions | 단일 · 칩 + 사용자 정의 | `Body proportions: {value}.` | 자연스러운(Natural) → natural; 길쭉한(Elongated) → elongated; 압축된(Compact) → compact; 과장된(Exaggerated) → exaggerated; 치비(Chibi) → chibi | proportions, 비율, chibi, SD |

### 신체 비율 / Body proportions (5) — `person_body_proportions`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 317 | `person.body.head_size` | 머리 크기 / Head size | 상대 슬라이더 (1–5) | `Head size relative to body: {value}.` | 1 아주 작음(Very small) → very small; 2 작음(Small) → small; 3 보통(Medium) → medium-sized; 4 큼(Large) → large; 5 아주 큼(Very large) → very large | head size, 머리 크기, 얼굴 크기 |
| 318 | `person.body.heads_tall` | 등신 비율 / Heads tall | 숫자 슬라이더 2–10 (0.5 단위, “heads tall”) | `Head-to-body proportions: {value}.` | 예: 8 → “8 heads tall” | heads tall, head-to-body ratio, 등신, 8등신, 두신 |
| 319 | `person.body.upper_body_length` | 상체 길이 / Upper body length | 상대 슬라이더 (1–5) | `Upper body length: {value}.` | 1 아주 짧음(Very short) → very short; 2 짧음(Short) → short; 3 보통(Medium) → medium length; 4 긺(Long) → long; 5 아주 긺(Very long) → very long | upper body, 상체, torso length |
| 320 | `person.body.lower_body_length` | 하체 길이 / Lower body length | 상대 슬라이더 (1–5) | `Lower body length: {value}.` | 1 아주 짧음(Very short) → very short; 2 짧음(Short) → short; 3 보통(Medium) → medium length; 4 긺(Long) → long; 5 아주 긺(Very long) → very long | lower body, 하체 |
| 321 | `person.body.upper_lower_ratio` | 상하체 비율 / Upper-to-lower body ratio | 단일 · 칩 | `Upper-to-lower body proportion: {value}.` | 상체가 더 긺(Longer upper body) → longer upper body; 균형(Balanced) → balanced; 하체가 더 긺(Longer lower body) → longer lower body | upper lower ratio, 상하체 비율, 다리가 긴 |

### 목·어깨 / Neck & shoulders (5) — `person_body_neck_shoulders`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 322 | `person.body.neck_length` | 목 길이 / Neck length | 상대 슬라이더 (1–5) | `Neck length: {value}.` | 1 아주 짧음(Very short) → very short; 2 짧음(Short) → short; 3 보통(Medium) → medium length; 4 긺(Long) → long; 5 아주 긺(Very long) → very long | neck length, 목 |
| 323 | `person.body.neck_thickness` | 목 굵기 / Neck thickness | 상대 슬라이더 (1–5) | `Neck thickness: {value}.` | 1 아주 가늚(Very slender) → very slender; 2 가늚(Slender) → slender; 3 보통(Medium) → medium thickness; 4 굵음(Thick) → thick; 5 아주 굵음(Very thick) → very thick | neck thickness, 목 굵기 |
| 324 | `person.body.shoulder_width` | 어깨 너비 / Shoulder width | 상대 슬라이더 (1–5) | `Shoulder width: {value}.` | 1 아주 좁음(Very narrow) → very narrow; 2 좁음(Narrow) → narrow; 3 보통(Medium) → medium width; 4 넓음(Broad) → broad; 5 아주 넓음(Very broad) → very broad | shoulders, 어깨, 어깨 너비 |
| 325 | `person.body.shoulder_slope` | 어깨 기울기 / Shoulder slope | 단일 · 칩 | `Shoulder slope: {value}.` | 처진(Sloping) → sloping; 약간 처진(Gently sloping) → gently sloping; 거의 수평(Nearly horizontal) → nearly horizontal | shoulder slope, 처진 어깨, 직각 어깨 |
| 326 | `person.body.collarbones` | 쇄골 선명도 / Collarbone visibility | 상대 슬라이더 (1–5) | `Collarbones: {value}.` | 1 거의 안 보임(Barely visible) → barely visible; 2 약간 보임(Slightly visible) → slightly visible; 3 보임(Visible) → visible; 4 뚜렷함(Prominent) → prominent; 5 아주 뚜렷함(Highly prominent) → highly prominent | collarbones, 쇄골 |

### 몸통 / Torso (9) — `person_body_torso`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 327 | `person.body.rib_cage_width` | 흉곽 너비 / Rib cage width | 상대 슬라이더 (1–5) | `Rib cage width: {value}.` | 1 아주 좁음(Very narrow) → very narrow; 2 좁음(Narrow) → narrow; 3 보통(Medium) → medium width; 4 넓음(Broad) → broad; 5 아주 넓음(Very broad) → very broad | rib cage, 흉곽 |
| 328 | `person.body.chest_volume` | 가슴 볼륨 / Chest volume | 상대 슬라이더 (1–5) | `Chest volume: {value}.` | 1 아주 작음(Very small) → very small; 2 작음(Small) → small; 3 보통(Medium) → medium-sized; 4 큼(Large) → large; 5 아주 큼(Very large) → very large | chest, 가슴 |
| 329 | `person.body.pectorals` | 가슴 근육 발달 / Pectoral development | 상대 슬라이더 (1–5) | `Pectoral muscles: {value}.` | 1 거의 없음(Minimal) → minimal; 2 약간(Slight) → slightly developed; 3 보통(Moderate) → moderately developed; 4 발달(Well-developed) → well-developed; 5 아주 발달(Highly developed) → highly developed | pectorals, pecs, 가슴 근육, 대흉근 |
| 330 | `person.body.waist_width` | 허리 너비 / Waist width | 상대 슬라이더 (1–5) | `Waist width: {value}.` | 1 아주 좁음(Very narrow) → very narrow; 2 좁음(Narrow) → narrow; 3 보통(Medium) → medium width; 4 넓음(Broad) → broad; 5 아주 넓음(Very broad) → very broad | waist, 허리, 허리 둘레 |
| 331 | `person.body.waist_curvature` | 허리 굴곡 / Waist curvature | 상대 슬라이더 (1–5) | `Waist curvature: {value}.` | 1 거의 없음(Minimal) → minimal; 2 약간(Slight) → slight; 3 보통(Moderate) → moderate; 4 뚜렷함(Noticeable) → noticeable; 5 아주 뚜렷함(Pronounced) → pronounced | waist curve, 허리 라인, 잘록한 허리 |
| 332 | `person.body.abdomen` | 복부 형태 / Abdomen shape | 단일 · 칩 | `Abdomen: {value}.` | 평평한(Flat) → flat; 부드럽게 둥근(Softly rounded) → softly rounded; 나온(Protruding) → protruding | abdomen, belly, 배, 복부 |
| 333 | `person.body.abs_definition` | 복근 선명도 / Abdominal definition | 상대 슬라이더 (1–5) | `Abdominal definition: {value}.` | 1 거의 없음(Minimal) → minimal; 2 은은함(Subtle) → subtle; 3 보통(Moderate) → moderate; 4 선명함(Well-defined) → well-defined; 5 아주 선명함(Highly defined) → highly defined | abs, six-pack, 복근, 식스팩 |
| 334 | `person.body.back_width` | 등 너비 / Back width | 상대 슬라이더 (1–5) | `Back width: {value}.` | 1 아주 좁음(Very narrow) → very narrow; 2 좁음(Narrow) → narrow; 3 보통(Medium) → medium width; 4 넓음(Broad) → broad; 5 아주 넓음(Very broad) → very broad | back width, 등, 광배 |
| 335 | `person.body.back_muscles` | 등 근육 발달 / Back muscle development | 상대 슬라이더 (1–5) | `Back muscles: {value}.` | 1 거의 없음(Minimal) → minimal; 2 약간(Slight) → slightly developed; 3 보통(Moderate) → moderately developed; 4 발달(Well-developed) → well-developed; 5 아주 발달(Highly developed) → highly developed | back muscles, 등 근육 |

### 엉덩이·골반 / Hips & pelvis (4) — `person_body_hips`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 336 | `person.body.pelvis_width` | 골반 너비 / Pelvis width | 상대 슬라이더 (1–5) | `Pelvis width: {value}.` | 1 아주 좁음(Very narrow) → very narrow; 2 좁음(Narrow) → narrow; 3 보통(Medium) → medium width; 4 넓음(Broad) → broad; 5 아주 넓음(Very broad) → very broad | pelvis, hips, 골반 |
| 337 | `person.body.gluteal_volume` | 엉덩이 볼륨 / Gluteal volume | 상대 슬라이더 (1–5) | `Gluteal volume: {value}.` | 1 아주 작음(Very small) → very small; 2 작음(Small) → small; 3 보통(Medium) → medium-sized; 4 큼(Large) → large; 5 아주 큼(Very large) → very large | glutes, buttocks, 엉덩이 |
| 338 | `person.body.gluteal_shape` | 엉덩이 형태 / Gluteal shape | 단일 · 칩 + 사용자 정의 | `Gluteal shape: {value}.` | 평평한(Flat) → flat; 둥근(Rounded) → rounded; 각진(Angular) → angular; 완만한 굴곡(Gently contoured) → gently contoured | glute shape, 엉덩이 형태 |
| 339 | `person.body.waist_hip_contrast` | 허리·골반 대비 / Waist-to-hip contrast | 상대 슬라이더 (1–5) | `Waist-to-hip contrast: {value}.` | 1 아주 적음(Very low) → very low; 2 적음(Low) → low; 3 보통(Moderate) → moderate; 4 많음(High) → high; 5 아주 많음(Very high) → very high | waist-to-hip ratio, 허리 골반 비율 |

### 팔·손 / Arms & hands (7) — `person_body_arms_hands`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 340 | `person.body.arm_length` | 팔 길이 / Arm length | 상대 슬라이더 (1–5) | `Arm length: {value}.` | 1 아주 짧음(Very short) → very short; 2 짧음(Short) → short; 3 보통(Medium) → medium length; 4 긺(Long) → long; 5 아주 긺(Very long) → very long | arm length, 팔 |
| 341 | `person.body.upper_arm_thickness` | 위팔 굵기 / Upper arm thickness | 상대 슬라이더 (1–5) | `Upper arm thickness: {value}.` | 1 아주 가늚(Very slender) → very slender; 2 가늚(Slender) → slender; 3 보통(Medium) → medium thickness; 4 굵음(Thick) → thick; 5 아주 굵음(Very thick) → very thick | upper arms, 위팔, 팔뚝 |
| 342 | `person.body.forearm_thickness` | 아래팔 굵기 / Forearm thickness | 상대 슬라이더 (1–5) | `Forearm thickness: {value}.` | 1 아주 가늚(Very slender) → very slender; 2 가늚(Slender) → slender; 3 보통(Medium) → medium thickness; 4 굵음(Thick) → thick; 5 아주 굵음(Very thick) → very thick | forearms, 아래팔 |
| 343 | `person.body.arm_muscles` | 팔 근육 발달 / Arm muscle development | 상대 슬라이더 (1–5) | `Arm muscles: {value}.` | 1 거의 없음(Minimal) → minimal; 2 약간(Slight) → slightly developed; 3 보통(Moderate) → moderately developed; 4 발달(Well-developed) → well-developed; 5 아주 발달(Highly developed) → highly developed | arm muscles, 팔 근육, 이두 |
| 344 | `person.body.hand_size` | 손 크기 / Hand size | 상대 슬라이더 (1–5) | `Hand size: {value}.` | 1 아주 작음(Very small) → very small; 2 작음(Small) → small; 3 보통(Medium) → medium-sized; 4 큼(Large) → large; 5 아주 큼(Very large) → very large | hands, 손, 손 크기 |
| 345 | `person.body.finger_length` | 손가락 길이 / Finger length | 상대 슬라이더 (1–5) | `Finger length: {value}.` | 1 아주 짧음(Very short) → very short; 2 짧음(Short) → short; 3 보통(Medium) → medium length; 4 긺(Long) → long; 5 아주 긺(Very long) → very long | fingers, 손가락 |
| 346 | `person.body.finger_thickness` | 손가락 굵기 / Finger thickness | 상대 슬라이더 (1–5) | `Finger thickness: {value}.` | 1 아주 가늚(Very slender) → very slender; 2 가늚(Slender) → slender; 3 보통(Medium) → medium thickness; 4 굵음(Thick) → thick; 5 아주 굵음(Very thick) → very thick | finger thickness, 손가락 굵기 |

### 다리·발 / Legs & feet (7) — `person_body_legs_feet`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 347 | `person.body.leg_length` | 다리 길이 / Leg length | 상대 슬라이더 (1–5) | `Leg length: {value}.` | 1 아주 짧음(Very short) → very short; 2 짧음(Short) → short; 3 보통(Medium) → medium length; 4 긺(Long) → long; 5 아주 긺(Very long) → very long | leg length, 다리 |
| 348 | `person.body.thigh_thickness` | 허벅지 굵기 / Thigh thickness | 상대 슬라이더 (1–5) | `Thigh thickness: {value}.` | 1 아주 가늚(Very slender) → very slender; 2 가늚(Slender) → slender; 3 보통(Medium) → medium thickness; 4 굵음(Thick) → thick; 5 아주 굵음(Very thick) → very thick | thighs, 허벅지 |
| 349 | `person.body.calf_thickness` | 종아리 굵기 / Calf thickness | 상대 슬라이더 (1–5) | `Calf thickness: {value}.` | 1 아주 가늚(Very slender) → very slender; 2 가늚(Slender) → slender; 3 보통(Medium) → medium thickness; 4 굵음(Thick) → thick; 5 아주 굵음(Very thick) → very thick | calves, 종아리 |
| 350 | `person.body.leg_muscles` | 다리 근육 발달 / Leg muscle development | 상대 슬라이더 (1–5) | `Leg muscles: {value}.` | 1 거의 없음(Minimal) → minimal; 2 약간(Slight) → slightly developed; 3 보통(Moderate) → moderately developed; 4 발달(Well-developed) → well-developed; 5 아주 발달(Highly developed) → highly developed | leg muscles, 다리 근육 |
| 351 | `person.body.ankle_thickness` | 발목 굵기 / Ankle thickness | 상대 슬라이더 (1–5) | `Ankle thickness: {value}.` | 1 아주 가늚(Very slender) → very slender; 2 가늚(Slender) → slender; 3 보통(Medium) → medium thickness; 4 굵음(Thick) → thick; 5 아주 굵음(Very thick) → very thick | ankles, 발목 |
| 352 | `person.body.foot_size` | 발 크기 / Foot size | 상대 슬라이더 (1–5) | `Foot size: {value}.` | 1 아주 작음(Very small) → very small; 2 작음(Small) → small; 3 보통(Medium) → medium-sized; 4 큼(Large) → large; 5 아주 큼(Very large) → very large | feet, 발, 발 크기 |
| 353 | `person.body.leg_alignment` | 다리 형태 / Leg shape | 단일 · 칩 | `Leg alignment: {value}.` | 곧은 다리(Straight legs) → straight; 자연스럽게 휜 다리(Naturally curved legs) → naturally curved; O자 다리(Bow-legged) → bow-legged; X자 다리(Knock-kneed) → knock-kneed | leg shape, 다리 모양, O다리, X다리, bow legs |

## 3. 충돌 안내

신체 영역에는 선택지끼리의 실제 충돌이 없어 선택지 사이 규칙은 두지 않습니다. Sprint 2-C.2(TD-10)에서 **선택지 ↔ 상대 수치의 의미 충돌 5개**를 비차단 경고로 추가했습니다:
- 근육질 + 근육량 적음
- 통통한 + 체지방 적음
- 가녀린 + 체지방 많음
- 모래시계형 + 허리·골반 대비 낮음
- 치비 + 5등신 이상

규칙은 신체 속성만 읽고 신원(성별·연령·국적)은 참조하지 않습니다(Sprint 2-C.2 최종 승인, ADR-064). 일반적인 비율이나 외형을 강제하지 않으며, 의도적인 비현실적 표현을 제한하지 않습니다. 슬라이더를 설정했을 때만 판단하며, 값은 언제나 선택한 그대로 출력됩니다. “상체가 더 긺” + 상체·하체 길이처럼 두 수치를 서로 비교해야 하는 조합은 진단하지 않습니다(수치 대 수치 비교 조건 없음).

## 4. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았습니다.

## 5. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.4, 7개 하위 분류) | Sprint 2-B.4 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
