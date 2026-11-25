# 눈 (Eyes) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.2 Implementation Approval의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/facial.ts` (core 카탈로그 0.5.0), 카테고리 `person_eyes`
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md) · 템플릿: [../ATTRIBUTE_TEMPLATE.md](../ATTRIBUTE_TEMPLATE.md) · 같은 Sprint 영역: [얼굴](face.md) · [눈썹](eyebrows.md) · [코](nose.md) · [입술](lips.md)

## 1. 설계 목적과 원칙

눈 모양·크기·위치·눈꺼풀·홍채·동공·속눈썹이며 서로 독립적입니다.

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 한 속성을 골라도 다른 속성이 자동으로 설정되지 않습니다.
- 외형을 표정·성격·인상·매력도와 연결하지 않으며, 성별·국적·민족적 배경에 특정 얼굴 특징을 자동 설정하지 않습니다.
- 모양·형태는 칩(또는 색상 팔레트), 정도(크기·너비·각도·두께·밀도)는 **상대 슬라이더(1–5, 의미 구간 5개)** 입니다. 슬라이더 숫자는 측정값이 아니며 화면에는 구간 이름만 표시합니다. 표시 위치(가운데)는 저장하지 않습니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공합니다. 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다.
- 좌우 개별 설정과 해부학적 정밀 측정은 범위 밖입니다.

## 2. 속성 목록 (13)

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 사용자 정의 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 227 | `person.eyes.shape` | 눈 모양 / Eye shape | 단일 · 칩 | `Eye shape: {value}.` | ✓ (이름만이면 안내) | eye shape, 눈매 |
| 228 | `person.eyes.size` | 눈 크기 / Eye size | 상대 슬라이더 (1–5) | `Eye size: {value}.` | — | eye size, 큰 눈, 작은 눈 |
| 229 | `person.eyes.width` | 눈 너비 / Eye width | 상대 슬라이더 (1–5) | `Eye width: {value}.` | — | eye width, 눈 가로 |
| 230 | `person.eyes.height` | 눈 높이 / Eye height | 상대 슬라이더 (1–5) | `Eye opening height: {value}.` | — | eye opening height, 눈 세로 |
| 231 | `person.eyes.spacing` | 눈 간격 / Eye spacing | 상대 슬라이더 (1–5) | `Eye spacing: {value}.` | — | eye spacing, 미간, close-set, wide-set |
| 232 | `person.eyes.outer_corner_angle` | 눈꼬리 각도 / Outer eye corner angle | 상대 슬라이더 (1–5) | `Outer eye corners: {value}.` | — | eye corners, 눈꼬리, 올라간 눈, 처진 눈, cat eye |
| 233 | `person.eyes.depth` | 눈 깊이 / Eye depth | 단일 · 칩 | `Eye depth: {value}.` | — | eye depth, deep-set, 눈 깊이 |
| 234 | `person.eyes.eyelids` | 쌍꺼풀 / Eyelids | 다중 · 칩 | `Eyelids: {value}.` | ✓ (이름만이면 안내) | eyelids, 눈꺼풀, 쌍꺼풀, 외꺼풀, 속쌍 |
| 235 | `person.eyes.iris_color` | 홍채 색상 / Iris color | 단일 · 색상 팔레트 | `Iris color: {value}.` | ✓ (이름만이면 안내) | eye color, 눈동자 색, 눈 색깔, iris |
| 236 | `person.eyes.iris_size` | 홍채 크기 / Iris size | 상대 슬라이더 (1–5) | `Iris size: {value}.` | — | iris size, 눈동자 크기 |
| 237 | `person.eyes.pupil_shape` | 동공 모양 / Pupil shape | 단일 · 칩 | `Pupils: {value}.` | ✓ (이름만이면 안내) | pupil, 동공, slit pupils |
| 238 | `person.eyes.lash_length` | 속눈썹 길이 / Eyelash length | 상대 슬라이더 (1–5) | `Eyelash length: {value}.` | — | eyelashes, lashes, 속눈썹 |
| 239 | `person.eyes.lash_density` | 속눈썹 밀도 / Eyelash density | 상대 슬라이더 (1–5) | `Eyelash density: {value}.` | — | eyelash density, 속눈썹 숱 |

## 3. 선택지와 영어 표현

### 눈 모양 — `person.eyes.shape`

눈의 윤곽입니다. 눈꺼풀·크기·너비·높이와 별개입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `almond` | 아몬드형 | Almond-shaped | almond-shaped |  |
| `round` | 둥근 | Round | round | 동그란 눈 |
| `oval` | 타원형 | Oval | oval |  |
| `elongated` | 가로로 긴 | Elongated | elongated | long eyes, 긴 눈 |

### 눈 크기 — `person.eyes.size`

눈의 전체 크기입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 작음 / Very small | very small | `Eye size: very small.` |
| 2 | 작음 / Small | small | `Eye size: small.` |
| 3 | 보통 / Medium | medium-sized | `Eye size: medium-sized.` |
| 4 | 큼 / Large | large | `Eye size: large.` |
| 5 | 아주 큼 / Very large | very large | `Eye size: very large.` |

### 눈 너비 — `person.eyes.width`

눈의 가로 길이입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 좁음 / Very narrow | very narrow | `Eye width: very narrow.` |
| 2 | 좁음 / Narrow | narrow | `Eye width: narrow.` |
| 3 | 보통 / Medium | medium width | `Eye width: medium width.` |
| 4 | 넓음 / Wide | wide | `Eye width: wide.` |
| 5 | 아주 넓음 / Very wide | very wide | `Eye width: very wide.` |

### 눈 높이 — `person.eyes.height`

눈을 뜬 세로 높이입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 낮음 / Very low | very low | `Eye opening height: very low.` |
| 2 | 낮음 / Low | low | `Eye opening height: low.` |
| 3 | 보통 / Medium | medium height | `Eye opening height: medium height.` |
| 4 | 높음 / Tall | tall | `Eye opening height: tall.` |
| 5 | 아주 높음 / Very tall | very tall | `Eye opening height: very tall.` |

### 눈 간격 — `person.eyes.spacing`

두 눈 사이의 거리입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 가까움 / Very close-set | very close-set | `Eye spacing: very close-set.` |
| 2 | 가까움 / Close-set | close-set | `Eye spacing: close-set.` |
| 3 | 보통 / Average | average spacing | `Eye spacing: average spacing.` |
| 4 | 넓음 / Wide-set | wide-set | `Eye spacing: wide-set.` |
| 5 | 아주 넓음 / Very wide-set | very wide-set | `Eye spacing: very wide-set.` |

### 눈꼬리 각도 — `person.eyes.outer_corner_angle`

바깥 눈꼬리의 기울기입니다(표정이 아닌 생김새). 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 많이 처짐 / Strongly downturned | strongly downturned | `Outer eye corners: strongly downturned.` |
| 2 | 약간 처짐 / Slightly downturned | slightly downturned | `Outer eye corners: slightly downturned.` |
| 3 | 수평 / Level | level | `Outer eye corners: level.` |
| 4 | 약간 올라감 / Slightly upturned | slightly upturned | `Outer eye corners: slightly upturned.` |
| 5 | 많이 올라감 / Strongly upturned | strongly upturned | `Outer eye corners: strongly upturned.` |

### 눈 깊이 — `person.eyes.depth`

눈이 얼굴에 들어간 깊이입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `deep_set` | 깊은 | Deep-set | deep-set | 움푹한 눈 |
| `average` | 보통 | Average-set | average-set |  |
| `prominent` | 돌출된 | Prominent | prominent | 튀어나온 눈 |

### 쌍꺼풀 — `person.eyes.eyelids`

눈꺼풀 주름 형태로 눈 모양과 별개입니다. 덮인 눈꺼풀은 어떤 형태와도 함께 고를 수 있습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `monolid` | 외꺼풀 | Monolids | monolids | 무쌍, monolid |
| `inner_crease` | 속쌍꺼풀 | Subtle inner creases | subtle inner eyelid creases | 속쌍, inner double eyelid |
| `thin_double` | 얇은 쌍꺼풀 | Thin double eyelids | thin double eyelid creases |  |
| `defined_double` | 뚜렷한 쌍꺼풀 | Defined double eyelids | defined double eyelid creases | 진한 쌍꺼풀 |
| `hooded` | 덮인 눈꺼풀 | Hooded eyelids | hooded eyelids | hooded |

### 홍채 색상 — `person.eyes.iris_color`

자연 또는 판타지 홍채 색입니다. 국적·민족과 연결하지 않습니다.

| ID | 한국어 | English | 프롬프트 표현 | 견본 | 별칭 |
|---|---|---|---|---|---|
| `brown` | 갈색 | Brown | brown | `#7b4a26` |  |
| `dark_brown` | 짙은 갈색 | Dark brown | dark brown | `#4a2b16` |  |
| `near_black` | 흑갈색 | Near-black brown | near-black brown | `#22160f` | black eyes, 검은 눈 |
| `hazel` | 헤이즐 | Hazel | hazel | `#8e7240` |  |
| `amber` | 호박색 | Amber | amber | `#c68a1b` |  |
| `green` | 녹색 | Green | green | `#4f7a3a` |  |
| `blue` | 파란색 | Blue | blue | `#3f6fb0` |  |
| `gray` | 회색 | Gray | gray | `#8a9098` | grey |
| `violet` | 보라색 | Violet | violet | `#7a4fa8` | purple |
| `red` | 빨간색 | Red | red | `#b3262e` |  |
| `gold` | 금색 | Gold | gold | `#d4a72c` |  |
| `silver` | 은색 | Silver | silver | `#c3c7cc` |  |

### 홍채 크기 — `person.eyes.iris_size`

눈에 대한 홍채의 상대적 크기입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 작음 / Very small | very small | `Iris size: very small.` |
| 2 | 작음 / Small | small | `Iris size: small.` |
| 3 | 보통 / Medium | medium-sized | `Iris size: medium-sized.` |
| 4 | 큼 / Large | large | `Iris size: large.` |
| 5 | 아주 큼 / Very large | very large | `Iris size: very large.` |

### 동공 모양 — `person.eyes.pupil_shape`

판타지 형태를 포함하며 종족을 뜻하지 않습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `round` | 둥근 | Round | round |  |
| `vertical_slit` | 세로 틈 | Vertical slit | vertical slit | cat pupils, 고양이 눈 |
| `horizontal_slit` | 가로 틈 | Horizontal slit | horizontal slit |  |
| `star` | 별 모양 | Star-shaped | star-shaped |  |
| `heart` | 하트 모양 | Heart-shaped | heart-shaped |  |

### 속눈썹 길이 — `person.eyes.lash_length`

자연 속눈썹 길이입니다(메이크업 아님). 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 짧음 / Very short | very short | `Eyelash length: very short.` |
| 2 | 짧음 / Short | short | `Eyelash length: short.` |
| 3 | 보통 / Medium | medium length | `Eyelash length: medium length.` |
| 4 | 긺 / Long | long | `Eyelash length: long.` |
| 5 | 아주 긺 / Very long | very long | `Eyelash length: very long.` |

### 속눈썹 밀도 — `person.eyes.lash_density`

자연 속눈썹 숱입니다(메이크업 아님). 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 성김 / Very sparse | very sparse | `Eyelash density: very sparse.` |
| 2 | 성김 / Sparse | sparse | `Eyelash density: sparse.` |
| 3 | 보통 / Medium | medium density | `Eyelash density: medium density.` |
| 4 | 촘촘함 / Dense | dense | `Eyelash density: dense.` |
| 5 | 아주 촘촘함 / Very dense | very dense | `Eyelash density: very dense.` |

## 4. 의미 중복과 충돌

> Sprint 2-C.2(TD-10) 추가 — 의미 충돌(비차단 경고):
> - 둥근 눈 + 눈 높이 낮음(2 이하)
> - 가로로 긴 눈 + 눈 너비 좁음(2 이하)
>
> 눈 크기는 모양과 독립적이라 진단하지 않습니다.


| 규칙 ID | 심각도 | 내용 |
|---|---|---|
| `eyes-eyelids-monolid-vs-inner-crease` | warning | ‘외꺼풀’과(와) ‘속쌍꺼풀’은(는) 서로 반대되는 특징입니다. |
| `eyes-eyelids-monolid-vs-thin-double` | warning | ‘외꺼풀’과(와) ‘얇은 쌍꺼풀’은(는) 서로 반대되는 특징입니다. |
| `eyes-eyelids-monolid-vs-defined-double` | warning | ‘외꺼풀’과(와) ‘뚜렷한 쌍꺼풀’은(는) 서로 반대되는 특징입니다. |
| `eyes-eyelids-inner-crease-vs-thin-double` | warning | ‘속쌍꺼풀’과(와) ‘얇은 쌍꺼풀’은(는) 서로 반대되는 특징입니다. |
| `eyes-eyelids-inner-crease-vs-defined-double` | warning | ‘속쌍꺼풀’과(와) ‘뚜렷한 쌍꺼풀’은(는) 서로 반대되는 특징입니다. |
| `eyes-eyelids-thin-double-vs-defined-double` | warning | ‘얇은 쌍꺼풀’과(와) ‘뚜렷한 쌍꺼풀’은(는) 서로 반대되는 특징입니다. |

- 함께 존재할 수 있는 특징(예: 높고 돌출된 광대)은 다중 선택으로 표현하고, 실제로 반대되는 특징 쌍만 비차단 경고로 안내합니다. 원본 값은 바꾸지 않습니다.
- 눈 모양과 눈꺼풀(쌍꺼풀) 형태, 눈의 크기·너비·높이는 각각 독립입니다. 덮인 눈꺼풀은 어떤 쌍꺼풀 형태와도 함께 고를 수 있습니다.

## 5. 안전 정책

기존 정책(prompter.baseline 0.2.0)을 그대로 적용합니다. 이 영역의 표현은 그 자체로 안전 신호를 만들지 않으며(테스트), 연령·성적 표현 조합 규칙은 변하지 않습니다.

## 6. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았고, 검증되지 않은 예시를 실제 예시처럼 표시하지 않습니다(칩·팔레트만 사용).

## 7. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.2) | Sprint 2-B.2 Implementation Approval |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
