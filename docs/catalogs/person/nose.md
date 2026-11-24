# 코 (Nose) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.2 Implementation Approval의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/facial.ts` (core 카탈로그 0.5.0), 카테고리 `person_nose`
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md) · 템플릿: [../ATTRIBUTE_TEMPLATE.md](../ATTRIBUTE_TEMPLATE.md) · 같은 Sprint 영역: [얼굴](face.md) · [눈](eyes.md) · [눈썹](eyebrows.md) · [입술](lips.md)

## 1. 설계 목적과 원칙

코의 전체 모양과 세부 구조입니다.

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 한 속성을 골라도 다른 속성이 자동으로 설정되지 않습니다.
- 외형을 표정·성격·인상·매력도와 연결하지 않으며, 성별·국적·민족적 배경에 특정 얼굴 특징을 자동 설정하지 않습니다.
- 모양·형태는 칩(또는 색상 팔레트), 정도(크기·너비·각도·두께·밀도)는 **상대 슬라이더(1–5, 의미 구간 5개)** 입니다. 슬라이더 숫자는 측정값이 아니며 화면에는 구간 이름만 표시합니다. 표시 위치(가운데)는 저장하지 않습니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공합니다. 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다.
- 좌우 개별 설정과 해부학적 정밀 측정은 범위 밖입니다.

## 2. 속성 목록 (8)

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 사용자 정의 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 248 | `person.nose.shape` | 코 전체 모양 / Nose shape | 단일 · 칩 | `Nose shape: {value}.` | ✓ (이름만이면 안내) | nose shape, 코 모양, 코 |
| 249 | `person.nose.length` | 코 길이 / Nose length | 상대 슬라이더 (1–5) | `Nose length: {value}.` | — | nose length |
| 250 | `person.nose.width` | 코 너비 / Nose width | 상대 슬라이더 (1–5) | `Nose width: {value}.` | — | nose width |
| 251 | `person.nose.bridge_height` | 콧대 높이 / Nasal bridge height | 상대 슬라이더 (1–5) | `Nasal bridge height: {value}.` | — | nose bridge, 콧대 |
| 252 | `person.nose.bridge_shape` | 콧대 모양 / Nasal bridge shape | 단일 · 칩 | `Nasal bridge shape: {value}.` | — | bridge shape, 콧대 모양, hump |
| 253 | `person.nose.tip_shape` | 코끝 모양 / Nasal tip shape | 단일 · 칩 | `Nasal tip: {value}.` | ✓ (이름만이면 안내) | nose tip, 코끝 |
| 254 | `person.nose.tip_angle` | 코끝 각도 / Nasal tip angle | 상대 슬라이더 (1–5) | `Nasal tip angle: {value}.` | — | tip angle, 들린 코끝, 처진 코끝 |
| 255 | `person.nose.alar_width` | 콧볼 너비 / Nostril width | 상대 슬라이더 (1–5) | `Nostril wing (alar) width: {value}.` | — | alar width, nostrils, 콧볼 |

## 3. 선택지와 영어 표현

### 코 전체 모양 — `person.nose.shape`

전체 모양입니다. 콧대·코끝·너비 등 세부 구조는 따로 정하며, 같은 의미가 두 번 선택되면 한 번만 출력합니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `straight` | 직선형 | Straight | straight (covers person.nose.bridge_shape=straight) |  |
| `roman` | 로마형 | Roman | Roman (covers person.nose.bridge_shape=convex) | roman nose |
| `aquiline` | 매부리형 | Aquiline | aquiline (covers person.nose.bridge_shape=convex) | hooked nose, 매부리코 |
| `button` | 버튼형 | Button | button | button nose, 작고 둥근 코 |
| `upturned` | 들린 코 | Upturned | upturned | snub nose, 들창코 |
| `broad` | 넓은 코 | Broad | broad |  |
| `concave` | 오목한 코 | Concave | concave (covers person.nose.bridge_shape=concave) | ski-slope nose |

### 코 길이 — `person.nose.length`

콧대에서 코끝까지의 길이입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 짧음 / Very short | very short | `Nose length: very short.` |
| 2 | 짧음 / Short | short | `Nose length: short.` |
| 3 | 보통 / Medium | medium length | `Nose length: medium length.` |
| 4 | 긺 / Long | long | `Nose length: long.` |
| 5 | 아주 긺 / Very long | very long | `Nose length: very long.` |

### 코 너비 — `person.nose.width`

코 전체의 너비입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 좁음 / Very narrow | very narrow | `Nose width: very narrow.` |
| 2 | 좁음 / Narrow | narrow | `Nose width: narrow.` |
| 3 | 보통 / Medium | medium width | `Nose width: medium width.` |
| 4 | 넓음 / Wide | wide | `Nose width: wide.` |
| 5 | 아주 넓음 / Very wide | very wide | `Nose width: very wide.` |

### 콧대 높이 — `person.nose.bridge_height`

콧대의 높이입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 낮음 / Very low | very low | `Nasal bridge height: very low.` |
| 2 | 낮음 / Low | low | `Nasal bridge height: low.` |
| 3 | 보통 / Medium | medium height | `Nasal bridge height: medium height.` |
| 4 | 높음 / High | high | `Nasal bridge height: high.` |
| 5 | 아주 높음 / Very high | very high | `Nasal bridge height: very high.` |

### 콧대 모양 — `person.nose.bridge_shape`

옆에서 본 콧대의 모양입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `straight` | 곧은 | Straight | straight |  |
| `convex` | 볼록한 | Convex | convex | humped, 매부리 |
| `concave` | 오목한 | Concave | concave |  |

### 코끝 모양 — `person.nose.tip_shape`

코끝의 모양입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `rounded` | 둥근 | Rounded | rounded |  |
| `pointed` | 뾰족한 | Pointed | pointed |  |
| `broad` | 넓은 | Broad | broad |  |
| `angular` | 각진 | Angular | angular |  |
| `cleft` | 갈라진 | Cleft | cleft | bifid tip |

### 코끝 각도 — `person.nose.tip_angle`

코끝이 아래 또는 위를 향하는 정도입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 많이 아래로 / Strongly downward-pointing | strongly downward-pointing | `Nasal tip angle: strongly downward-pointing.` |
| 2 | 약간 아래로 / Slightly downward-pointing | slightly downward-pointing | `Nasal tip angle: slightly downward-pointing.` |
| 3 | 정면 / Straight | pointing straight ahead | `Nasal tip angle: pointing straight ahead.` |
| 4 | 약간 위로 / Slightly upward-pointing | slightly upward-pointing | `Nasal tip angle: slightly upward-pointing.` |
| 5 | 많이 위로 / Strongly upward-pointing | strongly upward-pointing | `Nasal tip angle: strongly upward-pointing.` |

### 콧볼 너비 — `person.nose.alar_width`

콧방울(콧볼)의 너비입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 좁음 / Very narrow | very narrow | `Nostril wing (alar) width: very narrow.` |
| 2 | 좁음 / Narrow | narrow | `Nostril wing (alar) width: narrow.` |
| 3 | 보통 / Medium | medium width | `Nostril wing (alar) width: medium width.` |
| 4 | 넓음 / Wide | wide | `Nostril wing (alar) width: wide.` |
| 5 | 아주 넓음 / Very wide | very wide | `Nostril wing (alar) width: very wide.` |

## 4. 의미 중복과 충돌

| 규칙 ID | 심각도 | 내용 |
|---|---|---|
| `nose-convex-shape-vs-bridge` | warning | 코 전체 모양과 콧대 모양이 서로 맞지 않습니다. |
| `nose-concave-shape-vs-bridge` | warning | 코 전체 모양과 콧대 모양이 서로 맞지 않습니다. |
| `nose-straight-shape-vs-bridge` | warning | 코 전체 모양과 콧대 모양이 서로 맞지 않습니다. |

- 함께 존재할 수 있는 특징(예: 높고 돌출된 광대)은 다중 선택으로 표현하고, 실제로 반대되는 특징 쌍만 비차단 경고로 안내합니다. 원본 값은 바꾸지 않습니다.
- 코 전체 모양이 콧대 모양과 같은 의미를 담으면(예: 매부리형 + 볼록한 콧대) 콧대 모양 문장은 `covers`로 생략하고 출처를 남깁니다. 서로 어긋나면 둘 다 출력하고 경고합니다.
- 코 전체 모양(예: 들린 코)과 코끝 각도(슬라이더)의 불일치는 아직 진단하지 않습니다(TD-10).

## 5. 안전 정책

기존 정책(prompter.baseline 0.2.0)을 그대로 적용합니다. 이 영역의 표현은 그 자체로 안전 신호를 만들지 않으며(테스트), 연령·성적 표현 조합 규칙은 변하지 않습니다.

## 6. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았고, 검증되지 않은 예시를 실제 예시처럼 표시하지 않습니다(칩·팔레트만 사용).

## 7. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.2) | Sprint 2-B.2 Implementation Approval |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
