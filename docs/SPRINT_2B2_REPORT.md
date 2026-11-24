# Sprint 2-B.2 보고서 — 얼굴 및 이목구비 (Face & facial features)

- 상태: **구현 완료, 검토 대기** — 커밋·push 하지 않음
- 브랜치: `feature/sprint-2b2-facial-features` (기준 main `9dc84b3`)
- 로컬 전체 검증: `pnpm verify` **종료 코드 0** — 단위·컴포넌트 514개 통과, 격리 검증 통과, E2E 47 통과 / 1 skip
- CI 대응: 첫 CI에서 500개 무작위 명세 속성 테스트가 5초 제한을 넘었습니다(속성 증가로 안전 검사 비용 증가, CI 6.5초 / 로컬 2.7초). 제한 시간을 늘리지 않고 안전 검사에 신호별 합집합 정규식 사전 필터를 넣어 결과는 같고 속도는 약 6배 빨라졌습니다(로컬 2.7초 → 0.44초). 동일성은 900개 이상 문구로 기존 방식과 비교하는 테스트로 검증합니다(`safety` › “pre-filter … gives identical results”).

## 1. 구현된 속성과 선택지

| 영역 | 속성 | 형태(칩·팔레트) | 상대 슬라이더 | 다중 선택 | 색상 |
|---|---|---|---|---|---|
| 얼굴 | 10 | 5 (얼굴형, 광대, 턱선, 턱끝, 볼) | 5 (길이, 너비, 이마 높이, 이마 너비, 대칭성) | 광대, 턱선, 턱끝, 볼 | — |
| 눈 | 13 | 5 (모양, 깊이, 쌍꺼풀, 홍채 색상, 동공 모양) | 8 (크기, 너비, 높이, 간격, 눈꼬리 각도, 홍채 크기, 속눈썹 길이·밀도) | 쌍꺼풀 | 홍채 |
| 눈썹 | 8 | 2 (모양, 색상) | 6 (두께, 길이, 밀도, 각도, 높이, 간격) | — | 눈썹 |
| 코 | 8 | 3 (전체 모양, 콧대 모양, 코끝 모양) | 5 (길이, 너비, 콧대 높이, 코끝 각도, 콧볼 너비) | — | — |
| 입술 | 8 | 4 (전체 모양, 비율, 큐피드 보우, 자연 색상) | 4 (입 너비, 윗·아랫입술 두께, 입꼬리) | 전체 모양 | 자연 입술 |
| **합계** | **47** | **19 (선택지 107개, 사용자 정의 15개)** | **28 (각 의미 구간 5개)** | 6 | 3 |

- 승인된 선택지는 모두 그대로 넣었습니다. 프롬프트 순서는 인물 기본 정보 바로 뒤(217–263)입니다.
- 모든 속성은 Direct 역할이며 출력 토글을 지원하고, 1인 피사체에 적용됩니다.
- 인물 영역 중 approved: 인물 기본 정보, 얼굴, 눈, 눈썹, 코, 입술. 나머지 9개(피부·헤어·신체·표정·메이크업·의상·액세서리·자세 등)는 DRAFT 유지.
- 핵심 카탈로그만 0.4.0 → 0.5.0으로 올렸습니다(속성 추가, ID 변경 없음). ImageSpec 0.3.0, 형식 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0은 그대로입니다.

## 2. 기존 공통 기능 재사용

새 스키마나 전용 아키텍처 없이 2-B.1 공통 기능만 썼습니다.

| 공통 기능 | 사용처 |
|---|---|
| `degree` 슬라이더 + 의미 구간 | 정도 속성 28개(1–5, 구간 5개). 표시 위치는 저장 안 함 |
| 색상 팔레트 컨트롤 | 홍채·눈썹·자연 입술 색상 |
| 사용자 정의 값(`CustomEntry`) | 형태·색상 15개 속성. 이름만 입력하면 안내 |
| 프롬프트 포함·제외 / 표현 역할 | 47개 전부(`outputToggle`, Direct) |
| `covers` 의미 중복 제거 | 코 전체 모양 → 콧대 모양(직선형·로마형·매부리형·오목한 코) |
| 규칙(비차단 경고) | 반대 특징 26개 |
| 검색(한·영·별칭) | 속성·선택지 별칭(예: 광대, V라인, 속쌍, 매부리코, 콧볼, cupid) |
| 카테고리 초기화·복원, 출처 추적, 안전 정책, 모바일 Detailed Editor | 그대로 사용 |

## 3. 초기 설계 대비 변경 사항 (개발 중 판단)

| 항목 | 내용 | 이유 |
|---|---|---|
| 다중 선택 | 광대·턱선·턱끝·볼·쌍꺼풀·입술 전체 모양은 다중 선택 | 승인서 §4 “높은 광대와 돌출된 광대 공존” 등 함께 존재하는 특징 표현. 실제 반대 쌍만 경고(예: 평평한↔돌출된, 높은↔낮은, 외꺼풀↔쌍꺼풀, 얇은↔도톰한) |
| 상대 슬라이더 표시 | 숫자 대신 구간 이름만 표시(“3 · 보통” → “보통”) | 승인서 §5. 모든 degree 슬라이더에 공통 적용(ADR-049). 2-A 테스트 2건의 표시 단언을 구간 이름으로 바꿈 |
| 코 모양 covers + 충돌 규칙 3개 | 같은 의미는 한 번 출력, 어긋나면 경고 | 승인서 §4 “동일 의미 중복은 컴파일러 규칙으로, 실제 충돌은 안내” |
| 사용자 정의 미적용 | 눈 깊이, 콧대 모양, 입술 비율, 큐피드 보우 | 닫힌 정도·방향 구분이라 자유 입력보다 선택지가 적절. 나머지 형태·색상은 모두 지원 |
| 영어 표현 다듬기 | 정도 구간 텍스트(예: “medium-sized”, “medium fullness”, “pointing straight ahead”), 입꼬리는 “Mouth corners at rest”, 코 모양은 “Nose shape: Roman”처럼 명사 반복 제거 | 승인서 §2 “의미 유지 범위의 영어 개선” 허용. 표정과 구분하기 위해 “at rest” 추가 |
| 라벨·별칭·설명 보완 | 각 속성 설명에 “다른 값을 자동 설정하지 않음”, “측정값이 아님”, “메이크업 아님” 등 명시 | 독립성 원칙을 화면에서 안내 |

## 4. 프롬프트 출력 예시 (테스트에서 확인된 정확한 문자열)

승인서 §7 예시 속성을 설정했을 때(설정한 19개 속성만 출력):

```text
Main subject: a single person. Actual age: 28 years old. Gender: woman. Face shape: oval. Jawline: rounded, soft. Cheeks: full.
Eye shape: almond-shaped. Eye size: large. Outer eye corners: slightly upturned. Iris color: dark brown. Eyelash length: long.
Eyelash density: dense. Eyebrow shape: softly arched. Nasal bridge height: high. Nasal bridge shape: straight. Nasal tip: rounded.
Upper lip: medium fullness. Lower lip: full. Natural lip color: rose.
```

| 입력 | 출력 |
|---|---|
| 광대 높은 + 돌출된 | `Cheekbones: prominent, high.` (경고 없음) |
| 광대 평평한 + 돌출된 | 둘 다 출력 + “서로 반대되는 특징” 경고 |
| 매부리형 코 + 볼록한 콧대 + 콧대 높이 4 | `Nose shape: aquiline. Nasal bridge height: high.` (콧대 모양은 같은 의미라 생략, 출처 표시) |
| 매부리형 코 + 오목한 콧대 | 둘 다 출력 + 경고 |
| 사용자 정의 홍채 “오드아이” + 표현 | `Iris color: heterochromatic irises, one blue and one amber.` |

## 5. 테스트 결과

```text
pnpm verify → exit 0
 Test Files  24 passed (24)
      Tests  514 passed (514)
✓ 149 production output files contain no fixture marker
✓ production build isolates the test catalog
  1 skipped
  47 passed
```

| 검증 항목 | 테스트 |
|---|---|
| 5개 카테고리·47개 속성 등록, 데이터 무결성(승인 목록을 테스트에 독립 기록해 비교) | `facial-catalog` › “registers exactly the approved attributes…”, “shapes keep their approved ids/expressions…” |
| 상대 슬라이더 의미 구간 / 모든 선택지·구간의 출력 문장 / 숫자 미출력 | `facial-catalog` › “relative attributes are 1–5 degree sliders…”, “every option and every band compiles alone…” |
| 단일·다중 선택, 반대 특징 경고 8종, 함께 존재하는 특징 | `facial-catalog` › independence 4건 + `it.each` 8건, `component/facial` |
| 의미 중복(covers)·충돌 | `facial-catalog` › “overall nose shape vs bridge…” |
| 사용자 정의 값, 색상 선택 | `facial-catalog` › custom, `component/facial` › “palette color + custom color…” |
| 한·영 검색 | `facial-catalog` › search 10건 |
| 포함·제외, 미선택 속성 미출력, 저장·JSON 왕복, 카테고리 초기화·복원 | `facial-catalog` › reuse 3건, `component/facial`, E2E |
| 속성 간 독립성 / 표정·인상·성별·민족 연결 표현 없음 | `facial-catalog`, 기존 `independence` 500개 무작위 명세(얼굴 속성 포함) |
| 기존 안전 정책 유지 | `facial-catalog` › “no facial phrase raises any safety signal…”, “existing safety policy is unchanged…” |
| Identity·Basic 회귀 | 기존 테스트 전체 통과(Sprint 0·1·2-A 프롬프트 골든, Identity 관련 130건) |
| 데스크톱·모바일 E2E | `e2e/facial.spec.ts`(2건: 입력 → 새로고침 유지 → 카테고리 초기화·복원, 외부 요청 0건), 기존 E2E 전체 |

기존 테스트 수정은 승인된 범위·버전 변화(카탈로그 0.5.0, 노출 속성 목록, 얼굴 영역 approved로 “설계 중 예시”를 피부로 교체, 슬라이더 표시 방식)에 한정했고, 단언을 지우거나 범위를 줄이지 않았습니다.

## 6. 대표 UI 스크린샷

`docs/screenshots/sprint-2b2/` (실제 Chromium, 데스크톱 1280px·모바일 Pixel 7): `{chromium,mobile}-face.png`(얼굴형·다중 턱선·볼, 미설정 슬라이더), `-eyes.png`(슬라이더 구간 표시, 홍채 팔레트), `-lips.png`(프롬프트 제외 상태), `-preview.png`.

## 7. 알려진 한계 및 기술 부채

- 선택지와 상대 수치 사이의 불일치(예: 들린 코 + 아래로 향한 코끝 각도, “얇은” 입술 + 도톰한 두께)는 진단하지 않습니다. 조건이 선택지만 비교하기 때문이며 **TD-10**으로 등록했습니다.
- 좌우 개별 이목구비, 해부학적 정밀 측정, 시각 예시 이미지는 범위 밖입니다(예시는 표시하지 않음).
- 상대 슬라이더는 5단계입니다. 이미지 모델이 단계 차이를 정확히 재현한다는 보장은 없습니다(화면에 안내).
- 사용자 정의 색상은 이름·표현 텍스트로만 입력합니다. 자유 HEX 입력은 TD-05(Sprint 3)입니다.
- 출력은 속성별 문장이며 장문 합성은 하지 않습니다.
- 기존 기술 부채 TD-01·02(Sprint 2-C), TD-04·05·09(Sprint 3), TD-06(Sprint 5), TD-07, TD-08은 그대로입니다.

## 8. Git 상태

- 브랜치 `feature/sprint-2b2-facial-features`(main `9dc84b3`에서 분기), **커밋하지 않음, push하지 않음**
- 추적 파일 25개 수정(+957 / −101, 이 보고서 작성 전 `git diff --stat` 기준). 새 파일: `src/domain/catalog/catalogs/person/facial.ts`, `tests/unit/facial-catalog.test.ts`, `tests/component/facial.test.tsx`, `e2e/facial.spec.ts`, `docs/screenshots/sprint-2b2/`(8개), `docs/SPRINT_2B2_REPORT.md`
- 생성물은 `.gitignore`로 제외. 비밀 값·유료 API 호출 없음. 이전 Sprint 브랜치(`feature/sprint-2a-detailed-foundation`, `docs/tech-debt-tracking`)는 로컬·원격에서 삭제했습니다.
