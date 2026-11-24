# Sprint 2-B.4 보고서 — 신체 (Body)

- 상태: **구현 완료, 검토 대기** — 커밋·push 하지 않음
- 선행 조건: Sprint 2-B.3을 사용자 확인 후 커밋 `29b60c2`, PR #5, CI 통과(push·pull_request), main 병합 `7b9b9f2`, 병합 후 main CI success(run 45365995495), 브랜치 정리까지 완료했습니다.
- 브랜치: `feature/sprint-2b4-body` (기준 main `7b9b9f2`)
- 로컬 전체 검증: `pnpm verify` **종료 코드 0** — 단위·컴포넌트 586개 통과, 격리 검증 통과, E2E 51 통과 / 1 skip

## 1. 구현된 속성과 선택지

| 하위 분류 | 속성 | 상대 슬라이더 | 형태 칩 |
|---|---|---|---|
| 전체 신체 | 8 | 5 (신장, 골격, 근육량, 근육 선명도, 체지방) | 3 (전체 체형 7, 실루엣 5, 신체 비율 5) |
| 신체 비율 | 5 | 3 (머리 크기, 상체·하체 길이) + **등신 비율(숫자 2–10)** | 1 (상하체 비율 3) |
| 목·어깨 | 5 | 4 (목 길이·굵기, 어깨 너비, 쇄골) | 1 (어깨 기울기 3) |
| 몸통 | 9 | 8 (흉곽, 가슴 볼륨, 가슴 근육, 허리 너비·굴곡, 복근, 등 너비·근육) | 1 (복부 형태 3) |
| 엉덩이·골반 | 4 | 3 (골반 너비, 엉덩이 볼륨, 허리·골반 대비) | 1 (엉덩이 형태 4) |
| 팔·손 | 7 | 7 | — |
| 다리·발 | 7 | 6 | 1 (다리 형태 4) |
| **합계** | **45** | **36 + 숫자 1** | **8 (선택지 34개)** |

- **누적 인물 상세 속성 153개**(인물 기본 정보 16 + 얼굴 47 + 피부·헤어·수염 45 + 신체 45)
- 사용자 정의 값: 전체 체형, 실루엣, 신체 비율, 엉덩이 형태
- 모든 속성은 Direct 역할이며 출력 토글을 지원하고, 1인 피사체에 적용됩니다.
- 버전: 핵심 카탈로그만 0.6.0 → 0.7.0(속성 추가, ID 변경 없음). ImageSpec·형식·컴파일러·안전 정책은 그대로이며 스키마 변경은 없습니다. 출력 순서는 309–353이고, 비인물 속성 번호는 바꾸지 않았습니다.

## 2. 공통 기능 재사용

새 기능 없이 카탈로그 데이터만 추가했습니다.

| 공통 기능 | 사용처 |
|---|---|
| 하위 카테고리 탐색·설정 개수 | 신체 아래 7개 하위 분류. 상위 “신체” 초기화는 하위 전체가 대상 |
| `degree` 슬라이더(구간 이름만 표시, 표시 위치 미저장) | 정도 36개 |
| 숫자 속성(`ratio` + 단위) | 등신 비율 — 값 표시, “8 heads tall”로 출력 |
| 칩 + 사용자 정의 값 | 형태 8개(사용자 정의 4개 속성) |
| 출력 토글, 카테고리 초기화·복원, 출처, JSON, 모바일 Detailed Editor, 안전 정책·연령 판단 | 45개 전부 |
| 데이터 도우미(`person/builders.ts`) | 신체 데이터 작성 |

## 3. 초기 설계 대비 변경 사항 (개발 중 판단)

| 항목 | 내용 | 이유 |
|---|---|---|
| 신장 | 5단계 상대 슬라이더(very short … very tall) | 승인서 §9 “상대적 크기는 5단계 슬라이더”. 출력은 승인 예시와 같습니다(“Height: tall.”) |
| 등신 비율 | 숫자 슬라이더 2–10, 0.5 단위(예: 7.5 heads tall) | 승인서 §3 “상대 슬라이더와 구분, 값을 그대로 표현”. 정확도 비보장 안내를 설명에 표시 |
| 영어 표현 | “Body build: athletic.”, “Muscle mass: moderate.”, 근육 발달 구간 “slightly … highly developed”, “Leg alignment: bow-legged”, 머리 크기 “Head size relative to body: …” | 승인서 §15 표현 개선 권한. 승인 예시 문구와 일치 |
| 충돌 규칙 없음 | 선택지끼리의 실제 충돌이 없어 규칙을 두지 않음 | 체형·실루엣·비율은 서로 다른 축. 선택지 ↔ 수치 불일치(치비 + 8등신 등)는 TD-10(승인서 §10 허용) |
| 사용자 정의 미적용 | 상하체 비율, 어깨 기울기, 복부 형태, 다리 형태 | 닫힌 구분이라 선택지가 적절 |
| 안전 검사 추가 최적화 시도 후 철회 | 여러 문장을 합쳐 한 번에 거르는 사전 필터를 시험했지만 측정상 이득이 없어(250개 명세당 35 ms → 36 ms) 코드를 되돌림 | 복잡도만 늘어남. 대신 여러 문장을 함께 넣는 동일성 테스트는 기존 필터 검증용으로 남김 |

## 4. 프롬프트 출력 예시 (테스트에서 확인된 정확한 문자열)

승인서 §12 일반 예시(설정한 12개만 출력, 카탈로그 순서 — 팔·손이 다리·발보다 앞):

```text
Height: tall. Body build: athletic. Skeletal frame: medium-sized. Muscle mass: moderate. Muscle definition: subtle.
Body proportions: natural. Head-to-body proportions: 8 heads tall. Shoulder width: broad. Waist width: narrow.
Arm length: long. Hand size: medium-sized. Leg length: long.
```

캐릭터 스타일 예시:

```text
Body proportions: chibi. Head size relative to body: large. Head-to-body proportions: 3 heads tall. Arm length: short.
Hand size: small. Leg length: short.
```

| 입력 | 출력 |
|---|---|
| 사용자 정의 체형 “수영 선수 체형” + 표현 | `Body build: a swimmer's build with a long torso.` |
| 등신 7.5 | `Head-to-body proportions: 7.5 heads tall.` |
| 근육질 체형 + 여성·70세·일본 | 다른 신체 값 자동 추가 없음 |
| 슬림 체형 + 근육량 최대 + 체지방 최대 + 좁은 골반 + 넓은 어깨 | 8개 문장 그대로, 진단 없음(독립 축) |

## 5. 테스트 결과

```text
pnpm verify → exit 0
 Test Files  28 passed (28)
      Tests  586 passed (586)
✓ production build isolates the test catalog
  1 skipped
  51 passed
```

| 검증 항목 | 테스트 |
|---|---|
| 45개 등록·누적 153개·7개 하위 분류·무결성 | `body-catalog` › registration 4건 |
| 상대 슬라이더 구간 / 모든 값의 출력 문장 / 등신 비율 출력·범위·왕복 | `body-catalog` › “shapes keep…”, “every option and band…”, “heads tall …” |
| 한·영 검색과 별칭 | `body-catalog` › search 11건 |
| 사용자 정의 값, 포함·제외, JSON 왕복, 카테고리 초기화·복원(상위·하위) | `body-catalog` › common features, `component/body`, E2E |
| 미설정 미출력, 전체 체형이 다른 값을 설정하지 않음, 성별·연령·국적과 독립 | `body-catalog` › independence 3건, `component/body` |
| 안전 정책 유지: 신체 표현은 신호 없음, 신체 선택만으로 차단 없음(미성년 포함), 성적 표현 + 미성년은 차단(제외된 연령 포함) | `body-catalog` › safety 3건 |
| 안전 검사 성능·동일성 | 단일 문장 동일성(기존) + 여러 문장 동일성(신규) 테스트, 500개 무작위 명세 테스트 로컬 약 0.75초 |
| 기존 기능·프롬프트 회귀 | 기존 테스트 전체(Sprint 0·1·2-A fixture 프롬프트 동일) |
| 데스크톱·모바일 E2E | `e2e/body.spec.ts` 2건(입력 → 새로고침 유지 → 상위 “신체” 초기화·복원, 외부 요청 0건), 기존 E2E 전체 |

기존 테스트 수정은 버전 0.7.0, 노출 목록과 누적 개수, “설계 중” 예시(신체 → 자세 및 행동)에 한정했습니다.

참고: 이번 격리 검증은 production 출력 286개 파일을 검사했습니다(이전 149개). 늘어난 파일은 로컬 `next dev`가 남긴 `.next/dev` 폴더(158개)이며, 이번 변경과 무관하고 git 대상이 아닙니다. 이 파일들에서도 표식은 발견되지 않았습니다.

## 6. 대표 UI 스크린샷

`docs/screenshots/sprint-2b4/` (실제 Chromium, 데스크톱 1280px·모바일 Pixel 7): `{chromium,mobile}-general.png`(신장 슬라이더 “큼”, 체형·비율 칩), `-proportions.png`(등신 “8 heads tall”), `-legs-excluded.png`(다리 형태 프롬프트 제외), `-preview.png`, `-reset-dialog.png`(상위 “신체” 초기화 대상 8개).

## 7. 알려진 한계 및 기술 부채

- 선택지 ↔ 수치 불일치(치비 + 8등신, “상체가 더 긺” + 상체·하체 길이 슬라이더 등)는 진단하지 않습니다 — **TD-10**.
- **TD-11(신규)**: 500개 무작위 명세 속성 테스트는 명세마다 전체 속성의 40%를 설정하므로, 실행 시간이 카탈로그 크기에 비례합니다. 2-B.4 기준 로컬 약 0.75초이고, 2-B.3 CI에서 2.2초였으니 이번 CI는 약 3초로 예상됩니다(제한 5초). 제품 컴파일은 명세당 약 0.5 ms입니다. Sprint 2-C에서 테스트 표본 설계나 컴파일 반복 경로를 개선할 예정이며, 제한 시간은 완화하지 않습니다.
- 출력 순서 번호 체계(**TD-08**)는 Sprint 2-C에서 근본 해결을 검토합니다.
- 좌우 개별 설정, 3D 모델링, 정밀 치수, 시각 예시 이미지는 범위 밖입니다. 이미지 모델이 등신 비율·상대 수치를 정확히 재현한다는 보장은 없습니다(화면에 안내).

## 8. Git 상태

- 브랜치 `feature/sprint-2b4-body`(main `7b9b9f2`에서 분기), **커밋하지 않음, push하지 않음**
- 변경: 추적 파일 18개 수정(+229 / −43, 이 보고서 작성 전 `git diff --stat` 기준 — 문서·테스트·카탈로그 통합 `core.ts`). 새 파일은 `src/domain/catalog/catalogs/person/body.ts`, `tests/unit/body-catalog.test.ts`, `tests/component/body.test.tsx`, `e2e/body.spec.ts`, `docs/screenshots/sprint-2b4/`(10개), `docs/SPRINT_2B4_REPORT.md`입니다. `src/domain/safety/evaluate.ts`는 변경 없음(시험한 최적화는 철회).
- 생성물은 `.gitignore`로 제외. 비밀 값·유료 API 호출 없음
