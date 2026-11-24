# Changelog

이 프로젝트의 변경 이력입니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

버전 축은 서로 독립적입니다:
- 앱(`package.json`): 0.1.0
- ImageSpec 스키마(`IMAGE_SPEC_SCHEMA_VERSION`): 0.1.0
- 카탈로그 형식(`CATALOG_FORMAT_VERSION`): 0.1.0 / core 카탈로그 내용(`prompter.core`): 0.1.0
- 컴파일러(`COMPILER_VERSION`): 0.1.0 / generic-en adapter: 0.1.0
- 로컬 저장 envelope(`STORAGE_FORMAT_VERSION`): 1

## [Unreleased] — Sprint 2-B.2: Face & facial features (구현 완료, 검토 대기)

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
