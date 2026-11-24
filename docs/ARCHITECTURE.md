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
