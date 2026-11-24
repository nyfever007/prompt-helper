# 조명 (Lighting) — 카탈로그 설계

- 버전: 1.1.0
- 설계 상태: **APPROVED** — Sprint 2-B.6 개발 승인서의 초기 제품 카탈로그 (Sprint 2-A 조명 구조 유지)
- 구현: core 카탈로그 0.10.0 — 기존 Basic 프리셋 1개 + Sprint 2-A 조명 속성 6개(`core.ts`, 선택지 추가) + 새 Detailed 속성 11개(`src/domain/catalog/catalogs/shared/lighting.ts`), 카테고리 `shared_lighting` 아래 하위 분류 6개(Sprint 2-C.1, §2-1)
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md)

## 1. 설계 목적과 원칙

- **유지**: Basic 조명 프리셋 12개(ID·문구·분류 정보·의미 단위 대체·출처·되돌리기)와 Sprint 2-A 속성 6개(광원·빛의 방향·빛의 질감·밝기·색온도·명암 대비)의 ID·기존 선택지·문구·출력이 그대로입니다. 프리셋은 세부 설정을 바꾸지 않습니다.
- **기존 속성에 선택지만 추가**: 광원 + 소프트박스·LED·인공 환경광, 방향 + 3/4 측광, 질감 + 아주 부드러운·아주 딱딱한, 밝기 + 아주 어두운·아주 밝은, 색온도 + 아주 차가운·아주 따뜻한, 대비 + 아주 낮음·아주 높음. 기존 값과 프롬프트는 바뀌지 않습니다. 기존 속성을 슬라이더로 바꾸지 않은 이유: 값 형식이 바뀌면 저장된 명세와 프리셋 의미 단위 대체가 깨지기 때문입니다.
- **독립**: 강도 ↔ 부드러움, 조명 색상 ↔ 색온도, 주광 ↔ 보조광 ↔ 림 라이트 ↔ 환경광, 그림자 강도 ↔ 그림자 경계는 각각 독립 값입니다.
- **적용 조건**: 림 라이트 “없음”이면 림 라이트 색상, 그림자 “없음”이면 그림자 경계를 출력하지 않습니다(값 보존·복원).
- 조명은 시간대·장소·날씨·피부색을 설정하지 않습니다. 3D 조명 편집기·복수 광원 객체는 범위 밖이며, RGB/HEX 직접 입력은 Sprint 3입니다.

## 2. 속성 목록 (18)

### 조명 / Lighting (18) — `shared_lighting`

| 순서 | Attribute ID | 한국어 / English | 단계 | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|---|
| 2000 | `lighting.preset` | 조명 (빠른 프리셋) / Lighting (quick preset) | Basic+Detailed | 단일 · 칩 | `Lighting: {value}.` | 자연광(Natural daylight) → soft natural daylight; 골든아워(Golden hour) → warm golden-hour sunlight; 한낮 햇빛(Midday sun) → harsh midday sunlight; 흐린 날(Overcast) → soft, diffuse overcast light; 블루아워 (해질녘 직후)(Blue hour) → cool blue-hour twilight; 달빛(Moonlight) → dim, cool moonlight; 스튜디오 소프트박스(Studio softbox) → even studio softbox lighting; 로우키 (깊은 그림자)(Low-key (deep shadows)) → dramatic low-key lighting with deep shadows; 하이키 (밝고 화사함)(High-key (bright)) → bright high-key lighting; 역광 / 림 라이트(Backlit / rim light) → strong backlighting with a bright rim light; 네온(Neon) → colorful neon lighting; 촛불(Candlelight) → warm, flickering candlelight | 모든 피사체 |  |
| 2010 | `lighting.source` | 광원 / Light source | Detailed | 단일 · 칩 | `Light source: {value}.` | 태양(Sun) → direct sunlight; 하늘광 (확산광)(Sky / diffuse daylight) → diffuse skylight; 달(Moon) → moonlight; 스튜디오 조명(Studio lights) → studio lights; 실내 조명기구(Lamps / practical lights) → practical lamps; 네온(Neon) → neon signs; 불 / 촛불(Fire / candles) → firelight; 소프트박스(Softbox) → softbox lighting; LED 조명(LED light) → LED lighting; 인공 환경광(Ambient artificial light) → ambient artificial light | 모든 피사체 |  |
| 2020 | `lighting.direction` | 빛의 방향 / Light direction | Detailed | 단일 · 칩 | `Light direction: {value}.` | 정면광(Front) → front lighting; 측광(Side) → side lighting; 3/4 측광(Three-quarter) → three-quarter lighting; 역광(Back) → backlighting; 탑 라이트(Top) → top lighting; 아래에서(Below) → lighting from below; 전방위 (확산)(Ambient / all around) → ambient all-around light | 모든 피사체 |  |
| 2025 | `lighting.key_height` | 주광 높이 / Key light height | Detailed | 상대 슬라이더 (1–5) | `Key light position: {value}.` | 1 아주 낮음(Very low) → very low; 2 낮음(Low) → low; 3 눈높이(Level) → level with the subject; 4 높음(High) → high; 5 아주 높음(Very high) → very high | 모든 피사체 | light height, 광원 높이, 조명 높이 |
| 2030 | `lighting.softness` | 빛의 질감 (부드러움) / Softness / hardness | Detailed | 단일 · 칩 | `Light quality: {value}.` | 아주 부드러운(Very soft) → very soft light; 부드러운(Soft) → soft light; 중간(Medium) → moderately soft light; 딱딱한(Hard) → hard light; 아주 딱딱한(Very hard) → very hard light | 모든 피사체 |  |
| 2040 | `lighting.intensity` | 밝기 / Intensity | Detailed | 단일 · 칩 | `Light intensity: {value}.` | 아주 어두운(Very dim) → very dim; 어두운(Dim) → dim; 보통(Moderate) → moderate; 밝은(Bright) → bright; 아주 밝은(Very bright) → very bright | 모든 피사체 |  |
| 2050 | `lighting.color_temperature` | 색온도 / Color temperature | Detailed | 단일 · 칩 | `Color temperature: {value}.` | 아주 차가운(Very cool) → very cool; 차가운(Cool) → cool; 중립(Neutral) → neutral; 따뜻한(Warm) → warm; 아주 따뜻한(Very warm) → very warm; 여러 색(Mixed colors) → mixed colored light | 모든 피사체 |  |
| 2055 | `lighting.key_color` | 주광 색상 / Key light color | Detailed | 단일 · 색상 팔레트 + 사용자 정의 | `Key light color: {value}.` | 조명 색상 팔레트(14색 · 4그룹, §3) | 모든 피사체 | light color, 조명 색, 컬러 조명 |
| 2060 | `lighting.contrast` | 명암 대비 / Contrast | Detailed | 단일 · 칩 | `Lighting contrast: {value}.` | 아주 낮음(Very low) → very low contrast; 낮음(Low) → low contrast; 중간(Medium) → medium contrast; 높음(High) → high contrast; 아주 높음(Very high) → very high contrast | 모든 피사체 |  |
| 2065 | `lighting.fill` | 보조광 / Fill light | Detailed | 단일 · 칩 | `Fill light: {value}.` | 없음(None) → none; 약간(Subtle) → subtle; 보통(Moderate) → moderate; 강함(Strong) → strong | 모든 피사체 | fill light, 보조광, 필 라이트 |
| 2070 | `lighting.rim` | 림 라이트 / Rim light | Detailed | 단일 · 칩 | `Rim light: {value}.` | 없음(None) → none; 약간(Subtle) → subtle; 보통(Moderate) → moderate; 강함(Strong) → strong | 모든 피사체 | rim light, 림 라이트, 윤곽광, 헤어 라이트 |
| 2072 | `lighting.rim_color` | 림 라이트 색상 / Rim light color | Detailed | 단일 · 색상 팔레트 + 사용자 정의 | `Rim light color: {value}.` | 조명 색상 팔레트(14색 · 4그룹, §3) | `lighting.rim` ≠ none (미설정이면 통과) | rim color, 림 라이트 색 |
| 2075 | `lighting.ambient` | 환경광 / Ambient light | Detailed | 단일 · 칩 | `Ambient light: {value}.` | 없음(None) → none; 약간(Subtle) → subtle; 보통(Moderate) → moderate; 강함(Strong) → strong | 모든 피사체 | ambient light, 환경광, 주변광 |
| 2080 | `lighting.shadow_strength` | 그림자 강도 / Shadow strength | Detailed | 단일 · 칩 | `Shadows: {value}.` | 그림자 없음(No visible shadows) → no visible shadows; 옅은(Light) → light shadows; 보통(Moderate) → moderate shadows; 진한(Strong) → strong shadows; 깊은(Deep) → deep shadows | 모든 피사체 | shadows, 그림자, 그림자 진하기 |
| 2082 | `lighting.shadow_edge` | 그림자 경계 / Shadow edge | Detailed | 상대 슬라이더 (1–5) | `Shadow edges: {value}.` | 1 아주 부드러움(Very soft) → very soft; 2 부드러움(Soft) → soft; 3 보통(Moderate) → moderately defined; 4 뚜렷함(Defined) → defined; 5 아주 뚜렷함(Sharply defined) → sharply defined | `lighting.shadow_strength` ≠ none (미설정이면 통과) | shadow edge, 그림자 경계, 그림자 윤곽 |
| 2085 | `lighting.reflected` | 반사광 / Reflected light | Detailed | 단일 · 칩 | `Reflected light: {value}.` | 없음(None) → none; 약간(Subtle) → subtle; 보통(Moderate) → moderate; 강함(Strong) → strong | 모든 피사체 | reflected light, 반사광, 바운스 |
| 2090 | `lighting.volumetric` | 볼류메트릭 조명 / Volumetric light | Detailed | 단일 · 칩 | `Volumetric lighting: {value}.` | 없음(None) → none; 약간(Subtle) → subtle; 보통(Moderate) → moderate; 강함(Strong) → strong | 모든 피사체 | volumetric, god rays, 빛내림, 빛줄기 |
| 2095 | `lighting.source_visibility` | 광원 가시성 / Light source visibility | Detailed | 단일 · 칩 | `Light source visibility: {value}.` | 화면 안(Visible) → visible in the frame; 화면 밖(Off-screen) → off-screen | 모든 피사체 | light source visible, 광원 노출, 화면 밖 조명 |

## 2-1. 하위 분류 (Sprint 2-C.1)

Detailed 탐색에서 18개 속성을 의미 그룹 6개로 나눕니다. 탐색 구조만 바뀌며 속성 ID·선택지·저장값·`order`·프롬프트 출력과 Basic 조명 프리셋 12개의 동작·출력은 그대로입니다. 분류의 원본은 `LIGHTING_SECTIONS`(`lighting.ts`)입니다.

| 하위 분류 | ID | 속성 |
|---|---|---|
| 조명 프리셋 및 광원 | `shared_lighting_source` | 조명(빠른 프리셋, Basic 공유)·광원 |
| 주광 | `shared_lighting_key` | 빛의 방향·주광 높이·빛의 질감·밝기 |
| 보조광 및 환경광 | `shared_lighting_fill` | 보조광·림 라이트·림 라이트 색상·환경광·반사광 |
| 색상 및 색온도 | `shared_lighting_color` | 색온도·주광 색상 |
| 그림자 및 대비 | `shared_lighting_shadow` | 명암 대비·그림자 강도·그림자 경계 |
| 조명 효과 | `shared_lighting_effects` | 볼류메트릭 조명·광원 가시성 |

판단:
- 림 라이트 색상은 의존하는 림 라이트 강도 바로 옆(“보조광 및 환경광”)에 둡니다.
  - 함께 편집하는 속성이고, 림 라이트가 “없음”일 때 색상이 보존되지만 출력되지 않는다는 안내를 같은 페이지에서 확인할 수 있습니다.
  - Sprint 2-C.1 최종 승인에서 “색상 및 색온도”에서 옮겼습니다.
- 주광 색상은 주광 강도와 독립적인 속성이라 “색상 및 색온도”에 그대로 둡니다.
- 반사광은 보조적인 빛이라 “보조광 및 환경광”에 둡니다.
- 림 라이트 “없음” → 색상 미출력(값 보존, 안내) 규칙은 그대로입니다.

## 3. 조명 색상 팔레트 (14색 · 4그룹) — 주광·림 라이트 색상이 공유, 사용자 정의 색 이름 가능

| 그룹 | 색상(프롬프트 표현) |
|---|---|
| 화이트 / Whites | 화이트(white), 웜 화이트(warm white), 쿨 화이트(cool white) |
| 따뜻한 색 / Warm | 앰버(amber), 골든(golden), 오렌지(orange), 레드(red) |
| 차가운 색 / Cool | 시안(cyan), 블루(blue), 바이올렛(violet) |
| 비비드 / Vivid | 옐로(yellow), 그린(green), 마젠타(magenta), 핑크(pink) |

## 4. 충돌 안내 (비차단)

`silhouette-hides-face`와 프리셋 관련 규칙은 Sprint 1·2-A부터 있던 규칙입니다.

| 규칙 ID | 관련 속성 | 안내 문구 |
|---|---|---|
| `sky-light-in-studio` | `lighting.preset`, `scene.setting` | 스튜디오 안에서 햇빛·달빛 조명은 어울리지 않을 수 있습니다. |
| `backlight-vs-direction` | `lighting.preset`, `lighting.direction` | 역광 프리셋은 뒤에서 오는 빛이 핵심인데, 빛의 방향이 다른 값으로 설정되어 있습니다. |
| `silhouette-hides-face` | `lighting.preset`, `composition.framing` | 강한 역광은 얼굴 클로즈업을 실루엣으로 만들 수 있습니다. |
| `lighting-low-contrast-vs-deep-shadows` | `lighting.contrast`, `lighting.shadow_strength` | 낮은 명암 대비에 깊은 그림자가 함께 설정되었습니다. |

## 5. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-25 | 1.1.0 | 하위 분류 6개(탐색 전용, ID·출력·Basic 프리셋 변경 없음), core 카탈로그 0.10.0 | Sprint 2-C.1 개발 승인서 |
| 2026-11-25 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.6) | Sprint 2-B.6 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
