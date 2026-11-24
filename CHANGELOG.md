# Changelog

이 프로젝트의 변경 이력입니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

버전 축은 서로 독립적입니다:
- 앱(`package.json`): 0.1.0
- ImageSpec 스키마(`IMAGE_SPEC_SCHEMA_VERSION`): 0.1.0
- 카탈로그 형식(`CATALOG_FORMAT_VERSION`): 0.1.0 / core 카탈로그 내용(`prompter.core`): 0.1.0
- 컴파일러(`COMPILER_VERSION`): 0.1.0 / generic-en adapter: 0.1.0
- 로컬 저장 envelope(`STORAGE_FORMAT_VERSION`): 1

## [Unreleased] — Sprint 1: Basic Composer (2026-11-24, 검토 대기)

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
