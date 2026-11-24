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

# Sprint 1 결정 (2026-11-24, 승인된 구조 변경 포함)

## ADR-015 카탈로그 형식 0.2.0 — **확정 (승인됨)**
- 결정: 선택지별 `appliesWhen`, 조건 `noneOf`와 `whenUnset`(pass/fail), 계층 매칭(하위 선택지는 상위 조건을 만족), `classification`, `policyTags`, `parameterValue`, 속성의 `prominence`·`searchable`·`prompt.channel`, 규칙의 `guidance`(필수)·`actions`, 카탈로그 `migrations`를 추가했습니다.
- 근거: 상황별 선택지, 독립 축 분류, 실행 가능한 충돌 안내, ID 변경 이력을 **데이터로** 표현하기 위해서입니다.
- 영향: 번들 카탈로그만 해당합니다. 0.1.0 형식 카탈로그 파일은 거부합니다. ImageSpec은 0.1.0 그대로입니다(ADR-016).

## ADR-016 ImageSpec 0.1.0 유지 — **확정 (승인됨)**
- 결정: 저장된 명세의 형태는 바꾸지 않았습니다. 새 기능은 모두 카탈로그와 계산 계층에 두었습니다.
- 검증: Sprint 0 코드로 생성해 보존한 실제 출력물(`tests/fixtures/sprint0/`)로 JSON 가져오기와 localStorage 복원 모두 무손실임을 테스트했습니다.

## ADR-017 스타일: Basic은 단일 프리셋, 내부는 독립 축 — **확정 (#1 수정 반영)**
- 결정: Basic UI는 검색 가능한 `style.preset` 하나만 노출합니다. 내부에는 독립 축 속성 `style.medium`·`realism`·`technique`·`movement`·`aesthetic`을 Detailed tier로 정의했습니다. 각 프리셋은 `classification`으로 축 값을 **참고 정보로만** 가집니다.
- 규칙: 분류 정보는 다른 속성을 설정하지 않고 프롬프트 문장도 만들지 않습니다(테스트). UI는 "프리셋을 고르면 ‘이미지 스타일’ 항목만 설정됩니다"라고 안내합니다.
- ID 변경: 0.1.0의 `style.visual`을 `style.preset`으로 바꿨습니다(사유: 스타일이 여러 축으로 확장되어 Basic 목록이 프리셋임을 명확히 함). 마이그레이션으로 자동 변환되고 사유가 기록됩니다.
- 보류: 축 편집기와 대규모 카탈로그 확장은 Sprint 4입니다.

## ADR-018 조명: 빠른 프리셋 + 독립 속성 — **확정 (#2 수정 반영)**
- 결정: Basic은 `lighting.preset`(12종)만 노출합니다. 내부에 `lighting.source`·`direction`·`softness`·`intensity`·`color_temperature`·`contrast`를 독립 속성(Detailed tier)으로 정의했습니다.
- 프리셋을 적용하면 **`lighting.preset` 하나만** 바뀝니다. 프리셋이 의미하는 조명 속성은 `classification`으로 표시만 하며 적용하지 않습니다. 관련 없는 속성은 바뀌지 않습니다(테스트).
- 대안(기각): 프리셋 적용 시 6개 축 속성에 값을 써 넣는 "패치형"은, Basic에서 보이지 않는 속성을 바꾸게 되어 "선택하지 않은 속성 자동 확정 금지" 원칙과 충돌합니다. 패치형 프리셋(계획서 §5 Preset)은 변경 목록을 보여주는 UI와 함께 Detailed 단계에서 재검토합니다.

## ADR-019 안전 정책 계층 — **확정 (승인 범위), 한계 명시**
- 구조: `src/domain/safety`. 카탈로그 검증과 독립되어 있고, 정책 데이터에 버전이 있습니다(`prompter.baseline@0.1.0`).
  - 신호(signal): 선택지 `policyTags`와 어휘(영어는 단어 경계, 한국어는 부분 문자열 + 예외 구문, 나이 숫자 정규식)에서 얻습니다.
  - 규칙: 신호 그룹의 AND/OR 조합입니다.
- 차단 범주: ① 미성년자 또는 나이가 모호한 표현 + 성적·노출 표현(승인된 보수적 규칙 #7) ② 노골적 성적 내용 ③ 나체.
- 성적 신호가 **아닌 것**: 체형(`body.*`), 의상 핏(`fit.*`), 노출 범위(`coverage.*`), 수영복, "shirtless", "curvy" 등. 성인의 매력 표현("sexy", "sensual", "lingerie")은 단독으로는 허용하고, 미성년 신호와 결합할 때만 차단합니다.
- 적용 경로: 컴파일된 출력(선택지 태그 + 모든 fragment + adapter 최종 문자열)을 검사합니다. 가져오기와 복원은 데이터를 보존하고, 그 명세의 출력도 같은 관문으로 차단됩니다. 미리보기, 복사, .txt 내보내기는 `getPromptOutput`만 사용합니다. 명세 JSON 저장과 내보내기는 허용합니다(승인 #8).
- 원본 보존: 사용자 텍스트를 고쳐서 통과시키지 않습니다.
- **한계 (검증되지 않은 범위)**:
  - 의미 이해가 없어 은어, 우회 철자(s3xy), 띄어쓰기 변형, 다른 언어(일본어·중국어 등), 문맥(예: 의학·예술 맥락)을 판별하지 못합니다.
  - 한국어 부분 문자열 매칭에서 오탐이 생길 수 있습니다. 확인된 경우는 예외 목록으로 처리했지만 모두 찾았다는 보장은 없습니다.
  - "girl"/"소녀" 등 나이가 모호한 단어에 대한 보수적 규칙이 성인 대상 표현을 차단할 수 있습니다(의도된 트레이드오프).
  - 이미지 자체는 검사하지 않으며, 어떤 이미지 provider의 정책 준수도 보장하지 않습니다.
  - 폭력, 실존 인물, 혐오 등 다른 범주는 아직 정의하지 않았습니다(구조만 있음).

## ADR-020 언어 정책 — **확정**
- 한국어가 기본 UI 언어이고 영어 UI를 유지합니다. 구조화된 선택은 영어로 컴파일합니다.
- 자유 입력은 명세에 **원문 그대로** 보존합니다. 출력에서는 공백만 정리하고 번역하지 않습니다.
- 출력에 비라틴 문자 체계(한글, 한자, 가나, 키릴 등)가 섞이면 `prompt.mixed_language` 경고를 표시합니다. 라틴 문자를 쓰는 다른 언어(프랑스어 등)는 감지하지 못합니다(한계).
- AI 번역과 다듬기는 Sprint 5로 보류합니다.

## ADR-021 카탈로그 ID 마이그레이션 — **확정 (승인됨)**
- 카탈로그에 `fromVersion → toVersion` 단계별 `renameAttribute`/`renameOption`과 사유(다국어)를 선언합니다. 레지스트리가 체인의 연속성, 진행 방향, 최종 대상 존재를 검증합니다.
- 적용 원칙: 선언된 변경만 적용합니다. 대상이 이미 있으면 덮어쓰지 않고 충돌로 보고합니다. 알 수 없는 속성·선택지는 추측해 연결하거나 삭제하지 않고 복구 단계에서 사용자에게 보여줍니다.
- 기록: 적용된 변경마다 (변경 전 → 변경 후, 버전, 사유)를 남깁니다. 알림으로 표시하고, 로컬 복원 시 `prompter:v1:migration-log`에 저장하며, 변경 전 원본은 `:pre-migration-backup`에 둡니다.
- 마이그레이션 자체는 결정론적이고 무손실인 ID 변경이므로 확인 없이 적용하고 알립니다. 손실이 생길 수 있는 복구만 확인을 받습니다(ADR-022).

## ADR-022 사용자 확인 기반 부분 복구 — **확정 (승인됨)**
- `analyzeSpecInput` → `valid | recoverable | invalid`. recoverable이면 **제안된 명세**와 함께 제외 항목 목록(경로, 원본 값, 사유)을 반환합니다.
- 로컬 복원: 원본을 `:corrupt-backup`에 보관합니다. 사용자가 결정하기 전에는 자동 저장을 중지합니다(원본 키를 덮어쓰지 않음). 선택지는 [제외하고 복구] / [원본 다운로드] / [복구하지 않고 새로 시작]입니다.
- 가져오기: [제외하고 가져오기 (현재 작업 대체)] / [원본 다운로드] / [가져오기 취소]이며, 원본 파일은 변경하지 않습니다.
- 다중 선택 값에 무효한 선택지가 하나라도 있으면 **값 전체를 제외**합니다(일부만 고치는 것은 의도를 바꾸는 행위로 판단).

## ADR-023 초기화 되돌리기 — **확정 (#10 수정 반영)**
- 초기화 직전 명세의 스냅샷 1개를 세션 메모리에 보관합니다. 이후 편집해도 스냅샷은 유지됩니다.
- 복원할 때 현재 작업이 있으면 덮어쓴다는 확인을 받습니다. 빈 명세를 초기화하면 기존 스냅샷을 지키고, 다음에 내용이 있는 상태에서 초기화하면 스냅샷을 교체합니다.
- 새로고침하면 사라지며, 전체 이력과 영구 버전 관리는 후속 스프린트로 보류합니다.

## ADR-024 Basic 화면 구성 — **채택**
- 카탈로그 그룹 순서대로 섹션을 만듭니다. 각 그룹은 `prominence: primary` 항목을 먼저 보여주고, `secondary`는 "추가 설정"으로 펼칩니다. 설정된 값이 있으면 자동으로 펼쳐집니다.
- UI를 단순화하려고 데이터 표현력을 제한하지 않습니다. 화면 배치는 데이터(`prominence`, `searchable`, `tier`)로 결정합니다.
- 적용되지 않는 속성과 선택지는 숨기되, 이미 선택된 값은 점선과 안내로 표시하고 남겨 둡니다.
- 알림: 복원·성공·전환 알림은 자동으로 사라지고, 오류·마이그레이션·복구 결정은 사용자가 닫을 때까지 유지합니다.

## ADR-025 로컬 검증 명령과 CI — **채택 (원격 미연결)**
- `pnpm verify` = `pnpm check` + `pnpm test:e2e`.
- `.github/workflows/ci.yml`을 준비했습니다. Sprint 1 완료 후 사용자 지시로 원격 저장소(`origin` = github.com/nyfever007/prompt-helper)를 연결하고 push했으며, 이후 GitHub Actions에서 실행됩니다.
- 이 개발 환경의 명령 sandbox 안에서는 Chromium이 시작되지 않아(macOS Mach 포트 권한), E2E는 sandbox 밖에서 실행했습니다. 일반 개발자 환경과 CI에는 해당하지 않습니다.

---

## 확정 / 제안 요약

| 구분 | 항목 |
|---|---|
| 확정 | 독립 프로젝트, pnpm, unset/명시적 기본값 구분, 기본값·분류 정보 자동 적용 금지, provider 경계와 유료 호출 금지, 모드 간 하나의 명세 공유, 카탈로그 형식 0.2.0, ImageSpec 0.1.0 유지, 스타일·조명 독립 축 구조, 안전 정책 계층과 범위, 언어 정책, ID 마이그레이션, 확인 기반 부분 복구, 단일 초기화 스냅샷 |
| 채택(검토 필요) | 기술 스택 버전(TS 5.9, ESLint 9), selections 맵 형태, 라벨형 generic-en 출력, Basic 화면 구성(ADR-024), 다중 선택 값 전체 제외 정책 |

## 미해결 문제

| ID | 질문 | 상태 / 제안 |
|---|---|---|
| Q1 | 비영어 자유 입력 처리 | **결정됨 (ADR-020)**: 원문 보존, 번역 없음, 혼합 언어 경고. AI 번역은 Sprint 5 |
| Q2 | 기본 UI 언어 | **결정됨**: 한국어 |
| Q3 | generic-en 출력 형식(라벨형 vs 자연어) | 미해결 — Sprint 5 실측 후 결정 |
| Q4 | 카탈로그 ID 변경 마이그레이션 | **결정됨 (ADR-021)** |
| Q5 | 부분 복구 | **결정됨 (ADR-022)** |
| Q6 | 안전 정책 강제 위치 | **결정됨 (ADR-019)**. 추가 범주(폭력, 실존 인물 등)는 미해결 |
| Q7 | 원격 저장소와 CI 활성화 | **결정됨**: origin 연결과 push(2026-11-24, 사용자 지시) |
| Q8 | 나체 표현을 예술 맥락(고전 누드화 등)에서 허용할지 | 미해결 — 현재 보수적으로 차단 |
| Q9 | 패치형 프리셋(여러 속성 동시 설정 + 변경 목록 표시) 도입 시점 | 미해결 — Detailed 단계에서 재검토 (ADR-018) |
| Q10 | 모바일에서 미리보기가 긴 페이지 맨 아래에 있는 문제 | 미해결 — 고정 미리보기 바 등 검토 |
| Q11 | 초기화 스냅샷을 새로고침 이후에도 유지할지 | 미해결 — 현재 세션 메모리만 |
