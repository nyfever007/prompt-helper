# 로드맵 및 진행 현황

> 단계 정의와 완료 기준의 원본은 [PROMPTER_MASTER_PLAN.md](../PROMPTER_MASTER_PLAN.md) §10입니다. 이 문서는 진행 상태만 추적합니다.
> 스프린트 번호는 순서일 뿐 기간을 고정하지 않습니다. 다음 스프린트는 사용자 승인 후에만 시작합니다.

| 단계 | 내용 | 상태 |
|---|---|---|
| **Sprint 0 — Foundation** | 독립 저장소, 버전이 붙은 ImageSpec과 카탈로그, 검증기, 결정론적 컴파일러, Basic 최소 기능, JSON 입출력, 로컬 저장, 테스트와 문서 | ✅ **승인됨 (2026-11-24)** ([보고서](SPRINT_0_REPORT.md)) |
| Sprint 1 — Basic composer | 상황에 맞는 피사체, 스타일 프리셋, 구도, 배경, 화면비, 자유 입력. unset 유지와 무손실 저장 | 🚧 승인됨 · 진행 중 |
| Sprint 2 — Detailed person editor | 얼굴, 피부, 체형, 헤어, 표정, 의상, 포즈, 카메라, 조명. 체형·노출·분위기의 독립성. 옵션 검색. 충돌 경고 | ⏳ 예정 |
| Sprint 3 — Precision editor | 위치와 개수 지정, 부위별 속성, 중요도, 유지/제외 조건, 참조 이미지 역할(메타데이터) | ⏳ 예정 |
| Sprint 4 — Style taxonomy & non-person | 직교 스타일 축, 카탈로그 확장, 풍경·건축·제품·게임 에셋 | ⏳ 예정 |
| Sprint 5 — Image API & live validation | OpenAI provider adapter(서버 측), 비용 가드, 실행 이력, 결과 비교 | ⏳ 예정 |
| Sprint 6 — Product validation | 실사용자 검증, 지표, 유료화 탐색 | ⏳ 예정 |

## 보류 (지시문에 따라 후속 개발)

| 항목 | 상태 | 비고 |
|---|---|---|
| Image-to-Image | 보류 | `TaskSchema`가 현재 `"text-to-image"`만 허용. 추가 시 스키마 minor 버전 올림 |
| 동영상 생성 | 보류 | 계획서 §2 "Not initially in scope" |

## Sprint 0에서 미리 마련한 확장 구조 (기능은 미구현)

| 구조 | 사용 예정 시점 |
|---|---|
| `tier: detailed / precision` 속성 필터 (`attributesForTier`, `attributesVisibleIn`) | Sprint 2, 3 |
| `multi`, `number`, `range` 값 타입과 범용 컨트롤 | Sprint 1~3 |
| `appliesWhen` 조건과 `rules`(충돌, 의존성, 가시성) 평가 | Sprint 1~2 |
| 옵션 `parentId`(계층), `aliases`(검색), `examples`(시각 예시 메타데이터) | Sprint 2, 4 |
| `prompt.byAdapter` (모델별 표현) | Sprint 5 |
| `priority` 필드 (스키마만 있음, UI 없음) | Sprint 3 |
| `SPEC_MIGRATIONS` 훅 | 스키마가 변경되는 첫 스프린트 |
| `ImageProviderAdapter` 인터페이스 | Sprint 5 |
