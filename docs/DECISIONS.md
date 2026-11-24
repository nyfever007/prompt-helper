# 기술적 결정 기록 (ADR)

상태 구분:
- **확정**: 마스터 계획서 §12 "Agreed" 항목에 근거한 결정
- **채택(검토 필요)**: Sprint 0에서 구현에 적용했으나 마스터 계획서상 "Proposed"이거나 이번에 새로 내린 결정. 사용자 검토 후 확정
- **미해결**: 결정이 필요한 문제 (문서 하단)

> 마스터 계획서 §11은 `docs/decisions/` 폴더를 제안하지만, Sprint 0 지시문이 `docs/DECISIONS.md` 단일 파일을 요구하므로 지시문을 따랐습니다(ADR-013).

---

## ADR-001 독립 저장소 — **확정**
- 결정: `~/projects/promptmaker`를 독립된 git 저장소로 초기화했습니다(`git init -b main`). WHY 저장소는 열람하거나 수정하지 않았습니다.
- 근거: 이 폴더는 원래 홈 디렉터리(`~`) 전체를 추적하는 상위 git 저장소 안에 있었습니다. 계획서 §15 "Fresh prompter repo"를 충족하려면 별도 저장소가 필요했습니다.
- 비고: 커밋은 하지 않았습니다(사용자 승인 대기). 폴더 이름은 계획서의 `prompter/` 대신 기존 `promptmaker`를 유지했고, 패키지 이름은 `prompter`입니다.

## ADR-002 기술 스택 — **채택(검토 필요)**
- 결정: Next.js 16.4 (App Router, Turbopack) · React 19.3 · TypeScript **5.9** (strict + `noUncheckedIndexedAccess`) · Zod 4 · ESLint **9** (`eslint-config-next`) · Vitest 5 (+ Testing Library, jsdom) · Playwright 1.65.
- 근거: 지시문의 기본 스택이며 기술적 장애는 없었습니다.
- 대안 검토:
  - TypeScript 7.0(Go 네이티브)은 npm `latest`이지만 `typescript-eslint` 8.x의 지원 범위(`<6.1`) 밖이라 lint 파이프라인이 보장되지 않습니다. 그래서 5.9를 썼습니다.
  - ESLint 10은 `eslint-plugin-react`(eslint-config-next 의존성)의 지원 범위(`^9.7`까지) 밖이라 9.39를 썼습니다.
  - 생태계가 TS 7과 ESLint 10을 지원하면 업그레이드합니다.
- 버전은 `--save-exact`로 고정해 재현성을 확보했습니다.

## ADR-003 ImageSpec 형태: 속성 ID로 찾는 단일 selections 맵 — **채택(검토 필요)**
- 결정: `selections: Record<AttributeId, AttributeSelection>`. 속성 ID는 점으로 구분한 경로입니다(`subject.kind`, 향후 `person.skin.moles`).
- 대안 A: 계획서 §5 예시처럼 도메인별 중첩 타입 객체(`person.body.bust`)를 쓰는 방식. 새 속성을 추가할 때마다 스키마, 컴파일러, UI 타입을 함께 바꿔야 해서 "카탈로그 확장 시 핵심 코드 무수정" 요구와 충돌합니다.
- 대안 B: unset을 `{ state: "unset" }` 항목으로 명시하는 방식. unset 표현이 두 가지(키 없음, unset 항목)가 되어 정규형이 흐려집니다.
- 근거: unset이 **키 없음** 한 가지로만 표현됩니다. 맵 구조라 모든 속성 쌍의 독립성을 일반적으로 테스트할 수 있습니다. 계층 구조는 ID 경로와 카탈로그의 `domain`/`groupId`가 맡습니다.
- 영향: 계획서 §5 JSON 예시와 형태가 다릅니다(계획서도 "illustrative, not final schema"라고 명시).

## ADR-004 자기 기술형 값과 2단계 검증 — **채택**
- 결정: 값에 `kind`(single, multi, number, range, text)를 포함합니다. 검증은 1단계 구조 검증(카탈로그 없이 Zod)과 2단계 의미 검증(카탈로그 기준)으로 나눕니다.
- 근거: 카탈로그를 바꾸거나 버전이 달라도 파일을 구조적으로 읽을 수 있고, 어떤 속성·옵션이 문제인지 정확히 보고할 수 있습니다.
- 정책: 가져오기와 복원은 전부 아니면 전무입니다. 오류가 하나라도 있으면 거부하고 현재 명세를 유지합니다. 카탈로그 **ID**가 다르면 오류, **버전**만 다르면 경고입니다.

## ADR-005 기본값은 "제안"일 뿐 — **확정(계획서 원칙 2)**
- 결정: `AttributeDefinition.defaultValue`는 UI가 "권장 기본값 사용" 버튼으로 제안하는 값입니다. `createEmptySpec`과 컴파일러는 이 값을 적용하지 않습니다. 사용자가 선택하면 일반 선택과 똑같이 저장됩니다.
- 근거: unset과 명시적 기본값을 데이터 수준에서 구분합니다(테스트 3번).

## ADR-006 결정론적 규칙 기반 컴파일러 — **채택**
- 결정:
  - 출력 순서는 카탈로그의 `(order, id)` 순서입니다. 객체 키 순서에 의존하지 않으며, 복수 선택도 카탈로그 순서로 출력합니다.
  - 템플릿 치환은 `split("{value}").join(…)`으로 합니다. 사용자 텍스트의 `$&`, `{value}` 등이 해석되지 않도록 하기 위해서입니다.
  - 공백 정규화와 문장 종결 부호 보정은 **출력에만** 적용합니다. 저장된 명세는 입력한 그대로 유지됩니다.
  - `COMPILER_VERSION`, adapter id/version, catalog id/version, spec 스키마 버전을 출력 메타에 포함합니다.
  - adapter 경계: `PromptAdapter`(텍스트 형식)와 `ImageProviderAdapter`(API 호출)를 분리합니다.
  - generic-en adapter는 fragment마다 한 문장을 만들고 중요도는 표현하지 않습니다. 중요도가 설정되어 있으면 "무시됨" 진단을 보고합니다(계획서 §6 "Explain unsupported controls").
- 근거: 계획서 §6, 지시문 §6.

## ADR-007 적용 불가 선택값은 유지하되 컴파일하지 않음 — **채택**
- 결정: `appliesWhen`을 만족하지 않는 속성(예: 피사체를 풍경으로 바꾼 뒤의 표정)도 명세에 그대로 둡니다. 이 값은 컴파일에서 제외하고 `selection.inactive` 진단과 UI 안내를 표시합니다.
- 근거: "한 속성의 변경이 다른 속성을 변경하지 않는다"는 원칙을 지키고, 피사체를 되돌렸을 때 사용자가 다시 입력하지 않아도 됩니다.

## ADR-008 로컬 저장 — **채택**
- 결정: `localStorage` 키 `prompter:v1:workspace`에 `{ kind, storageVersion: 1, savedAt, spec }` envelope로 저장합니다. 불러올 때 전체를 다시 검증하고, 실패하면 원본을 `…:corrupt-backup`에 보관한 뒤 빈 명세로 시작합니다.
- 모드와 UI 언어는 `prompter:v1:ui`에 따로 저장합니다. 보기 설정은 명세에 포함하지 않습니다.
- 저장소는 `KeyValueStore` 인터페이스로 주입할 수 있습니다(테스트용 메모리 저장소, 향후 IndexedDB나 서버 저장소).
- 자동 저장은 hydration 상태(ref 아님)를 기준으로 동작합니다. 복원 전의 빈 명세가 저장 데이터를 덮어쓰지 않게 하기 위해서입니다.

## ADR-009 카탈로그는 TypeScript 데이터 + 로드 시 Zod 검증 — **채택**
- 결정: `src/domain/catalog/catalogs/core.ts`(`satisfies CatalogInput`). 카탈로그 파일 형식 버전(`formatVersion`)과 내용 버전(`version`)을 분리합니다.
- 근거: 작성 시점에 타입 검사를 받으면서도, 같은 스키마로 외부 JSON 카탈로그를 불러올 수 있습니다(`CatalogRegistry.create(unknown)`).
- 규칙: 옵션이나 속성 ID를 삭제·변경하거나 프롬프트 문구를 바꾸면 `version`을 올립니다. ID 변경 마이그레이션은 아직 없습니다(미해결 Q4).

## ADR-010 Provider 경계 — **확정(계획서 §9)**
- 결정: `ImageProviderAdapter` 인터페이스와 `disabledImageProvider`(네트워크 I/O 없음)만 제공합니다. `src/`에서 `fetch`, `XMLHttpRequest`, `WebSocket`, API SDK import를 금지하는 테스트를 두었습니다.

## ADR-011 다국어 구조 — **채택(검토 필요)**
- 결정: 카탈로그 텍스트는 `LocalizedText`(영어 필수, 다른 locale은 선택이며 없으면 영어로 대체)로 표현합니다. UI 문자열은 `src/i18n/messages.ts` 사전(ko, en)에 둡니다. 진단은 `code`로 번역하고 번역이 없으면 영어 메시지를 씁니다.
- 프롬프트 출력은 영어만 지원합니다(adapter `outputLanguage: "en"`).
- **기본 UI 언어는 `ko`로 정했습니다**(제안, 미해결 Q2).

## ADR-012 스타일링 — **채택**
- 결정: CSS 프레임워크 없이 전역 CSS 하나와 CSS 변수(라이트/다크)를 씁니다.
- 근거: Sprint 0은 디자인 완성도보다 기능 검증이 우선이므로 의존성을 최소화했습니다.

## ADR-013 문서 위치 — **채택**
- 결정: 마스터 계획서는 루트의 `PROMPTER_MASTER_PLAN.md`에 그대로 보존합니다(계획서 §11의 `docs/MASTER_PLAN.md`로 옮기지 않음). ADR은 `docs/DECISIONS.md` 단일 파일에 기록합니다.
- 근거: 지시문 §9 "기존 계획서 보존", "docs/DECISIONS.md 생성".

## ADR-014 패키지 매니저: pnpm — **확정 (사용자 요청, 2026-11-24)**
- 결정: npm에서 **pnpm 10.12.1**로 전환했습니다. `package.json`의 `packageManager: "pnpm@10.12.1"`(corepack 호환)으로 버전을 고정했습니다. lockfile은 `pnpm-lock.yaml` 하나만 둡니다(`package-lock.json` 삭제).
- 방법: `pnpm import`로 기존 `package-lock.json`을 변환해 해석된 의존성 버전을 그대로 유지했습니다. 이후 `pnpm install --frozen-lockfile`로 설치했습니다.
- 영향: `check` 스크립트와 Playwright `webServer` 명령을 pnpm 기준으로 바꿨습니다(`pnpm build && pnpm exec next start`). pnpm 10은 의존성 설치 스크립트를 기본으로 막지만, 막힌 스크립트는 없었습니다(`pnpm ignored-builds` 결과 "None").
- 검증: `pnpm check`(타입 검사, lint, 테스트 96개, 빌드), `pnpm test:e2e`(8개), `pnpm dev`(HTTP 200), `pnpm audit`(알려진 취약점 없음)를 모두 통과했습니다.

---

## 확정 / 제안 요약

| 구분 | 항목 |
|---|---|
| 확정 | 독립 프로젝트, pnpm 사용, unset/명시적 기본값 구분, 기본값 자동 적용 금지, provider 경계와 유료 호출 금지, Basic/Detailed/Precision이 하나의 명세 공유 |
| 채택(검토 필요) | 기술 스택 버전(TS 5.9, ESLint 9), selections 맵 형태, 컴파일러 출력 형식(라벨형 문장), 기본 UI 언어 ko, 저장 정책(손상 시 전체 폐기 + 백업) |

## 미해결 문제

| ID | 질문 | 영향 | 제안 |
|---|---|---|---|
| Q1 | 자유 입력이 한국어 등 비영어일 때 영어 프롬프트에 그대로 넣을 것인가, 번역할 것인가? (현재: 입력 그대로 삽입) | 프롬프트 품질 | 유료 LLM 없이 해결할 수 없으므로, Sprint 1에서 "입력 언어 경고"와 정책을 결정 |
| Q2 | 기본 UI 언어 (현재 ko) | 대상 사용자 | 타깃 시장 결정 후 확정 |
| Q3 | generic-en 출력 형식: 라벨형("Main subject: …") vs 자연어 문장 | 모델 준수율 | Sprint 5 실측 전까지 라벨형 유지, adapter 추가로 A/B |
| Q4 | 카탈로그 ID 변경·삭제 시 기존 명세 마이그레이션 방식 | 하위 호환 | 카탈로그별 alias/rename 맵 도입 |
| Q5 | 저장 데이터 일부가 무효일 때 부분 복구 여부 (현재: 전체 폐기 + 백업) | 데이터 손실 체감 | 무효 항목만 제외하고 사용자에게 알리는 부분 복구 UI |
| Q6 | 안전 정책(미성년자 성적 대상화·노골적 콘텐츠 금지, 계획서 원칙 7)의 강제 위치 | 인물 속성 확장 전 필수 | 카탈로그 규칙(`severity: error`) + 자유 입력 검사 계층을 Sprint 1~2에 설계 |
| Q7 | 첫 커밋, 원격 저장소, CI 구성 | 협업 | 사용자 승인 후 진행 |
