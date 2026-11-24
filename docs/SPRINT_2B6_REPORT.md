# Sprint 2-B.6 보고서 — 외모 방향·자세·카메라·조명

- 상태: **승인됨 (Sprint 2-B.6 최종 승인)** — Sprint 2-B 카탈로그 구현 공식 완료. Sprint 2-C 개선 항목은 TD-14(피사체 미설정 시 인물 속성 적용 정책), TD-15(연령 미설정 상태의 성적 매력 표현, TD-12와 함께)로 기록
- 브랜치: `feature/sprint-2b6-pose-camera-lighting` (기준 main `3a340a7`)
- 순서: 외모 방향 → 자세 및 행동 → 카메라 → 조명 → 통합 검증 (중간 승인 없이 진행)
- 로컬 전체 검증: `pnpm verify` **종료 코드 0** — 단위·컴포넌트 747개 통과(35개 파일), 격리 검증 통과(310개 파일), E2E 55 통과 / 1 skip

## 1. 규모

| 구분 | 신규 | 재사용 | 비고 |
|---|---|---|---|
| 외모 방향 | 1 (선택지 18) | — | Basic + Detailed 한 속성 |
| 자세 및 행동 | 22 (하위 분류 5) | — | 같은 의미의 기존 속성 없음 |
| 카메라 | 15 | 3 (프레이밍·관찰 방향·카메라 앵글, Sprint 1 Basic) | 한 화면 18개 |
| 조명 | 11 + 색상 팔레트 14색 | 7 (Basic 프리셋 + Sprint 2-A 속성 6, 선택지 12개 추가) | 한 화면 18개 |
| **합계** | **49 속성 · 선택지 236개** | **10 속성** | 경고 규칙 17개 신규 |

- 전체 카탈로그: 속성 348개(Detailed 노출 343, Basic 12), 규칙 90개. **인물 상세 속성 누적 300개**(277 + 외모 방향 1 + 자세 22).
- 버전: 핵심 카탈로그 0.8.0 → **0.9.0**(ID 변경 없음, 마이그레이션 `changes: []`). ImageSpec·카탈로그 형식·컴파일러·안전 정책 버전 그대로, 스키마·컴파일러 변경 없음.
- 문서: `docs/catalogs/person/pose.md`, `docs/catalogs/shared/{camera,lighting}.md` 1.0.0 APPROVED, `expression.md` 1.1.0(외모 방향 §2-1), ADR-056

## 2. 외모 방향 (Appearance direction)

- `person.appearance.direction` — 다중 선택 + 사용자 정의, Direct, 해석적, 기본값 없음, 18개 선택지(승인 목록 그대로).
- **한 속성을 두 화면에서**: Basic 단계(`what` 그룹)이면서 Detailed 인상 및 매력 카테고리에 속하므로 Basic과 Detailed가 같은 ImageSpec 값을 씁니다(컴포넌트·E2E에서 양방향 확인).
- **적용 조건**: 피사체가 “인물 (1인)”일 때만 적용(미선택·다른 피사체면 미적용, 값 보존). 그래서 Basic에서는 인물을 고른 직후 피사체 바로 다음에 나타납니다.
- **출력**: 피사체 바로 다음 독립 문장 — `Main subject: a single person. Appearance direction: beautiful, elegant.` 미설정이면 기존 출력 그대로. 피사체 문구 결합(“A beautiful and elegant person”)은 컴파일러 변경이 필요해 택하지 않았습니다(승인서가 허용한 대안).
- **중복 처리**: 의미가 같은 인상 값(매력적인·눈길을 끄는·우아한·몽환적인·세련된)은 기존 `covers`로 한 번만 출력하며 저장값은 그대로입니다. 다른 인상 값과는 함께 출력됩니다.
- **안전**: “섹시한(sexy)”은 기존 어휘의 성적 매력 표현이고 `appeal.suggestive` 태그도 붙였습니다. 미성년·모호 연령(“앳된” 인상 포함)과 함께면 차단, 프롬프트에서 제외해도 차단, 사용자 정의 “seductive look”도 차단. 성인이면 허용, 연령 신호가 없으면 기존 정책대로 비차단. 아름다운·잘생긴·예쁜·귀여운·사랑스러운 등은 아동과 함께여도 차단되지 않습니다. 18개 모두 연령 판단을 바꾸지 않습니다. 성별에 따른 제한 없음.

## 3. 자세·카메라·조명

| 영역 | 구현 결과 |
|---|---|
| 자세 및 행동 | 기본 자세 7·머리·시선 4·팔·손 자세 4·다리·발 자세 3·동작 4. 신체 방향 ↔ 카메라 관찰 방향, 머리 방향 ↔ 시선 방향 ↔ 시선 상태(2-B.5), 자세 ↔ 동작은 각각 독립 값. 충돌 9개(쉬는 자세 + 이동 동작, 정지 + 움직임, 서 있음 + 앉은 지지/무릎 위 손, 팔짱 + 손 위치/곧은 팔꿈치, 굽힌 자세 + 곧은 무릎, 눈 감음 + 시선 방향, 편 손 + 주먹). 정확한 관절 위치를 보장하지 않는다는 안내 표시 |
| 카메라 | Basic 3개 재사용(ID·선택지·출력·Basic 동작 불변). 초점 거리 14–200 mm·조리개 f/1.4–f/22를 실제 값으로 표시·출력(목록 밖 값은 사용자 정의). 렌즈·초점 거리·조리개·심도·원근감은 서로 값을 설정하지 않음. 직교 투영 → 원근감 미적용. 눈·얼굴 초점은 인물·동물만. 모든 피사체에 적용. 충돌 7개(망원 + 짧은 초점 거리, 광각 + 긴 초점 거리, 어안 + 직교, 중앙 ↔ 삼분할, 대칭 ↔ 비대칭, 왼쪽 ↔ 오른쪽, 위 ↔ 아래). 광학 결과 비보장 안내 |
| 조명 | 프리셋 12개 출력·분류·의미 단위 대체·출처 불변(테스트로 12개 전부 확인). 기존 속성 6개는 선택지만 추가(아주 부드러운·아주 딱딱한, 아주 어두운·아주 밝은, 아주 차가운·아주 따뜻한, 아주 낮음·아주 높음, 3/4 측광, 소프트박스·LED·인공 환경광). 새 11개: 주광 높이(슬라이더)·주광 색상, 보조광·림 라이트·환경광·반사광·볼류메트릭(없음~강함), 림 라이트 색상, 그림자 강도·경계, 광원 가시성. 림 라이트 없음 → 색상, 그림자 없음 → 경계 미적용(값 보존). 충돌 1개(낮은 대비 + 깊은 그림자) |

공통 기능(검색·별칭, 단일·다중, 사용자 정의, 상대 슬라이더, 색상 팔레트, 포함·제외, 카테고리 초기화·복원, 적용 가능성, 충돌 진단, 출처, 미리보기, 모바일)은 모두 기존 컴포넌트를 그대로 사용했습니다. 표시된 기본값은 저장하지 않습니다.

## 4. 초기 설계 대비 변경 사항 (개발 권한 §10)

| 항목 | 내용 | 이유 |
|---|---|---|
| 피사체 순서 번호 | 200 → 190, 외모 방향 195 | 순서는 정수라 피사체와 Identity(201) 사이에 자리가 필요. 상대 순서·프롬프트 동일 |
| 외모 방향 적용 조건 | 피사체 = 인물일 때만(다른 인물 속성은 미선택도 허용) | “인물 피사체 선택 직후” Basic 노출. Detailed에서 피사체 미선택이면 적용되지 않음 안내 |
| 외모 방향 출력 | 독립 문장, 선택지 표현은 소문자(기존 출력 규칙) | 컴파일러 변경 없이 안전하게 |
| 조명 강도·부드러움·색온도·대비 | 슬라이더가 아니라 기존 단일 선택에 양 끝 단계 추가 | 기존 값 형식과 프리셋 의미 단위 대체(soft·warm·dim 등)를 유지 |
| 초점 거리·조리개 | 실제 값을 문구로 가진 선택지 + 사용자 정의 | 승인 단계 목록(비균등 간격)을 그대로 표시하고, 렌즈 종류와의 불일치를 규칙으로 진단 가능 |
| 카메라·조명 하위 분류 | 만들지 않고 각각 한 화면(18개) | 하위 분류를 만들면 기존 Basic 속성의 카테고리를 옮겨야 함. 화면이 길어지는 점은 한계로 기록 |
| 자세 하위 분류 이름 | “팔·손 자세”, “다리·발 자세” | 신체의 “팔·손”·“다리·발”과 탐색 이름 중복 방지 |
| 광원 가시성 문장 | “Light source visibility: …” | 기존 광원 문장(“Light source: …”)과 혼동 방지 |
| 출력 토글 | 새 카메라·조명 속성에만 제공, 기존 Basic·조명 속성은 그대로 | 기존 동작 유지 |
| 설계 중 화면 검증 | 테스트 전용 카탈로그에서만 `person_pose`를 DRAFT로 유지 | 제품 카탈로그에 DRAFT 영역이 더 없음 |

## 5. 프롬프트 출력 예시 (테스트에서 확인된 정확한 문자열)

승인서 §7 예시(`camera-lighting-catalog`):

```text
Main subject: a single person. Appearance direction: beautiful, elegant. Actual age: 28 years old. Gender: woman. Hair texture: wavy.
Hairstyle: classic bob. Posture: standing. Body orientation: three-quarter facing. Gaze direction: looking at the camera.
Framing: head-and-shoulders portrait. Focal length: 85 mm. Aperture: f/2.8. Depth of field: shallow.
Light direction: three-quarter lighting. Light quality: soft light. Color temperature: warm. Fill light: subtle.
```

| 입력 | 출력 |
|---|---|
| 외모 방향 우아한·매력적인 + 분위기 우아한 + 매력도 매력적인 | `… Appearance direction: attractive, elegant.` (인상 값 2개는 중복으로 생략, 저장값 유지) |
| 건축물 + 광각 + 원근 투영 + 대칭·유도선 | `Main subject: an architectural structure. Composition: symmetrical composition, leading lines. Lens: wide-angle lens. Projection: perspective projection.` |
| 프리셋 자연광 + 빛의 질감 아주 부드러운 | `Lighting: natural daylight. Light quality: very soft light.` (프리셋의 “soft”를 직접 설정이 대체) |
| 림 라이트 없음 + 림 색상 마젠타 + 그림자 없음 + 경계 5 | `Rim light: none. Shadows: no visible shadows.` (색상·경계는 보존) |
| 사용자 정의 초점 거리 “600 mm” | `Focal length: 600 mm.` |

## 6. 테스트와 성능

```text
pnpm verify → exit 0
 Test Files  35 passed (35)
      Tests  747 passed (747)
✓ 310 production output files contain no fixture marker
✓ production build isolates the test catalog
  1 skipped
  55 passed
```

| 검증 항목 (승인서 §9) | 테스트 |
|---|---|
| 외모 방향: 18개 선택지, 다중·사용자 정의, Basic·Detailed 같은 값, 미설정 시 기존 출력, 피사체 다음 순서, 성별·외형 독립, 성적 표현의 연령 제한, 비성적 아름다움 허용, 연령 판단 불변, 검색 | `appearance-pose-catalog` › appearance (12), `component/pose-camera-lighting` (2), E2E |
| 무결성(자세 22·카메라 15·조명 11, 순서·카테고리·선택지), 모든 값의 단독 출력 문장 | `appearance-pose-catalog`, `camera-lighting-catalog`, `catalog`, `detailed-domain` |
| 자세 ↔ 카메라 방향, 시선 상태 ↔ 방향, 자세 ↔ 동작 독립, 충돌 9개와 비충돌 조합 | `appearance-pose-catalog` › pose |
| Basic 카메라 속성 재사용, 초점 거리·조리개 출력, 렌즈 충돌, 직교 투영·초점 대상 적용 조건, 모든 피사체 적용 | `camera-lighting-catalog` › camera |
| 조명 프리셋 12개 회귀, 기존 속성 ID·문구 유지, 의미 단위 대체, 조명 속성 간 독립, 림·그림자 적용 조건과 값 보존 | `camera-lighting-catalog` › lighting, 기존 회귀 테스트 |
| 포함·제외, 검색(32건), 사용자 정의, 카테고리 초기화·복원(자세·카메라·조명), JSON 왕복 | 위 2개, `component/pose-camera-lighting`, E2E |
| 기존 기능 회귀, 안전 검사 동등성, 테스트 카탈로그 격리 | 기존 테스트 전체, `safety` 동일성 테스트, `verify:isolation` |
| 데스크톱·모바일 E2E | `e2e/pose-camera-lighting.spec.ts` 2건(Basic 외모 방향 → Detailed 공유 → 자세·카메라·조명 → 새로고침 유지 → 자세 초기화·복원 → Basic 공유 값, 외부 요청 0건), 기존 E2E 전체 |

**성능 (500개 무작위 명세 테스트, 제한 5초 유지)**: 속성 +49개 후 로컬 단독 실행 0.81초 → **0.89초**(+10%). 작업자 4개 병렬 1.08초. 중대한 성능 문제가 없어 TD-11 추가 최적화는 승인서대로 Sprint 2-C에서 검토합니다. CI 실측은 push 후 확인이 필요합니다(직전 main CI 1.79–3.09초 기준 약 10% 증가 예상).

**기존 테스트 수정** (범위 확장 반영, 검증 약화 없음): 버전 0.9.0(확장 테스트 카탈로그 0.10.0), Basic·Detailed 노출 목록과 누적 개수(이전 Sprint 누적 테스트는 이후 영역을 제외해 원래 수치 유지), 설계 중 화면 예시(제품 → 테스트 전용 카탈로그), 출력 토글 범위 테스트(“인물 속성만” → “인물 + 2-B.6 Detailed 카메라·조명, 기존 Basic·조명 속성은 그대로”를 명시적으로 검사), “선택지 단독 안전 신호 없음” 테스트의 미성년자 보호 목록에 외모 방향 “섹시한” 추가(정확히 기존 차단 규칙만 발생하는지 검사).

## 7. 대표 UI 스크린샷

`docs/screenshots/sprint-2b6/` (실제 Chromium, 데스크톱 1280px · 모바일 Pixel 7, 각 5장): `{chromium,mobile}-basic-appearance.png`(Basic: 인물 선택 직후 외모 방향), `-pose.png`, `-camera.png`(85mm·f/2.8·심도 “얕음”), `-lighting.png`(림 라이트 없음 → 색상 비활성 안내), `-preview.png`.

## 8. 알려진 한계 및 기술 부채

- 카메라·조명 화면이 각각 18개 속성으로 길고, 조명 색상 팔레트도 두 번 펼쳐집니다(TD-13과 같은 성격, 이번에 UI 개선은 하지 않음).
- 조리개 ↔ 피사계 심도, 초점 거리 ↔ 원근감 같은 선택지 ↔ 수치 관계는 진단하지 않습니다(TD-10).
- 외모 방향은 피사체 문구와 합치지 않고 독립 문장으로 출력합니다. 자연어 합성은 Q16(Sprint 5)과 함께 검토 대상입니다.
- 외모 방향은 “여러 사람” 피사체에는 적용되지 않습니다(Q15, 피사체별 상세 명세에서 설계).
- 좌우 관절·액세서리 개별 설정, 3D 포즈·조명 편집, 복수 광원, 실제 카메라 시뮬레이션, RGB/HEX 입력(Sprint 3)은 범위 밖입니다. 이미지 모델이 자세·광학·조명 값을 정확히 재현한다는 보장은 없습니다.
- TD-11(속성 테스트 비용)은 부분 해결 상태로 Sprint 2-C 검토 대상입니다.

## 9. Git 상태

- 브랜치 `feature/sprint-2b6-pose-camera-lighting`(main `3a340a7`에서 분기). 최종 승인 후 커밋·PR·병합
- 변경: 추적 파일 28개 수정(+382 / −106, 이 보고서 작성 전 `git diff --stat` 기준)
- 새 파일: `src/domain/catalog/catalogs/person/{appearance,pose}.ts`, `src/domain/catalog/catalogs/shared/{camera,lighting}.ts`, `tests/unit/{appearance-pose,camera-lighting}-catalog.test.ts`, `tests/component/pose-camera-lighting.test.tsx`, `e2e/pose-camera-lighting.spec.ts`, `docs/screenshots/sprint-2b6/`(10개), `docs/SPRINT_2B6_REPORT.md`
- 생성물은 `.gitignore`로 제외. 비밀 값·유료 API·이미지 API 호출 없음. Sprint 2-C는 시작하지 않았습니다.
