# 로드맵 및 진행 현황

> 단계 정의와 완료 기준의 원본은 [PROMPTER_MASTER_PLAN.md](../PROMPTER_MASTER_PLAN.md) §10입니다. 이 문서는 진행 상태만 추적합니다.
> 스프린트 번호는 순서일 뿐 기간을 고정하지 않습니다. 다음 스프린트는 사용자 승인 후에만 시작합니다.
> 2026-11-25 로드맵 갱신: Prompter는 시각적 이미지 설계 도구로 확장합니다(Recommended·Visual·Detailed가 하나의 ImageSpec 공유, Basic·Detailed 유지). Sprint 2-C를 4단계로 나누고 Sprint 2-D(Visual Editor & Recommendation)를 새로 둡니다. Sprint 3 이후 계획은 그대로입니다.

| 단계 | 내용 | 상태 |
|---|---|---|
| **Sprint 0 — Foundation** | 독립 저장소, 버전이 붙은 ImageSpec과 카탈로그, 검증기, 결정론적 컴파일러, Basic 최소 기능, JSON 입출력, 로컬 저장, 테스트와 문서 | ✅ **승인됨 (2026-11-24)** ([보고서](SPRINT_0_REPORT.md)) |
| **Sprint 1 — Basic composer** | 상황별 선택지, 검색 가능한 스타일 프리셋(독립 축 구조), 구도·방향·각도, 장소·배경, 분위기, 조명 프리셋(독립 속성 구조), 화면비, 출처·진단, 충돌 안내, 안전 정책 기준선, 언어 정책, ID 마이그레이션, 부분 복구, 초기화 되돌리기, CI 설정 파일 | ✅ 승인됨 ([보고서](SPRINT_1_REPORT.md)) |
| **Sprint 2-A — Detailed Editor foundation** | 데이터 기반 탐색과 검색, 범용 컨트롤 9종, 복합 프리셋(계획·확인·되돌리기), 의미 단위 우선순위, 정책 제한, ImageSpec 0.2.0, 카탈로그 형식 0.3.0, 모바일 도구 모음, 테스트 카탈로그 격리, 설계 문서 DRAFT 16개 | ✅ **승인·병합 (2026-11-24, PR #1)** ([보고서](SPRINT_2A_REPORT.md), [기술 부채](TECH_DEBT.md)) |
| **Sprint 2-B.1 — Person › Identity** | 인물 기본 정보 16개 속성(국가·지역 199 + 무국적), 공통 설계 규격 0.2.0, ImageSpec 0.3.0, 카탈로그 형식·내용 0.4.0, 컴파일러 0.4.0, 안전 정책 0.2.0, 프롬프트 포함·제외, 사용자 정의 값, quantity·단위, 조건별 표현, covers, 표시용 묶음, 카테고리 초기화·복원, 시각 예시 기준(TD-03) | ✅ **승인·병합 (PR #3)** ([보고서](SPRINT_2B1_REPORT.md), [사양 결정](SPRINT_2B1_SPEC_REVIEW.md)) |
| **Sprint 2-B.2 — Face & facial features** | 얼굴 10·눈 13·눈썹 8·코 8·입술 8 = 47개 속성, 상대 슬라이더(의미 구간), 색상 팔레트, 다중 특징 + 반대 특징 경고, 코 모양 covers, core 카탈로그 0.5.0 | ✅ **승인·병합 (PR #4)** ([보고서](SPRINT_2B2_REPORT.md)) |
| **Sprint 2-B.3 — Skin, hair & facial hair** | 피부 16·헤어 23·수염 6 = 45개 속성(누적 108), 명시적 없음 ↔ 미설정, 적용 가능성(대머리·삭발·앞머리 없음·수염 없음 등)과 값 보존, 헤어 팔레트 공유, 헤어스타일 74개 표시 그룹, core 카탈로그 0.6.0 | ✅ **승인·병합 (PR #5)** ([보고서](SPRINT_2B3_REPORT.md)) |
| **Sprint 2-B.4 — Body** | 신체 45개 속성(누적 153), 하위 분류 7개, 상대 슬라이더 36개, 등신 비율 숫자 속성, core 카탈로그 0.7.0 | ✅ **승인·병합 (PR #6)** ([보고서](SPRINT_2B4_REPORT.md)) |
| **Sprint 2-B.5 — Expression, impression, makeup, clothing & accessories** | 표정 10·인상 8·메이크업 16·의상 72(전체 설정 + 의복 7개 카테고리)·액세서리 18 = 124개 속성(누적 277), 메이크업·의상 팔레트, 의복별 적용 가능성, 컴파일 반복 계산 제거(ADR-054), core 카탈로그 0.8.0 | ✅ **승인·병합 (PR #7)** ([보고서](SPRINT_2B5_REPORT.md)) |
| **TD-11 — 속성 테스트 비용** | 결과가 같은 검사 경로 최적화와 테스트 헬퍼 개선, CI 실측 1.79–3.09초(제한 5초, ADR-055) | ✅ **부분 해결 (PR #8)** — 느린 실행기 3초 기준 미충족, TD-11 열림 |
| **Sprint 2-B.6 — Appearance direction, pose, camera & lighting** | 외모 방향(Basic + Detailed), 자세 22, 카메라 15 + 기존 3, 조명 11 + 기존 7(선택지 추가), core 카탈로그 0.9.0 — 인물 상세 속성 누적 300 | ✅ **승인 — Sprint 2-B 카탈로그 구현 완료** ([보고서](SPRINT_2B6_REPORT.md)) |
| **Sprint 2-C — Integration & Usability** | 2-C.1–2-C.4 | ✅ **공식 완료** (Sprint 2-C.4 최종 승인, 2026-11-25). 다음 단계는 Sprint 2-D — 새 개발 지침을 받은 뒤 시작 |
| **Sprint 2-C.1 — UI, UX & accessibility** | 색상 선택 접기(TD-13), 카메라 하위 분류 5·조명 하위 분류 6(림 라이트 색상은 림 라이트와 같은 분류), 공통 편집 화면(헤더 포함·제외, 이전/다음 페이지, 모바일 고정 카테고리 바), 카테고리 트리 키보드 탐색(TD-01), 모달·팝오버 포커스(TD-02), core 카탈로그 0.10.0, 로드맵 갱신 | ✅ **완료** (승인·병합, PR #10, [보고서](SPRINT_2C1_REPORT.md)) |
| **Sprint 2-C.2 — Architecture, state & diagnostics** | 출력 순서를 UI 순서와 분리(`promptOrder`, TD-08), 카테고리 초기화 이력(최근 5개·기록별 복원, TD-09), 의미 충돌·관례 차이 진단과 슬라이더 조건(규칙 +24, TD-10), 카탈로그 형식 0.5.0·core 0.11.0·컴파일러 0.5.0 — 출력 동일 | ✅ **완료** (승인·병합, PR #11, [보고서](SPRINT_2C2_REPORT.md)) |
| **Sprint 2-C.3 — Safety & applicability consistency** | 안전 정책 0.3.0(연령 미확인 성적 매력 표현 출력 보류 TD-15, 속옷류 의복 분류와 미성년자 보호 일관성 TD-12), 외모 방향 적용 조건 통일(TD-14), 연령 설정으로 이동하는 안내, core 카탈로그 0.12.0 | ✅ **완료** (승인·병합, PR #12, [보고서](SPRINT_2C3_REPORT.md), [안전 정책](SAFETY_POLICY.md)) |
| **Sprint 2-C.4 — Performance & integration validation** | 제품 성능 기준선(실제 브라우저, 데스크톱·모바일 CPU 4×, 번들 크기 — [PERFORMANCE.md](PERFORMANCE.md)), TD-11 최종 판단(부분 해결 유지), 키보드 전체 회귀·다크 모드 검증(TD-16 부분 해결, 실제 스크린 리더 미검증), 통합 시나리오 A–G, 전체 페이지 레이아웃 점검, 결함 수정 4건 | ✅ **완료** (Sprint 2-C.4 최종 승인, [보고서](SPRINT_2C4_REPORT.md)) |
| **Sprint 2-D.1 — 시각적 선택 공통 컴포넌트·에셋 표준** | 시각 선택 카드(정적 SVG·지연 로딩·라이트·다크·확대·텍스트 대체), 에셋 표준과 얼굴형·눈 모양·눈썹 모양 선화 18개(TD-03), 기능 요소 대비(TD-18), core 0.13.0 | ✅ 완료 ([설계 원칙 §10](VISUAL_EDITOR_PRINCIPLES.md)) |
| **Sprint 2-D.2 — 얼굴·이목구비 시각적 선택** | 턱선·쌍꺼풀·동공·코(모양·콧대·코끝)·입술(모양·비율·큐피드 보우) 카드, 상대 슬라이더 실시간 프리뷰, Face Builder(정면+옆모습, ImageSpec 읽기 전용), core 0.14.0 | ✅ 완료 ([설계 원칙 §11](VISUAL_EDITOR_PRINCIPLES.md)) |
| **Sprint 2-D.3 — 헤어·신체·의상 시각적 선택** | 헤어(대표 스타일 37·길이·형태·앞머리·가르마, Face Builder 연계), 신체(중립 마네킹 카드·비율 슬라이더 프리뷰), 의상(도식화 카드·종류 목록 썸네일), Figure Builder, core 0.15.0 | ✅ 완료 ([설계 원칙 §12](VISUAL_EDITOR_PRINCIPLES.md)) |
| **Sprint 2-D.4 — 포즈·카메라·조명 시각적 선택** | 관절 마네킹 포즈 카드 16종·Figure Builder 자세 보기, 기준 장면 카메라 카드 14종·카메라 미리보기(화면비 반영), 머리 구체 조명 카드 14종·조명 미리보기, core 0.16.0 | ✅ 완료 ([설계 원칙 §13](VISUAL_EDITOR_PRINCIPLES.md)) |
| **Sprint 2-D.5 — Recommended Mode** | 추천 콘셉트 12개(기존 프리셋 계획·확인·적용·되돌리기 재사용, 직접 설정한 값 기본 유지 `keepUser`), 추천 탭·콘셉트 카드(설명·스케치·주요 속성), core 0.17.0 | ✅ 완료 ([설계 원칙 §14](VISUAL_EDITOR_PRINCIPLES.md)) |
| **Sprint 2-D.6 — Random Composer** | Random 탭: 아무것도 고르지 않아도 생성, 기본 선택 5개(종족·성별·스타일·배경·외모 방향, 모두 선택 사항). 선택하지 않은 모든 적용 가능한 속성을 카탈로그 값으로 생성(실행당 약 300개, 개수 제한 없음), 직접 설정·추천 콘셉트·제외한 값 유지, 랜덤 출처 표시(`random_composer`, 저장 형식 그대로), 재생성·되돌리기, 안전 정책 준수(구성 정책 + 최대 3회 검사), 모바일 탭 5개 정리 | ✅ 완료 ([설계 원칙 §15](VISUAL_EDITOR_PRINCIPLES.md), ADR-068) |
| **Sprint 2-D.7 — Random Quality & Prompt Optimization** | 랜덤 방식 Natural(기본)·Creative·Chaos(2-D.6 그대로) — 기존 충돌 규칙·`suggestedWhen`·관계와 가중치 데이터 사용, 극단값·장식 제한, 선택적 세부 항목 미설정 허용. 프롬프트 출력 방식 Compact·Balanced·Full(ImageSpec과 분리, 기존 프로젝트 Full, 랜덤 결과 Balanced, 전체 명세 안전 검사 유지, 생략 목록). 길이·토큰·텍스트 입력 비용 표시(로컬 o200k_base 토크나이저, 확인된 가격만 기본값, 직접 입력). 통합·사용성 개선, TD-16 자동 검사 부분 | ✅ 완료 ([설계 원칙 §16](VISUAL_EDITOR_PRINCIPLES.md), ADR-069, [예시](examples/random-prompts.md)) |
| Sprint 3 — Precision editor | 위치와 개수 지정, 부위별 속성, 중요도, 유지/제외 조건, 참조 이미지 역할(메타데이터) | ⏳ 예정 |
| Sprint 4 — Style taxonomy & non-person | 직교 스타일 축, 카탈로그 확장, 풍경·건축·제품·게임 에셋 | ⏳ 예정 |
| Sprint 5 — Image API & live validation | OpenAI provider adapter(서버 측), 비용 가드, 실행 이력, 결과 비교 | ⏳ 예정 |
| Sprint 6 — Product validation | 실사용자 검증, 지표, 유료화 탐색 | ⏳ 예정 |

## 제품 공개 전 호환성 검증 목록 (Sprint 2-C.4 최종 승인)

Sprint 2-C.4 기준 **미검증**입니다(Sprint 2-D.7에서 갱신). Sprint 완료를 막는 조건은 아니며, 제품 공개 전에 확인합니다.

| 항목 | 현재 상태 |
|---|---|
| 실제 스크린 리더(macOS VoiceOver, Windows NVDA) | 미검증 — TD-16. Sprint 2-D.7에서 자동 검사(새 컨트롤의 역할·이름 ARIA 스냅샷, 데스크톱·모바일)만 수행. 실제 청취 확인은 사람이 해야 하므로 공개 전 검증으로 유지 |
| 실제 이미지 모델에서의 Natural·Creative 결과 품질 | 미검증 — 이 환경에서는 이미지 생성 API를 쓰지 않음. 관계·가중치 데이터는 실험 결과로 조정 |
| 토큰 수와 실제 API 집계의 차이 | 미검증 — 로컬 o200k_base 계산(요청 형식에 따른 몇 토큰 차이 가능), 다른 모델은 추정치로 표시 |
| 모델별 텍스트 입력 가격 | 2026-11-25 공개 가격 확인(GPT Image 1.5 $5, GPT Image 1 mini $2 / 100만 토큰). 공개 전에 다시 확인 |
| Firefox | 미검증 — E2E는 Chromium만 사용 |
| Safari(macOS·iOS) | 미검증 |
| 휴대폰 실기기 | 미검증 — Pixel 7 에뮬레이션 + CPU 4배 제한으로만 측정 |
| 원격 네트워크 환경(배포 서버, 느린 회선) | 미검증 — 로컬 서버 기준(`docs/PERFORMANCE.md`) |

## 보류 (지시문에 따라 후속 개발)

| 항목 | 상태 | 비고 |
|---|---|---|
| Image-to-Image | 보류 | `TaskSchema`가 현재 `"text-to-image"`만 허용. 추가 시 스키마 minor 버전 올림 |
| 동영상 생성 | 보류 | 계획서 §2 "Not initially in scope" |

## 미리 마련한 확장 구조와 현황

| 구조 | 도입 | 현황 / 사용 예정 |
|---|---|---|
| tier 필터 (`attributesForTier`, `attributesVisibleIn`) | Sprint 0 | Sprint 1에서 스타일·조명 축 속성을 detailed tier로 정의. 편집 UI는 Sprint 2·4 |
| `multi`, `number`, `range` 값 타입과 범용 컨트롤 | Sprint 0 | multi는 분위기·Identity에 사용 중. number/range는 fixture로 검증 |
| `quantity`(숫자 또는 범위 + 단위), 사용자 정의 값, 출력 제외, 표현 역할, 조건별 표현, covers, 표시용 묶음 | Sprint 2-B.1 | Identity에서 사용 중. 모든 카탈로그에서 재사용 가능한 공통 기능 |
| 적용 조건(`appliesWhen`, 속성·선택지 단위), 계층 매칭 | Sprint 0 / 1 | 구도·방향·각도에 사용 중 |
| 규칙(충돌·의존성·가시성) + guidance/actions | Sprint 0 / 1 | core 규칙 7개 사용 중 |
| 선택지 계층(`parentId`), 별칭, 검색 | Sprint 0 / 1 | 스타일·장소에 사용 중. 피사체 하위 분류는 Sprint 4 (fixture로 검증) |
| 분류 정보(`classification`) | Sprint 1 | 스타일·조명 프리셋. 축 편집기는 Sprint 4 / Detailed |
| 정책 태그(`policyTags`) | Sprint 1 | Identity 연령대(미성년 6개 구간 `age.minor`) + 구조화 연령 신호(Sprint 2-B.1) |
| 파라미터 채널(`channel`, `parameterValue`) | Sprint 1 | 화면비. provider 연동은 Sprint 5 |
| 시각 예시 메타데이터(`examples`) | Sprint 0 | 자리표시자만 있음. 실제 자산·시각 선택은 Sprint 2-D(설계 원칙: VISUAL_EDITOR_PRINCIPLES.md), 비인물은 Sprint 4 |
| `prompt.byAdapter` (모델별 표현) | Sprint 0 | Sprint 5 |
| `priority` 필드 | Sprint 0 | 스키마만 있음. Sprint 3 |
| 스키마 마이그레이션 훅 / 카탈로그 ID 마이그레이션 | Sprint 0 / 1 | 카탈로그 마이그레이션 1건 사용 중 (`style.visual` → `style.preset`) |
| `ImageProviderAdapter` | Sprint 0 | Sprint 5 |
| CI 설정 파일 | Sprint 1 | 원격(GitHub) 연결 완료, GitHub Actions에서 실행 |
