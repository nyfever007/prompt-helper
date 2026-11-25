# Changelog

이 프로젝트의 변경 이력입니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

버전 축은 서로 독립적입니다:
- 앱(`package.json`): 0.1.0
- ImageSpec 스키마(`IMAGE_SPEC_SCHEMA_VERSION`): 0.1.0
- 카탈로그 형식(`CATALOG_FORMAT_VERSION`): 0.1.0 / core 카탈로그 내용(`prompter.core`): 0.1.0
- 컴파일러(`COMPILER_VERSION`): 0.1.0 / generic-en adapter: 0.1.0
- 로컬 저장 envelope(`STORAGE_FORMAT_VERSION`): 1

## [Sprint 2-C.4] — 2026-11-25 — Performance & integration validation (승인됨 — **Sprint 2-C 공식 완료**: 2-C.1·2-C.2·2-C.3·2-C.4 완료)

버전 변화 없음: core 카탈로그 0.12.0, 카탈로그 형식 0.5.0, 컴파일러 0.5.0, ImageSpec 0.3.0, 안전 정책 0.3.0. 속성·ID·저장 형식·프롬프트 출력·진단 규칙은 그대로입니다.

### Fixed
- 색상 팔레트(단일 선택) 키보드: 실제 브라우저에서 화살표로 고른 뒤 Space가 동작하지 않던 문제
  - 원인: 이미 선택된 라디오에서는 Space가 click을 발생시키지 않습니다. jsdom에서는 재현되지 않았습니다.
  - 수정: 현재 색에서 Space 또는 Enter를 누르면 선택을 확정하고 팔레트를 닫은 뒤 포커스를 토글로 돌려줍니다.
- 밝은 테마 성공 색(`--ok`)이 연한 배경에서 대비 3.85:1(WCAG AA 미달)이었습니다 → 4.7:1(#237a35)로 고쳤습니다.
- 다크 테마 색상 견본 테두리가 고정된 어두운 색이라 어두운 견본(블랙 등)이 배경에 묻혔습니다 → 테마별 `--swatch-ring`을 씁니다.
- 머리말 부제가 모든 모드에서 “— Basic Composer”로 표시되던 문제(Sprint 1 문구) → “하나의 이미지 명세를 Basic·Detailed에서 편집”으로 바꿨습니다.

### Added
- 성능 측정:
  - `pnpm perf`: 실제 Chromium, 제품 빌드, 데스크톱·모바일 CPU 4×, 측정마다 5회. `playwright.perf.config.ts`, `perf/product.perf.ts`, 복잡한 명세 `perf/fixtures/complex-workspace.json`
  - `pnpm perf:bundle`(`scripts/measure-bundle.mjs`)
  - 기준선 `docs/PERFORMANCE.md`, `docs/performance/*.json`
- 테스트:
  - `theme-contrast`(30): 두 테마 텍스트 대비 WCAG AA
  - E2E `integration`: 시나리오 A–G와 63개 카테고리 페이지 가로 스크롤 점검, 데스크톱·모바일 각 8
  - E2E `a11y-theme`: 키보드 전체 회귀, 프리셋 대화상자, 다크 모드, 데스크톱·모바일 각 3
  - 팔레트 키보드 확정 컴포넌트 테스트 1개
- 문서:
  - `docs/SPRINT_2C4_REPORT.md`, `docs/PERFORMANCE.md`
  - VISUAL_EDITOR_PRINCIPLES §9(2-D 진입 준비, 시각 에셋 테마·접근성 조건)
  - TD-11 최종 판단, TD-16 부분 해결, TD-18 신규
  - 스크린샷 `docs/screenshots/sprint-2c4/`

## [0.12.0] — 2026-11-25 — Sprint 2-C.3: Safety & applicability consistency (승인·병합, PR #12)

버전 변화: 안전 정책 `prompter.baseline` 0.2.0 → **0.3.0**(승인된 정책 변경), core 카탈로그 0.11.0 → **0.12.0**(ID·값·문구 변경 없음, 마이그레이션 `changes: []`). ImageSpec 0.3.0, 카탈로그 형식 0.5.0, 컴파일러 0.5.0은 그대로.

### Changed (정책 — 의도적 변경, `docs/SAFETY_POLICY.md` §5)
- TD-15: 성적 매력 표현은 구조화 연령 판단이 성인일 때만 출력합니다. 연령 불명이면 출력을 보류하고, 미성년·모호 연령이면 차단합니다(기존). 일반적인 외모 표현은 연령과 관계없이 허용합니다.
- TD-12: 속옷류는 성적 매력 표현이 아니라 의복 분류입니다(`garment.intimate`). 미성년·모호 연령 + 속옷류는 모든 의복에 같은 규칙으로 차단해, 브리프·드로즈·트렁크·보정 이너웨어도 새로 차단됩니다. 차단 → 허용 변경은 0건입니다.
- TD-14: 외모 방향의 적용 조건을 공통 인물 범위로 바꿔, 피사체가 미설정이어도 적용·출력됩니다. Basic은 인물을 고르거나 값이 있을 때 표시합니다.

### Added
- 안전 신호 `age.adult_confirmed`(구조화 판단 전용)·`garment.intimate`, 규칙 `appeal-age-unconfirmed`·`minor-intimate-apparel`, 규칙 필드 `noneOf`·`resolution`
- 이너웨어 선택지 8개에 `garment.intimate` 태그(`INTIMATE_INNERWEAR`)
- “관련 설정” 버튼(`RelatedSettings`, `GoToAttribute`): Detailed의 해당 속성으로 이동하며, Basic에서는 Detailed로 전환합니다. 값은 바꾸지 않습니다.
- 테스트:
  - `safety-policy-0.3`(25): 1,010개 비교 매트릭스(변경 170 / 불변 840), 연령 매트릭스, 우회 경로, JSON
  - `component/safety-applicability`(4), E2E `safety`(데스크톱·모바일 각 2)
  - 비교 기준: `tests/fixtures/safety-matrix-0.2.0.json`(변경 전 코드로 기록), `tests/fixtures/baselinePolicy-0.2.0.ts`(정책 0.2.0 사본)
- 문서: `docs/SAFETY_POLICY.md`(신규), ADR-065·066, `docs/SPRINT_2C3_REPORT.md`, 스크린샷 `docs/screenshots/sprint-2c3/`

### Changed (테스트 — 의도적 정책 변경에 맞춤, 근거 명시)
- `safety`: 성인이 자유 입력에만 있는 성적 매력 문장 7개는 “출력 보류 + 구조화 성인이면 허용”으로 바꿨고, 미성년 + 속옷류 5개는 차단 목록에 추가했습니다.
- `catalog`·`clothing-catalog`·`appearance-pose-catalog`·`expression-makeup-catalog`·`component/app`: 새 결과를 정확한 규칙 ID로 단언합니다.
- `prompt-order` 골든: 출력 순서만 검증하도록 정책 0.2.0 사본과 2-C.3 이전 외모 방향 범위로 고정하고, TD-14 차이는 별도로 단언합니다.
- 테스트 카탈로그의 성인 연령대 태그 `age.adult` → `age.adult_confirmed`(정책 0.3.0의 성인 확인)

## [0.11.0] — 2026-11-25 — Sprint 2-C.2: Architecture, state management & diagnostics (승인·병합, PR #11)

버전 변화: 카탈로그 형식 0.4.0 → **0.5.0**(추가만), core 카탈로그 0.10.0 → **0.11.0**(ID 변경 없음, 마이그레이션 `changes: []`), 컴파일러 0.4.0 → **0.5.0**(같은 카탈로그 순서면 같은 출력). ImageSpec 0.3.0과 안전 정책 0.2.0은 그대로이며, 프롬프트 출력도 같습니다.

### Added
- TD-08: 카탈로그 `promptOrder` — 출력 그룹 15개와 그룹 안 속성 ID 목록(`catalogs/prompt-order.ts`)
  - UI `order`·카테고리와 독립적입니다.
  - 무결성 검사: 누락·중복·알 수 없는 ID·중복 그룹은 오류입니다.
  - `registry.promptAttributes()`·`promptGroupOf()`·`promptGroups`를 추가했습니다.
  - 골든 데이터: `tests/fixtures/golden-prompt-order-0.10.0.json`(변경 전 코드로 기록)
- TD-09: 카테고리 초기화 이력(세션 최근 5개, 최신 순)
  - 기록마다 복원할 수 있고, 초기화 뒤 사용자가 바꾼 속성(`editedSince`)은 현재 상태를 유지합니다.
  - 이전 초기화 목록 UI를 추가했습니다.
- TD-10: 조건 `numberIn`, 규칙 `basis`(contradiction·convention), 규칙 24개
  - 의미 충돌 17개: 얼굴·눈·코·입술·신체·표정
  - 관례 차이 7개: 조리개 ↔ 피사계 심도, 렌즈 ↔ 원근감, 빛 질감 ↔ 그림자 경계, 대비 ↔ 그림자
  - 안내에 “의미 충돌”·“관례와 다름” 표시와 관련 설정 목록을 붙였습니다.
- 테스트:
  - `prompt-order`(13), `consistency-rules`(32), `category-reset` TD-09(9), `migration`(+1)
  - `component/reset-history-diagnostics`(3), E2E `architecture`(데스크톱·모바일 각 2)
- 스크린샷 `docs/screenshots/sprint-2c2/`
- 문서: ADR-062–064, `docs/SPRINT_2C2_REPORT.md`, CATALOG_DESIGN_STANDARD 0.3.0, 카탈로그 문서(신체·얼굴·눈·코·입술·표정·카메라·조명)의 TD-10 항목

### Changed
- `WorkspaceState.lastCategoryReset` → `categoryResets`(이력)
- `undoCategoryReset(recordId?)`: 복원 안내의 “유지한 항목”이 초기화 뒤 지운 경우도 포함합니다.
- 기존 규칙 `sky-light-in-studio`를 관례 차이로 분류했습니다(심각도 그대로).
- 신체 테스트의 “신체 규칙 없음”을 “신체 속성만 읽는 비차단 규칙 5개”로 정확히 바꿨습니다(ADR-052 일부 대체).
- 테스트에서 core를 복제해 속성을 추가하는 카탈로그는 `placeUnlistedByOrder`로 예전 위치에 배치합니다.
- 테스트 확장 카탈로그를 0.11.0 → 0.12.0으로 올렸습니다.

## [0.10.0] — 2026-11-25 — Sprint 2-C.1: UI, UX & accessibility + 로드맵 갱신 (승인·병합, PR #10)

버전 변화: core 카탈로그 0.9.0 → **0.10.0**(ID·선택지·출력 변경 없음, 마이그레이션 `changes: []`). ImageSpec 0.3.0, 카탈로그 형식 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0은 그대로.

### Added
- 카메라 하위 분류 5개(프레이밍 및 시점, 렌즈 및 원근감, 초점 및 피사계 심도, 구도 및 배치, 카메라 효과)
- 조명 하위 분류 6개(조명 프리셋 및 광원, 주광, 보조광 및 환경광, 색상 및 색온도, 그림자 및 대비, 조명 효과). 림 라이트 색상은 림 라이트 강도와 같은 “보조광 및 환경광”에 있습니다(최종 승인 반영) — ADR-061
- 공통 `ModalDialog`: 초기 포커스, Tab 순환, 배경 inert, Escape, 포커스 복귀 — TD-02, ADR-060
- 이전/다음 페이지 버튼, 검색 결과 수 안내, 모바일 미리보기 시트의 Escape 처리와 포커스 이동
- 테스트:
  - `component/usability`(17)
  - `camera-lighting-catalog`에 하위 분류 4개
  - `migration`에 0.9.0 → 0.10.0 1개
  - E2E `usability`(데스크톱·모바일 각 4)
- 스크린샷 `docs/screenshots/sprint-2c1/`(변경 전·후)
- 문서:
  - `docs/VISUAL_EDITOR_PRINCIPLES.md`(Sprint 2-D 설계 원칙, 편집 화면 UX 원칙 §7)
  - ADR-057–061, `docs/SPRINT_2C1_REPORT.md`
  - 카메라·조명 카탈로그 문서 1.1.0

### Changed
- 색상 선택 27개 속성: 기본 상태에서는 현재 값만 접어서 보여 주고, 팔레트는 요청할 때 펼칩니다 — TD-13, ADR-058
  - 단일 선택은 고르면 닫힙니다.
  - 의상 상의 페이지 높이: 데스크톱 5,405 → 3,854px, 모바일 6,449 → 4,299px
- 카테고리 탐색을 WAI-ARIA 탐색 트리로 바꿨습니다: 키보드 ↑↓←→·Home·End·Enter, 상태는 접근 가능한 설명으로 전달 — TD-01, ADR-059
- 필드 헤더에 프롬프트 포함·제외 스위치를 두고, 모바일 카테고리 바를 상단에 고정했습니다.
- `PROMPTER_MASTER_PLAN.md` 0.2: Recommended·Visual·Detailed 방향, Sprint 2-C 분할(2-C.1–2-C.4), Sprint 2-D 신설
- 로드맵·기술 부채 갱신: TD-01·TD-02·TD-13 해결, TD-03 → 2-D.1, TD-08·09·10 → 2-C.2, TD-12·14·15 → 2-C.3, TD-11 → 2-C.4, 실제 스크린 리더·다크 모드 미검증 TD-16 → 2-C.4, Sprint 2-B.6 CI 실측 3.12·3.22·3.21초 기록
- 테스트 확장 카탈로그를 0.10.0 → 0.11.0으로 올렸습니다.
- 기존 테스트를 새 구조에 맞췄습니다(검증 내용은 유지):
  - 카테고리 탐색: 버튼 → treeitem
  - 카메라·조명은 하위 분류로 이동
  - 색상은 팔레트를 연 뒤 선택

## [0.9.0] — 2026-11-25 — Sprint 2-B.6: Appearance direction, pose, camera & lighting (승인됨 — Sprint 2-B 카탈로그 구현 완료)

버전 변화: core 카탈로그 0.8.0 → **0.9.0**(ID 변경 없음). ImageSpec 0.3.0, 카탈로그 형식 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0은 그대로.

### Added
- 외모 방향 `person.appearance.direction`(18개 선택지, 다중 + 사용자 정의): Basic에서 인물 선택 직후, Detailed 인상 및 매력에서 같은 값을 편집. 의미가 같은 인상 값은 `covers`로 한 번만 출력
- 인물 › 자세 및 행동 22개 속성(하위 분류 5개) — 누적 인물 상세 속성 300개
- 카메라 15개(거리·롤·구도·여백·피사체 위치·렌즈·초점 거리·투영·원근감·조리개·피사계 심도·초점 대상·초점 선명도·보케·모션 블러), 조명 11개(주광 높이·색상, 보조광, 림 라이트·색상, 환경광, 그림자 강도·경계, 반사광, 볼류메트릭, 광원 가시성)와 조명 색상 팔레트 14색
- 경고 규칙 17개, 테스트 `appearance-pose-catalog`(29)·`camera-lighting-catalog`(29)·`component/pose-camera-lighting`(4)·E2E `pose-camera-lighting`(데스크톱·모바일), 스크린샷 `docs/screenshots/sprint-2b6/`
- 문서: `docs/catalogs/person/pose.md`, `docs/catalogs/shared/{camera,lighting}.md` 1.0.0 APPROVED, `expression.md` 1.1.0, ADR-056, `docs/SPRINT_2B6_REPORT.md`

### Changed
- 피사체 출력 순서 번호 200 → 190(상대 순서·프롬프트 동일)
- 조명 속성 6개에 선택지 12개 추가(기존 ID·문구 유지)
- 테스트 전용 카탈로그에서만 `person_pose`를 DRAFT로 유지(설계 중 화면 검증용), 기존 테스트의 버전·노출 목록·누적 개수 갱신

## [Unreleased] — TD-11: 속성 테스트 비용 절감 (부분 해결, PR #8 병합 `3a340a7`)

출력·진단·안전 결과와 버전 변화 없음.

### Changed
- 결과가 같은 검사 경로 최적화(ADR-055): 조건 평가 무할당, 선택지 적용 조건·정책 제한이 없는 속성 건너뜀, 값 검사 1회 계산·검증기 공유, 안전 검사 리터럴 사전 확인, 문자 체계 감지 ASCII 빠른 경로
- 테스트 헬퍼 `buildSpec`의 전체 맵 반복 복사 제거(기존 방식과 동일함을 새 테스트로 확인), 속성 테스트의 조각별 `expect`를 단일 출처 검사로 통합(같은 조건)
- 500개 무작위 명세 테스트: 단독 1.14초 → 0.81초, CI 빠른 실행기 2.62–3.11초 → 1.79–1.91초, 느린 실행기 3.99–4.02초 → 2.70–3.09초(제한 5초 유지, TD-11은 열림)

## [0.8.0] — 2026-11-24 — Sprint 2-B.5: Expression, impression, makeup, clothing & accessories (승인됨, PR #7 병합 `2abe3f9`)

버전 변화: core 카탈로그 0.7.0 → **0.8.0**(속성 추가만, ID 변경 없음). ImageSpec 0.3.0, 카탈로그 형식 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0은 그대로.

### Added
- 인물 › 표정 및 시각적 인상(표정 10·인상 및 매력 8, 하위 분류 2개), 메이크업 16, 의상 72(전체 설정 8 + 상의 12·하의 10·원피스 및 일체형 13·아우터 11·내의 4·신발 8·양말 및 스타킹 6), 액세서리 18 — 124개 속성, 누적 인물 상세 속성 277개
- 메이크업 팔레트 40색(8그룹), 의상 팔레트 55색(10그룹, 안경테·모자 색상 공유), 소재 31·패턴 23·넥라인 13·칼라 11·소매 길이 7·소매 형태 10·디테일 26·핏 6, 의복 종류 140개(7개 카테고리, 각각 명시적 “없음” 추가, 표시 그룹 + 검색)
- 적용 가능성: 메이크업 없음, 아이라인 없음, 의복 “없음”, 의복 종류별 세부, 플랫 굽, 안경 없음, 모자 없음 — 값 보존·복원
- 경고 규칙 15개(미소 4, 입·치아 1, 눈·시선 1, 타이츠 비침 2, 액세서리 ‘없음’ + 다른 항목 7). 선택지 총 2,017개(속성별 중복 포함)
- 테스트: `expression-makeup-catalog`(31), `clothing-catalog`(37), `accessories-catalog`(24), `component/wardrobe`(5), E2E `wardrobe`(데스크톱·모바일), 스크린샷 `docs/screenshots/sprint-2b5/`
- 문서: `docs/catalogs/person/{expression,makeup,wardrobe,accessories}.md` 1.0.0 APPROVED, ADR-053·054, TD-12·13, `docs/SPRINT_2B5_REPORT.md`(CI 실측 포함 — 속성 테스트 2.67–4.02초, TD-11 우선순위 상향 권장)

### Changed
- 컴파일 반복 계산 제거(ADR-054): 레지스트리 선택지 색인·`lineage` 메모이제이션, 적용 가능성·정책 제한을 컴파일당 1회 계산해 검증기와 공유, 텍스트별 안전 검사 결과 메모이제이션. 출력·진단·안전 결과는 동일
- 기존 테스트: 버전 0.8.0(확장 테스트 카탈로그 0.9.0), 노출 목록·누적 개수, 전체 검색 “정장” 기대값, “선택지 문구 단독 안전 신호 없음” 테스트에 내의 4개 선택지의 기존 미성년자 보호 차단을 명시

## [0.7.0] — 2026-11-24 — Sprint 2-B.4: Body (승인됨, PR #6 병합 `12a17ab`)

버전 변화: core 카탈로그 0.6.0 → **0.7.0**(속성 추가만, ID 변경 없음). ImageSpec 0.3.0, 카탈로그 형식 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0은 그대로.

### Added
- 인물 › 신체 45개 속성, 하위 분류 7개(전체 신체 8·신체 비율 5·목·어깨 5·몸통 9·엉덩이·골반 4·팔·손 7·다리·발 7) — 누적 인물 상세 속성 153개
- 5단계 상대 슬라이더 36개, 형태 칩 8개(선택지 34개, 사용자 정의 4개 속성), 등신 비율 숫자 속성(2–10, 0.5 단위, “N heads tall”)
- 테스트: `body-catalog`(25), `component/body`(3), E2E `body`(데스크톱·모바일), 다중 텍스트 안전 검사 동일성 테스트, 스크린샷 `docs/screenshots/sprint-2b4/`
- 문서: `docs/catalogs/person/body.md` 1.0.0 APPROVED, ADR-052, TD-11, `docs/SPRINT_2B4_REPORT.md`

## [0.6.0] — 2026-11-24 — Sprint 2-B.3: Skin, hair & facial hair (승인됨, PR #5 병합 `7b9b9f2`)

버전 변화: core 카탈로그 0.5.0 → **0.6.0**(속성 추가만, ID 변경 없음). ImageSpec 0.3.0, 카탈로그 형식 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0은 그대로.

### Added
- 인물 › 피부(16)·헤어(23)·수염(6, 새 카테고리) 45개 속성 — 누적 인물 상세 속성 108개
- 피부색 팔레트 20색(자연 12·판타지 8), 헤어 색상 팔레트 38색(6개 그룹, 기본·보조·수염 색상이 공유), 헤어스타일 74개(11개 표시 그룹, 검색)
- 명시적 ‘없음’ 선택지(주근깨·점·주름·흉터·앞머리·레이어·잔머리·수염), 적용 가능성(대머리·삭발·앞머리 없음·주근깨/점/주름 없음·수염 없음)과 값 보존·복원
- 경고 규칙 21개(‘없음’ + 다른 항목 3, 반대 상태 쌍 15, 스타일 ↔ 길이 2, 묶는 위치 ↔ 묶지 않는 스타일 1)
- 테스트: `skin-hair-catalog`(39), `component/skin-hair`(4), E2E `skin-hair`(데스크톱·모바일), 스크린샷 `docs/screenshots/sprint-2b3/`
- 문서: `docs/catalogs/person/{skin,hair,facial-hair}.md` 1.0.0 APPROVED, ADR-050·051, `docs/SPRINT_2B3_REPORT.md`

### Changed
- 비인물 속성 출력 순서 번호(300 이상) +1000(상대 순서 불변, 프롬프트 동일, ADR-051)
- 색상 팔레트 컨트롤이 표시 그룹을 지원(ADR-051), 데이터 도우미 공통화(`person/builders.ts`)

## [0.5.0] — 2026-11-24 — Sprint 2-B.2: Face & facial features (승인됨, PR #4 병합 `26ec465`)

버전 변화: core 카탈로그 0.4.0 → **0.5.0**(속성 추가만, ID 변경 없음). ImageSpec 0.3.0, 카탈로그 형식 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0은 그대로.

### Added
- 인물 › 얼굴(10)·눈(13)·눈썹(8)·코(8)·입술(8) 47개 속성 — 형태 19개(선택지 107개, 사용자 정의 15개), 상대 슬라이더 28개(의미 구간 5개씩), 다중 특징, 색상 팔레트 3개, 사용자 정의 값, 출력 토글
- 반대 특징 경고 규칙 26개, 코 전체 모양 ↔ 콧대 모양 `covers`
- 테스트: `facial-catalog`(34), `component/facial`(5), E2E `facial`(데스크톱·모바일), 스크린샷 `docs/screenshots/sprint-2b2/`
- 문서: `docs/catalogs/person/{face,eyes,eyebrows,nose,lips}.md` 1.0.0 APPROVED, ADR-048·049, TD-10, `docs/SPRINT_2B2_REPORT.md`

### Changed
- 상대(degree) 슬라이더는 숫자 대신 의미 구간 이름만 표시(ADR-049)
- 안전 검사 성능: 신호별 합집합 정규식 사전 필터와 텍스트 1회 정규화(결과 동일, 약 6배 빠름 — 동일성 테스트 포함). 정책·단어 목록·규칙 변경 없음
- 인물 영역: 인물 기본 정보 + 얼굴·눈·눈썹·코·입술 approved, 나머지 9개 영역 DRAFT

## [0.4.0] — 2026-11-24 — Sprint 2-B.1: Person › Identity (승인됨, PR #3 병합 `9dc84b3`)

버전 변화: ImageSpec 0.2.0 → **0.3.0**, 카탈로그 형식 0.3.0 → **0.4.0**, core 카탈로그 0.3.0 → **0.4.0**(ID 변경 없음), 컴파일러 0.3.0 → **0.4.0**, 안전 정책 prompter.baseline 0.1.0 → **0.2.0**(완화 없음).

### Added
- Person › Identity 16개 속성(승인된 초기 제품 카탈로그): 존재 유형, 종족(계층), 인물의 실재 여부, 연령대, 실제 연령, 외형적 연령, 성별, 성별 표현, 국적 및 국가·지역(199 + 무국적, 다중), 민족적 배경, 문화적 배경, 시대적 배경, 직업(표시용 묶음), 서사적 역할, 사회적 지위, 인물 설명 — 선택지 337개, 하위 분류 6개
- 공통 기능(모든 카탈로그 재사용): 프롬프트 포함·제외(`excludedFromPrompt`), 표현 역할(Direct·Context·Metadata), 사용자 정의 값(`CustomEntry`), `quantity` 타입과 단위(년·개월·일), 조건별 표현(`prompt.variants`), `covers` 의미 중복 제거, 표시용 선택지 묶음, 일반적인 조합 제안(`suggestedWhen`), 조건 `derived`·`selectedCount`·`intervalMismatch`
- 공통 연령 해석(`assessAge`, `classifyBeing`): minor·ambiguous·adult·unknown, 인간 사이보그·안드로이드·사용자 정의 존재 구분, 단위 정규화
- 규칙: 실제 연령–연령대 불일치(경고), 무국적 + 특정 국가·지역(경고), 혼합 종족 설명 권장(안내), 이름만 입력한 사용자 정의 값(안내), 비전형 조합(안내)
- 카테고리 초기화와 복원(저장 값 전체 대상, 확인 창, 이후 편집 보호)
- UI: 수량 입력(숫자/범위 + 단위), 사용자 정의 값 편집기(이름·표현 분리, 검색어에서 추가), 계층 검색 경로, 일반적인 조합 우선 정렬, 선택 요약 칩, 프롬프트 포함 토글, 제외 상태 배지, covers·조건별 표현 설명
- 국가·지역 정적 데이터(`regions.ts`, CLDR 48 + 승인된 표시명, 출처·버전 기록)
- Sprint 2-A 실제 데이터 fixture(`tests/fixtures/sprint2a/`)
- 문서: `docs/catalogs/CATALOG_DESIGN_STANDARD.md`(0.2.0), `docs/catalogs/person/identity.md`(1.0.0 APPROVED), `docs/SPRINT_2B1_SPEC_REVIEW.md`, `docs/SPRINT_2B1_REPORT.md`, ADR-038~047, TD-08·09
- 테스트: 단위·컴포넌트 474개(+130), E2E 46건(45 통과, 1 skip: 모바일 전용 테스트의 데스크톱 실행 제외)
- `docs/TECH_DEBT.md`: 남은 기술 부채(TD-01~07)와 권장 처리 시점 추적 (Sprint 2-A 이후, PR #2)

### Changed
- 기존 속성 출력 순서 번호 ×10(상대 순서 불변 — Sprint 0·1·2-A 프롬프트 글자 단위 동일, 회귀 테스트)
- 안전 검사 입력: 프롬프트 제외·적용 불가 값, 사용자 정의 이름·표현, 선택된 모든 선택지 태그, 구조화 연령 신호 포함. 차단 안내에 숨은 출처와 신호 이름 표시
- 인물 카테고리: `person`, `person_identity`(+6 하위)만 approved, 나머지 13개 영역은 DRAFT 유지
- 기존 identity 설계 초안(draft-0)을 승인된 1.0.0 문서로 교체, ATTRIBUTE_TEMPLATE·catalogs README를 공통 규격 기준으로 갱신

## [0.3.0] — 2026-11-24 — Sprint 2-A: Detailed Editor Foundation (승인됨, PR #1 병합 `4825773`)

버전 변화: ImageSpec 0.1.0 → **0.2.0**, 카탈로그 형식 0.2.0 → **0.3.0**, core 카탈로그 0.2.0 → **0.3.0**(ID 변경 없음), 컴파일러 0.2.0 → **0.3.0**. 안전 정책 0.1.0 유지.

### Added
- Detailed Editor: 카탈로그 데이터 기반 카테고리 트리(펼침·접기, 설정 개수, 경고·차단·DRAFT 배지), 한·영·별칭 검색과 바로 이동, 범용 카테고리 패널, 3단·반응형 레이아웃
- 범용 컨트롤: 칩, 드롭다운, 시각 카드(예시 이미지, 확대, 미등록 표시), 검색 목록, 팔레트 색상, 슬라이더(unset 표시, 입력할 때만 저장), 숫자 입력, 범위, 한 줄 텍스트
- 카탈로그 형식 0.3.0: `status`, `control`, `categories`, `aliases`, `swatch`, `restriction`, `parts`, `semantics`, `bands`, `presets`
- 승인 상태 기반 노출(Detailed = Basic 11 + 조명 속성 6, 스타일 축은 보류, 인물 14개 영역은 DRAFT 구조)
- 복합 프리셋: 적용 계획(new/change/same/inapplicable/restricted, 유지되는 설정, 예상 충돌), 덮어쓰기 확인, 비어 있는 항목만 적용, 세션 내 마지막 1회 되돌리기(사용자 편집 보호)
- ImageSpec 0.2.0 `origin`(프리셋 출처), 0.1.0 → 0.2.0 무손실 마이그레이션
- 의미 단위 컴파일: 같은 의미는 한 번 출력, 직접 선택 우선, 조명 프리셋 8종 분해(Sprint 1 문구 보존), 실제 충돌 규칙 `backlight-vs-direction`
- 정책 제한: 비활성과 사유 표시, 도메인 검증 오류, 출력 차단(모든 출력 경로)
- 모바일 하단 고정 도구 모음과 미리보기 패널(Basic·Detailed)
- 테스트 전용 카탈로그와 E2E 전용 빌드(`/e2e-fixtures`), `pnpm verify:isolation`
- `docs/catalogs/` 템플릿과 DRAFT 16개, Sprint 1 실제 데이터 fixture
- 테스트: 단위·컴포넌트 344개(+70), E2E 40건(39 통과, 1 skip: 모바일 전용 테스트의 데스크톱 실행 제외)

### Changed
- Detailed 탭: 예정 안내 → 실제 편집기 ("예정" 배지는 Precision에만)
- 범위 컨트롤: 최소·최대가 모두 유효할 때만 저장(Sprint 0 결함 수정). 숫자 입력은 유효하지 않은 값을 저장하지 않음
- GitHub Actions: checkout·setup-node·upload-artifact v7, pnpm/action-setup v5(node24), 격리 검증 단계, `feature/**` 트리거

### Fixed
- 모바일 Detailed 레이아웃에서 편집 영역 폭이 0이 되던 CSS 우선순위 문제(E2E로 발견)
- 정책 제한으로 차단될 때 미리보기에 사유가 표시되지 않던 문제

## [0.2.0] — 2026-11-24 — Sprint 1: Basic Composer (승인됨)

버전 변화: core 카탈로그 0.1.0 → **0.2.0**, 카탈로그 형식 0.1.0 → **0.2.0**, 컴파일러 0.1.0 → **0.2.0**, 안전 정책 **0.1.0** 신설. ImageSpec **0.1.0 유지**, 저장 envelope v1 유지.

### Added
- Basic Composer: 피사체 기반 상황별 선택지, 검색 가능한 스타일 프리셋 25종(한·영 라벨, 별칭), 구도 11종(피사체별), 보는 방향, 카메라 각도, 장소 19종(계층·검색), 배경 처리, 분위기(복수 선택, 개수 제한 없음), 조명 프리셋 12종, 화면비 8종(권장값 제안 + 구조화 파라미터)
- 스타일 독립 축 5개, 조명 독립 속성 6개 (Detailed tier, 분류 정보 전용)
- 항목별 프롬프트 출처, 항목별 진단, 충돌 규칙 7개(해결 안내 + 사용자 클릭으로만 동작하는 해제 버튼)
- 비적용 선택 유지와 전환 알림(적용 안 됨 / 다시 적용됨)
- 안전 정책 계층 `prompter.baseline@0.1.0` (구조화 태그 + 한·영 어휘), 모든 프롬프트 출력 경로에 단일 관문, 프롬프트 .txt 내보내기
- 혼합 언어 알림 (비라틴 문자 체계)
- 카탈로그 ID 마이그레이션(`style.visual` → `style.preset`, 사유 기록), 마이그레이션 전 원본 백업과 로그
- 사용자 확인 기반 부분 복구 (로컬 복원, JSON 가져오기)
- 초기화 직전 상태 복원 (세션 내 스냅샷 1개)
- 알림 자동 숨김(비중요 알림), `pnpm verify`, `.github/workflows/ci.yml` (GitHub Actions)
- Sprint 0 실제 데이터 fixture, 테스트 274개(단위·컴포넌트), E2E 26개(13개 × 데스크톱·모바일), 스크린샷

### Changed
- 가져오기 결과가 `valid | recoverable | invalid` 분석 결과로 바뀜 (이전: 전부 아니면 전무)
- 손상된 저장 데이터 중 일부가 유효하면 전체를 폐기하지 않고 복구를 제안
- 컴파일 결과에 `parameters`, `blocked`, `safety`, 안전 정책 메타 추가

### Security
- 차단된 명세는 미리보기, 복사, .txt 내보내기가 불가능함. 명세 원본과 JSON은 보존됨
- 외부 네트워크 호출 0 (단위 테스트 + E2E 네트워크 감시)

## [0.1.0] — 2026-11-24 — Sprint 0: Foundation (승인됨)

### Added
- 독립 Next.js 16 + TypeScript(strict) 프로젝트, ESLint, Vitest, Playwright 구성
- 프레임워크와 무관한 도메인 계층: ImageSpec(Zod), AttributeSelection, AttributeDefinition, CatalogRegistry, SpecValidator, PromptCompiler(generic-en), Persistence(JSON, localStorage), ImageProviderAdapter 인터페이스와 비활성 구현
- 스키마 마이그레이션 훅(`SPEC_MIGRATIONS`, 현재 비어 있음)
- core 샘플 카탈로그 v0.1.0: 자유 입력, 피사체 8종, 스타일 8종 (ko/en)
- Basic 모드: 피사체, 스타일, 자유 입력, 실시간 미리보기, 복사, 초기화, JSON 내보내기·가져오기, 로컬 자동 저장·복원
- Detailed / Precision 모드: "후속 개발 예정" 안내와 공유 명세 요약
- UI 다국어(한국어 기본, English)
- 테스트: Vitest 96개(단위와 컴포넌트), Playwright E2E 8개(데스크톱과 모바일)
- 문서: README, ARCHITECTURE, DECISIONS, ROADMAP, SPRINT_0_REPORT, CHANGELOG

### Changed
- 패키지 매니저를 npm에서 pnpm 10.12.1로 전환했습니다(`packageManager` 필드, `pnpm-lock.yaml`). 의존성 버전은 변경 없음(ADR-014)

### Security
- 클라이언트 네트워크 호출 0. 소스에 네트워크 API가 없는지 자동 테스트로 확인. API 키 불필요
