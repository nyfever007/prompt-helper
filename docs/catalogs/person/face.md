# 얼굴 (Face) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.2 Implementation Approval의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/facial.ts` (core 카탈로그 0.5.0), 카테고리 `person_face`
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md) · 템플릿: [../ATTRIBUTE_TEMPLATE.md](../ATTRIBUTE_TEMPLATE.md) · 같은 Sprint 영역: [눈](eyes.md) · [눈썹](eyebrows.md) · [코](nose.md) · [입술](lips.md)

## 1. 설계 목적과 원칙

얼굴 윤곽과 구조입니다. 표정·인상·매력도를 바꾸지 않습니다.

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 한 속성을 골라도 다른 속성이 자동으로 설정되지 않습니다.
- 외형을 표정·성격·인상·매력도와 연결하지 않으며, 성별·국적·민족적 배경에 특정 얼굴 특징을 자동 설정하지 않습니다.
- 모양·형태는 칩(또는 색상 팔레트), 정도(크기·너비·각도·두께·밀도)는 **상대 슬라이더(1–5, 의미 구간 5개)** 입니다. 슬라이더 숫자는 측정값이 아니며 화면에는 구간 이름만 표시합니다. 표시 위치(가운데)는 저장하지 않습니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공합니다. 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다.
- 좌우 개별 설정과 해부학적 정밀 측정은 범위 밖입니다.

## 2. 속성 목록 (10)

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 사용자 정의 | 검색 별칭 |
|---|---|---|---|---|---|---|
| 217 | `person.face.shape` | 얼굴형 / Face shape | 단일 · 칩 | `Face shape: {value}.` | ✓ (이름만이면 안내) | face outline, 윤곽, 얼굴 모양 |
| 218 | `person.face.length` | 얼굴 길이 / Face length | 상대 슬라이더 (1–5) | `Face length: {value}.` | — | face length, 얼굴 길이 |
| 219 | `person.face.width` | 얼굴 너비 / Face width | 상대 슬라이더 (1–5) | `Face width: {value}.` | — | face width, 얼굴 폭 |
| 220 | `person.face.forehead_height` | 이마 높이 / Forehead height | 상대 슬라이더 (1–5) | `Forehead height: {value}.` | — | forehead height, 이마 |
| 221 | `person.face.forehead_width` | 이마 너비 / Forehead width | 상대 슬라이더 (1–5) | `Forehead width: {value}.` | — | forehead width, 이마 폭 |
| 222 | `person.face.cheekbones` | 광대 / Cheekbones | 다중 · 칩 | `Cheekbones: {value}.` | ✓ (이름만이면 안내) | cheekbones, 광대뼈, 광대 |
| 223 | `person.face.jawline` | 턱선 / Jawline | 다중 · 칩 | `Jawline: {value}.` | ✓ (이름만이면 안내) | jawline, jaw, 턱, 턱라인 |
| 224 | `person.face.chin` | 턱끝 / Chin | 다중 · 칩 | `Chin: {value}.` | ✓ (이름만이면 안내) | chin, 턱끝, 턱 |
| 225 | `person.face.cheeks` | 볼 / Cheeks | 다중 · 칩 | `Cheeks: {value}.` | ✓ (이름만이면 안내) | cheeks, 볼살, 뺨 |
| 226 | `person.face.symmetry` | 얼굴 대칭성 / Facial symmetry | 상대 슬라이더 (1–5) | `Facial symmetry: {value}.` | — | symmetry, 대칭, 비대칭 |

## 3. 선택지와 영어 표현

### 얼굴형 — `person.face.shape`

전체 윤곽입니다. 턱선·광대·볼을 자동으로 정하지 않습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `oval` | 계란형 | Oval | oval | 달걀형 |
| `round` | 둥근형 | Round | round |  |
| `square` | 각진형 | Square | square | 사각형 |
| `rectangular` | 직사각형 | Rectangular | rectangular | oblong, 긴 얼굴형 |
| `heart` | 하트형 | Heart-shaped | heart-shaped |  |
| `diamond` | 다이아몬드형 | Diamond-shaped | diamond-shaped | 마름모형 |
| `triangular` | 삼각형 | Triangular | triangular |  |
| `inverted_triangular` | 역삼각형 | Inverted triangular | inverted triangular |  |

### 얼굴 길이 — `person.face.length`

얼굴의 세로 길이입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 짧음 / Very short | very short | `Face length: very short.` |
| 2 | 짧음 / Short | short | `Face length: short.` |
| 3 | 보통 / Medium | medium length | `Face length: medium length.` |
| 4 | 긺 / Long | long | `Face length: long.` |
| 5 | 아주 긺 / Very long | very long | `Face length: very long.` |

### 얼굴 너비 — `person.face.width`

얼굴의 가로 너비입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 좁음 / Very narrow | very narrow | `Face width: very narrow.` |
| 2 | 좁음 / Narrow | narrow | `Face width: narrow.` |
| 3 | 보통 / Medium | medium width | `Face width: medium width.` |
| 4 | 넓음 / Broad | broad | `Face width: broad.` |
| 5 | 아주 넓음 / Very broad | very broad | `Face width: very broad.` |

### 이마 높이 — `person.face.forehead_height`

이마의 세로 높이입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 낮음 / Very low | very low | `Forehead height: very low.` |
| 2 | 낮음 / Low | low | `Forehead height: low.` |
| 3 | 보통 / Medium | medium height | `Forehead height: medium height.` |
| 4 | 높음 / High | high | `Forehead height: high.` |
| 5 | 아주 높음 / Very high | very high | `Forehead height: very high.` |

### 이마 너비 — `person.face.forehead_width`

이마의 가로 너비입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 아주 좁음 / Very narrow | very narrow | `Forehead width: very narrow.` |
| 2 | 좁음 / Narrow | narrow | `Forehead width: narrow.` |
| 3 | 보통 / Medium | medium width | `Forehead width: medium width.` |
| 4 | 넓음 / Broad | broad | `Forehead width: broad.` |
| 5 | 아주 넓음 / Very broad | very broad | `Forehead width: very broad.` |

### 광대 — `person.face.cheekbones`

돌출 정도(평평·부드러운 윤곽·돌출)와 위치(높음·낮음)를 함께 고를 수 있습니다. 예: 높고 돌출된 광대.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `flat` | 평평한 | Flat | flat |  |
| `softly_contoured` | 부드러운 윤곽 | Softly contoured | softly contoured |  |
| `prominent` | 돌출된 | Prominent | prominent | 도드라진 |
| `high` | 높은 | High | high |  |
| `low` | 낮은 | Low | low |  |

### 턱선 — `person.face.jawline`

함께 쓸 수 있는 특징입니다(예: 부드럽고 둥근). 얼굴형과 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `rounded` | 둥근 | Rounded | rounded |  |
| `soft` | 부드러운 | Soft | soft |  |
| `angular` | 각진 | Angular | angular | 사각턱 |
| `defined` | 선명한 | Defined | defined | sharp jawline |
| `v_shaped` | V자형 | V-shaped | V-shaped | 브이라인, V라인 |
| `u_shaped` | U자형 | U-shaped | U-shaped | 유라인, U라인 |

### 턱끝 — `person.face.chin`

모양(둥근·뾰족한·각진), 갈라진 턱, 돌출 정도(나온·들어간)를 함께 고를 수 있습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `rounded` | 둥근 | Rounded | rounded |  |
| `pointed` | 뾰족한 | Pointed | pointed |  |
| `square` | 각진 | Square | square |  |
| `cleft` | 갈라진 | Cleft | cleft | dimpled chin, 보조개 턱 |
| `protruding` | 앞으로 나온 | Protruding | protruding | 돌출된 턱 |
| `recessed` | 들어간 | Recessed | recessed | 무턱 |

### 볼 — `person.face.cheeks`

볼의 양감(홀쭉·평평·통통)과 둥근 정도입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `hollow` | 홀쭉한 | Hollow | hollow |  |
| `flat` | 평평한 | Flat | flat |  |
| `full` | 통통한 | Full | full | plump cheeks |
| `rounded` | 둥근 | Rounded | rounded |  |

### 얼굴 대칭성 — `person.face.symmetry`

자연스러운 비대칭은 정상이며 결점이 아닙니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 | 출력 예 |
|---|---|---|---|
| 1 | 자연스러운 비대칭 / Naturally asymmetrical | naturally asymmetrical features | `Facial symmetry: naturally asymmetrical features.` |
| 2 | 약간 비대칭 / Slightly asymmetrical | slightly asymmetrical features | `Facial symmetry: slightly asymmetrical features.` |
| 3 | 균형 잡힘 / Balanced | balanced features | `Facial symmetry: balanced features.` |
| 4 | 매우 대칭 / Very symmetrical | very symmetrical features | `Facial symmetry: very symmetrical features.` |
| 5 | 아주 대칭 / Highly symmetrical | highly symmetrical features | `Facial symmetry: highly symmetrical features.` |

## 4. 의미 중복과 충돌

| 규칙 ID | 심각도 | 내용 |
|---|---|---|
| `face-cheekbones-flat-vs-softly-contoured` | warning | ‘평평한’과(와) ‘부드러운 윤곽’은(는) 서로 반대되는 특징입니다. |
| `face-cheekbones-flat-vs-prominent` | warning | ‘평평한’과(와) ‘돌출된’은(는) 서로 반대되는 특징입니다. |
| `face-cheekbones-softly-contoured-vs-prominent` | warning | ‘부드러운 윤곽’과(와) ‘돌출된’은(는) 서로 반대되는 특징입니다. |
| `face-cheekbones-high-vs-low` | warning | ‘높은’과(와) ‘낮은’은(는) 서로 반대되는 특징입니다. |
| `face-jawline-rounded-vs-angular` | warning | ‘둥근’과(와) ‘각진’은(는) 서로 반대되는 특징입니다. |
| `face-jawline-soft-vs-angular` | warning | ‘부드러운’과(와) ‘각진’은(는) 서로 반대되는 특징입니다. |
| `face-jawline-v-shaped-vs-u-shaped` | warning | ‘V자형’과(와) ‘U자형’은(는) 서로 반대되는 특징입니다. |
| `face-chin-rounded-vs-pointed` | warning | ‘둥근’과(와) ‘뾰족한’은(는) 서로 반대되는 특징입니다. |
| `face-chin-rounded-vs-square` | warning | ‘둥근’과(와) ‘각진’은(는) 서로 반대되는 특징입니다. |
| `face-chin-pointed-vs-square` | warning | ‘뾰족한’과(와) ‘각진’은(는) 서로 반대되는 특징입니다. |
| `face-chin-protruding-vs-recessed` | warning | ‘앞으로 나온’과(와) ‘들어간’은(는) 서로 반대되는 특징입니다. |
| `face-cheeks-hollow-vs-flat` | warning | ‘홀쭉한’과(와) ‘평평한’은(는) 서로 반대되는 특징입니다. |
| `face-cheeks-hollow-vs-full` | warning | ‘홀쭉한’과(와) ‘통통한’은(는) 서로 반대되는 특징입니다. |
| `face-cheeks-flat-vs-full` | warning | ‘평평한’과(와) ‘통통한’은(는) 서로 반대되는 특징입니다. |
| `face-cheeks-hollow-vs-rounded` | warning | ‘홀쭉한’과(와) ‘둥근’은(는) 서로 반대되는 특징입니다. |
| `face-cheeks-flat-vs-rounded` | warning | ‘평평한’과(와) ‘둥근’은(는) 서로 반대되는 특징입니다. |

- 함께 존재할 수 있는 특징(예: 높고 돌출된 광대)은 다중 선택으로 표현하고, 실제로 반대되는 특징 쌍만 비차단 경고로 안내합니다. 원본 값은 바꾸지 않습니다.
- 얼굴형은 턱선·광대·볼을 자동으로 정하지 않습니다(예: 둥근형 + 각진 턱선도 그대로 출력).

## 5. 안전 정책

기존 정책(prompter.baseline 0.2.0)을 그대로 적용합니다. 이 영역의 표현은 그 자체로 안전 신호를 만들지 않으며(테스트), 연령·성적 표현 조합 규칙은 변하지 않습니다.

## 6. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았고, 검증되지 않은 예시를 실제 예시처럼 표시하지 않습니다(칩·팔레트만 사용).

## 7. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.2) | Sprint 2-B.2 Implementation Approval |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
