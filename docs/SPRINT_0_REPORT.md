# Sprint 0 — Foundation 보고서

- 작성일: 2026-11-24
- 상태: **승인됨 (2026-11-24).** 이 보고서 기준으로 Sprint 0 완료가 승인되었습니다.
- 범위: Text-to-Image만 대상입니다. Image-to-Image와 동영상은 보류했습니다. 유료 API는 호출하지 않았습니다.

## 1. 구현된 기능

### 도메인 (`src/domain`, React/Next 의존성 없음)
- **ImageSpec v0.1.0**(Zod strict 스키마): `kind`, `schemaVersion`, `task`, `catalog{id,version}`, `selections`
- **AttributeSelection**: 값 타입 5종(single, multi, number, range, text), `source`, 예약 필드 `priority`
- **AttributeDefinition / CatalogRegistry**: 다국어 라벨, tier, 정렬 순서, 템플릿, 모델별 표현(`byAdapter`), 계층형 옵션, 별칭, 시각 예시 메타데이터, 적용 조건, 충돌·의존성 규칙, 제안 기본값. 로드할 때 무결성을 검사하고 불변으로 고정
- **core 카탈로그 v0.1.0 (샘플)**: 자유 입력 1개, 피사체 8종, 스타일 8종. 라벨은 ko/en
- **SpecValidator**: 구조 검증 → 마이그레이션 훅 → 카탈로그 의미 검증 → 규칙 진단
- **PromptCompiler v0.1.0** + `generic-en` adapter: 결정론적 동작, 출처 fragment 추적, 버전 메타 포함
- **Persistence**: 정규화된 JSON export, 전부 아니면 전무인 import(1MB 제한), localStorage envelope 저장과 손상 데이터 백업
- **ProviderAdapter**: 인터페이스와 비활성 구현(네트워크 0)

### UI (Basic 최소 기능)
| 요구 기능 | 구현 |
|---|---|
| 피사체 선택 | ✅ 단일 선택 칩 + 선택 해제 |
| 이미지 스타일 선택 | ✅ 단일 선택 칩 + 선택 해제 |
| 자유 입력 | ✅ textarea (2000자, 글자 수 표시) |
| 실시간 프롬프트 미리보기 | ✅ 입력 즉시 갱신, 문장별 출처, 진단, 버전 표시 |
| 프롬프트 복사 | ✅ Clipboard API + 대체 방식 |
| 설정 초기화 | ✅ 확인 대화상자 후 모든 속성을 unset으로 |
| JSON 내보내기 / 가져오기 | ✅ 파일 다운로드 / 파일 선택, 오류 목록 표시 |
| 로컬 저장 및 복원 | ✅ 자동 저장, 새로고침하면 복원, 모드와 언어도 복원 |
| Basic / Detailed / Precision | ✅ 탭 3개. Detailed와 Precision은 "후속 개발 예정" 안내 + 같은 명세의 요약 |
| 다국어 UI | ✅ 한국어(기본) / English 전환. 프롬프트는 항상 영어 |

## 2. 프로젝트 디렉터리 구조

```text
promptmaker/                    (독립 git 저장소, 커밋 없음)
├─ PROMPTER_MASTER_PLAN.md      마스터 계획서 (원본 보존)
├─ README.md · CHANGELOG.md · AGENTS.md(Next.js 자동 생성)
├─ package.json · pnpm-lock.yaml · tsconfig.json · next.config.ts · eslint.config.mjs
├─ vitest.config.mts · playwright.config.ts · .env.example · .gitignore
├─ docs/  ARCHITECTURE.md · DECISIONS.md · ROADMAP.md · SPRINT_0_REPORT.md
├─ src/
│  ├─ app/          layout.tsx · page.tsx · globals.css
│  ├─ components/   PrompterApp · PromptPreview · SpecToolbar · format
│  │  ├─ controls/  AttributeField (카탈로그 데이터 기반 범용 컨트롤)
│  │  └─ modes/     ModePanel · AttributeList · SpecSummary
│  ├─ state/        useWorkspace · useUiPrefs · workspaceReducer
│  ├─ i18n/         messages (ko, en)
│  └─ domain/
│     ├─ shared/      diagnostics · ids · localized
│     ├─ spec/        schema · values · factory · operations · migrations
│     ├─ catalog/     schema · registry · conditions · valueCheck · catalogs/core
│     ├─ validation/  specValidator
│     ├─ compiler/    compiler · types · adapters/generic
│     ├─ persistence/ json · storage
│     └─ providers/   types · disabled
├─ tests/
│  ├─ fixtures/     catalogs (확장 카탈로그) · specs
│  ├─ unit/         spec · unset · independence · compiler · json · catalog · storage · provider
│  └─ component/    app (jsdom)
└─ e2e/             basic-flow (Playwright)
```
규모: `src` 약 2,400줄, 테스트와 E2E 약 1,270줄.

## 3. 주요 기술적 결정 (상세: [DECISIONS.md](DECISIONS.md))

1. **unset = selections에 키 없음.** 표현이 하나뿐이라 모호하지 않고, 독립성을 모든 속성 쌍에 대해 일반적으로 테스트할 수 있습니다(ADR-003).
2. **속성 ID로 찾는 단일 selections 맵.** 계획서 §5의 중첩 예시 대신 이 구조를 택해, 카탈로그를 확장해도 핵심 코드를 바꾸지 않습니다(ADR-003).
3. **값에 `kind` 포함 + 2단계 검증.** 가져오기와 복원은 전부 아니면 전무입니다(ADR-004).
4. **기본값은 제안만 합니다.** 자동으로 적용하지 않습니다(ADR-005).
5. **결정론적 컴파일러.** 카탈로그 순서로 출력하고, 템플릿 치환에서 사용자 텍스트가 해석되지 않으며, 정규화는 출력에만 적용합니다(ADR-006).
6. **적용 불가 값은 유지하되 컴파일하지 않습니다**(ADR-007).
7. **TypeScript 5.9 / ESLint 9 선택.** TS 7과 ESLint 10은 lint 생태계가 아직 지원하지 않습니다(ADR-002).

## 4. 실행 방법

```bash
pnpm install
pnpm dev                  # http://localhost:3000
pnpm check                # typecheck + lint + test + build
pnpm exec playwright install chromium && pnpm test:e2e
```

## 5. 자동 테스트 결과

검증 환경: macOS (Darwin 25.6), Node 22.23.1, **pnpm 10.12.1**. 모든 명령은 2026-11-24에 실행했습니다.
처음에는 npm 10.9.8로 검증했고, pnpm으로 전환한 뒤 아래 검사를 모두 다시 실행해 같은 결과를 확인했습니다(ADR-014).

| 검사 | 결과 |
|---|---|
| `pnpm typecheck` | ✅ 종료 코드 0 |
| `pnpm lint` (`--max-warnings=0`) | ✅ 종료 코드 0 |
| `pnpm test` (Vitest) | ✅ **96 / 96 통과** (파일 9개) |
| `pnpm build` | ✅ 성공 (`/` 정적 프리렌더) |
| `pnpm test:e2e` (Playwright) | ✅ **8 / 8 통과** (테스트 4개 × 데스크톱·모바일) |
| `pnpm audit` | 알려진 취약점 없음 |

### 필수 테스트 대응표

| # | 요구 항목 | 테스트 파일 (테스트 수) | 핵심 검증 |
|---|---|---|---|
| 1 | ImageSpec 생성 및 유효성 | `unit/spec.test.ts` (5) | 빈 명세 형태, 구조 오류 8종, 의미 오류 3종, 길이 제한 |
| 2 | unset 상태 유지 | `unit/unset.test.ts` (8 중 5) | 빈 명세의 빈 프롬프트, 자동 채움 없음, 해제하면 키 제거, 빈 텍스트는 unset, round-trip 후에도 unset |
| 3 | 명시적 기본값과 unset 구분 | `unit/unset.test.ts` (8 중 3), `component/app.test.tsx` | 기본값 미적용, 선택하면 별도 항목으로 저장되고 출력도 다름, 해제하면 unset으로 돌아감 |
| 4 | 속성 간 독립성 | `unit/independence.test.ts` (6) | 확장 카탈로그 8개 속성의 **모든 쌍**에서 참조 동일성, 동결된 입력, 조건부 속성 유지 |
| 5 | 결정론적 생성 | `unit/compiler.test.ts` (12) | 고정 기대 출력(golden), 20회 반복, 키 순서와 클릭 순서 무관, **속성 부분집합 256개 전수**에서 "fragment 외 텍스트 없음", 인젝션 안전성 |
| 6 | JSON round-trip | `unit/json.test.ts` (22 중 4) | 무손실, 재-export 바이트 동일, 값 타입 5종 전부, 정규 키 순서 |
| 7 | 잘못된 JSON·스키마 | `unit/json.test.ts` (22 중 18) | 15개 입력 유형, 크기 제한, 마이그레이션 훅, 마이그레이션 순환 감지 |
| 8 | 카탈로그 확장성 | `unit/catalog.test.ts` (17), `component/app.test.tsx` | 데이터만 추가해도 레지스트리, 검증기, 컴파일러, **UI**가 동작. 잘못된 카탈로그 11종 거부 |
| 9 | 모드 전환 시 설정 유지 | `component/app.test.tsx` | Basic → Detailed → Precision → Basic에서 값과 프롬프트 동일 |
| 10 | 로컬 저장 및 복원 | `unit/storage.test.ts` (10), `component/app.test.tsx` | 저장/복원, 손상 데이터 4종 백업, 쓰기·읽기 실패, 다시 마운트하면 복원, 실제 `window.localStorage` 사용 |
| — | 유료/네트워크 호출 0 | `unit/provider.test.ts` (3) | 비활성 provider에서 fetch 0회, `src/`에 네트워크 API 없음, 도메인에 UI import 없음 |

## 6. 실제 브라우저 검증 결과

Playwright로 `next build`와 `next start` 결과(프로덕션 빌드)를 대상으로 실행했습니다. 프로젝트는 Desktop Chrome과 Pixel 7(모바일 뷰포트, Chromium) 두 가지입니다.

| 시나리오 | 데스크톱 | 모바일 |
|---|---|---|
| 칩 클릭으로 피사체·스타일 선택, 자유 입력, 미리보기 갱신 | ✅ | ✅ |
| 프롬프트 복사 후 실제 클립보드 내용 일치 | ✅ | ✅ |
| Detailed / Precision 안내와 공유 명세 요약, 프롬프트 유지 | ✅ | ✅ |
| 새로고침 후 값과 프롬프트 복원 | ✅ | ✅ |
| JSON 내보내기 파일명 형식과 내용 | ✅ | ✅ |
| 초기화 취소는 유지, 확인은 모두 unset | ✅ | ✅ |
| 잘못된 파일 가져오기는 오류 표시, 상태 불변 | ✅ | ✅ |
| 내보낸 파일 다시 가져오기로 동일 프롬프트, 새로고침 후에도 유지 | ✅ | ✅ |
| 키보드만으로 옵션 선택 (Space, 화살표) | ✅ | ✅ |
| 영어 UI 전환 시 명세와 프롬프트 유지 | ✅ | ✅ |
| 가로 스크롤(overflow) 없음 | ✅ | ✅ |
| **로컬 서버 외 네트워크 요청 0건** | ✅ | ✅ |

추가 확인:
- `pnpm dev`로 개발 서버를 띄우고 HTTP 200 응답과 페이지 렌더링을 확인했습니다.
- 데스크톱과 모바일 스크린샷을 직접 보고 레이아웃을 확인했습니다. 모바일 탭 배지가 잘리는 문제를 발견해 수정했고("예정"으로 축약), 수정 후 E2E를 다시 통과했습니다.

**검증하지 않은 항목**: Safari와 Firefox(WebKit, Gecko), 실제 모바일 기기, 다크 모드 화면, 스크린 리더 사용성, 실제 이미지 생성 모델에서의 프롬프트 효과(계획상 Sprint 5).

## 7. 발견된 문제 및 기술 부채

| 구분 | 내용 | 권장 조치 |
|---|---|---|
| 도구 | Next.js 16.4의 `next dev`가 실행할 때마다 `AGENTS.md`를 생성·갱신합니다(삭제해도 다시 생김) | 그대로 커밋하거나 `next.config`의 `agentRules: false`로 끄기. 결정 필요 |
| 제품 | 비영어 자유 입력이 영어 프롬프트에 그대로 들어갑니다 | 미해결 Q1 |
| 제품 | 안전 정책(계획서 원칙 7)을 아직 강제하지 않습니다. 현재 카탈로그에는 위험 옵션이 없지만 자유 입력은 검사하지 않습니다 | 인물 속성 확장 전에 설계 (Q6) |
| 제품 | generic-en의 라벨형 출력("Main subject: …")은 모델 준수율이 검증되지 않았습니다 | Sprint 5 실측 (Q3) |
| 저장 | 저장 데이터 일부만 무효여도 전체를 폐기합니다(백업은 보관) | 부분 복구 (Q5) |
| 저장 | 카탈로그 ID 변경을 마이그레이션할 수단이 없습니다 | rename 맵 (Q4) |
| 저장 | 입력할 때마다 동기적으로 저장합니다(debounce 없음). 데이터가 작아 현재는 문제 없음 | 명세가 커지면 debounce 적용 |
| UX | "마지막 작업을 복원했습니다" 안내가 다른 알림이 뜰 때까지 남아 있습니다 | 자동으로 사라지게 처리 |
| UX | 초기화는 되돌릴 수 없습니다(확인 대화상자만 있음) | 변경 이력과 undo (계획서 §6) |
| UX | 복사 대체 방식이 deprecated API(`execCommand`)를 씁니다 | 최신 브라우저만 지원하기로 하면 제거 |
| 스키마 | `priority`는 스키마에만 있고 UI가 없으며, adapter가 무시합니다(진단으로 보고) | Sprint 3 |
| 스키마 | `position`, `reference` 값 타입이 아직 없습니다(설계된 확장 지점) | Sprint 3 |
| 도구 | 설치 중 pnpm이 **ESLint 9.39.5 지원 종료(deprecated)** 경고를 표시했습니다. ESLint 10은 `eslint-plugin-react`가 아직 지원하지 않습니다(ADR-002) | eslint-config-next가 ESLint 10을 지원하면 업그레이드 |
| 테스트 | E2E가 실행마다 프로덕션 빌드를 수행합니다(약 10초). Playwright 1.65는 Chromium 1255가 필요해 이번에 새로 내려받았습니다 | CI 캐시 |
| 저장소 | git 저장소만 만들었고 커밋은 하지 않았습니다 | 승인 후 첫 커밋 (Q7) |

## 8. 미구현 기능 (의도적으로 범위 밖)

- Detailed와 Precision의 실제 편집 기능 (안내와 요약만 있음)
- Sprint 1의 Basic 항목: 구도, 배경, 화면비, 분위기·조명 프리셋, 상황별 옵션, 스타일 검색
- 프리셋과 변경점 표시, 변경 이력과 undo, 프롬프트 수동 편집(override)
- negative prompt, 모델별 adapter(OpenAI 등)
- 참조 이미지, 시각 예시 이미지 자산
- 이미지 생성 API 연동, 비용 가드, 실행 이력
- Image-to-Image, 동영상
- 서버 저장소, 계정, 협업

## 9. Sprint 1 권장 작업 (승인 필요)

1. **미해결 질문 Q1(자유 입력 언어), Q2(기본 UI 언어), Q6(안전 정책) 결정.** 인물 관련 옵션을 늘리기 전에 필요합니다.
2. 계획서 §3 Basic 항목을 **카탈로그 데이터로** 추가합니다: 구도(framing), 배경(setting), 화면비(`defaultValue` 제안 포함), 분위기·조명 빠른 프리셋. 핵심 코드는 바꾸지 않습니다.
3. `appliesWhen`으로 상황별 옵션을 구현합니다(예: 피사체가 풍경일 때 인물용 구도 숨김). 충돌 규칙 샘플(예: 클로즈업 + 전신)도 추가합니다.
4. 옵션 검색: 스타일 목록이 늘어날 것에 대비해 `aliases`를 활용합니다.
5. "초보자가 상세 설정 없이 프롬프트를 완성할 수 있다"는 Sprint 1 완료 기준에 맞춰 사용성 점검과 E2E 시나리오를 확장합니다.
6. 기술 부채 정리: 복원 안내 자동 숨김, 저장 부분 복구, `AGENTS.md` 처리 방침.
7. CI(GitHub Actions 등)에서 `pnpm check`와 E2E를 실행합니다. 첫 커밋과 원격 저장소 연결이 전제입니다.

## 10. 마스터 계획서 §15 체크리스트

- [x] Fresh `prompter` repo; WHY untouched (폴더 이름은 `promptmaker`, ADR-001)
- [x] `npm install` / `npm run dev` work → pnpm 동등 명령(`pnpm install` / `pnpm dev`)으로 확인
- [x] Basic / Detailed / Precision tabs render
- [x] A subject and style can be selected
- [x] Preview updates from the same structured spec
- [x] JSON export and import round-trip
- [x] Unset stays unset; no implicit sexualization or body-shape assumptions
- [x] `npm run test`, `npm run lint`, and `npm run typecheck` pass → `pnpm test` / `pnpm lint` / `pnpm typecheck`로 확인
- [x] No live API key required; no paid API calls

## 11. 지시문과 마스터 계획서 사이의 차이 (판단 내역)

| 항목 | 계획서 | 지시문 | 처리 |
|---|---|---|---|
| 계획서 파일 이름 | `PROMPTER_MASTER_PLAN.md` | `plan.md`로 언급 | 같은 문서로 판단하고 원본을 보존 |
| 문서 위치 | `docs/MASTER_PLAN.md`, `docs/decisions/` | 원본 보존, `docs/DECISIONS.md` | 지시문을 따름 (ADR-013) |
| 저장소 이름 | `prompter/` | 명시 없음 | 기존 폴더 `promptmaker` 유지, 패키지 이름은 `prompter` |
| spec 예시 형태 | 중첩 객체 + `{state:"unset"}` | 확장성 요구 | 평면 selections 맵 (ADR-003, 계획서도 "not final"이라고 명시) |
