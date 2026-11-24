# Sprint 1 — Basic Composer 보고서

- 작성일: 2026-11-24
- 상태: **구현 완료, 검토 대기.** Sprint 2는 승인 전까지 시작하지 않습니다.
- 기준: [PROMPTER_MASTER_PLAN.md](../PROMPTER_MASTER_PLAN.md)(변경 없음), Sprint 1 지시문, 구현 전 검토 보고서, Sprint 1 승인서(#1·#2·#10·#11 수정 반영)
- 커밋: Sprint 0 기준선(`cb86d24`)과 Sprint 1을 각각 커밋했고, 사용자 지시에 따라 원격 `origin`(https://github.com/nyfever007/prompt-helper)에 push했습니다(2026-11-24).
- 유료 API 호출 0건, 이미지 생성 0건, 외부 네트워크 요청 0건(E2E 네트워크 감시로 확인)

## 1. 구현된 기능

### 1.1 Basic Composer (모두 카탈로그 데이터로 구성)
| 항목 | 내용 | 비고 |
|---|---|---|
| 이미지 설명 (자유 입력) | 원문 그대로 보존, 2,000자 | 혼합 언어 알림 |
| 피사체 | 8종 (인물, 여러 사람, 동물, 사물·제품, 탈것, 건축물, 풍경, 추상) | 다른 항목의 선택지를 결정 |
| 이미지 스타일 | **검색 가능한** 프리셋 25종, 한·영 라벨과 별칭, 하위 분류 4건 | 독립 축 분류 정보는 참고용 표시 |
| 구도 | 11종, 선택지마다 피사체별 적용 조건 | 예: 인물 8종, 풍경 3종 |
| 보는 방향 / 카메라 각도 | 별개 속성("추가 설정"), 각각 해당하는 피사체에만 적용 | 서로 바꾸지 않음(테스트) |
| 장소 / 환경 | 19종, 계층(실내·도시·자연 하위), 검색 가능 | |
| 배경 처리 | 5종("추가 설정"), 장소와 별개 | |
| 분위기 | 13종 복수 선택, 개수 제한 없음 | 상반된 조합 경고 3종 |
| 조명 (빠른 프리셋) | 12종, 조명 속성 6개를 참고 정보로 표시 | 프리셋 항목만 설정됨 |
| 화면비 | 8종, unset 가능, 권장값 1:1은 제안만 | `aspectRatio` 구조화 파라미터 |
| 미리보기 | 실시간, 복사, **.txt 내보내기**, 문장별 출처, 파라미터, 버전 메타 | 모든 출력은 단일 관문을 거침 |
| 항목별 출처·진단 | 항목마다 "프롬프트 반영" 문장, 비적용·차단 사유, 충돌 안내와 해제 버튼 | |

### 1.2 동작 원칙
- **unset 지원**: 모든 선택 항목은 unset 가능하고, 권장값과 분류 정보는 자동으로 적용되지 않습니다.
- **비적용 처리**: 상황에 맞지 않게 된 선택은 지우지 않고 유지합니다. 프롬프트에서는 제외하고, 항목 안내와 전환 알림을 띄웁니다. 다시 적용 가능해지면 자동으로 복귀합니다.
- **충돌 처리**: 충돌 7종(버즈아이+방향, 스튜디오+햇빛, 단색 배경+장소, 분위기 3종, 역광+얼굴 클로즈업)은 관련된 두 항목 모두에 안내를 표시합니다. 해결 동작은 사용자가 눌러야만 실행되며 자동 해결은 없습니다.
- **결정론과 무손실**: 같은 입력이면 같은 출력이 나오고, JSON round-trip은 무손실입니다.

### 1.3 언어 정책
- 한국어가 기본 UI 언어이고 영어 UI를 유지합니다. 구조화된 선택은 영어로 컴파일합니다.
- 자유 입력은 번역하지 않고 원문 그대로 보존합니다. 비라틴 문자 체계가 섞이면 경고합니다.

### 1.4 안전 정책 기준선 (`prompter.baseline@0.1.0`)
- **차단 범주**:
  - 미성년자 또는 나이가 모호한 표현 + 성적·노출 표현
  - 노골적인 성적 내용
  - 나체
- **신호를 얻는 곳**:
  - 선택지의 정책 태그(구조화)
  - 자유 입력과 컴파일된 문장의 한·영 어휘(예외 구문 포함)
  - adapter의 최종 출력
- **적용 경로**: 컴파일, 미리보기, 복사, .txt 내보내기에 같은 관문을 적용합니다. 가져온 명세와 복원된 명세도 출력 단계에서 같은 규칙으로 차단됩니다.
- **원본 보존**: 명세 원본과 JSON 저장·내보내기는 허용하며 텍스트를 고치지 않습니다.
- **과잉 차단 방지**: 성인 패션, 체형, 의상 핏, 노출 범위, 매력 표현, 아동이 등장하는 일반 장면, 한국어 오탐 사례(전라도, 성교육, 칼로리, 아기자기 등) 27건이 허용됨을 테스트했습니다.

### 1.5 기술 부채 해소
| 항목 | 구현 |
|---|---|
| 카탈로그 ID 마이그레이션 | 단계별 rename 표와 사유. Sprint 0 데이터(`style.visual`)를 자동 변환하고 기록하며, 원본은 백업 |
| 부분 복구 | 제외 항목(경로, 원본 값, 사유)을 표시하고, 확인 전에는 적용하지 않음. 결정 전에는 자동 저장 중지, 원본 다운로드 가능 |
| 초기화 되돌리기 | 세션 내 스냅샷 1개. 이후 편집해도 유지되며, 덮어쓸 때 확인을 받음 |
| 알림 자동 숨김 | 복원·성공·전환 알림은 자동으로 닫힘. 오류·마이그레이션·복구 결정은 유지 |
| 로컬 검증과 CI | `pnpm verify`, `.github/workflows/ci.yml` (원격 연결 후 GitHub Actions에서 실행) |

## 2. 카탈로그 구성 (core 0.2.0, 형식 0.2.0)

| 그룹 | 속성 ID | 유형 | tier / 노출 | 선택지 수 |
|---|---|---|---|---|
| 무엇을 그릴까요 | `intent.description` | text | basic / 핵심 | — |
| 〃 | `subject.kind` | single | basic / 핵심 | 8 |
| 스타일 | `style.preset` | single, 검색 | basic / 핵심 | 25 |
| 스타일 분류 축 | `style.medium`, `style.realism`, `style.technique`(multi), `style.movement`, `style.aesthetic`(multi) | 독립 축 | detailed (편집기 Sprint 4) | 11 / 4 / 7 / 5 / 7 |
| 구도와 카메라 | `composition.framing` | single, 선택지별 조건 | basic / 핵심 | 11 |
| 〃 | `composition.view_direction` | single | basic / 추가 설정 | 4 |
| 〃 | `camera.angle` | single | basic / 추가 설정 | 5 |
| 장소와 배경 | `scene.setting` | single, 계층, 검색 | basic / 핵심 | 19 |
| 〃 | `scene.background` | single | basic / 추가 설정 | 5 |
| 분위기와 조명 | `mood.tone` | multi, 제한 없음 | basic / 핵심 | 13 |
| 〃 | `lighting.preset` | single | basic / 핵심 | 12 |
| 조명 속성 | `lighting.source`, `.direction`, `.softness`, `.intensity`, `.color_temperature`, `.contrast` | 독립 속성 | detailed (편집기는 Detailed 단계) | 7 / 6 / 3 / 3 / 4 / 3 |
| 출력 | `output.aspect_ratio` | single, 파라미터 채널 | basic / 핵심 | 8 |

새 속성 19개(Sprint 0의 3개 → 22개, `style.visual`은 `style.preset`으로 이름만 변경)와 규칙 7개, 마이그레이션 1건입니다. 모든 목록은 확장 가능한 시작점입니다.

**#11 검증**: fixture로 피사체 하위 분류(개·고양이 → 동물, 자동차 → 탈것, 탑 → 건축물, 음식 → 사물)를 추가했습니다. 상위 분류의 적용 조건이 그대로 상속되고, 코드 변경 없이 화면에도 나타나는 것을 테스트했습니다.

## 3. 주요 설계 결정 (상세: [DECISIONS.md](DECISIONS.md) ADR-015~025)

1. **카탈로그 형식 0.2.0 + ImageSpec 0.1.0 유지 (ADR-015/016)**: 새 표현력은 모두 카탈로그와 계산 계층에 두었습니다. 기존 저장 데이터는 무손실로 호환됩니다.
2. **스타일과 조명은 "프리셋 하나 + 참고용 분류 정보" (ADR-017/018)**: 프리셋을 고르면 그 항목 하나만 바뀝니다. 축 속성에 값을 써 넣는 "패치형" 방식은, Basic에서 보이지 않는 속성을 바꾸게 되어 채택하지 않았습니다. 패치형은 Detailed 단계에서 변경 목록 UI와 함께 재검토합니다(Q9).
3. **선택지 단위 적용 조건과 계층 매칭**: 피사체 하위 분류가 늘어나도 조건을 고칠 필요가 없습니다. 피사체를 아직 고르지 않았으면(`whenUnset: pass`) 선택지를 제한하지 않습니다.
4. **안전 정책은 독립 계층 + 단일 출력 관문 (ADR-019)**: 원본 데이터는 보존하고 출력만 막습니다. 체형, 핏, 노출 범위, 매력은 서로 다른 정책 태그 축으로 구분했습니다.
5. **마이그레이션은 자동 적용하되 기록하고, 손실 가능성이 있는 복구는 확인을 받음 (ADR-021/022)**: 다중 선택 값에 무효한 선택지가 하나라도 있으면 값 전체를 제외합니다(일부만 고치면 의도가 바뀌므로).
6. **초기화 스냅샷은 이후 편집에도 유지 (ADR-023)**.

## 4. 변경 파일

`cb86d24`(Sprint 0 기준선) 대비, 커밋하지 않은 상태입니다.

**새 파일 — 도메인**
- `src/domain/catalog/applicability.ts`, `migrate.ts`, `search.ts`, `semver.ts`
- `src/domain/compiler/language.ts`, `output.ts`
- `src/domain/safety/` (`types.ts`, `baselinePolicy.ts`, `evaluate.ts`, `index.ts`)
- `src/domain/validation/analyze.ts`

**새 파일 — UI**
- `src/components/controls/OptionPicker.tsx`
- `src/components/modes/BasicComposer.tsx`
- `src/components/Notices.tsx`, `RecoveryPanel.tsx`, `diagnostics.ts`, `download.ts`

**새 파일 — 테스트**
- `tests/unit/` — `search`, `rules`, `safety`, `migration`, `recovery`, `language`, `reset-undo` (`.test.ts`)
- `tests/fixtures/sprint0/` (Sprint 0 코드로 생성한 실제 데이터 4종 + README)
- `e2e/composer.spec.ts`

**새 파일 — 기타**
- `.github/workflows/ci.yml`
- `docs/screenshots/sprint-1/` (18장)
- `docs/SPRINT_1_REPORT.md`

**수정**
- 도메인: `catalog/schema.ts`, `registry.ts`, `conditions.ts`, `catalogs/core.ts`, `compiler/compiler.ts`, `compiler/types.ts`, `persistence/json.ts`, `persistence/storage.ts`, `validation/specValidator.ts`, `shared/diagnostics.ts`, `index.ts`
- UI: `PrompterApp.tsx`, `PromptPreview.tsx`, `SpecToolbar.tsx`, `controls/AttributeField.tsx`, `modes/ModePanel.tsx`, `format.ts`, `app/globals.css`, `i18n/messages.ts`
- 상태: `state/useWorkspace.ts`, `state/workspaceReducer.ts`
- 테스트: 기존 Sprint 0 테스트 8개 파일(의미는 유지하고 0.2.0 구조에 맞춤), `tests/fixtures/catalogs.ts`, `e2e/basic-flow.spec.ts`
- 설정과 문서: `package.json`(`verify`), `README.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`

**삭제**
- `src/components/modes/AttributeList.tsx` (`BasicComposer`로 대체)

## 5. 자동 테스트 결과

환경: macOS (Darwin 25.6), Node 22.23.1, pnpm 10.12.1. 2026-11-24에 실행했습니다.

| 검사 | 결과 |
|---|---|
| `pnpm typecheck` | ✅ 종료 코드 0 |
| `pnpm lint` (`--max-warnings=0`) | ✅ 종료 코드 0 |
| `pnpm test` (Vitest, 파일 16개) | ✅ **274 / 274** |
| `pnpm build` | ✅ 성공 |
| `pnpm test:e2e` (Playwright) | ✅ **26 / 26** (13개 × Desktop Chrome·Pixel 7) |
| `pnpm verify` (위 전체) | ✅ 종료 코드 0 |
| 원격 CI (GitHub Actions) | 1차 실행(`c4dce16`): typecheck·lint·test·build 통과, **E2E 24/26** — Sprint 0 마이그레이션 테스트 2건이 CI의 느린 hydration과 테스트 데이터 주입 사이의 **타이밍 경쟁**으로 실패(앱 결함 아님). 테스트가 앱 실행 전에 저장소를 채우도록(`addInitScript`) 수정하고, 로컬에서 26/26과 해당 테스트 5회 반복 통과를 확인. 2차 실행 결과는 아래 §5.1 |

| 테스트 파일 | 수 | 다루는 요구 항목 |
|---|---|---|
| `unit/safety.test.ts` | 59 | 차단 18 / 허용 27 / 우회(전각·제로폭) / 구조화 태그 축 분리 / 모든 출력 경로 차단 / 원본 보존 / adapter 출력 검사 |
| `unit/catalog.test.ts` | 42 | 새 카탈로그 항목 전체, 한·영 라벨, 분류 정보 유효성, 카탈로그 문구 자체의 안전성, 피사체별 구도 표, #11 계층 검증, 잘못된 카탈로그 22종 |
| `component/app.test.tsx` | 29 | 데스크톱 UI 흐름 전반(jsdom): 상황 변화와 복귀, 추가 설정, 검색, 프리셋 범위, 충돌 버튼, 화면비 파라미터, 혼합 언어, 차단, 모드 전환, 복원, 자동 숨김, Sprint 0 마이그레이션, 부분 복구(저장·가져오기), 초기화 되돌리기, UI 확장성 |
| `unit/json.test.ts` | 26 | round-trip(전 속성, 비적용 값 포함), 복구 불가 12종, 부분 복구 6종 |
| `unit/search.test.ts` | 19 | 한·영·별칭, 공백·하이픈 무시, AND, 개수 제한 없음, 결정론 |
| `unit/rules.test.ts` | 15 | 조건 의미, 규칙 7종(관련 항목·안내·비자동 해결), 비충돌 조합, 비적용 보존과 복귀 |
| `unit/compiler.test.ts` | 14 | 기대 출력 2종(최소, 전체 Basic), 반복 결정론, 순서 무관, 무작위 명세 500개 불변식, 인젝션, adapter, 파라미터 전용 채널 |
| `unit/independence.test.ts` | 14 | core와 확장 fixture의 모든 속성 쌍, 프리셋은 해당 항목만 설정, 차원 간 독립 |
| `unit/storage.test.ts` | 11 | 저장·복원, 손상 4종, 부분 손상 복구 제안, 쓰기·읽기 실패 |
| `unit/migration.test.ts` | 9 | Sprint 0 실제 JSON·localStorage 무손실, 사유 기록, 로그 중복 방지, 다단계 체인, 충돌 시 덮어쓰기 안 함, 알 수 없는 ID 미변경 |
| `unit/unset.test.ts` | 9 | unset 유지, 권장값과 unset 구분 |
| `unit/reset-undo.test.ts` | 8 | 스냅샷 유지와 교체, 복원, 전환 계산 |
| `unit/language.test.ts` | 7 | 영어 컴파일, 한국어 원문 보존과 경고, 문자 체계 감지 |
| `unit/spec.test.ts` | 5 | ImageSpec 생성과 검증 |
| `unit/recovery.test.ts` | 4 | 제외 항목·사유·원본, 입력 불변 |
| `unit/provider.test.ts` | 3 | 네트워크 호출 없음, 도메인의 UI 비의존 |

### 5.1 원격 CI 실행 이력
| 실행 | 커밋 | 결과 |
|---|---|---|
| 1차 | `c4dce16` | ❌ E2E 2건 실패 (테스트 타이밍 경쟁) — 위 표 참고 |
| 2차 | E2E 수정 커밋 | 확인 후 기재 |

## 6. 실제 브라우저 검증 결과

Playwright로 프로덕션 빌드(`next build` + `next start`)를 대상으로 실행했고, 모든 테스트에서 로컬 서버 외 요청이 없음을 확인했습니다.

| 시나리오 | 데스크톱 | 모바일 |
|---|---|---|
| 모든 Basic 속성 입력(검색·추가 설정 포함) → 정확한 프롬프트, 파라미터, 출처, 분류 정보 | ✅ | ✅ |
| 복사한 클립보드 내용과 .txt 내보내기 파일 내용 일치, 새로고침 후 유지 | ✅ | ✅ |
| 피사체 변경 → 구도 비적용 표시, 전환 알림, 제외 → 복귀 | ✅ | ✅ |
| 충돌 안내가 두 항목 모두에 표시되고, 버튼으로만 해결됨 | ✅ | ✅ |
| 안전 차단: 미리보기·복사·.txt 불가, JSON에는 원문 보존, 허용 문구는 통과 | ✅ | ✅ |
| 혼합 언어 알림 | ✅ | ✅ |
| 초기화 → 편집 → 덮어쓰기 확인 → 복원 | ✅ | ✅ |
| Sprint 0 localStorage 데이터 → 마이그레이션 알림(사유), 원본 백업 | ✅ | ✅ |
| 부분 손상 데이터 → 복구 패널, 자동 저장 중지, 확인 후 적용, 원본 백업 | ✅ | ✅ |
| Detailed / Precision 예정 안내 | ✅ | ✅ |
| Sprint 0 기존 흐름(저장·복원·JSON·초기화·가져오기·키보드·영어·가로 넘침 없음) | ✅ | ✅ |

참고: 이 개발 세션의 명령 sandbox 안에서는 Chromium이 시작되지 않아(macOS Mach 포트 권한 거부), E2E는 sandbox 밖에서 실행했습니다. 코드 문제는 아닙니다.

**검증하지 않은 항목**: Safari·Firefox, 실제 모바일 기기, 다크 모드 화면, 스크린 리더, 실제 이미지 모델에서의 프롬프트 효과와 안전 정책의 실효성. 원격 CI 결과는 push 후 확인합니다.

## 7. 주요 UI 스크린샷

[docs/screenshots/sprint-1/](screenshots/sprint-1/) (E2E가 자동으로 생성, CSS 픽셀 배율)

| 화면 | 데스크톱 | 모바일 |
|---|---|---|
| Basic Composer 전체 입력 | [chromium-composer-full.png](screenshots/sprint-1/chromium-composer-full.png) | [mobile-composer-full.png](screenshots/sprint-1/mobile-composer-full.png) |
| 상황 변화 (비적용 유지) | [chromium-context-inactive.png](screenshots/sprint-1/chromium-context-inactive.png) | [mobile-context-inactive.png](screenshots/sprint-1/mobile-context-inactive.png) |
| 충돌 안내 | [chromium-conflict.png](screenshots/sprint-1/chromium-conflict.png) | [mobile-conflict.png](screenshots/sprint-1/mobile-conflict.png) |
| 안전 정책 차단 | [chromium-safety-blocked.png](screenshots/sprint-1/chromium-safety-blocked.png) | [mobile-safety-blocked.png](screenshots/sprint-1/mobile-safety-blocked.png) |
| Sprint 0 데이터 마이그레이션 | [chromium-migration.png](screenshots/sprint-1/chromium-migration.png) | [mobile-migration.png](screenshots/sprint-1/mobile-migration.png) |
| 부분 복구 | [chromium-recovery.png](screenshots/sprint-1/chromium-recovery.png) | [mobile-recovery.png](screenshots/sprint-1/mobile-recovery.png) |
| Detailed 예정 안내 | [chromium-detailed-placeholder.png](screenshots/sprint-1/chromium-detailed-placeholder.png) | [mobile-detailed-placeholder.png](screenshots/sprint-1/mobile-detailed-placeholder.png) |

스크린샷을 검토하며 고친 문제: 미리보기 제목 줄바꿈, 장소 검색창에 스타일 예시가 나오던 안내 문구, 차단 시 출처가 "적용 불가"로 잘못 표시되던 문제.

## 8. 미해결 기술 부채

| 항목 | 영향 | 제안 |
|---|---|---|
| 모바일에서 미리보기가 긴 페이지 맨 아래에 있음 | 결과를 보려면 많이 스크롤해야 함 | 모바일 고정 미리보기 바 (Q10) |
| 초기화 스냅샷이 새로고침하면 사라짐 | 세션을 넘기면 복구 불가 | 이력 기능과 함께 검토 (Q11) |
| 마이그레이션 로그와 백업 키가 1개씩이고 덮어써짐 | 두 번째 손상 시 이전 백업이 교체됨 | 타임스탬프 키 또는 이력 |
| 매 입력마다 동기 저장 (debounce 없음) | 지금은 문제 없음 | 명세가 커지면 debounce |
| ESLint 9 지원 종료 경고 | 보안 패치 없음 | eslint-config-next의 ESLint 10 지원 후 업그레이드 |
| 원격 CI 첫 실행 결과 미확인 | 로컬 외 환경 검증 대기 | push 후 결과 확인 |
| `execCommand` 복사 대체 경로 | deprecated API | 지원 브라우저 결정 후 제거 |
| 검색 순위가 단순함(초성 검색 없음) | 한국어 초성 입력 불가 | 카탈로그가 커지면 개선 |

## 9. 알려진 한계

- **안전 정책**: 로컬 키워드 기반입니다. 은어, 우회 철자, 다른 언어, 문맥을 판별하지 못하고 오탐도 있을 수 있습니다. 이미지를 검사하지 않으며 provider 정책 준수를 보장하지 않습니다. 폭력, 실존 인물 등의 범주는 아직 없습니다. 나이가 모호한 단어에 대한 보수적 규칙 때문에 성인을 가리키는 "girl" 표현이 성적 표현과 함께 쓰이면 차단됩니다(의도된 트레이드오프). 상세는 ADR-019에 있습니다.
- **혼합 언어 감지**: 문자 체계 기반이라 라틴 문자를 쓰는 비영어(프랑스어 등)는 감지하지 못합니다.
- **프롬프트 효과**: generic-en의 라벨형 문장("Framing: …")이 실제 모델에서 얼마나 잘 지켜지는지는 검증하지 않았습니다(Sprint 5).
- **독립 축 정보**: 스타일 분류 축과 조명 속성은 데이터로만 존재하고 편집 UI가 없습니다(가져오기로 설정하면 컴파일은 됨).
- **피사체 하위 분류**: core에는 없고 fixture로만 검증했습니다(Sprint 4).
- **정책 태그**: core 선택지에는 아직 없습니다. 인물 속성이 생기는 Sprint 2부터 사용합니다.

## 10. 미해결 질문 (결정 요청)

1. **Q8**: 예술 맥락의 나체 표현(고전 누드화 등)을 계속 차단할지
2. **Q9**: 패치형 프리셋(여러 속성 동시 설정 + 변경 목록 표시)을 Detailed 단계에 도입할지
3. **Q10**: 모바일 고정 미리보기 바를 Sprint 2 범위에 포함할지
4. **Q3**: generic-en 출력 형식(라벨형 vs 자연어)은 Sprint 5 실측 후 결정하는 것으로 유지할지
5. ~~Q7~~: 원격 저장소 연결과 push 완료 (사용자 지시). CI는 GitHub Actions에서 자동 실행됨

## 11. Sprint 2 권장 작업 (승인 필요)

1. **Detailed 인물 편집기**: 얼굴, 피부, 체형, 헤어, 표정, 의상(핏·노출 범위·의상 종류를 독립 축으로), 포즈. 각 선택지에 **정책 태그**(`age.*`, `appeal.*`, `coverage.*`, `fit.*`, `body.*`)를 처음부터 부여합니다. Sprint 1 fixture로 검증한 축 분리를 실제 카탈로그에 적용하는 것입니다.
2. **연령 표현 정책**: 인물 연령 속성을 도입할지와 표현 방식을 정하고, 미성년자 선택 시 성적 매력 관련 선택지를 비적용으로 만드는 **적용 조건**을 추가합니다(차단 이전의 예방).
3. **Detailed 조명·카메라 편집**: Sprint 1의 독립 조명 속성 6개를 편집하는 UI. 프리셋 분류 정보와 다른 값을 고르면 경고합니다(자동 변경 없음).
4. **패치형 프리셋 검토 (Q9)**: 변경 목록 미리보기와 되돌리기를 포함합니다.
5. **시각 예시 메타데이터**: 자리표시자 이미지 구조를 실제 UI에 연결합니다(자산 제작은 별도).
6. **모바일 미리보기 개선 (Q10)**, 이력 기능 검토(Q11).
7. 안전 정책 어휘 보강: Sprint 2 인물 어휘에 대한 허용·차단 테스트를 확장합니다.
