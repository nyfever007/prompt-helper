# 조명 (Lighting) — 카탈로그 설계

> **설계 상태: DRAFT** — 실제 속성과 선택지는 별도 제품 설계 승인 후 작성합니다(Sprint 2-B 이후).
> 템플릿: [../ATTRIBUTE_TEMPLATE.md](../ATTRIBUTE_TEMPLATE.md)

## 1. 설계 상태
- 상태: DRAFT
- 관련 Sprint: 2-B (예정)

## 2. 설계 목적
- 다룰 범위(초안): 광원, 방향, 질감, 밝기, 색온도, 대비, 빠른 프리셋.
- 다루지 않는 것: TBD

## 3~15. 속성별 설계
TBD — 승인 전. 속성마다 템플릿 §3~§15를 채웁니다.

## 참고: 이미 승인되어 사용 중인 속성
| Attribute ID | 이름 | 상태 |
|---|---|---|
| `lighting.preset` | 조명 빠른 프리셋 (12종, 의미 단위 parts 포함) | approved (Sprint 1) |
| `lighting.source` · `.direction` · `.softness` · `.intensity` · `.color_temperature` · `.contrast` | 조명 속성 6개 | approved for Detailed (Sprint 2-A, D1) |

설계 원칙: 프리셋 문구의 의미 단위는 같은 축을 직접 설정하면 직접 설정이 대신 출력합니다(중복 없음, 직접 선택 우선). 촬영 시간대·광원 색온도·컬러 그레이딩은 서로 다른 축입니다.

## 16. 변경 이력
| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
