# 카메라 (Camera) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.6 개발 승인서의 초기 제품 카탈로그
- 구현: core 카탈로그 0.9.0 — 기존 Basic 속성 3개(`core.ts`, Sprint 1) + 새 Detailed 속성 15개(`src/domain/catalog/catalogs/shared/camera.ts`), 카테고리 `shared_camera`(18개, 한 화면)
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md)

## 1. 설계 목적과 원칙

- **재사용**: 프레이밍(`composition.framing`), 피사체 관찰 방향(`composition.view_direction`), 카메라 앵글(`camera.angle`)은 Sprint 1 Basic 속성을 그대로 씁니다(ID·선택지·출력·Basic 동작 변경 없음, 중복 속성 없음).
- 카메라 설정은 인물뿐 아니라 풍경·제품·건축물 등 모든 피사체에 적용됩니다. 초점 대상의 눈·얼굴만 인물·여러 사람·동물에 적용됩니다.
- **초점 거리**(14–200 mm)와 **조리개**(f/1.4–f/22)는 실제 수치·단위를 화면에 표시하고 그대로 출력합니다(목록 밖 값은 사용자 정의). 이미지 모델이 정확한 광학 결과를 재현하지 않는다는 안내를 표시합니다.
- 렌즈 종류·초점 거리·조리개·피사계 심도·원근감은 서로 값을 설정하지 않습니다. 직교 투영이면 원근감을 출력하지 않습니다(값 보존).
- 카메라 모델·브랜드를 추가하지 않습니다. 실제 카메라 시뮬레이션은 범위 밖입니다.
- 조리개 ↔ 피사계 심도 같은 선택지 ↔ 수치 불일치는 진단하지 않습니다(TD-10).

## 2. 속성 목록 (18)

### 카메라 / Camera (18) — `shared_camera`

| 순서 | Attribute ID | 한국어 / English | 단계 | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|---|
| 1400 | `composition.framing` | 구도 (화면에 담는 범위) / Framing | Basic+Detailed | 단일 · 칩 | `Framing: {value}.` | 익스트림 클로즈업(Extreme close-up) → extreme close-up on a small detail; 얼굴 클로즈업(Face close-up) → close-up of the face; 머리와 어깨 (바스트 샷)(Head and shoulders) → head-and-shoulders portrait; 상반신(Upper body) → upper-body shot; 무릎 위(Knees up) → knees-up shot; 전신(Full body) → full-body shot; 전원이 보이는 단체 구도(Whole group) → group shot with everyone in frame; 피사체 전체(Whole subject in frame) → the whole subject fully in frame; 와이드 샷 (주변 포함)(Wide shot) → wide shot showing the surroundings; 익스트림 와이드 (전경)(Extreme wide / establishing) → extreme wide establishing shot; 파노라마(Panoramic) → panoramic view | `subject.kind` ∈ person/group/animal/object/vehicle/architecture/landscape (미설정이면 통과) |  |
| 1500 | `composition.view_direction` | 보는 방향 / Viewing direction | Basic+Detailed | 단일 · 칩 | `Viewing direction: {value}.` | 정면(Front) → front view; 3/4 측면(Three-quarter) → three-quarter view; 측면 (옆모습)(Side / profile) → side view; 뒷모습(Back) → back view | `subject.kind` ∈ person/group/animal/object/vehicle/architecture (미설정이면 통과) |  |
| 1600 | `camera.angle` | 카메라 각도 (높이) / Camera angle | Basic+Detailed | 단일 · 칩 | `Camera angle: {value}.` | 눈높이(Eye level) → eye-level angle; 하이 앵글 (내려다봄)(High angle) → high angle looking down; 로우 앵글 (올려다봄)(Low angle) → low angle looking up; 버즈아이 (바로 위)(Bird's-eye (overhead)) → bird's-eye view from directly above; 웜즈아이 (바닥에서)(Worm's-eye) → worm's-eye view from ground level | `subject.kind` ∈ person/group/animal/object/vehicle/architecture/landscape (미설정이면 통과) |  |
| 1605 | `camera.distance` | 카메라 거리 / Camera distance | Detailed | 상대 슬라이더 (1–5) | `Camera distance: {value}.` | 1 아주 가까움(Very close) → very close; 2 가까움(Close) → close; 3 보통(Medium) → medium distance; 4 멂(Distant) → distant; 5 아주 멂(Very distant) → very distant | 모든 피사체 | distance, 거리, 촬영 거리 |
| 1610 | `camera.roll` | 카메라 롤 (기울기) / Camera roll | Detailed | 단일 · 칩 | `Camera roll: {value}.` | 수평(Level) → level horizon; 왼쪽으로 기움(Tilted left) → tilted to the left; 오른쪽으로 기움(Tilted right) → tilted to the right; 더치 앵글(Dutch angle) → Dutch angle | 모든 피사체 | roll, dutch angle, 더치 앵글, 기울어진 화면 |
| 1615 | `composition.layout` | 구도 배치 / Composition | Detailed | 다중 · 칩 + 사용자 정의 | `Composition: {value}.` | 중앙(Centered) → centered composition; 삼분할(Rule of thirds) → rule of thirds; 대칭(Symmetrical) → symmetrical composition; 비대칭(Asymmetrical) → asymmetrical composition; 황금비(Golden ratio) → golden ratio composition; 대각선(Diagonal) → diagonal composition; 유도선(Leading lines) → leading lines | 모든 피사체 | composition, rule of thirds, 삼분할, 황금비, 대칭 구도 |
| 1620 | `composition.negative_space` | 여백 / Negative space | Detailed | 상대 슬라이더 (1–5) | `Negative space: {value}.` | 1 최소(Minimal) → minimal; 2 적음(Little) → little; 3 보통(Moderate) → moderate; 4 넉넉함(Ample) → ample; 5 아주 넉넉함(Generous) → generous | 모든 피사체 | negative space, 여백, 빈 공간 |
| 1625 | `composition.subject_position` | 피사체 위치 / Subject position | Detailed | 다중 · 칩 | `Subject position: {value}.` | 가운데(Center) → center of the frame; 왼쪽(Left) → left side of the frame; 오른쪽(Right) → right side of the frame; 위쪽(Upper) → upper part of the frame; 아래쪽(Lower) → lower part of the frame | 모든 피사체 | subject position, 피사체 위치, 배치 |
| 1630 | `camera.lens_type` | 렌즈 종류 / Lens type | Detailed | 단일 · 칩 + 사용자 정의 | `Lens: {value}.` | 초광각(Ultra-wide-angle) → ultra-wide-angle lens; 광각(Wide-angle) → wide-angle lens; 표준(Standard) → standard lens; 망원(Telephoto) → telephoto lens; 매크로(Macro) → macro lens; 어안(Fisheye) → fisheye lens | 모든 피사체 | lens, 렌즈, 광각, 망원, 어안 |
| 1635 | `camera.focal_length` | 초점 거리 / Focal length | Detailed | 단일 · 칩 + 사용자 정의 | `Focal length: {value}.` | 14mm(14 mm) → 14 mm; 20mm(20 mm) → 20 mm; 24mm(24 mm) → 24 mm; 28mm(28 mm) → 28 mm; 35mm(35 mm) → 35 mm; 50mm(50 mm) → 50 mm; 70mm(70 mm) → 70 mm; 85mm(85 mm) → 85 mm; 105mm(105 mm) → 105 mm; 135mm(135 mm) → 135 mm; 200mm(200 mm) → 200 mm | 모든 피사체 | focal length, mm, 초점거리, 화각 |
| 1640 | `camera.projection` | 투영 방식 / Projection | Detailed | 단일 · 칩 | `Projection: {value}.` | 원근 투영(Perspective) → perspective projection; 직교 투영(Orthographic) → orthographic projection | 모든 피사체 | projection, 투영, orthographic, 아이소메트릭 |
| 1645 | `camera.perspective` | 원근감 / Perspective | Detailed | 단일 · 칩 | `Perspective: {value}.` | 압축된(Compressed) → compressed perspective; 자연스러운(Natural) → natural perspective; 과장된(Exaggerated) → exaggerated perspective | `camera.projection` ≠ orthographic (미설정이면 통과) | perspective, 원근감, 압축감, 왜곡 |
| 1650 | `camera.aperture` | 조리개 / Aperture | Detailed | 단일 · 칩 + 사용자 정의 | `Aperture: {value}.` | f/1.4(f/1.4) → f/1.4; f/1.8(f/1.8) → f/1.8; f/2(f/2) → f/2; f/2.8(f/2.8) → f/2.8; f/4(f/4) → f/4; f/5.6(f/5.6) → f/5.6; f/8(f/8) → f/8; f/11(f/11) → f/11; f/16(f/16) → f/16; f/22(f/22) → f/22 | 모든 피사체 | aperture, f-stop, f값, 조리개 값 |
| 1655 | `camera.depth_of_field` | 피사계 심도 / Depth of field | Detailed | 상대 슬라이더 (1–5) | `Depth of field: {value}.` | 1 아주 얕음(Very shallow) → very shallow; 2 얕음(Shallow) → shallow; 3 보통(Moderate) → moderate; 4 깊음(Deep) → deep; 5 아주 깊음(Very deep) → very deep | 모든 피사체 | depth of field, DOF, 심도, 아웃포커싱, 배경 흐림 |
| 1660 | `camera.focus_target` | 초점 대상 / Focus target | Detailed | 단일 · 칩 + 사용자 정의 | `Focus on: {value}.` | 눈(Eyes) → the eyes; 얼굴(Face) → the face; 피사체 전체(Entire subject) → the entire subject; 전경(Foreground) → the foreground; 배경(Background) → the background | 모든 피사체 | focus, 초점, 포커스 |
| 1665 | `camera.focus_sharpness` | 초점 선명도 / Focus sharpness | Detailed | 상대 슬라이더 (1–5) | `Focus sharpness: {value}.` | 1 아주 부드러움(Very soft) → very soft focus; 2 부드러움(Soft) → soft focus; 3 보통(Moderate) → moderately sharp; 4 선명함(Sharp) → sharp; 5 아주 선명함(Highly sharp) → highly sharp | 모든 피사체 | sharpness, 선명도, 소프트 포커스 |
| 1670 | `camera.bokeh` | 보케 형태 / Bokeh shape | Detailed | 단일 · 칩 + 사용자 정의 | `Bokeh: {value}.` | 원형(Circular) → circular bokeh; 타원형(Oval) → oval bokeh; 회오리(Swirling) → swirling bokeh; 다각형(Polygonal) → polygonal bokeh | 모든 피사체 | bokeh, 보케, 빛망울 |
| 1675 | `camera.motion_blur` | 모션 블러 / Motion blur | Detailed | 단일 · 칩 | `Motion blur: {value}.` | 없음(None) → none; 약간(Subtle) → subtle; 보통(Moderate) → moderate; 강함(Strong) → strong | 모든 피사체 | motion blur, 모션 블러, 흔들림, 잔상 |

## 3. 충돌 안내 (비차단, 값 자동 변경 없음)

`overhead-vs-direction`, `silhouette-hides-face`는 Sprint 1부터 있던 규칙입니다.

| 규칙 ID | 관련 속성 | 안내 문구 |
|---|---|---|
| `overhead-vs-direction` | `camera.angle`, `composition.view_direction` | 바로 위에서 내려다보는 버즈아이 각도에서는 정면·측면·뒷모습 구분이 거의 보이지 않습니다. |
| `silhouette-hides-face` | `lighting.preset`, `composition.framing` | 강한 역광은 얼굴 클로즈업을 실루엣으로 만들 수 있습니다. |
| `camera-telephoto-vs-short-focal-length` | `camera.lens_type`, `camera.focal_length` | 망원 렌즈인데 초점 거리가 짧게 설정되었습니다. |
| `camera-wide-vs-long-focal-length` | `camera.lens_type`, `camera.focal_length` | 광각 렌즈인데 초점 거리가 길게 설정되었습니다. |
| `camera-fisheye-vs-orthographic` | `camera.lens_type`, `camera.projection` | 어안 렌즈와 직교 투영은 함께 쓸 수 없습니다. |
| `composition-layout-centered-vs-rule-of-thirds` | `composition.layout` | ‘중앙’과(와) ‘삼분할’은(는) 서로 반대되는 특징입니다. |
| `composition-layout-symmetrical-vs-asymmetrical` | `composition.layout` | ‘대칭’과(와) ‘비대칭’은(는) 서로 반대되는 특징입니다. |
| `composition-subject-position-left-vs-right` | `composition.subject_position` | ‘왼쪽’과(와) ‘오른쪽’은(는) 서로 반대되는 특징입니다. |
| `composition-subject-position-upper-vs-lower` | `composition.subject_position` | ‘위쪽’과(와) ‘아래쪽’은(는) 서로 반대되는 특징입니다. |

## 4. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-25 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.6) | Sprint 2-B.6 개발 승인서 (Sprint 1 승인 속성 3개 재사용) |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
