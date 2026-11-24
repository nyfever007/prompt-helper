# 메이크업 (Makeup) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.5 개발 승인서(2-B.5A)의 초기 제품 카탈로그
- 구현: `src/domain/catalog/catalogs/person/expression-makeup.ts` (core 카탈로그 0.8.0), 카테고리 `person_makeup` (단일 화면, 16개 속성)
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md)

## 1. 설계 목적과 원칙

- 메이크업은 자연 피부색·피부결·자연 입술색·속눈썹과 **독립**적으로 저장·출력합니다(예: 피부 광택 “matte” + 베이스 마무리 “dewy”는 각각 출력).
- 성별에 따라 메이크업을 제한하지 않습니다.
- **적용 조건**: “메이크업 없음”이면 다른 15개 메이크업 속성의 출력을 억제하고, 메이크업 유무가 미설정이면 개별 속성을 그대로 사용할 수 있습니다. “아이라인 없음”이면 아이라인 색상만 억제합니다. 비활성화된 값은 보존되고, 다시 적용 가능해지면 이전 값이 출력됩니다(안전 검사는 비활성 값에도 적용).
- 색상 속성 4개(아이섀도·아이라인·블러셔·립)는 공통 메이크업 팔레트를 쓰며 사용자 정의 색상 이름·표현을 지원합니다. 아이섀도 색상은 여러 색을 조합할 수 있습니다. 직접 RGB/HEX 입력은 Sprint 3 범위입니다. 견본은 시각적 참고이며 결과 색을 보장하지 않습니다.

## 2. 속성 목록 (16)

### 메이크업 / Makeup (16) — `person_makeup`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 372 | `person.makeup.presence` | 메이크업 유무 / Makeup | 단일 · 칩 | `Makeup: {value}.` | 메이크업 없음(No makeup) → no makeup; 메이크업 함(Makeup applied) → makeup applied | — | makeup, 화장, 메이크업, 쌩얼 |
| 373 | `person.makeup.style` | 메이크업 스타일 / Makeup style | 다중 · 검색 목록 + 사용자 정의 | `Makeup style: {value}.` | 내추럴(Natural) → natural; 데일리(Everyday) → everyday; 소프트 글램(Soft glam) → soft glam; 풀 글램(Full glam) → full glam; 스모키(Smoky) → smoky; 빈티지(Vintage) → vintage; 레트로(Retro) → retro; 고딕(Gothic) → gothic; 에디토리얼(Editorial) → editorial; 무대(Theatrical) → theatrical; 판타지(Fantasy) → fantasy; 아방가르드(Avant-garde) → avant-garde; 한국식(Korean-style) → Korean-style; 그래픽(Graphic) → graphic | `makeup.presence` ≠ none | makeup style, 메이크업 스타일 |
| 374 | `person.makeup.intensity` | 메이크업 강도 / Makeup intensity | 상대 슬라이더 (1–5) | `Makeup intensity: {value}.` | 1 아주 옅음(Very subtle) → very subtle; 2 옅음(Subtle) → subtle; 3 보통(Moderate) → moderate; 4 진함(Heavy) → heavy; 5 아주 진함(Very heavy) → very heavy | `makeup.presence` ≠ none | makeup intensity, 화장 강도, 진한 화장 |
| 375 | `person.makeup.base_coverage` | 베이스 커버리지 / Base coverage | 단일 · 칩 | `Foundation coverage: {value}.` | 아주 얇게(Sheer) → sheer; 가볍게(Light) → light; 보통(Medium) → medium; 풀 커버(Full) → full | `makeup.presence` ≠ none | foundation, coverage, 커버력, 파운데이션 |
| 376 | `person.makeup.base_finish` | 베이스 마무리 / Base finish | 단일 · 칩 | `Foundation finish: {value}.` | 매트(Matte) → matte; 세미 매트(Semi-matte) → semi-matte; 새틴(Satin) → satin; 내추럴(Natural) → natural; 듀이(Dewy) → dewy; 루미너스(Luminous) → luminous | `makeup.presence` ≠ none | finish, 피니시, 물광, 매트 |
| 377 | `person.makeup.eyeshadow_color` | 아이섀도 색상 / Eyeshadow colors | 다중 · 색상 팔레트 + 사용자 정의 | `Eyeshadow colors: {value}.` | 메이크업 색상 팔레트(40색 · 8그룹, §3) | `makeup.presence` ≠ none | eyeshadow, 섀도 |
| 378 | `person.makeup.eyeshadow_style` | 아이섀도 스타일 / Eyeshadow style | 다중 · 칩 | `Eyeshadow style: {value}.` | 단색(Single-color) → single-color; 그라데이션(Gradient) → gradient; 스모키(Smoky) → smoky; 시머(Shimmer) → shimmer; 글리터(Glitter) → glitter; 컷 크리즈(Cut crease) → cut crease; 그래픽(Graphic) → graphic | `makeup.presence` ≠ none | eyeshadow style, 섀도 스타일, 그라데이션 |
| 379 | `person.makeup.eyeliner_style` | 아이라인 스타일 / Eyeliner style | 단일 · 칩 | `Eyeliner: {value}.` | 없음(None) → none; 자연스러운(Natural) → natural; 점막 채우기(Tightline) → tightline; 윙(Winged) → winged; 캣아이(Cat-eye) → cat-eye; 그래픽(Graphic) → graphic; 더블 윙(Double-wing) → double-wing | `makeup.presence` ≠ none | eyeliner, 아이라인 |
| 380 | `person.makeup.eyeliner_color` | 아이라인 색상 / Eyeliner color | 단일 · 색상 팔레트 + 사용자 정의 | `Eyeliner color: {value}.` | 메이크업 색상 팔레트(40색 · 8그룹, §3) | `makeup.presence` ≠ none, `makeup.eyeliner_style` ≠ none | eyeliner color, 아이라인 색 |
| 381 | `person.makeup.mascara` | 마스카라 / Mascara | 단일 · 칩 | `Mascara: {value}.` | 없음(None) → none; 자연스러운(Natural) → natural; 롱래시(Lengthening) → lengthening; 볼륨(Volumizing) → volumizing; 드라마틱(Dramatic) → dramatic | `makeup.presence` ≠ none | mascara, 마스카라 |
| 382 | `person.makeup.false_lashes` | 인조 속눈썹 / False eyelashes | 단일 · 칩 | `False eyelashes: {value}.` | 없음(None) → none; 자연스러운(Natural-looking) → natural-looking; 가닥가닥(Wispy) → wispy; 풍성한(Full) → full; 드라마틱(Dramatic) → dramatic | `makeup.presence` ≠ none | false lashes, 인조 속눈썹, 속눈썹 연장 |
| 383 | `person.makeup.blush_color` | 블러셔 색상 / Blush color | 단일 · 색상 팔레트 + 사용자 정의 | `Blush color: {value}.` | 메이크업 색상 팔레트(40색 · 8그룹, §3) | `makeup.presence` ≠ none | blush, 블러셔, 치크 |
| 384 | `person.makeup.blush_placement` | 블러셔 위치 / Blush placement | 다중 · 칩 | `Blush placement: {value}.` | 볼 앞쪽(Apples of the cheeks) → apples of the cheeks; 광대(Cheekbones) → cheekbones; 관자놀이(Temples) → temples; 코를 가로질러(Across the nose) → across the nose; 눈 밑(Under the eyes) → under the eyes | `makeup.presence` ≠ none | blush placement, 블러셔 위치 |
| 385 | `person.makeup.lip_color` | 립 메이크업 색상 / Lip makeup color | 단일 · 색상 팔레트 + 사용자 정의 | `Lip makeup color: {value}.` | 메이크업 색상 팔레트(40색 · 8그룹, §3) | `makeup.presence` ≠ none | lipstick, 립스틱, 립 색 |
| 386 | `person.makeup.lip_finish` | 립 마무리 / Lip finish | 단일 · 칩 | `Lip finish: {value}.` | 매트(Matte) → matte; 벨벳(Velvet) → velvet; 새틴(Satin) → satin; 글로시(Glossy) → glossy; 시어(Sheer) → sheer; 메탈릭(Metallic) → metallic | `makeup.presence` ≠ none | lip finish, 립 제형, 글로스 |
| 387 | `person.makeup.contour` | 컨투어·하이라이터 / Contour & highlight | 단일 · 칩 | `Contouring and highlighting: {value}.` | 없음(None) → none; 은은한(Subtle) → subtle; 보통(Moderate) → moderate; 선명한(Defined) → defined; 드라마틱(Dramatic) → dramatic | `makeup.presence` ≠ none | contour, highlighter, 쉐딩, 하이라이터 |

## 3. 메이크업 색상 팔레트 (40색 · 8그룹)

표시 그룹 이름은 프롬프트에 출력하지 않습니다.

| 그룹 | 색상(프롬프트 표현) |
|---|---|
| 뉴트럴 / Neutral | 아이보리(ivory), 베이지(beige), 누드 베이지(nude beige), 토프(taupe), 캐러멜(caramel), 브라운(brown) |
| 핑크 / Pink | 연핑크(pale pink), 소프트 핑크(soft pink), 더스티 핑크(dusty pink), 로즈(rose), 더스티 로즈(dusty rose), 핫핑크(hot pink) |
| 레드 / Red | 코랄 레드(coral red), 클래식 레드(classic red), 체리 레드(cherry red), 크림슨(crimson), 벽돌색(brick red), 버건디(burgundy) |
| 오렌지 / Orange | 피치(peach), 살구색(apricot), 코랄(coral), 테라코타(terracotta) |
| 퍼플 / Purple | 모브(mauve), 플럼(plum), 라벤더(lavender), 바이올렛(violet) |
| 다크 / Dark | 차콜(charcoal), 블랙(black), 딥 브라운(deep brown) |
| 메탈릭 / Metallic | 골드(gold), 로즈 골드(rose gold), 브론즈(bronze), 코퍼(copper), 실버(silver) |
| 크리에이티브 / Creative | 화이트(white), 블루(blue), 틸(teal), 그린(green), 민트(mint), 옐로(yellow) |

## 4. 충돌 안내

메이크업 영역에는 별도 충돌 규칙이 없습니다. “없음”과 다른 값의 관계는 충돌이 아니라 적용 조건(§1)으로 처리합니다.

## 5. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.5) | Sprint 2-B.5 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
