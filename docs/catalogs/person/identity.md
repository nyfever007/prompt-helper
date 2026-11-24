# Prompter — Person Identity Catalog

- Version: 1.0.0
- Status: **APPROVED** — initial product vocabulary (Sprint 2-B.1 Implementation Approval). Improvements based on real use and image results are allowed through the normal catalog change workflow.
- Target: Sprint 2-B.1 (implemented in catalog `prompter.core@0.4.0`)
- Parent: `PROMPTER_MASTER_PLAN.md` (unchanged)
- Common rules: [`../CATALOG_DESIGN_STANDARD.md`](../CATALOG_DESIGN_STANDARD.md)
- Decision record: [`../../SPRINT_2B1_SPEC_REVIEW.md`](../../SPRINT_2B1_SPEC_REVIEW.md) (3rd revision — D0–D14, N1–N5, Q1–Q3; Appendix A/B/C hold the full country list, every compiled sentence and every expression change)
- Category: Person / Identity (`person_identity`, subcategories Being · Age · Gender · Background · Social · Other)
- Data: `src/domain/catalog/catalogs/person/identity.ts`, `src/domain/catalog/catalogs/person/regions.ts`

## 1. Purpose and scope

Describe the identity and context of a depicted person or humanoid without automatically specifying their face, body, clothing, expression, pose, medium or lighting. Support realistic people, original fictional characters, fantasy and science-fiction humanoids. All attributes begin unset. English strings are generic semantic fragments, not guaranteed model controls.

Identity applies to a single person: attributes are applicable when the subject is “Person (1)” or not yet chosen (D11). With another subject they are kept but not compiled (still safety-checked). Groups will be handled by future per-subject specification.

## 2. Attribute inventory

All IDs are prefixed `person.identity.` (snake_case, D2). All attributes are Detailed, approved, and have the “Include in prompt” toggle (D3). No selection or visual defaults are inferred.

| Order | ID suffix | Korean / English | Type / control | Role / kind | Custom | Subcategory |
|---|---|---|---|---|---|---|
| 201 | entity_type | 존재 유형 / Entity type | single, searchable | Direct / categorical | ✓ (name-only notice) | Being |
| 202 | species | 종족 / Species | single, hierarchical searchable | Direct / categorical | ✓ (name-only notice) | Being |
| 203 | character_origin | 인물의 실재 여부 / Character origin | single, chips | Context / categorical | — | Being |
| 204 | age_group | 연령대 / Age group | single, dropdown | Direct / categorical | — | Age |
| 205 | age | 실제 연령 / Actual age | quantity (number or range; years/months/days) | Context / numeric | — | Age |
| 206 | apparent_age | 외형적 연령 / Apparent age | quantity (number or range; years/months/days) | Direct / numeric | — | Age |
| 207 | gender | 성별 / Gender | single, chips | Context / categorical | ✓ | Gender |
| 208 | gender_presentation | 성별 표현 / Gender presentation | single, chips | Direct / interpretive | ✓ (name-only notice) | Gender |
| 209 | nationality | 국적 및 국가·지역 / Nationality / Country or Region | **multi**, searchable | Context / categorical | ✓ | Background |
| 210 | ethnic_background | 민족적 배경 / Ethnic background | multi, searchable | Context / categorical | ✓ | Background |
| 211 | cultural_background | 문화적 배경 / Cultural background | multi, searchable | Context / categorical | ✓ | Background |
| 212 | historical_period | 시대적 배경 / Historical period | single, searchable | Context / categorical | ✓ | Background |
| 213 | occupation | 직업 / Occupation | multi, searchable (display groups) | Context / categorical | ✓ | Social |
| 214 | narrative_role | 서사적 역할 / Narrative role | multi, searchable | Context / categorical | ✓ | Social |
| 215 | social_status | 사회적 지위 / Social status | single, searchable | Context / categorical | ✓ | Social |
| 216 | description | 인물 설명 / Character description | text, textarea (2,000) | Context / free text | (free text) | Other |

Order 201–216 places identity right after the subject (200) in the prompt (N1).

**Custom values** (D4): “Custom” is not an option. A user-defined value is a `CustomEntry { label ≤ 200, expression? ≤ 2,000 }`, stored inside the selection value, edited independently, kept verbatim and never merged with or replaced by a registered option (a same-name option only triggers a notice). Multi-select attributes mix registered and custom values without a count limit. Output: the expression if present, otherwise the name verbatim. Direct roles (entity type, species, gender presentation) show a non-blocking notice for name-only values.

**Quantity** (D5): `{ kind: "number", value, unit }` or `{ kind: "range", min, max, unit }`; whole numbers ≥ 0; no upper cap; units years (base) / months (12 per year) / days (365.25 per year). The entered value and unit are stored and output losslessly; normalization is used only for judgements.

**Search aliases** (attribute level): entity_type “존재 유형, 엔티티, entity, being type” · species “종족, 종, race, species” · character_origin “실재 여부, 인물 출처, 가상 인물, 실존 인물, origin” · age_group “연령대, 나이대, age group, life stage” · age “실제 연령, 나이, 실제 나이, age, actual age” · apparent_age “외형적 연령, 외모 나이, 보이는 나이, apparent age, looks age” · gender “성별, gender” · gender_presentation “성별 표현, 젠더 표현, gender expression, presentation” · nationality “국적, 국가, 지역, 시민권, nationality, country, region, citizenship” · ethnic_background “민족, 민족적 배경, ethnicity, ethnic background” · cultural_background “문화, 문화적 배경, culture” · historical_period “시대, 시대적 배경, era, period” · occupation “직업, 직종, job, profession” · narrative_role “서사적 역할, 역할, 배역, role” · social_status “사회적 지위, 신분, 계층, status, class” · description “인물 설명, 캐릭터 설명, character description, bio”.

## 3. Entity type — entity_type

Defines the general nature of the being, not its style, anatomy or origin. A single choice records the user's principal classification; species supplies more precise identity. Template: `Type of being: {value}.`

| ID | 한국어 | English expression | Meaning | Age model kind |
|---|---|---|---|---|
| human | 인간 | human | Human being | human |
| fantasy_humanoid | 판타지 인간형 존재 | fantasy humanoid | Humanoid in a fantasy setting | nonhuman |
| alien_humanoid | 외계 인간형 존재 | alien humanoid | Humanoid of extraterrestrial origin | nonhuman |
| android | 안드로이드 | android | Humanlike artificial being | artificial |
| cyborg | 사이보그 | cyborg | Being with biological and technological components | augmented |
| humanoid_robot | 인간형 로봇 | humanoid robot | Robot with humanoid form | artificial |
| anthropomorphic | 의인화 캐릭터 | anthropomorphic character | Nonhuman subject with humanlike qualities | nonhuman |
| supernatural | 초자연적 존재 | supernatural being | Being of supernatural nature | nonhuman |
| mythological | 신화적 존재 | mythological being | Being drawn from mythology | nonhuman |
| artificial_life | 인공 생명체 | artificial life form | Artificially created life | artificial |
| (custom) | 사용자 정의 | expression or name | Explicit user-defined type (CustomEntry) | unclassified |

## 4. Species — species

Expandable registry. The typical entity context is a suggestion (typical options are listed first; atypical ones are not hidden and produce only a non-blocking notice when chosen), not a forced taxonomy. No automatic ear shape, stature, skin color or other anatomy. Template: `Species: {value}.`

| ID | Parent | 한국어 | English expression | Typical entity (suggestion = `covers`) |
|---|---|---|---|---|
| human | — | 인간 | human | human |
| elf | — | 엘프 | elf | fantasy humanoid |
| dwarf | — | 드워프 | fantasy dwarf | fantasy humanoid |
| orc | — | 오크 | orc | fantasy humanoid |
| goblin | — | 고블린 | goblin | fantasy humanoid |
| giant | — | 거인족 | fantasy giant | fantasy humanoid |
| dragon_humanoid | — | 용인족 | dragon humanoid | fantasy humanoid |
| beastfolk | — | 수인족 | beastfolk | fantasy humanoid / anthropomorphic |
| catfolk | beastfolk | 고양이 수인 | feline beastfolk | (inherited) |
| foxfolk | beastfolk | 여우 수인 | fox beastfolk | (inherited) |
| wolffolk | beastfolk | 늑대 수인 | wolf beastfolk | (inherited) |
| fairy | — | 요정 | fairy | fantasy humanoid / supernatural |
| elemental | — | 정령 | elemental being | supernatural |
| angel | — | 천사 | angel | supernatural / mythological |
| demon | — | 악마 | demon | supernatural / mythological |
| vampire | — | 뱀파이어 | vampire | fantasy humanoid / supernatural |
| undead | — | 언데드 | undead being | supernatural |
| hybrid | — | 혼합 종족 | hybrid species | — (notice: describe the combination) |
| (custom) | — | 사용자 정의 | expression or name | — |

Single selection, so parent and child are never compiled together. Search hits show the path (e.g. 수인족 › 고양이 수인). Age model: `human` → human; every other registered species → nonhuman (children inherit); `hybrid` and custom → unclassified.

## 5. Character origin — character_origin

Template: `Character origin: {value}.` No custom values.

| ID | 한국어 | English expression | Meaning |
|---|---|---|---|
| fictional | 가상의 인물 | fictional character | Not a real individual |
| real | 실존 인물 | real person | An actual individual; no identity inferred |
| historical | 역사적 인물 | historical figure | Actual historical individual |
| mythological | 신화 속 인물 | mythological figure | Figure from myth |
| original | 독창적인 창작 캐릭터 | original character | Creator-defined original character |

A historical figure is a subset of real persons and an original character a subset of fictional characters; options are principal labels. No real-person identification or reference-image workflow is introduced. No real-person–specific policy is added in 2-B.1 (provider policies: Sprint 5).

## 6. Age

### 6.1 Age group — age_group

Product bins for humans; not clinical definitions. `age_group` is the actual life stage (D6). No exact age is inferred from a group; for nonhuman species no human lifespan or maturity mapping is assumed. Template: `Age group: {value}.` Single dropdown; the interval is shown as the option description.

| ID | 한국어 | English expression | Interval (years, max exclusive) | Policy tag |
|---|---|---|---|---|
| newborn | 신생아 | newborn | 0 – 28 days | age.minor |
| infant | 영아 | infant | 28 days – 1 | age.minor |
| toddler | 걸음마기 | toddler | 1 – 4 | age.minor |
| preschool | 유아 | preschool-aged child | 4 – 6 | age.minor |
| child | 어린이 | child | 6 – 13 | age.minor |
| adolescent | 청소년 | adolescent | 13 – 18 | age.minor |
| young_adult | 젊은 성인 | young adult | 18 – 30 | — |
| adult | **일반 성인 (30–44세)** | adult aged 30–44 | 30 – 45 | — |
| middle_aged | 중년 | middle-aged adult | 45 – 65 | — |
| older_adult | 노년 | older adult | 65 – 80 | — |
| advanced_age | 고령 | adult aged 80 or older | 80 – | — |
| ageless | 연령 개념 없음 | ageless | — | — |

The `adult` bin is labelled “일반 성인 (30–44세) / Adult (30–44)” so it is not confused with the safety policy's adult class.

### 6.2 Actual age — age

Template: `Actual age: {value} old.` → `Actual age: 28 years old.`, `Actual age: 28–32 years old.`, `Actual age: 8 months old.`, `Actual age: 300 years old.` Exact values and units are preserved (360 months is output as “360 months old”). Actual age is contextual where apparent age differs. No implicit apparent age.

### 6.3 Apparent age — apparent_age

Template: `Apparent age: approximately {value} old.` → `Apparent age: approximately 30 years old.`, `Apparent age: approximately 30–35 years old.` Describes visual age, not time alive. No unrequested words such as “adult” are added. Actual and apparent ages can differ intentionally.

### 6.4 Age assessment and rules

One shared interpretation (`assessAge`, `classifyBeing` in `src/domain/catalog/age.ts`) is used by the safety policy, the actual-age/age-group check and conditional wording. It reads stored values — including excluded and inapplicable ones — and never writes to the spec.

- Normalization: months ÷ 12, days ÷ 365.25; units alone never decide anything.
- Signals (threshold 18): number < 18 → minor, ≥ 18 → adult; range entirely < 18 → minor, entirely ≥ 18 → adult, otherwise ambiguous; age group minor/adult per interval; ageless → none.
- Being classification (N3, Q1, Q2): both entity type and species unset → **human** (general person; nothing is written); human / human species → human; cyborg + human species (**human cyborg**) → human; cyborg without species → unclassified; android, humanoid robot, artificial life → nonhuman (even with a human species); other registered nonhuman types/species → nonhuman; custom or conflicting (e.g. human + elf) → **unclassified**.
- Result: any minor signal → **minor** (never offset); else any ambiguous → **ambiguous**; else apparent age adult, or age group adult, or (being = human and actual age adult) → **adult**; else **unknown**.
- Examples: human 28 → adult; human 16 + apparent 25 → minor; elf 300 + apparent 30 → adult; elf 300 + apparent 12 → minor; elf 300 only → unknown; human 16–20 → ambiguous; unset being 28 → adult; android 28 → unknown; android 100 + apparent 28 → adult; human cyborg 28 → adult; human cyborg 16 + apparent 30 → minor; custom entity 100 → unknown; elf 10 + apparent 30 → minor. The full table is in the decision record §5.3 and in `tests/unit/identity-semantics.test.ts`.
- Rule R1 (warning): when the being is classified human (unset included, Q3) and the actual age (normalized; for a range, any part) lies outside the selected age group's interval. Neither value is changed.
- Actual vs apparent difference alone is never a conflict.
- Safety: minor → `age.minor`, ambiguous → `age.ambiguous_young` structured signals; existing conservative rules apply. Excluded or inapplicable fields still participate. Non-sexual depictions of minors are allowed; sexualized depictions of minors are blocked (D13). The master plan's “adult age range” is read as an initial example.

## 7. Gender and gender presentation

### gender — single + custom

Identity/context, not anatomy or wardrobe. Template: `Gender: {value}.`

| ID | 한국어 | English expression |
|---|---|---|
| woman | 여성 | `woman` when the age assessment is adult; otherwise `female character` |
| man | 남성 | `man` when the age assessment is adult; otherwise `male character` |
| nonbinary | 논바이너리 | non-binary person |
| genderless | 성별 없음 | genderless character |
| genderfluid | 젠더플루이드 | genderfluid person |
| (custom) | 사용자 정의 | expression or name |

The stored selection never changes with the age assessment; the field explains which wording is used and why. No “girl”/“boy” wording is produced. No visual example is required for identity labels.

### gender_presentation — single + custom

Independent of gender. Template: `Gender presentation: {value}.`

| ID | 한국어 | English expression |
|---|---|---|
| feminine | 여성적인 표현 | feminine |
| masculine | 남성적인 표현 | masculine |
| androgynous | 중성적인 표현 | androgynous |
| mixed | 혼합된 표현 | mixed masculine and feminine |
| neutral | 성별 표현을 강조하지 않음 | gender-neutral |
| (custom) | 사용자 정의 | expression or name |

“Not emphasized” is an explicit choice distinct from unset. No body traits or outfit details.

## 8. Nationality / country or region, ethnicity and culture

Independent context dimensions. Nationality is not mapped to ethnicity, ethnicity to phenotype or culture to wardrobe — no rule, `covers` or suggestion links them. No visual comparison cards for populations.

### nationality — 국적 및 국가·지역 / Nationality / Country or Region (multi + custom)

Template: `Nationality (country or region): {value}.` Multiple selections are supported (multiple nationalities); registered entries are output in catalog order (English display name), then custom entries in stored order. Selecting `stateless` together with any other entry (registered or custom) gives warning R2.

- Entries: 193 UN member states + Vatican (`va`) and Palestine (`ps`) + Taiwan (`tw`), Hong Kong (`hk`), Macao (`mo`), Kosovo (`xk`, user-assigned code) + `stateless` (무국적 / Stateless / `stateless`) + custom. IDs are lowercase ISO 3166-1 alpha-2.
- An entry means “the country or region the user associates with this person”; listing does not assert legal nationality or political status.
- Display names and prompt expressions are managed separately (e.g. display “홍콩 / Hong Kong”, expression “Hong Kong”; display “니제르 / Niger”, expression “Nigerien (Niger)” so it cannot be confused with “Nigerian”). “and” is used instead of “&” in display names and expressions; “&” spellings stay searchable.
- Approved display names: 팔레스타인 / Palestine, 홍콩 / Hong Kong, 마카오 / Macao, 콩고공화국 / Republic of the Congo, 콩고민주공화국 / Democratic Republic of the Congo, 니제르 / Niger, 나이지리아 / Nigeria.
- Data sources and versions: codes — ISO 3166-1 selection `identity-regions@0.1.0`; display names — Unicode CLDR 48 (Node 22.23.1 / ICU 78.2) with the approved overrides; expressions — Prompter-authored demonyms `identity-demonyms@0.1.0` (no external dataset); aliases — alpha-2, demonym, original CLDR names, “&” spellings and Prompter-curated common names `identity-region-aliases@0.1.0`. Full list: decision record Appendix A; data file `regions.ts`.

### ethnic_background — multi + custom

Self-described or author-defined context, not a visual classification. Illustrative starter list (extensions need product approval). Template: `Ethnic background: {value}.` Options: `korean` 한국계 / Korean · `japanese` 일본계 / Japanese · `han` 한족 / Han Chinese · `tamil` 타밀계 / Tamil · `yoruba` 요루바계 / Yoruba · `maori` 마오리계 / Māori · `arab` 아랍계 / Arab · `mixed` 복합 민족적 배경 / mixed. Multiple backgrounds remain distinct.

### cultural_background — multi + custom

Cultural context, not nationality or ethnicity; religion, language and costume are not inferred. Template: `Cultural background: {value}.` Options: `korean` 한국 문화 / Korean · `japanese` 일본 문화 / Japanese · `chinese` 중국 문화 / Chinese · `mediterranean` 지중해 문화 / Mediterranean · `diaspora` 디아스포라 문화 / diaspora · `multicultural` 다문화 / multicultural · `fictional` 가상 문화 / fictional culture.

## 9. Historical period — historical_period (single + custom)

The character's era, independent of scene time and costume (time travel is valid). Template: `Character's historical era: {value}.`

| ID | 한국어 | English expression |
|---|---|---|
| prehistoric | 선사 시대 | prehistoric era |
| ancient | 고대 | ancient era |
| medieval | 중세 | medieval era |
| renaissance | 르네상스 | Renaissance |
| early_modern | 근세 | early modern era |
| industrial | 산업화 시대 | industrial era |
| early_20c | 20세기 초 | early 20th century |
| mid_20c | 20세기 중반 | mid-20th century |
| late_20c | 20세기 후반 | late 20th century |
| contemporary | 현대 | contemporary era |
| future | 미래 | future era |
| far_future | 먼 미래 | far future |
| joseon | 조선 시대 | Joseon era (Korea) |
| edo | 에도 시대 | Edo period (Japan) |
| fictional | 가상 시대 | fictional era |

## 10. Occupation, narrative role, social status

Context only — no clothing, equipment, facial expression, props or physical traits are generated.

### occupation — multi + custom, display-only groups

Template: `Occupation: {value}.` Groups are headings only (not selectable, not compiled).

| Group | ID / Korean / English expression |
|---|---|
| Medicine 의료 | doctor / 의사 / physician; nurse / 간호사 / nurse; pharmacist / 약사 / pharmacist |
| Technology 기술 | developer / 개발자 / software developer; engineer / 엔지니어 / engineer; researcher / 연구원 / researcher |
| Design 디자인 | architect / 건축가 / architect; designer / 디자이너 / designer; artist / 예술가 / artist |
| Education 교육 | teacher / 교사 / teacher; professor / 교수 / professor; student / 학생 / student |
| Business 비즈니스 | merchant / 상인 / merchant; executive / 경영자 / business executive; entrepreneur / 기업가 / entrepreneur |
| Services 서비스 | chef / 요리사 / chef; mechanic / 정비사 / mechanic; driver / 운전사 / driver |
| Land and sea 농림·해양 | farmer / 농부 / farmer; fisher / 어부 / fisher; sailor / 선원 / sailor |
| Public roles 공공 | soldier / 군인 / soldier; police / 경찰 / police officer; firefighter / 소방관 / firefighter |
| Arts and media 예술·미디어 | writer / 작가 / writer; musician / 음악가 / musician; actor / 배우 / actor |
| Fantasy 판타지 | mage / 마법사 / mage; knight / 기사 / knight; alchemist / 연금술사 / alchemist; healer / 치유사 / healer |
| Exploration 탐험 | explorer / 탐험가 / explorer; adventurer / 모험가 / adventurer; pilot / 조종사 / pilot |

### narrative_role — multi + custom

Template: `Narrative role: {value}.` `protagonist` 주인공 · `antagonist` **대립자** (alias 악역) · `supporting` 조력자 / supporting character · `rival` 라이벌 · `guardian` 수호자 · `mentor` 스승 · `companion` 동료 · `civilian` 일반 시민 · `wanderer` 방랑자 · `leader` 지도자 · `observer` 관찰자 (expressions equal the English ids except `supporting character`). Narrative role does not imply morality or appearance; an antagonist is not necessarily evil.

### social_status — single + custom

Template: `Social status: {value}.`

| ID | 한국어 | English expression |
|---|---|---|
| royalty | 왕족 | royalty |
| nobility | 귀족 | nobility |
| commoner | 평민 | commoner |
| clergy | 성직 계층 | clergy |
| executive | 기업 경영층 | corporate leadership |
| official | 공직자 | public official |
| independent | 독립적 신분 | independent social standing |

Historical and institutional standing, not a universal hierarchy. Occupation and status can overlap without automatic linkage.

## 11. Character description — description

Free text (≤ 2,000), original language preserved. Template: `Character description: {value}` (sentence end added when missing). No automatic translation or elaboration; mixed-language notice as elsewhere. Safety checks apply to the original text whether or not it is output.

## 12. Compilation examples (generic-en)

Each attribute is its own sentence with provenance (D9); natural single-sentence composition is future work.

1. Human + actual age 28 + woman + South Korea + architect: `Main subject: a single person. Type of being: human. Actual age: 28 years old. Gender: woman. Nationality (country or region): South Korean. Occupation: architect.` Without the entity type the being is treated as human (N3), so the output is the same minus the entity sentence. With occupation excluded, only that sentence disappears.
2. Fantasy humanoid + elf + 300 + apparent 30: `Species: elf. Actual age: 300 years old. Apparent age: approximately 30 years old.` — the entity type is covered by the species (output once, provenance shown). Android + elf: both output plus an “atypical combination” notice.
3. Custom species 루미아족 with expression: `Species: A humanoid species with translucent crystalline skin and faintly luminous veins.` Name only: `Species: 루미아족.` + name-only notice + mixed-language notice. Nothing is invented.
4. Identity and gender presentation coexist independently; a feminine-presenting character is not automatically a woman.
5. Korea + Japan + stateless: `Nationality (country or region): Japanese, South Korean, stateless.` + warning R2.

All 400+ option sentences: decision record Appendix B (tested in `tests/unit/identity-catalog.test.ts`).

## 13. Rules and semantic relations

| Relation / rule | Behavior |
|---|---|
| No selection | no fragment |
| Excluded selection | value kept, no fragment, still safety-checked |
| Semantic duplicate (species covers entity type) | entity sentence omitted, provenance kept (`covers`) |
| Same-attribute override (direct > preset) | Sprint 2-A takeover rules |
| Independent axes (age ↔ apparent age, gender ↔ presentation, nationality ↔ ethnicity ↔ culture, occupation ↔ status, era ↔ scene) | all output, no diagnostic |
| Atypical entity/species | both output, info notice (`selection.atypical`) |
| R1 actual age vs age group | warning when being = human (unset included) and outside the interval |
| R2 stateless + another country/region | warning |
| R5 hybrid species without description | info |
| Custom name only (Direct roles) | info (`selection.custom_name_only`) |
| Custom text | preserved and validated; no fabricated description |

## 14. Visual example plan

Follow CATALOG_DESIGN_STANDARD §10 (TD-03). Entity/species and apparent age may benefit from controlled visual examples later; nationality, ethnic background, origin, occupation, status and narrative role use text, not phenotype cards. No images were produced in Sprint 2-B.1.

## 15. Acceptance tests (implemented)

Every item of the original list is covered: 16 attributes unset/persist/round-trip; output exclusion persists and never bypasses safety; custom name/expression independence and round-trip; Korean/English/alias search (elf/엘프, developer/software developer/개발자, apparent age/외형적 연령); units and incomplete ranges; age mismatch and conservative minor/ambiguous handling on structured and imported values; high fictional age cannot override a minor apparent age; no automatic anatomy/skin/hair/wardrobe/pose/gender/style/props; Basic/lighting outputs and Sprint 0/1/2-A fixtures unchanged; product catalog contains only approved options and no test fixtures; desktop/mobile editor, diagnostics, toggles and accessibility. Evidence: `docs/SPRINT_2B1_REPORT.md`.

## 16. Resolved decisions

1. Vocabulary and expressions: approved as the initial product catalog (D0, N4 — final approval with the implementation approval).
2. Context output default: included; exclusion is `excludedFromPrompt: true` on the selection (D3).
3. Ages: `quantity`, years/months/days, whole numbers, number or complete range (D5).
4. Nationality multi-select; social status and historical period single + custom (D12).
5. Custom values: `CustomEntry`; name-only values are output verbatim with a notice for Direct roles (D4).
6. English phrases and aliases: as listed here / Appendix B.
7. `age_group` is the actual life stage; compared with actual age when the being is human (D6, Q3).

## 17. Implementation boundary and change log

Sprint 2-B.1 implements this catalog only. Other person catalogs and Sprint 3 attribute locking are not implemented.

- 1.0.0 (2026-11-24): APPROVED. Applied D0–D14, N1–N5, Q1–Q3: snake_case IDs, `character_origin`, lowercase country codes, custom values as `CustomEntry`, nationality multi-select with countries/regions and data sources, approved display names, expression changes (decision record Appendix C), conditional gender wording, being classification and shared age assessment, “일반 성인 (30–44세)”, “대립자”, display-only occupation groups, hybrid notice, per-attribute sentence examples, order 201–216, subcategories.
- 0.1.0: Consolidated agreed 16-attribute structure and age group discussion; proposed vocabularies, rules, examples and tests for product review.
- draft-0 (Sprint 2-A): structure placeholder (replaced by 0.1.0).
