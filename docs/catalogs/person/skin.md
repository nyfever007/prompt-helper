# 피부 (Skin) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.3 개발 승인서의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/skin-hair.ts` (core 카탈로그 0.6.0), 카테고리 `person_skin`
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md) · 같은 Sprint 영역: [헤어](hair.md) · [수염](facial-hair.md)

## 1. 설계 목적과 원칙

피부색·언더톤·표면·특징입니다. 시각적 묘사일 뿐 의학적 진단이 아니며, 나이·성별·국적·민족에서 자동으로 정해지지 않습니다.

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 한 속성을 골라도 다른 속성이 자동으로 설정되지 않습니다.
- 나이·성별·국적·민족적 배경·매력도와 자동으로 연결하지 않습니다(예: 연령을 골라도 주름이 추가되지 않고, 헤어스타일·수염은 성별로 제한하지 않음).
- ‘없음’은 미설정과 다른 명시적 선택이며 프롬프트에 “none”으로 출력됩니다. 미설정은 출력하지 않습니다.
- 정도는 상대 슬라이더(1–5, 의미 구간 5개, 화면에는 구간 이름만)이며 표시 위치는 저장하지 않습니다. 팔레트 견본은 시각적 참고이며 결과 색을 보장하지 않습니다.
- 적용 조건이 맞지 않는 값은 **삭제하지 않고 보존**하며 프롬프트에만 쓰지 않습니다. 다시 적용 가능해지면 그대로 출력됩니다. 출력되지 않는 값도 안전 검사 대상입니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공하며, 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다. 좌우 개별 배치와 정밀 측정은 범위 밖입니다.

## 2. 속성 목록 (16)

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 추가 적용 조건 | 사용자 정의 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 264 | `person.skin.tone` | 피부색 / Skin tone | 단일 · 색상 팔레트 | `Skin tone: {value}.` | — | ✓ | skin color, skin tone, 피부 톤, 피부 색 |
| 265 | `person.skin.undertone` | 피부 언더톤 / Skin undertone | 단일 · 칩 | `Skin undertone: {value}.` | — | — | undertone, 언더톤, 웜톤, 쿨톤 |
| 266 | `person.skin.texture` | 피부결 / Skin texture | 단일 · 칩 | `Skin texture: {value}.` | — | — | skin texture, 피부결 |
| 267 | `person.skin.sheen` | 피부 광택 / Skin sheen | 단일 · 칩 | `Skin sheen: {value}.` | — | — | skin sheen, 광, 윤기, glow |
| 268 | `person.skin.hydration` | 피부 수분감 / Skin hydration | 단일 · 칩 | `Skin hydration: {value}.` | — | — | hydration, 수분, 건성, 촉촉함 |
| 269 | `person.skin.pores` | 모공 가시성 / Pore visibility | 상대 슬라이더 (1–5) | `Pores: {value}.` | — | — | pores, 모공 |
| 270 | `person.skin.translucency` | 피부 투명감 / Skin translucency | 상대 슬라이더 (1–5) | `Skin translucency: {value}.` | — | — | translucency, 투명감, 투명 피부 |
| 271 | `person.skin.evenness` | 피부 균일도 / Skin tone evenness | 상대 슬라이더 (1–5) | `Skin tone evenness: {value}.` | — | — | evenness, 피부톤 균일, 톤 균일 |
| 272 | `person.skin.freckle_density` | 주근깨 밀도 / Freckles | 단일 · 칩 | `Freckles: {value}.` | — | — | freckles, 주근깨 |
| 273 | `person.skin.freckle_placement` | 주근깨 위치 / Freckle placement | 다중 · 칩 | `Freckle placement: {value}.` | 주근깨 밀도 값이 ‘없음’에 해당하지 않을 때 | — | freckle placement, 주근깨 위치 |
| 274 | `person.skin.moles` | 점·미인점 / Moles and beauty marks | 단일 · 칩 | `Moles and beauty marks: {value}.` | — | — | moles, beauty mark, 점, 미인점 |
| 275 | `person.skin.mole_placement` | 점·미인점 위치 / Mole placement | 다중 · 칩 | `Mole placement: {value}.` | 점·미인점 값이 ‘없음’에 해당하지 않을 때 | — | mole placement, 점 위치 |
| 276 | `person.skin.wrinkles` | 주름 정도 / Wrinkles | 단일 · 칩 | `Wrinkles: {value}.` | — | — | wrinkles, 주름, lines |
| 277 | `person.skin.wrinkle_placement` | 주름 위치 / Wrinkle placement | 다중 · 칩 | `Wrinkle placement: {value}.` | 주름 정도 값이 ‘없음’에 해당하지 않을 때 | — | wrinkle placement, 주름 위치, 팔자주름, 눈가 주름 |
| 278 | `person.skin.scars` | 흉터 / Scars | 다중 · 칩 | `Scars: {value}.` | — | ✓ | scars, 흉터 |
| 279 | `person.skin.features` | 피부 특징 / Skin features | 다중 · 칩 | `Skin features: {value}.` | — | ✓ | skin features, 피부 특징, 홍조, 기미, 백반 |

## 3. 선택지와 영어 표현

### 피부색 — `person.skin.tone`

자연색과 판타지 색입니다. 견본은 시각적 참고이며 실제 결과 색을 보장하지 않습니다. 국적·민족과 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 표시 그룹 | 견본 | 별칭 |
|---|---|---|---|---|---|---|
| `very_fair` | 매우 밝은 | Very fair | very fair | 자연색 | `#f6e3d4` | 아주 흰 피부 |
| `fair` | 밝은 | Fair | fair | 자연색 | `#efd3bd` | 흰 피부 |
| `light` | 라이트 | Light | light | 자연색 | `#e6c3a6` |  |
| `light_beige` | 밝은 베이지 | Light beige | light beige | 자연색 | `#dcb38e` |  |
| `medium_beige` | 중간 베이지 | Medium beige | medium beige | 자연색 | `#cfa07a` |  |
| `golden` | 골든 | Golden | golden | 자연색 | `#c99a5b` |  |
| `tan` | 태닝된 | Tan | tan | 자연색 | `#b98257` | tanned, 구릿빛 |
| `olive_brown` | 올리브 브라운 | Olive brown | olive brown | 자연색 | `#9b7a52` | olive |
| `light_brown` | 밝은 갈색 | Light brown | light brown | 자연색 | `#a36f4a` |  |
| `medium_brown` | 중간 갈색 | Medium brown | medium brown | 자연색 | `#87573a` |  |
| `deep_brown` | 짙은 갈색 | Deep brown | deep brown | 자연색 | `#5f3b27` | dark brown |
| `very_deep_brown` | 매우 짙은 갈색 | Very deep brown | very deep brown | 자연색 | `#3e261a` |  |
| `green` | 초록 | Green | green | 판타지 | `#6f9f6a` |  |
| `blue` | 파랑 | Blue | blue | 판타지 | `#5b7fbf` |  |
| `violet` | 보라 | Violet | violet | 판타지 | `#8566b0` | purple |
| `gray` | 회색 | Gray | gray | 판타지 | `#8f9296` | grey |
| `red` | 빨강 | Red | red | 판타지 | `#b5524a` |  |
| `pure_white` | 순백색 | Pure white | pure white | 판타지 | `#f7f7f5` |  |
| `metallic_gold` | 메탈릭 골드 | Metallic gold | metallic gold | 판타지 | `#c8a24a` |  |
| `metallic_silver` | 메탈릭 실버 | Metallic silver | metallic silver | 판타지 | `#b9bdc3` |  |

### 피부 언더톤 — `person.skin.undertone`

피부색과 별개인 속성입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `warm` | 웜 | Warm | warm | 웜톤 |
| `cool` | 쿨 | Cool | cool | 쿨톤 |
| `neutral` | 뉴트럴 | Neutral | neutral | 뉴트럴톤 |
| `olive` | 올리브 | Olive | olive |  |

### 피부결 — `person.skin.texture`

피부 표면의 결이며 주근깨·모공·점과 함께 있을 수 있습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `silky_smooth` | 아주 매끄러운 | Silky smooth | silky smooth |  |
| `smooth` | 매끄러운 | Smooth | smooth |  |
| `natural` | 자연스러운 | Natural | natural | natural skin texture |
| `uneven` | 고르지 않은 | Uneven | uneven |  |
| `rough` | 거친 | Rough | rough |  |

### 피부 광택 — `person.skin.sheen`

피부가 빛을 반사하는 정도입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `matte` | 매트 | Matte | matte |  |
| `low` | 은은한 광 | Low sheen | low | subtle sheen |
| `natural` | 자연스러운 광 | Natural sheen | natural |  |
| `dewy` | 촉촉한 광 | Dewy | dewy | 물광 |
| `glossy` | 유광 | Glossy | glossy |  |

### 피부 수분감 — `person.skin.hydration`

보이는 건조함·촉촉함입니다(외형 묘사).

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `very_dry` | 매우 건조 | Very dry | very dry |  |
| `dry` | 건조 | Dry | dry |  |
| `natural` | 자연스러운 수분 | Naturally hydrated | naturally hydrated |  |
| `moisturized` | 촉촉한 | Moisturized | moisturized |  |
| `highly_hydrated` | 매우 촉촉한 | Highly hydrated | highly hydrated |  |

### 모공 가시성 — `person.skin.pores`

모공이 보이는 정도입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 거의 안 보임 / Barely visible | barely visible |
| 2 | 약간 보임 / Slightly visible | slightly visible |
| 3 | 보통 / Moderately visible | moderately visible |
| 4 | 잘 보임 / Clearly visible | clearly visible |
| 5 | 매우 잘 보임 / Highly visible | highly visible |

### 피부 투명감 — `person.skin.translucency`

피부가 맑고 투명해 보이는 정도입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 낮음 / Very low | very low |
| 2 | 낮음 / Low | low |
| 3 | 보통 / Medium | medium |
| 4 | 높음 / High | high |
| 5 | 아주 높음 / Very high | very high |

### 피부 균일도 — `person.skin.evenness`

피부 톤이 고른 정도입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 매우 고르지 않음 / Very uneven | very uneven |
| 2 | 약간 고르지 않음 / Slightly uneven | slightly uneven |
| 3 | 보통 / Moderately even | moderately even |
| 4 | 고름 / Even | even |
| 5 | 매우 고름 / Highly even | highly even |

### 주근깨 밀도 — `person.skin.freckle_density`

‘없음’은 미설정과 다른 명시적 선택입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `none` | 없음 | None | none | no freckles |
| `very_sparse` | 아주 적음 | Very sparse | very sparse |  |
| `sparse` | 적음 | Sparse | sparse |  |
| `moderate` | 보통 | Moderate | moderate |  |
| `dense` | 많음 | Dense | dense |  |
| `very_dense` | 아주 많음 | Very dense | very dense |  |

### 주근깨 위치 — `person.skin.freckle_placement`

주근깨 ‘없음’이면 출력하지 않습니다. 위치만 골라도 주근깨를 표현할 수 있습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `nose` | 코 | Nose | nose |  |
| `cheeks` | 볼 | Cheeks | cheeks |  |
| `forehead` | 이마 | Forehead | forehead |  |
| `chin` | 턱 | Chin | chin |  |
| `across_face` | 얼굴 전체 | Across the face | across the face |  |
| `neck` | 목 | Neck | neck |  |
| `shoulders` | 어깨 | Shoulders | shoulders |  |
| `arms` | 팔 | Arms | arms |  |
| `body` | 몸 전체 | Body | body |  |

### 점·미인점 — `person.skin.moles`

‘없음’은 미설정과 다른 명시적 선택입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `none` | 없음 | None | none | no moles |
| `single` | 하나 | Single | a single beauty mark |  |
| `a_few` | 몇 개 | A few | a few beauty marks |  |
| `multiple` | 여러 개 | Multiple | multiple beauty marks or visible moles |  |

### 점·미인점 위치 — `person.skin.mole_placement`

점 ‘없음’이면 출력하지 않습니다. 좌우 구분은 범위 밖입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `below_eye` | 눈 아래 | Below the eye | below the eye | 눈물점 |
| `beside_eye` | 눈 옆 | Beside the eye | beside the eye |  |
| `cheek` | 볼 | Cheek | on the cheek |  |
| `nose` | 코 | Nose | on the nose |  |
| `above_lip` | 입술 위 | Above the lip | above the lip |  |
| `below_lip` | 입술 아래 | Below the lip | below the lip |  |
| `chin` | 턱 | Chin | on the chin |  |
| `neck` | 목 | Neck | on the neck |  |

### 주름 정도 — `person.skin.wrinkles`

나이에서 자동으로 추가되지 않습니다. ‘없음’은 명시적 선택입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `none` | 없음 | None | none | no wrinkles |
| `fine_lines` | 잔주름 | Fine lines | fine lines |  |
| `subtle` | 옅은 주름 | Subtle | subtle wrinkles |  |
| `moderate` | 보통 주름 | Moderate | moderate wrinkles |  |
| `pronounced` | 뚜렷한 주름 | Pronounced | pronounced wrinkles |  |
| `deep` | 깊은 주름 | Deep | deep wrinkles |  |

### 주름 위치 — `person.skin.wrinkle_placement`

주름 ‘없음’이면 출력하지 않습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `forehead` | 이마 | Forehead | forehead |  |
| `around_eyes` | 눈가 | Around the eyes | around the eyes | crow's feet, 눈가 주름 |
| `between_brows` | 미간 | Between the eyebrows | between the eyebrows |  |
| `around_mouth` | 입가 | Around the mouth | around the mouth | laugh lines, 팔자주름 |
| `neck` | 목 | Neck | neck |  |

### 흉터 — `person.skin.scars`

자극적이지 않은 외형 묘사입니다. ‘없음’은 명시적 선택입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `none` | 없음 | None | none | no scars |
| `subtle` | 옅은 흉터 | Subtle | subtle |  |
| `linear` | 선형 흉터 | Linear | linear |  |
| `surgical` | 수술 흉터 | Surgical | surgical |  |
| `burn` | 화상 흉터 | Burn | burn |  |
| `acne` | 여드름 흉터 | Acne | acne |  |
| `healed` | 아문 흉터 | Healed | healed |  |

### 피부 특징 — `person.skin.features`

시각적 특징이며 의학적 진단이 아닙니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `natural_blush` | 자연스러운 홍조 | Natural blush | natural blush |  |
| `redness` | 붉은 기 | Redness | redness |  |
| `hyperpigmentation` | 색소 침착 | Hyperpigmentation | hyperpigmentation | 기미, 잡티 |
| `vitiligo` | 백반 반점 | Vitiligo patches | vitiligo patches | 백반증 |
| `acne` | 여드름 | Acne | acne |  |
| `blemishes` | 잡티 | Blemishes | blemishes |  |
| `stretch_marks` | 튼살 | Stretch marks | stretch marks |  |
| `birthmarks` | 모반 | Birthmarks | birthmarks | 반점 |
| `visible_veins` | 보이는 혈관 | Visible veins | visible veins |  |
| `dry_patches` | 건조한 부위 | Dry patches | dry patches |  |
| `calluses` | 굳은살 | Calluses | calluses |  |

## 4. 충돌 안내 (비차단, 값은 바꾸지 않음)

| 규칙 ID | 심각도 | 내용 |
|---|---|---|
| `skin-scars-none-with-others` | warning | ‘없음’(흉터)이 다른 항목과 함께 선택되었습니다. |

함께 존재할 수 있는 항목(예: 하이라이트 + 로우라이트, 콧수염 + 염소수염 + 구레나룻)은 다중 선택으로 표현하며 경고하지 않습니다. 선택지와 상대 슬라이더 사이의 불일치 진단은 TD-10으로 추적합니다.

## 5. 안전 정책

기존 정책(prompter.baseline 0.2.0)을 그대로 적용합니다. 이 영역의 표현은 그 자체로 안전 신호를 만들지 않으며(테스트), 흉터·피부 상태는 자극적이지 않은 외형 묘사이고 의학적 진단이 아닙니다.

## 6. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았고, 칩·팔레트만 사용합니다.

## 7. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.3) | Sprint 2-B.3 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
