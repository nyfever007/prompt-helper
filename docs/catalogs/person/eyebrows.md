# 눈썹 (Eyebrows) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.2 Implementation Approval의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/facial.ts` (core 카탈로그 0.5.0), 카테고리 `person_eyebrows`
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md) · 템플릿: [../ATTRIBUTE_TEMPLATE.md](../ATTRIBUTE_TEMPLATE.md) · 같은 Sprint 영역: [얼굴](face.md) · [눈](eyes.md) · [코](nose.md) · [입술](lips.md)

## 1. 설계 목적과 원칙

눈썹 모양·각도·크기·위치·색상이며 서로 독립적입니다.

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 한 속성을 골라도 다른 속성이 자동으로 설정되지 않습니다.
- 외형을 표정·성격·인상·매력도와 연결하지 않으며, 성별·국적·민족적 배경에 특정 얼굴 특징을 자동 설정하지 않습니다.
- 모양·형태는 칩(또는 색상 팔레트), 정도(크기·너비·각도·두께·밀도)는 **상대 슬라이더(1–5, 의미 구간 5개)** 입니다. 슬라이더 숫자는 측정값이 아니며 화면에는 구간 이름만 표시합니다. 표시 위치(가운데)는 저장하지 않습니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공합니다. 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다.
- 좌우 개별 설정과 해부학적 정밀 측정은 범위 밖입니다.

## 2. 속성 목록 (8)

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 사용자 정의 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 240 | `person.eyebrows.shape` | 눈썹 모양 / Eyebrow shape | 단일 · 칩 | `Eyebrow shape: {value}.` | ✓ (이름만이면 안내) | eyebrow shape, brows, 눈썹 |
| 241 | `person.eyebrows.thickness` | 눈썹 두께 / Eyebrow thickness | 상대 슬라이더 (1–5) | `Eyebrow thickness: {value}.` | — | eyebrow thickness, 굵은 눈썹, 얇은 눈썹 |
| 242 | `person.eyebrows.length` | 눈썹 길이 / Eyebrow length | 상대 슬라이더 (1–5) | `Eyebrow length: {value}.` | — | eyebrow length |
| 243 | `person.eyebrows.density` | 눈썹 밀도 / Eyebrow density | 상대 슬라이더 (1–5) | `Eyebrow density: {value}.` | — | eyebrow density, 눈썹 숱 |
| 244 | `person.eyebrows.angle` | 눈썹 각도 / Eyebrow angle | 상대 슬라이더 (1–5) | `Eyebrow angle: {value}.` | — | eyebrow angle, 눈썹 기울기, 처진 눈썹, 올라간 눈썹 |
| 245 | `person.eyebrows.height` | 눈썹 높이 / Eyebrow height | 상대 슬라이더 (1–5) | `Eyebrow position: {value}.` | — | brow position, 눈썹 위치 |
| 246 | `person.eyebrows.spacing` | 눈썹 간격 / Eyebrow spacing | 상대 슬라이더 (1–5) | `Eyebrow spacing: {value}.` | — | brow spacing, 눈썹 사이 |
| 247 | `person.eyebrows.color` | 눈썹 색상 / Eyebrow color | 단일 · 색상 팔레트 | `Eyebrow color: {value}.` | ✓ (이름만이면 안내) | eyebrow color, 눈썹 색 |

## 3. 선택지와 영어 표현

### 눈썹 모양 — `person.eyebrows.shape`

눈썹의 형태이며 전체 기울기(각도)와 별개입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `straight` | 일자 | Straight | straight | 일자 눈썹 |
| `soft_arch` | 완만한 아치 | Softly arched | softly arched |  |
| `high_arch` | 높은 아치 | Highly arched | highly arched |  |
| `rounded` | 둥근 | Rounded | rounded |  |
| `angular` | 각진 | Angular | angular |  |
| `s_shaped` | S자형 | S-shaped | S-shaped |  |

### 눈썹 두께 — `person.eyebrows.thickness`

눈썹의 굵기입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 얇음 / Very thin | very thin | `Eyebrow thickness: very thin.` |
| 2 | 얇음 / Thin | thin | `Eyebrow thickness: thin.` |
| 3 | 보통 / Medium | medium thickness | `Eyebrow thickness: medium thickness.` |
| 4 | 두꺼움 / Thick | thick | `Eyebrow thickness: thick.` |
| 5 | 아주 두꺼움 / Very thick | very thick | `Eyebrow thickness: very thick.` |

### 눈썹 길이 — `person.eyebrows.length`

눈썹의 가로 길이입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 짧음 / Very short | very short | `Eyebrow length: very short.` |
| 2 | 짧음 / Short | short | `Eyebrow length: short.` |
| 3 | 보통 / Medium | medium length | `Eyebrow length: medium length.` |
| 4 | 긺 / Long | long | `Eyebrow length: long.` |
| 5 | 아주 긺 / Very long | very long | `Eyebrow length: very long.` |

### 눈썹 밀도 — `person.eyebrows.density`

눈썹 숱의 정도입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 성김 / Very sparse | very sparse | `Eyebrow density: very sparse.` |
| 2 | 성김 / Sparse | sparse | `Eyebrow density: sparse.` |
| 3 | 보통 / Medium | medium density | `Eyebrow density: medium density.` |
| 4 | 촘촘함 / Dense | dense | `Eyebrow density: dense.` |
| 5 | 아주 촘촘함 / Very dense | very dense | `Eyebrow density: very dense.` |

### 눈썹 각도 — `person.eyebrows.angle`

눈썹 전체의 기울기입니다(표정이 아닌 생김새). 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 많이 내려감 / Strongly downward-sloping | strongly downward-sloping | `Eyebrow angle: strongly downward-sloping.` |
| 2 | 약간 내려감 / Slightly downward-sloping | slightly downward-sloping | `Eyebrow angle: slightly downward-sloping.` |
| 3 | 수평 / Level | level | `Eyebrow angle: level.` |
| 4 | 약간 올라감 / Slightly upward-sloping | slightly upward-sloping | `Eyebrow angle: slightly upward-sloping.` |
| 5 | 많이 올라감 / Strongly upward-sloping | strongly upward-sloping | `Eyebrow angle: strongly upward-sloping.` |

### 눈썹 높이 — `person.eyebrows.height`

눈에서 눈썹까지의 높이입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 낮음 / Very low-set | very low-set | `Eyebrow position: very low-set.` |
| 2 | 낮음 / Low-set | low-set | `Eyebrow position: low-set.` |
| 3 | 보통 / Medium | medium height | `Eyebrow position: medium height.` |
| 4 | 높음 / High-set | high-set | `Eyebrow position: high-set.` |
| 5 | 아주 높음 / Very high-set | very high-set | `Eyebrow position: very high-set.` |

### 눈썹 간격 — `person.eyebrows.spacing`

두 눈썹 사이의 거리입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 가까움 / Very closely spaced | very closely spaced | `Eyebrow spacing: very closely spaced.` |
| 2 | 가까움 / Closely spaced | closely spaced | `Eyebrow spacing: closely spaced.` |
| 3 | 보통 / Average | average spacing | `Eyebrow spacing: average spacing.` |
| 4 | 넓음 / Widely spaced | widely spaced | `Eyebrow spacing: widely spaced.` |
| 5 | 아주 넓음 / Very widely spaced | very widely spaced | `Eyebrow spacing: very widely spaced.` |

### 눈썹 색상 — `person.eyebrows.color`

자연 눈썹 색이며 머리색과 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 견본 | 별칭 |
|---|---|---|---|---|---|
| `black` | 검은색 | Black | black | `#1c1a18` |  |
| `dark_brown` | 짙은 갈색 | Dark brown | dark brown | `#3b2617` |  |
| `brown` | 갈색 | Brown | brown | `#6b4428` |  |
| `light_brown` | 밝은 갈색 | Light brown | light brown | `#9c7350` |  |
| `blond` | 금발 | Blond | blond | `#c9a66b` | blonde |
| `gray` | 회색 | Gray | gray | `#8d8d8a` | grey |
| `white` | 흰색 | White | white | `#e9e6df` |  |

## 4. 의미 중복과 충돌

이 영역에는 충돌 규칙이 없습니다. 서로 다른 의미 축은 충돌로 취급하지 않습니다.

- 함께 존재할 수 있는 특징(예: 높고 돌출된 광대)은 다중 선택으로 표현하고, 실제로 반대되는 특징 쌍만 비차단 경고로 안내합니다. 원본 값은 바꾸지 않습니다.
- 눈썹 모양(윤곽)과 눈썹 각도(전체 기울기)는 별개 속성입니다. 눈썹 색상은 머리색과 독립적입니다.

## 5. 안전 정책

기존 정책(prompter.baseline 0.2.0)을 그대로 적용합니다. 이 영역의 표현은 그 자체로 안전 신호를 만들지 않으며(테스트), 연령·성적 표현 조합 규칙은 변하지 않습니다.

## 6. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았고, 검증되지 않은 예시를 실제 예시처럼 표시하지 않습니다(칩·팔레트만 사용).

## 7. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.2) | Sprint 2-B.2 Implementation Approval |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
