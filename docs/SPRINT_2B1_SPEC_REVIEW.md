# Sprint 2-B.1 — 최종 사양 검토 (인물 기본 정보)

- 상태: **승인됨 — 구현 기준 문서 (3차본, 2026-11-24 Sprint 2-B.1 Implementation Approval)**. 선택지·국가·지역 목록·영어 표현은 초기 제품 카탈로그로 승인되었습니다. 구현 결과와 구현 중 판단은 [SPRINT_2B1_REPORT.md](SPRINT_2B1_REPORT.md)를 참고하세요. 승인된 내용은 [catalogs/person/identity.md](catalogs/person/identity.md)와 [catalogs/CATALOG_DESIGN_STANDARD.md](catalogs/CATALOG_DESIGN_STANDARD.md)에 반영되었습니다.
- 기준: main `49be933`, 기술 검토 결정(“Sprint 2-B.1 Technical Review Decision”), 사양 검토 결정(“Sprint 2-B.1 Specification Review Decisions”, N1–N5)
- 변경 이력: 1차 — 최초 제안 / 2차 — N1·N2·N3·N5 결정 반영, N4(영어 표현) 검토용 부록 B(선택지별 최종 컴파일 결과)·부록 C(원안 대비 표현 변경 전체 목록) 추가, 국적 데이터 출처·버전 기록 / 3차 — Q1·Q2·Q3, 국적 문장 틀 A 승인 반영(존재 분류표, 사례 추가, 콩고·니제르 명칭 구분)
- 원본 설계 문서: 승인 후 `docs/catalogs/CATALOG_DESIGN_STANDARD.md`, `docs/catalogs/person/identity.md`로 옮기고 §8의 수정 사항을 반영했습니다.
- 범위: 인물 › 인물 기본 정보 16개 속성. 다른 인물 카탈로그, 속성 잠금(Sprint 3), 시각 예시 제작은 범위 밖입니다.

표기: `attr.` = `person.identity.` 접두어. “표현”은 컴파일러가 출력하는 영어 문자열입니다.

---

## 1. 기술 결정 사항 반영 목록

| 결정 | 승인 내용 | 반영 방식 (이 문서 위치) |
|---|---|---|
| D0 | 최종 어휘·영어 표현 검토 후 승인 | 이 문서 §3·§4·부록 A가 검토 대상 |
| D1 | 문서 배치 | 구현 승인 후 T1에서 이동: `docs/catalogs/CATALOG_DESIGN_STANDARD.md`, `docs/catalogs/person/identity.md`(기존 draft-0 스텁 교체) |
| D2 | snake_case, `character_origin`, 소문자 국가 코드 | §2 |
| D3 | `excludedFromPrompt: true`, 전체 카탈로그 공통 기능, UI 토글은 Identity만 | §1.1, §9 |
| D4 | CustomEntry, 200/2,000자, 혼합 허용, 개수 제한 없음, 자동 병합 금지 | §1.1, §3 |
| D5 | `quantity`, 년·개월·일, 정수, 0 이상, 상한 없음, 단위 정규화 | §1.1, §5 |
| D6 | 연령대 = 실제 생애 단계, 실제 연령과 비교. 적용 범위는 Q3로 확장(존재 분류 human, 미설정 포함) | §3.4, §4.4 R1, §5 |
| D7 | 연령 판단 4분류 + 성별 조건별 표현 | §5 (보고서 §8과 D7 기준을 하나로 통일) |
| D8 | 제외·비활성 값, 사용자 정의 명칭·표현 모두 안전 검사 | §5.4 |
| D9 | 속성별 독립 문장 + 출처 추적 | §4, §7 |
| D10 | `covers` 의미 중복 제거, 비전형 조합은 비차단 안내 | §3.2, §4.3 |
| D11 | Identity는 피사체 “인물(1인)”에만 적용 | §3 공통 |
| D12 | 국적 다중 + 무국적 충돌 안내, 다중+사용자 정의 5개, 단일+사용자 정의 2개, 연령대 단일 | §3 |
| D13 | 비성적 미성년자 묘사 허용, 성적 묘사 차단, 마스터 플랜 “adult age range”는 예시 | §5.4 |
| D14 | 대립자 라벨, 직업 묶음 표시 전용, hybrid 안내 | §3 |
| N1 | 기존 출력 순서 번호 ×10, 상대 순서 유지, 회귀 테스트로 출력 불변 증명. 카테고리 순서와 카테고리 내부 속성 순서 분리를 기술 부채로 기록 | §9.1, §9.4 T4, §8 “기타”(TD-08) |
| N2 | 대만·홍콩·마카오·코소보 포함. UI 명칭 “국적 및 국가·지역 / Nationality / Country or Region”. 법적 국적·정치적 지위를 단정하지 않음. 데이터 출처·버전 기록 | §2, §3.9, §4.1, §6, 부록 A |
| N3 | 존재 유형·종족 미설정이면 인간 연령 기준 적용(ImageSpec에 human 자동 설정 없음). 비인간이 구조적으로 확인되면 실제 연령만으로 성인 판단 안 함 | §5 |
| N4 | **승인 보류** — 문장 틀과 결합된 최종 컴파일 결과 기준으로 검토 | 부록 B, 부록 C, §7 |
| N5 | 카테고리의 **저장된 선택값 전체**가 초기화 대상(제외·비활성·화면 비표시 포함). 검색·필터·표시 상태 무관 | §9.2 |

### 1.1 확정 스키마 (구현 승인 시 적용)

**ImageSpec 0.3.0** (0.2.0 → 0.3.0 마이그레이션: 버전 숫자만 변경, 무손실)

```ts
AttributeSelection {
  value; source; priority?; origin?;
  excludedFromPrompt?: true          // 없음 = 출력 포함 (기존 동작과 동일)
}
CustomEntry { label: string /*1–200, 원문*/; expression?: string /*1–2000, 원문*/ }
single: { kind: "single"; optionId } | { kind: "single"; custom: CustomEntry }
multi:  { kind: "multi"; optionIds: string[]; custom?: CustomEntry[] }   // optionIds+custom ≥ 1
number: { kind: "number"; value; unit? }       // 속성에 units가 있으면 unit 필수
range:  { kind: "range"; min; max; unit? }
```

- 상태(Unset / Selected / Excluded)는 **선택 상태**, 표현 역할(Direct / Context / Metadata)은 **카탈로그 속성의 성질**로 분리합니다. Metadata는 선택 상태가 아니며, Metadata 속성은 제외 여부와 무관하게 출력하지 않습니다.
- `applySelection`은 값 변경 시 `excludedFromPrompt`를 보존(기존 `priority`와 같은 방식)하고, 해제 시 선택과 함께 제거합니다.
- 사용자 정의 값 중복: 같은 다중 값 안에서 정규화(NFKC·trim·대소문자 무시)한 `label`이 같은 항목 2개는 스키마 오류입니다. 등록 선택지와 이름이 같거나 비슷해도 **병합·대체하지 않고** UI에서 안내만 합니다.
- 공백뿐인 `label`/`expression`은 허용하지 않습니다(`expression`은 비우면 필드 자체를 생략).

**Catalog format 0.4.0** (모두 선택 필드 — 기존 데이터 그대로 유효)

| 위치 | 필드 | 용도 |
|---|---|---|
| 속성 | `expression: { role: "direct"\|"context"\|"metadata", kind: "categorical"\|"relative"\|"interpretive"\|"numeric"\|"freeText" }` | 역할·의미 종류. `metadata`는 컴파일 제외 |
| 속성 | `outputToggle?: boolean` | 이번 Sprint에서 토글 UI를 보일 속성 표시 (Identity만 true) |
| 속성 | `custom?: { labelMaxLength: 200, expressionMaxLength: 2000, nameOnlyNotice: boolean }` | 사용자 정의 허용 |
| 속성 타입 | `quantity { forms: ("number"\|"range")[], units: [{id,label,one,other}], min, max?, step? }` | 숫자 또는 범위 + 단위 |
| 선택지 | `group?: id` + 카탈로그 `optionGroups` | 표시 전용 묶음(선택 불가, 출력 없음) |
| 선택지 | `covers?: [{ attributeId, optionIds }]` | 의미 중복 제거 (§4.3) |
| 선택지 | `suggestedWhen?: Condition[]` | UI 정렬과 “비전형 조합” 안내에만 사용 (활성 여부와 무관) |
| 선택지 | `interval?: { min:{value,unit}, maxExclusive?:{value,unit} }` | 연령대 구간 |
| 선택지 | `prompt.variants?: [{ when: Condition[], text }]` | 조건별 표현 (첫 일치, 없으면 `text`) |
| 조건 | `{ op: "derived", fact: "age.class", anyOf: [...] }` | 연령 판단 결과 참조 |
| 조건 | `{ op: "selectedCount", attributeId, min }` | 다중 값 개수(등록+사용자 정의) |
| 카탈로그 | `intervalChecks: [{ id, quantityAttributeId, groupAttributeId, when, severity }]` | 연령–연령대 불일치 검사 |

**Core catalog 0.4.0**: 속성 추가만 (기존 ID 변경 없음, 마이그레이션 `changes: []`). Identity 데이터는 `catalogs/person/identity.ts`로 분리하고 기존 레지스트리에서 통합합니다.

**Compiler 0.4.0 / Safety baseline 0.2.0**: 기존 스펙의 출력·차단 결과는 동일해야 합니다(회귀 fixture로 증명). 단어 목록은 변경하지 않습니다.

---

## 2. 수정된 Attribute ID 목록

| 순서 | 원안 | 확정 ID | 타입 / 컨트롤 | 역할 / 종류 | 사용자 정의 | 출력 토글 |
|---|---|---|---|---|---|---|
| 1 | entityType | `person.identity.entity_type` | single / searchable | Direct / categorical | ✓ (이름만이면 안내) | ✓ |
| 2 | species | `person.identity.species` | single / searchable (계층) | Direct / categorical | ✓ (이름만이면 안내) | ✓ |
| 3 | origin | `person.identity.character_origin` | single / chips | Context / categorical | — | ✓ |
| 4 | ageGroup | `person.identity.age_group` | single / dropdown | Direct / categorical | — | ✓ |
| 5 | age | `person.identity.age` | quantity / 숫자·범위 + 단위 | Context / numeric | — | ✓ |
| 6 | apparentAge | `person.identity.apparent_age` | quantity / 숫자·범위 + 단위 | Direct / numeric | — | ✓ |
| 7 | gender | `person.identity.gender` | single / chips | Context / categorical | ✓ | ✓ |
| 8 | genderPresentation | `person.identity.gender_presentation` | single / chips | Direct / interpretive | ✓ (이름만이면 안내) | ✓ |
| 9 | nationality | `person.identity.nationality` — UI 명칭 **국적 및 국가·지역 / Nationality / Country or Region** (N2, ID는 그대로) | **multi** / searchable | Context / categorical | ✓ | ✓ |
| 10 | ethnicBackground | `person.identity.ethnic_background` | multi / searchable | Context / categorical | ✓ | ✓ |
| 11 | culturalBackground | `person.identity.cultural_background` | multi / searchable | Context / categorical | ✓ | ✓ |
| 12 | historicalPeriod | `person.identity.historical_period` | single / searchable | Context / categorical | ✓ | ✓ |
| 13 | occupation | `person.identity.occupation` | multi / searchable (묶음 표시) | Context / categorical | ✓ | ✓ |
| 14 | narrativeRole | `person.identity.narrative_role` | multi / searchable | Context / categorical | ✓ | ✓ |
| 15 | socialStatus | `person.identity.social_status` | single / searchable | Context / categorical | ✓ | ✓ |
| 16 | description | `person.identity.description` | text / textarea (2,000자) | Context / freeText | (자유 입력) | ✓ |

공통: `domain: "person.identity"`, `categoryId: "person_identity"`, `tier: "detailed"`, `status: "approved"`(승인 시), `appliesWhen: [subject anyOf ["person"], whenUnset: "pass"]`. 카테고리 `person`, `person_identity`만 approved로 변경하고 나머지 13개는 draft를 유지합니다.

**속성 별칭(검색)**: entity_type “존재 유형, 엔티티, entity, being type” · species “종족, 종, race, species” · character_origin “실재 여부, 인물 출처, 가상 인물, 실존 인물, origin” · age_group “연령대, 나이대, age group, life stage” · age “실제 연령, 나이, 실제 나이, age, actual age” · apparent_age “외형적 연령, 외모 나이, 보이는 나이, apparent age, looks age” · gender “성별, gender” · gender_presentation “성별 표현, 젠더 표현, gender expression, presentation” · nationality “국적, 국가, 지역, 시민권, nationality, country, region, citizenship” · ethnic_background “민족, 민족적 배경, ethnicity, ethnic background” · cultural_background “문화, 문화적 배경, culture” · historical_period “시대, 시대적 배경, era, period” · occupation “직업, 직종, job, profession” · narrative_role “서사적 역할, 역할, 배역, role” · social_status “사회적 지위, 신분, 계층, status, class” · description “인물 설명, 캐릭터 설명, character description, bio”.

---

## 3. 16개 속성의 최종 선택지 제안 목록 (선택지별 영어 표현 포함)

원안 선택지는 모두 보존합니다. 원안의 `custom` 행은 고정 선택지가 아니라 **“사용자 정의” 입력 항목**(CustomEntry)으로 구현합니다 — UI에는 목록 끝에 “사용자 정의…”로 보입니다. 선택지의 영어 표현은 속성 문장 틀(§4.1) 안의 `{value}`에 들어갑니다. 템플릿이 이미 맥락(“Species:”, “Nationality:”)을 주므로, 원안 표현에서 중복되는 꼬리말(“… presentation”, “… ethnic background”)은 뺐습니다. 변경은 각 표의 “원안 대비”에 표시합니다.

### 3.1 entity_type — 존재 유형

| ID | 한국어 | English label | 표현 | 원안 대비 | 별칭 |
|---|---|---|---|---|---|
| human | 인간 | Human | human | 동일 | 사람, person |
| fantasy_humanoid | 판타지 인간형 존재 | Fantasy humanoid | fantasy humanoid | 동일 | 판타지 종족, fantasy race |
| alien_humanoid | 외계 인간형 존재 | Alien humanoid | alien humanoid | 동일 | 외계인, alien, extraterrestrial |
| android | 안드로이드 | Android | android | 동일 | 인조인간, synthetic human |
| cyborg | 사이보그 | Cyborg | cyborg | 동일 | 개조 인간 |
| humanoid_robot | 인간형 로봇 | Humanoid robot | humanoid robot | 동일 | 로봇, 휴머노이드, robot |
| anthropomorphic | 의인화 캐릭터 | Anthropomorphic character | anthropomorphic character | 동일 | 의인화, anthro |
| supernatural | 초자연적 존재 | Supernatural being | supernatural being | 동일 | 초자연, 영적 존재 |
| mythological | 신화적 존재 | Mythological being | mythological being | 동일 | 신화, myth |
| artificial_life | 인공 생명체 | Artificial life form | artificial life form | 동일 | 인공생명, artificial life |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label 원문 | `custom` 옵션 → CustomEntry | — |

### 3.2 species — 종족 (계층형)

`suggestedWhen` = 원안 “Typical entity context” 열. 이 조건이 맞지 않는 조합은 숨기지 않고 **정보(info) 안내**만 합니다. `covers` = 같은 열의 존재 유형(§4.3).

| ID | 부모 | 한국어 | English label | 표현 | 대표 존재 유형 (`suggestedWhen` = `covers`) | 원안 대비 | 별칭 |
|---|---|---|---|---|---|---|---|
| human | — | 인간 | Human | human | human | 동일 | 사람 |
| elf | — | 엘프 | Elf | elf | fantasy_humanoid | 동일 | 요정족, elves |
| dwarf | — | 드워프 | Dwarf | fantasy dwarf | fantasy_humanoid | “dwarf (fantasy species)” → “fantasy dwarf” (같은 의미, 괄호 제거) | 난쟁이족 |
| orc | — | 오크 | Orc | orc | fantasy_humanoid | 동일 | — |
| goblin | — | 고블린 | Goblin | goblin | fantasy_humanoid | 동일 | — |
| giant | — | 거인족 | Giant | fantasy giant | fantasy_humanoid | “giant (fantasy species)” → “fantasy giant” | 거인 |
| dragon_humanoid | — | 용인족 | Dragon humanoid | dragon humanoid | fantasy_humanoid | 동일 | 드래곤족, dragonkin |
| beastfolk | — | 수인족 | Beastfolk | beastfolk | fantasy_humanoid, anthropomorphic | 동일 | 수인, kemonomimi |
| catfolk | beastfolk | 고양이 수인 | Catfolk | feline beastfolk | (부모 상속) | 동일 | 묘인, 고양이 수인족 |
| foxfolk | beastfolk | 여우 수인 | Foxfolk | fox beastfolk | (부모 상속) | 동일 | 호인, 구미호 수인 |
| wolffolk | beastfolk | 늑대 수인 | Wolffolk | wolf beastfolk | (부모 상속) | 동일 | 늑대인간형 수인 |
| fairy | — | 요정 | Fairy | fairy | fantasy_humanoid, supernatural | 동일 | 페어리 |
| elemental | — | 정령 | Elemental | elemental being | supernatural | 동일 | 엘리멘탈 |
| angel | — | 천사 | Angel | angel | supernatural, mythological | 동일 | — |
| demon | — | 악마 | Demon | demon | supernatural, mythological | 동일 | 마족 |
| vampire | — | 뱀파이어 | Vampire | vampire | fantasy_humanoid, supernatural | 동일 | 흡혈귀 |
| undead | — | 언데드 | Undead | undead being | supernatural | 동일 | 불사자 |
| hybrid | — | 혼합 종족 | Hybrid species | hybrid species | (없음) | 동일 + 설명 권장 안내(R5) | 혼혈, 하이브리드 |
| (사용자 정의) | — | 사용자 정의 | Custom | expression 또는 label | (없음) | CustomEntry | — |

부모(`beastfolk`)와 자식은 단일 선택이므로 동시에 출력되지 않습니다. 검색 결과의 자식은 “수인족 › 고양이 수인”처럼 경로와 함께 표시합니다.

### 3.3 character_origin — 인물의 실재 여부

| ID | 한국어 | English label | 표현 | 원안 대비 |
|---|---|---|---|---|
| fictional | 가상의 인물 | Fictional character | fictional character | 동일 |
| real | 실존 인물 | Real person | real person | 동일 |
| historical | 역사적 인물 | Historical figure | historical figure | 동일 |
| mythological | 신화 속 인물 | Mythological figure | mythological figure | 동일 |
| original | 독창적인 창작 캐릭터 | Original character | original character | “original fictional character” → “original character” (선택: 원안 유지 가능) |

사용자 정의 없음(원안). 실존 인물 관련 새 정책은 추가하지 않습니다(D8, Sprint 5).

### 3.4 age_group — 연령대 (12개 유지, 단일 드롭다운)

구간은 표시용 설명과 불일치 검사(§5.3)에 쓰입니다. 라벨에는 구간을 넣지 않고 설명(description)에 둡니다 — 단, `adult`는 지시대로 라벨 자체를 구분합니다.

| ID | 한국어 라벨 | English label | 구간 (`interval`) | 표현 | 정책 태그 | 원안 대비 |
|---|---|---|---|---|---|---|
| newborn | 신생아 | Newborn | 0일 – 28일 미만 | newborn | `age.minor` | 동일 |
| infant | 영아 | Infant | 28일 – 1년 미만 | infant | `age.minor` | 동일 |
| toddler | 걸음마기 | Toddler | 1년 – 4년 미만 | toddler | `age.minor` | 동일 |
| preschool | 유아 | Preschool child | 4년 – 6년 미만 | preschool-aged child | `age.minor` | 동일 |
| child | 어린이 | Child | 6년 – 13년 미만 | child | `age.minor` | 동일 |
| adolescent | 청소년 | Adolescent | 13년 – 18년 미만 | adolescent | `age.minor` | 동일 |
| young_adult | 젊은 성인 | Young adult | 18년 – 30년 미만 | young adult | (성인 근거) | 동일 |
| adult | **일반 성인 (30–44세)** | **Adult (30–44)** | 30년 – 45년 미만 | adult aged 30–44 | (성인 근거) | 한국어·영어 라벨 변경 (안전 정책의 “성인” 분류와 구분) |
| middle_aged | 중년 | Middle-aged | 45년 – 65년 미만 | middle-aged adult | (성인 근거) | 동일 |
| older_adult | 노년 | Older adult | 65년 – 80년 미만 | older adult | (성인 근거) | 동일 |
| advanced_age | 고령 | Advanced age | 80년 이상 | adult aged 80 or older | (성인 근거) | 동일 |
| ageless | 연령 개념 없음 | Ageless | (없음) | ageless | — | “ageless being” → “ageless” (템플릿 “Age group:”과 중복 회피) |

“(성인 근거)”는 정책 태그가 아니라 연령 판단(§5) 입력입니다. 미성년 6개 구간의 `age.minor` 태그는 출력 제외·비활성 상태에서도 안전 검사에 들어갑니다.

### 3.5 age — 실제 연령 / 3.6 apparent_age — 외형적 연령

`quantity`, forms `number`·`range`, 단위 `years`(년)·`months`(개월)·`days`(일), 정수, min 0, 상한 없음, step 1. 범위는 양 끝이 모두 유효할 때만 저장합니다(기존 입력 중/저장값 분리).

| 단위 ID | 한국어 | 단수 표현 | 복수 표현 |
|---|---|---|---|
| years | 년 | year | years |
| months | 개월 | month | months |
| days | 일 | day | days |

값 표현: 숫자 `28 years old`, `1 year old`, `8 months old` / 범위 `28–32 years old`(en dash). 단위는 입력값 그대로 출력하며 변환하지 않습니다(360개월은 “360 months old”로 출력, 연령 판단에서만 30년으로 정규화).

### 3.7 gender — 성별 (단일 + 사용자 정의)

| ID | 한국어 | English label | 표현 (조건별) | 원안 대비 |
|---|---|---|---|---|
| woman | 여성 | Woman | `age.class = adult` → **woman** / 그 외 → **female character** | 원안의 두 표현을 조건별로 구현 |
| man | 남성 | Man | `age.class = adult` → **man** / 그 외 → **male character** | 동일 |
| nonbinary | 논바이너리 | Non-binary | non-binary person | 동일 |
| genderless | 성별 없음 | Genderless | genderless character | 동일 |
| genderfluid | 젠더플루이드 | Genderfluid | genderfluid person | 동일 |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label | CustomEntry |

원본 선택값(`woman`)은 연령 판단과 무관하게 그대로 저장되고, 출력 표현만 달라집니다. 필드에 “출력 표현: female character — 연령 판단: 알 수 없음”처럼 이유를 표시합니다.

### 3.8 gender_presentation — 성별 표현 (단일 + 사용자 정의)

| ID | 한국어 | English label | 표현 | 원안 대비 |
|---|---|---|---|---|
| feminine | 여성적인 표현 | Feminine | feminine | “feminine presentation” → “feminine” (템플릿 중복 제거) |
| masculine | 남성적인 표현 | Masculine | masculine | 동일 방식 |
| androgynous | 중성적인 표현 | Androgynous | androgynous | 동일 방식 |
| mixed | 혼합된 표현 | Mixed | mixed masculine and feminine | 동일 방식 |
| neutral | 성별 표현을 강조하지 않음 | Not emphasized | gender-neutral | 동일 방식 |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label | CustomEntry |

### 3.9 nationality — 국적 및 국가·지역 (다중 + 사용자 정의)

UI 명칭: 한국어 “국적 및 국가·지역”, 영어 “Nationality / Country or Region”(N2). 국가와 지역을 한 목록에 두되, 각 항목의 법적 국적이나 정치적 지위를 같은 것으로 단정하지 않습니다 — 선택지는 “사용자가 이 인물과 연결한 국가 또는 지역”으로 정의하고, 표시 명칭(CLDR 지명)과 프롬프트 표현(형용사)을 분리합니다(예: 표시 “홍콩(중국 특별행정구)”, 표현 “Hong Kong”). 구성 방안은 §6, 전체 목록은 부록 A. 원안 12개국과 `stateless`는 모두 포함됩니다(ID는 소문자: `kr`, `jp`, `cn`, `in`, `us`, `ca`, `gb`, `fr`, `de`, `br`, `au`, `ng`).

| ID | 한국어 | English label | 표현 | 원안 대비 |
|---|---|---|---|---|
| (국가·지역 ~199개) | CLDR 한국어명 | CLDR 영어명 | 국적 형용사 (예: South Korean) | `KR` → `kr` |
| stateless | 무국적 | Stateless | stateless | “stateless person” → “stateless” |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label | CustomEntry |

### 3.10 ethnic_background — 민족적 배경 (다중 + 사용자 정의)

원안의 예시 목록만 넣습니다(확장은 별도 제품 승인).

| ID | 한국어 | English label | 표현 | 원안 대비 |
|---|---|---|---|---|
| korean | 한국계 | Korean | Korean | “Korean ethnic background” → “Korean” |
| japanese | 일본계 | Japanese | Japanese | 동일 방식 |
| han | 한족 | Han Chinese | Han Chinese | 동일 방식 |
| tamil | 타밀계 | Tamil | Tamil | 동일 방식 |
| yoruba | 요루바계 | Yoruba | Yoruba | 동일 방식 |
| maori | 마오리계 | Māori | Māori | 동일 방식 |
| arab | 아랍계 | Arab | Arab | 동일 방식 |
| mixed | 복합 민족적 배경 | Mixed | mixed | 동일 방식 |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label | CustomEntry |

### 3.11 cultural_background — 문화적 배경 (다중 + 사용자 정의)

| ID | 한국어 | English label | 표현 | 원안 대비 |
|---|---|---|---|---|
| korean | 한국 문화 | Korean | Korean | “Korean cultural background” → “Korean” |
| japanese | 일본 문화 | Japanese | Japanese | 동일 방식 |
| chinese | 중국 문화 | Chinese | Chinese | 동일 방식 |
| mediterranean | 지중해 문화 | Mediterranean | Mediterranean | 동일 방식 |
| diaspora | 디아스포라 문화 | Diaspora | diaspora | 동일 방식 |
| multicultural | 다문화 | Multicultural | multicultural | 동일 방식 |
| fictional | 가상 문화 | Fictional culture | fictional culture | 동일 방식 |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label | CustomEntry |

### 3.12 historical_period — 시대적 배경 (단일 + 사용자 정의)

| ID | 한국어 | English label | 표현 | 원안 대비 |
|---|---|---|---|---|
| prehistoric | 선사 시대 | Prehistoric | prehistoric era | 동일 |
| ancient | 고대 | Ancient | ancient era | 동일 |
| medieval | 중세 | Medieval | medieval era | 동일 |
| renaissance | 르네상스 | Renaissance | Renaissance | “Renaissance-era context” → “Renaissance” |
| early_modern | 근세 | Early modern | early modern era | 동일 |
| industrial | 산업화 시대 | Industrial era | industrial era | 동일 |
| early_20c | 20세기 초 | Early 20th century | early 20th century | 동일 |
| mid_20c | 20세기 중반 | Mid-20th century | mid-20th century | 동일 |
| late_20c | 20세기 후반 | Late 20th century | late 20th century | 동일 |
| contemporary | 현대 | Contemporary | contemporary era | 동일 |
| future | 미래 | Future | future era | 동일 |
| far_future | 먼 미래 | Far future | far future | 동일 |
| joseon | 조선 시대 | Joseon era | Joseon era (Korea) | “Joseon-era context” → 지역 명시 |
| edo | 에도 시대 | Edo period | Edo period (Japan) | “Edo-period context” → 지역 명시 |
| fictional | 가상 시대 | Fictional era | fictional era | 동일 |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label | CustomEntry |

장면의 시대와 자동 동기화하지 않습니다(현재 장면 시대 속성은 없음).

### 3.13 occupation — 직업 (다중 + 사용자 정의, 표시 전용 묶음)

| 묶음 (`optionGroups`) | ID / 한국어 / 표현 |
|---|---|
| medicine 의료 | doctor / 의사 / physician · nurse / 간호사 / nurse · pharmacist / 약사 / pharmacist |
| technology 기술 | developer / 개발자 / software developer · engineer / 엔지니어 / engineer · researcher / 연구원 / researcher |
| design 디자인 | architect / 건축가 / architect · designer / 디자이너 / designer · artist / 예술가 / artist |
| education 교육 | teacher / 교사 / teacher · professor / 교수 / professor · student / 학생 / student |
| business 비즈니스 | merchant / 상인 / merchant · executive / 경영자 / business executive · entrepreneur / 기업가 / entrepreneur |
| services 서비스 | chef / 요리사 / chef · mechanic / 정비사 / mechanic · driver / 운전사 / driver |
| land_sea 농림·해양 | farmer / 농부 / farmer · fisher / 어부 / fisher · sailor / 선원 / sailor |
| public 공공 | soldier / 군인 / soldier · police / 경찰 / police officer · firefighter / 소방관 / firefighter |
| arts_media 예술·미디어 | writer / 작가 / writer · musician / 음악가 / musician · actor / 배우 / actor |
| fantasy 판타지 | mage / 마법사 / mage · knight / 기사 / knight · alchemist / 연금술사 / alchemist · healer / 치유사 / healer |
| exploration 탐험 | explorer / 탐험가 / explorer · adventurer / 모험가 / adventurer · pilot / 조종사 / pilot |

34개 모두 원안과 동일. 별칭 예: developer “software developer, programmer, 개발자, 프로그래머”; doctor “physician, 의사, 닥터”; police “police officer, cop, 경찰관”; mage “wizard, sorcerer, 마법사, 마도사”. 묶음은 선택할 수 없고 출력되지 않습니다.

### 3.14 narrative_role — 서사적 역할 (다중 + 사용자 정의)

| ID | 한국어 | English label | 표현 | 원안 대비 |
|---|---|---|---|---|
| protagonist | 주인공 | Protagonist | protagonist | 동일 |
| antagonist | **대립자** | Antagonist | antagonist | 라벨 “대립자·악역” → “대립자” (D14). “악역”은 별칭으로 유지 |
| supporting | 조력자 | Supporting character | supporting character | 동일 |
| rival | 라이벌 | Rival | rival | 동일 |
| guardian | 수호자 | Guardian | guardian | 동일 |
| mentor | 스승 | Mentor | mentor | 동일 |
| companion | 동료 | Companion | companion | 동일 |
| civilian | 일반 시민 | Civilian | civilian | 동일 |
| wanderer | 방랑자 | Wanderer | wanderer | 동일 |
| leader | 지도자 | Leader | leader | 동일 |
| observer | 관찰자 | Observer | observer | 동일 |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label | CustomEntry |

### 3.15 social_status — 사회적 지위 (단일 + 사용자 정의)

| ID | 한국어 | English label | 표현 | 원안 대비 |
|---|---|---|---|---|
| royalty | 왕족 | Royalty | royalty | “member of royalty” → “royalty” |
| nobility | 귀족 | Nobility | nobility | 동일 방식 |
| commoner | 평민 | Commoner | commoner | 동일 |
| clergy | 성직 계층 | Clergy | clergy | 동일 방식 |
| executive | 기업 경영층 | Corporate leadership | corporate leadership | 동일 방식 |
| official | 공직자 | Public official | public official | 동일 |
| independent | 독립적 신분 | Independent standing | independent social standing | 동일 |
| (사용자 정의) | 사용자 정의 | Custom | expression 또는 label | CustomEntry |

### 3.16 description — 인물 설명

자유 입력, 최대 2,000자, 원문 그대로 출력(번역·보완 없음). 비영어 문자는 기존 언어 혼용 안내.

---

## 4. 선택지별 정확한 영어 프롬프트 표현 — 출력 규칙

### 4.1 속성 문장 틀 (generic-en: 속성마다 한 문장, 카탈로그 순서)

| 속성 | 템플릿 |
|---|---|
| entity_type | `Type of being: {value}.` |
| species | `Species: {value}.` |
| character_origin | `Character origin: {value}.` |
| age_group | `Age group: {value}.` |
| age | `Actual age: {value}.` |
| apparent_age | `Apparent age: approximately {value}.` |
| gender | `Gender: {value}.` |
| gender_presentation | `Gender presentation: {value}.` |
| nationality | `Nationality (country or region): {value}.` — **권장안 A 승인** |
| ethnic_background | `Ethnic background: {value}.` |
| cultural_background | `Cultural background: {value}.` |
| historical_period | `Character's historical era: {value}.` |
| occupation | `Occupation: {value}.` |
| narrative_role | `Narrative role: {value}.` |
| social_status | `Social status: {value}.` |
| description | `Character description: {value}` (끝 문장부호는 기존 규칙대로 보정) |

외형적 연령에는 “adult” 등 사용자가 선택하지 않은 단어를 넣지 않습니다(“approximately”만 붙음 — 외형 연령은 근사치라는 의미 표시).

### 4.2 값 렌더링

- 다중 값: 등록 선택지는 **카탈로그 순서**, 그 뒤에 사용자 정의 항목을 **저장된 순서**로, `, `로 연결.
- 사용자 정의: `expression`이 있으면 expression 원문, 없으면 `label` 원문. 공백 정규화 외 변경 없음.
- quantity: §3.5 규칙. 단수는 값이 정확히 1일 때.
- Metadata 역할 속성, `excludedFromPrompt`, 비활성(적용 불가) 속성은 문장을 만들지 않습니다.

### 4.3 의미 관계 구분 (D10)

| 관계 | 예 | 처리 | 진단 |
|---|---|---|---|
| **의미 중복** | entity `fantasy_humanoid` + species `elf` (elf.covers에 포함) | entity_type 문장을 출력하지 않음. 출처에 “종족(엘프)이 같은 의미를 포함” 기록 (`coveredBy`) | 없음 (필드에 설명만) |
| **동일 속성의 재정의** | 프리셋이 쓴 값을 사용자가 직접 바꿈 / 프리셋 문구의 의미 단위를 직접 선택이 대체 | 기존 Sprint 2-A 규칙 유지(직접 선택 우선) | 기존 `preset.unit_overridden` (info) |
| **서로 다른 의미 축** | age ↔ apparent_age, gender ↔ gender_presentation, nationality ↔ ethnic ↔ cultural, occupation ↔ social_status, historical_period ↔ 장면 | 모두 독립 출력, 서로 수정하지 않음 | 없음 |
| **실제 설정 충돌** | 무국적 + 특정 국적, 인간의 실제 연령 ↔ 연령대 불일치 | 둘 다 유지·출력, 자동 수정 없음 | warning (R1, R2) |
| **비전형 조합 (오류 아님)** | entity `android` + species `elf` | 둘 다 출력, 삭제·수정 없음 | info (R3) |

`covers`는 species가 **등록 선택지**이고 출력되는 경우에만 작동합니다. species가 사용자 정의·제외·비활성이면 entity_type은 그대로 출력됩니다. 자식 종족은 부모의 `covers`를 상속합니다(catfolk → beastfolk).

### 4.4 규칙 (모두 비차단, 승인 대상)

| ID | 심각도 | 조건 | 메시지(요지) | 조치 버튼 |
|---|---|---|---|---|
| R1 `identity-age-group-mismatch` | warning | `classifyBeing` = human(존재 유형·종족 미설정 포함 — Q3, D6 확장 승인) + age 설정 + age_group 설정(ageless 제외) + age(정규화)가 구간 밖 (범위는 일부라도 밖이면) | “실제 연령과 연령대가 맞지 않습니다” | 없음 (어느 쪽도 자동 수정 안 함) |
| R2 `identity-stateless-with-nationality` | warning | nationality에 `stateless` + 다른 항목(등록·사용자 정의) 1개 이상 | “무국적과 특정 국적이 함께 선택되었습니다” | 없음 |
| R3 `identity-atypical-entity-species` | info | species 선택지의 `suggestedWhen`이 현재 entity_type과 맞지 않음 (entity 미설정이면 안 함) | “일반적이지 않은 조합입니다. 의도한 설정이면 그대로 두세요” | 없음 |
| R4 `identity-custom-name-only` | info | Direct 역할(entity_type, species, gender_presentation)의 사용자 정의 값에 expression 없음 | “이름만 입력되었습니다. 모델이 모르는 이름일 수 있으니 시각적 설명을 추가해 보세요” | “설명 추가” (입력 칸 열기만) |
| R5 `identity-hybrid-undescribed` | info | species=`hybrid` + description 미설정 + species 사용자 정의 아님 | “혼합 종족의 조합을 인물 설명에 적어 주세요” | 없음 |

---

## 5. 연령 판단 및 조건별 표현 결정표

보고서 §8과 D7의 기준을 이 표 하나로 통일합니다.

### 5.1 입력과 정규화

- 입력: age_group, age, apparent_age — **설정된 값이면 출력 제외·비활성 여부와 무관하게 모두** 사용.
- 단위 정규화(판단 전용, 저장·출력 값은 변경하지 않음): `years` = 값, `months` = 값/12, `days` = 값/365.25. 360개월 = 30년. 단위 자체로는 판단하지 않습니다.
- 개별 신호 분류 (경계 18년):
  - 숫자: `< 18` → minor, `≥ 18` → adult
  - 범위: `max < 18` → minor, `min ≥ 18` → adult, 그 외(성인·미성년 모두 포함) → ambiguous
  - age_group: newborn…adolescent → minor, young_adult…advanced_age → adult, ageless → 신호 없음
- **존재 분류 `classifyBeing(spec)`** (N3·Q1·Q2): `human` / `nonhuman` / `unclassified`(분류 불명). 출력 제외·비활성 상태의 값도 입력에 포함합니다. **연령 판단(안전)과 연령–연령대 불일치 검증(R1)이 이 함수 하나를 공통으로 사용합니다**(Q3).

  | entity_type ↓ / species → | 미설정 | `human` 계층 | 그 외 등록 종족 | 사용자 정의 |
  |---|---|---|---|---|
  | 미설정 | **human** (N3 일반 인물) | human | nonhuman | unclassified |
  | `human` | human | human | unclassified (상충) | unclassified |
  | `cyborg` | unclassified (모호) | **human** (인간 사이보그) | nonhuman | unclassified |
  | `android`, `humanoid_robot`, `artificial_life` | nonhuman | **nonhuman** (인공 존재 — Q2) | nonhuman | nonhuman |
  | `fantasy_humanoid`, `alien_humanoid`, `anthropomorphic`, `supernatural`, `mythological` | nonhuman | unclassified (상충) | nonhuman | unclassified |
  | 사용자 정의 | unclassified (Q1) | unclassified | nonhuman | unclassified |

- 실제 연령(age)은 분류가 **human일 때만** 성인 근거가 됩니다. nonhuman·unclassified이면 실제 연령만으로 성인을 확정하지 않습니다. 실제 연령의 **미성년·모호 신호는 분류와 무관하게 항상** 적용합니다(보호 규칙 유지).
- 분류는 판단에만 쓰이며 ImageSpec에 `human` 등을 자동 설정하지 않습니다.

### 5.2 판단 규칙 (위에서부터 첫 일치)

| 순서 | 조건 | 결과 |
|---|---|---|
| 1 | 세 신호 중 하나라도 minor | **minor** (성인 신호로 상쇄하지 않음. 분류와 무관 — 보호 규칙 유지) |
| 2 | 하나라도 ambiguous | **ambiguous** (분류와 무관) |
| 3 | apparent_age가 adult, 또는 age_group이 adult, 또는 (**분류가 human이고** age가 adult) | **adult** |
| 4 | 그 외 | **unknown** |

nonhuman·unclassified인 경우 높은 실제 연령이나 종족만으로는 성인을 추론하지 않습니다. ageless·미설정 값도 성인 근거가 아닙니다.

### 5.3 사례표 (단위 테스트로 그대로 사용)

| # | 존재/종족 | age_group | age | apparent_age | 결과 | gender=woman 출력 |
|---|---|---|---|---|---|---|
| 1 | 인간 | — | 28년 | — | adult | woman |
| 2 | 인간 | — | 16년 | 25년 | minor | female character |
| 3 | 엘프 | — | 300년 | 30년 | adult | woman |
| 4 | 엘프 | — | 300년 | 12년 | minor | female character |
| 5 | 엘프 | — | 300년 | — | unknown | female character |
| 6 | 인간 | — | 16–20년 | — | ambiguous | female character |
| 7 | 인간 | — | 360개월 | — | adult | woman |
| 8 | 인간 | — | 216개월 (=18년) | — | adult | woman |
| 9 | 인간 | — | 200일 | — | minor (0.55년) | female character |
| 10 | 미설정 | — | 28년 | — | **adult** (N3: 인간 기준 적용, human 자동 설정 없음) | woman |
| 10a | 미설정 | — | — | — | unknown (모든 연령 미설정) | female character |
| 10b | 안드로이드 (nonhuman) | — | 28년 | — | unknown (실제 연령만으로 판단 불가) | female character |
| 10c | 미설정 / 종족 오크 (nonhuman) | — | 40년 | — | unknown | female character |
| 10d | 사이보그 + 종족 인간 (**인간 사이보그**, human) | — | 28년 | — | **adult** (Q2) | woman |
| 10e | 사용자 정의 존재 유형 (unclassified) | — | 30년 | — | unknown (Q1) | female character |
| 10f | 안드로이드 + 종족 인간 (nonhuman) | — | 28년 | — | **unknown** (Q2) | female character |
| 10g | 안드로이드 (nonhuman) | — | 100년 | 28년 | **adult** (외형 연령, Q2) | woman |
| 10h | 사이보그 + 종족 인간 (human) | — | 16년 | 30년 | **minor** (Q2) | female character |
| 10i | 사용자 정의 존재 유형 (unclassified) | — | 100년 | — | **unknown** (Q1·Q2) | female character |
| 10j | 사이보그, 종족 미설정 (unclassified) | — | 28년 | — | unknown (모호 → 보수적) | female character |
| 10k | 인간 + 종족 엘프 (unclassified, 상충) | — | 28년 | — | unknown | female character |
| 10l | 미설정 (human) | child | 30년 | — | minor + **R1 경고** (Q3: 미설정 인물에도 불일치 안내) | female character |
| 11 | 미설정 | young_adult | — | — | adult | woman |
| 12 | 인간 | adolescent | 25년 | — | minor + R1 경고 | female character |
| 13 | 임의 | ageless | — | — | unknown | female character |
| 14 | 임의 | — | — | 17–19년 | ambiguous | female character |
| 15 | 엘프 | — | 10년 | 30년 | **minor** (실제 연령 신호) | female character |
| 16 | 사용자 정의 존재 | — | — | 30년 | adult | woman |
| 17 | 엘프 | — | 300년 | 12년 (**출력 제외**) | minor | female character |
| 18 | 인간 (피사체=풍경 → **비활성**) | — | 15년 | — | minor (안전 검사에 포함) | (출력 없음) |

지정 사례 대응: N3 7사례 → #10, #10a, #10b·#10c, #15, #3, #4, #5. Q2 5사례 → #10d, #10f, #10g, #10h, #10i. 모두 지정 결과와 일치합니다.

### 5.4 안전 정책 적용 (baseline 0.2.0)

- minor → `age.minor` 태그, ambiguous → `age.ambiguous_young` 태그를 안전 검사 입력에 추가(출처 속성 기록). adult/unknown은 태그 없음. 기존 단어 목록 검사는 그대로 유지.
- 출력되지 않는 값도 검사: 제외·비활성 선택값을 출력과 같은 방식으로 문장화하여 단어 검사에 넣고, 선택지 `policyTags`도 포함. 사용자 정의 `label`과 `expression`은 **둘 다** 검사(출력되는 쪽만이 아님).
- 차단 진단에 원인 속성과 상태를 표시: 예 “외형적 연령 (프롬프트 제외) · 이미지 설명”. 진단 `params`에 `hiddenSources: "person.identity.apparent_age:excluded"` 형태로 기록.
- 차단 규칙 자체는 변경 없음: 미성년·모호 신호 + 성적 표현/나체 → 차단. 비성적 미성년자 묘사는 허용.
- 기존 스펙 영향: 비활성 값이 검사에 들어가므로, “비활성 상태의 미성년·성적 표현 조합”이 저장된 극히 예외적인 스펙만 새로 차단될 수 있습니다(완화 아님, 강화). 회귀 fixture에는 해당 사례가 없음을 테스트로 확인합니다.
- 한계 문서화: 단어 기반 로컬 검사의 한계(ADR-019)는 그대로, 구조화 연령 판단은 사용자가 입력한 값만 근거로 하며 이미지 내용은 판단하지 못함을 추가 기록.

### 5.5 조건별 표현 일람

| 속성/선택지 | adult | minor / ambiguous / unknown |
|---|---|---|
| gender `woman` | woman | female character |
| gender `man` | man | male character |
| 그 외 모든 선택지 | 고정 표현 | 고정 표현 |

---

## 6. 국적 목록 구성 방안

1. **기준 집합**: ISO 3166-1 alpha-2 코드 기반. 유엔 회원국 193개 + 유엔 옵서버 국가 2개(바티칸 `va`, 팔레스타인 `ps`) = 195개를 기본으로 합니다.
2. **특수 지역 (N2 승인 — 포함)**: 대만 `tw`, 홍콩 `hk`, 마카오 `mo`, 코소보 `xk`(ISO 공식 코드 아님, 사용자 할당 코드). 목록 전체를 “국가 또는 지역”으로 다루며, 어떤 항목의 법적·정치적 지위도 데이터나 문구로 단정하지 않습니다(분류 필드를 두지 않음, 모든 항목 동일 취급).
3. **제외**: 무인도·해외 영토(남극 `aq`, 부베섬 `bv` 등)와 국적 개념이 따로 없는 속령. 필요 시 사용자 정의 또는 문화적 배경으로 입력.
4. **ID**: 소문자 alpha-2 (`kr`). 표시명이 바뀌어도 ID는 불변. 국가 변경(분리·명칭 변경)은 카탈로그 마이그레이션(renameOption)으로 처리.
5. **표시명**: 한국어·영어 모두 CLDR 48(Node 22 ICU 78.2 내장)에서 생성한 값을 **정적 데이터로 커밋**(실행 환경의 ICU 버전에 따라 바뀌지 않도록). 생성 스크립트는 데이터 갱신 시에만 사용.
6. **프롬프트 표현**: 국적 형용사(demonym) — 수동 작성, 이 문서 부록 A에서 검토. 같은 형용사를 쓰는 국가는 괄호로 구분(콩고 2개국, 도미니카 2개국).
7. **별칭**: alpha-2, alpha-3, CLDR 영어명, 한국어 통칭(예: `kr` “한국, 남한, Korea, KOR”), 형용사. 별칭 데이터도 정적 커밋.
8. **정렬**: 카탈로그 순서(= 출력 순서) = 영어 표시명 알파벳순, `stateless`는 마지막. UI 목록은 현재 언어 라벨의 가나다/알파벳순. 별도 “자주 쓰는 국가” 고정 노출은 승인 전까지 하지 않음.
9. **다중 선택**: 복수국적 지원, 개수 제한 없음. 무국적 + 다른 국적 → R2 경고.
10. **독립성**: 국적은 민족·문화·외형·의상과 연결하지 않음(어떤 규칙·covers·suggestedWhen도 두지 않음).
11. **성능**: 약 200개 항목, 선형 검색으로 충분(가상 스크롤 불필요).
12. **표시 명칭 ≠ 프롬프트 표현**: 표시 명칭은 지명(CLDR), 표현은 형용사(수동 작성)로 항상 분리합니다. 문장 틀은 §4.1 권장안 A `Nationality (country or region): {value}.`

### 6.1 데이터 출처와 버전 (N2)

카탈로그 데이터에 아래 출처 메타데이터를 함께 커밋하고, 데이터 갱신 시 버전을 올립니다.

| 데이터 | 출처 | 버전 | 비고 |
|---|---|---|---|
| 코드 목록 | ISO 3166-1 alpha-2 (유엔 회원국·옵서버 기준으로 선별) + `xk`(사용자 할당 코드) | 선별 목록 `identity-regions@0.1.0` | 유엔 회원국 193개는 생성 스크립트에서 개수 검증 |
| 한국어·영어 표시명 | Unicode CLDR | CLDR 48 (Node 22.23.1 내장 ICU 78.2) | 생성 후 정적 데이터로 커밋. A.4의 대안 표기를 채택하면 해당 항목은 “CLDR 기반 수정”으로 표시 |
| 프롬프트 표현(형용사) | Prompter 수동 작성 — 외부 데이터셋을 사용하지 않음 | `identity-demonyms@0.1.0` | 제품 검수 필요(N4). 동일 형용사는 괄호로 구분 |
| 검색 별칭 | CLDR 표시명 + ISO 3166-1 alpha-3 + Prompter 수동 작성 통칭 | `identity-region-aliases@0.1.0` | 별칭은 검색 전용, 출력에 쓰지 않음 |

출처 메타데이터는 카탈로그 파일 상단 주석과 `docs/catalogs/person/identity.md` 부록에 같은 내용으로 기록합니다.

---

## 7. 프롬프트 컴파일 예시

전제: 피사체 = 인물(“Main subject: a single person.”). 순서는 §9의 순서 키 결정(D-new-1)이 승인된 경우입니다.

**예 1 — 인간 + 28세 + 여성 + 한국 + 건축가**
- 선택: entity_type=human, age=28 years, gender=woman, nationality=[kr], occupation=[architect]
- 출력: `Main subject: a single person. Type of being: human. Actual age: 28 years old. Gender: woman. Nationality (country or region): South Korean. Occupation: architect.`
- 1b. entity_type 미설정: `Main subject: a single person. Actual age: 28 years old. Gender: woman. Nationality (country or region): South Korean. Occupation: architect.` (N3: 인간 기준 적용 → adult. ImageSpec에는 entity_type이 여전히 미설정)
- 1d. entity_type=android, 나머지 동일: `… Type of being: android. Actual age: 28 years old. Gender: female character. …` (§5.3 #10b)
- 1c. occupation 출력 제외: 마지막 문장만 사라지고, 필드는 “선택됨 · 프롬프트 제외”.

**예 2 — 판타지 인간형 + 엘프 + 300세 + 외형 30세**
- 출력: `Main subject: a single person. Species: elf. Actual age: 300 years old. Apparent age: approximately 30 years old.`
- entity_type 출처: “종족(엘프)이 같은 의미를 포함해 생략” (covers). 귀 모양·체형 등은 출력하지 않음.
- 2b. entity_type=android + species=elf: `Type of being: android. Species: elf. …` + R3 info.

**예 3 — 사용자 정의 종족**
- `{ label: "루미아족", expression: "A humanoid species with translucent crystalline skin and faintly luminous veins" }`
- 출력: `Species: A humanoid species with translucent crystalline skin and faintly luminous veins.` 데이터에는 “루미아족” 보존, UI는 이름 표시.
- 3b. 이름만: `Species: 루미아족.` + R4 info + `prompt.mixed_language` warning. 특징을 지어내지 않음.

**예 4 — 복수국적 + 무국적**
- nationality = [kr, jp, stateless] → `Nationality (country or region): Japanese, South Korean, stateless.` + R2 warning.
- nationality = [tw] → `Nationality (country or region): Taiwanese.` / [hk] → `Nationality (country or region): Hong Kong.`

**예 5 — 직업: 등록 + 사용자 정의 혼합**
- occupation = [architect] + custom `{ label: "비행선 항해사", expression: "airship navigator" }` → `Occupation: architect, airship navigator.`

**예 6 — 범위 연령 (모호)**
- 인간 + age 16–20 years + gender woman → `Type of being: human. Actual age: 16–20 years old. Gender: female character.` (차단 없음 — 성적 표현이 없으므로)

**예 7 — 출력 제외 값의 안전 검사**
- 엘프 + apparent_age 12 years(**출력 제외**) + 이미지 설명 “sexy pose” → **출력 차단**. 진단: `safety.minor-sexualization` — 원인 “외형적 연령 (프롬프트 제외)”, “이미지 설명”.

**예 8 — 시대·서사 역할·지위·설명**
- historical_period=joseon, narrative_role=[protagonist, mentor], social_status=nobility, description “몰락한 양반 가문의 장녀” →
  `Character's historical era: Joseon era (Korea). Narrative role: protagonist, mentor. Social status: nobility. Character description: 몰락한 양반 가문의 장녀.` + 설명에 대한 언어 혼용 안내.

**예 9 — 기존 스펙 회귀**
- Identity 미설정 스펙(Sprint 0·1·2-A fixture)의 출력은 0.3.0 컴파일러와 글자 단위로 같음.

---

## 8. 기존 설계 문서에서 수정이 필요한 부분 (제품 승인 후 반영 — 지금은 수정하지 않음)

### identity.md
1. §2 표: ID를 §2(이 문서)의 snake_case로, `origin` → `character_origin`.
2. §2 표: nationality “multi, searchable + custom”, historical_period “single, searchable + custom”, social_status “single, searchable + custom”, age_group “single (dropdown)”.
3. §2 하단 “Numeric-or-range and custom option storage are implementation review items” → 확정 내용(`quantity`, CustomEntry)으로 교체.
4. §3~§10 표의 `custom` 행: “선택지가 아닌 사용자 정의 입력(CustomEntry)” 주석.
5. §4 dwarf/giant 표현, §6.1 `adult` 라벨 “일반 성인 (30–44세)”·`ageless` 표현, §7 gender_presentation 표현, §8 ethnic/cultural 표현, §9 renaissance/joseon/edo 표현, §10 social_status 표현, §5 original 표현 — §3 “원안 대비”대로.
6. §6.3 예시 “has the appearance of an adult aged 30–35” → “Apparent age: approximately 30–35 years old.”
7. §6.4·§7: 연령 판단 결정표(§5)와 성별 조건별 표현 반영.
8. §8 nationality: 소문자 ID, 다중 선택 확정, 구성 방안(§6) 링크, “Multiple nationality support is a review item” 삭제.
9. §10 narrativeRole: `antagonist` 라벨 “대립자”. occupation “Group”은 표시 전용 묶음이라고 명시.
10. §12 예시: 속성별 문장 형식(§7)으로 교체하고 “최종 문장 합성은 별도 승인” 명시.
11. §13 규칙 표: R1~R5와 §4.3 관계 구분 반영.
12. §16 미결 사항: 1~7 모두 결정됨으로 갱신. 상태 DRAFT → APPROVED(제품 승인 시).

### CATALOG_DESIGN_STANDARD.md
1. §4 마지막 문단: 출력 포함 기본값(포함)과 표현 방식(`excludedFromPrompt: true`, 선택 항목 내부 필드) 확정.
2. §5: 역할·의미 종류의 데이터 필드명(`expression.role`, `expression.kind`).
3. §6: CustomEntry 형식·길이·중복·출력 규칙 확정.
4. §8: 의미 관계 5분류(§4.3) 추가.
5. §11: 연령 판단 4분류·정규화 규칙 요약 추가.
6. §14 변경 이력: 0.2.0 항목.

### 기타 (구현 시 T1에서 함께)
- `docs/catalogs/ATTRIBUTE_TEMPLATE.md`: 공통 규격 참조, 역할·종류·출력 토글·사용자 정의 항목 추가.
- `docs/catalogs/README.md`: 공통 규격 링크, Identity 상태.
- `docs/DECISIONS.md` ADR-038~ (ImageSpec 0.3.0, 형식 0.4.0, 출력 제외, 사용자 정의 값, quantity, 연령 판단(N3), 안전 0.2.0, 카테고리 초기화(N5), 순서 번호 ×10(N1), 국가·지역 목록과 데이터 출처(N2)), `docs/ROADMAP.md`(2-B.1), `docs/TECH_DEBT.md`(TD-03 → “설계 완료, 자산 제작 별도”, **TD-08 신설**: 카테고리 순서와 카테고리 내부 속성 순서 분리 — 처리 시점은 다음 카탈로그 확장 설계 시 검토).

### N2·N3·N5로 인한 identity.md 추가 수정 (위 목록에 더해)
13. §2·§8: nationality 표시 명칭 “국적 및 국가·지역 / Nationality / Country or Region”, 국가·지역 지위 비단정 원칙, 데이터 출처·버전.
14. §6.4: 존재 분류(human / nonhuman / unclassified, N3·Q1·Q2)와 공통 사용(Q3) 반영. §13 규칙 표의 “Actual age/group mismatch”는 분류 human일 때(미설정 포함)로 수정.
15. 공통 규격 §7: 카테고리 초기화 대상은 저장된 선택값 전체(표시·필터·제외·적용 여부 무관)라고 명시(N5).
- `PROMPTER_MASTER_PLAN.md`: 수정하지 않음.

---

## 9. 최종 구현 및 테스트 계획

### 9.1 사양 검토 결정 (N1–N5) 및 남은 확인 사항

| # | 결정 | 반영 |
|---|---|---|
| N1 | **승인**: 기존 order ×10(상대 순서 불변), Identity 201–216. 기존 출력 불변을 회귀 테스트로 증명 | T4. 기술 부채 TD-08 “카테고리 순서와 카테고리 내부 속성 순서 분리(현재는 단일 `order`가 UI·컴파일 순서를 겸함)” 등록 |
| N2 | **승인**: tw·hk·mo·xk 포함, UI 명칭 변경, 지위 단정 금지, 출처·버전 기록 | §2, §3.9, §4.1, §6, §6.1, 부록 A |
| N3 | **수정 승인**: 미설정 인물은 인간 기준, 비인간 확인 시 실제 연령만으로 성인 판단 안 함 | §5.1–§5.3 (Q1–Q3 결정으로 확정) |
| N4 | **보류**: 최종 컴파일 결과 기준 재검토 | 부록 B(선택지별 결합 문장 전체), 부록 C(원안 대비 변경 32건 전체), §7 |
| N5 | **수정 승인**: 저장된 선택값 전체가 대상 | §9.2 |
| Q1 | 사용자 정의 존재·종족은 무조건 비인간이 아니라 **분류 불명**. 실제 연령만으로 성인 확정 안 함 | §5.1 분류표, §5.3 #10e·#10i |
| Q2 | 인간 사이보그(사이보그 + 인간 종족) = 인간 기준, 안드로이드 = 실제 연령만으로 확정 안 함, 모호하면 보수적 | §5.1 분류표, §5.3 #10d·#10f–#10j |
| Q3 | 미설정 인물에도 연령–연령대 불일치 안내. 안전 판단과 불일치 검증이 같은 분류 함수 사용 | §4.4 R1, §5.1, §5.3 #10l |
| 국적 문장 틀 | 권장안 A 승인. 표시 명칭과 표현 독립 관리, 혼동 명칭 명확히 구분 | §4.1, §6, 부록 A(콩고·니제르 수정, A.4) |

남은 확인 사항: 부록 A.4 표시명(콩고 외), 부록 A·B·C의 어휘·표현 전체(N4 — 원문 검토 후 최종 승인).

### 9.2 카테고리 초기화와 복원 (승인 사항의 정의)

- **대상 (N5)**: 카탈로그에서 `categoryId`가 해당 카테고리 또는 그 하위 카테고리인 **모든 속성의 저장된 선택값**. 다음과 무관합니다: 검색어·필터·화면 표시 상태, 프롬프트 제외 여부, 현재 적용 가능 여부, 현재 모드 노출 여부(가져오기로 들어온 draft 속성 값 포함). 카탈로그에 없는 속성 ID(가져오기 복구 대상)는 카테고리가 없으므로 대상이 아닙니다.
- **대상 안내**: 확인 창에 “인물 기본 정보에서 저장된 5개 값을 초기화합니다: 종족, 실제 연령(프롬프트 제외), 직업(현재 적용 안 됨), …”처럼 이름·개수·상태 표시. 저장된 값이 없으면 버튼 비활성.
- **동작**: 대상 속성만 해제. 지운 선택 항목 객체만 기록 `lastCategoryReset { categoryId, removed: { attrId: AttributeSelection } }` (전체 스펙 스냅샷이 아님).
- **복원**: `removed`의 각 속성을 **현재 미설정일 때만** 원래 객체(출력 제외 상태 포함)로 되돌림. 초기화 후 사용자가 다시 설정한 속성은 건드리지 않고 “N개는 이후 편집되어 복원하지 않았습니다”로 안내. 다른 카테고리는 대상이 아니므로 변경될 수 없음.
- **수명**: 세션 한정, 1단계. 다음 카테고리 초기화·전체 초기화·가져오기·스펙 교체 시 폐기.
- **전체 초기화와의 관계**: 전체 초기화는 기존 그대로(전체 스냅샷 + 복원). 전체 초기화 시 `lastCategoryReset`은 폐기. 전체 복원은 전체 초기화 직전 상태로만 되돌림.
- **프리셋 되돌리기와의 관계**: 카테고리 초기화로 지워진 속성 중 프리셋이 쓴 것은 프리셋 거래에 `userEdited`로 표시 → 이후 프리셋 되돌리기가 이 속성을 다시 쓰지 않음. 카테고리 복원은 이 표시를 풀지 않음(보수적).
- **잠금**: Sprint 3. 이번에는 구현하지 않음.

### 9.3 완료 기준 (행동 기준)

1. Identity를 설정하지 않은 기존 작업 공간(0.1.0, 0.2.0, 2-A 프리셋 출처 포함)이 경고 없이 열리고 프롬프트가 2-A와 **글자 단위로 같다**.
2. 직업을 출력 제외하면 그 문장만 사라지고 선택은 유지된다. 값을 바꿔도 제외 상태가 유지되고, 해제하면 제외 상태도 사라진다. 새로고침·JSON 왕복 후 동일.
3. **(그럴듯하지만 틀린 구현 구별)** 외형 연령 12세를 출력 제외한 상태에서 성적 표현을 추가하면 **차단**되고, 진단에 “외형적 연령 (프롬프트 제외)”가 표시된다. 출력 문장만 검사하는 구현은 실패한다.
4. §5.3 사례표 전체가 표대로 판단되고(N3 지정 7개 사례 포함), 360개월은 30년과 같은 결과다. 존재 유형 미설정 인물이 인간 기준으로 판단되어도 ImageSpec에 `entity_type`이 생기지 않는다. gender 원본 값은 어떤 경우에도 바뀌지 않는다.
5. 사용자 정의 값: 이름과 표현을 각각 수정할 수 있고, 등록 선택지와 이름이 같아도 병합·대체되지 않으며, 다중 선택에서 등록 값과 섞여 왕복 후에도 변하지 않는다.
6. 카테고리 초기화: 검색어로 목록을 좁힌 상태에서도 프롬프트 제외·적용 불가 값을 포함한 Identity 저장값 전체가 대상·개수와 함께 안내된 뒤 지워지고, 복원 시 초기화 이후 다시 설정한 속성과 다른 카테고리는 그대로다.

### 9.4 태스크와 테스트

| # | 태스크 | 테스트 |
|---|---|---|
| T1 | 문서 이동·교체(D1), 템플릿·README·ADR·ROADMAP·TECH_DEBT (§8 “기타”) | 문서 리뷰 |
| T2 | ImageSpec 0.3.0 + 마이그레이션, `applySelection` 제외 보존 | unit: 왕복, 0.1.0/0.2.0 fixture, 보존·해제 |
| T3 | 카탈로그 형식 0.4.0 + 레지스트리 무결성(units·interval·covers·variants·optionGroups·custom·역할) | unit: 잘못된 정의 거부 |
| T4 | 기존 order ×10, Identity 201–216 (N1) | unit: 기존 속성 상대 순서 동일, Sprint 0·1·2-A fixture 출력 글자 단위 동일 |
| T5 | `assessAge` + 안전 0.2.0(구조 태그, 비출력 값 검사, 진단 출처) | unit: §5.3 사례 전체(N3 7사례 포함), 예 7 |
| T6 | 컴파일러 0.4.0: 제외·Metadata·사용자 정의·quantity·covers·variants | unit: §7 예 1~9 (예시를 golden으로) |
| T7 | 검증기: CustomEntry, 단위, R1~R5, `selectedCount`·`derived` 조건 | unit |
| T8 | Identity 카탈로그 데이터 + 국적 정적 데이터(부록 A) | unit: 무결성, 별칭 검색(엘프/elf, 개발자/developer/software developer, 외형적 연령/apparent age) |
| T9 | 상태: 출력 토글, 카테고리 초기화·복원, 프리셋 관계 | unit + component |
| T10 | UI: 토글·사용자 정의 입력·계층 검색·quantity 입력·조건별 표현 이유·초기화 확인 창·모바일 | component + e2e (데스크톱·모바일) |
| T11 | E2E: 편집→새로고침, 제외+내보내기/가져오기, 예 7 차단, 카테고리 초기화·복원, 운영 빌드 격리 | `pnpm verify` |
| T12 | 2-B.1 보고서(증거: 테스트 이름, 명령 출력, 스크린샷 경로) | — |

영향 범위: spec, catalog(schema·registry·conditions·applicability), compiler, safety, validation, presets(값 비교), state, controls, AttributeField, DetailedEditor. 선택값이 “선택지 ID”라고 가정하는 기존 코드(형식 표시, 조건, 적용 가능성, 프리셋 계획 등)를 모두 사용자 정의 값에 대응시켜야 합니다.

---

## 부록 A. 국적 및 국가·지역 선택지 (제안)

- 표시명: CLDR 48(Node 22.23.1 / ICU 78.2) 자동 생성. 프롬프트 표현: 수동 작성(검토 대상). 출처·버전은 §6.1.
- 결합 문장: `Nationality (country or region): {프롬프트 표현}.` (§4.1 권장안 A, 부록 B.14)
- 이 표와 별도로 `stateless`(무국적 / Stateless / stateless)와 사용자 정의 입력이 있습니다.

### A.1 유엔 회원국 (193)

| ID | 한국어 표시명 (CLDR 48) | 영어 표시명 (CLDR 48) | 프롬프트 표현 |
|---|---|---|---|
| `af` | 아프가니스탄 | Afghanistan | Afghan |
| `al` | 알바니아 | Albania | Albanian |
| `dz` | 알제리 | Algeria | Algerian |
| `ad` | 안도라 | Andorra | Andorran |
| `ao` | 앙골라 | Angola | Angolan |
| `ag` | 앤티가 바부다 | Antigua & Barbuda | Antiguan and Barbudan |
| `ar` | 아르헨티나 | Argentina | Argentine |
| `am` | 아르메니아 | Armenia | Armenian |
| `au` | 오스트레일리아 | Australia | Australian |
| `at` | 오스트리아 | Austria | Austrian |
| `az` | 아제르바이잔 | Azerbaijan | Azerbaijani |
| `bs` | 바하마 | Bahamas | Bahamian |
| `bh` | 바레인 | Bahrain | Bahraini |
| `bd` | 방글라데시 | Bangladesh | Bangladeshi |
| `bb` | 바베이도스 | Barbados | Barbadian |
| `by` | 벨라루스 | Belarus | Belarusian |
| `be` | 벨기에 | Belgium | Belgian |
| `bz` | 벨리즈 | Belize | Belizean |
| `bj` | 베냉 | Benin | Beninese |
| `bt` | 부탄 | Bhutan | Bhutanese |
| `bo` | 볼리비아 | Bolivia | Bolivian |
| `ba` | 보스니아 헤르체고비나 | Bosnia & Herzegovina | Bosnian and Herzegovinian |
| `bw` | 보츠와나 | Botswana | Botswanan |
| `br` | 브라질 | Brazil | Brazilian |
| `bn` | 브루나이 | Brunei | Bruneian |
| `bg` | 불가리아 | Bulgaria | Bulgarian |
| `bf` | 부르키나파소 | Burkina Faso | Burkinabè |
| `bi` | 부룬디 | Burundi | Burundian |
| `kh` | 캄보디아 | Cambodia | Cambodian |
| `cm` | 카메룬 | Cameroon | Cameroonian |
| `ca` | 캐나다 | Canada | Canadian |
| `cv` | 카보베르데 | Cape Verde | Cabo Verdean |
| `cf` | 중앙 아프리카 공화국 | Central African Republic | Central African |
| `td` | 차드 | Chad | Chadian |
| `cl` | 칠레 | Chile | Chilean |
| `cn` | 중국 | China | Chinese |
| `co` | 콜롬비아 | Colombia | Colombian |
| `km` | 코모로 | Comoros | Comorian |
| `cg` | 콩고 공화국 † | Republic of the Congo † | Congolese (Republic of the Congo) |
| `cd` | 콩고 민주 공화국 † | Democratic Republic of the Congo † | Congolese (Democratic Republic of the Congo) |
| `cr` | 코스타리카 | Costa Rica | Costa Rican |
| `ci` | 코트디부아르 | Côte d’Ivoire | Ivorian |
| `hr` | 크로아티아 | Croatia | Croatian |
| `cu` | 쿠바 | Cuba | Cuban |
| `cy` | 키프로스 | Cyprus | Cypriot |
| `cz` | 체코 | Czechia | Czech |
| `dk` | 덴마크 | Denmark | Danish |
| `dj` | 지부티 | Djibouti | Djiboutian |
| `dm` | 도미니카 | Dominica | Dominican (Dominica) |
| `do` | 도미니카 공화국 | Dominican Republic | Dominican (Dominican Republic) |
| `ec` | 에콰도르 | Ecuador | Ecuadorian |
| `eg` | 이집트 | Egypt | Egyptian |
| `sv` | 엘살바도르 | El Salvador | Salvadoran |
| `gq` | 적도 기니 | Equatorial Guinea | Equatorial Guinean |
| `er` | 에리트리아 | Eritrea | Eritrean |
| `ee` | 에스토니아 | Estonia | Estonian |
| `sz` | 에스와티니 | Eswatini | Swazi |
| `et` | 에티오피아 | Ethiopia | Ethiopian |
| `fj` | 피지 | Fiji | Fijian |
| `fi` | 핀란드 | Finland | Finnish |
| `fr` | 프랑스 | France | French |
| `ga` | 가봉 | Gabon | Gabonese |
| `gm` | 감비아 | Gambia | Gambian |
| `ge` | 조지아 | Georgia | Georgian |
| `de` | 독일 | Germany | German |
| `gh` | 가나 | Ghana | Ghanaian |
| `gr` | 그리스 | Greece | Greek |
| `gd` | 그레나다 | Grenada | Grenadian |
| `gt` | 과테말라 | Guatemala | Guatemalan |
| `gn` | 기니 | Guinea | Guinean |
| `gw` | 기니비사우 | Guinea-Bissau | Bissau-Guinean |
| `gy` | 가이아나 | Guyana | Guyanese |
| `ht` | 아이티 | Haiti | Haitian |
| `hn` | 온두라스 | Honduras | Honduran |
| `hu` | 헝가리 | Hungary | Hungarian |
| `is` | 아이슬란드 | Iceland | Icelandic |
| `in` | 인도 | India | Indian |
| `id` | 인도네시아 | Indonesia | Indonesian |
| `ir` | 이란 | Iran | Iranian |
| `iq` | 이라크 | Iraq | Iraqi |
| `ie` | 아일랜드 | Ireland | Irish |
| `il` | 이스라엘 | Israel | Israeli |
| `it` | 이탈리아 | Italy | Italian |
| `jm` | 자메이카 | Jamaica | Jamaican |
| `jp` | 일본 | Japan | Japanese |
| `jo` | 요르단 | Jordan | Jordanian |
| `kz` | 카자흐스탄 | Kazakhstan | Kazakhstani |
| `ke` | 케냐 | Kenya | Kenyan |
| `ki` | 키리바시 | Kiribati | I-Kiribati |
| `kw` | 쿠웨이트 | Kuwait | Kuwaiti |
| `kg` | 키르기스스탄 | Kyrgyzstan | Kyrgyzstani |
| `la` | 라오스 | Laos | Lao |
| `lv` | 라트비아 | Latvia | Latvian |
| `lb` | 레바논 | Lebanon | Lebanese |
| `ls` | 레소토 | Lesotho | Basotho |
| `lr` | 라이베리아 | Liberia | Liberian |
| `ly` | 리비아 | Libya | Libyan |
| `li` | 리히텐슈타인 | Liechtenstein | Liechtensteiner |
| `lt` | 리투아니아 | Lithuania | Lithuanian |
| `lu` | 룩셈부르크 | Luxembourg | Luxembourgish |
| `mg` | 마다가스카르 | Madagascar | Malagasy |
| `mw` | 말라위 | Malawi | Malawian |
| `my` | 말레이시아 | Malaysia | Malaysian |
| `mv` | 몰디브 | Maldives | Maldivian |
| `ml` | 말리 | Mali | Malian |
| `mt` | 몰타 | Malta | Maltese |
| `mh` | 마셜 제도 | Marshall Islands | Marshallese |
| `mr` | 모리타니 | Mauritania | Mauritanian |
| `mu` | 모리셔스 | Mauritius | Mauritian |
| `mx` | 멕시코 | Mexico | Mexican |
| `fm` | 미크로네시아 | Micronesia | Micronesian |
| `md` | 몰도바 | Moldova | Moldovan |
| `mc` | 모나코 | Monaco | Monégasque |
| `mn` | 몽골 | Mongolia | Mongolian |
| `me` | 몬테네그로 | Montenegro | Montenegrin |
| `ma` | 모로코 | Morocco | Moroccan |
| `mz` | 모잠비크 | Mozambique | Mozambican |
| `mm` | 미얀마 | Myanmar (Burma) | Myanmar |
| `na` | 나미비아 | Namibia | Namibian |
| `nr` | 나우루 | Nauru | Nauruan |
| `np` | 네팔 | Nepal | Nepali |
| `nl` | 네덜란드 | Netherlands | Dutch |
| `nz` | 뉴질랜드 | New Zealand | New Zealand |
| `ni` | 니카라과 | Nicaragua | Nicaraguan |
| `ne` | 니제르 | Niger | Nigerien (Niger) ‡ |
| `ng` | 나이지리아 | Nigeria | Nigerian |
| `kp` | 북한 | North Korea | North Korean |
| `mk` | 북마케도니아 | North Macedonia | North Macedonian |
| `no` | 노르웨이 | Norway | Norwegian |
| `om` | 오만 | Oman | Omani |
| `pk` | 파키스탄 | Pakistan | Pakistani |
| `pw` | 팔라우 | Palau | Palauan |
| `pa` | 파나마 | Panama | Panamanian |
| `pg` | 파푸아뉴기니 | Papua New Guinea | Papua New Guinean |
| `py` | 파라과이 | Paraguay | Paraguayan |
| `pe` | 페루 | Peru | Peruvian |
| `ph` | 필리핀 | Philippines | Filipino |
| `pl` | 폴란드 | Poland | Polish |
| `pt` | 포르투갈 | Portugal | Portuguese |
| `qa` | 카타르 | Qatar | Qatari |
| `ro` | 루마니아 | Romania | Romanian |
| `ru` | 러시아 | Russia | Russian |
| `rw` | 르완다 | Rwanda | Rwandan |
| `ws` | 사모아 | Samoa | Samoan |
| `sm` | 산마리노 | San Marino | Sammarinese |
| `st` | 상투메 프린시페 | São Tomé & Príncipe | São Toméan |
| `sa` | 사우디아라비아 | Saudi Arabia | Saudi |
| `sn` | 세네갈 | Senegal | Senegalese |
| `rs` | 세르비아 | Serbia | Serbian |
| `sc` | 세이셸 | Seychelles | Seychellois |
| `sl` | 시에라리온 | Sierra Leone | Sierra Leonean |
| `sg` | 싱가포르 | Singapore | Singaporean |
| `sk` | 슬로바키아 | Slovakia | Slovak |
| `si` | 슬로베니아 | Slovenia | Slovenian |
| `sb` | 솔로몬 제도 | Solomon Islands | Solomon Islander |
| `so` | 소말리아 | Somalia | Somali |
| `za` | 남아프리카 | South Africa | South African |
| `kr` | 대한민국 | South Korea | South Korean |
| `ss` | 남수단 | South Sudan | South Sudanese |
| `es` | 스페인 | Spain | Spanish |
| `lk` | 스리랑카 | Sri Lanka | Sri Lankan |
| `kn` | 세인트키츠 네비스 | St. Kitts & Nevis | Kittitian and Nevisian |
| `lc` | 세인트루시아 | St. Lucia | Saint Lucian |
| `vc` | 세인트빈센트그레나딘 | St. Vincent & Grenadines | Vincentian |
| `sd` | 수단 | Sudan | Sudanese |
| `sr` | 수리남 | Suriname | Surinamese |
| `se` | 스웨덴 | Sweden | Swedish |
| `ch` | 스위스 | Switzerland | Swiss |
| `sy` | 시리아 | Syria | Syrian |
| `tj` | 타지키스탄 | Tajikistan | Tajikistani |
| `tz` | 탄자니아 | Tanzania | Tanzanian |
| `th` | 태국 | Thailand | Thai |
| `tl` | 동티모르 | Timor-Leste | Timorese |
| `tg` | 토고 | Togo | Togolese |
| `to` | 통가 | Tonga | Tongan |
| `tt` | 트리니다드 토바고 | Trinidad & Tobago | Trinidadian and Tobagonian |
| `tn` | 튀니지 | Tunisia | Tunisian |
| `tr` | 튀르키예 | Türkiye | Turkish |
| `tm` | 투르크메니스탄 | Turkmenistan | Turkmen |
| `tv` | 투발루 | Tuvalu | Tuvaluan |
| `ug` | 우간다 | Uganda | Ugandan |
| `ua` | 우크라이나 | Ukraine | Ukrainian |
| `ae` | 아랍에미리트 | United Arab Emirates | Emirati |
| `gb` | 영국 | United Kingdom | British |
| `us` | 미국 | United States | American |
| `uy` | 우루과이 | Uruguay | Uruguayan |
| `uz` | 우즈베키스탄 | Uzbekistan | Uzbekistani |
| `vu` | 바누아투 | Vanuatu | Ni-Vanuatu |
| `ve` | 베네수엘라 | Venezuela | Venezuelan |
| `vn` | 베트남 | Vietnam | Vietnamese |
| `ye` | 예멘 | Yemen | Yemeni |
| `zm` | 잠비아 | Zambia | Zambian |
| `zw` | 짐바브웨 | Zimbabwe | Zimbabwean |

### A.2 유엔 옵서버 국가 (2)

| ID | 한국어 표시명 (CLDR 48) | 영어 표시명 (CLDR 48) | 프롬프트 표현 |
|---|---|---|---|
| `ps` | 팔레스타인 지구 | Palestinian Territories | Palestinian |
| `va` | 바티칸 시국 | Vatican City | Vatican |

### A.3 특수 지역 (제품 결정 필요) (4)

| ID | 한국어 표시명 (CLDR 48) | 영어 표시명 (CLDR 48) | 프롬프트 표현 |
|---|---|---|---|
| `hk` | 홍콩(중국 특별행정구) | Hong Kong SAR China | Hong Kong |
| `xk` | 코소보 | Kosovo | Kosovar |
| `mo` | 마카오(중국 특별행정구) | Macao SAR China | Macanese |
| `tw` | 대만 | Taiwan | Taiwanese |

### A.4 검토 시 확인할 표시명

혼동 명칭 구분 원칙: 표시 명칭과 프롬프트 표현을 각각 검토하여, 이름이 비슷한 국가·지역은 둘 다에서 구분되게 합니다.

- † 반영 완료: `cg`·`cd` 표시명을 CLDR 축약 표기(“Congo - Brazzaville / Kinshasa”) 대신 정식 국명으로 변경(데이터 출처 표기: “CLDR 48 기반 수정”). 표현도 괄호로 구분.
- ‡ 반영 완료: `ne` 표현 “Nigerien”은 `ng` “Nigerian”과 철자가 한 글자 차이라 “Nigerien (Niger)”로 명확화.
- 그 외 표시명과 표현이 이미 구분되는 쌍: `dm`/`do`(Dominica / Dominican Republic, 표현에 괄호), `kp`/`kr`, `sd`/`ss`, `gn`/`gw`/`gq`/`pg`, `at`/`au`.

아래는 제품 확인이 남은 표시명입니다(ID와 프롬프트 표현에는 영향 없음).

| ID | CLDR 표시명 | 대안 |
|---|---|---|
| `ps` | Palestinian Territories, 팔레스타인 지구 | Palestine, 팔레스타인 |
| `hk` / `mo` | Hong Kong SAR China / Macao SAR China | 현행 유지 또는 Hong Kong / Macao |
| `ag`, `ba`, `kn`, `tt` 등 | “&” 표기 (Antigua & Barbuda) | “and”로 통일 |

## 부록 B. 선택지별 최종 컴파일 결과 (generic-en)

문장 틀(§4.1)과 결합된 실제 출력 문장입니다. 각 행은 해당 속성만 설정했을 때 그 속성이 만드는 문장입니다. 사용자 정의 값은 `expression`(없으면 `label`) 원문이 `{value}` 자리에 들어갑니다.

### B.1 entity_type — 존재 유형

문장 틀: `Type of being: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| human | `Type of being: human.` |
| fantasy_humanoid | `Type of being: fantasy humanoid.` |
| alien_humanoid | `Type of being: alien humanoid.` |
| android | `Type of being: android.` |
| cyborg | `Type of being: cyborg.` |
| humanoid_robot | `Type of being: humanoid robot.` |
| anthropomorphic | `Type of being: anthropomorphic character.` |
| supernatural | `Type of being: supernatural being.` |
| mythological | `Type of being: mythological being.` |
| artificial_life | `Type of being: artificial life form.` |

### B.2 species — 종족

문장 틀: `Species: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| human | `Species: human.` |
| elf | `Species: elf.` |
| dwarf | `Species: fantasy dwarf.` |
| orc | `Species: orc.` |
| goblin | `Species: goblin.` |
| giant | `Species: fantasy giant.` |
| dragon_humanoid | `Species: dragon humanoid.` |
| beastfolk | `Species: beastfolk.` |
| catfolk | `Species: feline beastfolk.` |
| foxfolk | `Species: fox beastfolk.` |
| wolffolk | `Species: wolf beastfolk.` |
| fairy | `Species: fairy.` |
| elemental | `Species: elemental being.` |
| angel | `Species: angel.` |
| demon | `Species: demon.` |
| vampire | `Species: vampire.` |
| undead | `Species: undead being.` |
| hybrid | `Species: hybrid species.` |

### B.3 character_origin — 인물의 실재 여부

문장 틀: `Character origin: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| fictional | `Character origin: fictional character.` |
| real | `Character origin: real person.` |
| historical | `Character origin: historical figure.` |
| mythological | `Character origin: mythological figure.` |
| original | `Character origin: original character.` |

### B.4 age_group — 연령대

문장 틀: `Age group: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| newborn | `Age group: newborn.` |
| infant | `Age group: infant.` |
| toddler | `Age group: toddler.` |
| preschool | `Age group: preschool-aged child.` |
| child | `Age group: child.` |
| adolescent | `Age group: adolescent.` |
| young_adult | `Age group: young adult.` |
| adult | `Age group: adult aged 30–44.` |
| middle_aged | `Age group: middle-aged adult.` |
| older_adult | `Age group: older adult.` |
| advanced_age | `Age group: adult aged 80 or older.` |
| ageless | `Age group: ageless.` |

### B.5 gender — 성별

문장 틀: `Gender: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| woman (adult) | `Gender: woman.` |
| woman (minor/ambiguous/unknown) | `Gender: female character.` |
| man (adult) | `Gender: man.` |
| man (minor/ambiguous/unknown) | `Gender: male character.` |
| nonbinary | `Gender: non-binary person.` |
| genderless | `Gender: genderless character.` |
| genderfluid | `Gender: genderfluid person.` |

### B.6 gender_presentation — 성별 표현

문장 틀: `Gender presentation: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| feminine | `Gender presentation: feminine.` |
| masculine | `Gender presentation: masculine.` |
| androgynous | `Gender presentation: androgynous.` |
| mixed | `Gender presentation: mixed masculine and feminine.` |
| neutral | `Gender presentation: gender-neutral.` |

### B.7 ethnic_background — 민족적 배경

문장 틀: `Ethnic background: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| korean | `Ethnic background: Korean.` |
| japanese | `Ethnic background: Japanese.` |
| han | `Ethnic background: Han Chinese.` |
| tamil | `Ethnic background: Tamil.` |
| yoruba | `Ethnic background: Yoruba.` |
| maori | `Ethnic background: Māori.` |
| arab | `Ethnic background: Arab.` |
| mixed | `Ethnic background: mixed.` |

### B.8 cultural_background — 문화적 배경

문장 틀: `Cultural background: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| korean | `Cultural background: Korean.` |
| japanese | `Cultural background: Japanese.` |
| chinese | `Cultural background: Chinese.` |
| mediterranean | `Cultural background: Mediterranean.` |
| diaspora | `Cultural background: diaspora.` |
| multicultural | `Cultural background: multicultural.` |
| fictional | `Cultural background: fictional culture.` |

### B.9 historical_period — 시대적 배경

문장 틀: `Character's historical era: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| prehistoric | `Character's historical era: prehistoric era.` |
| ancient | `Character's historical era: ancient era.` |
| medieval | `Character's historical era: medieval era.` |
| renaissance | `Character's historical era: Renaissance.` |
| early_modern | `Character's historical era: early modern era.` |
| industrial | `Character's historical era: industrial era.` |
| early_20c | `Character's historical era: early 20th century.` |
| mid_20c | `Character's historical era: mid-20th century.` |
| late_20c | `Character's historical era: late 20th century.` |
| contemporary | `Character's historical era: contemporary era.` |
| future | `Character's historical era: future era.` |
| far_future | `Character's historical era: far future.` |
| joseon | `Character's historical era: Joseon era (Korea).` |
| edo | `Character's historical era: Edo period (Japan).` |
| fictional | `Character's historical era: fictional era.` |

### B.10 occupation — 직업

문장 틀: `Occupation: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| doctor | `Occupation: physician.` |
| nurse | `Occupation: nurse.` |
| pharmacist | `Occupation: pharmacist.` |
| developer | `Occupation: software developer.` |
| engineer | `Occupation: engineer.` |
| researcher | `Occupation: researcher.` |
| architect | `Occupation: architect.` |
| designer | `Occupation: designer.` |
| artist | `Occupation: artist.` |
| teacher | `Occupation: teacher.` |
| professor | `Occupation: professor.` |
| student | `Occupation: student.` |
| merchant | `Occupation: merchant.` |
| executive | `Occupation: business executive.` |
| entrepreneur | `Occupation: entrepreneur.` |
| chef | `Occupation: chef.` |
| mechanic | `Occupation: mechanic.` |
| driver | `Occupation: driver.` |
| farmer | `Occupation: farmer.` |
| fisher | `Occupation: fisher.` |
| sailor | `Occupation: sailor.` |
| soldier | `Occupation: soldier.` |
| police | `Occupation: police officer.` |
| firefighter | `Occupation: firefighter.` |
| writer | `Occupation: writer.` |
| musician | `Occupation: musician.` |
| actor | `Occupation: actor.` |
| mage | `Occupation: mage.` |
| knight | `Occupation: knight.` |
| alchemist | `Occupation: alchemist.` |
| healer | `Occupation: healer.` |
| explorer | `Occupation: explorer.` |
| adventurer | `Occupation: adventurer.` |
| pilot | `Occupation: pilot.` |

### B.11 narrative_role — 서사적 역할

문장 틀: `Narrative role: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| protagonist | `Narrative role: protagonist.` |
| antagonist | `Narrative role: antagonist.` |
| supporting | `Narrative role: supporting character.` |
| rival | `Narrative role: rival.` |
| guardian | `Narrative role: guardian.` |
| mentor | `Narrative role: mentor.` |
| companion | `Narrative role: companion.` |
| civilian | `Narrative role: civilian.` |
| wanderer | `Narrative role: wanderer.` |
| leader | `Narrative role: leader.` |
| observer | `Narrative role: observer.` |

### B.12 social_status — 사회적 지위

문장 틀: `Social status: {value}.`

| 선택지 | 출력 문장 |
|---|---|
| royalty | `Social status: royalty.` |
| nobility | `Social status: nobility.` |
| commoner | `Social status: commoner.` |
| clergy | `Social status: clergy.` |
| executive | `Social status: corporate leadership.` |
| official | `Social status: public official.` |
| independent | `Social status: independent social standing.` |

### B.13 age / apparent_age — 실제 연령 / 외형적 연령

| 입력 | 출력 문장 |
|---|---|
| age = 28 years | `Actual age: 28 years old.` |
| age = 1 year | `Actual age: 1 year old.` |
| age = 8 months | `Actual age: 8 months old.` |
| age = 360 months | `Actual age: 360 months old.` |
| age = 20 days | `Actual age: 20 days old.` |
| age = 300 years | `Actual age: 300 years old.` |
| age = 28–32 years (range) | `Actual age: 28–32 years old.` |
| apparent_age = 30 years | `Apparent age: approximately 30 years old.` |
| apparent_age = 30–35 years (range) | `Apparent age: approximately 30–35 years old.` |

### B.14 nationality — 국적 및 국가·지역 (권장 문장 틀 A)

문장 틀: `Nationality (country or region): {value}.` — 다중 선택은 카탈로그 순서(영어 표시명 알파벳순, stateless 마지막) 뒤에 사용자 정의 항목을 저장 순서로 `, `로 연결합니다. 국가별 표현은 부록 A의 “프롬프트 표현” 열이 `{value}`에 그대로 들어갑니다.

| 선택 | 출력 문장 |
|---|---|
| kr | `Nationality (country or region): South Korean.` |
| tw | `Nationality (country or region): Taiwanese.` |
| hk | `Nationality (country or region): Hong Kong.` |
| cd | `Nationality (country or region): Congolese (Democratic Republic of the Congo).` |
| stateless | `Nationality (country or region): stateless.` |
| kr + jp | `Nationality (country or region): Japanese, South Korean.` |
| kr + jp + stateless | `Nationality (country or region): Japanese, South Korean, stateless.` |
| kr + custom {label:"제주", expression:"Jeju islander"} | `Nationality (country or region): South Korean, Jeju islander.` |
| description = "몰락한 양반 가문의 장녀" | `Character description: 몰락한 양반 가문의 장녀.` (언어 혼용 안내) |

## 부록 C. identity.md 0.1.0 대비 영어 표현 변경 전체 목록

여기에 없는 선택지는 원안 표현과 동일합니다. 변경 이유는 모두 “문장 틀에 이미 있는 말의 반복 제거” 또는 “의미 명확화”입니다(N4 승인 대상).

| 속성 | 선택지 | 원안 표현 | 제안 표현 | 결합 결과 |
|---|---|---|---|---|
| species | dwarf | dwarf (fantasy species) | fantasy dwarf | `Species: fantasy dwarf.` |
| species | giant | giant (fantasy species) | fantasy giant | `Species: fantasy giant.` |
| character_origin | original | original fictional character | original character | `Character origin: original character.` |
| age_group | ageless | ageless being | ageless | `Age group: ageless.` |
| gender_presentation | feminine | feminine presentation | feminine | `Gender presentation: feminine.` |
| gender_presentation | masculine | masculine presentation | masculine | `Gender presentation: masculine.` |
| gender_presentation | androgynous | androgynous presentation | androgynous | `Gender presentation: androgynous.` |
| gender_presentation | mixed | mixed masculine and feminine presentation | mixed masculine and feminine | `Gender presentation: mixed masculine and feminine.` |
| gender_presentation | neutral | gender-neutral presentation | gender-neutral | `Gender presentation: gender-neutral.` |
| ethnic_background | korean | Korean ethnic background | Korean | `Ethnic background: Korean.` |
| ethnic_background | japanese | Japanese ethnic background | Japanese | `Ethnic background: Japanese.` |
| ethnic_background | han | Han Chinese background | Han Chinese | `Ethnic background: Han Chinese.` |
| ethnic_background | tamil | Tamil background | Tamil | `Ethnic background: Tamil.` |
| ethnic_background | yoruba | Yoruba background | Yoruba | `Ethnic background: Yoruba.` |
| ethnic_background | maori | Māori background | Māori | `Ethnic background: Māori.` |
| ethnic_background | arab | Arab background | Arab | `Ethnic background: Arab.` |
| ethnic_background | mixed | mixed ethnic background | mixed | `Ethnic background: mixed.` |
| cultural_background | korean | Korean cultural background | Korean | `Cultural background: Korean.` |
| cultural_background | japanese | Japanese cultural background | Japanese | `Cultural background: Japanese.` |
| cultural_background | chinese | Chinese cultural background | Chinese | `Cultural background: Chinese.` |
| cultural_background | mediterranean | Mediterranean cultural background | Mediterranean | `Cultural background: Mediterranean.` |
| cultural_background | diaspora | diaspora cultural background | diaspora | `Cultural background: diaspora.` |
| cultural_background | multicultural | multicultural background | multicultural | `Cultural background: multicultural.` |
| cultural_background | fictional | fictional cultural background | fictional culture | `Cultural background: fictional culture.` |
| historical_period | renaissance | Renaissance-era context | Renaissance | `Character's historical era: Renaissance.` |
| historical_period | joseon | Joseon-era context | Joseon era (Korea) | `Character's historical era: Joseon era (Korea).` |
| historical_period | edo | Edo-period context | Edo period (Japan) | `Character's historical era: Edo period (Japan).` |
| social_status | royalty | member of royalty | royalty | `Social status: royalty.` |
| social_status | nobility | member of the nobility | nobility | `Social status: nobility.` |
| social_status | clergy | member of the clergy | clergy | `Social status: clergy.` |
| social_status | executive | member of corporate leadership | corporate leadership | `Social status: corporate leadership.` |
| nationality | stateless | stateless person | stateless | `Nationality (country or region): stateless.` |
| nationality | (12개국) | South Korean 등 | 동일 (ID만 소문자) | `Nationality (country or region): South Korean.` |
| gender | woman / man | “female character / woman (adult context only)” | 연령 판단별 조건 표현 (§5.5) | `Gender: woman.` / `Gender: female character.` |
| apparent_age | (예시 문장) | has the appearance of an adult aged 30–35 | approximately 30–35 years old | `Apparent age: approximately 30–35 years old.` |
