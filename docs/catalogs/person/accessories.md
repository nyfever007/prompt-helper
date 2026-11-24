# 액세서리 (Accessories) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.5 개발 승인서(2-B.5C)의 초기 제품 카탈로그
- 구현: `src/domain/catalog/catalogs/person/accessories.ts` (core 카탈로그 0.8.0), 카테고리 `person_accessories` (단일 화면, 18개 속성)
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md)

## 1. 설계 목적과 원칙

- 각 종류에 명시적인 “없음”이 있으며 미설정과 구분됩니다(“Earrings: none.”). 안경테 형태는 안경의 속성이라 “없음”을 따로 두지 않았습니다.
- 함께 착용할 수 있는 액세서리(헤어 액세서리·귀걸이·목걸이·팔찌·반지·피어싱·장식 소품)는 다중 선택이며, “없음”을 다른 항목과 함께 고르면 비차단 경고를 표시합니다.
- **안경 없음**이면 안경테 형태·색상, **모자 없음**이면 모자 색상의 출력을 억제합니다(값 보존, 다시 착용하면 출력).
- 다른 액세서리를 자동 추가하지 않습니다. 성별·직업·국적·사회적 지위로 착용을 제한하지 않으며, 실제 상표·브랜드를 만들지 않습니다.
- 모든 종류는 사용자 정의 입력을 지원합니다. 좌우 개별 설정, 액세서리별 반복 객체, 복잡한 소재·보석 설정은 후속 확장입니다.
- 안경테·모자 색상은 공통 의상 색상 팔레트(55색, [wardrobe.md](wardrobe.md) §3)를 씁니다.

## 2. 속성 목록 (18)

### 액세서리 / Accessories (18) — `person_accessories`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 460 | `person.accessories.eyewear` | 안경 / Eyewear | 단일 · 칩 + 사용자 정의 | `Eyewear: {value}.` | 없음(None) → none; 안경(Eyeglasses) → eyeglasses; 선글라스(Sunglasses) → sunglasses; 돋보기안경(Reading glasses) → reading glasses; 보호 고글(Protective goggles) → protective goggles; 패션 고글(Fashion goggles) → fashion goggles; 외알 안경(Monocle) → monocle | — | glasses, eyewear, 안경, 선글라스, 고글 |
| 461 | `person.accessories.frame_shape` | 안경테 형태 / Frame shape | 단일 · 칩 + 사용자 정의 | `Eyewear frame shape: {value}.` | 둥근(Round) → round frames; 타원(Oval) → oval frames; 직사각(Rectangular) → rectangular frames; 사각(Square) → square frames; 캣아이(Cat-eye) → cat-eye frames; 보잉(Aviator) → aviator frames; 하금테(Browline) → browline frames; 무테(Rimless) → rimless frames; 기하학(Geometric) → geometric frames | `accessories.eyewear` ≠ none | frame shape, 안경테, 뿔테, 무테 |
| 462 | `person.accessories.frame_color` | 안경테 색상 / Frame color | 단일 · 색상 팔레트 + 사용자 정의 | `Eyewear frame color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `accessories.eyewear` ≠ none | frame color, 안경테 색 |
| 463 | `person.accessories.hat` | 모자 / Hat | 단일 · 검색 목록 + 사용자 정의 | `Hat: {value}.` | 없음(None) → none; 야구 모자(Baseball cap) → baseball cap; 헌팅캡(Flat cap) → flat cap; 비니(Beanie) → beanie; 베레모(Beret) → beret; 페도라(Fedora) → fedora; 버킷햇(Bucket hat) → bucket hat; 밀짚모자(Straw hat) → straw hat; 챙 넓은 모자(Sun hat) → sun hat; 카우보이모자(Cowboy hat) → cowboy hat; 실크햇(Top hat) → top hat; 볼러햇(Bowler hat) → bowler hat; 보닛(Bonnet) → bonnet; 머릿수건(Headscarf) → headscarf | — | hat, cap, 모자, 캡, 비니 |
| 464 | `person.accessories.hat_color` | 모자 색상 / Hat color | 단일 · 색상 팔레트 + 사용자 정의 | `Hat color: {value}.` | 공통 의상 색상 팔레트(55색 · 10그룹, 의상 §3) | `accessories.hat` ≠ none | hat color, 모자 색 |
| 465 | `person.accessories.hair_accessories` | 헤어 액세서리 / Hair accessories | 다중 · 칩 + 사용자 정의 | `Hair accessories: {value}.` | 없음(None) → none; 실핀(Hairpin) → hairpin; 바레트(Barrette) → barrette; 헤어핀(Hair clip) → hair clip; 집게핀(Claw clip) → claw clip; 머리띠(Headband) → headband; 헤어 리본(Hair ribbon) → hair ribbon; 곱창 밴드(Scrunchie) → scrunchie; 장식 빗(Decorative hair comb) → decorative hair comb; 꽃 장식(Floral hair accessory) → floral hair accessory | — | hair accessory, 헤어 액세서리, 머리핀, 머리띠, 곱창 |
| 466 | `person.accessories.earrings` | 귀걸이 / Earrings | 다중 · 칩 + 사용자 정의 | `Earrings: {value}.` | 없음(None) → none; 스터드(Stud earrings) → stud earrings; 링 귀걸이(Hoop earrings) → hoop earrings; 드롭 귀걸이(Drop earrings) → drop earrings; 댕글 귀걸이(Dangle earrings) → dangle earrings; 샹들리에 귀걸이(Chandelier earrings) → chandelier earrings; 이어 커프(Ear cuffs) → ear cuffs | — | earrings, 귀걸이, 이어링 |
| 467 | `person.accessories.necklace` | 목걸이 / Necklace | 다중 · 칩 + 사용자 정의 | `Necklace: {value}.` | 없음(None) → none; 체인 목걸이(Chain necklace) → chain necklace; 펜던트 목걸이(Pendant necklace) → pendant necklace; 초커(Choker) → choker; 진주 목걸이(Pearl necklace) → pearl necklace; 비즈 목걸이(Beaded necklace) → beaded necklace; 레이어드 목걸이(Layered necklaces) → layered necklaces; 로켓 목걸이(Locket) → locket | — | necklace, 목걸이, 펜던트 |
| 468 | `person.accessories.bracelets` | 팔찌 / Bracelets | 다중 · 칩 + 사용자 정의 | `Bracelets: {value}.` | 없음(None) → none; 체인 팔찌(Chain bracelet) → chain bracelet; 뱅글(Bangle) → bangle; 커프 팔찌(Cuff bracelet) → cuff bracelet; 비즈 팔찌(Beaded bracelet) → beaded bracelet; 가죽 팔찌(Leather bracelet) → leather bracelet; 참 팔찌(Charm bracelet) → charm bracelet | — | bracelet, 팔찌, 뱅글 |
| 469 | `person.accessories.rings` | 반지 / Rings | 다중 · 칩 + 사용자 정의 | `Rings: {value}.` | 없음(None) → none; 심플 반지(Simple ring) → simple ring; 보석 반지(Gemstone ring) → gemstone ring; 시그넷 반지(Signet ring) → signet ring; 밴드 반지(Band ring) → band ring; 여러 개의 반지(Multiple rings) → multiple rings | — | ring, 반지, 링 |
| 470 | `person.accessories.watch` | 시계 / Watch | 단일 · 칩 + 사용자 정의 | `Watch: {value}.` | 없음(None) → none; 아날로그 손목시계(Analog wristwatch) → analog wristwatch; 디지털 손목시계(Digital wristwatch) → digital wristwatch; 스마트워치(Smartwatch) → smartwatch; 회중시계(Pocket watch) → pocket watch | — | watch, 시계, 손목시계 |
| 471 | `person.accessories.belt` | 벨트 / Belt | 단일 · 칩 + 사용자 정의 | `Belt: {value}.` | 없음(None) → none; 가죽 벨트(Leather belt) → leather belt; 천 벨트(Fabric belt) → fabric belt; 꼬임 벨트(Woven belt) → woven belt; 장식 벨트(Decorative belt) → decorative belt; 체인 벨트(Chain belt) → chain belt | — | belt, 벨트, 허리띠 |
| 472 | `person.accessories.bag` | 가방 / Bag | 단일 · 검색 목록 + 사용자 정의 | `Bag: {value}.` | 없음(None) → none; 백팩(Backpack) → backpack; 숄더백(Shoulder bag) → shoulder bag; 크로스백(Crossbody bag) → crossbody bag; 토트백(Tote bag) → tote bag; 클러치(Clutch bag) → clutch bag; 메신저백(Messenger bag) → messenger bag; 서류 가방(Briefcase) → briefcase; 새철백(Satchel) → satchel; 힙색(Waist bag) → waist bag; 핸드백(Handbag) → handbag | — | bag, 가방, 백팩, 핸드백 |
| 473 | `person.accessories.scarf` | 스카프·머플러 / Scarf | 단일 · 칩 + 사용자 정의 | `Scarf: {value}.` | 없음(None) → none; 실크 스카프(Silk scarf) → silk scarf; 니트 머플러(Knitted scarf) → knitted scarf; 울 머플러(Wool scarf) → wool scarf; 넥 스카프(Neck scarf) → neck scarf; 숄(Shawl) → shawl; 반다나(Bandana) → bandana | — | scarf, 스카프, 머플러, 목도리 |
| 474 | `person.accessories.gloves` | 장갑 / Gloves | 단일 · 칩 + 사용자 정의 | `Gloves: {value}.` | 없음(None) → none; 가죽 장갑(Leather gloves) → leather gloves; 니트 장갑(Knitted gloves) → knitted gloves; 드레스 장갑(Dress gloves) → dress gloves; 손가락 없는 장갑(Fingerless gloves) → fingerless gloves; 벙어리장갑(Mittens) → mittens | — | gloves, 장갑, 벙어리장갑 |
| 475 | `person.accessories.necktie` | 넥타이 / Necktie | 단일 · 칩 + 사용자 정의 | `Neckwear: {value}.` | 없음(None) → none; 넥타이(Necktie) → necktie; 나비넥타이(Bow tie) → bow tie; 볼로 타이(Bolo tie) → bolo tie; 크라바트(Cravat) → cravat | — | tie, necktie, 넥타이, 나비넥타이 |
| 476 | `person.accessories.piercings` | 피어싱 / Piercings | 다중 · 칩 + 사용자 정의 | `Piercings: {value}.` | 없음(None) → none; 귀 피어싱(Ear piercing) → ear piercing; 코 스터드(Nose stud) → nose stud; 코걸이(Nose ring) → nose ring; 셉텀 피어싱(Septum piercing) → septum piercing; 눈썹 피어싱(Eyebrow piercing) → eyebrow piercing; 입술 피어싱(Lip piercing) → lip piercing | — | piercing, 피어싱 |
| 477 | `person.accessories.decorative` | 장식 소품 / Decorative accessories | 다중 · 칩 + 사용자 정의 | `Decorative accessories: {value}.` | 없음(None) → none; 브로치(Brooch) → brooch; 라펠 핀(Lapel pin) → lapel pin; 배지(Badge) → badge; 커프스 단추(Cufflinks) → cufflinks; 포켓 스퀘어(Pocket square) → pocket square; 장식 체인(Decorative chain) → decorative chain | — | brooch, decorative, 브로치, 장식, 커프스 |

## 3. 충돌 안내 (비차단, 값 자동 변경 없음)

| 규칙 ID | 관련 속성 | 안내 문구 |
|---|---|---|
| `accessories-hair-accessories-none-with-others` | `person.accessories.hair_accessories` | ‘없음’(헤어 액세서리)이 다른 항목과 함께 선택되었습니다. |
| `accessories-earrings-none-with-others` | `person.accessories.earrings` | ‘없음’(귀걸이)이 다른 항목과 함께 선택되었습니다. |
| `accessories-necklace-none-with-others` | `person.accessories.necklace` | ‘없음’(목걸이)이 다른 항목과 함께 선택되었습니다. |
| `accessories-bracelets-none-with-others` | `person.accessories.bracelets` | ‘없음’(팔찌)이 다른 항목과 함께 선택되었습니다. |
| `accessories-rings-none-with-others` | `person.accessories.rings` | ‘없음’(반지)이 다른 항목과 함께 선택되었습니다. |
| `accessories-piercings-none-with-others` | `person.accessories.piercings` | ‘없음’(피어싱)이 다른 항목과 함께 선택되었습니다. |
| `accessories-decorative-none-with-others` | `person.accessories.decorative` | ‘없음’(장식 소품)이 다른 항목과 함께 선택되었습니다. |

## 4. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.5) | Sprint 2-B.5 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
