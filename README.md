# Prompter

사용자가 상상한 이미지를 구조화된 명세(**ImageSpec**)로 정밀하게 정의하고, 이를 이미지 생성 모델용 프롬프트로 변환하는 **Visual Prompt Design Tool**입니다.

- 제품 마스터 계획: [PROMPTER_MASTER_PLAN.md](PROMPTER_MASTER_PLAN.md) (원본 보존, 수정 금지)
- 현재 단계: **Sprint 0 — Foundation (승인됨, 2026-11-24)**. 상세 결과는 [docs/SPRINT_0_REPORT.md](docs/SPRINT_0_REPORT.md)를 참고하세요.
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
pnpm check          # typecheck → lint → test → build 일괄 실행
```

실제 브라우저 E2E (Playwright, 데스크톱 Chromium + 모바일 Pixel 7 뷰포트):

```bash
pnpm exec playwright install chromium   # 최초 1회, 브라우저 다운로드
pnpm test:e2e                  # 프로덕션 빌드 후 3210 포트에서 실행
```

E2E 실행 중 스크린샷을 남기려면 `E2E_SCREENSHOT_DIR=/some/dir pnpm test:e2e`.

## 디렉터리 개요

```text
src/
  domain/        UI 프레임워크와 무관한 도메인 로직 (React/Next import 금지, ESLint로 강제)
    spec/        ImageSpec 스키마, 값 타입, 생성/정규화, 불변 연산, 마이그레이션 훅
    catalog/     카탈로그 스키마, CatalogRegistry, 조건 평가, core 샘플 카탈로그
    validation/  SpecValidator (구조 + 카탈로그 기반 의미 검증)
    compiler/    PromptCompiler + PromptAdapter (generic-en)
    persistence/ JSON export/import, 로컬 저장소
    providers/   ImageProviderAdapter 인터페이스 + 비활성 구현
  state/         React 상태 hook (단일 ImageSpec 소유, 자동 저장)
  components/    UI (카탈로그 데이터 기반 범용 컨트롤)
  i18n/          UI 문자열 (ko, en)
  app/           Next.js App Router 진입점
tests/           Vitest 단위·컴포넌트 테스트, fixture
e2e/             Playwright 브라우저 테스트
docs/            아키텍처, 결정 기록, 로드맵, 스프린트 보고서
```

## 문서

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 시스템 구조와 책임 분리
- [docs/DECISIONS.md](docs/DECISIONS.md): 기술적 결정과 근거 (확정 / 제안 / 미해결)
- [docs/ROADMAP.md](docs/ROADMAP.md): 단계별 개발 현황
- [docs/SPRINT_0_REPORT.md](docs/SPRINT_0_REPORT.md): Sprint 0 구현 및 검증 결과
- [CHANGELOG.md](CHANGELOG.md): 변경 이력

## 참고

- `AGENTS.md`는 Next.js 16.4의 `next dev`가 자동으로 생성하는 파일입니다. Next.js 버전별 문서 위치를 안내합니다.
- 로컬 저장 키: `prompter:v1:workspace` (명세), `prompter:v1:ui` (모드, 언어). 브라우저 개발자 도구에서 삭제하면 초기 상태로 돌아갑니다.
