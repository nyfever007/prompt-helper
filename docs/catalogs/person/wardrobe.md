# 의상 (Wardrobe) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.5 개발 승인서(2-B.5B)의 초기 제품 카탈로그
- 구현: `src/domain/catalog/catalogs/person/clothing.ts` (core 카탈로그 0.8.0), 카테고리 `person_wardrobe` + 하위 분류 8개(전체 설정 8, 상의 12, 하의 10, 원피스 및 일체형 13, 아우터 11, 내의 4, 신발 8, 양말 및 스타킹 6 — 합계 72)
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md)

## 1. 설계 목적과 원칙

- 각 의복 카테고리는 별도의 Attribute ID 영역(`person.clothing.<의복>.*`)을 가지며, 모든 값은 의복·속성마다 **독립적으로 저장**됩니다. 같은 팔레트를 써도 상의 색상과 하의 색상은 서로 다른 값입니다. 문장 틀은 의복 이름으로 시작해(“Top primary color: …”, “Bottom primary color: …”) 다른 의복의 특징으로 읽히지 않게 합니다.
- **전체 설정**(패션 스타일·격식·전체 핏·계절·시대·상태·레이어링·커버리지)은 개별 의복을 자동 설정하지 않습니다. 전체 핏과 각 의복의 핏은 따로 저장됩니다.
- **커버리지**는 의복이 몸을 덮는 정도만 나타냅니다. 커버리지·핏·의복 종류·매력 표현·성적 표현은 서로 다른 개념이며, 커버리지·핏 선택은 노출·성적 연출·포즈를 추가하지 않습니다.
- **의복 종류**는 카테고리마다 단일 선택이며 사용자 정의를 지원합니다. 한 카테고리에 여러 벌을 두는 반복 객체는 후속 확장이며 영구적인 제한이 아닙니다. 여러 카테고리는 동시에 설정할 수 있습니다.
- 의복 종류가 미설정이어도 사용자가 고른 상세 속성은 출력됩니다. **명시적인 “없음”**은 해당 의복의 세부 출력만 억제(값 보존)하며, 해당 의복이 없다는 뜻일 뿐 나체 표현으로 바뀌지 않습니다(“no separate top garment” 등 중립 문구, 안전 어휘 미검출을 테스트로 확인).
- 원피스를 선택해도 상의·하의 값을 지우지 않으며, 레이어링 조합은 진단하지 않습니다. **실제 모순**만 비차단으로 안내합니다(§4).
- 의복 종류별로 의미 있는 상세 속성만 적용합니다(표의 “적용 조건”): 민소매 상의의 소매, 스커트·반바지·레깅스·통이 이름에 있는 청바지의 바지 통, 점프슈트·롬퍼·오버올·던가리의 스커트 실루엣, 오버올·던가리의 넥라인·소매, 판초·숄의 여밈, 숄의 후드, 플랫 굽의 굽 형태, 길이가 이름에 있는 양말의 길이, 타이츠·스타킹이 아닌 종류의 비침 정도.
- 성별·직업·국적·사회적 지위로 착용을 제한하지 않으며, 전통 복식은 성별·국적·민족을 자동 설정하지 않습니다. 브랜드 이름을 만들지 않습니다.
- **내의**는 패션 디자인을 위한 중립적인 의복 분류입니다(안전 정책 0.3.0, Sprint 2-C.3 — TD-12).
  - 속옷류 선택지 8개(내복, 스포츠 브라, 일상용 브라, 보정 이너웨어, 브리프, 드로즈, 트렁크, 풀커버리지 하의)는 의복 분류 태그 `garment.intimate`를 가집니다. 성적 매력 표현으로 취급하지 않으며, 성인과 연령 미설정 상태에서는 그대로 출력됩니다.
  - 미성년·나이 모호 연령과 함께면 **모든 속옷류가 같은 규칙(`minor-intimate-apparel`)으로 차단**됩니다. 0.2.0에서는 4개만 차단되고 브리프·드로즈·트렁크·보정 이너웨어는 통과했습니다.
  - 언더셔츠·베이스 레이어·캐미솔은 레이어링 상의로 분류해 태그가 없습니다(변경 없음).
  - 문구는 바꾸지 않았습니다.

## 2. 속성 목록 (72)

### 전체 설정 / General (8) — `person_wardrobe_general`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 388 | `person.clothing.fashion_style` | 패션 스타일 / Fashion style | 다중 · 검색 목록 + 사용자 정의 | `Fashion style: {value}.` | 캐주얼(Casual) → casual; 스마트 캐주얼(Smart casual) → smart casual; 포멀(Formal) → formal; 비즈니스(Business) → business; 비즈니스 캐주얼(Business casual) → business casual; 스트리트(Streetwear) → streetwear; 스포츠웨어(Sportswear) → sportswear; 아웃도어(Outdoor) → outdoor; 밀리터리(Military-inspired) → military-inspired; 프레피(Preppy) → preppy; 미니멀(Minimalist) → minimalist; 빈티지(Vintage) → vintage; 레트로(Retro) → retro; 보헤미안(Bohemian) → bohemian; 고딕(Gothic) → gothic; 펑크(Punk) → punk; 그런지(Grunge) → grunge; 테크웨어(Techwear) → techwear; 미래적(Futuristic) → futuristic; 사이버펑크(Cyberpunk) → cyberpunk; 스팀펑크(Steampunk) → steampunk; 판타지(Fantasy) → fantasy; 전통(Traditional) → traditional; 오트 쿠튀르(Haute couture) → haute couture | — | fashion, style, 패션, 룩, 코디 |
| 389 | `person.clothing.formality` | 격식 수준 / Formality | 상대 슬라이더 (1–5) | `Clothing formality: {value}.` | 1 아주 캐주얼(Very casual) → very casual; 2 캐주얼(Casual) → casual; 3 세미 포멀(Semi-formal) → semi-formal; 4 포멀(Formal) → formal; 5 아주 포멀(Highly formal) → highly formal | — | formality, 격식, 포멀함 |
| 390 | `person.clothing.fit` | 전체 핏 / Overall fit | 단일 · 칩 | `Overall clothing fit: {value}.` | 핏 어휘(6, §3) | — | overall fit, 전체 핏, 핏 |
| 391 | `person.clothing.season` | 계절 / Season | 다중 · 칩 | `Clothing season: {value}.` | 봄(Spring) → spring; 여름(Summer) → summer; 가을(Autumn) → autumn; 겨울(Winter) → winter; 사계절(All-season) → all-season | — | season, 계절, 여름옷, 겨울옷 |
| 392 | `person.clothing.era` | 의상 시대 / Clothing era | 단일 · 검색 목록 + 사용자 정의 | `Clothing era: {value}.` | 고대(Ancient) → ancient; 중세(Medieval) → medieval; 르네상스(Renaissance) → Renaissance; 바로크(Baroque) → Baroque; 빅토리아 시대(Victorian) → Victorian; 에드워드 시대(Edwardian) → Edwardian; 1920년대(1920s) → 1920s; 1930년대(1930s) → 1930s; 1940년대(1940s) → 1940s; 1950년대(1950s) → 1950s; 1960년대(1960s) → 1960s; 1970년대(1970s) → 1970s; 1980년대(1980s) → 1980s; 1990년대(1990s) → 1990s; 현대(Contemporary) → contemporary; 미래(Futuristic) → futuristic | — | era, 시대, 시대 의상, decade |
| 393 | `person.clothing.condition` | 의상 상태 / Clothing condition | 단일 · 칩 | `Clothing condition: {value}.` | 새것(Brand-new) → brand-new; 깨끗한(Clean) → clean; 약간 입은(Lightly worn) → lightly worn; 낡은(Worn) → worn; 해진(Weathered) → weathered; 디스트레스드(Distressed) → distressed; 덧댄(Patched) → patched; 너덜너덜한(Tattered) → tattered | — | condition, 상태, 낡은 옷, 새 옷 |
| 394 | `person.clothing.layering` | 레이어링 / Layering | 단일 · 칩 | `Clothing layering: {value}.` | 한 겹(Single-layer) → single-layer; 가볍게 겹침(Lightly layered) → lightly layered; 적당히 겹침(Moderately layered) → moderately layered; 많이 겹침(Heavily layered) → heavily layered | — | layering, 레이어드, 겹쳐 입기 |
| 395 | `person.clothing.coverage` | 전체 커버리지 / Overall coverage | 단일 · 칩 | `Clothing coverage: {value}.` | 전체(Full coverage) → full coverage; 높음(High coverage) → high coverage; 보통(Moderate coverage) → moderate coverage; 낮음(Light coverage) → light coverage; 최소(Minimal garment coverage) → minimal garment coverage | — | coverage, 커버리지, 노출도 |

### 상의 / Tops (12) — `person_wardrobe_tops`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 396 | `person.clothing.tops.type` | 상의 종류 / Top type | 단일 · 검색 목록 + 사용자 정의 | `Top: {value}.` | 없음(No separate top) → no separate top garment; 티셔츠(T-shirt) → T-shirt; 그래픽 티셔츠(Graphic T-shirt) → graphic T-shirt; 폴로 셔츠(Polo shirt) → polo shirt; 헨리넥 셔츠(Henley shirt) → Henley shirt; 버튼다운 셔츠(Button-down shirt) → button-down shirt; 드레스 셔츠(Dress shirt) → dress shirt; 옥스퍼드 셔츠(Oxford shirt) → oxford shirt; 린넨 셔츠(Linen shirt) → linen shirt; 블라우스(Blouse) → blouse; 탱크톱(Tank top) → tank top; 민소매 상의(Sleeveless top) → sleeveless top; 크롭톱(Crop top) → crop top; 캐미솔(Camisole) → camisole; 조끼(Vest) → vest; 스웨터(Sweater) → sweater; 니트 스웨터(Knit sweater) → knit sweater; 터틀넥(Turtleneck) → turtleneck top; 모크넥 상의(Mock-neck top) → mock-neck top; 맨투맨(Sweatshirt) → sweatshirt; 후드티(Hoodie) → hoodie; 튜닉 상의(Tunic top) → tunic top; 페플럼 상의(Peplum top) → peplum top; 랩 상의(Wrap top) → wrap top | — | top, 상의, 윗옷, 셔츠 |
| 397 | `person.clothing.tops.primary_color` | 상의 기본 색상 / Top primary color | 단일 · 색상 팔레트 + 사용자 정의 | `Top primary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.tops.type` ≠ none | top color, 상의 색, 상의 색상 |
| 398 | `person.clothing.tops.secondary_color` | 상의 보조 색상 / Top secondary color | 단일 · 색상 팔레트 + 사용자 정의 | `Top secondary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.tops.type` ≠ none | top accent color, 상의 보조색, 상의 포인트 색 |
| 399 | `person.clothing.tops.material` | 상의 소재 / Top material | 단일 · 검색 목록 + 사용자 정의 | `Top material: {value}.` | 소재 어휘(31, §3) | `clothing.tops.type` ≠ none | top material, 상의 소재, 상의 원단 |
| 400 | `person.clothing.tops.pattern` | 상의 패턴 / Top pattern | 단일 · 검색 목록 + 사용자 정의 | `Top pattern: {value}.` | 패턴 어휘(23, §3) | `clothing.tops.type` ≠ none | top pattern, 상의 무늬, 상의 패턴 |
| 401 | `person.clothing.tops.fit` | 상의 핏 / Top fit | 단일 · 칩 | `Top fit: {value}.` | 핏 어휘(6, §3) | `clothing.tops.type` ≠ none | top fit, 상의 핏 |
| 402 | `person.clothing.tops.neckline` | 상의 넥라인 / Top neckline | 단일 · 검색 목록 + 사용자 정의 | `Top neckline: {value}.` | 넥라인 어휘(13, §3) | `clothing.tops.type` ≠ none | top neckline, 상의 넥라인, 상의 목선 |
| 403 | `person.clothing.tops.collar` | 상의 칼라 / Top collar | 단일 · 칩 | `Top collar: {value}.` | 칼라 없음(No collar) → no collar; 포인트 칼라(Point collar) → point collar; 스프레드 칼라(Spread collar) → spread collar; 버튼다운 칼라(Button-down collar) → button-down collar; 차이나 칼라(Mandarin collar) → mandarin collar; 스탠드 칼라(Stand collar) → stand collar; 피터팬 칼라(Peter Pan collar) → Peter Pan collar; 세일러 칼라(Sailor collar) → sailor collar; 숄 칼라(Shawl collar) → shawl collar; 노치드 라펠(Notched lapel) → notched lapel; 피크드 라펠(Peak lapel) → peak lapel | `clothing.tops.type` ≠ none | collar, 칼라, 깃 |
| 404 | `person.clothing.tops.sleeve_length` | 상의 소매 길이 / Top sleeve length | 단일 · 칩 | `Top sleeve length: {value}.` | 소매 길이 어휘(7, §3) | `clothing.tops.type` ≠ none, `clothing.tops.type` ≠ tank_top/sleeveless_top/camisole/vest | top sleeve length, 상의 소매 길이, 상의 소매 |
| 405 | `person.clothing.tops.sleeve_style` | 상의 소매 형태 / Top sleeve style | 단일 · 칩 + 사용자 정의 | `Top sleeve style: {value}.` | 소매 형태 어휘(10, §3) | `clothing.tops.type` ≠ none, `clothing.tops.type` ≠ tank_top/sleeveless_top/camisole/vest | top sleeve style, 상의 소매 형태 |
| 406 | `person.clothing.tops.length` | 상의 기장 / Top length | 단일 · 칩 | `Top length: {value}.` | 크롭(Cropped) → cropped; 허리 길이(Waist-length) → waist-length; 엉덩이 길이(Hip-length) → hip-length; 롱 기장(Longline) → longline | `clothing.tops.type` ≠ none | top length, 상의 기장, 크롭 |
| 407 | `person.clothing.tops.details` | 상의 디테일 / Top details | 다중 · 검색 목록 + 사용자 정의 | `Top details: {value}.` | 디테일 어휘(26, §3) | `clothing.tops.type` ≠ none | top details, 상의 디테일, 상의 장식 |

### 하의 / Bottoms (10) — `person_wardrobe_bottoms`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 408 | `person.clothing.bottoms.type` | 하의 종류 / Bottom type | 단일 · 검색 목록 + 사용자 정의 | `Bottom: {value}.` | 없음(No separate bottom) → no separate bottom garment; 청바지(Jeans) → jeans; 일자 청바지(Straight-leg jeans) → straight-leg jeans; 스키니진(Skinny jeans) → skinny jeans; 와이드 청바지(Wide-leg jeans) → wide-leg jeans; 플레어 청바지(Flared jeans) → flared jeans; 테일러드 바지(Tailored trousers) → tailored trousers; 슬랙스(Slacks) → slacks; 치노 팬츠(Chinos) → chinos; 카고 팬츠(Cargo pants) → cargo pants; 조거 팬츠(Joggers) → joggers; 트레이닝 바지(Sweatpants) → sweatpants; 레깅스(Leggings) → leggings; 퀼로트(Culottes) → culottes; 반바지(Shorts) → shorts; 버뮤다 팬츠(Bermuda shorts) → bermuda shorts; 사이클 쇼츠(Cycling shorts) → cycling shorts; 펜슬 스커트(Pencil skirt) → pencil skirt; A라인 스커트(A-line skirt) → A-line skirt; 플리츠 스커트(Pleated skirt) → pleated skirt; 랩 스커트(Wrap skirt) → wrap skirt; 데님 스커트(Denim skirt) → denim skirt; 플레어 스커트(Flared skirt) → flared skirt; 맥시 스커트(Maxi skirt) → maxi skirt | — | bottom, 하의, 바지, 치마, pants, skirt |
| 409 | `person.clothing.bottoms.primary_color` | 하의 기본 색상 / Bottom primary color | 단일 · 색상 팔레트 + 사용자 정의 | `Bottom primary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.bottoms.type` ≠ none | bottom color, 하의 색, 하의 색상 |
| 410 | `person.clothing.bottoms.secondary_color` | 하의 보조 색상 / Bottom secondary color | 단일 · 색상 팔레트 + 사용자 정의 | `Bottom secondary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.bottoms.type` ≠ none | bottom accent color, 하의 보조색, 하의 포인트 색 |
| 411 | `person.clothing.bottoms.material` | 하의 소재 / Bottom material | 단일 · 검색 목록 + 사용자 정의 | `Bottom material: {value}.` | 소재 어휘(31, §3) | `clothing.bottoms.type` ≠ none | bottom material, 하의 소재, 하의 원단 |
| 412 | `person.clothing.bottoms.pattern` | 하의 패턴 / Bottom pattern | 단일 · 검색 목록 + 사용자 정의 | `Bottom pattern: {value}.` | 패턴 어휘(23, §3) | `clothing.bottoms.type` ≠ none | bottom pattern, 하의 무늬, 하의 패턴 |
| 413 | `person.clothing.bottoms.fit` | 하의 핏 / Bottom fit | 단일 · 칩 | `Bottom fit: {value}.` | 핏 어휘(6, §3) | `clothing.bottoms.type` ≠ none | bottom fit, 하의 핏 |
| 414 | `person.clothing.bottoms.waist_rise` | 하의 밑위 / Bottom waist rise | 단일 · 칩 | `Bottom waist rise: {value}.` | 로우라이즈(Low-rise) → low-rise; 미드라이즈(Mid-rise) → mid-rise; 하이라이즈(High-rise) → high-rise | `clothing.bottoms.type` ≠ none | rise, 밑위, 하이웨이스트 |
| 415 | `person.clothing.bottoms.leg_cut` | 하의 바지 통 / Bottom leg cut | 단일 · 칩 | `Bottom leg cut: {value}.` | 일자(Straight) → straight-leg; 테이퍼드(Tapered) → tapered; 와이드(Wide-leg) → wide-leg; 플레어(Flared) → flared; 부츠컷(Bootcut) → bootcut | `clothing.bottoms.type` ≠ none, `clothing.bottoms.type` ≠ straight_jeans/skinny_jeans/wide_jeans/flared_jeans/leggings/shorts/bermuda_shorts/cycling_shorts/pencil_skirt/a_line_skirt/pleated_skirt/wrap_skirt/denim_skirt/flared_skirt/maxi_skirt | leg cut, 바지 통, 부츠컷, 와이드 |
| 416 | `person.clothing.bottoms.hem_length` | 하의 기장 / Bottom hem length | 단일 · 칩 | `Bottom hem length: {value}.` | 짧은(Short) → short; 무릎 길이(Knee-length) → knee-length; 종아리 길이(Calf-length) → calf-length; 발목 길이(Ankle-length) → ankle-length; 전체 길이(Full-length) → full-length | `clothing.bottoms.type` ≠ none | hem length, 기장, 바지 길이, 치마 길이 |
| 417 | `person.clothing.bottoms.details` | 하의 디테일 / Bottom details | 다중 · 검색 목록 + 사용자 정의 | `Bottom details: {value}.` | 디테일 어휘(26, §3) | `clothing.bottoms.type` ≠ none | bottom details, 하의 디테일, 하의 장식 |

### 원피스 및 일체형 / One-piece garments (13) — `person_wardrobe_one_piece`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 418 | `person.clothing.one_piece.type` | 원피스 종류 / One-piece garment type | 단일 · 검색 목록 + 사용자 정의 | `One-piece garment: {value}.` | 없음(No one-piece garment) → no one-piece garment; 캐주얼 원피스(Casual dress) → casual dress; A라인 원피스(A-line dress) → A-line dress; 셔츠 원피스(Shirt dress) → shirt dress; 랩 원피스(Wrap dress) → wrap dress; 시스 드레스(Sheath dress) → sheath dress; 시프트 드레스(Shift dress) → shift dress; 슬립 드레스(Slip dress) → slip dress; 선드레스(Sundress) → sundress; 니트 원피스(Sweater dress) → sweater dress; 칵테일 드레스(Cocktail dress) → cocktail dress; 이브닝 가운(Evening gown) → evening gown; 볼 가운(Ball gown) → ball gown; 점프슈트(Jumpsuit) → jumpsuit; 롬퍼(Romper) → romper; 오버올(Overalls) → overalls; 던가리(Dungarees) → dungarees; 로브(Robe) → robe; 튜닉(Tunic) → tunic; 기모노(Kimono) → kimono; 한복(Hanbok) → hanbok; 치파오(Cheongsam) → cheongsam; 사리(Sari) → sari; 전통 의상(Traditional costume) → traditional costume | — | dress, one-piece, 원피스, 드레스, 점프슈트 |
| 419 | `person.clothing.one_piece.primary_color` | 원피스 기본 색상 / One-piece garment primary color | 단일 · 색상 팔레트 + 사용자 정의 | `One-piece garment primary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.one_piece.type` ≠ none | one-piece garment color, 원피스 색, 원피스 색상 |
| 420 | `person.clothing.one_piece.secondary_color` | 원피스 보조 색상 / One-piece garment secondary color | 단일 · 색상 팔레트 + 사용자 정의 | `One-piece garment secondary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.one_piece.type` ≠ none | one-piece garment accent color, 원피스 보조색, 원피스 포인트 색 |
| 421 | `person.clothing.one_piece.material` | 원피스 소재 / One-piece garment material | 단일 · 검색 목록 + 사용자 정의 | `One-piece garment material: {value}.` | 소재 어휘(31, §3) | `clothing.one_piece.type` ≠ none | one-piece garment material, 원피스 소재, 원피스 원단 |
| 422 | `person.clothing.one_piece.pattern` | 원피스 패턴 / One-piece garment pattern | 단일 · 검색 목록 + 사용자 정의 | `One-piece garment pattern: {value}.` | 패턴 어휘(23, §3) | `clothing.one_piece.type` ≠ none | one-piece garment pattern, 원피스 무늬, 원피스 패턴 |
| 423 | `person.clothing.one_piece.fit` | 원피스 핏 / One-piece garment fit | 단일 · 칩 | `One-piece garment fit: {value}.` | 핏 어휘(6, §3) | `clothing.one_piece.type` ≠ none | one-piece garment fit, 원피스 핏 |
| 424 | `person.clothing.one_piece.neckline` | 원피스 넥라인 / One-piece garment neckline | 단일 · 검색 목록 + 사용자 정의 | `One-piece garment neckline: {value}.` | 넥라인 어휘(13, §3) | `clothing.one_piece.type` ≠ none, `clothing.one_piece.type` ≠ overalls/dungarees | one-piece garment neckline, 원피스 넥라인, 원피스 목선 |
| 425 | `person.clothing.one_piece.sleeve_length` | 원피스 소매 길이 / One-piece garment sleeve length | 단일 · 칩 | `One-piece garment sleeve length: {value}.` | 소매 길이 어휘(7, §3) | `clothing.one_piece.type` ≠ none, `clothing.one_piece.type` ≠ overalls/dungarees | one-piece garment sleeve length, 원피스 소매 길이, 원피스 소매 |
| 426 | `person.clothing.one_piece.sleeve_style` | 원피스 소매 형태 / One-piece garment sleeve style | 단일 · 칩 + 사용자 정의 | `One-piece garment sleeve style: {value}.` | 소매 형태 어휘(10, §3) | `clothing.one_piece.type` ≠ none, `clothing.one_piece.type` ≠ overalls/dungarees | one-piece garment sleeve style, 원피스 소매 형태 |
| 427 | `person.clothing.one_piece.waist_design` | 원피스 허리 디자인 / One-piece waist design | 단일 · 칩 | `One-piece garment waist design: {value}.` | 자연 허리선(Natural waist) → natural waist; 엠파이어 라인(Empire waist) → empire waist; 드롭 웨이스트(Drop waist) → drop waist; 벨트 허리(Belted waist) → belted waist; 조인 허리(Cinched waist) → cinched waist; 허리선 없음(No defined waist) → no defined waist | `clothing.one_piece.type` ≠ none | waist design, 허리선, 엠파이어 |
| 428 | `person.clothing.one_piece.hem_length` | 원피스 기장 / One-piece hem length | 단일 · 칩 | `One-piece garment hem length: {value}.` | 미니(Mini) → mini-length; 무릎 위(Above-knee) → above-knee; 무릎 길이(Knee-length) → knee-length; 미디(Midi) → midi-length; 발목 길이(Ankle-length) → ankle-length; 바닥 길이(Floor-length) → floor-length | `clothing.one_piece.type` ≠ none | hem length, 기장, 미니, 미디, 맥시 |
| 429 | `person.clothing.one_piece.skirt_silhouette` | 원피스 스커트 실루엣 / One-piece skirt silhouette | 단일 · 칩 | `One-piece garment skirt silhouette: {value}.` | A라인(A-line) → A-line; 일자(Straight) → straight; 펜슬(Pencil) → pencil; 플레어(Flared) → flared; 풍성한(Full) → full; 머메이드(Mermaid) → mermaid; 티어드(Tiered) → tiered | `clothing.one_piece.type` ≠ none, `clothing.one_piece.type` ≠ jumpsuit/romper/overalls/dungarees | skirt silhouette, 스커트 라인, 머메이드 |
| 430 | `person.clothing.one_piece.details` | 원피스 디테일 / One-piece garment details | 다중 · 검색 목록 + 사용자 정의 | `One-piece garment details: {value}.` | 디테일 어휘(26, §3) | `clothing.one_piece.type` ≠ none | one-piece garment details, 원피스 디테일, 원피스 장식 |

### 아우터 / Outerwear (11) — `person_wardrobe_outerwear`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 431 | `person.clothing.outerwear.type` | 아우터 종류 / Outerwear type | 단일 · 검색 목록 + 사용자 정의 | `Outerwear: {value}.` | 없음(No outerwear) → no outerwear; 재킷(Jacket) → jacket; 데님 재킷(Denim jacket) → denim jacket; 가죽 재킷(Leather jacket) → leather jacket; 봄버 재킷(Bomber jacket) → bomber jacket; 바이커 재킷(Biker jacket) → biker jacket; 바시티 재킷(Varsity jacket) → varsity jacket; 플리스 재킷(Fleece jacket) → fleece jacket; 유틸리티 재킷(Utility jacket) → utility jacket; 패딩 재킷(Puffer jacket) → puffer jacket; 바람막이(Windbreaker) → windbreaker; 블레이저(Blazer) → blazer; 정장 재킷(Suit jacket) → suit jacket; 카디건(Cardigan) → cardigan; 트렌치코트(Trench coat) → trench coat; 오버코트(Overcoat) → overcoat; 피코트(Peacoat) → peacoat; 더플코트(Duffle coat) → duffle coat; 파카(Parka) → parka; 레인코트(Raincoat) → raincoat; 클로크(Cloak) → cloak; 케이프(Cape) → cape; 판초(Poncho) → poncho; 숄(Shawl) → shawl | — | outerwear, 아우터, 겉옷, 재킷, 코트, jacket, coat |
| 432 | `person.clothing.outerwear.primary_color` | 아우터 기본 색상 / Outerwear primary color | 단일 · 색상 팔레트 + 사용자 정의 | `Outerwear primary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.outerwear.type` ≠ none | outerwear color, 아우터 색, 아우터 색상 |
| 433 | `person.clothing.outerwear.secondary_color` | 아우터 보조 색상 / Outerwear secondary color | 단일 · 색상 팔레트 + 사용자 정의 | `Outerwear secondary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.outerwear.type` ≠ none | outerwear accent color, 아우터 보조색, 아우터 포인트 색 |
| 434 | `person.clothing.outerwear.material` | 아우터 소재 / Outerwear material | 단일 · 검색 목록 + 사용자 정의 | `Outerwear material: {value}.` | 소재 어휘(31, §3) | `clothing.outerwear.type` ≠ none | outerwear material, 아우터 소재, 아우터 원단 |
| 435 | `person.clothing.outerwear.pattern` | 아우터 패턴 / Outerwear pattern | 단일 · 검색 목록 + 사용자 정의 | `Outerwear pattern: {value}.` | 패턴 어휘(23, §3) | `clothing.outerwear.type` ≠ none | outerwear pattern, 아우터 무늬, 아우터 패턴 |
| 436 | `person.clothing.outerwear.fit` | 아우터 핏 / Outerwear fit | 단일 · 칩 | `Outerwear fit: {value}.` | 핏 어휘(6, §3) | `clothing.outerwear.type` ≠ none | outerwear fit, 아우터 핏 |
| 437 | `person.clothing.outerwear.length` | 아우터 기장 / Outerwear length | 단일 · 칩 | `Outerwear length: {value}.` | 크롭(Cropped) → cropped; 허리 길이(Waist-length) → waist-length; 엉덩이 길이(Hip-length) → hip-length; 허벅지 길이(Thigh-length) → thigh-length; 무릎 길이(Knee-length) → knee-length; 종아리 길이(Calf-length) → calf-length; 발목 길이(Ankle-length) → ankle-length | `clothing.outerwear.type` ≠ none | outerwear length, 아우터 기장, 롱코트 |
| 438 | `person.clothing.outerwear.closure_state` | 아우터 여밈 상태 / Outerwear closure state | 단일 · 칩 | `Outerwear closure: {value}.` | 열림(Open) → worn open; 일부 잠김(Partially closed) → partially closed; 잠김(Closed) → closed | `clothing.outerwear.type` ≠ none, `clothing.outerwear.type` ≠ poncho/shawl | open jacket, 여밈, 단추 풀린, 지퍼 올린 |
| 439 | `person.clothing.outerwear.closure_type` | 아우터 여밈 방식 / Outerwear closure type | 단일 · 칩 | `Outerwear closure type: {value}.` | 단추(Buttons) → buttons; 지퍼(Zipper) → zipper; 토글(Toggles) → toggles; 벨트(Belt) → belt; 스냅(Snaps) → snaps | `clothing.outerwear.type` ≠ none, `clothing.outerwear.type` ≠ poncho/shawl | closure type, 여밈 방식, 단추, 지퍼 |
| 440 | `person.clothing.outerwear.hood` | 아우터 후드 / Outerwear hood | 단일 · 칩 | `Outerwear hood: {value}.` | 후드 없음(No hood) → no hood; 후드 내림(Hood down) → hood down; 후드 씀(Hood up) → hood up | `clothing.outerwear.type` ≠ none, `clothing.outerwear.type` ≠ shawl | hood, 후드, 모자 달린 |
| 441 | `person.clothing.outerwear.details` | 아우터 디테일 / Outerwear details | 다중 · 검색 목록 + 사용자 정의 | `Outerwear details: {value}.` | 디테일 어휘(26, §3) | `clothing.outerwear.type` ≠ none | outerwear details, 아우터 디테일, 아우터 장식 |

### 내의 / Innerwear (4) — `person_wardrobe_innerwear`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 442 | `person.clothing.innerwear.type` | 이너웨어 종류 / Innerwear type | 단일 · 검색 목록 + 사용자 정의 | `Innerwear: {value}.` | 없음(No visible innerwear) → no visible innerwear; 언더셔츠(Undershirt) → undershirt; 베이스 레이어(Base layer) → base layer; 내복(Thermal underwear) → thermal underwear; 캐미솔(Camisole) → camisole; 스포츠 브라(Sports bra) → sports bra; 일상용 브라(Everyday bra) → everyday bra; 보정 이너웨어(Shapewear) → shapewear; 브리프(Briefs) → briefs; 드로즈(Boxer briefs) → boxer briefs; 트렁크(Boxer shorts) → boxer shorts; 풀커버리지 하의(Full-coverage underwear) → full-coverage underwear | — | innerwear, 이너웨어, 내의, 내복 |
| 443 | `person.clothing.innerwear.primary_color` | 이너웨어 기본 색상 / Innerwear primary color | 단일 · 색상 팔레트 + 사용자 정의 | `Innerwear primary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.innerwear.type` ≠ none | innerwear color, 이너웨어 색, 이너웨어 색상 |
| 444 | `person.clothing.innerwear.material` | 이너웨어 소재 / Innerwear material | 단일 · 검색 목록 + 사용자 정의 | `Innerwear material: {value}.` | 소재 어휘(31, §3) | `clothing.innerwear.type` ≠ none | innerwear material, 이너웨어 소재, 이너웨어 원단 |
| 445 | `person.clothing.innerwear.pattern` | 이너웨어 패턴 / Innerwear pattern | 단일 · 검색 목록 + 사용자 정의 | `Innerwear pattern: {value}.` | 패턴 어휘(23, §3) | `clothing.innerwear.type` ≠ none | innerwear pattern, 이너웨어 무늬, 이너웨어 패턴 |

### 신발 / Footwear (8) — `person_wardrobe_footwear`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 446 | `person.clothing.footwear.type` | 신발 종류 / Footwear type | 단일 · 검색 목록 + 사용자 정의 | `Footwear: {value}.` | 없음(No footwear) → no footwear; 스니커즈(Sneakers) → sneakers; 러닝화(Running shoes) → running shoes; 하이탑 스니커즈(High-top sneakers) → high-top sneakers; 캔버스화(Canvas shoes) → canvas shoes; 로퍼(Loafers) → loafers; 옥스퍼드화(Oxford shoes) → oxford shoes; 더비 슈즈(Derby shoes) → derby shoes; 브로그(Brogues) → brogues; 정장 구두(Dress shoes) → dress shoes; 플랫 슈즈(Ballet flats) → ballet flats; 메리제인(Mary Janes) → Mary Jane shoes; 펌프스(Pumps) → pumps; 플랫폼 슈즈(Platform shoes) → platform shoes; 클로그(Clogs) → clogs; 앵클 부츠(Ankle boots) → ankle boots; 첼시 부츠(Chelsea boots) → chelsea boots; 니하이 부츠(Knee-high boots) → knee-high boots; 컴뱃 부츠(Combat boots) → combat boots; 등산화(Hiking boots) → hiking boots; 카우보이 부츠(Cowboy boots) → cowboy boots; 샌들(Sandals) → sandals; 스트랩 샌들(Strappy sandals) → strappy sandals; 슬라이드(Slides) → slide sandals; 플립플롭(Flip-flops) → flip-flops; 실내화(Slippers) → slippers | — | footwear, shoes, 신발, 구두, 운동화 |
| 447 | `person.clothing.footwear.primary_color` | 신발 기본 색상 / Footwear primary color | 단일 · 색상 팔레트 + 사용자 정의 | `Footwear primary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.footwear.type` ≠ none | footwear color, 신발 색, 신발 색상 |
| 448 | `person.clothing.footwear.secondary_color` | 신발 보조 색상 / Footwear secondary color | 단일 · 색상 팔레트 + 사용자 정의 | `Footwear secondary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.footwear.type` ≠ none | footwear accent color, 신발 보조색, 신발 포인트 색 |
| 449 | `person.clothing.footwear.material` | 신발 소재 / Footwear material | 단일 · 검색 목록 + 사용자 정의 | `Footwear material: {value}.` | 소재 어휘(31, §3) | `clothing.footwear.type` ≠ none | footwear material, 신발 소재, 신발 원단 |
| 450 | `person.clothing.footwear.heel_height` | 신발 굽 높이 / Footwear heel height | 단일 · 칩 | `Footwear heel height: {value}.` | 플랫(Flat) → flat; 낮은 굽(Low) → low-heeled; 중간 굽(Medium) → medium-heeled; 높은 굽(High) → high-heeled | `clothing.footwear.type` ≠ none | heel height, 굽 높이, 굽, 힐 |
| 451 | `person.clothing.footwear.heel_type` | 신발 굽 형태 / Footwear heel type | 단일 · 칩 | `Footwear heel type: {value}.` | 블록 힐(Block heel) → block heel; 웨지 힐(Wedge heel) → wedge heel; 스틸레토 힐(Stiletto heel) → stiletto heel; 플랫폼(Platform) → platform | `clothing.footwear.type` ≠ none, `clothing.footwear.heel_height` ≠ flat | heel type, 굽 형태, 웨지, 스틸레토 |
| 452 | `person.clothing.footwear.toe_shape` | 신발 앞코 형태 / Footwear toe shape | 단일 · 칩 | `Footwear toe shape: {value}.` | 라운드 토(Rounded) → rounded toe; 포인티드 토(Pointed) → pointed toe; 스퀘어 토(Square) → square toe; 오픈 토(Open toe) → open toe | `clothing.footwear.type` ≠ none | toe shape, 앞코, 뾰족코 |
| 453 | `person.clothing.footwear.closure` | 신발 여밈 방식 / Footwear closure | 단일 · 칩 | `Footwear closure: {value}.` | 끈(Lace-up) → lace-up; 슬립온(Slip-on) → slip-on; 버클(Buckle) → buckle; 지퍼(Zipper) → zipper; 스트랩(Strap) → strap | `clothing.footwear.type` ≠ none | shoe closure, 끈, 벨크로, 슬립온 |

### 양말 및 스타킹 / Socks & hosiery (6) — `person_wardrobe_hosiery`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 454 | `person.clothing.hosiery.type` | 양말·스타킹 종류 / Hosiery type | 단일 · 검색 목록 + 사용자 정의 | `Hosiery: {value}.` | 없음(No socks or hosiery) → no socks or hosiery; 덧신 양말(No-show socks) → no-show socks; 발목 양말(Ankle socks) → ankle socks; 크루 양말(Crew socks) → crew socks; 종아리 양말(Mid-calf socks) → mid-calf socks; 니삭스(Knee-high socks) → knee-high socks; 오버니삭스(Over-the-knee socks) → over-the-knee socks; 압박 양말(Compression socks) → compression socks; 타이츠(Tights) → tights; 불투명 타이츠(Opaque tights) → opaque tights; 비침 타이츠(Sheer tights) → sheer tights; 스타킹(Stockings) → stockings; 레그 워머(Leg warmers) → leg warmers | — | socks, hosiery, 양말, 스타킹, 타이츠 |
| 455 | `person.clothing.hosiery.primary_color` | 양말·스타킹 기본 색상 / Hosiery primary color | 단일 · 색상 팔레트 + 사용자 정의 | `Hosiery primary color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `clothing.hosiery.type` ≠ none | hosiery color, 양말·스타킹 색, 양말·스타킹 색상 |
| 456 | `person.clothing.hosiery.pattern` | 양말·스타킹 패턴 / Hosiery pattern | 단일 · 검색 목록 + 사용자 정의 | `Hosiery pattern: {value}.` | 패턴 어휘(23, §3) | `clothing.hosiery.type` ≠ none | hosiery pattern, 양말·스타킹 무늬, 양말·스타킹 패턴 |
| 457 | `person.clothing.hosiery.length` | 양말·스타킹 길이 / Hosiery length | 단일 · 칩 | `Hosiery length: {value}.` | 발목(Ankle) → ankle-length; 종아리 중간(Mid-calf) → mid-calf; 무릎(Knee-high) → knee-high; 무릎 위(Over-the-knee) → over-the-knee; 허벅지(Thigh-high) → thigh-high; 허리(Waist-high) → waist-high | `clothing.hosiery.type` ≠ none, `clothing.hosiery.type` ≠ no_show/ankle/crew/mid_calf/knee_high/over_the_knee/tights/opaque_tights/sheer_tights | sock length, 양말 길이, 스타킹 길이 |
| 458 | `person.clothing.hosiery.opacity` | 스타킹 비침 정도 / Hosiery opacity | 단일 · 칩 | `Hosiery opacity: {value}.` | 비침(Sheer) → sheer; 반투명(Semi-opaque) → semi-opaque; 불투명(Opaque) → opaque | `clothing.hosiery.type` ≠ none, `clothing.hosiery.type` ∈ tights/opaque_tights/sheer_tights/stockings | opacity, 비침, 불투명 |
| 459 | `person.clothing.hosiery.thickness` | 양말·스타킹 두께 / Hosiery thickness | 상대 슬라이더 (1–5) | `Hosiery thickness: {value}.` | 1 아주 얇음(Very thin) → very thin; 2 얇음(Thin) → thin; 3 보통(Medium) → medium thickness; 4 두꺼움(Thick) → thick; 5 아주 두꺼움(Very thick) → very thick | `clothing.hosiery.type` ≠ none | thickness, 두께, 도톰한 양말 |

## 3. 공통 어휘

### 의상 색상 팔레트 (55색 · 10그룹) — 의상 색상 속성과 안경테·모자 색상이 공유

| 그룹 | 색상(프롬프트 표현) |
|---|---|
| 뉴트럴 / Neutrals | 화이트(white), 오프화이트(off-white), 아이보리(ivory), 크림(cream), 베이지(beige), 토프(taupe), 그레이(gray), 차콜(charcoal), 블랙(black) |
| 브라운 / Browns | 탄(tan), 카멜(camel), 카키(khaki), 연갈색(light brown), 초콜릿 브라운(chocolate brown), 다크 브라운(dark brown) |
| 레드 / Reds | 레드(red), 크림슨(crimson), 버건디(burgundy), 와인(wine red), 벽돌색(brick red) |
| 핑크 / Pinks | 연핑크(pale pink), 더스티 핑크(dusty pink), 로즈 핑크(rose pink), 핫핑크(hot pink) |
| 오렌지 / Oranges | 오렌지(orange), 피치(peach), 코랄(coral), 러스트(rust), 테라코타(terracotta) |
| 옐로 / Yellows | 옐로(yellow), 머스터드(mustard), 골든 옐로(golden yellow), 연노랑(pale yellow) |
| 그린 / Greens | 올리브(olive), 모스 그린(moss green), 포레스트 그린(forest green), 세이지 그린(sage green), 민트(mint), 에메랄드(emerald) |
| 블루 / Blues | 스카이 블루(sky blue), 연파랑(light blue), 로열 블루(royal blue), 네이비(navy), 틸(teal), 터콰이즈(turquoise) |
| 퍼플 / Purples | 라벤더(lavender), 라일락(lilac), 바이올렛(violet), 퍼플(purple), 플럼(plum) |
| 메탈릭 / Metallics | 골드(gold), 실버(silver), 브론즈(bronze), 코퍼(copper), 로즈 골드(rose gold) |

### 소재·패턴·넥라인·칼라·소매·디테일·핏

| 어휘 | 선택지(프롬프트 표현) |
|---|---|
| 소재 | 면(cotton), 린넨(linen), 울(wool), 캐시미어(cashmere), 실크(silk), 새틴(satin), 벨벳(velvet), 데님(denim), 가죽(leather), 스웨이드(suede), 인조 가죽(faux leather), 폴리에스터(polyester), 나일론(nylon), 레이온(rayon), 비스코스(viscose), 시폰(chiffon), 오간자(organza), 레이스(lace), 메시(mesh), 저지(jersey), 니트 원단(knit fabric), 플리스(fleece), 캔버스(canvas), 코듀로이(corduroy), 트위드(tweed), 브로케이드(brocade), 자카드(jacquard), 스팽글 원단(sequin fabric), 메탈릭 원단(metallic fabric), 고무(rubber), 방수 원단(waterproof fabric) |
| 패턴 | 단색(solid color), 가로 줄무늬(horizontal stripes), 세로 줄무늬(vertical stripes), 핀스트라이프(pinstripes), 플래드(plaid), 깅엄(gingham), 타탄(tartan), 하운드투스(houndstooth), 물방울무늬(polka dots), 꽃무늬(floral), 식물 무늬(botanical), 페이즐리(paisley), 기하학 무늬(geometric), 추상 무늬(abstract), 카무플라주(camouflage), 애니멀 프린트(animal print), 체커보드(checkered), 아가일(argyle), 셰브론(chevron), 컬러 블록(color-blocked), 타이다이(tie-dye), 그라데이션(gradient), 그래픽 프린트(graphic print) |
| 넥라인 | 라운드넥(crew neck), 브이넥(V-neck), 스쿱넥(scoop neck), 스퀘어넥(square neck), 보트넥(boat neck), 하이넥(high neck), 터틀넥(turtleneck), 모크넥(mock neck), 홀터넥(halter neck), 스위트하트 넥라인(sweetheart neckline), 카울넥(cowl neck), 오프숄더(off-the-shoulder neckline), 비대칭 넥라인(asymmetric neckline) |
| 칼라 | 칼라 없음(no collar), 포인트 칼라(point collar), 스프레드 칼라(spread collar), 버튼다운 칼라(button-down collar), 차이나 칼라(mandarin collar), 스탠드 칼라(stand collar), 피터팬 칼라(Peter Pan collar), 세일러 칼라(sailor collar), 숄 칼라(shawl collar), 노치드 라펠(notched lapel), 피크드 라펠(peak lapel) |
| 소매 길이 | 민소매(sleeveless), 캡 소매(cap sleeves), 반소매(short sleeves), 팔꿈치 길이(elbow-length sleeves), 7부 소매(three-quarter sleeves), 긴소매(long sleeves), 아주 긴 소매(extra-long sleeves) |
| 소매 형태 | 일자 소매(straight sleeves), 피트 소매(fitted sleeves), 걷어 올린 소매(rolled-up sleeves), 퍼프 소매(puff sleeves), 벌룬 소매(balloon sleeves), 벨 소매(bell sleeves), 비숍 소매(bishop sleeves), 래글런 소매(raglan sleeves), 배트윙 소매(batwing sleeves), 플레어 소매(flared sleeves) |
| 디테일 | 단추(buttons), 장식 단추(decorative buttons), 지퍼(zippers), 주머니(pockets), 패치 포켓(patch pockets), 벨트 허리(belted waist), 스트링(drawstrings), 주름(pleats), 러플(ruffles), 프릴(frills), 자수(embroidery), 레이스 트림(lace trim), 대비 스티치(contrast stitching), 장식 스티치(decorative stitching), 금속 장식(metal hardware), 스터드(studs), 리벳(rivets), 비즈 장식(beading), 스팽글(sequins), 아플리케(appliqué), 프린지(fringe), 태슬(tassels), 트임(slits), 비대칭 밑단(asymmetric hem), 디스트레스드(distressed detailing), 레이어드 원단(layered fabric) |
| 핏 | 몸에 딱 붙는(tight-fitting), 슬림 핏(slim-fit), 레귤러 핏(regular-fit), 릴랙스 핏(relaxed-fit), 루즈 핏(loose-fitting), 오버사이즈(oversized) |

소재는 광택·투명도를 함께 정하지 않습니다. 디테일은 다중 선택입니다.

## 4. 충돌 안내 (비차단, 값 자동 변경 없음)

| 규칙 ID | 관련 속성 | 안내 문구 |
|---|---|---|
| `clothing-hosiery-opaque-tights-vs-opacity` | `person.clothing.hosiery.type`, `person.clothing.hosiery.opacity` | 불투명 타이츠인데 비침 정도가 비치는 쪽으로 설정되었습니다. |
| `clothing-hosiery-sheer-tights-vs-opacity` | `person.clothing.hosiery.type`, `person.clothing.hosiery.opacity` | 비침 타이츠인데 비침 정도가 불투명으로 설정되었습니다. |

## 5. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았습니다.

## 6. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.5) | Sprint 2-B.5 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
