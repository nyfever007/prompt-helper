# 헤어 (Hair) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.3 개발 승인서의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/skin-hair.ts` (core 카탈로그 0.6.0), 카테고리 `person_hair`
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md) · 같은 Sprint 영역: [피부](skin.md) · [수염](facial-hair.md)

## 1. 설계 목적과 원칙

모발 유무·길이·색상·형태·스타일·움직임이며 서로 독립적입니다. 헤어스타일은 성별과 무관하게 고를 수 있습니다.

- 모든 속성은 **Direct** 표현 역할이며 서로 독립된 시각 축입니다. 한 속성을 골라도 다른 속성이 자동으로 설정되지 않습니다.
- 나이·성별·국적·민족적 배경·매력도와 자동으로 연결하지 않습니다(예: 연령을 골라도 주름이 추가되지 않고, 헤어스타일·수염은 성별로 제한하지 않음).
- ‘없음’은 미설정과 다른 명시적 선택이며 프롬프트에 “none”으로 출력됩니다. 미설정은 출력하지 않습니다.
- 정도는 상대 슬라이더(1–5, 의미 구간 5개, 화면에는 구간 이름만)이며 표시 위치는 저장하지 않습니다. 팔레트 견본은 시각적 참고이며 결과 색을 보장하지 않습니다.
- 적용 조건이 맞지 않는 값은 **삭제하지 않고 보존**하며 프롬프트에만 쓰지 않습니다. 다시 적용 가능해지면 그대로 출력됩니다. 출력되지 않는 값도 안전 검사 대상입니다.
- 모든 속성은 프롬프트 포함·제외 토글을 제공하며, 피사체가 “인물(1인)”이거나 미선택일 때 적용됩니다. 좌우 개별 배치와 정밀 측정은 범위 밖입니다.

## 2. 속성 목록 (23)

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 추가 적용 조건 | 사용자 정의 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 280 | `person.hair.presence` | 모발 유무 / Hair presence | 단일 · 칩 | `Hair presence: {value}.` | — | — | bald, shaved, 대머리, 삭발, 탈모 |
| 281 | `person.hair.length` | 헤어 길이 / Hair length | 단일 · 칩 | `Hair length: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | hair length, 머리 길이, 기장 |
| 282 | `person.hair.primary_color` | 기본 헤어 색상 / Primary hair color | 단일 · 색상 팔레트 | `Primary hair color: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | ✓ | hair color, 머리색, 염색 |
| 283 | `person.hair.secondary_color` | 보조 헤어 색상 / Secondary hair color | 단일 · 색상 팔레트 | `Secondary hair color: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | ✓ | secondary hair color, 투톤 색, 포인트 컬러 |
| 284 | `person.hair.color_pattern` | 컬러 패턴 / Hair color pattern | 다중 · 칩 | `Hair color pattern: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | ✓ | color pattern, 염색 패턴, 하이라이트, 옴브레 |
| 285 | `person.hair.texture` | 모발 형태 / Hair texture | 단일 · 칩 | `Hair texture: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | ✓ | hair texture, 곱슬, 생머리, 웨이브 |
| 286 | `person.hair.thickness` | 모발 굵기 / Strand thickness | 상대 슬라이더 (1–5) | `Hair strand thickness: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | — | strand thickness, 모발 굵기, 가는 머리, 굵은 머리 |
| 287 | `person.hair.density` | 모발 밀도 / Hair density | 상대 슬라이더 (1–5) | `Hair density: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | — | hair density, 숱, 머리숱 |
| 288 | `person.hair.volume` | 헤어 볼륨 / Hair volume | 상대 슬라이더 (1–5) | `Hair volume: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | hair volume, 볼륨, 뿌리 볼륨 |
| 289 | `person.hair.shine` | 모발 광택 / Hair shine | 상대 슬라이더 (1–5) | `Hair shine: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | — | hair shine, 윤기, 머릿결 광 |
| 290 | `person.hair.condition` | 모발 상태 / Hair condition | 다중 · 칩 | `Hair condition: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | ✓ | hair condition, 부스스, 젖은 머리, 정돈 |
| 291 | `person.hair.curl_size` | 컬 크기 / Curl size | 상대 슬라이더 (1–5) | `Curl size: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | curl size, 컬 크기, 펌 |
| 292 | `person.hair.curl_tightness` | 컬 강도 / Curl tightness | 상대 슬라이더 (1–5) | `Curl tightness: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | curl tightness, 컬 강도 |
| 293 | `person.hair.part` | 가르마 / Hair part | 단일 · 칩 | `Hair part: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | hair part, 가르마, parting |
| 294 | `person.hair.hairline` | 헤어라인 / Hairline | 단일 · 칩 | `Hairline: {value}.` | 모발 유무 값이 ‘대머리’에 해당하지 않을 때 | ✓ | hairline, 헤어라인, 이마 라인 |
| 295 | `person.hair.bangs_style` | 앞머리 형태 / Bangs | 단일 · 칩 | `Bangs: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | ✓ | bangs, fringe, 앞머리 |
| 296 | `person.hair.bangs_length` | 앞머리 길이 / Bangs length | 단일 · 칩 | `Bangs length: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때; 앞머리 형태 값이 ‘앞머리 없음’에 해당하지 않을 때 | — | bangs length, 앞머리 길이 |
| 297 | `person.hair.bangs_density` | 앞머리 밀도 / Bangs density | 상대 슬라이더 (1–5) | `Bangs density: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때; 앞머리 형태 값이 ‘앞머리 없음’에 해당하지 않을 때 | — | bangs density, 앞머리 숱 |
| 298 | `person.hair.style` | 헤어스타일 / Hairstyle | 단일 · 검색 목록 | `Hairstyle: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | ✓ | hairstyle, 헤어스타일, 머리 모양 |
| 299 | `person.hair.tie_position` | 묶는 위치 / Tie position | 다중 · 칩 | `Hair tie position: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | tie position, 묶는 위치, 번 위치 |
| 300 | `person.hair.layering` | 레이어 정도 / Hair layering | 단일 · 칩 | `Hair layering: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | layering, 레이어, 층 |
| 301 | `person.hair.flyaways` | 잔머리 정도 / Flyaway hairs | 단일 · 칩 | `Flyaway hairs: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | flyaways, 잔머리, baby hairs |
| 302 | `person.hair.movement` | 헤어 움직임 / Hair movement | 단일 · 칩 | `Hair movement: {value}.` | 모발 유무 값이 ‘대머리’·‘삭발’에 해당하지 않을 때 | — | hair movement, 바람에 날리는, 흩날리는 |

## 3. 선택지와 영어 표현

### 모발 유무 — `person.hair.presence`

대머리는 다른 헤어 속성을 모두, 삭발은 스타일 관련 속성을 숨깁니다(색상·형태·굵기·밀도·광택·헤어라인·상태는 유지). 부분 탈모는 숨기지 않습니다. 숨겨진 값은 보존됩니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `present` | 모발 있음 | Hair present | hair present |  |
| `shaved` | 삭발 | Shaved head | shaved head | buzzed head, 까까머리 |
| `bald` | 대머리 | Bald head | bald head | 민머리 |
| `partial_loss` | 부분 탈모 | Partial hair loss | partial hair loss | thinning hair, 탈모 |

### 헤어 길이 — `person.hair.length`

헤어스타일과 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `extremely_short` | 아주 짧은 | Extremely short | extremely short |  |
| `ear` | 귀 길이 | Ear-length | ear-length |  |
| `chin` | 턱 길이 | Chin-length | chin-length | 단발 |
| `neck` | 목 길이 | Neck-length | neck-length |  |
| `shoulder` | 어깨 길이 | Shoulder-length | shoulder-length | 중단발 |
| `chest` | 가슴 길이 | Chest-length | chest-length | 장발 |
| `mid_back` | 등 중간 길이 | Mid-back-length | mid-back-length |  |
| `waist` | 허리 길이 | Waist-length | waist-length |  |
| `hip` | 엉덩이 길이 | Hip-length | hip-length |  |
| `knee` | 무릎 길이 | Knee-length | knee-length |  |
| `floor` | 바닥 길이 | Floor-length | floor-length |  |

### 기본 헤어 색상 — `person.hair.primary_color`

견본은 시각적 참고입니다. 보조 색상·컬러 패턴과 독립적으로 관리합니다.

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

### 보조 헤어 색상 — `person.hair.secondary_color`

기본 색상과 같은 팔레트에서 독립적으로 고릅니다.

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

### 컬러 패턴 — `person.hair.color_pattern`

색이 배치되는 방식이며 색상 자체와 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `solid` | 단색 | Solid color | solid color |  |
| `two_tone` | 투톤 | Two-tone | two-tone |  |
| `ombre` | 옴브레 | Ombré | ombré | ombre, 그라데이션 |
| `balayage` | 발레아쥬 | Balayage | balayage |  |
| `highlights` | 하이라이트 | Highlights | highlights |  |
| `lowlights` | 로우라이트 | Lowlights | lowlights |  |
| `contrasting_roots` | 대비되는 뿌리 | Contrasting roots | contrasting roots | 뿌리 염색 |
| `dip_dyed` | 끝부분 염색 | Dip-dyed ends | dip-dyed ends |  |
| `split_dyed` | 좌우 반반 염색 | Split-dyed | split-dyed hair |  |

### 모발 형태 — `person.hair.texture`

모발 본래의 형태이며 헤어스타일과 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `straight` | 직모 | Straight | straight | 생머리 |
| `wavy` | 웨이브 | Wavy | wavy |  |
| `curly` | 곱슬 | Curly | curly |  |
| `tightly_curly` | 강한 곱슬 | Tightly curly | tightly curly |  |
| `coily` | 코일리 | Coily | coily | 4c |

### 모발 굵기 — `person.hair.thickness`

한 가닥의 굵기입니다(밀도와 다름). 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 가늚 / Very fine | very fine |
| 2 | 가늚 / Fine | fine |
| 3 | 보통 / Medium | medium |
| 4 | 굵음 / Coarse | coarse |
| 5 | 아주 굵음 / Very coarse | very coarse |

### 모발 밀도 — `person.hair.density`

모발의 숱입니다(볼륨과 다름). 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 성김 / Very sparse | very sparse |
| 2 | 성김 / Sparse | sparse |
| 3 | 보통 / Medium | medium density |
| 4 | 촘촘함 / Dense | dense |
| 5 | 아주 촘촘함 / Very dense | very dense |

### 헤어 볼륨 — `person.hair.volume`

스타일의 전체 부피감입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 낮음 / Very low | very low |
| 2 | 낮음 / Low | low |
| 3 | 보통 / Medium | medium |
| 4 | 높음 / High | high |
| 5 | 아주 높음 / Very high | very high |

### 모발 광택 — `person.hair.shine`

모발이 윤기 있어 보이는 정도입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 매트 / Matte | matte |
| 2 | 약한 윤기 / Low shine | low shine |
| 3 | 자연스러운 윤기 / Natural shine | natural shine |
| 4 | 윤기 / Glossy | glossy |
| 5 | 아주 윤기 / Highly glossy | highly glossy |

### 모발 상태 — `person.hair.condition`

정돈 상태와 젖은 정도이며 움직임과 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `groomed` | 단정한 | Neatly groomed | neatly groomed |  |
| `tousled` | 자연스럽게 흐트러진 | Naturally tousled | naturally tousled |  |
| `messy` | 헝클어진 | Messy | messy |  |
| `unkempt` | 손질 안 된 | Unkempt | unkempt |  |
| `wet` | 젖은 | Wet | wet |  |
| `damp` | 촉촉하게 젖은 | Damp | damp |  |
| `dry_looking` | 건조해 보이는 | Dry-looking | dry-looking |  |
| `frizzy` | 부스스한 | Frizzy | frizzy |  |

### 컬 크기 — `person.hair.curl_size`

컬·웨이브의 크기입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 작음 / Very small | very small |
| 2 | 작음 / Small | small |
| 3 | 보통 / Medium | medium-sized |
| 4 | 큼 / Large | large |
| 5 | 아주 큼 / Very large | very large |

### 컬 강도 — `person.hair.curl_tightness`

컬이 감긴 강도입니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 느슨 / Very loose | very loose |
| 2 | 느슨 / Loose | loose |
| 3 | 보통 / Medium | medium |
| 4 | 촘촘 / Tight | tight |
| 5 | 아주 촘촘 / Very tight | very tight |

### 가르마 — `person.hair.part`

좌우는 인물 기준입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `none` | 가르마 없음 | No visible part | no visible part |  |
| `center` | 가운데 가르마 | Center part | center part | 5대5 |
| `left` | 왼쪽 가르마 | Left side part | left side part |  |
| `right` | 오른쪽 가르마 | Right side part | right side part |  |
| `deep_left` | 깊은 왼쪽 가르마 | Deep left side part | deep left side part |  |
| `deep_right` | 깊은 오른쪽 가르마 | Deep right side part | deep right side part |  |

### 헤어라인 — `person.hair.hairline`

앞머리선의 모양입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `rounded` | 둥근 | Rounded | rounded |  |
| `straight` | 일자 | Straight | straight |  |
| `m_shaped` | M자 | M-shaped | M-shaped | M자 탈모 |
| `v_shaped` | V자 (뾰족한) | V-shaped | V-shaped | widow's peak |
| `irregular` | 불규칙한 | Irregular | irregular |  |

### 앞머리 형태 — `person.hair.bangs_style`

‘앞머리 없음’이면 앞머리 길이·밀도를 출력하지 않습니다(값은 보존).

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `none` | 앞머리 없음 | No bangs | none | no bangs |
| `blunt` | 일자 앞머리 | Blunt bangs | blunt |  |
| `wispy` | 시스루 앞머리 | Wispy bangs | wispy | 시스루뱅 |
| `curtain` | 커튼 앞머리 | Curtain bangs | curtain | 커튼뱅 |
| `side_swept` | 옆으로 넘긴 앞머리 | Side-swept bangs | side-swept |  |
| `choppy` | 층진 앞머리 | Choppy bangs | choppy |  |
| `asymmetric` | 비대칭 앞머리 | Asymmetric bangs | asymmetric |  |
| `micro` | 아주 짧은 앞머리 | Micro bangs | micro | baby bangs |
| `feathered` | 페더 앞머리 | Feathered bangs | feathered |  |

### 앞머리 길이 — `person.hair.bangs_length`

‘앞머리 없음’이면 출력하지 않으며, 형태가 미설정이면 사용할 수 있습니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `very_short` | 아주 짧은 | Very short | very short |  |
| `above_brows` | 눈썹 위 | Above the eyebrows | above the eyebrows |  |
| `brow` | 눈썹 길이 | Eyebrow-length | eyebrow-length |  |
| `eye` | 눈 길이 | Eye-length | eye-length |  |
| `long` | 긴 | Long | long |  |

### 앞머리 밀도 — `person.hair.bangs_density`

‘앞머리 없음’이면 출력하지 않습니다. 상대적인 정도이며 실제 측정값이 아닙니다.

| 값 | 구간 (한국어 / English) | 프롬프트 표현 |
|---|---|---|
| 1 | 아주 성김 / Very sparse | very sparse |
| 2 | 성김 / Sparse | sparse |
| 3 | 보통 / Medium | medium density |
| 4 | 촘촘함 / Dense | dense |
| 5 | 아주 촘촘함 / Very dense | very dense |

### 헤어스타일 — `person.hair.style`

스타일을 골라도 길이·묶는 위치 등은 자동으로 정해지지 않습니다. 모든 스타일은 성별과 무관합니다.

| ID | 한국어 | English | 프롬프트 표현 | 표시 그룹 | 별칭 |
|---|---|---|---|---|---|
| `buzz_cut` | 버즈컷 | Buzz cut | buzz cut | 짧은 스타일 | 삭발 스타일 |
| `crew_cut` | 크루컷 | Crew cut | crew cut | 짧은 스타일 |  |
| `pixie_cut` | 픽시컷 | Pixie cut | pixie cut | 짧은 스타일 | 숏컷 |
| `cropped` | 크롭컷 | Cropped haircut | cropped haircut | 짧은 스타일 |  |
| `caesar_cut` | 시저컷 | Caesar cut | Caesar cut | 짧은 스타일 |  |
| `french_crop` | 프렌치 크롭 | French crop | French crop | 짧은 스타일 |  |
| `short_textured` | 짧은 텍스처 컷 | Short textured haircut | short textured haircut | 짧은 스타일 |  |
| `spiky` | 삐죽 세운 머리 | Spiky hair | spiky hair | 짧은 스타일 |  |
| `classic_bob` | 클래식 보브 | Classic bob | classic bob | 보브·단발 | 단발 |
| `blunt_bob` | 일자 보브 | Blunt bob | blunt bob | 보브·단발 | 일자 단발 |
| `layered_bob` | 레이어드 보브 | Layered bob | layered bob | 보브·단발 |  |
| `asymmetrical_bob` | 비대칭 보브 | Asymmetrical bob | asymmetrical bob | 보브·단발 |  |
| `inverted_bob` | 인버티드 보브 | Inverted bob | inverted bob | 보브·단발 |  |
| `wavy_bob` | 웨이브 보브 | Wavy bob | wavy bob | 보브·단발 | 단발 펌 |
| `long_bob` | 롱 보브 | Long bob | long bob | 보브·단발 | lob, 중단발 |
| `pageboy` | 페이지보이 | Pageboy haircut | pageboy haircut | 보브·단발 |  |
| `layered_cut` | 레이어드 컷 | Layered haircut | layered haircut | 중장발·레이어 |  |
| `shag` | 섀그 컷 | Shag haircut | shag haircut | 중장발·레이어 |  |
| `wolf_cut` | 울프컷 | Wolf cut | wolf cut | 중장발·레이어 |  |
| `butterfly_cut` | 버터플라이 컷 | Butterfly cut | butterfly cut | 중장발·레이어 |  |
| `feathered_cut` | 페더 컷 | Feathered haircut | feathered haircut | 중장발·레이어 |  |
| `blunt_cut` | 일자 컷 | Blunt cut | blunt cut | 중장발·레이어 |  |
| `step_cut` | 스텝 컷 | Step cut | step cut | 중장발·레이어 |  |
| `hime_cut` | 히메컷 | Hime cut | hime cut | 중장발·레이어 |  |
| `jellyfish_cut` | 해파리컷 | Jellyfish haircut | jellyfish haircut | 중장발·레이어 |  |
| `worn_down` | 풀어 내린 머리 | Hair worn down | hair worn down | 풀어 내린 스타일 | 생머리 |
| `swept_back` | 뒤로 넘긴 머리 | Swept-back hair | swept-back hair | 풀어 내린 스타일 |  |
| `slicked_back` | 올백 | Slicked-back hair | slicked-back hair | 풀어 내린 스타일 | 올백머리 |
| `side_swept` | 옆으로 넘긴 머리 | Side-swept hair | side-swept hair | 풀어 내린 스타일 |  |
| `tucked_behind_ears` | 귀 뒤로 넘긴 머리 | Hair tucked behind the ears | hair tucked behind the ears | 풀어 내린 스타일 |  |
| `pompadour` | 퐁파두르 | Pompadour | pompadour | 볼륨·성형 스타일 |  |
| `quiff` | 퀴프 | Quiff | quiff | 볼륨·성형 스타일 |  |
| `bouffant` | 부팡 | Bouffant | bouffant | 볼륨·성형 스타일 |  |
| `afro` | 아프로 | Afro | afro | 볼륨·성형 스타일 |  |
| `flat_top` | 플랫톱 | Flat top | flat top | 볼륨·성형 스타일 |  |
| `mohawk` | 모히칸 | Mohawk | mohawk | 볼륨·성형 스타일 | 모호크 |
| `faux_hawk` | 포호크 | Faux hawk | faux hawk | 볼륨·성형 스타일 |  |
| `undercut` | 투블럭 | Undercut | undercut | 옆머리 스타일 | 언더컷 |
| `disconnected_undercut` | 디스커넥티드 언더컷 | Disconnected undercut | disconnected undercut | 옆머리 스타일 |  |
| `side_shaved` | 사이드 쉐이브 | Side-shaved hairstyle | side-shaved hairstyle | 옆머리 스타일 |  |
| `fade` | 페이드컷 | Fade haircut | fade haircut | 옆머리 스타일 |  |
| `taper` | 테이퍼컷 | Taper haircut | taper haircut | 옆머리 스타일 |  |
| `ponytail` | 포니테일 | Ponytail | ponytail | 포니테일 | 묶은 머리 |
| `twin_ponytails` | 트윈 포니테일 | Twin ponytails | twin ponytails | 포니테일 | 양갈래 |
| `bubble_ponytail` | 버블 포니테일 | Bubble ponytail | bubble ponytail | 포니테일 |  |
| `braided_ponytail` | 땋은 포니테일 | Braided ponytail | braided ponytail | 포니테일 |  |
| `side_ponytail` | 사이드 포니테일 | Side ponytail | side ponytail | 포니테일 |  |
| `bun` | 번 | Hair bun | hair bun | 번·올림머리 | 똥머리, 올림머리 |
| `messy_bun` | 메시 번 | Messy bun | messy bun | 번·올림머리 |  |
| `sleek_bun` | 슬릭 번 | Sleek bun | sleek bun | 번·올림머리 |  |
| `top_knot` | 탑 노트 | Top knot | top knot | 번·올림머리 |  |
| `double_buns` | 더블 번 | Double buns | double buns | 번·올림머리 |  |
| `space_buns` | 스페이스 번 | Space buns | space buns | 번·올림머리 |  |
| `french_twist` | 프렌치 트위스트 | French twist | French twist | 번·올림머리 |  |
| `chignon` | 시뇽 | Chignon | chignon | 번·올림머리 |  |
| `twisted_updo` | 트위스트 업도 | Twisted updo | twisted updo | 번·올림머리 |  |
| `half_up` | 반묶음 | Half-up hairstyle | half-up hairstyle | 반묶음 |  |
| `half_up_ponytail` | 반묶음 포니테일 | Half-up ponytail | half-up ponytail | 반묶음 |  |
| `half_up_bun` | 반묶음 번 | Half-up bun | half-up bun | 반묶음 | 반묶음 똥머리 |
| `half_up_braid` | 반묶음 땋은 머리 | Half-up braid | half-up braid | 반묶음 |  |
| `single_braid` | 외가닥 땋기 | Single braid | single braid | 땋은 머리 |  |
| `twin_braids` | 양갈래 땋기 | Twin braids | twin braids | 땋은 머리 |  |
| `french_braid` | 프렌치 브레이드 | French braid | French braid | 땋은 머리 |  |
| `dutch_braid` | 더치 브레이드 | Dutch braid | Dutch braid | 땋은 머리 |  |
| `fishtail_braid` | 피시테일 브레이드 | Fishtail braid | fishtail braid | 땋은 머리 |  |
| `crown_braid` | 크라운 브레이드 | Crown braid | crown braid | 땋은 머리 |  |
| `waterfall_braid` | 워터폴 브레이드 | Waterfall braid | waterfall braid | 땋은 머리 |  |
| `box_braids` | 박스 브레이드 | Box braids | box braids | 땋은 머리 |  |
| `cornrows` | 콘로우 | Cornrows | cornrows | 땋은 머리 |  |
| `locs` | 록스 | Locs | locs | 기타 | dreadlocks, 드레드 |
| `finger_waves` | 핑거 웨이브 | Finger waves | finger waves | 기타 |  |
| `pin_curls` | 핀 컬 | Pin curls | pin curls | 기타 |  |
| `finger_coils` | 핑거 코일 | Finger coils | finger coils | 기타 |  |
| `traditional_updo` | 전통 올림머리 | Traditional updo | traditional updo | 기타 | 쪽머리 |

### 묶는 위치 — `person.hair.tie_position`

포니테일·번·땋은 머리의 높이와 방향이며 헤어스타일과 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `low` | 낮게 | Low | low |  |
| `mid` | 중간 높이 | Mid-height | mid-height |  |
| `high` | 높게 | High | high |  |
| `left` | 왼쪽 | Left side | on the left side |  |
| `right` | 오른쪽 | Right side | on the right side |  |

### 레이어 정도 — `person.hair.layering`

‘없음’은 명시적 선택입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `none` | 없음 | None | none |  |
| `subtle` | 아주 약하게 | Subtle | subtle |  |
| `light` | 약하게 | Light | light |  |
| `moderate` | 보통 | Moderate | moderate |  |
| `heavy` | 많이 | Heavy | heavy |  |

### 잔머리 정도 — `person.hair.flyaways`

‘없음’은 명시적 선택입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `none` | 없음 | None | none |  |
| `very_few` | 아주 조금 | Very few | very few |  |
| `few` | 조금 | Few | few |  |
| `some` | 보통 | Some | some |  |
| `many` | 많이 | Many | many |  |
| `abundant` | 아주 많이 | Abundant | abundant |  |

### 헤어 움직임 — `person.hair.movement`

머리카락의 움직임이며 모발 상태와 독립적입니다.

| ID | 한국어 | English | 프롬프트 표현 | 별칭 |
|---|---|---|---|---|
| `still` | 정지 | Still | still |  |
| `gently_flowing` | 부드럽게 흐르는 | Gently flowing | gently flowing |  |
| `softly_swaying` | 살랑이는 | Softly swaying | softly swaying |  |
| `windblown` | 바람에 날리는 | Windblown | windblown |  |
| `strongly_windblown` | 강하게 날리는 | Strongly windblown | strongly windblown |  |
| `floating` | 떠 있는 | Floating | floating | 무중력 |

## 4. 충돌 안내 (비차단, 값은 바꾸지 않음)

| 규칙 ID | 심각도 | 내용 |
|---|---|---|
| `hair-color-pattern-solid-with-others` | warning | ‘없음’(단색)이 다른 항목과 함께 선택되었습니다. |
| `hair-condition-groomed-vs-messy` | warning | ‘단정한’과(와) ‘헝클어진’은(는) 서로 반대되는 특징입니다. |
| `hair-condition-groomed-vs-unkempt` | warning | ‘단정한’과(와) ‘손질 안 된’은(는) 서로 반대되는 특징입니다. |
| `hair-condition-groomed-vs-tousled` | warning | ‘단정한’과(와) ‘자연스럽게 흐트러진’은(는) 서로 반대되는 특징입니다. |
| `hair-condition-wet-vs-damp` | warning | ‘젖은’과(와) ‘촉촉하게 젖은’은(는) 서로 반대되는 특징입니다. |
| `hair-condition-wet-vs-dry-looking` | warning | ‘젖은’과(와) ‘건조해 보이는’은(는) 서로 반대되는 특징입니다. |
| `hair-condition-damp-vs-dry-looking` | warning | ‘촉촉하게 젖은’과(와) ‘건조해 보이는’은(는) 서로 반대되는 특징입니다. |
| `hair-tie-position-low-vs-mid` | warning | ‘낮게’과(와) ‘중간 높이’은(는) 서로 반대되는 특징입니다. |
| `hair-tie-position-low-vs-high` | warning | ‘낮게’과(와) ‘높게’은(는) 서로 반대되는 특징입니다. |
| `hair-tie-position-mid-vs-high` | warning | ‘중간 높이’과(와) ‘높게’은(는) 서로 반대되는 특징입니다. |
| `hair-tie-position-left-vs-right` | warning | ‘왼쪽’과(와) ‘오른쪽’은(는) 서로 반대되는 특징입니다. |
| `hair-short-style-vs-long-length` | warning | 짧은 헤어스타일과 긴 머리 길이가 함께 선택되었습니다. |
| `hair-bob-vs-long-length` | warning | 보브(단발) 스타일과 매우 긴 머리 길이가 함께 선택되었습니다. |
| `hair-tie-position-without-tied-style` | warning | 묶는 위치가 설정되었지만 헤어스타일은 묶는 스타일(포니테일·번·땋은 머리)이 아닙니다. |

함께 존재할 수 있는 항목(예: 하이라이트 + 로우라이트, 콧수염 + 염소수염 + 구레나룻)은 다중 선택으로 표현하며 경고하지 않습니다. 선택지와 상대 슬라이더 사이의 불일치 진단은 Sprint 2-C.2(TD-10)에서 검토했으며, 이 영역에는 명확한 의미 근거가 있는 조합이 없어 규칙을 추가하지 않았습니다.

## 5. 안전 정책

기존 정책(prompter.baseline 0.2.0)을 그대로 적용합니다. 이 영역의 표현은 그 자체로 안전 신호를 만들지 않으며(테스트), 흉터·피부 상태는 자극적이지 않은 외형 묘사이고 의학적 진단이 아닙니다.

## 6. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았고, 칩·팔레트만 사용합니다.

## 7. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.3) | Sprint 2-B.3 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
