# 카탈로그 설계 템플릿 (Attribute Design Template)

> 각 영역 문서(`person/*.md`, `shared/*.md`)는 이 템플릿을 따릅니다.
> 속성(attribute) 하나마다 §3~§14를 반복합니다.
> 이 문서는 **설계 문서**입니다. 카탈로그 데이터(`src/domain/catalog/catalogs/core.ts`)에는 승인된 설계만 반영합니다.

## 1. 설계 상태
- 상태: `DRAFT` | `REVIEW` | `APPROVED` | `DEFERRED`
- 담당 / 검토자:
- 관련 Sprint:

## 2. 설계 목적
이 영역이 사용자에게 어떤 표현력을 주는지, 무엇을 의도적으로 **다루지 않는지** 적습니다.

---

## 3. 속성의 의미
한 문장 정의. 다른 속성과 겹치지 않는 **독립된 의미 축**인지 설명합니다.

## 4. Attribute ID
- `person.face.shape` 같은 점 구분 소문자 ID. 한 번 공개하면 바꾸지 않습니다. 바꿔야 하면 카탈로그 `migrations`에 renameAttribute와 사유를 남깁니다.
- 소속: `domain`, `categoryId`(Detailed 탐색), `groupId`(Basic 배치, 해당 시)

## 5. 한글 / 영어 명칭
| 구분 | 값 |
|---|---|
| 한국어 라벨 | |
| English label | |
| 별칭(aliases, 검색용, 다국어) | |
| 설명(description) | |

## 6. 입력 방식
- 데이터 타입: `single` / `multi` / `number` / `range` / `text`
- UI 컨트롤(`control`): `chips` / `dropdown` / `cards` / `searchable` / `color` / `slider` / `number` / `range` / `text` / `textarea`
- number/range인 경우 의미(`semantics`): `degree`(정성 bands 필수) / `physical`(unit 필수) / `ratio` / `position` / `count`
- tier(가장 먼저 노출되는 모드): basic / detailed / precision
- 노출 상태(`status`): approved / draft / deferred
- 권장 기본값(`defaultValue`, 제안만 함 — 자동 적용 금지):

## 7. 선택지 정의
| option id | 한국어 | English | 설명 | 상위(parentId) | 정책 태그 |
|---|---|---|---|---|---|

선택지 개수에 임의 상한을 두지 않습니다. 목록은 확장 가능한 시작점입니다.

## 8. 선택지별 영어 프롬프트 표현
| option id | prompt.text | 의미 단위(`parts`, 해당 시) | 모델별 표현(byAdapter, 해당 시) |
|---|---|---|---|

규칙: 표현은 선택지의 의미만 담습니다. 선택하지 않은 외형·연령·국적·체형·의상·노출을 덧붙이지 않습니다.

## 9. 적용 조건
- 속성 적용 조건(`appliesWhen`):
- 선택지별 적용 조건:
- 적용 불가가 된 기존 선택은 **유지하고 컴파일에서 제외**하며 사용자에게 알립니다.

## 10. 속성 독립성
이 속성이 바뀔 때 **바뀌면 안 되는** 다른 속성 목록. 예: 얼굴형 ↔ 체형·표정·귀여움.

## 11. 충돌 및 의존성
| 규칙 id | 종류(conflict/dependency/visibility) | 조건 | 심각도 | 해결 안내(ko/en) | 제안 동작 |
|---|---|---|---|---|---|

실제로 양립하기 어려운 조합만 충돌로 정의합니다. 서로 다른 의미 축(예: 촬영 시간대 ↔ 컬러 그레이딩)은 충돌이 아닙니다.

## 12. 안전 정책
- 정책 태그(`policyTags`): 체형(`body.*`)·핏(`fit.*`)·노출 범위(`coverage.*`)·인상(`appeal.*`)은 **서로 다른 축**으로 태깅합니다.
- 정책 제한(`restriction`): 조건, 사유(ko/en), 정책 규칙 id
- 허용되어야 하는 정상 조합 테스트 목록:
- 로컬 키워드 검사의 한계와 별개로, 구조화 선택은 태그·제한으로 검증합니다.

## 13. 시각 예시 제작 기준
- 통제 비교: 같은 피사체·구도·조명에서 **해당 속성만** 바꿉니다.
- 메타데이터: `examples[{ id, status, src, alt(ko/en), provenance(source, license) }]`
- 자산이 없으면 `status: placeholder`로 두고 UI에 "예시 이미지 준비 중"을 표시합니다. 미성년자·노출 관련 예시는 제작하지 않습니다.

## 14. Basic / Detailed / Precision 연결
- Basic 노출 여부와 형태:
- Detailed 위치(카테고리 경로):
- Precision 확장(위치·개수·중요도 등):
- 관련 프리셋(복합 프리셋 패치 포함):

## 15. 테스트 요구사항
- unset 유지와 명시적 기본값 구분
- 다른 속성과의 독립성(모든 쌍)
- 적용 조건과 복귀
- 프롬프트 기대 출력(결정론)
- JSON round-trip
- 안전 정책: 차단해야 할 조합과 허용해야 할 조합
- 검색(한·영·별칭)

## 16. 변경 이력
| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
