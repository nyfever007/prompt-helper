# Prompter

사용자가 상상한 이미지를 구조화된 명세(**ImageSpec**)로 정밀하게 정의하고, 이를 이미지 생성 모델용 프롬프트로 변환하는 **Visual Prompt Design Tool**입니다.

- 제품 마스터 계획: [PROMPTER_MASTER_PLAN.md](PROMPTER_MASTER_PLAN.md) (원본 보존, 수정 금지)
- 현재 단계: **Sprint 2-A — Detailed Editor Foundation (승인·main 병합 완료, 2026-11-24)**. 상세 결과는 [docs/SPRINT_2A_REPORT.md](docs/SPRINT_2A_REPORT.md), 남은 기술 부채는 [docs/TECH_DEBT.md](docs/TECH_DEBT.md)를 참고하세요. 다음 단계(Sprint 2-B)는 카탈로그 설계 문서 승인 후 시작합니다.
- 이 빌드는 이미지 생성 API나 유료 LLM API를 **호출하지 않습니다**. API 키도 필요 없습니다.

## 요구 사항

| 항목 | 버전 |
|---|---|
| Node.js | ≥ 20.9 (검증: 22.23.1) |
| pnpm | 10.x (검증: 10.12.1, `packageManager` 필드로 고정) |
| 브라우저 E2E (선택) | Playwright Chromium (아래 설치 명령) |

## 설치

이 프로젝트는 **pnpm**을 사용합니다(`pnpm-lock.yaml`). npm, yarn lockfile은 두지 않습니다.

```bash
pnpm install
```

pnpm이 없다면 `corepack enable`을 실행하세요. `package.json`의 `packageManager` 필드에 맞는 버전이 자동으로 사용됩니다.

## 실행

```bash
pnpm dev            # 개발 서버: http://localhost:3000
pnpm build          # 프로덕션 빌드
pnpm start          # 빌드 결과 실행: http://localhost:3000
```

## 검사 및 테스트

```bash
pnpm typecheck      # TypeScript strict 검사 (tsc --noEmit)
pnpm lint           # ESLint (경고 0개 허용)
pnpm test           # Vitest: 단위 + 컴포넌트(jsdom) 테스트
pnpm check          # typecheck → lint → test → build → verify:isolation
pnpm verify         # check + 브라우저 E2E (CI와 같은 구성)
pnpm verify:isolation  # 일반 빌드에 테스트 카탈로그가 없는지 검증 (pnpm build 후)
```

실제 브라우저 E2E (Playwright, 데스크톱 Chromium + 모바일 Pixel 7 뷰포트):

```bash
pnpm exec playwright install chromium   # 최초 1회, 브라우저 다운로드
pnpm test:e2e                  # 프로덕션 빌드 후 3210 포트에서 실행
```

E2E는 **E2E 전용 빌드**(`PROMPTER_E2E_FIXTURES=1`, 출력 `.next-e2e`)로 실행됩니다. 이 빌드에만 테스트 전용 카탈로그 페이지(`/e2e-fixtures`)가 존재합니다. 일반 `pnpm build`에서는 해당 페이지가 404이고 번들에 포함되지 않습니다(docs/DECISIONS.md ADR-031).

E2E 실행 중 스크린샷을 남기려면 `E2E_SCREENSHOT_DIR=/some/dir pnpm test:e2e`.

## 디렉터리 개요

```text
src/
  domain/        UI 프레임워크와 무관한 도메인 로직 (React/Next import 금지, ESLint로 강제)
    spec/        ImageSpec 스키마, 값 타입, 생성/정규화, 불변 연산, 마이그레이션 훅
    catalog/     카탈로그 스키마(0.2.0), CatalogRegistry, 조건·적용 여부, 검색, ID 마이그레이션, core 카탈로그
    validation/  SpecValidator (구조 + 카탈로그 의미 검증), 가져오기·복원 분석(정상/부분 복구/불가)
    safety/      로컬 안전 정책 계층 (정책 데이터 + 평가기)
    compiler/    PromptCompiler + PromptAdapter (generic-en), 출력 관문, 혼합 언어 감지
    persistence/ JSON export/import, 로컬 저장소(백업 키, 마이그레이션 로그)
    presets/     복합 프리셋: 적용 계획 → 확인 → 적용 → 되돌리기
    providers/   ImageProviderAdapter 인터페이스 + 비활성 구현
  state/         React 상태 hook (단일 ImageSpec 소유, 자동 저장)
  components/    UI (카탈로그 데이터 기반 범용 컨트롤, Detailed Editor, 모바일 도구 모음)
  testing/       ⚠ 테스트 전용 카탈로그와 E2E fixture 페이지 (일반 빌드에서는 제거됨)
  i18n/          UI 문자열 (ko, en)
  app/           Next.js App Router 진입점
tests/           Vitest 단위·컴포넌트 테스트, fixture (Sprint 0 실제 데이터 포함)
e2e/             Playwright 브라우저 테스트
docs/            아키텍처, 결정 기록, 로드맵, 스프린트 보고서, 스크린샷
  catalogs/      카탈로그 설계 문서 (템플릿 + 영역별 DRAFT)
scripts/         빌드 검증 스크립트 (테스트 카탈로그 격리)
.github/         GitHub Actions CI (pnpm verify와 같은 구성)
```

## 문서

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 시스템 구조와 책임 분리
- [docs/DECISIONS.md](docs/DECISIONS.md): 기술적 결정과 근거 (확정 / 제안 / 미해결)
- [docs/ROADMAP.md](docs/ROADMAP.md): 단계별 개발 현황
- [docs/SPRINT_0_REPORT.md](docs/SPRINT_0_REPORT.md): Sprint 0 구현 및 검증 결과
- [docs/SPRINT_1_REPORT.md](docs/SPRINT_1_REPORT.md): Sprint 1 구현 및 검증 결과
- [docs/SPRINT_2A_REPORT.md](docs/SPRINT_2A_REPORT.md): Sprint 2-A 구현 및 검증 결과
- [docs/catalogs/](docs/catalogs/README.md): 카탈로그 설계 문서
- [CHANGELOG.md](CHANGELOG.md): 변경 이력

## 참고

- `AGENTS.md`는 Next.js 16.4의 `next dev`가 자동으로 생성하는 파일입니다. Next.js 버전별 문서 위치를 안내합니다.
- 로컬 저장 키: `prompter:v1:workspace` (명세), `prompter:v1:ui` (모드, 언어). 브라우저 개발자 도구에서 삭제하면 초기 상태로 돌아갑니다.
  - 원본 보존용: `prompter:v1:workspace:corrupt-backup` (손상 데이터), `prompter:v1:workspace:pre-migration-backup` (마이그레이션 전), `prompter:v1:migration-log` (ID 변경 기록)
- 이 버전이 내보내는 JSON은 ImageSpec 0.2.0입니다. Sprint 0·1 앱은 읽지 못합니다(이 앱은 0.1.0을 읽음).
- 안전 정책은 로컬 키워드 기반 기준선입니다. 한계는 [DECISIONS ADR-019](docs/DECISIONS.md)에 적었습니다.
