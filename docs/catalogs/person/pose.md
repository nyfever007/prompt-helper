# 자세 및 행동 (Pose & Action) — 카탈로그 설계

- 버전: 1.0.0
- 설계 상태: **APPROVED** — Sprint 2-B.6 개발 승인서의 초기 제품 카탈로그
- 구현: `src/domain/catalog/catalogs/person/pose.ts` (core 카탈로그 0.9.0), 카테고리 `person_pose` + 하위 분류 5개(기본 자세 7, 머리·시선 4, 팔·손 자세 4, 다리·발 자세 3, 동작 4 — 합계 22)
- 공통 규격: [../CATALOG_DESIGN_STANDARD.md](../CATALOG_DESIGN_STANDARD.md)

## 1. 설계 목적과 원칙

- 일시적인 자세와 동작이며 신체 구조(2-B.4)와 구분합니다. 묘사일 뿐이며 이미지 모델이 정확한 관절 위치를 재현한다고 보장하지 않습니다(화면 안내).
- **독립 축**: 신체 방향 ↔ 카메라의 관찰 방향(`composition.view_direction`), 머리 방향 ↔ 시선 방향, 시선 방향 ↔ 시선 상태(`person.expression.gaze_state`, 2-B.5), 기본 자세 ↔ 기본 동작. 기존 카탈로그에 같은 의미의 속성이 없어 모두 새로 만들었습니다(시선 상태·관찰 방향은 재사용 대상이 아닌 별개 축).
- 자세·동작은 의상·감정·성격을 자동 설정하지 않으며, 성별·연령 등에서 자세를 추론하지 않습니다.
- 팔·손·다리 자세는 양쪽을 함께 묘사합니다. 좌우 관절 개별 편집과 3D 스켈레톤은 범위 밖입니다.
- 손 제스처와 기본 동작은 다중 선택, 나머지는 단일 선택(대부분 사용자 정의 가능)이며 자세 긴장도만 5단계 슬라이더입니다.
- 실제 모순만 비차단으로 안내합니다(§3).

## 2. 속성 목록 (22)

### 기본 자세 / Posture (7) — `person_pose_posture`

| 순서 | Attribute ID | 한국어 / English | 단계 | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|---|
| 478 | `person.pose.posture` | 기본 자세 / Basic posture | Detailed | 단일 · 칩 + 사용자 정의 | `Posture: {value}.` | 서 있는(Standing) → standing; 앉은(Sitting) → sitting; 누운(Lying down) → lying down; 기대어 누운(Reclining) → reclining; 무릎 꿇은(Kneeling) → kneeling; 웅크린(Crouching) → crouching; 쪼그려 앉은(Squatting) → squatting | `subject.kind` ∈ person (미설정이면 통과) | posture, pose, 자세, 포즈 |
| 479 | `person.pose.body_orientation` | 신체 방향 / Body orientation | Detailed | 단일 · 칩 | `Body orientation: {value}.` | 정면(Front-facing) → front-facing; 왼쪽(Left-facing) → facing left; 오른쪽(Right-facing) → facing right; 뒤쪽(Rear-facing) → facing away; 3/4 방향(Three-quarter facing) → three-quarter facing | `subject.kind` ∈ person (미설정이면 통과) | body orientation, 몸 방향, 돌아선 |
| 480 | `person.pose.torso_rotation` | 몸통 회전 / Torso rotation | Detailed | 단일 · 칩 | `Torso rotation: {value}.` | 왼쪽으로(Rotated left) → rotated left; 중립(Neutral) → neutral; 오른쪽으로(Rotated right) → rotated right | `subject.kind` ∈ person (미설정이면 통과) | torso rotation, 몸통 회전, 허리 비틀기 |
| 481 | `person.pose.torso_lean` | 몸통 기울기 / Torso lean | Detailed | 단일 · 칩 | `Torso lean: {value}.` | 앞으로(Leaning forward) → leaning forward; 곧게(Upright) → upright; 뒤로(Leaning backward) → leaning backward; 옆으로(Leaning sideways) → leaning sideways | `subject.kind` ∈ person (미설정이면 통과) | lean, 기울기, 숙인, 젖힌 |
| 482 | `person.pose.weight_shift` | 체중 이동 / Weight distribution | Detailed | 단일 · 칩 | `Weight distribution: {value}.` | 고르게(Evenly distributed) → evenly distributed; 왼쪽 다리(Weight on left leg) → weight on the left leg; 오른쪽 다리(Weight on right leg) → weight on the right leg | `subject.kind` ∈ person (미설정이면 통과) | weight, 체중, 짝다리 |
| 483 | `person.pose.balance` | 자세 균형 / Pose balance | Detailed | 단일 · 칩 | `Pose balance: {value}.` | 자연스러운(Natural) → natural; 대칭(Symmetrical) → symmetrical pose; 비대칭(Asymmetrical) → asymmetrical pose | `subject.kind` ∈ person (미설정이면 통과) | balance, 균형, 대칭 |
| 484 | `person.pose.tension` | 자세 긴장도 / Posture tension | Detailed | 상대 슬라이더 (1–5) | `Posture tension: {value}.` | 1 아주 편안함(Very relaxed) → very relaxed; 2 편안함(Relaxed) → relaxed; 3 보통(Moderate) → moderate; 4 긴장(Tense) → tense; 5 아주 긴장(Highly tense) → highly tense | `subject.kind` ∈ person (미설정이면 통과) | posture tension, 자세 긴장, 경직 |

### 머리·시선 / Head & gaze (4) — `person_pose_head_gaze`

| 순서 | Attribute ID | 한국어 / English | 단계 | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|---|
| 485 | `person.pose.head_direction` | 머리 방향 / Head direction | Detailed | 단일 · 칩 | `Head direction: {value}.` | 정면(Facing forward) → facing forward; 왼쪽으로 돌린(Turned left) → turned left; 오른쪽으로 돌린(Turned right) → turned right; 위로 든(Raised upward) → raised upward; 아래로 숙인(Lowered downward) → lowered downward | `subject.kind` ∈ person (미설정이면 통과) | head direction, 고개 방향, 고개 |
| 486 | `person.pose.head_tilt` | 머리 기울기 / Head tilt | Detailed | 단일 · 칩 | `Head tilt: {value}.` | 왼쪽으로(Tilted left) → tilted left; 똑바로(Upright) → upright; 오른쪽으로(Tilted right) → tilted right | `subject.kind` ∈ person (미설정이면 통과) | head tilt, 고개 갸웃, 갸우뚱 |
| 487 | `person.pose.chin` | 턱 방향 / Chin position | Detailed | 단일 · 칩 | `Chin: {value}.` | 내린(Chin lowered) → lowered; 중립(Neutral) → neutral; 든(Chin raised) → raised | `subject.kind` ∈ person (미설정이면 통과) | chin, 턱, 턱을 든 |
| 488 | `person.pose.gaze_direction` | 시선 방향 / Gaze direction | Detailed | 단일 · 칩 + 사용자 정의 | `Gaze direction: {value}.` | 카메라를 보는(Looking at the camera) → looking at the camera; 왼쪽을 보는(Looking left) → looking left; 오른쪽을 보는(Looking right) → looking right; 위를 보는(Looking up) → looking up; 아래를 보는(Looking down) → looking down; 먼 곳을 보는(Looking into the distance) → looking into the distance; 시선을 피한(Looking away) → looking away | `subject.kind` ∈ person (미설정이면 통과) | gaze direction, 시선 방향, 카메라 응시, eye contact |

### 팔·손 자세 / Arm & hand pose (4) — `person_pose_arms_hands`

| 순서 | Attribute ID | 한국어 / English | 단계 | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|---|
| 489 | `person.pose.arms` | 팔 자세 / Arm position | Detailed | 단일 · 칩 + 사용자 정의 | `Arms: {value}.` | 옆으로 편히(Relaxed at sides) → relaxed at the sides; 팔짱(Crossed) → crossed; 든(Raised) → raised; 뻗은(Outstretched) → outstretched; 등 뒤로(Behind the back) → behind the back | `subject.kind` ∈ person (미설정이면 통과) | arms, 팔, 팔짱 |
| 490 | `person.pose.elbows` | 팔꿈치 자세 / Elbow position | Detailed | 단일 · 칩 | `Elbows: {value}.` | 곧은(Straight) → straight; 살짝 굽힌(Slightly bent) → slightly bent; 굽힌(Bent) → bent | `subject.kind` ∈ person (미설정이면 통과) | elbows, 팔꿈치 |
| 491 | `person.pose.hand_position` | 손 위치 / Hand position | Detailed | 단일 · 칩 + 사용자 정의 | `Hands: {value}.` | 옆에(At sides) → at the sides; 허리에(On hips) → on the hips; 주머니에(In pockets) → in the pockets; 얼굴 가까이(Near face) → near the face; 머리 뒤로(Behind head) → behind the head; 등 뒤로(Behind back) → behind the back; 무릎 위에(Resting on lap) → resting on the lap | `subject.kind` ∈ person (미설정이면 통과) | hands, 손 위치, 허리에 손 |
| 492 | `person.pose.hand_gesture` | 손 제스처 / Hand gesture | Detailed | 다중 · 칩 + 사용자 정의 | `Hand gesture: {value}.` | 편 손(Open hands) → open hands; 주먹(Clenched fists) → clenched fists; 손 흔들기(Waving) → waving; 브이(Peace sign) → peace sign; 가리키기(Pointing) → pointing; 엄지척(Thumbs-up) → thumbs-up; 깍지 낀(Clasped hands) → clasped hands | `subject.kind` ∈ person (미설정이면 통과) | gesture, 손짓, 제스처, 브이 |

### 다리·발 자세 / Leg & foot pose (3) — `person_pose_legs_feet`

| 순서 | Attribute ID | 한국어 / English | 단계 | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|---|
| 493 | `person.pose.legs` | 다리 자세 / Leg position | Detailed | 단일 · 칩 + 사용자 정의 | `Legs: {value}.` | 모은(Together) → together; 벌린(Apart) → apart; 꼰(Crossed) → crossed; 한쪽 굽힌(One leg bent) → one leg bent; 한쪽 든(One leg raised) → one leg raised | `subject.kind` ∈ person (미설정이면 통과) | legs, 다리 자세, 다리 꼰 |
| 494 | `person.pose.knees` | 무릎 자세 / Knee position | Detailed | 단일 · 칩 | `Knees: {value}.` | 곧은(Straight) → straight; 살짝 굽힌(Slightly bent) → slightly bent; 굽힌(Bent) → bent | `subject.kind` ∈ person (미설정이면 통과) | knees, 무릎 |
| 495 | `person.pose.feet` | 발 방향 / Foot direction | Detailed | 단일 · 칩 | `Feet: {value}.` | 앞으로(Forward-facing) → pointing forward; 안쪽으로(Inward-facing) → turned inward; 바깥쪽으로(Outward-facing) → turned outward | `subject.kind` ∈ person (미설정이면 통과) | feet, 발 방향, 팔자걸음 |

### 동작 / Action (4) — `person_pose_action`

| 순서 | Attribute ID | 한국어 / English | 단계 | 입력 | 문장 틀 | 선택지 또는 구간 → 프롬프트 표현 | 적용 조건 | 검색 별칭 |
|---|---|---|---|---|---|---|---|---|
| 496 | `person.pose.action` | 기본 동작 / Action | Detailed | 다중 · 검색 목록 + 사용자 정의 | `Action: {value}.` | 걷기(Walking) → walking; 달리기(Running) → running; 점프(Jumping) → jumping; 춤추기(Dancing) → dancing; 스트레칭(Stretching) → stretching; 돌아서기(Turning) → turning; 손 뻗기(Reaching) → reaching out; 손 흔들기(Waving) → waving; 앉는 중(Sitting down) → sitting down; 일어서는 중(Standing up) → standing up; 읽기(Reading) → reading; 쓰기(Writing) → writing | `subject.kind` ∈ person (미설정이면 통과) | action, 동작, 행동, movement |
| 497 | `person.pose.speed` | 동작 속도 / Movement speed | Detailed | 단일 · 칩 | `Movement speed: {value}.` | 정지(Static) → static; 느린(Slow) → slow; 보통(Moderate) → moderate; 빠른(Fast) → fast; 아주 빠른(Very fast) → very fast | `subject.kind` ∈ person (미설정이면 통과) | speed, 속도, 정지 |
| 498 | `person.pose.phase` | 동작 단계 / Action phase | Detailed | 단일 · 칩 | `Action phase: {value}.` | 준비(Preparation) → preparation; 진행 중(Mid-action) → mid-action; 절정(Peak of action) → peak of the action; 마무리(Completion) → completion | `subject.kind` ∈ person (미설정이면 통과) | phase, 동작 단계, 순간 |
| 499 | `person.pose.support` | 지지 및 접촉 / Support & contact | Detailed | 단일 · 칩 + 사용자 정의 | `Support: {value}.` | 벽에 기댄(Leaning against a wall) → leaning against a wall; 의자에 앉은(Sitting on a chair) → sitting on a chair; 바닥에 앉은(Sitting on the ground) → sitting on the ground; 표면에 기댄(Resting against a surface) → resting against a surface; 지지물을 잡은(Holding onto a support) → holding onto a support | `subject.kind` ∈ person (미설정이면 통과) | support, 기대기, 접촉, 앉을 곳 |

## 3. 충돌 안내 (비차단, 값 자동 변경 없음)

| 규칙 ID | 관련 속성 | 안내 문구 |
|---|---|---|
| `pose-resting-posture-vs-locomotion` | `person.pose.posture`, `person.pose.action` | 쉬는 자세에 걷기·달리기·점프가 함께 설정되었습니다. |
| `pose-static-vs-movement` | `person.pose.speed`, `person.pose.action` | 정지 속도에 움직이는 동작이 함께 설정되었습니다. |
| `pose-standing-vs-seated-support` | `person.pose.posture`, `person.pose.support` | 서 있는 자세에 앉은 지지가 함께 설정되었습니다. |
| `pose-standing-vs-hands-on-lap` | `person.pose.posture`, `person.pose.hand_position` | 손을 무릎 위에 두려면 앉은 자세가 필요합니다. |
| `pose-crossed-arms-vs-hand-position` | `person.pose.arms`, `person.pose.hand_position` | 팔짱과 함께할 수 없는 손 위치가 설정되었습니다. |
| `pose-crossed-arms-vs-straight-elbows` | `person.pose.arms`, `person.pose.elbows` | 팔짱을 끼려면 팔꿈치가 굽어 있어야 합니다. |
| `pose-bent-posture-vs-straight-knees` | `person.pose.posture`, `person.pose.knees` | 무릎 꿇기·웅크리기·쪼그려 앉기에는 무릎이 굽어 있어야 합니다. |
| `pose-closed-eyes-vs-gaze-direction` | `person.expression.eye_openness`, `person.pose.gaze_direction` | 눈을 감은 상태인데 시선 방향이 설정되었습니다. |
| `pose-hand-gesture-open-vs-fists` | `person.pose.hand_gesture` | ‘편 손’과(와) ‘주먹’은(는) 서로 반대되는 특징입니다. |

## 4. 변경 이력

| 날짜 | 버전 | 변경 | 승인 |
|---|---|---|---|
| 2026-11-25 | 1.0.0 | 승인된 초기 카탈로그 구현 (Sprint 2-B.6) | Sprint 2-B.6 개발 승인서 |
| 2026-11-24 | draft-0 | 문서 구조 생성 (Sprint 2-A) | — |
