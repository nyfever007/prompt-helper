# Prompter 아키텍처 (Sprint 0)

> 기준 문서: [PROMPTER_MASTER_PLAN.md](../PROMPTER_MASTER_PLAN.md) §5, §6, §9, §11

## 1. 핵심 원칙

1. **ImageSpec이 단일 진실 원천(Single Source of Truth)입니다.** 프롬프트 문자열은 저장하지 않는 파생 결과물입니다.
2. **unset은 "키 없음"으로 표현합니다.** `selections`에 키가 없으면 unset이고, 키가 있으면 사용자가 명시적으로 선택한 값입니다. 카탈로그 기본값은 자동으로 적용되지 않습니다.
3. **도메인과 UI를 분리합니다.** `src/domain`은 React와 Next.js를 import하지 않습니다(ESLint `no-restricted-imports`와 테스트로 강제).
4. **데이터 기반 확장.** 컴파일러, 검증기, UI는 카탈로그에서 속성과 옵션을 읽습니다. 속성이나 옵션을 추가할 때 코드를 바꿀 필요가 없습니다.
5. **보고만 하고 다시 쓰지 않습니다.** 검증기, 규칙, 컴파일러는 진단(Diagnostic)을 반환할 뿐 명세를 수정하지 않습니다.

## 2. 계층 구조

```text
┌──────────────────────── UI (src/app, src/components) ────────────────────────┐
│  PrompterApp ─ ModeTabs(Basic/Detailed/Precision) ─ ModePanel ─ AttributeField │
│              └ PromptPreview ─ SpecToolbar(Export/Import/Reset)               │
└───────────────────────────────▲──────────────────────────────────────────────┘
                                │ props / callbacks
┌──────────────── State (src/state) ─────────────────┐
│ useWorkspace: ImageSpec 1개 소유, 복원·자동 저장, │   useUiPrefs: mode/locale
│               compilePrompt 메모이즈              │   (명세와 분리된 보기 설정)
└───────────────────────────────▲────────────────────┘
                                │ 순수 함수 호출
┌──────────────────────── Domain (src/domain) — 프레임워크 무관 ─────────────────────────┐
│ spec/        ImageSpec·AttributeSelection·SelectionValue 스키마(Zod), factory,          │
│              operations(applySelection/clearSelection), migrations                      │
│ catalog/     AttributeDefinition·Option·Rule 스키마, CatalogRegistry, conditions,       │
│              valueCheck, catalogs/core.ts                                               │
│ validation/  SpecValidator: parseImageSpec(구조) + validateSpecAgainstCatalog(의미)     │
│ compiler/    PromptCompiler: spec → fragments(semantic plan) → PromptAdapter.render     │
│ persistence/ exportSpecJson/importSpecJson, createSpecStorage(KeyValueStore)            │
│ providers/   ImageProviderAdapter 인터페이스, disabledImageProvider                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. 모듈별 책임

| 모듈 | 위치 | 책임 |
|---|---|---|
| **ImageSpec** | `domain/spec/schema.ts` | 버전이 붙은 명세: `kind`, `schemaVersion`, `task`, `catalog{id,version}`, `selections` |
| **AttributeSelection** | `domain/spec/schema.ts`, `values.ts` | 명시적으로 선택한 값 1개. `value`(`kind`로 구분: single, multi, number, range, text), `source`(user, preset, import), `priority?`(1~5, 예약) |
| **AttributeDefinition** | `domain/catalog/schema.ts` | 속성 정의: `type`, `tier`, `order`, 다국어 `label`/`description`, `prompt.template`(+`byAdapter`), `appliesWhen`, `defaultValue`(제안 값), `examples`, 옵션(계층형 `parentId`, `aliases`, 모델별 표현) |
| **CatalogRegistry** | `domain/catalog/registry.ts` | 카탈로그 파싱, 무결성 검사(중복, 부모 참조, 순환, 기본값, 조건 참조), 결정론적 정렬, 조회 API, 불변(deep freeze) |
| **SpecValidator** | `domain/validation/specValidator.ts` | 1단계 구조 검증(타입, kind, 버전, 마이그레이션, Zod) → 2단계 카탈로그 검증(속성·옵션 존재, 타입 일치, 범위, 길이, 적용 여부, 규칙) |
| **PromptCompiler** | `domain/compiler/` | 결정론적 규칙 기반 변환. 설정된 속성과 적용 가능한 속성만 fragment로 만들고, adapter가 최종 문자열을 생성 |
| **Persistence** | `domain/persistence/` | 정규화된 JSON 내보내기와 전체 검증을 거치는 가져오기, 버전이 붙은 envelope 기반 로컬 저장, 손상 데이터 백업 |
| **ProviderAdapter** | `domain/providers/` | 이미지 생성 API의 경계 인터페이스(기능, 요청 검증, 비용 추정, 생성). Sprint 0은 비활성 구현만 있음 |

## 4. 데이터 흐름

```text
사용자 입력 ─▶ workspaceReducer ─▶ applySelection(spec, registry, id, value)
                                     │  (값 검증 실패 → 변경 없음)
                                     ▼
                             새 ImageSpec (다른 selection은 참조 그대로 유지)
                                     │
               ┌─────────────────────┼───────────────────────┐
               ▼                     ▼                       ▼
        compilePrompt         createSpecStorage.save   exportSpecJson
   (validate → fragments     (envelope + canonical)    (canonical JSON)
     → adapter.render)
               ▼
        PromptPreview (prompt, 출처 fragment, 진단, 버전 메타)
```

가져오기와 복원은 반대 방향입니다. 텍스트 → `JSON.parse` → `parseImageSpec` → `validateSpecAgainstCatalog`를 거쳐, 오류가 하나라도 있으면 전체를 거부합니다(현재 명세는 바뀌지 않음).

## 5. 불변 조건 (테스트로 보장)

| 불변 조건 | 테스트 |
|---|---|
| 새 명세는 모든 속성이 unset이고 프롬프트가 빈 문자열 | `tests/unit/unset.test.ts` |
| 카탈로그 `defaultValue`는 자동 적용되지 않으며, 명시적으로 선택하면 unset과 구별됨 | `unset.test.ts` |
| 속성 A를 변경하거나 해제해도 다른 모든 속성 B는 참조까지 동일 (모든 속성 쌍) | `independence.test.ts` |
| 프롬프트는 명시적 선택에서 나온 fragment만으로 구성 (속성 부분집합 전수 검사) | `compiler.test.ts` |
| 같은 명세에서는 같은 출력. 키 삽입 순서와 복수 선택 클릭 순서에 무관 | `compiler.test.ts` |
| export → import는 무손실이고 재-export 결과는 바이트 단위로 동일 | `json.test.ts` |
| 잘못된 입력은 예외 없이 진단으로 거부 | `json.test.ts`, `spec.test.ts`, `storage.test.ts` |
| 소스 코드에 네트워크·API 클라이언트 호출 없음, 도메인은 UI 프레임워크와 무관 | `provider.test.ts` |

## 6. 확장 지점

| 추가하려는 것 | 변경 위치 | 핵심 코드 변경 |
|---|---|---|
| 옵션 | 카탈로그 데이터 + 카탈로그 `version` 올림 | 없음 |
| 속성 (기존 타입) | 카탈로그 데이터 (`tier`로 표시될 모드 결정) | 없음 |
| 계층형 옵션 / 그룹 | `parentId`, `groups` 데이터 | 없음 (UI는 들여쓰기만 지원) |
| 조건부 속성, 의존성·충돌 규칙 | `appliesWhen`, `rules` 데이터 | 없음 |
| 모델별 표현 | `prompt.byAdapter`(옵션, 속성) + 새 `PromptAdapter` 구현 | adapter 파일 1개 |
| 다국어 | 카탈로그 `LocalizedText`에 locale 키 추가, `i18n/messages.ts`에 사전 추가 | 사전 1개 |
| 새 값 타입 (예: `position`, `reference`) | `values.ts` union, `valueCheck.ts`, `compiler.renderValue`, `AttributeField`, `schemaVersion` minor 올림, 필요하면 마이그레이션 | 4곳 (의도된 비용) |
| 이미지 API | `ImageProviderAdapter` 구현 (서버 측), 승인과 비용 가드 | Sprint 5 |

## 7. 모드 구조

- **Basic, Detailed, Precision**은 모두 `useWorkspace`가 가진 같은 `ImageSpec`을 읽고 씁니다. 모드는 `useUiPrefs`에 저장되는 보기 설정일 뿐이며 명세에 포함되지 않습니다.
- Basic은 `registry.attributesForTier("basic")`를 범용 `AttributeField`로 그립니다.
- Detailed와 Precision은 Sprint 0에서 "후속 개발 예정" 안내와, 같은 명세를 보여주는 읽기 전용 요약(`SpecSummary`)만 표시합니다.

## 8. 보안과 비용 경계

- 클라이언트 코드에는 네트워크 호출이 없습니다(테스트로 검사).
- `ImageProviderAdapter`는 서버 측 실행, 명시적 비용 승인(`approvedCostUsd`), 지출 한도를 전제로 설계했습니다. 실제 구현은 Sprint 5에서 진행합니다.
- `.env.example`에는 Sprint 0에 필요한 환경 변수가 없다고 명시했습니다.
