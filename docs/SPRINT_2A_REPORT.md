# Sprint 2-A — Detailed Editor Foundation 보고서

- 작성일: 2026-11-24
- 상태: **로컬 구현 승인됨 → 작업 브랜치에 커밋·push 완료, CI 통과, PR 생성(미병합).** main 병합은 별도 승인 대상입니다.
- 브랜치: `feature/sprint-2a-detailed-foundation` (기준 `main` = `21c5582`, main은 변경하지 않음)
- 범위: 승인서의 D1~D10 결정을 반영했습니다. 인물 상세 카탈로그, 제품용 복합 프리셋, Precision, AI·API 기능은 구현하지 않았습니다. 유료 API 호출 0건.

---

## 1. 완료 기준별 증거

### 기준 1 — 같은 명세, 데이터 기반 탐색
> Detailed 트리로 이동해 값을 바꾸면 Basic에서도 같은 값과 같은 프롬프트가 보입니다. 카테고리 배지는 실제 상태와 일치하고, 한·영·별칭 검색으로 바로 이동합니다.

| 증거 | 결과 |
|---|---|
| component `app.test.tsx` › *Basic → Detailed (edit) → Precision → Basic preserves and shares the same spec* | ✅ Detailed에서 카메라 각도를 바꾸면 Basic의 "추가 설정"에도 체크되고 프롬프트가 같음 |
| component `detailed.test.tsx` › *builds the category tree from the catalog…*, *collapses and expands branches*, *shows set counts and warning/blocked badges that follow the spec* | ✅ |
| component `detailed.test.tsx` › *search (ko/en/alias) jumps to the category and focuses the attribute* | ✅ "윤곽"(별칭) → 얼굴형 필드로 포커스, "golden" → 조명 |
| unit `detailed-domain.test.ts` › *builds the tree from catalog data with counts, applicability and badges*, *adding a category and attribute as DATA shows up without code changes*, 검색 5종 | ✅ |
| E2E `detailed.spec.ts` › *Detailed is a superset of Basic sharing one spec…* / *search jumps to a category and attribute* (데스크톱·모바일) | ✅ 4/4 |
| 스크린샷 | `docs/screenshots/sprint-2a/chromium-detailed-lighting.png`, `mobile-detailed-lighting.png` |

### 기준 2 — 보이는 값 ≠ 저장된 값 *(구별 기준)*
> 슬라이더를 보기만 하고 새로고침하거나 내보내면 그 속성은 없습니다. 범위에 한쪽만 입력하면 저장되지 않습니다.

| 증거 | 결과 |
|---|---|
| component › *slider: showing a position stores nothing; only user input stores; clear returns to unset* | ✅ 포커스와 저장 완료 후에도 저장소에 값 없음. 입력 후 `{kind:"number",value:35}` 저장, 해제하면 "미설정" |
| component › *range: half input is never stored or completed with defaults; cancel, invalid, clear and reload behave* | ✅ 최솟값만 입력하면 unset과 안내. 3–2는 오류이고 미저장. 3–6은 저장. "입력 취소". 다시 마운트하면 마지막 유효값 복원. 해제하면 입력칸이 빔 |
| component › *number input: invalid values are shown but not stored* | ✅ |
| E2E › *generic controls: … slider … range* (데스크톱·모바일) | ✅ 실제 브라우저에서 포커스만 하면 `data-state="unset"`, 키 입력 후 set. 최솟값만 입력하면 unset |
| unit › *degree → qualitative band text; the raw number survives JSON round-trip* | ✅ 원본 35가 무손실 저장되고 프롬프트에는 "a gentle smile" |
| 스크린샷 | `chromium-fixture-slider.png`, `mobile-fixture-slider.png` |

### 기준 3 — 프리셋은 미리 보여주고 정확히 되돌림 *(구별 기준)*
> 적용 전에 변경 내용을 보여주고, 덮어쓸 때 확인을 받습니다. 되돌리면 프리셋이 바꾼 속성만 복원하고, 사용자가 그 사이 편집한 속성과 무관한 속성은 유지합니다.

| 증거 | 결과 |
|---|---|
| unit › *plan classifies every patch and never changes the spec* | ✅ change 1 / same 1 / new 2, 유지 목록 2개, 명세 불변 |
| unit › *undo restores only what the preset changed and the user has not touched since* | ✅ restored 3, kept 1(사용자 편집), 무관 속성(분위기) 유지 |
| unit › *a value changed by the user and changed BACK to the preset value is still protected from undo* | ✅ 값이 같아져도 보호되며 source는 user |
| unit › *apply writes only new/changed patches…* / *re-applying a preset over a user value…* / *a direct edit removes preset provenance* | ✅ 무관 속성은 참조까지 동일. origin은 JSON round-trip에서 유지 |
| component › *previews changes, asks before overwriting, applies only what it lists, and undo spares user edits* / *'apply only to empty attributes' keeps existing values* / *cancel applies nothing* / *restricted and inapplicable patches are listed as skipped* | ✅ |
| E2E › *composite preset: preview, overwrite confirmation, apply, undo that spares user edits* (데스크톱·모바일) | ✅ |
| 스크린샷 | `chromium-fixture-preset-dialog.png`, `chromium-fixture-preset-undone.png`, `mobile-fixture-preset-dialog.png` |

### 기준 4 — 중복·모순·정책 처리
> 프리셋 의미와 같은 직접 선택은 한 번만 출력되고, 다른 값은 직접 선택이 우선하며 자동 수정은 없습니다. 연령 조건으로 막힌 선택지는 사유와 함께 비활성이고, 억지로 넣어도 출력되지 않습니다.

| 증거 | 결과 |
|---|---|
| unit › *equivalent meaning is output once, attributed to the direct selection* | ✅ `"Lighting: golden-hour sunlight. Color temperature: warm."` ("warm" 1회) |
| unit › *same attribute, different value: the direct choice wins…the preset selection is preserved* | ✅ `"…Color temperature: cool."`, 경고 0건, 프리셋 선택 유지 |
| unit › *different visual axes are not treated as conflicts (golden hour + cool color grading)* | ✅ info 외 진단 0건 |
| unit › *a genuine conflict is a warning with guidance, distinct from a safety block* | ✅ `backlight-vs-direction` 경고, blocked=false |
| unit › *list units drop cleanly*, *parts of every core lighting preset render exactly the Sprint 1 text* | ✅ |
| unit › *an option restricted by age is reported and the whole output is withheld; the spec is preserved* / *the same appeal is permitted for adults, and coverage/fit are not restricted for minors* | ✅ |
| component › *restricted option is disabled with the reason; adults can select it* / *an imported restricted combination blocks output (desktop preview and mobile copy)* | ✅ |
| E2E › *policy restriction: disabled with reason; imported restricted spec blocks output everywhere* (데스크톱·모바일) | ✅ |
| 스크린샷 | `chromium-fixture-restricted.png`, `chromium-detailed-lighting.png`(대체 안내), `mobile-mobile-toolbar-blocked.png` |

### 기준 5 — 모바일과 기존 데이터 호환성

| 증거 | 결과 |
|---|---|
| component › *mobile toolbar: shows the applied count and status, toggles the preview and copies through the same gate* | ✅ |
| E2E(모바일) › *mobile toolbar: count, status, preview sheet and copy; blocked prompt cannot be copied* | ✅ 미리보기는 기본 숨김(편집 영역을 가리지 않음). 복사한 클립보드 값 일치. 차단되면 복사 비활성 |
| E2E › *Sprint 1 saved work opens unchanged (no migration notice) with the same prompt* (데스크톱·모바일) | ✅ "마지막 작업을 복원했습니다", 변환 알림 0건, 프롬프트는 Sprint 1과 동일 |
| E2E › *Sprint 0 saved data is migrated on load…* | ✅ (0.1.0 → 0.2.0 → 0.3.0 체인) |
| unit › *Sprint 1 JSON and localStorage data load losslessly with no warnings* / *Sprint 1 prompts are unchanged when nothing overrides them (regression)* | ✅ selections 완전 일치, info 외 진단 0건 |
| 스크린샷 | `mobile-mobile-sheet-open.png`, `mobile-mobile-toolbar-blocked.png`, `mobile-detailed-lighting.png` |

---

## 2. 명령 실행 결과 (2026-11-24, macOS, Node 22.23.1, pnpm 10.12.1)

`pnpm verify` → **종료 코드 0**. 실행 순서: typecheck → lint → test → build → verify:isolation → test:e2e.

```text
> tsc --noEmit                         (오류 0)
> eslint . --max-warnings=0            (경고 0)
> vitest run
 Test Files  18 passed (18)
      Tests  344 passed (344)
> next build
Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /e2e-fixtures
> node scripts/verify-prod-isolation.mjs
✓ 149 production output files contain no fixture marker
✓ /e2e-fixtures → 404
✓ /e2e-fixtures?fixtures=1 → 404
✓ /e2e-fixtures?PROMPTER_E2E_FIXTURES=1 → 404
✓ production build isolates the test catalog
> playwright test
  1 skipped
  39 passed (16.2s)
```

격리 검사 대조 확인: 같은 marker 문자열이 E2E 전용 빌드에서는 **2개 파일**에 있고, 일반 빌드에서는 **0개**입니다. 검사가 실제로 차이를 구분합니다.

### 단위·컴포넌트 테스트 (344 = 기존 274 + 신규 70)
| 파일 | 수 | | 파일 | 수 |
|---|---|---|---|---|
| unit/safety | 59 | | unit/rules | 15 |
| **unit/detailed-domain (신규)** | **47** | | unit/compiler | 14 |
| unit/catalog | 42 | | unit/independence | 14 |
| component/app | 29 | | unit/storage | 11 |
| unit/json | 26 | | unit/migration, unset | 9, 9 |
| **component/detailed (신규)** | **23** | | unit/reset-undo, language | 8, 7 |
| unit/search | 19 | | unit/spec, recovery, provider | 5, 4, 3 |

### E2E (Desktop Chrome + Pixel 7, 테스트 20개 × 2 = 40)
- 39개 통과. 1개 skip은 모바일 전용 테스트(*mobile toolbar…*)를 데스크톱 프로젝트에서 건너뛴 것입니다.
- 모든 테스트에서 로컬 서버 외 요청 0건(네트워크 감시).
- 신규 `e2e/detailed.spec.ts` 7개, 갱신 `basic-flow`·`composer`(Detailed가 편집기로 바뀐 것과 모바일 미리보기 패널 반영).

---

## 3. 구현된 공통 기능
- **Detailed Editor**: 카탈로그 기반 카테고리 트리, 검색과 이동, 범용 카테고리 패널, DRAFT 영역 안내(설계 문서 경로), 인물 영역 비적용 안내, 3단·반응형 레이아웃
- **노출 규칙(D1)**: Detailed = Basic 11 + 조명 속성 6. 스타일 축 5개 보류, 인물 14개 영역은 DRAFT(속성 0), precision 비노출
- **범용 컨트롤 9종**(§5)과 unset 처리
- **복합 프리셋**(§6), **의미 단위 컴파일**(ADR-029), **정책 제한**(ADR-033)
- **모바일 하단 도구 모음과 미리보기 패널**(Basic·Detailed 공통)
- **테스트 카탈로그 격리**와 CI 단계 추가

## 4. 카탈로그 구조와 변경 사항
| 항목 | 변경 |
|---|---|
| 형식 | 0.2.0 → **0.3.0** (ADR-026) |
| core 내용 | 0.2.0 → **0.3.0**: 카테고리 23개(기본 1, 인물 1+14 DRAFT, 공통 1+6), 모든 속성에 `status`·`categoryId`, 조명 프리셋 8종에 `parts`(Sprint 1 문구와 정확히 일치), 규칙 `backlight-vs-direction` 추가, 빈 마이그레이션 단계. **새 선택지 없음** |
| 프리셋 | core 0개. 테스트 카탈로그에만 4개 |
| ImageSpec | 0.1.0 → **0.2.0** (`origin`) |
| 설계 문서 | `docs/catalogs/` README, ATTRIBUTE_TEMPLATE, DRAFT 16개 |

## 5. 범용 컨트롤 목록
| control | 타입 | unset 복귀 | 검증 |
|---|---|---|---|
| chips | single·multi | 선택 해제 | 기존 + 제한 선택지 비활성 |
| dropdown | single | "— 미설정 —" | component |
| cards | single·multi | 선택 해제 | 예시 이미지, 확대, "예시 이미지 준비 중", 영어 용어 (component, E2E) |
| searchable | single·multi | 선택 해제 | 별칭 검색, 선택 항목 고정 표시 (component, E2E) |
| color | single·multi | 선택 해제 | 팔레트 swatch만 (D6) |
| slider | number | 선택 해제 | 입력할 때만 저장, 정성 표현, 물리적 정확성 부인 문구 |
| number | number | 입력 비우기 | 범위 밖 값 미저장 |
| range | range | 양쪽 비우기 / 선택 해제 | 양쪽이 모두 유효할 때만 저장, 입력 취소 |
| text / textarea | text | 입력 비우기 | 기존 |

## 6. 프리셋 처리 구조
```text
planPreset(spec, preset)          → entries[new|change|same|inapplicable|restricted], untouched[], conflictsAfter[]   (명세 불변)
PresetDialog                      → [기존 값을 덮어쓰고 적용] / [비어 있는 항목만 적용] / [취소]
applyPresetPlan(…, "all"|"onlyEmpty") → source=preset + origin, 세션 트랜잭션(before/after/changes)
사용자 편집                        → source=user(origin 제거), 트랜잭션.userEdited += 속성
undoPresetTransaction             → userEdited가 아니고 현재 값이 적용 직후와 같은 객체일 때만 before로 복원
```

## 7. 변경 파일 (main `21c5582` 대비, 미커밋)
- **신규 — 도메인**: `catalog/categories.ts`, `catalog/phrase.ts`, `presets/presets.ts`
- **신규 — UI**: `components/controls/Controls.tsx`, `WorkspaceField.tsx`, `components/detailed/{DetailedEditor,CategoryNav,PresetDialog}.tsx`, `components/clipboard.ts`
- **신규 — 테스트 격리**: `src/testing/{fixtureCatalog.ts,FixtureApp.tsx}`, `src/app/e2e-fixtures/page.tsx`, `scripts/verify-prod-isolation.mjs`
- **신규 — 테스트**: `tests/unit/detailed-domain.test.ts`, `tests/component/detailed.test.tsx`, `e2e/detailed.spec.ts`, `e2e/helpers.ts`, `tests/fixtures/sprint1/`(Sprint 1 코드로 생성한 실제 데이터)
- **신규 — 문서**: `docs/catalogs/`(18개), `docs/screenshots/sprint-2a/`(36장), 이 보고서
- **수정 — 도메인**: `catalog/{schema,registry,applicability,catalogs/core}.ts`, `compiler/{compiler,types}.ts`, `spec/{schema,migrations,factory,operations}.ts`, `validation/specValidator.ts`, `index.ts`
- **수정 — UI·상태**: `PrompterApp`, `PromptPreview`, `AttributeField`, `OptionPicker`, `BasicComposer`, `ModePanel`, `SpecSummary`, `diagnostics.ts`, `globals.css`, `i18n/messages.ts`, `state/{useWorkspace,workspaceReducer}.ts`
- **수정 — 설정과 테스트**: `next.config.ts`, `playwright.config.ts`, `package.json`(verify:isolation), `.github/workflows/ci.yml`, `.gitignore`, `eslint.config.mjs`, `tsconfig.json`, 기존 테스트 7개 파일(버전 기대값과 Detailed 동작 반영), 문서 5개

## 8. 브라우저 검증 결과
- Playwright가 **E2E 전용 프로덕션 빌드**에서 실행합니다: 제품 화면 `/`와 테스트 카탈로그 화면 `/e2e-fixtures`, Desktop Chrome과 Pixel 7.
- **E2E로 발견해 고친 실제 결함**:
  1. 모바일 Detailed에서 데스크톱용 2열 그리드 규칙이 우선 적용되어 편집 영역 폭이 0이 되던 문제
  2. 정책 제한으로 차단될 때 미리보기에 사유가 표시되지 않던 문제(component 테스트로 발견)
- 이 개발 세션의 sandbox 안에서는 Chromium이 시작되지 않아 E2E는 sandbox 밖에서 실행했습니다(코드 문제 아님).

## 9. 주요 UI 스크린샷 (`docs/screenshots/sprint-2a/`, CSS 픽셀 배율)
| 화면 | 데스크톱 | 모바일 |
|---|---|---|
| Detailed 조명(의미 단위 대체, 배지) | `chromium-detailed-lighting.png` | `mobile-detailed-lighting.png` |
| 인물 영역 DRAFT 안내 | `chromium-detailed-draft.png` | `mobile-detailed-draft.png` |
| 시각 카드 / 확대 | `chromium-fixture-cards.png`, `chromium-fixture-card-zoom.png` | `mobile-fixture-cards.png` |
| 슬라이더 | `chromium-fixture-slider.png` | `mobile-fixture-slider.png` |
| 프리셋 확인 / 되돌린 뒤 | `chromium-fixture-preset-dialog.png`, `chromium-fixture-preset-undone.png` | `mobile-fixture-preset-dialog.png` |
| 정책 제한 | `chromium-fixture-restricted.png` | `mobile-fixture-restricted.png` |
| 모바일 미리보기 패널 / 차단 상태 | — | `mobile-mobile-sheet-open.png`, `mobile-mobile-toolbar-blocked.png` |
| Precision 예정 안내 | `chromium-precision-placeholder.png` | `mobile-precision-placeholder.png` |

참고: 전체 페이지 캡처에서는 sticky·fixed 요소(탐색, 미리보기, 모달 배경, 하단 도구 모음)가 캡처 시점의 스크롤 위치에 그려집니다. 실제 화면의 배치와 다르게 보일 수 있습니다.

## 10. 기존 데이터 호환성
- Sprint 0·1에서 **실제로 생성한** JSON과 localStorage 데이터를 무손실로 읽습니다. 변환 체인은 ImageSpec 0.1.0 → 0.2.0, 카탈로그 0.1.0 → 0.2.0 → 0.3.0입니다.
- Sprint 1 데이터는 변환 기록 없이(ID 변경 없음) 열리고, 프롬프트가 Sprint 1과 문자 단위로 같습니다.
- **한계**: 새로 내보낸 JSON(0.2.0)은 Sprint 0·1 앱이 읽지 못합니다(ADR-028).

## 11. 알려진 한계
- 인물 영역은 구조만 있고 편집할 속성이 없습니다(2-B 승인 대상). 그래서 정책 제한, 카드, 슬라이더 등은 **테스트 카탈로그로만** 실사용 흐름을 검증했습니다.
- 의미 단위 대체는 `parts`가 정의된 문구에만 적용됩니다(현재 조명 프리셋 8종). 모델별 표현(`byAdapter`) 문구는 불투명하게 취급합니다.
- 프리셋 되돌리기는 세션 내 마지막 1회만 지원합니다(새로고침하면 사라짐).
- 색상은 팔레트만 지원하고 자유 색상값은 후속 개발입니다(ADR-034).
- 미노출 속성 값이 가져오기로 들어오면 UI에서 편집할 수는 없고, 프롬프트와 Precision 요약에서만 보입니다.
- 안전 정책의 한계(ADR-019)는 그대로입니다. 정책 제한은 구조화 선택에 대한 예방 장치일 뿐 의미 기반 검열이 아닙니다.
- 실제 기기, Safari·Firefox, 스크린 리더, 다크 모드 화면은 검증하지 않았습니다.

## 12. 기술 부채
| 항목 | 제안 |
|---|---|
| 카테고리 트리의 키보드 탐색(트리 역할, 화살표 키) 미구현 | 접근성 개선 |
| 시각 예시 자산 파이프라인 없음(메타데이터만) | 자산 제작 정책 결정 후 |
| 컨트롤별 컴포넌트 단위 테스트가 앱 통합 테스트 안에 있음 | 컨트롤이 늘어나면 분리 |
| 프리셋 대화상자 포커스 트랩 미구현 | 접근성 개선 |
| ESLint 9 지원 종료 경고(Sprint 1에서 이월) | eslint-config-next의 ESLint 10 지원 후 |

## 13. Git 및 CI 상태 (최종)
| 항목 | 값 |
|---|---|
| 구현 커밋 | `0af6b0f` — feat: implement Sprint 2-A detailed editor foundation |
| 보고서 갱신 커밋 | 이 문서를 수정한 후속 커밋 (해시는 최종 보고에 기재) |
| 원격 작업 브랜치 | `origin/feature/sprint-2a-detailed-foundation` (로컬과 동기화) |
| main | `21c5582` 그대로 (직접 push 없음, 병합 없음) |
| Pull Request | https://github.com/nyfever007/prompt-helper/pull/1 (main 대상, **미병합**) |
| 작업 트리 | 커밋 후 깨끗함 (생성물 `.next`, `.next-e2e`, `test-results`는 `.gitignore`로 제외) |

### 13.1 GitHub Actions 결과 (`0af6b0f`)
| 실행 | 이벤트 | 결과 |
|---|---|---|
| [45325156909](https://github.com/nyfever007/prompt-helper/actions/runs/45325156909) | push | ✅ success |
| [45325220794](https://github.com/nyfever007/prompt-helper/actions/runs/45325220794) | pull_request | ✅ success |

CI 로그 발췌(push 실행):
```text
Run pnpm test          Tests  344 passed (344)
Run pnpm build         Route (app) … └ ○ /e2e-fixtures
Run pnpm verify:isolation
  ✓ 149 production output files contain no fixture marker
  ✓ /e2e-fixtures → 404
  ✓ /e2e-fixtures?fixtures=1 → 404
  ✓ /e2e-fixtures?PROMPTER_E2E_FIXTURES=1 → 404
  ✓ production build isolates the test catalog
Run pnpm test:e2e      1 skipped · 39 passed (30.8s)
```
- **일반 프로덕션 빌드와 E2E 전용 빌드 구분을 CI에서 확인**했습니다. 일반 빌드(`pnpm build`) 직후 `verify:isolation`이 통과했고, E2E 단계는 별도 E2E 빌드(`.next-e2e`)에서 테스트 카탈로그 화면까지 검증했습니다.
- **CI에서 발견된 문제: 없음.** 수정 없이 첫 실행에서 통과했습니다.
- Sprint 1 CI에 있던 **Node 20 지원 종료 경고(annotation)는 0건**입니다(action 버전 업그레이드 효과).

## 14. 다음 단계 (승인 필요)
1. PR #1 검토 후 main 병합 여부를 결정합니다(별도 승인).
2. Sprint 2-B: `docs/catalogs/person/*.md` 설계 승인 순서를 정한 뒤 영역별로 실제 속성을 추가합니다. 승인 대상은 연령 표현 정책(identity)과, 그와 연결된 정책 제한 대상(표정·인상, 의상)입니다.
