# Changelog

이 프로젝트의 변경 이력입니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

버전 축은 서로 독립적입니다:
- 앱(`package.json`): 0.1.0
- ImageSpec 스키마(`IMAGE_SPEC_SCHEMA_VERSION`): 0.1.0
- 카탈로그 형식(`CATALOG_FORMAT_VERSION`): 0.1.0 / core 카탈로그 내용(`prompter.core`): 0.1.0
- 컴파일러(`COMPILER_VERSION`): 0.1.0 / generic-en adapter: 0.1.0
- 로컬 저장 envelope(`STORAGE_FORMAT_VERSION`): 1

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
