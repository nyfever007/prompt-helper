# 로드맵 및 진행 현황

> 단계 정의와 완료 기준의 원본은 [PROMPTER_MASTER_PLAN.md](../PROMPTER_MASTER_PLAN.md) §10입니다. 이 문서는 진행 상태만 추적합니다.
> 스프린트 번호는 순서일 뿐 기간을 고정하지 않습니다. 다음 스프린트는 사용자 승인 후에만 시작합니다.

| 단계 | 내용 | 상태 |
|---|---|---|
| **Sprint 0 — Foundation** | 독립 저장소, 버전이 붙은 ImageSpec과 카탈로그, 검증기, 결정론적 컴파일러, Basic 최소 기능, JSON 입출력, 로컬 저장, 테스트와 문서 | ✅ **승인됨 (2026-11-24)** ([보고서](SPRINT_0_REPORT.md)) |
| **Sprint 1 — Basic composer** | 상황별 선택지, 검색 가능한 스타일 프리셋(독립 축 구조), 구도·방향·각도, 장소·배경, 분위기, 조명 프리셋(독립 속성 구조), 화면비, 출처·진단, 충돌 안내, 안전 정책 기준선, 언어 정책, ID 마이그레이션, 부분 복구, 초기화 되돌리기, CI 설정 파일 | ✅ 구현 완료 · **검토 대기** ([보고서](SPRINT_1_REPORT.md)) |
| Sprint 2 — Detailed person editor | 얼굴, 피부, 체형, 헤어, 표정, 의상, 포즈, 카메라, 개별 조명 속성 편집. 체형·노출·분위기의 독립성(정책 태그 축은 Sprint 1에서 준비) | ⏸ 승인 대기 |
| Sprint 3 — Precision editor | 위치와 개수 지정, 부위별 속성, 중요도, 유지/제외 조건, 참조 이미지 역할(메타데이터) | ⏳ 예정 |
| Sprint 4 — Style taxonomy & non-person | 직교 스타일 축, 카탈로그 확장, 풍경·건축·제품·게임 에셋 | ⏳ 예정 |
| Sprint 5 — Image API & live validation | OpenAI provider adapter(서버 측), 비용 가드, 실행 이력, 결과 비교 | ⏳ 예정 |
| Sprint 6 — Product validation | 실사용자 검증, 지표, 유료화 탐색 | ⏳ 예정 |

## 보류 (지시문에 따라 후속 개발)

| 항목 | 상태 | 비고 |
|---|---|---|
| Image-to-Image | 보류 | `TaskSchema`가 현재 `"text-to-image"`만 허용. 추가 시 스키마 minor 버전 올림 |
| 동영상 생성 | 보류 | 계획서 §2 "Not initially in scope" |

## 미리 마련한 확장 구조와 현황

| 구조 | 도입 | 현황 / 사용 예정 |
|---|---|---|
| tier 필터 (`attributesForTier`, `attributesVisibleIn`) | Sprint 0 | Sprint 1에서 스타일·조명 축 속성을 detailed tier로 정의. 편집 UI는 Sprint 2·4 |
| `multi`, `number`, `range` 값 타입과 범용 컨트롤 | Sprint 0 | multi는 분위기에 사용 중. number/range는 fixture로 검증 |
| 적용 조건(`appliesWhen`, 속성·선택지 단위), 계층 매칭 | Sprint 0 / 1 | 구도·방향·각도에 사용 중 |
| 규칙(충돌·의존성·가시성) + guidance/actions | Sprint 0 / 1 | core 규칙 7개 사용 중 |
| 선택지 계층(`parentId`), 별칭, 검색 | Sprint 0 / 1 | 스타일·장소에 사용 중. 피사체 하위 분류는 Sprint 4 (fixture로 검증) |
| 분류 정보(`classification`) | Sprint 1 | 스타일·조명 프리셋. 축 편집기는 Sprint 4 / Detailed |
| 정책 태그(`policyTags`) | Sprint 1 | core에는 아직 없음. 인물 속성(Sprint 2)에서 사용 예정, fixture로 검증 |
| 파라미터 채널(`channel`, `parameterValue`) | Sprint 1 | 화면비. provider 연동은 Sprint 5 |
| 시각 예시 메타데이터(`examples`) | Sprint 0 | 자리표시자만 있음. 실제 자산은 Sprint 2·4 |
| `prompt.byAdapter` (모델별 표현) | Sprint 0 | Sprint 5 |
| `priority` 필드 | Sprint 0 | 스키마만 있음. Sprint 3 |
| 스키마 마이그레이션 훅 / 카탈로그 ID 마이그레이션 | Sprint 0 / 1 | 카탈로그 마이그레이션 1건 사용 중 (`style.visual` → `style.preset`) |
| `ImageProviderAdapter` | Sprint 0 | Sprint 5 |
| CI 설정 파일 | Sprint 1 | 원격(GitHub) 연결 완료, GitHub Actions에서 실행 |
