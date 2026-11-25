# 수염 (Facial hair) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.3 개발 승인서의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/skin-hair.ts` (core 카탈로그 0.6.0), 카테고리 `person_facial_hair`
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md) · 같은 Sprint 영역: [피부](skin.md) · [헤어](hair.md)

## 1. 설계 목적과 원칙

수염 형태와 길이·밀도·색상·정돈 상태·질감입니다. 성별로 제한하지 않고 나이·성격과 연결하지 않습니다.

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 한 속성을 골라도 다른 속성이 자동으로 설정되지 않습니다.
- 나이·성별·국적·민족적 배경·매력도와 자동으로 연결하지 않습니다(예: 연령을 골라도 주름이 추가되지 않고, 헤어스타일·수염은 성별로 제한하지 않음).
- ‘없음’은 미설정과 다른 명시적 선택이며 프롬프트에 “none”으로 출력됩니다. 미설정은 출력하지 않습니다.
- 정도는 상대 슬라이더(1–5, 의미 구간 5개, 화면에는 구간 이름만)이며 표시 위치는 저장하지 않습니다. 팔레트 견본은 시각적 참고이며 결과 색을 보장하지 않습니다.
- 적용 조건이 맞지 않는 값은 **삭제하지 않고 보존**하며 프롬프트에만 쓰지 않습니다. 다시 적용 가능해지면 그대로 출력됩니다. 출력되지 않는 값도 안전 검사 대상입니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공하며, 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다. 좌우 개별 배치와 정밀 측정은 범위 밖입니다.

## 2. 속성 목록 (6)

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 추가 적용 조건 | 사용자 정의 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 303 | `person.facial_hair.style` | 수염 형태 / Facial hair style | 다중 · 검색 목록 | `Facial hair: {value}.` | — | ✓ | beard, mustache, 수염, 콧수염, 턱수염 |
| 304 | `person.facial_hair.length` | 수염 길이 / Facial hair length | 상대 슬라이더 (1–5) | `Facial hair length: {value}.` | 수염 형태 값이 ‘수염 없음’에 해당하지 않을 때 | — | beard length, 수염 길이 |
| 305 | `person.facial_hair.density` | 수염 밀도 / Facial hair density | 상대 슬라이더 (1–5) | `Facial hair density: {value}.` | 수염 형태 값이 ‘수염 없음’에 해당하지 않을 때 | — | beard density, 수염 숱 |
| 306 | `person.facial_hair.color` | 수염 색상 / Facial hair color | 단일 · 색상 팔레트 | `Facial hair color: {value}.` | 수염 형태 값이 ‘수염 없음’에 해당하지 않을 때 | ✓ | beard color, 수염 색 |
| 307 | `person.facial_hair.grooming` | 수염 정돈 상태 / Facial hair grooming | 단일 · 칩 | `Facial hair grooming: {value}.` | 수염 형태 값이 ‘수염 없음’에 해당하지 않을 때 | — | beard grooming, 수염 정돈 |
| 308 | `person.facial_hair.texture` | 수염 질감 / Facial hair texture | 단일 · 칩 | `Facial hair texture: {value}.` | 수염 형태 값이 ‘수염 없음’에 해당하지 않을 때 | — | beard texture, 수염 질감 |

## 3. 선택지와 영어 표현

### 수염 형태 — `person.facial_hair.style`

함께 있는 특징(콧수염+염소수염+구레나룻 등)을 함께 고를 수 있습니다. 성별로 제한하지 않습니다. ‘수염 없음’이면 다른 수염 속성을 출력하지 않습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `clean_shaven` | 수염 없음 | Clean-shaven | clean-shaven | no beard, 면도한 |
| `light_stubble` | 옅은 수염 자국 | Light stubble | light stubble | 까칠한 수염 |
| `heavy_stubble` | 짙은 수염 자국 | Heavy stubble | heavy stubble |  |
| `mustache` | 콧수염 | Mustache | mustache | moustache |
| `pencil_mustache` | 펜슬 콧수염 | Pencil mustache | pencil mustache |  |
| `handlebar_mustache` | 핸들바 콧수염 | Handlebar mustache | handlebar mustache |  |
| `chevron_mustache` | 셰브론 콧수염 | Chevron mustache | chevron mustache |  |
| `goatee` | 염소수염 | Goatee | goatee |  |
| `van_dyke` | 반다이크 수염 | Van Dyke beard | Van Dyke beard |  |
| `soul_patch` | 소울 패치 | Soul patch | soul patch |  |
| `chin_beard` | 턱수염 | Chin beard | chin beard |  |
| `chinstrap` | 턱끈 수염 | Chinstrap beard | chinstrap beard |  |
| `sideburns` | 구레나룻 | Sideburns | sideburns |  |
| `mutton_chops` | 머튼 찹스 | Mutton chops | mutton chops |  |
| `short_boxed` | 짧게 다듬은 박스 수염 | Short boxed beard | short boxed beard |  |
| `full_beard` | 풍성한 수염 | Full beard | full beard |  |
| `long_beard` | 긴 수염 | Long beard | long beard |  |
| `braided_beard` | 땋은 수염 | Braided beard | braided beard |  |

### 수염 길이 — `person.facial_hair.length`

‘수염 없음’이면 출력하지 않습니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 짧음 / Very short | very short |
| 2 | 짧음 / Short | short |
| 3 | 보통 / Medium | medium length |
| 4 | 긺 / Long | long |
| 5 | 아주 긺 / Very long | very long |

### 수염 밀도 — `person.facial_hair.density`

‘수염 없음’이면 출력하지 않습니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 성김 / Very sparse | very sparse |
| 2 | 성김 / Sparse | sparse |
| 3 | 보통 / Medium | medium density |
| 4 | 촘촘함 / Dense | dense |
| 5 | 아주 촘촘함 / Very dense | very dense |

### 수염 색상 — `person.facial_hair.color`

헤어 색상과 같은 팔레트에서 독립적으로 고릅니다. ‘수염 없음’이면 출력하지 않습니다.

| ID | 한국어 | English | 프롬프트 표현 | 표시 그룹 | 견본 | 별칭 |
|---|---|---|---|---|---|---|
| `jet_black` | 칠흑색 | Jet black | jet black | 검정 계열 | `#0b0b0c` | 흑발 |
| `soft_black` | 부드러운 검정 | Soft black | soft black | 검정 계열 | `#1f1c1b` |  |
| `blue_black` | 푸른 검정 | Blue-black | blue-black | 검정 계열 | `#141a2b` |  |
| `dark_brown` | 짙은 갈색 | Dark brown | dark brown | 갈색 계열 | `#3a2417` |  |
| `chocolate_brown` | 초콜릿 브라운 | Chocolate brown | chocolate brown | 갈색 계열 | `#4a2c1d` |  |
| `chestnut_brown` | 밤색 | Chestnut brown | chestnut brown | 갈색 계열 | `#6e3b22` | chestnut |
| `medium_brown` | 중간 갈색 | Medium brown | medium brown | 갈색 계열 | `#6b4a32` |  |
| `light_brown` | 밝은 갈색 | Light brown | light brown | 갈색 계열 | `#8f6a4a` |  |
| `ash_brown` | 애쉬 브라운 | Ash brown | ash brown | 갈색 계열 | `#6f6255` |  |
| `dark_blonde` | 다크 블론드 | Dark blonde | dark blonde | 금발 계열 | `#9c7c52` |  |
| `golden_blonde` | 골든 블론드 | Golden blonde | golden blonde | 금발 계열 | `#d1a656` | 금발 |
| `honey_blonde` | 허니 블론드 | Honey blonde | honey blonde | 금발 계열 | `#c9974f` |  |
| `ash_blonde` | 애쉬 블론드 | Ash blonde | ash blonde | 금발 계열 | `#b8ab8a` |  |
| `platinum_blonde` | 플래티넘 블론드 | Platinum blonde | platinum blonde | 금발 계열 | `#e6dfc8` |  |
| `strawberry_blonde` | 스트로베리 블론드 | Strawberry blonde | strawberry blonde | 금발 계열 | `#d39a6f` |  |
| `auburn` | 적갈색 | Auburn | auburn | 적색 계열 | `#7f3a22` |  |
| `copper` | 구리색 | Copper | copper | 적색 계열 | `#b35f2c` |  |
| `ginger` | 진저 | Ginger | ginger | 적색 계열 | `#c46a2e` | 빨간 머리 |
| `deep_red` | 짙은 빨강 | Deep red | deep red | 적색 계열 | `#7d1c1c` |  |
| `burgundy` | 버건디 | Burgundy | burgundy | 적색 계열 | `#5e1a2b` | 와인색 |
| `dark_gray` | 짙은 회색 | Dark gray | dark gray | 회색 계열 | `#4a4a4c` | dark grey |
| `gray` | 회색 | Gray | gray | 회색 계열 | `#8a8a8a` | grey, 흰머리 |
| `silver_gray` | 은회색 | Silver gray | silver gray | 회색 계열 | `#a9adb2` |  |
| `silver` | 은색 | Silver | silver | 회색 계열 | `#c8ccd1` |  |
| `white` | 흰색 | White | white | 회색 계열 | `#eeeeec` |  |
| `salt_and_pepper` | 희끗희끗한 | Salt-and-pepper | salt-and-pepper | 회색 계열 | `#7d7d7a` |  |
| `pink` | 핑크 | Pink | pink | 판타지 계열 | `#e889b0` |  |
| `pastel_pink` | 파스텔 핑크 | Pastel pink | pastel pink | 판타지 계열 | `#f4c2d3` |  |
| `rose_gold` | 로즈 골드 | Rose gold | rose gold | 판타지 계열 | `#d8a49a` |  |
| `purple` | 보라 | Purple | purple | 판타지 계열 | `#7d3fa0` |  |
| `lavender` | 라벤더 | Lavender | lavender | 판타지 계열 | `#b9a3dc` |  |
| `blue` | 파랑 | Blue | blue | 판타지 계열 | `#3c63c4` |  |
| `pastel_blue` | 파스텔 블루 | Pastel blue | pastel blue | 판타지 계열 | `#a9c8ee` |  |
| `turquoise` | 청록 | Turquoise | turquoise | 판타지 계열 | `#2fb3b0` |  |
| `green` | 초록 | Green | green | 판타지 계열 | `#3e9a4f` |  |
| `mint_green` | 민트 | Mint green | mint green | 판타지 계열 | `#a7dcc3` |  |
| `orange` | 주황 | Orange | orange | 판타지 계열 | `#e07a2c` |  |
| `yellow` | 노랑 | Yellow | yellow | 판타지 계열 | `#e8cf3a` |  |

### 수염 정돈 상태 — `person.facial_hair.grooming`

‘수염 없음’이면 출력하지 않습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `neatly_trimmed` | 깔끔하게 다듬은 | Neatly trimmed | neatly trimmed |  |
| `sculpted` | 모양을 낸 | Sculpted | sculpted |  |
| `natural` | 자연스럽게 정돈된 | Naturally groomed | naturally groomed |  |
| `untamed` | 자유롭게 자란 | Untamed | untamed |  |
| `unkempt` | 손질 안 된 | Unkempt | unkempt |  |

### 수염 질감 — `person.facial_hair.texture`

‘수염 없음’이면 출력하지 않습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `straight` | 직모 | Straight | straight |  |
| `wavy` | 웨이브 | Wavy | wavy |  |
| `curly` | 곱슬 | Curly | curly |  |
| `tightly_curly` | 강한 곱슬 | Tightly curly | tightly curly |  |
| `coily` | 코일리 | Coily | coily |  |

## 4. 충돌 안내 (비차단, 값은 바꾸지 않음)

| 규칙 ID | 심각도 | 내용 |
|---|---|---|
| `facial-hair-clean-shaven-with-others` | warning | ‘없음’(수염 없음)이 다른 항목과 함께 선택되었습니다. |
| `facial-hair-style-light-stubble-vs-heavy-stubble` | warning | ‘옅은 수염 자국’과(와) ‘짙은 수염 자국’은(는) 서로 반대되는 특징입니다. |
| `facial-hair-style-pencil-mustache-vs-handlebar-mustache` | warning | ‘펜슬 콧수염’과(와) ‘핸들바 콧수염’은(는) 서로 반대되는 특징입니다. |
| `facial-hair-style-pencil-mustache-vs-chevron-mustache` | warning | ‘펜슬 콧수염’과(와) ‘셰브론 콧수염’은(는) 서로 반대되는 특징입니다. |
| `facial-hair-style-handlebar-mustache-vs-chevron-mustache` | warning | ‘핸들바 콧수염’과(와) ‘셰브론 콧수염’은(는) 서로 반대되는 특징입니다. |
| `facial-hair-style-short-boxed-vs-long-beard` | warning | ‘짧게 다듬은 박스 수염’과(와) ‘긴 수염’은(는) 서로 반대되는 특징입니다. |

함께 존재할 수 있는 항목(예: 하이라이트 + 로우라이트, 콧수염 + 염소수염 + 구레나룻)은 다중 선택으로 표현하며 경고하지 않습니다. 선택지와 상대 슬라이더 사이의 불일치 진단은 Sprint 2-C.2(TD-10)에서 검토했으며, 이 영역에는 명확한 의미 근거가 있는 조합이 없어 규칙을 추가하지 않았습니다.

## 5. 안전 정책

기존 정책(prompter.baseline 0.2.0)을 그대로 적용합니다. 이 영역의 표현은 그 자체로 안전 신호를 만들지 않으며(테스트), 흉터·피부 상태는 자극적이지 않은 외형 묘사이고 의학적 진단이 아닙니다.

## 6. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았고, 칩·팔레트만 사용합니다.

## 7. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.3) | Sprint 2-B.3 개발 승인서 |
