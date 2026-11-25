# 표정 및 시각적 인상 (Expression & Appeal) — 카탈로그 설계

- 버전: 1.1.0
- 설계 상태: **APPROVED** — Sprint 2-B.5 개발 승인서(2-B.5A)의 초기 제품 카탈로그 (실제 사용·이미지 결과에 따른 후속 개선 허용)
- 구현: `src/domain/catalog/catalogs/person/expression-makeup.ts` (core 카탈로그 0.8.0; 외모 방향은 0.9.0 `appearance.ts`), 카테고리 `person_expression` + 하위 분류 2개(표정 10, 인상 및 매력 8 + 외모 방향 1 — Sprint 2-B.6, §2-1)
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md)

## 1. 설계 목적과 원칙

일시적인 표정과 해석적 인상을 다룹니다. 얼굴 생김새(2-B.2)와 별개이며, 성격이나 나이를 추론하지 않습니다.

- **표정**은 일시적인 상태입니다. 기본 감정과 감정 강도는 독립적으로 저장하며, 감정을 골라도 눈·입·눈썹 값을 자동으로 정하지 않습니다. 복합 감정을 위해 기본 감정은 다중 선택입니다.
- 얼굴의 해부학적 특징(눈 크기·입술 두께·입꼬리 등)과 일시적인 표정(눈 개방·입 벌림·눈썹 움직임)은 서로 다른 속성으로 저장·출력합니다.
- **시선 상태**만 다룹니다. 시선 **방향**은 자세·카메라 영역(Sprint 2-B.6)에서 다룹니다.
- “미소 없음”, “눈물 없음”, “치아 안 보임”은 명시적 선택이며 미설정과 구분됩니다.
- **인상 및 매력**은 해석적 속성입니다. 공존 가능한 인상·분위기는 다중 선택이며, 얼굴형·피부색·신체 특징으로 자동 변환하지 않습니다.
- **시각적 매력도**는 객관적 점수가 아닌 정성적 표현이며 그 자체로 성적 표현이 아닙니다. 비성적인 귀여움·아름다움 표현과 성적 대상화를 구분합니다.
- **성숙한 인상**은 실제 연령·외형 연령과 별개이며, 안전 정책의 성인 판단 근거가 아닙니다. 구조화된 연령 판단은 바뀌지 않습니다. “앳된(youthful-looking)” 선택지는 기존 어휘의 “young-looking”과 같은 **나이가 모호한 표현** 태그(`age.ambiguous_young`)를 가지며, 성적 표현과 함께 쓰이면 기존 미성년자 보호 규칙으로 차단됩니다(보수적 적용).
- 모든 속성은 Direct 표현 역할, 프롬프트 포함·제외 토글, 1인 피사체(또는 피사체 미선택)에 적용됩니다.

## 2. 속성 목록 (18)

### 표정 / Expression (10) — `person_expression_face`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 354 | `person.expression.emotion` | 기본 감정 / Emotion | 다중 · 검색 목록 + 사용자 정의 | `Emotion: {value}.` | 무표정(Neutral) → neutral; 기쁨(Happy) → happy; 슬픔(Sad) → sad; 분노(Angry) → angry; 놀람(Surprised) → surprised; 두려움(Fearful) → fearful; 혐오(Disgusted) → disgusted; 경멸(Contemptuous) → contemptuous; 당황(Embarrassed) → embarrassed; 호기심(Curious) → curious; 지루함(Bored) → bored; 만족(Content) → content; 혼란(Confused) → confused; 걱정(Worried) → worried; 결연함(Determined) → determined; 들뜸(Excited) → excited | — | emotion, 감정, 기분 |
| 355 | `person.expression.emotion_intensity` | 감정 강도 / Emotion intensity | 상대 슬라이더 (1–5) | `Emotional expression intensity: {value}.` | 1 아주 은은함(Very subtle) → very subtle; 2 은은함(Subtle) → subtle; 3 보통(Moderate) → moderate; 4 강함(Strong) → strong; 5 아주 강함(Very intense) → very intense | — | intensity, 감정 강도 |
| 356 | `person.expression.smile` | 미소 형태 / Smile | 다중 · 칩 | `Smile: {value}.` | 미소 없음(No smile) → no smile; 부드러운 미소(Gentle smile) → gentle smile; 옅은 미소(Faint smile) → faint smile; 활짝 웃는(Broad smile) → broad smile; 입을 다문 미소(Closed-mouth smile) → closed-mouth smile; 입을 벌린 미소(Open-mouth smile) → open-mouth smile; 비대칭 미소(Asymmetric smile) → asymmetric smile | — | smile, 미소, 웃음 |
| 357 | `person.expression.mouth_openness` | 입 벌림 정도 / Mouth openness | 단일 · 칩 | `Mouth: {value}.` | 다문(Closed) → closed; 살짝 벌린(Slightly parted) → slightly parted; 벌린(Open) → open; 크게 벌린(Wide open) → wide open | — | mouth open, 입 벌림 |
| 358 | `person.expression.teeth` | 치아 노출 / Teeth visibility | 단일 · 칩 | `Teeth: {value}.` | 안 보임(No visible teeth) → no visible teeth; 일부 보임(Partially visible) → partially visible teeth; 잘 보임(Clearly visible) → clearly visible teeth | — | teeth, 치아, 이 |
| 359 | `person.expression.eye_openness` | 눈 개방 정도 / Eye openness | 단일 · 칩 | `Eyes: {value}.` | 감은(Closed) → closed; 반쯤 감은(Half-closed) → half-closed; 자연스럽게 뜬(Naturally open) → naturally open; 크게 뜬(Wide open) → wide open | — | eyes open, 눈 뜸, 눈 감음 |
| 360 | `person.expression.brow_movement` | 눈썹 움직임 / Eyebrow movement | 단일 · 칩 | `Eyebrow movement: {value}.` | 자연스러운(Neutral) → neutral; 치켜올린(Raised) → raised; 내린(Lowered) → lowered; 찌푸린(Furrowed) → furrowed; 한쪽만 올린(One eyebrow raised) → one eyebrow raised | — | brow movement, 눈썹 움직임, 찡그림 |
| 361 | `person.expression.gaze_state` | 시선 상태 / Gaze state | 단일 · 칩 + 사용자 정의 | `Gaze: {value}.` | 집중한(Focused) → focused; 편안한(Relaxed) → relaxed; 먼 곳을 보는(Distant) → distant; 경계하는(Alert) → alert; 산만한(Distracted) → distracted; 생각에 잠긴(Thoughtful) → thoughtful | — | gaze, 시선, 눈빛 |
| 362 | `person.expression.tears` | 눈물 / Tears | 단일 · 칩 | `Tears: {value}.` | 없음(No tears) → no tears; 촉촉한 눈(Watery eyes) → watery eyes; 고인 눈물(Tears welling up) → tears welling up; 흐르는 눈물(Tears streaming down) → tears streaming down | — | tears, 눈물, 울음 |
| 363 | `person.expression.facial_tension` | 얼굴 긴장도 / Facial tension | 상대 슬라이더 (1–5) | `Facial tension: {value}.` | 1 아주 편안함(Very relaxed) → very relaxed; 2 편안함(Relaxed) → relaxed; 3 보통(Moderate) → moderate; 4 긴장(Tense) → tense; 5 아주 긴장(Highly tense) → highly tense | — | tension, 긴장, 굳은 표정 |

### 인상 및 매력 / Impression & appeal (8) — `person_expression_impression`

| 순서 | Attribute ID | 한국어 / English | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|
| 364 | `person.impression.overall` | 전체 인상 / Overall impression | 다중 · 칩 + 사용자 정의 | `Visual impression: {value}.` | 친근한(Approachable) → approachable; 온화한(Gentle) → gentle; 절제된(Reserved) → reserved; 차가운(Cool) → cool; 따뜻한(Warm) → warm; 강인한(Strong) → strong; 신비로운(Mysterious) → mysterious; 위엄 있는(Dignified) → dignified; 여유로운(Relaxed) → relaxed; 세련된(Refined) → refined; 위압적인(Intimidating) → intimidating; 순수해 보이는(Innocent-looking) → innocent-looking | — | impression, 인상, 첫인상 |
| 365 | `person.impression.vibe` | 분위기 / Personal vibe | 다중 · 칩 + 사용자 정의 | `Personal vibe: {value}.` | 우아한(Elegant) → elegant; 세련된(Sophisticated) → sophisticated; 고급스러운(Luxurious) → luxurious; 절제된(Understated) → understated; 도시적인(Urban) → urban; 클래식한(Classic) → classic; 소박한(Rustic) → rustic; 몽환적인(Ethereal) → ethereal; 기품 있는(Graceful) → graceful; 장난스러운(Playful) → playful; 반항적인(Rebellious) → rebellious | — | vibe, 분위기, 무드 |
| 366 | `person.impression.attractiveness` | 시각적 매력도 / Visual appeal | 단일 · 칩 | `Visual appeal: {value}.` | 자연스러운(Natural-looking) → natural-looking; 은은한 매력(Subtly attractive) → subtly attractive; 매력적인(Attractive) → attractive; 눈에 띄게 매력적인(Strikingly attractive) → strikingly attractive; 아주 매력적인(Exceptionally attractive) → exceptionally attractive | — | attractiveness, 매력, 미모 |
| 367 | `person.impression.cuteness` | 귀여움 / Cuteness | 상대 슬라이더 (1–5) | `Cute appearance: {value}.` | 1 거의 없음(Minimal) → minimal; 2 약간(Slight) → slight; 3 보통(Moderate) → moderate; 4 뚜렷함(Notable) → notable; 5 아주 뚜렷함(Pronounced) → pronounced | — | cute, 귀여운, 귀여움 |
| 368 | `person.impression.elegance` | 우아함 / Elegance | 상대 슬라이더 (1–5) | `Elegance: {value}.` | 1 은은함(Subtle) → subtle; 2 약간(Slight) → slightly elegant; 3 보통(Moderate) → moderately elegant; 4 우아함(Elegant) → elegant; 5 아주 우아함(Highly elegant) → highly elegant | — | elegance, 우아함, 기품 |
| 369 | `person.impression.charisma` | 카리스마 / Charisma | 상대 슬라이더 (1–5) | `Visual presence: {value}.` | 1 은은함(Subtle) → subtle; 2 약간(Slight) → noticeable; 3 보통(Moderate) → moderate; 4 강함(Strong) → strong; 5 압도적(Commanding) → commanding | — | charisma, 카리스마, 존재감 |
| 370 | `person.impression.androgyny` | 중성적 인상 / Androgynous impression | 상대 슬라이더 (1–5) | `Androgynous appearance: {value}.` | 1 은은함(Subtle) → subtle; 2 약간(Slight) → slight; 3 보통(Moderate) → moderate; 4 뚜렷함(Notable) → notable; 5 아주 뚜렷함(Pronounced) → pronounced | — | androgynous, 중성적, 젠더리스 |
| 371 | `person.impression.maturity` | 성숙한 인상 / Mature impression | 단일 · 칩 | `Apparent maturity: {value}.` | 앳된(Youthful-looking) → youthful-looking; 중간(Neutral) → neutral; 성숙한(Mature-looking) → mature-looking; 아주 성숙한(Highly mature-looking) → highly mature-looking | — | maturity, 성숙, 동안, 노안 |

## 2-1. 외모 방향 (Appearance direction) — Sprint 2-B.6

원하는 전체적인 외모 방향을 먼저 정하는 속성입니다(`src/domain/catalog/catalogs/person/appearance.ts`).

- Basic에서는 피사체를 “인물 (1인)”로 고르면 피사체 바로 다음에 나타나고, Detailed에서는 인상 및 매력 화면 맨 앞에 있습니다. 같은 속성 하나이므로 두 화면이 같은 값을 공유합니다. 피사체가 인물이 아니거나 미선택이면 적용되지 않습니다(값 보존).
- 출력은 피사체 바로 다음 독립 문장(“Appearance direction: beautiful, elegant.”)입니다. 피사체 문구와 합치는 방식은 컴파일러 변경이 필요해 쓰지 않았습니다. 미설정이면 기존 출력이 그대로입니다.
- 해석적 속성이며 다른 값을 자동 설정하지 않고 성별로 제한하지 않습니다(“잘생긴”·“아름다운” 모두 누구에게나).
- 의미가 같은 인상 값은 기존 `covers` 규칙으로 한 번만 출력합니다: 매력적인 ↔ 시각적 매력도 “매력적인”, 눈길을 끄는 ↔ “눈에 띄게 매력적인”, 우아한·몽환적인 ↔ 분위기 “우아한”·“몽환적인”, 세련된 ↔ 전체 인상 “세련된”. 저장된 값은 바뀌지 않습니다.
- 안전: “섹시한(sexy)”은 기존 어휘의 성적 매력 표현이며 `appeal.suggestive` 태그도 가집니다. 미성년·모호 연령과 함께면 기존 규칙으로 차단(프롬프트 제외 값도 검사), 연령 신호가 없으면 기존 정책대로 차단하지 않습니다. 아름다운·잘생긴·예쁜·귀여운·사랑스러운 등은 그 자체로 신호가 없습니다. 외모 방향은 연령 판단을 바꾸지 않습니다.

| 순서 | Attribute ID | 한국어 / English | 단계 | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|---|
| 195 | `person.appearance.direction` | 외모 방향 / Appearance direction | Basic+Detailed | 다중 · 검색 목록 + 사용자 정의 | `Appearance direction: {value}.` | 아름다운(Beautiful) → beautiful; 잘생긴(Handsome) → handsome; 예쁜(Pretty) → pretty; 귀여운(Cute) → cute; 눈부시게 아름다운(Stunning) → stunning; 섹시한(Sexy) → sexy; 빼어나게 아름다운(Gorgeous) → gorgeous; 매력적인(Attractive) → attractive; 호감 가는 매력(Charming) → charming; 우아한(Elegant) → elegant; 눈길을 끄는(Striking) → striking; 세련된(Refined) → refined; 사랑스러운(Adorable) → adorable; 투박하고 강인한(Rugged) → rugged; 몽환적인(Ethereal) → ethereal; 중성적인(Androgynous) → androgynous; 평범한 외모(Ordinary-looking) → ordinary-looking; 개성 있는 외모(Distinctive) → distinctive | `subject.kind` ∈ person | appearance, look, 외모, 외모 방향, 미모 |

## 3. 충돌 안내 (비차단, 값 자동 변경 없음)

> Sprint 2-C.2(TD-10) 추가 — 의미 충돌:
> - 무표정 + 다른 감정
> - 무표정 + 감정 강도 강함(4 이상)
> - 입 다묾 + 입을 벌린 미소


| 규칙 ID | 관련 속성 | 안내 문구 |
|---|---|---|
| `expression-smile-none-with-others` | `person.expression.smile` | ‘없음’(미소 없음)이 다른 항목과 함께 선택되었습니다. |
| `expression-smile-faint-vs-broad` | `person.expression.smile` | ‘옅은 미소’과(와) ‘활짝 웃는’은(는) 서로 반대되는 특징입니다. |
| `expression-smile-gentle-vs-broad` | `person.expression.smile` | ‘부드러운 미소’과(와) ‘활짝 웃는’은(는) 서로 반대되는 특징입니다. |
| `expression-smile-closed-mouth-vs-open-mouth` | `person.expression.smile` | ‘입을 다문 미소’과(와) ‘입을 벌린 미소’은(는) 서로 반대되는 특징입니다. |
| `expression-closed-mouth-vs-visible-teeth` | `person.expression.mouth_openness`, `person.expression.teeth` | 입을 다문 상태인데 치아가 보이도록 설정되었습니다. |
| `expression-closed-eyes-vs-gaze` | `person.expression.eye_openness`, `person.expression.gaze_state` | 눈을 감은 상태인데 시선 상태가 설정되었습니다. |

옅은 미소와 부드러운 미소는 함께 쓸 수 있어 진단하지 않습니다.

## 4. 시각 예시

공통 규격 §10을 따릅니다. 이번 Sprint에서는 예시 이미지를 만들지 않았습니다.

## 5. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-25 | 1.1.0 | 외모 방향 추가 (Sprint 2-B.6) | Sprint 2-B.6 개발 승인서 |
| 2026-11-24 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.5) | Sprint 2-B.5 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
