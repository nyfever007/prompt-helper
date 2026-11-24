# Sprint 2-B.1 보고서 — Person › Identity (인물 기본 정보)

- 상태: **구현 완료, 검토 대기** — 커밋·push 하지 않음
- 브랜치: `feature/sprint-2b1-identity` (기준 main `49be933`)
- 구현 기준: `PROMPTER_MASTER_PLAN.md`(변경 없음), `docs/catalogs/CATALOG_DESIGN_STANDARD.md` 0.2.0, `docs/catalogs/person/identity.md` 1.0.0, `docs/SPRINT_2B1_SPEC_REVIEW.md` 3차본(D0–D14, N1–N5, Q1–Q3)
- 로컬 전체 검증: `pnpm verify` **종료 코드 0** — 단위·컴포넌트 474개 통과, 격리 검증 통과, E2E 45 통과 / 1 skip

## 1. 구현된 기능

| 영역 | 내용 |
|---|---|
| Identity 카탈로그 | 16개 속성, 6개 하위 분류(존재·연령·성별·배경·사회·기타), 실제 편집 가능(approved). 다른 인물 영역 13개는 DRAFT 유지 |
| ImageSpec 0.3.0 | `excludedFromPrompt`, `CustomEntry`(단일·다중), number/range `unit`. 0.2.0 → 0.3.0 무손실 마이그레이션 |
| 카탈로그 형식 0.4.0 | `expression{role,kind}`, `outputToggle`, `custom`, `quantity`, `optionGroups/group`, `covers`, `suggestedWhen`, `interval`, `prompt.variants`, 조건 `derived`·`selectedCount`·`intervalMismatch`, `ageModel` + 등록 시 무결성 검사 |
| 핵심 카탈로그 0.4.0 | Identity 통합, 기존 속성 order ×10, 마이그레이션 0.3.0 → 0.4.0(ID 변경 없음) |
| 컴파일러 0.4.0 | 제외·Metadata 생략, covers 중복 제거(출처 보존), 조건별 표현, 사용자 정의 값, 단위, 숨은 값까지 안전 검사 |
| 안전 정책 0.2.0 | 규칙·단어 목록 변경 없음(완화 없음). 입력 확장: 제외·적용 불가·Metadata·covers 값, 사용자 정의 이름·표현, 모든 선택지 태그, 구조화 연령 신호 |
| 공통 연령 해석 | `assessAge`/`classifyBeing` — 안전 정책, 실제 연령–연령대 불일치 규칙, 성별 조건별 표현이 함께 사용 |
| 상태 관리 | 출력 토글, 카테고리 초기화·복원(전체 초기화·프리셋 되돌리기와의 관계 정의) |
| UI | 수량 입력(숫자/범위 + 단위), 사용자 정의 값 편집기, 계층 검색 경로, 일반적인 조합 우선 정렬, 선택 요약 칩, 포함 토글·제외 배지, covers·조건별 표현 설명, 카테고리 초기화 확인 창·되돌리기, 모바일 레이아웃 |

모든 공통 기능은 Identity 전용 코드가 아니라 카탈로그 데이터로 켜는 범용 기능입니다(예: 출력 제외 도메인 기능은 모든 속성에 적용되고, 토글 UI는 `outputToggle`이 켜진 속성에만 보임).

## 2. 속성 및 선택지 수

| 속성 | 타입 | 등록 선택지 | 사용자 정의 |
|---|---|---|---|
| entity_type 존재 유형 | single | 10 | ✓ |
| species 종족 | single (계층) | 18 | ✓ |
| character_origin 인물의 실재 여부 | single | 5 | — |
| age_group 연령대 | single | 12 | — |
| age 실제 연령 | quantity | (년·개월·일) | — |
| apparent_age 외형적 연령 | quantity | (년·개월·일) | — |
| gender 성별 | single | 5 | ✓ |
| gender_presentation 성별 표현 | single | 5 | ✓ |
| nationality 국적 및 국가·지역 | **multi** | 200 (199 + 무국적) | ✓ |
| ethnic_background 민족적 배경 | multi | 8 | ✓ |
| cultural_background 문화적 배경 | multi | 7 | ✓ |
| historical_period 시대적 배경 | single | 15 | ✓ |
| occupation 직업 | multi (11개 표시 묶음) | 34 | ✓ |
| narrative_role 서사적 역할 | multi | 11 | ✓ |
| social_status 사회적 지위 | single | 7 | ✓ |
| description 인물 설명 | text (2,000자) | — | (자유 입력) |
| **합계** | **16** | **337** | 11개 속성 |

국가·지역 199 = 유엔 회원국 193 + 옵서버 2(VA, PS) + 특수 지역 4(TW, HK, MO, XK).

## 3. 최종 카탈로그 구성

```text
인물 (approved)
└─ 인물 기본 정보 (approved, 피사체 “인물(1인)” 또는 미선택일 때 적용)
   ├─ 존재: 존재 유형(201) · 종족(202) · 인물의 실재 여부(203)
   ├─ 연령: 연령대(204) · 실제 연령(205) · 외형적 연령(206)
   ├─ 성별: 성별(207) · 성별 표현(208)
   ├─ 배경: 국적 및 국가·지역(209) · 민족적 배경(210) · 문화적 배경(211) · 시대적 배경(212)
   ├─ 사회: 직업(213) · 서사적 역할(214) · 사회적 지위(215)
   └─ 기타: 인물 설명(216)
얼굴 · 눈 · 눈썹 · 코 · 입술 · 피부 · 헤어 · 신체 · 표정 및 시각적 인상 · 메이크업 · 의상 · 액세서리 · 자세 및 행동 (DRAFT)
```

- 데이터: `src/domain/catalog/catalogs/person/identity.ts`(속성·규칙·연령 모델), `person/regions.ts`(국가·지역 정적 데이터), `core.ts`에서 기존 레지스트리로 통합
- 규칙: R1 실제 연령–연령대 불일치(경고, 존재 분류 human일 때 — 미설정 포함), R2 무국적 + 다른 국가·지역(경고), R5 혼합 종족 설명 권장(안내). 비전형 조합(`selection.atypical`)과 이름만 입력한 Direct 사용자 정의 값(`selection.custom_name_only`)은 비차단 안내
- 국가·지역 데이터 출처: 코드 ISO 3166-1 선별 `identity-regions@0.1.0`, 표시명 Unicode CLDR 48(Node 22.23.1 / ICU 78.2) + 승인된 대체명, 표현 Prompter 작성 `identity-demonyms@0.1.0`, 별칭 `identity-region-aliases@0.1.0`

## 4. 주요 아키텍처 변경

1. **값 스키마**: `single`이 두 형태(등록 선택지 / 사용자 정의)를 가지므로 discriminated union을 strict 객체 `z.union`으로 바꿨습니다(Zod 4는 중첩 union 판별을 지원하지 않음). 선택값을 읽는 코드는 `selectedOptionIds` / `selectedCustomEntries` 헬퍼로 통일했습니다.
2. **조건 평가 문맥**: 레지스트리가 `derivedFact`(age.class, being.class)와 `intervalMismatch`를 제공합니다. 사용자 정의 값은 `noneOf`에서 “목록에 없는 값”으로 취급합니다.
3. **컴파일러**: 출력하지 않는 값의 이유(`excluded`/`inactive`/`metadata`/`covered`)를 추적해 안전 진단의 `hiddenSources`로 남깁니다. `compilation.age`(연령 판단)와 `compilation.covered`(중복 생략 출처)를 결과에 포함합니다.
4. **상태**: `setExcluded`, `resetCategory`, `undoCategoryReset` 액션. 카테고리 초기화는 지운 선택 객체만 기록해 정확히 복원합니다.
5. **출력 순서 번호 ×10**(N1): Identity를 피사체 바로 뒤(201–216)에 두기 위해 기존 속성 order를 10배로 바꿨습니다. 테스트 전용 카탈로그 두 곳의 순서 번호도 같은 비율로 바꿔 상대 위치를 유지했습니다.

자세한 기록: `docs/DECISIONS.md` ADR-038~047, `docs/ARCHITECTURE.md` §10.

## 5. 기존 사양 대비 변경 사항 (구현 중 판단, 승인서 §14 범위)

| 항목 | 사양 | 구현 | 이유 |
|---|---|---|---|
| Identity 하위 분류 | `categoryId: person_identity` | 6개 하위 카테고리(존재·연령·성별·배경·사회·기타) | 승인서의 “Identity 하위 분류 탐색”과 영역 표를 데이터로 구현(ADR-047). 상위 초기화는 하위 전체 대상 |
| 연령 문장 틀 | `Actual age: {value}.` + 값 “28 years old” | `Actual age: {value} old.` + 값 “28 years” | 출력은 동일(“Actual age: 28 years old.”). “old”를 단위 표기와 분리해 quantity 렌더러를 범용으로 유지 |
| 국가·지역 alpha-3 별칭 | 별칭 출처에 ISO alpha-3 포함 | 넣지 않음 | 오프라인에서 검증 가능한 alpha-3 데이터가 없어 손으로 쓴 코드를 ISO 출처로 기록하지 않기로 함. alpha-2·CLDR 이름·통칭으로 검색 지원 |
| 선택 요약 칩 | (없음) | 검색 목록 위에 선택된 값 표시·해제 | 200개 목록에서 선택값이 스크롤 밖으로 사라지는 문제(공통 규격 §7 “선택값은 계속 보이게”) |
| 안전 진단 표시 | (없음) | 구조화 태그를 신호 이름으로 표시(예: `age.minor` → “미성년자·아동 표현”) | 사용자에게 내부 ID 노출 방지 |
| 영어 라벨 | 일부 미지정 | 직업 등 영어 라벨은 표현의 첫 글자 대문자(예: Physician), 연령대 “Preschool child” 등 | 라벨은 화면 표시용이며 프롬프트 표현은 사양 그대로 |
| 검색 별칭 추가 | 사양 예시 외 | OC, villain, cook, author 등 일부 추가 | 검색 전용(출력 없음) |

프롬프트 표현, 선택지, ID, 규칙은 사양 3차본과 동일하며, 부록 A·B와의 일치는 테스트로 검증합니다(§7).

## 6. 실제 프롬프트 출력 예시 (테스트에서 확인된 정확한 문자열)

| 입력 | 출력 |
|---|---|
| 인물(1인) + 인간 + 28세 + 여성 + 대한민국 + 건축가 | `Main subject: a single person. Type of being: human. Actual age: 28 years old. Gender: woman. Nationality (country or region): South Korean. Occupation: architect.` |
| 위에서 존재 유형 미설정 (N3) | `Main subject: a single person. Actual age: 28 years old. Gender: woman. Nationality (country or region): South Korean. Occupation: architect.` |
| 위에서 직업 프롬프트 제외 | `… Nationality (country or region): South Korean.` (직업 값은 유지) |
| 판타지 인간형 + 엘프 + 300세 + 외형 30세 | `Main subject: a single person. Species: elf. Actual age: 300 years old. Apparent age: approximately 30 years old.` (존재 유형은 covers로 생략) |
| 안드로이드 + 엘프 | `Type of being: android. Species: elf.` + 비전형 조합 안내 |
| 사용자 정의 종족 “루미아족” + 표현 | `Species: A humanoid species with translucent crystalline skin and faintly luminous veins.` |
| 사용자 정의 종족 이름만 | `Species: 루미아족.` + 이름만 입력 안내 + 언어 혼용 안내 |
| 대한민국 + 일본 + 무국적 | `Nationality (country or region): Japanese, South Korean, stateless.` + 경고 R2 |
| 직업: 건축가·조종사 + 사용자 정의 2개 | `Occupation: architect, pilot, airship navigator, Cartographer.` |
| 인간 + 16–20세 + 여성 | `Type of being: human. Actual age: 16–20 years old. Gender: female character.` |
| 조선 + 주인공·스승 + 귀족 + 한국어 설명 | `Character's historical era: Joseon era (Korea). Narrative role: protagonist, mentor. Social status: nobility. Character description: 몰락한 양반 가문의 장녀.` |
| 엘프 300세 + 외형 12세(프롬프트 제외) + “a sexy pose” | **출력 차단** — 감지: 미성년자·아동 표현, 12 years old, sexy — 외형적 연령 (프롬프트 제외), 이미지 설명 |

## 7. 테스트 결과

### 7.1 명령 결과 (`pnpm verify`, 종료 코드 0)
```text
> pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm verify:isolation
> eslint . --max-warnings=0
 Test Files  22 passed (22)
      Tests  474 passed (474)
✓ Compiled successfully
✓ 149 production output files contain no fixture marker
✓ production build isolates the test catalog
  1 skipped
  45 passed
```
- 단위·컴포넌트: 344 → **474** (+130: `identity-catalog` 23, `identity-semantics` 87, `category-reset` 9, `component/identity` 11)
- E2E: 40 → **46** (+6: `e2e/identity.spec.ts` 3건 × 데스크톱·모바일). skip 1건은 기존과 같은 모바일 전용 테스트의 데스크톱 실행 제외
- 기존 테스트 수정은 버전 숫자(0.2.0 → 0.3.0 등)와 승인으로 바뀐 카탈로그 구성(노출 속성 목록, Identity approved)에 한정했습니다. 단언을 지우거나 대기 시간을 늘리거나 범위를 줄이지 않았습니다.

### 7.2 완료 기준별 증거 (사양 §9.3)

| 완료 기준 | 증거 |
|---|---|
| 1. 기존 작업 공간(0.1.0·0.2.0·2-A 프리셋 출처)이 경고 없이 열리고 프롬프트가 글자 단위로 같음 | `identity-semantics` › existing data compatibility: “Sprint 2-A core export (ImageSpec 0.2.0) imports losslessly and compiles to the exact Sprint 2-A prompt”, “Sprint 2-A localStorage workspace restores with no warnings”, “Sprint 2-A preset provenance (origin) survives migration…” / 기존 `migration`·`detailed-domain`·`compiler` 골든 테스트(Sprint 0·1 프롬프트) 통과. fixture는 main `49be933` 코드로 직접 생성(`tests/fixtures/sprint2a/`) |
| 2. 출력 제외: 문장만 사라지고 값 유지, 값 변경 시 유지·해제 시 제거, 새로고침·JSON 왕복 | `identity-semantics` › Unset / Selected / Excluded states (5건), `component/identity` › “excludes from the prompt, keeps the value, persists across reload”, E2E “…persists across reload and JSON” |
| 3. (그럴듯하지만 틀린 구현 구별) 외형 12세를 제외해도 성적 표현이 있으면 차단, 진단에 “(프롬프트 제외)” | `identity-semantics` › “PLAUSIBLE-BUT-WRONG GUARD…”. **돌연변이 확인**: 컴파일러가 출력 문장만 검사하도록 임시로 바꾸면 5개 테스트가 실패함을 확인한 뒤 원복. E2E “safety: an EXCLUDED minor apparent age still blocks…”(데스크톱·모바일, 복사·내보내기 비활성) |
| 4. 연령 결정표 전체, 360개월 = 30년, human 자동 기록 없음, 성별 원본 불변 | `identity-semantics` › age assessment decision table **32건**(N3 7건, Q2 5건 포함, 6574/6575일 경계), conditional gender wording 7건 |
| 5. 사용자 정의 값: 이름·표현 독립 수정, 병합·대체 없음, 혼합 다중 왕복 | `identity-semantics` › custom values 5건, `component/identity` › “adds a custom occupation…”, “add as custom from search…”, E2E 1번 시나리오 |
| 6. 카테고리 초기화: 검색 중에도 저장 값 전체(제외·적용 불가 포함), 복원은 이후 편집·다른 카테고리 보존 | `category-reset` 9건(비노출 draft 속성 포함, 전체 초기화·프리셋 되돌리기 관계), `component/identity` › “resets ALL stored identity values even while a list is filtered…”, E2E “category reset clears ALL… even while searching” |

### 7.3 승인서 §13 필수 검증 항목

| 항목 | 테스트 |
|---|---|
| Identity 16개 속성 편집 및 저장 | E2E 1번(모든 하위 분류), `component/identity` |
| 모든 승인 선택지의 카탈로그 무결성 | `identity-catalog` › “every registered option keeps its approved id and English expression”, 국가·지역은 `SPRINT_2B1_SPEC_REVIEW.md` 부록 A 표를 직접 읽어 199개 비교 |
| 한·영 검색 및 별칭 | `identity-catalog` › catalog-wide search 8건, countries “supports Korean, English, code and alias search” |
| 사용자 정의 값 저장·복원 | `identity-semantics` › “name and expression round-trip…”, E2E JSON 왕복 |
| 프롬프트 포함·제외 | §7.2-2 |
| Metadata 출력 제외 | `identity-semantics` › “Metadata role never emits prompt text but is still validated and safety-checked” |
| 연령 결정표 모든 사례 / 단위 정규화 / 조건별 성별 표현 | §7.2-4 |
| 복수국적 및 무국적 충돌 | `identity-semantics` › example 4, `component/identity` › selected summary 테스트 |
| 의미 중복 제거 | `identity-semantics` › examples 2·2b, covers 상속·사용자 정의·제외 |
| 기존 속성의 독립성 | `independence` 500개 무작위 명세 속성 테스트(Identity 포함) + “no identity phrase adds appearance…” |
| 카테고리 초기화 및 복원 / 검색 중 초기화 | §7.2-6 |
| Sprint 0·1·2-A 데이터 마이그레이션 / JSON round-trip / 기존 프롬프트 회귀 | §7.2-1, `json`·`migration` |
| 데스크톱 및 모바일 E2E | `e2e/identity.spec.ts` 6건 통과 |
| 테스트 카탈로그 격리 | `pnpm verify:isolation` 통과 |
| 모든 프롬프트 출력 경로의 안전 정책 | 차단 시 미리보기·복사·.txt 내보내기·모바일 복사 비활성(E2E), `getPromptOutput` 단일 관문 |

## 8. 주요 UI 스크린샷

`docs/screenshots/sprint-2b1/` (실제 Chromium, 데스크톱 1280px·모바일 Pixel 7)

| 화면 | 데스크톱 | 모바일 |
|---|---|---|
| 종족 계층 검색(수인족 › 고양이 수인) | `chromium-identity-being-search.png` | `mobile-identity-being-search.png` |
| 연령(연령대 + 수량 입력) | `chromium-identity-age.png` | `mobile-identity-age.png` |
| 국적 및 국가·지역(다중, 선택 요약) | `chromium-identity-nationality.png` | `mobile-identity-nationality.png` |
| 사용자 정의 값 + 프롬프트 제외 | `chromium-identity-social-custom-excluded.png` | `mobile-identity-social-custom-excluded.png` |
| 미리보기 | `chromium-identity-preview.png` | `mobile-identity-preview.png` |
| 안전 차단(제외된 외형 연령) | `chromium-identity-safety-excluded.png` | `mobile-identity-safety-excluded.png` |
| 카테고리 초기화 확인 창 | `chromium-identity-category-reset-dialog.png` | `mobile-identity-category-reset-dialog.png` |

## 9. 데이터 호환성

- 저장 키 `prompter:v1:workspace`, 저장 envelope 1은 그대로입니다.
- ImageSpec 0.1.0·0.2.0 → 0.3.0: 버전 숫자만 바꾸는 단계(무손실). 카탈로그 0.1.0~0.3.0 → 0.4.0: ID 변경 없음(마이그레이션 기록이 생기지 않음).
- 검증: Sprint 0(`tests/fixtures/sprint0`), Sprint 1(`sprint1`), **Sprint 2-A(`sprint2a`, 이번에 main 코드로 생성)** 실제 JSON·localStorage 데이터가 경고 없이 열리고 같은 선택값·같은 프롬프트를 냅니다.
- 이 버전이 내보내는 0.3.0 JSON은 이전 앱(Sprint 0·1·2-A)이 읽지 못합니다(기존 정책과 동일).
- 안전 검사 입력이 넓어져, 적용 불가 상태로 저장된 값에 미성년·성적 표현 조합이 있는 예외적인 명세는 새로 차단될 수 있습니다(강화). 기존 fixture에는 해당 사례가 없습니다.

## 10. 알려진 한계

- 출력은 속성별 문장입니다(D9). 자연스러운 한 문장 합성은 후속 과제입니다(Q16).
- Identity는 1인 피사체에만 적용됩니다. 여러 사람의 인물 정보는 피사체별 명세에서 설계합니다(Q15).
- 연령 판단은 입력된 구조화 값과 단어 검사에 의존하며 이미지 내용은 판단하지 못합니다. 로컬 단어 검사의 기존 한계(ADR-019)는 그대로입니다.
- 국가·지역 영어 형용사는 외부 데이터셋 없이 작성했습니다. CLDR 표시명 일부는 약칭을 씁니다(예: “St. Vincent and Grenadines”). alpha-3 별칭은 없습니다.
- 숫자 입력은 입력하는 동안 유효한 중간 값(예: “30.5” 입력 중 “30”)을 저장합니다(기존 숫자 입력과 같은 동작). 유효하지 않은 최종 값은 저장하지 않습니다.
- 단일 선택 속성에서 사용자 정의 값을 추가하면 기존 등록 선택을 대신합니다(화면에 안내).
- 카테고리 초기화 되돌리기는 세션 안에서 마지막 1회만 가능합니다(TD-09).
- 실제 시각 예시 이미지는 만들지 않았습니다(승인 범위 밖).
- 앱 상단 부제 “Basic Composer”는 Sprint 1 문구 그대로입니다(이번 범위에서 바꾸지 않음).

## 11. 기술 부채

| ID | 항목 | 처리 시점 |
|---|---|---|
| TD-01, TD-02 | 카테고리 키보드 탐색, 대화상자 포커스 관리(이번에 추가한 카테고리 초기화 확인 창도 포함) | Sprint 2-C |
| TD-03 | 시각 예시 제작 기준 — **기준 확정**(공통 규격 §10). 자산 제작은 별도 승인 | — |
| TD-04, TD-05 | 프리셋 이력 확장, 사용자 정의 색상 | Sprint 3 |
| TD-06 | 모델별 의미 단위 변환 | Sprint 5 |
| TD-07 | ESLint 10 | 호환성 확보 이후 |
| **TD-08 (신규)** | 카테고리 순서와 카테고리 내부 속성 순서 분리(×10은 임시 번호 공간) | 다음 카탈로그 확장 설계 시 검토 |
| **TD-09 (신규)** | 카테고리 초기화 되돌리기 이력·새로고침 유지 | Sprint 3 (TD-04와 함께) |

## 12. Git 상태

- 브랜치 `feature/sprint-2b1-identity` (main `49be933`에서 분기), **커밋하지 않음, push하지 않음**
- 변경: 추적 파일 45개 수정(+2,001 / −320, `git diff --stat` 기준, 새 파일 제외; 새 파일 포함 시 78개 파일 +6,472 / −320). 새 파일: `src/domain/catalog/age.ts`, `src/domain/catalog/catalogs/person/{identity,regions}.ts`, `src/components/controls/{CustomEntries,QuantityControl}.tsx`, `e2e/identity.spec.ts`, `tests/unit/{identity-catalog,identity-semantics,category-reset}.test.ts`, `tests/component/identity.test.tsx`, `tests/fixtures/sprint2a/`, `docs/SPRINT_2B1_SPEC_REVIEW.md`, `docs/SPRINT_2B1_REPORT.md`, `docs/catalogs/CATALOG_DESIGN_STANDARD.md`, `docs/screenshots/sprint-2b1/`(14개)
- 문서 이동: `docs/CATALOG_DESIGN_STANDARD.md` → `docs/catalogs/CATALOG_DESIGN_STANDARD.md`, `docs/identity.md` → `docs/catalogs/person/identity.md`(Sprint 2-A의 draft-0 초안을 대체, 이전 내용은 git 이력에 있음)
- 생성물(`.next`, `.next-e2e`, `test-results`, `node_modules`, `tsbuildinfo`)은 커밋 대상이 아니며 `.gitignore`로 제외됩니다. 비밀 값·환경 파일 없음
- `PROMPTER_MASTER_PLAN.md` 변경 없음. 유료 API·이미지 생성 API 호출 없음(E2E 외부 요청 감시: 0건)
