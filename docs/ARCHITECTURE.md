# Prompter 아키텍처 (Sprint 2-A 기준)

> 기준 문서: [PROMPTER_MASTER_PLAN.md](../PROMPTER_MASTER_PLAN.md) §5, §6, §7, §9, §11
> 변경 이력: Sprint 0 기반 구조 → Sprint 1에서 카탈로그 형식 0.2.0, 안전 정책 계층, 마이그레이션과 부분 복구 추가 → **Sprint 2-A에서 카탈로그 형식 0.3.0, ImageSpec 0.2.0, Detailed Editor 기반, 복합 프리셋, 테스트 카탈로그 격리 추가 (§9)**

## 1. 핵심 원칙

1. **ImageSpec이 단일 진실 원천입니다.** 프롬프트 문자열은 저장하지 않는 파생 결과물입니다.
2. **unset은 "키 없음" 하나로만 표현합니다.** 카탈로그의 `defaultValue`는 제안일 뿐이며, 프리셋의 `classification`도 다른 속성을 자동으로 설정하지 않습니다.
3. **보고만 하고 다시 쓰지 않습니다.** 검증기, 규칙, 적용 조건, 안전 정책은 진단(Diagnostic)만 만들고 명세를 고치지 않습니다. 해결 동작(`actions`)은 사용자가 눌러야만 실행됩니다.
4. **도메인과 UI를 분리합니다.** `src/domain`은 React와 Next.js를 import하지 않습니다(ESLint와 테스트로 강제).
5. **데이터 기반 확장.** 속성, 선택지, 하위 분류, 적용 조건, 충돌 규칙, 모델별 표현, 다국어 라벨은 모두 카탈로그 데이터입니다.
6. **원본 데이터를 보존합니다.** 마이그레이션 전 원본, 손상 원본, 가져온 파일은 변경되지 않으며, 복구는 사용자가 확인해야 적용됩니다.

## 2. 계층 구조

```text
┌──────────────────────────── UI (src/app, src/components) ─────────────────────────────┐
│ PrompterApp ─ Notices · RecoveryPanel · ModeTabs                                        │
│   ├ ModePanel ─ BasicComposer ─ GroupSection(핵심 / "추가 설정") ─ AttributeField        │
│   │                                     └ OptionPicker(검색·비적용 표시)                   │
│   │            └ (Detailed/Precision) 예정 안내 + SpecSummary                            │
│   └ PromptPreview(출력 관문·차단·혼합 언어·파라미터) · SpecToolbar(JSON·초기화·되돌리기)   │
└──────────────────────────────────────────▲─────────────────────────────────────────────┘
┌──────────────── State (src/state) ───────┴───────────────┐
│ useWorkspace: ImageSpec 1개, 초기화 스냅샷, 복원·복구 결정, │  useUiPrefs: mode, locale
│               자동 저장(복구 결정 전에는 중지)             │  (명세와 분리)
│ workspaceReducer: 순수 함수, 비적용 상태 전환 계산         │
└──────────────────────────────────────────▲───────────────┘
┌──────────────────────────── Domain (src/domain) — 프레임워크 무관 ──────────────────────┐
│ spec/        ImageSpec·Selection·Value(Zod), factory, operations, schema migrations     │
│ catalog/     schema(형식 0.2.0), registry(무결성·계층), conditions, applicability,        │
│              search, migrate(ID 변경), valueCheck, catalogs/core.ts(0.2.0)               │
│ validation/  specValidator(구조+의미+규칙), analyze(valid/recoverable/invalid)          │
│ safety/      baselinePolicy(0.1.0 데이터), evaluate(태그+어휘 → 신호 → 규칙)            │
│ compiler/    compiler → adapter → SAFETY GATE → 혼합 언어 진단, output(출력 관문)       │
│ persistence/ json(export/analyze import), storage(envelope, 백업, 마이그레이션 로그)     │
│ providers/   ImageProviderAdapter 인터페이스, disabledImageProvider                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. 모듈별 책임

| 모듈 | 위치 | 책임 |
|---|---|---|
| ImageSpec | `domain/spec/schema.ts` | 버전 0.1.0 (Sprint 1에서 변경 없음) |
| AttributeSelection | `domain/spec/*` | 값(`kind`), `source`, 예약 필드 `priority` |
| AttributeDefinition | `domain/catalog/schema.ts` | type, tier, prominence(핵심/추가), searchable, 다국어 라벨, 템플릿, 채널(text/parameter/both), 적용 조건, 제안 기본값 |
| Option | 〃 | 계층(`parentId`), 별칭, 선택지별 적용 조건, `classification`(독립 축 분류 정보), `policyTags`, `parameterValue`, 모델별 표현 |
| Rule | 〃 | conflict/dependency/visibility, severity, `involves`, `guidance`(필수), `actions`(제안) |
| CatalogRegistry | `domain/catalog/registry.ts` | 파싱, 무결성 검사, 계층 조회(`lineage`), 그룹 트리, 마이그레이션 체인 검증 |
| Applicability | `domain/catalog/applicability.ts` | 속성·선택지 단위 적용 여부, 비적용 선택 목록 |
| Search | `domain/catalog/search.ts` | 모든 locale 라벨, 별칭, ID, 설명 검색. 결정론적이며 개수 제한 없음 |
| Catalog migration | `domain/catalog/migrate.ts` | 선언된 ID 변경만 적용하고 기록(변경 전후, 사유). 덮어쓰기 금지, 추측 매핑 금지 |
| SpecValidator | `domain/validation/*` | 구조 → 스키마 마이그레이션 → 카탈로그 마이그레이션 → 선택값별 검증 → 정상/부분 복구 가능/복구 불가 |
| Safety | `domain/safety/*` | 로컬 정책 검사. 카탈로그 검증과 독립된 계층 |
| PromptCompiler | `domain/compiler/*` | 결정론적 생성, 출처 fragment, 파라미터, 차단, 혼합 언어 진단 |
| Output gate | `domain/compiler/output.ts` | 모든 프롬프트 출력 경로(미리보기, 복사, .txt, 향후 provider)가 거치는 단일 관문 |
| Persistence | `domain/persistence/*` | JSON(항상 허용), 로컬 저장, 백업 키, 마이그레이션 로그 |
| ProviderAdapter | `domain/providers/*` | 인터페이스만 있음. 네트워크 호출 0 |

## 4. 데이터 흐름

### 편집과 출력
```text
사용자 입력 → reducer → applySelection (검증 실패 시 변경 없음, 다른 selection은 참조 유지)
            → 새 ImageSpec → (자동 저장) + compilePrompt:
               validateSpecAgainstCatalog (값, 비적용, 규칙)
               → fragments: 설정됨 ∧ 속성 적용 ∧ 선택지 적용 (카탈로그 순서)
               → parameters: channel ∈ {parameter, both}
               → adapter.render
               → evaluateSafety(선택지 policyTags + 각 fragment + adapter 최종 출력)
                    차단이면 prompt/fragments/parameters를 비우고 blocked=true
               → 혼합 언어 진단(비라틴 문자 체계)
            → getPromptOutput (미리보기, 복사, .txt 내보내기)
```

### 가져오기와 복원
```text
텍스트 → JSON.parse → analyzeSpecInput:
   객체·kind 검사 → 스키마 마이그레이션 → 헤더(Zod) → catalog.id 확인
   → migrateCatalogSelections (선언된 rename만, 기록 남김)
   → 선택값별 검사 (ID 형식, Zod, 속성 존재, 값-정의 일치)
   → 결과: valid | recoverable(제외 목록: 경로, 원본 값, 사유) | invalid
UI:  valid → 적용 (+ 마이그레이션 내역 알림)
     recoverable → RecoveryPanel: [제외하고 적용] / [원본 다운로드] / [취소·새로 시작]
     invalid → 오류 알림, 현재 명세 유지
저장소: 손상 원본 → :corrupt-backup, 마이그레이션 전 원본 → :pre-migration-backup,
        변경 기록 → prompter:v1:migration-log. 복구 결정 전에는 자동 저장을 중지
```

## 5. 구조 변경과 영향 (Sprint 1, 승인됨)

| 변경 | 영향 | 호환성 |
|---|---|---|
| 카탈로그 형식 0.1.0 → 0.2.0 | 새 필드(선택지 조건, 분류 정보, 정책 태그, 파라미터, prominence, searchable, guidance/actions, migrations, noneOf/whenUnset) | 번들 카탈로그만 해당. 0.1.0 형식 카탈로그는 거부(테스트) |
| core 카탈로그 내용 0.1.0 → 0.2.0 | `style.visual` → `style.preset` (사유 기록) | Sprint 0 데이터는 자동 변환. 실제 Sprint 0 출력물로 무손실 검증 |
| ImageSpec 0.1.0 유지 | 없음 | Sprint 0 JSON과 저장 데이터 그대로 읽힘 |
| 가져오기 반환값 `Result` → `SpecAnalysis` | 부분 복구 지원 | 내부 API. 엄격 검증은 `validateImageSpec`으로 유지 |
| 컴파일러 0.1.0 → 0.2.0 | 선택지 단위 제외, parameters, blocked, safety meta | Sprint 0 명세의 프롬프트 문장은 동일하게 재현(테스트) |
| 저장 envelope | 변경 없음(v1). 백업 키와 로그 키 추가 | 그대로 |

## 6. 불변 조건 (테스트로 보장)

| 불변 조건 | 테스트 |
|---|---|
| 모든 속성은 unset으로 시작하며 기본값이나 분류 정보가 자동 적용되지 않음 | `unset`, `independence` |
| 속성 A를 변경·해제해도 다른 속성 B는 참조까지 동일 (core 22개, 확장 fixture의 모든 쌍) | `independence` |
| 비적용 선택은 유지되고, 컴파일에서 제외되며, 진단과 전환 알림이 뜨고, 다시 적용되면 복귀 | `rules`, `reset-undo`, `component`, E2E |
| 충돌은 관련 항목과 해결 안내를 보고할 뿐 사용자 의도를 바꾸지 않음 | `rules`, `compiler`, `component` |
| 프롬프트는 명시적이고 적용 가능한 선택에서 나온 fragment로만 구성 (무작위 명세 500개) | `compiler` |
| 결정론: 동일 명세 → 동일 출력. 키 순서와 클릭 순서 무관 | `compiler` |
| JSON round-trip 무손실, 재-export 바이트 동일 | `json` |
| Sprint 0 데이터 무손실 변환, 원본 보존, 로그 기록, 알 수 없는 ID 미변경 | `migration` |
| 부분 복구: 제외 항목·사유·원본 표시, 확인 전 미적용, 자동 저장 중지 | `recovery`, `storage`, `component`, E2E |
| 차단 시 모든 출력 경로 차단, 명세·JSON은 원본 그대로 | `safety`, `component`, E2E |
| 정당한 성인 패션·체형·매력 표현은 허용 | `safety` |
| core 카탈로그 문구 자체는 안전 신호를 만들지 않음 | `catalog` |
| 외부 네트워크 호출 0 | `provider`, E2E 네트워크 감시 |

## 7. 확장 지점

| 추가하려는 것 | 변경 위치 | 핵심 코드 변경 |
|---|---|---|
| 선택지, 속성, 하위 분류, 그룹 | 카탈로그 데이터 + `version` 올림 | 없음 |
| 상황별 선택지, 의존성·충돌 | `appliesWhen`(속성·선택지), `rules` | 없음 |
| ID 변경·삭제 | `migrations`(renameAttribute/renameOption + 사유) | 없음 |
| 스타일·조명 독립 축 편집 | 축 속성은 이미 존재(tier detailed) → Detailed/Sprint 4 UI | UI만 |
| 안전 정책 범주와 어휘 | `baselinePolicy` 데이터 + 버전 올림 | 없음 |
| 모델별 표현, 새 adapter | `byAdapter` + `PromptAdapter` 구현 | adapter 파일 1개 |
| 새 값 타입 (position, reference) | values/valueCheck/compiler/AttributeField, ImageSpec minor 올림 | 4곳 (의도된 비용) |

## 8. 보안과 비용 경계

- 클라이언트 네트워크 호출 0(테스트, E2E 네트워크 감시).
- 안전 정책은 로컬 키워드 기반 기준선입니다. 의미 기반 검열도 아니고 provider 정책 준수를 보장하지도 않습니다(DECISIONS ADR-019).
- CI(`.github/workflows/ci.yml`)는 원격 저장소(GitHub) 연결 후 GitHub Actions에서 실행됩니다.

## 9. Sprint 2-A: Detailed Editor 기반

### 9.1 추가·변경된 모듈
| 모듈 | 위치 | 책임 |
|---|---|---|
| 노출 규칙 | `catalog/registry.ts` `isExposed` / `exposedAttributes` | 제품 승인 상태(`status`) + tier + 카테고리 승인 → 편집 가능 여부. 데이터가 있다고 노출하지 않음 |
| 카테고리 | `catalog/categories.ts` | `categories` 데이터 → 트리(적용 여부, 하위 포함 설정 개수, 경고·차단 배지), 카탈로그 전체 검색 |
| 의미 단위 | `catalog/phrase.ts` | `parts` 렌더링(대체된 축 제외). 레지스트리가 "parts 렌더링 결과 == text"를 강제 |
| 정책 제한 | `catalog/applicability.ts` `isOptionRestricted` / `findRestrictedSelections` | 조건부 비활성 + 사유. 검증기 오류, 컴파일 차단 |
| 프리셋 | `presets/presets.ts` | `planPreset` → `applyPresetPlan` → `undoPresetTransaction`, `markUserEdited` |
| 컴파일러 0.3.0 | `compiler/compiler.ts` | 2단계(출력 속성 결정 → 의미 단위 대체), 수치 의미(degree → bands), 제한 시 차단 |
| ImageSpec 0.2.0 | `spec/schema.ts`, `spec/migrations.ts` | `origin`(preset일 때만), 0.1.0 → 0.2.0 무손실 |
| 범용 컨트롤 | `components/controls/Controls.tsx`, `AttributeField.tsx` | `control`에 따라 칩, 드롭다운, 카드, 검색 목록, 색상, 슬라이더, 숫자, 범위, 텍스트 |
| Detailed Editor | `components/detailed/*` | 탐색(트리와 검색), 카테고리 패널(범용 필드, 프리셋, DRAFT 안내), 프리셋 확인 대화상자 |
| 모바일 도구 모음 | `components/PrompterApp.tsx` + CSS | 860px 미만: 개수, 상태, 미리보기 패널, 복사(출력 관문) |
| 테스트 카탈로그 | `src/testing/*`, `src/app/e2e-fixtures`, `scripts/verify-prod-isolation.mjs` | E2E 전용 빌드에서만 존재. 일반 빌드에서는 404이며 번들에 없음 |

### 9.2 화면 구조
```text
≥1100px  [탐색 240px] [카테고리 패널] [미리보기 380px, sticky]
860–1100 [☰ 카테고리 → 접히는 탐색] [카테고리 패널] [미리보기]
<860     [☰ 카테고리] [카테고리 패널] … [하단 고정 도구 모음] + 아래에서 올라오는 미리보기 패널
```
모든 카테고리 화면은 하나의 범용 패널이 카탈로그 데이터로 만듭니다. 카테고리별로 따로 작성한 화면은 없습니다.

### 9.3 우선순위와 출처
```text
사용자 직접 선택 (source=user)            ← 항상 우선, origin 없음
명시적으로 적용한 프리셋 값 (source=preset, origin=presetId@version)
분류·검색 메타데이터 (classification, aliases) ← 선택값이 아님, 출력에 쓰이지 않음
unset (키 없음)
```
- 세션 트랜잭션(마지막 프리셋 1회): 적용 전·후 값, 변경된 속성, `userEdited`.
- 되돌리기는 `userEdited`가 아니고 현재 값이 적용 직후와 같은 객체일 때만 복원합니다.

### 9.4 빌드 종류
| 빌드 | 명령 | 테스트 카탈로그 | 출력 폴더 |
|---|---|---|---|
| 일반 프로덕션 | `pnpm build` | 없음(번들에서 제거, `/e2e-fixtures` 404) — `pnpm verify:isolation`으로 검증 | `.next` |
| E2E 전용 | Playwright webServer (`PROMPTER_E2E_FIXTURES=1`, `PROMPTER_DIST_DIR=.next-e2e`) | `/e2e-fixtures` 페이지(테스트 전용 배너, 분리된 저장 키) | `.next-e2e` |

### 9.5 추가 불변 조건 (테스트로 보장)
| 불변 조건 | 테스트 |
|---|---|
| 미승인(draft·deferred)·precision 속성은 제품 UI에 나타나지 않음 | `detailed-domain`, `component/detailed`, E2E |
| 슬라이더 표시 위치와 범위의 절반 입력은 저장되지 않음 | `component/detailed`, E2E |
| 프리셋 계획은 명세를 바꾸지 않고, 적용은 목록에 있는 속성만 바꿈 | `detailed-domain`, `component/detailed`, E2E |
| 되돌리기는 사용자 편집(같은 값으로 되돌린 경우 포함)을 보호 | `detailed-domain`, `component/detailed`, E2E |
| 같은 의미는 한 번만 출력, 직접 선택 우선, 다른 축은 충돌 아님 | `detailed-domain`, `component/detailed`, E2E |
| Sprint 0·1 실제 데이터 무손실, Sprint 1 프롬프트 동일 | `migration`, `detailed-domain`, E2E |
| 일반 빌드에서 테스트 카탈로그 접근 불가 | `verify:isolation` |

## 10. Sprint 2-B.1: Person › Identity와 공통 카탈로그 기능

### 10.1 버전
| 대상 | 이전 | 현재 | 변경 |
|---|---|---|---|
| ImageSpec | 0.2.0 | **0.3.0** | `excludedFromPrompt`, `CustomEntry`(single/multi), number/range `unit` — 추가만, 마이그레이션은 버전 숫자만 변경 |
| 카탈로그 형식 | 0.3.0 | **0.4.0** | `expression`, `outputToggle`, `custom`, `quantity`, `optionGroups/group`, `covers`, `suggestedWhen`, `interval`, `prompt.variants`, 조건 `derived`·`selectedCount`·`intervalMismatch`, `ageModel` |
| 핵심 카탈로그 | 0.3.0 | **0.4.0** | Identity 16개 속성, 속성 order ×10, ID 변경 없음 |
| 컴파일러 | 0.3.0 | **0.4.0** | 제외·Metadata 생략, covers, 조건별 표현, 사용자 정의 값, 단위, 숨은 값 안전 검사 |
| 안전 정책 | prompter.baseline 0.1.0 | **0.2.0** | 규칙·단어 그대로, 입력 확장(숨은 값, 사용자 정의 이름·표현, 구조화 연령 신호) |

### 10.2 선택 상태와 출력
```text
Unset     ── 키 없음
Selected  ── { value, source, origin? }                    → 적용 가능하면 출력
Excluded  ── { value, source, origin?, excludedFromPrompt } → 출력 안 함, 값 유지
표현 역할(카탈로그): direct · context · metadata(항상 출력 안 함)
모든 저장 값(출력 여부와 무관) ──► 안전 검사 · 연령 판단 · 규칙
```

### 10.3 컴파일 파이프라인 (0.4.0)
```text
spec ─► 검증 ─► Pass 1: 출력 후보 (설정·유효·포함·Metadata 아님·적용 가능)
        └─► covers: 다른 출력 선택지가 같은 의미를 담으면 생략(출처 compilation.covered)
     ─► Pass 2: 문장 (조건별 표현 → 의미 단위 대체 → 사용자 정의 표현/이름 → 단위)
     ─► 어댑터 ─► 안전 게이트: 출력 문장 + 숨은 값(제외·적용 불가·Metadata·covers) 문장
                 + 사용자 정의 이름·표현 + 모든 선택지 태그 + 구조화 연령 신호
```

### 10.4 공통 연령 해석 (`domain/catalog/age.ts`)
- `classifyBeing`: 존재 유형·종족의 등록 분류(ageModel)로 human / nonhuman / unclassified. 둘 다 미설정이면 human(기록하지 않음).
- `assessAge`: 연령대·실제·외형 연령을 기본 단위(년)로 정규화해 minor / ambiguous / adult / unknown. 미성년 신호는 상쇄하지 않고, 실제 연령은 human일 때만 성인 근거.
- 사용처: 안전 정책(구조화 태그), 규칙 R1(`intervalMismatch` + `derived being.class`), 조건별 표현(`derived age.class`). 레지스트리가 `ConditionContext.derivedFact`로 제공합니다.

### 10.5 카탈로그 구성
```text
catalogs/core.ts ── 기존 속성 (order ×10) + identityCategories + identityAttributes + identityRules + ageModel
catalogs/person/identity.ts ── 16개 속성, 6개 하위 분류, 규칙 R1·R2·R5, 연령 모델
catalogs/person/regions.ts  ── 국가·지역 199개 정적 데이터 (출처·버전 주석)
```

### 10.6 추가 불변 조건 (테스트로 보장)
| 불변 조건 | 테스트 |
|---|---|
| 승인된 16개 속성·선택지·영어 표현·문장 틀이 사양과 정확히 같음(부록 A·B) | `identity-catalog` |
| 연령 판단 결정표 전체, 단위 정규화, 명세에 값을 자동으로 쓰지 않음 | `identity-semantics` |
| 프롬프트에서 제외한 값·적용 불가 값·사용자 정의 이름도 안전 검사(돌연변이 테스트로 확인) | `identity-semantics`, E2E |
| 제외 상태는 값 변경 시 유지, 해제 시 제거, JSON·저장소 왕복 | `identity-semantics`, `component/identity`, E2E |
| 사용자 정의 값은 등록 선택지와 병합·대체되지 않음 | `identity-semantics`, `component/identity` |
| 카테고리 초기화는 저장 값 전체(검색·제외·적용 여부 무관), 복원은 이후 편집과 다른 카테고리를 바꾸지 않음 | `category-reset`, `component/identity`, E2E |
| Sprint 0·1·2-A 실제 데이터 무손실, 기존 프롬프트 글자 단위 동일 | `migration`, `detailed-domain`, `identity-semantics` (sprint2a fixture) |

## 11. Sprint 2-B.2: 얼굴 및 이목구비

새 아키텍처 없이 2-B.1 공통 기능만 재사용했습니다(스키마·컴파일러·안전 정책 버전 그대로, core 카탈로그 0.5.0).

```text
catalogs/person/facial.ts ── 47개 속성 (order 217–263) + 반대 특징 규칙 26개 + 코 모양 covers
  모양  → single/multi 칩 (+ CustomEntry)       예: Cheekbones: prominent, high.
  정도  → number + degree + bands(1–5) 슬라이더  예: Eye size: large.   (숫자는 출력·표시 안 함)
  색상  → color 팔레트 (+ CustomEntry)           예: Iris color: dark brown.
```

| 추가 불변 조건 | 테스트 |
|---|---|
| 47개 속성·선택지·구간 표현이 승인 목록과 정확히 같고 모든 선택지가 해당 문장 하나만 출력 | `facial-catalog` |
| 한 속성 선택이 다른 속성을 설정하지 않음(정체성 → 얼굴 포함), 외형↔표정·인상·성별·민족 연결 표현 없음 | `facial-catalog`, `independence` |
| 함께 존재하는 특징은 경고 없음, 반대 특징은 경고만(값 유지) | `facial-catalog`, `component/facial` |
| 슬라이더 표시·포커스는 저장하지 않고, 구간 이름만 표시 | `component/facial`, `component/detailed`, E2E |

## 12. Sprint 2-B.3: 피부·헤어·수염

스키마·컴파일러·안전 정책 변경 없이 카탈로그 데이터와 기존 공통 기능만 사용했습니다(core 카탈로그 0.6.0).

```text
catalogs/person/builders.ts  ── 인물 카탈로그 공통 데이터 도우미 (shape · degree · opposite · noneWithOthers)
catalogs/person/skin-hair.ts ── 45개 속성 (order 264–308) + 경고 규칙 21개
  적용 가능성: appliesWhen noneOf — 예) hair.style 은 hair.presence ∉ {bald, shaved} 일 때만 출력
               (적용되지 않아도 값은 명세에 보존, 다시 적용되면 출력, 안전 검사는 계속)
  ‘없음’ 선택지: 명시적 값으로 출력(“Freckles: none.”), 미설정은 출력 없음
  팔레트 그룹: 색상 컨트롤이 optionGroups를 제목 행으로 표시(출력 없음)
```

| 추가 불변 조건 | 테스트 |
|---|---|
| 45개 속성(누적 108)·팔레트·헤어스타일 그룹이 승인 목록과 같고 모든 선택지가 해당 문장만 출력 | `skin-hair-catalog` |
| 피부·헤어·수염 속성은 정체성(연령·성별·국적·민족)을 참조하지 않음 | `skin-hair-catalog` |
| 대머리·삭발·부분 탈모·앞머리 없음·주근깨/점/주름 없음·수염 없음에 따른 출력 제어와 값 보존·복원 | `skin-hair-catalog`, `component/skin-hair`, E2E |
| 비인물 속성 순서 오프셋 후에도 기존 프롬프트 동일 | 기존 골든·sprint2a fixture 테스트 |

## 13. Sprint 2-B.4: 신체

카탈로그 데이터만 추가했습니다(core 카탈로그 0.7.0, 스키마·컴파일러·안전 정책 변경 없음).

```text
catalogs/person/body.ts ── 45개 속성 (order 309–353), 하위 분류 7개 (person_body_*)
  정도 36개 → degree 슬라이더(1–5, 구간 이름만 표시)
  형태 8개  → 칩 (+ CustomEntry 4개 속성)
  등신 비율 → number + semantics "ratio" + unit "heads tall" (2–10, 0.5 단위) — 값 표시·그대로 출력
  적용 조건 → 피사체만 (다른 속성 참조 없음), 규칙 없음 (선택지↔수치 불일치는 TD-10)
```

| 추가 불변 조건 | 테스트 |
|---|---|
| 45개 속성(누적 153)·7개 하위 분류·구간·선택지가 승인 목록과 같고 모든 값이 해당 문장만 출력 | `body-catalog` |
| 신체 속성은 정체성·다른 속성을 참조하지 않고, 전체 체형이 다른 값을 설정하지 않음 | `body-catalog`, `component/body` |
| 신체 선택만으로는 차단되지 않음(미성년 포함), 성적 표현과 결합된 미성년 묘사는 계속 차단 | `body-catalog` |

## 14. Sprint 2-B.5: 표정·인상·메이크업·의상·액세서리

카탈로그 데이터 추가(core 카탈로그 0.8.0) + 결과가 같은 컴파일 반복 계산 제거(ADR-054). 스키마·컴파일러 버전·안전 정책 변경 없음.

```text
catalogs/person/expression-makeup.ts ── 표정 10 + 인상 8 (person_expression_face/_impression) + 메이크업 16 (order 354–387)
catalogs/person/clothing.ts          ── 전체 설정 8 + 의복 7개 × 세부 (person_wardrobe_*, order 388–459)
  person.clothing.<의복>.{type, primary_color, …}  ← 공통 어휘(팔레트·소재·패턴 …)는 데이터 상수로 공유, 값은 속성마다 독립
  type “none” → noneOf 조건으로 해당 의복 세부만 비활성(값 보존); 종류별 의미 없는 세부도 noneOf/anyOf
catalogs/person/accessories.ts       ── 18개 (order 460–477), 안경테·모자 색상은 의상 팔레트 공유

compilePrompt
  ├─ findInactiveSelections / findRestrictedSelections  (1회)
  ├─ validateSpecAgainstCatalog(spec, registry, { inactive, restricted })   ← 같은 결과 재사용
  ├─ pass 1 활성 선택지 → pass 2 renderValue 재사용
  └─ evaluateSafety → scanText(text, policy)  (짧은 텍스트 결과 메모이즈, 전체 프롬프트는 매번 검사)
CatalogRegistry: optionsById 색인, lineage 메모이즈(deep-frozen 카탈로그)
```

| 추가 불변 조건 | 테스트 |
|---|---|
| 124개 속성(누적 277)·카테고리·순서·선택지·어휘가 승인 목록과 같고 모든 값이 해당 문장만 출력 | `expression-makeup-catalog`, `clothing-catalog`, `accessories-catalog` |
| 메이크업 없음·아이라인 없음·의복 없음·종류별 세부·플랫 굽·안경/모자 없음은 값을 보존한 채 출력만 멈추고 다시 적용되면 복원 | 위 3개, `component/wardrobe`, E2E `wardrobe` |
| 의복별 색상·소재·핏은 서로 독립, 전체 설정은 개별 의복을 설정하지 않음, 원피스는 상의·하의를 지우지 않음 | `clothing-catalog`, E2E `wardrobe` |
| 성숙한 인상은 연령 판단을 바꾸지 않음, 매력·귀여움은 미성년과 함께여도 차단되지 않음, 성적 표현 + 앳된 인상은 차단 | `expression-makeup-catalog` |
| 의복 “없음”·커버리지·핏은 노출 표현을 만들지 않음, 내의 어휘는 기존 미성년자 보호 규칙만 따름(성인 미차단) | `clothing-catalog`, `catalog` |
| 컴파일 최적화 전후 결과 동일 | 기존 골든·회귀·독립성 테스트, `safety` 동일성 테스트 |

## 15. Sprint 2-B.6: 외모 방향·자세·카메라·조명

카탈로그 데이터 추가(core 카탈로그 0.9.0). 스키마·컴파일러·안전 정책 변경 없음.

```text
catalogs/person/appearance.ts ── person.appearance.direction (tier basic, group "what", category person_expression_impression, order 195)
  → Basic: 피사체 = 인물일 때 피사체 바로 다음 / Detailed: 인상 및 매력 — 같은 속성, 같은 값
  → covers: attractive·striking·elegant·ethereal·refined → 같은 의미의 인상 값은 한 번만 출력
catalogs/person/pose.ts       ── 22개 (person_pose_*, order 478–499)
catalogs/shared/camera.ts     ── 15개 (shared_camera, order 1605–1675) + core.ts의 Basic 3개 재사용
catalogs/shared/lighting.ts   ── 11개 (shared_lighting, order 2025–2095) + core.ts의 프리셋·속성 6개(선택지만 추가)
person/builders.ts            ── scope 인자(기본: 1인 인물, 공통 속성은 [])와 비인물 ID의 domain 규칙
testing/fixtureCatalog.ts     ── person_pose를 테스트 카탈로그에서만 DRAFT로 유지
```

| 추가 불변 조건 | 테스트 |
|---|---|
| 외모 방향은 Basic·Detailed가 같은 값, 미설정이면 기존 출력 동일, 인물이 아니면 미적용(값 보존), 성별 무관, 연령 판단 불변, “섹시한”만 기존 미성년자 보호 규칙 | `appearance-pose-catalog`, `component/pose-camera-lighting`, `catalog`, E2E |
| 자세 22개·카메라 15개·조명 11개 등록·문장·적용 조건·충돌, 신체 방향 ↔ 관찰 방향, 머리 ↔ 시선 방향 ↔ 시선 상태 독립 | `appearance-pose-catalog`, `camera-lighting-catalog` |
| Basic 카메라 3개·조명 프리셋 12개·조명 속성 6개의 ID·문구·출력·의미 단위 대체 불변 | `camera-lighting-catalog`, 기존 회귀 테스트 |
