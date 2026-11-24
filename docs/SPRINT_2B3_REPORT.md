# Sprint 2-B.3 보고서 — 피부·헤어·수염 (Skin, Hair & Facial hair)

- 상태: **구현 완료, 검토 대기** — 커밋·push 하지 않음
- 브랜치: `feature/sprint-2b3-skin-hair` (기준 main `26ec465`)
- 로컬 전체 검증: `pnpm verify` **종료 코드 0** — 단위·컴포넌트 557개 통과, 격리 검증 통과, E2E 49 통과 / 1 skip

## 1. 구현된 속성과 선택지

| 영역 | 속성 | 칩·목록 | 팔레트 | 상대 슬라이더 | 다중 선택 | 추가 적용 조건 |
|---|---|---|---|---|---|---|
| 피부 | 16 | 12 | 1 (피부색 20색: 자연 12·판타지 8) | 3 (모공, 투명감, 균일도) | 5 (주근깨·점·주름 위치, 흉터, 피부 특징) | 3 (위치 ← 각 특징 ‘없음’) |
| 헤어 | 23 | 14 | 2 (기본·보조 색상 38색, 6개 그룹) | 7 (굵기, 밀도, 볼륨, 광택, 컬 크기, 컬 강도, 앞머리 밀도) | 3 (컬러 패턴, 모발 상태, 묶는 위치) | 22 (대머리·삭발·앞머리 없음) |
| 수염 | 6 | 3 | 1 (헤어 팔레트 재사용) | 2 (길이, 밀도) | 1 (수염 형태 18종) | 5 (수염 없음) |
| **합계** | **45** | 선택지 395개(형태·팔레트 33개 속성) | 4 | 12 | 9 | 30 |

- **누적 인물 상세 속성 108개**(인물 기본 정보 16 + 얼굴·이목구비 47 + 피부·헤어·수염 45)
- 헤어스타일 74개는 11개 표시 그룹(짧은 스타일 … 기타)의 검색 목록이고, 그룹은 출력되지 않습니다.
- 사용자 정의 값은 13개 속성에서 쓸 수 있습니다(피부색, 흉터, 피부 특징, 헤어 색상 2, 컬러 패턴, 모발 형태·상태, 헤어라인, 앞머리 형태, 헤어스타일, 수염 형태, 수염 색상).
- 새 카테고리 **수염**(`person_facial_hair`)을 헤어 다음에 추가했습니다. 피부·헤어·수염은 approved이고, 신체·표정·메이크업·의상·액세서리·자세 6개 영역은 DRAFT 유지입니다.
- 버전: 핵심 카탈로그만 0.5.0 → 0.6.0(속성 추가, ID 변경 없음). ImageSpec 0.3.0, 형식 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0은 그대로입니다(스키마 변경 없음).

## 2. 기존 공통 기능 재사용

| 공통 기능 | 사용처 |
|---|---|
| 적용 조건 `noneOf` + 비활성 값 보존·복원·안내(2-A·2-B.1) | 대머리·삭발·앞머리 없음·주근깨/점/주름 없음·수염 없음 |
| `selectedCount` 조건(2-B.1) | ‘없음’ + 다른 항목 경고 3개(흉터, 단색 패턴, 수염 없음) |
| 규칙(비차단 경고) | 반대 상태 쌍 15개, 스타일 ↔ 길이 2개, 묶는 위치 ↔ 묶지 않는 스타일 1개 — 총 21개 |
| 상대 슬라이더(의미 구간, 구간 이름만 표시) | 12개 |
| 색상 팔레트 + 표시 그룹 | 피부색·헤어 색상·수염 색상 |
| 검색 목록 + 표시 그룹 | 헤어스타일, 수염 형태 |
| 사용자 정의 값, 출력 토글, Direct 역할, 카테고리 초기화·복원, 출처, 안전 정책, 모바일 Detailed Editor | 45개 전부 |

새로 추가한 범용 기능은 하나뿐입니다. 색상 팔레트 컨트롤이 카탈로그의 표시 그룹(`optionGroups`)을 제목 행으로 보여줍니다. 그룹이 없는 기존 팔레트는 그대로입니다. 그 밖에는 데이터 작성 도우미를 `person/builders.ts`로 공통화했고, 얼굴 카탈로그 테스트 34건으로 출력이 동일함을 확인했습니다.

## 3. 초기 설계 대비 변경 사항 (개발 중 판단)

| 항목 | 내용 | 이유 |
|---|---|---|
| 출력 순서 번호 | 인물 속성 264–308. 비인물 속성 중 300 이상에 +1000(상대 순서 불변) | 인물 속성이 `style.preset`(300)을 넘음. N1과 같은 방식, 기존 프롬프트 글자 단위 동일(회귀 테스트). 근본 해결은 TD-08(ADR-051) |
| 수염 카테고리 | 인물 하위에 새 카테고리 추가, 헤어 다음 순서 | 승인서 “피부, 헤어, 수염 카테고리 활성화” |
| 삭발 시 유지 항목 | 색상·컬러 패턴·형태·굵기·밀도·광택·헤어라인·상태 유지, 길이·볼륨·컬·가르마·앞머리·스타일·묶는 위치·레이어·잔머리·움직임은 숨김 | 승인서 §5 “삭발 상태에서도 적용 가능한 색상·질감은 표현” |
| 다중 선택 | 컬러 패턴(하이라이트 + 로우라이트), 모발 상태(젖은 + 부스스), 묶는 위치(높게 + 왼쪽), 흉터, 수염 형태 | 함께 존재할 수 있는 특징. 실제 반대 쌍만 경고 |
| ‘없음’ 출력 | 명시적 ‘없음’은 “Freckles: none.”처럼 출력 | 미설정(출력 없음)과 구분되는 사용자의 명시적 의도 |
| 영어 표현 | “Skin sheen: low.”(“low sheen”의 명사 반복 제거), “Bangs: none.”, 점 위치 “below the eye / on the cheek”, 묶는 위치 템플릿 “Hair tie position: …” | 승인서 §10 문법 개선 권한. 예시의 “Bun placement”는 번·포니테일·땋은 머리에 공통인 “Hair tie position”으로 일반화 |
| 사용자 정의 미적용 | 언더톤·피부결·광택·수분감·주근깨/점/주름 정도·위치·길이·가르마·앞머리 길이·묶는 위치·레이어·잔머리·움직임·수염 정돈·질감 | 닫힌 정도·위치 구분. 형태·색상·스타일에는 지원 |

## 4. 프롬프트 출력 예시 (테스트에서 확인된 정확한 문자열)

승인서 §7 예시 속성(설정한 18개만 출력):

```text
Skin tone: light beige. Skin undertone: warm. Skin texture: natural. Skin sheen: low. Pores: slightly visible. Freckles: sparse.
Freckle placement: nose, cheeks. Hair length: waist-length. Primary hair color: dark brown. Secondary hair color: honey blonde.
Hair color pattern: balayage. Hair texture: wavy. Hair volume: high. Hair part: center part. Hairstyle: half-up bun.
Hair tie position: high. Hair layering: moderate. Hair movement: gently flowing.
```

| 입력 | 출력 |
|---|---|
| 대머리 + (형태·스타일 등 11개 값) | `Hair presence: bald head.` — 11개 값은 보존, “모발 있음”으로 바꾸면 모두 다시 출력 |
| 삭발 + 플래티넘 블론드 | `Hair presence: shaved head. Primary hair color: platinum blonde.` |
| 앞머리 없음 + 앞머리 길이·밀도 | `Bangs: none.` (형태 미설정이면 `Bangs length: eyebrow-length. Bangs density: sparse.`) |
| 주근깨 미설정 + 위치 “코” | `Freckle placement: nose.` / 주근깨 ‘없음’이면 위치는 출력하지 않음 |
| 수염 없음 + 길이·색상 등 | `Facial hair: clean-shaven.` / 수염 없음 + 콧수염 → 둘 다 유지 + 경고 |
| 콧수염 + 염소수염 + 구레나룻 | `Facial hair: mustache, goatee, sideburns.` (경고 없음) |
| 80세 + 여성 + 나이지리아 + 요루바계 + 버즈컷 + 풍성한 수염 | 피부·주름 값 자동 추가 없음, `Hairstyle: buzz cut. Facial hair: full beard.` |

## 5. 테스트 결과

```text
pnpm verify → exit 0
 Test Files  26 passed (26)
      Tests  557 passed (557)
✓ 149 production output files contain no fixture marker
✓ production build isolates the test catalog
  1 skipped
  49 passed
```

| 필수 검증 항목 | 테스트 |
|---|---|
| 45개 등록·누적 108개·무결성 | `skin-hair-catalog` › registration 6건 |
| 한·영·별칭 검색 / 헤어스타일 그룹 | `skin-hair-catalog` › search 13건, hairstyles(74개·11그룹) |
| 팔레트·사용자 정의, 기본·보조 색상 독립 | `skin-hair-catalog` › palette·custom, `component/skin-hair` › palette groups |
| 상대 슬라이더 의미 구간 / 모든 선택지의 출력 문장 | `skin-hair-catalog` › “every option and band compiles alone…” |
| 미설정 ↔ 명시적 없음, 적용 가능성 변경 시 값 보존 | `skin-hair-catalog` › explicit none 7건, `component/skin-hair`, E2E |
| 대머리·삭발·부분 탈모 구분 / 앞머리 없음 / 피부 특징 없음 / 수염 없음 | `skin-hair-catalog` › hair presence, bangs, freckles·moles·wrinkles, clean-shaven |
| 피부색 ↔ 국적·민족, 주름 ↔ 연령, 헤어스타일 ↔ 성별 독립 | `skin-hair-catalog` › “no … attribute depends on age, gender, nationality or ethnicity”, “identity values … set no …” |
| 포함·제외, 카테고리 초기화·복원, JSON 왕복 | `skin-hair-catalog` › common features, E2E |
| 기존 Sprint 회귀 | 기존 테스트 전체 + Sprint 0·1·2-A fixture 프롬프트 동일(순서 오프셋 후) |
| 안전 정책·안전 검사 성능 | 표현별 신호 없음 테스트, 사전 필터 동일성 테스트(이번 카탈로그 문구 포함), 500개 무작위 명세 테스트 608 ms(로컬, 5초 제한) |
| 데스크톱·모바일 E2E | `e2e/skin-hair.spec.ts` 2건(입력 → 대머리·복원 → 새로고침 유지 → 헤어 초기화·복원, 외부 요청 0건), 기존 E2E 전체 |

기존 테스트 수정은 승인 범위·버전 변화(카탈로그 0.6.0, 노출 속성·인물 카테고리 목록, “설계 중” 예시를 피부에서 자세·신체로 교체, “골든” 검색어가 피부색·헤어 색상과도 일치해 “골든아워/golden hour”로 구체화)에 한정했고, 단언 삭제나 범위 축소는 없습니다.

## 6. 대표 UI 스크린샷

`docs/screenshots/sprint-2b3/` (실제 Chromium, 데스크톱 1280px·모바일 Pixel 7): `{chromium,mobile}-skin.png`(피부색 자연·판타지 그룹, 주근깨), `-hair-bald-inactive.png`(대머리 선택 시 보존된 값과 안내), `-hair.png`, `-facial-hair.png`, `-preview.png`.

## 7. 알려진 한계 및 기술 부채

- 선택지와 상대 슬라이더 사이의 불일치(예: 짧은 헤어스타일 + 높은 볼륨, 수염 없음과 무관한 정도 값)는 진단하지 않습니다 — **TD-10** 유지.
- 출력 순서 번호를 다시 오프셋으로 맞췄습니다. 카테고리 순서와 속성 순서 분리(**TD-08**)가 근본 해결입니다.
- 좌우 개별 피부 특징 배치, 해부학적 정밀 측정, 헤어 액세서리, 사용자 정의 RGB/HEX(TD-05, Sprint 3), 시각 예시 이미지는 범위 밖입니다.
- 팔레트 견본은 시각적 참고이며, 이미지 모델이 정확한 색을 재현한다고 보장하지 않습니다(화면에 안내).
- 피부 상태·흉터는 시각 묘사이며 의학적 판단을 하지 않습니다.
- 출력은 속성별 문장이며 장문 합성은 하지 않습니다.

## 8. Git 상태

- 브랜치 `feature/sprint-2b3-skin-hair`(main `26ec465`에서 분기), **커밋하지 않음, push하지 않음**
- 추적 파일 25개 수정(+995 / −234, 이 보고서 작성 전 `git diff --stat` 기준). 새 파일: `src/domain/catalog/catalogs/person/{builders,skin-hair}.ts`, `tests/unit/skin-hair-catalog.test.ts`, `tests/component/skin-hair.test.tsx`, `e2e/skin-hair.spec.ts`, `docs/catalogs/person/facial-hair.md`, `docs/screenshots/sprint-2b3/`(10개), `docs/SPRINT_2B3_REPORT.md`
- 생성물은 `.gitignore`로 제외, 비밀 값·유료 API 호출 없음
