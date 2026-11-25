# 입술 (Lips) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.2 Implementation Approval의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/facial.ts` (core 카탈로그 0.5.0), 카테고리 `person_lips`
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md) · 템플릿: [../ATTRIBUTE_TEMPLATE.md](../ATTRIBUTE_TEMPLATE.md) · 같은 Sprint 영역: [얼굴](face.md) · [눈](eyes.md) · [눈썹](eyebrows.md) · [코](nose.md)

## 1. 설계 목적과 원칙

입술 모양·두께·비율·자연 색상입니다(메이크업 아님).

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 한 속성을 골라도 다른 속성이 자동으로 설정되지 않습니다.
- 외형을 표정·성격·인상·매력도와 연결하지 않으며, 성별·국적·민족적 배경에 특정 얼굴 특징을 자동 설정하지 않습니다.
- 모양·형태는 칩(또는 색상 팔레트), 정도(크기·너비·각도·두께·밀도)는 **상대 슬라이더(1–5, 의미 구간 5개)** 입니다. 슬라이더 숫자는 측정값이 아니며 화면에는 구간 이름만 표시합니다. 표시 위치(가운데)는 저장하지 않습니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공합니다. 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다.
- 좌우 개별 설정과 해부학적 정밀 측정은 범위 밖입니다.

## 2. 속성 목록 (8)

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 사용자 정의 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 256 | `person.lips.shape` | 입술 전체 모양 / Lip shape | 다중 · 칩 | `Lips: {value}.` | ✓ (이름만이면 안내) | lip shape, 입술 모양, lips |
| 257 | `person.lips.mouth_width` | 입 너비 / Mouth width | 상대 슬라이더 (1–5) | `Mouth width: {value}.` | — | mouth width, 입 크기 |
| 258 | `person.lips.upper_thickness` | 윗입술 두께 / Upper lip fullness | 상대 슬라이더 (1–5) | `Upper lip: {value}.` | — | upper lip, 윗입술 |
| 259 | `person.lips.lower_thickness` | 아랫입술 두께 / Lower lip fullness | 상대 슬라이더 (1–5) | `Lower lip: {value}.` | — | lower lip, 아랫입술 |
| 260 | `person.lips.ratio` | 입술 비율 / Lip proportion | 단일 · 칩 | `Lip proportion: {value}.` | — | lip ratio, 입술 비율 |
| 261 | `person.lips.cupids_bow` | 큐피드 보우 / Cupid's bow | 단일 · 칩 | `Cupid's bow: {value}.` | — | cupid's bow, 입술산, 인중 입술선 |
| 262 | `person.lips.corners` | 입꼬리 / Mouth corners | 상대 슬라이더 (1–5) | `Mouth corners at rest: {value}.` | — | mouth corners, 입꼬리 |
| 263 | `person.lips.natural_color` | 자연 입술 색상 / Natural lip color | 단일 · 색상 팔레트 | `Natural lip color: {value}.` | ✓ (이름만이면 안내) | lip color, 입술 색, natural lips |

## 3. 선택지와 영어 표현

### 입술 전체 모양 — `person.lips.shape`

입술 전체의 형태입니다. 윗입술·아랫입술 두께는 따로 정합니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `thin` | 얇은 | Thin | thin |  |
| `full` | 도톰한 | Full | full | plump lips |
| `heart` | 하트형 | Heart-shaped | heart-shaped |  |
| `rounded` | 둥근 | Rounded | rounded |  |
| `wide` | 넓은 | Wide | wide |  |
| `balanced` | 균형 잡힌 | Balanced | balanced |  |

### 입 너비 — `person.lips.mouth_width`

입의 가로 너비입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 좁음 / Very narrow | very narrow | `Mouth width: very narrow.` |
| 2 | 좁음 / Narrow | narrow | `Mouth width: narrow.` |
| 3 | 보통 / Medium | medium width | `Mouth width: medium width.` |
| 4 | 넓음 / Wide | wide | `Mouth width: wide.` |
| 5 | 아주 넓음 / Very wide | very wide | `Mouth width: very wide.` |

### 윗입술 두께 — `person.lips.upper_thickness`

윗입술의 두께입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 얇음 / Very thin | very thin | `Upper lip: very thin.` |
| 2 | 얇음 / Thin | thin | `Upper lip: thin.` |
| 3 | 보통 / Medium | medium fullness | `Upper lip: medium fullness.` |
| 4 | 도톰함 / Full | full | `Upper lip: full.` |
| 5 | 아주 도톰함 / Very full | very full | `Upper lip: very full.` |

### 아랫입술 두께 — `person.lips.lower_thickness`

아랫입술의 두께입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 얇음 / Very thin | very thin | `Lower lip: very thin.` |
| 2 | 얇음 / Thin | thin | `Lower lip: thin.` |
| 3 | 보통 / Medium | medium fullness | `Lower lip: medium fullness.` |
| 4 | 도톰함 / Full | full | `Lower lip: full.` |
| 5 | 아주 도톰함 / Very full | very full | `Lower lip: very full.` |

### 입술 비율 — `person.lips.ratio`

어느 입술이 더 도톰한지입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `upper_dominant` | 윗입술이 더 도톰 | Upper-lip dominant | upper-lip dominant |  |
| `balanced` | 균형 | Balanced | balanced |  |
| `lower_dominant` | 아랫입술이 더 도톰 | Lower-lip dominant | lower-lip dominant |  |

### 큐피드 보우 — `person.lips.cupids_bow`

윗입술 가운데 곡선의 뚜렷한 정도입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `flat` | 평평한 | Flat | flat |  |
| `subtle` | 은은한 | Subtle | subtle |  |
| `defined` | 뚜렷한 | Defined | defined |  |
| `deep` | 깊은 | Deep | deep |  |

### 입꼬리 — `person.lips.corners`

가만히 있을 때의 입꼬리 위치입니다(미소·표정이 아님). 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 많이 처짐 / Strongly downturned | strongly downturned | `Mouth corners at rest: strongly downturned.` |
| 2 | 약간 처짐 / Slightly downturned | slightly downturned | `Mouth corners at rest: slightly downturned.` |
| 3 | 수평 / Level | level | `Mouth corners at rest: level.` |
| 4 | 약간 올라감 / Slightly upturned | slightly upturned | `Mouth corners at rest: slightly upturned.` |
| 5 | 많이 올라감 / Strongly upturned | strongly upturned | `Mouth corners at rest: strongly upturned.` |

### 자연 입술 색상 — `person.lips.natural_color`

입술 본래의 색입니다 — 립스틱·메이크업이 아닙니다.

| ID | 한국어 | English | 프롬프트 표현 | 견본 | 별칭 |
|---|---|---|---|---|---|
| `pale_pink` | 연분홍 | Pale pink | pale pink | `#e8b4b0` |  |
| `pink` | 분홍 | Pink | pink | `#d9898b` |  |
| `rose` | 장밋빛 | Rose | rose | `#c56a72` |  |
| `coral` | 코랄 | Coral | coral | `#d9765f` |  |
| `red` | 붉은 | Red | red | `#b03a3e` |  |
| `mauve` | 모브 | Mauve | mauve | `#a8737e` |  |
| `brown_toned` | 갈색 톤 | Brown-toned | brown-toned | `#8c5a4a` | brown |
| `plum_toned` | 자두색 톤 | Plum-toned | plum-toned | `#7a3f55` | plum |

## 4. 의미 중복과 충돌

| 규칙 ID | 심각도 | 내용 |
|---|---|---|
| `lips-shape-thin-vs-full` | warning | ‘얇은’과(와) ‘도톰한’은(는) 서로 반대되는 특징입니다. |

- 함께 존재할 수 있는 특징(예: 높고 돌출된 광대)은 다중 선택으로 표현하고, 실제로 반대되는 특징 쌍만 비차단 경고로 안내합니다. 원본 값은 바꾸지 않습니다.
- 입술 전체 모양과 윗입술·아랫입술 두께는 별개 속성입니다(“얇은” + 두 입술 모두 도톰함, “도톰한” + 두 입술 모두 얇음, 입술 비율과 반대인 두께 조합은 Sprint 2-C.2부터 의미 충돌로 경고 — TD-10). 자연 입술 색상은 메이크업과 별개입니다.

## 5. 안전 정책

기존 정책(prompter.baseline 0.2.0)을 그대로 적용합니다. 이 영역의 표현은 그 자체로 안전 신호를 만들지 않으며(테스트), 연령·성적 표현 조합 규칙은 변하지 않습니다.

## 6. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았고, 검증되지 않은 예시를 실제 예시처럼 표시하지 않습니다(칩·팔레트만 사용).

## 7. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.2) | Sprint 2-B.2 Implementation Approval |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
