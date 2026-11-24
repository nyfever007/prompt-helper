# Sprint 2-B.5 보고서 — 표정·인상·메이크업·의상·액세서리

- 상태: **구현 완료, 검토 대기** — 커밋 `72ad922`, [PR #7](https://github.com/nyfever007/prompt-helper/pull/7), CI 통과(push·pull_request). 병합하지 않음
- 브랜치: `feature/sprint-2b5-expression-clothing` (기준 main `12a17ab`)
- 내부 단계: 2-B.5A(표정·인상·매력·메이크업) → 2-B.5B(의상) → 2-B.5C(액세서리). 단계마다 관련 테스트를 실행했고 중간 승인 없이 진행했습니다.
- 로컬 전체 검증: `pnpm verify` **종료 코드 0** — 단위·컴포넌트 684개 통과(32개 파일), 격리 검증 통과, E2E 53 통과 / 1 skip
- CI: push run 45378407495 · pull_request run 45378419729 모두 success — 32개 파일 통과, 격리 검증 통과, E2E 53 통과 / 1 skip

## 1. 구현 결과

| 영역 | 하위 분류 | 속성 | 선택지 | 비고 |
|---|---|---|---|---|
| 표정 및 시각적 인상 | 표정 | 10 | 81 (인상 포함) | 감정 강도·얼굴 긴장도는 5단계 슬라이더 |
| | 인상 및 매력 | 8 | | 귀여움·우아함·카리스마·중성적 인상은 5단계 슬라이더 |
| 메이크업 | (단일 화면) | 16 | 226 | 메이크업 팔레트 40색 · 8그룹 (색상 속성 4개 공유) |
| 의상 | 전체 설정 8 · 상의 12 · 하의 10 · 원피스 및 일체형 13 · 아우터 11 · 내의 4 · 신발 8 · 양말 및 스타킹 6 | 72 | 1,478 | 의복 종류 140개(+ 각 카테고리 “없음”), 의상 팔레트 55색 · 10그룹 |
| 액세서리 | (단일 화면) | 18 | 232 | 안경테·모자 색상은 의상 팔레트 공유 |
| **합계** | 카테고리 4개 + 하위 분류 10개 | **124** | **2,017** (속성별 중복 포함) | 경고 규칙 15개 |

- **누적 인물 상세 속성 277개**(인물 기본 정보 16 + 얼굴 47 + 피부·헤어·수염 45 + 신체 45 + 이번 124)
- 형태: 단일 94 · 다중 21 · 슬라이더 9. 사용자 정의 값 지원 68개 속성. 적용 조건이 있는 속성 75개.
- 모든 속성은 Direct 역할이며 출력 토글을 지원하고 1인 피사체(또는 피사체 미선택)에 적용됩니다. 자세 및 행동(`person_pose`)은 DRAFT로 남겼습니다.
- 버전: 핵심 카탈로그만 0.7.0 → **0.8.0**(속성 추가만, ID 변경 없음, 마이그레이션 `changes: []`). ImageSpec 0.3.0 · 카탈로그 형식 0.4.0 · 컴파일러 0.4.0 · 안전 정책 0.2.0 그대로이며 스키마 변경은 없습니다. 출력 순서는 354–477이고 비인물 속성 번호는 그대로입니다.
- ID 영역: `person.expression.*`, `person.impression.*`, `person.makeup.*`, `person.clothing.*`(전체 설정), `person.clothing.<tops|bottoms|one_piece|outerwear|innerwear|footwear|hosiery>.*`, `person.accessories.*`
- 설계 문서: `docs/catalogs/person/{expression,makeup,wardrobe,accessories}.md` 1.0.0 APPROVED(표는 카탈로그 데이터에서 생성)

### 적용 조건 (값은 보존, 다시 적용되면 출력)

| 조건 | 억제되는 속성 |
|---|---|
| 메이크업 “없음” | 다른 메이크업 15개 (미설정이면 모두 사용 가능) |
| 아이라인 “없음” | 아이라인 색상 |
| 의복 종류 “없음” | 해당 의복의 세부만 (다른 의복·전체 설정은 그대로) |
| 민소매 상의(탱크톱·민소매·캐미솔·조끼) | 상의 소매 길이·형태 |
| 스커트·반바지·레깅스·통이 이름에 있는 청바지 | 하의 바지 통 |
| 점프슈트·롬퍼·오버올·던가리 / 오버올·던가리 | 스커트 실루엣 / 넥라인·소매 |
| 판초·숄 / 숄 | 여밈 상태·방식 / 후드 |
| 굽 높이 “플랫” | 굽 형태 |
| 길이가 이름에 있는 양말·타이츠 / 타이츠·스타킹이 아닌 종류 | 양말 길이 / 비침 정도 |
| 안경 “없음” / 모자 “없음” | 안경테 형태·색상 / 모자 색상 |

### 경고 규칙 15개 (비차단, 값 자동 변경 없음)

미소 없음 + 다른 미소, 옅은·부드러운 미소 + 활짝 웃는(2), 입 다문 + 입 벌린 미소, 입 다묾 + 치아 보임, 눈 감음 + 시선 상태, 불투명 타이츠 + 비침, 비침 타이츠 + 불투명, 액세서리 ‘없음’ + 다른 항목(헤어 액세서리·귀걸이·목걸이·팔찌·반지·피어싱·장식 소품). 원피스 + 상의·하의, 레이어링 조합은 진단하지 않습니다.

## 2. 공통 기능 재사용

새 UI 컴포넌트나 스키마 없이 기존 기능만 사용했습니다.

| 공통 기능 | 사용처 |
|---|---|
| 하위 카테고리 탐색·설정 개수, 상위 카테고리 초기화·복원 | 표정 2개, 의상 8개 하위 분류 (상위 “의상” 초기화는 모든 의복이 대상) |
| `degree` 슬라이더(구간 이름만 표시, 표시 위치 미저장) | 슬라이더 9개 |
| 색상 팔레트 + 표시 그룹(ADR-051) | 메이크업 색상 4개, 의상 색상 13개, 안경테·모자 색상 |
| 검색 목록 + 표시 그룹 | 감정, 메이크업 스타일, 패션 스타일, 시대, 의복 종류 7개, 소재, 패턴, 넥라인, 디테일, 모자, 가방 |
| 칩 + 사용자 정의 값(이름 + 표현) | 68개 속성 |
| `noneOf`/`anyOf` + `whenUnset: "pass"` 적용 조건, 비활성 값 보존·안내 | 75개 속성 |
| `noneWithOthers`·`opposite` 규칙 도우미 | 경고 규칙 |
| 출력 토글, JSON 왕복, 출처, 모바일 Detailed Editor, 안전 정책·연령 판단 | 124개 전부 |
| 데이터 도우미(`person/builders.ts`) | 세 파일 모두. 의상은 의복별 속성을 만드는 작은 데이터 함수(`clothing.ts`)를 추가 |

## 3. 초기 설계 대비 변경 사항 (개발 중 판단 — 승인서 §15 권한)

| 항목 | 내용 | 이유 |
|---|---|---|
| 의복 “없음” 문구 | “no separate top garment”, “no separate bottom garment”, “no one-piece garment”, “no outerwear”, “no visible innerwear”, “no footwear”, “no socks or hosiery” | “Top: none.”은 상의 탈의로 읽힐 수 있음. 해당 의복의 부재만 뜻하도록 중립 문구 사용(§8 “나체 표현으로 변환하지 않음”) |
| 액세서리 “없음” 문구 | “Earrings: none.” 형식 | 기존 ‘없음’ 출력 방식과 동일 |
| 의복별 세부 적용 범위 | §1 적용 조건 표 | 승인서 §7 “의미가 있는 속성만 적용” |
| 의상 문장 틀 | “Top primary color: …”, “Footwear material: …” 등 의복 이름으로 시작 | 다른 의복의 특징으로 읽히지 않도록(§10). 승인 예시 “Top: Button-down shirt.”와 같은 구조(소문자 값은 기존 출력 규칙) |
| 표정 문장 | “Smile: gentle smile.”, “Emotional expression intensity: subtle.” | 승인 예시의 의미와 같고 기존 속성별 문장 방식 유지 |
| 미소 충돌 범위 | 옅은 + 부드러운 미소는 경고하지 않음 | 함께 쓸 수 있는 표현이라 실제 모순이 아님 |
| “앳된(youthful-looking)” 인상 | 기존 `age.ambiguous_young` 태그 부여 | 기존 어휘의 “young-looking”과 같은 취급(보수적). 연령 판단 자체는 바뀌지 않음 |
| 안경테 형태 | “없음” 선택지 없음 | 안경 “없음”으로 충분 |
| 의상 팔레트 | 승인 어휘 55색 그대로, 안경테·모자 색상이 공유 | 승인서 §9 “Shared color palette” |
| 시대 | 1920s–1990s를 10년 단위 8개 선택지로 | 승인서 §5 “1920s through 1990s” |
| 컴파일 반복 계산 제거 | ADR-054 (§5 성능 참고) | 테스트 제한 시간을 늘리지 않고 카탈로그 증가를 흡수 |

## 4. 프롬프트 출력 예시 (테스트에서 확인된 정확한 문자열)

승인서 §10 예시(E2E `wardrobe`, 데스크톱·모바일 동일 — 상의 핏은 프롬프트에서 제외, 굽 형태는 플랫이라 비활성):

```text
Emotional expression intensity: subtle. Smile: gentle smile. Visual impression: approachable, refined. Makeup style: natural.
Foundation finish: dewy. Lip makeup color: dusty rose. Fashion style: smart casual. Top: button-down shirt. Top primary color: ivory.
Top material: linen. Bottom: tailored trousers. Bottom primary color: navy. Footwear: loafers. Footwear primary color: chocolate brown.
Footwear material: leather. Footwear heel height: flat. Eyewear: eyeglasses. Eyewear frame shape: round frames. Necklace: pendant necklace.
```

| 입력 | 출력 |
|---|---|
| 메이크업 없음 + 스타일 내추럴 + 베이스 듀이 + 립 더스티 로즈 | `Makeup: no makeup.` (세 값은 보존) |
| 상의 종류 없음 + 상의 색 화이트 + 넥라인 V넥 + 하의 색 블랙 | `Top: no separate top garment. Bottom primary color: black.` |
| 원피스 오버올 + 티셔츠 + 레깅스 + 카디건 + 레이어링 보통 | `Clothing layering: moderately layered. Top: T-shirt. Bottom: leggings. One-piece garment: overalls. Outerwear: cardigan.` (경고 없음) |
| 사용자 정의 립 색 “말린 체리” + 표현 | `Lip makeup color: a dried-cherry red.` |
| 사용자 정의 원피스 “작업복 점프슈트” + 표현 | `One-piece garment: a utility boilersuit.` |
| 스타킹 + 허벅지 길이 + 비침 + 두께 1 | `Hosiery: stockings. Hosiery length: thigh-high. Hosiery opacity: sheer. Hosiery thickness: very thin.` |
| 장식 소품 브로치 + 사용자 정의 “회중 체인” | `Decorative accessories: brooch, a fob chain.` |
| 안경 없음 + 모자 없음 + 안경테·모자 색 설정 | `Eyewear: none. Hat: none.` (안경테·모자 색은 보존) |

## 5. 테스트 결과와 성능

```text
pnpm verify → exit 0
 Test Files  32 passed (32)
      Tests  684 passed (684)
✓ 308 production output files contain no fixture marker
✓ production build isolates the test catalog
  1 skipped
  53 passed (17.7s)
```

| 검증 항목 (승인서 §14) | 테스트 |
|---|---|
| 무결성·등록(124개, 순서 354–477, 카테고리, 선택지·어휘·팔레트가 승인 목록과 일치), 누적 277 | `expression-makeup-catalog`·`clothing-catalog`·`accessories-catalog` › registration, `catalog`, `detailed-domain`, `identity-catalog` |
| 모든 선택지·구간이 단독으로 해당 문장만 출력 | 위 3개 › “every option … compiles alone” |
| 한·영·별칭 검색 | 위 3개 › search (45건) |
| 의미 구간 슬라이더, 미설정 미저장 | `component/wardrobe` › emotion intensity, E2E |
| 메이크업 적용 조건, 아이라인 없음, 값 보존·복원 | `expression-makeup-catalog` › makeup applicability, `component/wardrobe` |
| 피부 ↔ 메이크업, 표정 ↔ 얼굴 구조, 인상 ↔ 실제 연령 독립 | `expression-makeup-catalog` |
| 의복별 색상·소재 독립, 전체 설정 ↔ 의복, 원피스 + 상의·하의 조합 | `clothing-catalog` › garment independence, E2E(상의 아이보리 ↔ 하의 네이비 저장값) |
| 의복 종류별 적용 조건, 명시적 없음 ↔ 미설정 | `clothing-catalog` › type-dependent applicability (6건) |
| 액세서리 다중 선택·‘없음’ 경고·안경/모자 없음 | `accessories-catalog`, `component/wardrobe` |
| 포함·제외, 사용자 정의, JSON 왕복, 카테고리 초기화·복원(상위·하위) | 위 3개 › common features, `component/wardrobe`, E2E |
| 안전: 문구 자체 신호 없음, 매력·귀여움은 미성년과 함께여도 비차단, 성적 표현 + 앳된 인상 차단(제외해도), 내의 어휘는 성인 비차단·미성년 차단(값 제외·연령 숨김 포함), 커버리지·핏·의복 없음은 노출 표현 없음, 사용자 정의 이름 검사 | `expression-makeup-catalog`·`clothing-catalog` › safety, `catalog` |
| 기존 Sprint 회귀·안전 결과 동등성 | 기존 테스트 전체, `safety` 동일성 테스트 2건 |
| 데스크톱·모바일 E2E | `e2e/wardrobe.spec.ts` 2건(입력 → 새로고침 유지 → 상위 “의상” 초기화 12개 → 복원, 외부 요청 0건), 기존 E2E 전체 |
| 테스트 카탈로그 격리 | `verify:isolation` (308개 파일) |

### 성능 측정 (카탈로그 규모 증가 — 승인서 §14)

500개 무작위 명세 속성 테스트는 명세마다 전체 속성의 40%를 설정하므로 카탈로그 크기에 비례합니다(TD-11). 측정은 같은 기기에서 main(`12a17ab`)을 별도 복사본으로 실행해 비교했습니다.

| 측정 | main (153 인물 속성) | 최적화 전 2-B.5 | 최적화 후 2-B.5 (277) |
|---|---|---|---|
| 컴파일 250회(예열 후) | — | 210 ms | **156 ms** |
| 속성 테스트 단독 실행 | 0.84 s | — | **1.14 s** |
| 속성 테스트(단위+컴포넌트 병렬) | 1.8–2.3 s | 2.8 s(단위만 2.47 s) | **2.7–2.8 s** |

- 최적화(ADR-054, 결과 동일): 레지스트리 선택지 색인과 `lineage` 메모이제이션, 적용 가능성·정책 제한을 컴파일당 1회 계산해 검증기와 공유, 1차 패스 활성 선택지 재사용, 짧은 텍스트의 안전 검사 결과 메모이제이션(전체 프롬프트는 매번 검사). 안전 정책·어휘·검사 범위는 바꾸지 않았습니다.
- 시험 후 채택하지 않은 정규식 변형 3가지는 ADR-054에 기록했습니다.
- 명세 1개 컴파일은 예열 후 약 0.6 ms입니다.

**CI 실측 (제한 5 s)** — 구현 당시에는 main의 CI 실측(1.8 s)을 기준으로 약 2.5 s를 예상했지만, 실제로는 실행마다 편차가 크고 pull_request 실행에서 여유가 1 s 미만이었습니다.

| CI 실행 | 커밋 | 속성 테스트 |
|---|---|---|
| main 병합 후 (2-B.4, run 45368746568) | `12a17ab` | 1.8 s |
| push (run 45378407495) | `72ad922` | 2.67 s |
| pull_request (run 45378419729) | `72ad922` | **4.02 s** |

같은 커밋에서도 실행 환경에 따라 1.5배 차이가 났습니다. 남은 비용은 대부분 전체 프롬프트 안전 검사와 검증 반복입니다. 카탈로그가 더 커지면(Sprint 2-B.6) 느린 실행에서 제한을 넘을 수 있으므로, **TD-11을 2-B.6 전에 처리할 것을 권장**합니다. 후보는 테스트 표본 설계 조정과 전체 프롬프트 안전 검사 비용 개선이며, 제한 시간 완화·테스트 약화·안전 정책 완화는 하지 않습니다.

### 기존 테스트 수정 (모두 범위 확장 반영이며 검증을 약화하지 않음)

- 버전 0.8.0(확장 테스트 카탈로그 0.9.0), 노출 목록·누적 개수(2-B.3·2-B.4 누적 테스트는 이후 영역을 제외해 원래 수치 유지), 승인 카테고리 목록
- `detailed-domain` 전체 검색: “정장”이 이제 제품 패션 스타일 “비즈니스”를 먼저 찾으므로 테스트 전용 선택지는 “business suit”로 검색하고, “정장” → 제품 선택지 기대값을 추가
- `catalog` “선택지 문구 단독 안전 신호 없음”: 내의 4개 선택지가 기존 미성년자 보호 규칙으로 **정확히** 차단되어야 함을 명시(목록 일치 검사 포함)하고, 연령 표현 없이는 어떤 선택지도 신호를 만들지 않는다는 검사를 추가했습니다.

## 6. 대표 UI 스크린샷

`docs/screenshots/sprint-2b5/` (실제 Chromium, 데스크톱 1280px · 모바일 Pixel 7, 각 7장):
`{chromium,mobile}-expression.png`(감정 강도 “은은함”, 미소 칩), `-makeup.png`(메이크업 팔레트 8그룹), `-tops.png`(의복 종류 검색 목록·의상 팔레트·핏 제외), `-footwear-applicability.png`(플랫 굽 → 굽 형태 비활성 안내·상단 배너·탐색 경고 배지), `-accessories.png`, `-preview.png`, `-reset-dialog.png`(상위 “의상” 초기화 12개).

## 7. 알려진 한계 및 기술 부채

- **TD-11(갱신, 우선순위 상향 권장)**: 속성 테스트 시간이 같은 기기에서 main 대비 약 +35%, CI 실측 2.67–4.02 s(제한 5 s, 위 표). 2-B.6 전에 표본 설계·전체 프롬프트 검사 비용을 개선할 것을 권장합니다. 제한 시간은 늘리지 않았습니다.
- **TD-12(신규)**: 기존 안전 어휘의 내의 표현 범위가 일관되지 않습니다(“underwear”·“bra”는 신호, “briefs”·“boxer shorts”·“shapewear”는 신호 없음). 미성년 인물의 “thermal underwear”(내복)는 차단되고 “briefs”는 통과합니다. 정책 변경이 필요해 이번에는 바꾸지 않았습니다.
- **TD-13(신규)**: 의상 화면에서 의복마다 기본·보조 팔레트(55색)가 모두 펼쳐져 길어집니다(스크린샷 참고). Sprint 2-C UI 검토 대상입니다.
- 여러 벌의 의복(반복 객체), 좌우 개별 액세서리, 액세서리 소재·보석 설정, 시선 방향·자세(2-B.6), RGB/HEX 직접 입력(Sprint 3), 시각 예시 이미지는 범위 밖입니다.
- “없음” + 다른 항목을 함께 고르면 경고와 함께 둘 다 출력됩니다(기존 동작과 동일, 자동 변경 없음).
- 이미지 모델이 감정 강도·매력도 등 상대 표현을 정확히 재현한다는 보장은 없습니다. TD-08·TD-10은 Sprint 2-C 우선 검토 대상으로 유지합니다.

## 8. Git 상태

- 브랜치 `feature/sprint-2b5-expression-clothing`(main `12a17ab`에서 분기). 구현 커밋 `72ad922`(48개 파일), PR #7, CI 통과. CI 실측 반영은 후속 문서 커밋. **병합하지 않음**
- 변경(구현 커밋 기준): 추적 파일 25개 수정(+604 / −119, 이 보고서 작성 전 `git diff --stat` 기준): 소스 5개(카탈로그 통합 `core.ts` + 최적화 `registry.ts`·`compiler.ts`·`evaluate.ts`·`specValidator.ts`), 테스트 9개, 문서 11개
- 새 파일: `src/domain/catalog/catalogs/person/{expression-makeup,clothing,accessories}.ts`, `tests/unit/{expression-makeup,clothing,accessories}-catalog.test.ts`, `tests/component/wardrobe.test.tsx`, `e2e/wardrobe.spec.ts`, `docs/screenshots/sprint-2b5/`(14개), `docs/SPRINT_2B5_REPORT.md`
- 생성물은 `.gitignore`로 제외. 비밀 값·유료 API·이미지 API 호출 없음. Sprint 2-B.6은 시작하지 않았습니다.
