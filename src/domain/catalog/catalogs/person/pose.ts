import type { CategoryDefinition, Condition } from "../../schema";
import { SLIDER, degree, fd, opposite as oppositeIn, shape, type Attr, type L, type Rule } from "./builders";

/**
 * Sprint 2-B.6 (2) — Person › Pose & action (22). Specification: docs/catalogs/person/pose.md.
 *
 * - Temporary posture and movement, separate from anatomy (Body) and from the camera:
 *   body orientation ≠ the camera's viewing direction; head direction ≠ gaze direction;
 *   gaze direction ≠ the gaze STATE of Expression (2-B.5). Posture and action are independent.
 * - A pose or action never sets clothing, emotion or personality. Only real contradictions
 *   are diagnosed (non-blocking). Image models do not reproduce exact joint positions; this
 *   is a description, not a skeleton. Per-side joints and 3D editing are out of scope.
 */

const P = "person.pose.";
const sub = (id: string) => `person_pose_${id}`;

export const POSE_CATEGORY_DESCRIPTION: L = fd(
  "Temporary posture and movement — separate from anatomy, camera direction and expression. A description only: exact joint positions are not guaranteed.",
  "일시적인 자세와 동작입니다. 신체 구조·카메라 방향·표정과 별개이며, 묘사일 뿐 정확한 관절 위치를 보장하지 않습니다.",
);

export const poseCategories: CategoryDefinition[] = (
  [
    ["posture", "Posture", "기본 자세"],
    ["head_gaze", "Head & gaze", "머리·시선"],
    ["arms_hands", "Arm & hand pose", "팔·손 자세"],
    ["legs_feet", "Leg & foot pose", "다리·발 자세"],
    ["action", "Action", "동작"],
  ] as const
).map(([id, en, ko], i) => ({ id: sub(id), parentId: "person_pose", order: 1 + i, status: "approved" as const, label: { en, ko }, docPath: "docs/catalogs/person/pose.md" }));

const NOTE = (en: string, ko: string) => fd(`${en} A description; exact positions are not guaranteed.`, `${ko} 묘사이며 정확한 위치를 보장하지 않습니다.`);

// ── Posture (7) ──────────────────────────────────────────────────────────────
const S = sub("posture");
const posture: Attr[] = [
  shape(`${P}posture`, 478, S, fd("Basic posture", "기본 자세"), ["posture", "pose", "자세", "포즈"], NOTE("Independent of the action.", "동작과 독립적입니다."), "Posture: {value}.", [
    ["standing", "서 있는", "Standing", "standing", ["서기"]], ["sitting", "앉은", "Sitting", "sitting", ["앉기"]], ["lying_down", "누운", "Lying down", "lying down", ["눕기"]],
    ["reclining", "기대어 누운", "Reclining", "reclining"], ["kneeling", "무릎 꿇은", "Kneeling", "kneeling"], ["crouching", "웅크린", "Crouching", "crouching"], ["squatting", "쪼그려 앉은", "Squatting", "squatting", ["스쿼트"]],
  ]),
  shape(`${P}body_orientation`, 479, S, fd("Body orientation", "신체 방향"), ["body orientation", "몸 방향", "돌아선"], NOTE("Which way the body faces — independent of the camera's viewing direction.", "몸이 향한 방향이며 카메라의 관찰 방향과 독립적입니다."), "Body orientation: {value}.", [
    ["front", "정면", "Front-facing", "front-facing"], ["left", "왼쪽", "Left-facing", "facing left"], ["right", "오른쪽", "Right-facing", "facing right"],
    ["rear", "뒤쪽", "Rear-facing", "facing away"], ["three_quarter", "3/4 방향", "Three-quarter facing", "three-quarter facing"],
  ], { custom: false }),
  shape(`${P}torso_rotation`, 480, S, fd("Torso rotation", "몸통 회전"), ["torso rotation", "몸통 회전", "허리 비틀기"], NOTE("Twist of the torso.", "몸통의 비틀림입니다."), "Torso rotation: {value}.", [
    ["left", "왼쪽으로", "Rotated left", "rotated left"], ["neutral", "중립", "Neutral", "neutral"], ["right", "오른쪽으로", "Rotated right", "rotated right"],
  ], { custom: false }),
  shape(`${P}torso_lean`, 481, S, fd("Torso lean", "몸통 기울기"), ["lean", "기울기", "숙인", "젖힌"], NOTE("How the upper body leans.", "상체가 기운 방향입니다."), "Torso lean: {value}.", [
    ["forward", "앞으로", "Leaning forward", "leaning forward"], ["upright", "곧게", "Upright", "upright"], ["backward", "뒤로", "Leaning backward", "leaning backward"], ["sideways", "옆으로", "Leaning sideways", "leaning sideways"],
  ], { custom: false }),
  shape(`${P}weight_shift`, 482, S, fd("Weight distribution", "체중 이동"), ["weight", "체중", "짝다리"], NOTE("Where the body weight rests.", "체중이 실린 곳입니다."), "Weight distribution: {value}.", [
    ["even", "고르게", "Evenly distributed", "evenly distributed"], ["left_leg", "왼쪽 다리", "Weight on left leg", "weight on the left leg"], ["right_leg", "오른쪽 다리", "Weight on right leg", "weight on the right leg"],
  ], { custom: false }),
  shape(`${P}balance`, 483, S, fd("Pose balance", "자세 균형"), ["balance", "균형", "대칭"], NOTE("Overall balance of the pose.", "자세의 전체 균형입니다."), "Pose balance: {value}.", [
    ["natural", "자연스러운", "Natural", "natural"], ["symmetrical", "대칭", "Symmetrical", "symmetrical pose"], ["asymmetrical", "비대칭", "Asymmetrical", "asymmetrical pose"],
  ], { custom: false }),
  degree(`${P}tension`, 484, S, fd("Posture tension", "자세 긴장도"), ["posture tension", "자세 긴장", "경직"], SLIDER("How relaxed or tense the posture is (separate from facial tension).", "자세가 이완·긴장된 정도입니다(얼굴 긴장도와 별개)."), "Posture tension: {value}.", [
    ["아주 편안함", "Very relaxed", "very relaxed"], ["편안함", "Relaxed", "relaxed"], ["보통", "Moderate", "moderate"], ["긴장", "Tense", "tense"], ["아주 긴장", "Highly tense", "highly tense"],
  ]),
];

// ── Head & gaze (4) ──────────────────────────────────────────────────────────
const H = sub("head_gaze");
const head: Attr[] = [
  shape(`${P}head_direction`, 485, H, fd("Head direction", "머리 방향"), ["head direction", "고개 방향", "고개"], NOTE("Where the head points — separate from where the eyes look.", "머리가 향한 방향이며 시선과 별개입니다."), "Head direction: {value}.", [
    ["forward", "정면", "Facing forward", "facing forward"], ["left", "왼쪽으로 돌린", "Turned left", "turned left"], ["right", "오른쪽으로 돌린", "Turned right", "turned right"],
    ["up", "위로 든", "Raised upward", "raised upward", ["looking upward"]], ["down", "아래로 숙인", "Lowered downward", "lowered downward", ["looking downward"]],
  ], { custom: false }),
  shape(`${P}head_tilt`, 486, H, fd("Head tilt", "머리 기울기"), ["head tilt", "고개 갸웃", "갸우뚱"], NOTE("Sideways tilt of the head.", "머리를 옆으로 기울인 정도입니다."), "Head tilt: {value}.", [
    ["left", "왼쪽으로", "Tilted left", "tilted left"], ["upright", "똑바로", "Upright", "upright"], ["right", "오른쪽으로", "Tilted right", "tilted right"],
  ], { custom: false }),
  shape(`${P}chin`, 487, H, fd("Chin position", "턱 방향"), ["chin", "턱", "턱을 든"], NOTE("Chin up or down.", "턱을 들거나 내린 정도입니다."), "Chin: {value}.", [
    ["lowered", "내린", "Chin lowered", "lowered"], ["neutral", "중립", "Neutral", "neutral"], ["raised", "든", "Chin raised", "raised"],
  ], { custom: false }),
  shape(`${P}gaze_direction`, 488, H, fd("Gaze direction", "시선 방향"), ["gaze direction", "시선 방향", "카메라 응시", "eye contact"], NOTE("Where the eyes look — separate from the head direction and from the gaze state (Expression).", "눈이 보는 방향이며 머리 방향·시선 상태(표정)와 별개입니다."), "Gaze direction: {value}.", [
    ["camera", "카메라를 보는", "Looking at the camera", "looking at the camera", ["eye contact", "정면 응시"]], ["left", "왼쪽을 보는", "Looking left", "looking left"], ["right", "오른쪽을 보는", "Looking right", "looking right"],
    ["up", "위를 보는", "Looking up", "looking up"], ["down", "아래를 보는", "Looking down", "looking down"], ["distance", "먼 곳을 보는", "Looking into the distance", "looking into the distance"], ["away", "시선을 피한", "Looking away", "looking away"],
  ]),
];

// ── Arms & hands (4) ─────────────────────────────────────────────────────────
const A = sub("arms_hands");
const arms: Attr[] = [
  shape(`${P}arms`, 489, A, fd("Arm position", "팔 자세"), ["arms", "팔", "팔짱"], NOTE("Both arms together (per-side settings are a later extension).", "두 팔을 함께 묘사합니다(좌우 개별 설정은 후속 확장)."), "Arms: {value}.", [
    ["relaxed", "옆으로 편히", "Relaxed at sides", "relaxed at the sides"], ["crossed", "팔짱", "Crossed", "crossed", ["팔짱 낀"]], ["raised", "든", "Raised", "raised"],
    ["outstretched", "뻗은", "Outstretched", "outstretched"], ["behind_back", "등 뒤로", "Behind the back", "behind the back"],
  ]),
  shape(`${P}elbows`, 490, A, fd("Elbow position", "팔꿈치 자세"), ["elbows", "팔꿈치"], NOTE("How bent the elbows are.", "팔꿈치를 굽힌 정도입니다."), "Elbows: {value}.", [
    ["straight", "곧은", "Straight", "straight"], ["slightly_bent", "살짝 굽힌", "Slightly bent", "slightly bent"], ["bent", "굽힌", "Bent", "bent"],
  ], { custom: false }),
  shape(`${P}hand_position`, 491, A, fd("Hand position", "손 위치"), ["hands", "손 위치", "허리에 손"], NOTE("Where the hands rest.", "손이 놓인 위치입니다."), "Hands: {value}.", [
    ["at_sides", "옆에", "At sides", "at the sides"], ["on_hips", "허리에", "On hips", "on the hips"], ["in_pockets", "주머니에", "In pockets", "in the pockets"],
    ["near_face", "얼굴 가까이", "Near face", "near the face"], ["behind_head", "머리 뒤로", "Behind head", "behind the head"], ["behind_back", "등 뒤로", "Behind back", "behind the back"], ["on_lap", "무릎 위에", "Resting on lap", "resting on the lap"],
  ]),
  shape(`${P}hand_gesture`, 492, A, fd("Hand gesture", "손 제스처"), ["gesture", "손짓", "제스처", "브이"], NOTE("Combinable gestures.", "함께 고를 수 있는 제스처입니다."), "Hand gesture: {value}.", [
    ["open", "편 손", "Open hands", "open hands"], ["fists", "주먹", "Clenched fists", "clenched fists"], ["waving", "손 흔들기", "Waving", "waving"], ["peace", "브이", "Peace sign", "peace sign", ["V sign"]],
    ["pointing", "가리키기", "Pointing", "pointing"], ["thumbs_up", "엄지척", "Thumbs-up", "thumbs-up"], ["clasped", "깍지 낀", "Clasped hands", "clasped hands", ["모은 손"]],
  ], { multi: true }),
];

// ── Legs & feet (3) ──────────────────────────────────────────────────────────
const G = sub("legs_feet");
const legs: Attr[] = [
  shape(`${P}legs`, 493, G, fd("Leg position", "다리 자세"), ["legs", "다리 자세", "다리 꼰"], NOTE("Both legs together.", "두 다리를 함께 묘사합니다."), "Legs: {value}.", [
    ["together", "모은", "Together", "together"], ["apart", "벌린", "Apart", "apart"], ["crossed", "꼰", "Crossed", "crossed", ["다리 꼬기"]], ["one_bent", "한쪽 굽힌", "One leg bent", "one leg bent"], ["one_raised", "한쪽 든", "One leg raised", "one leg raised"],
  ]),
  shape(`${P}knees`, 494, G, fd("Knee position", "무릎 자세"), ["knees", "무릎"], NOTE("How bent the knees are.", "무릎을 굽힌 정도입니다."), "Knees: {value}.", [
    ["straight", "곧은", "Straight", "straight"], ["slightly_bent", "살짝 굽힌", "Slightly bent", "slightly bent"], ["bent", "굽힌", "Bent", "bent"],
  ], { custom: false }),
  shape(`${P}feet`, 495, G, fd("Foot direction", "발 방향"), ["feet", "발 방향", "팔자걸음"], NOTE("Which way the feet point.", "발끝이 향한 방향입니다."), "Feet: {value}.", [
    ["forward", "앞으로", "Forward-facing", "pointing forward"], ["inward", "안쪽으로", "Inward-facing", "turned inward"], ["outward", "바깥쪽으로", "Outward-facing", "turned outward"],
  ], { custom: false }),
];

// ── Action (4) ───────────────────────────────────────────────────────────────
const C = sub("action");
const action: Attr[] = [
  shape(`${P}action`, 496, C, fd("Action", "기본 동작"), ["action", "동작", "행동", "movement"], NOTE("Combinable; independent of the posture.", "함께 고를 수 있으며 자세와 독립적입니다."), "Action: {value}.", [
    ["walking", "걷기", "Walking", "walking"], ["running", "달리기", "Running", "running"], ["jumping", "점프", "Jumping", "jumping"], ["dancing", "춤추기", "Dancing", "dancing"],
    ["stretching", "스트레칭", "Stretching", "stretching"], ["turning", "돌아서기", "Turning", "turning"], ["reaching", "손 뻗기", "Reaching", "reaching out"], ["waving", "손 흔들기", "Waving", "waving"],
    ["sitting_down", "앉는 중", "Sitting down", "sitting down"], ["standing_up", "일어서는 중", "Standing up", "standing up"], ["reading", "읽기", "Reading", "reading"], ["writing", "쓰기", "Writing", "writing"],
  ], { multi: true, control: "searchable" }),
  shape(`${P}speed`, 497, C, fd("Movement speed", "동작 속도"), ["speed", "속도", "정지"], NOTE("Speed of the movement.", "움직임의 속도입니다."), "Movement speed: {value}.", [
    ["static", "정지", "Static", "static"], ["slow", "느린", "Slow", "slow"], ["moderate", "보통", "Moderate", "moderate"], ["fast", "빠른", "Fast", "fast"], ["very_fast", "아주 빠른", "Very fast", "very fast"],
  ], { custom: false }),
  shape(`${P}phase`, 498, C, fd("Action phase", "동작 단계"), ["phase", "동작 단계", "순간"], NOTE("Which moment of the action.", "동작의 어느 순간인지입니다."), "Action phase: {value}.", [
    ["preparation", "준비", "Preparation", "preparation"], ["mid_action", "진행 중", "Mid-action", "mid-action"], ["peak", "절정", "Peak of action", "peak of the action"], ["completion", "마무리", "Completion", "completion"],
  ], { custom: false }),
  shape(`${P}support`, 499, C, fd("Support & contact", "지지 및 접촉"), ["support", "기대기", "접촉", "앉을 곳"], NOTE("What the body rests on or holds.", "몸이 기대거나 잡고 있는 대상입니다."), "Support: {value}.", [
    ["wall", "벽에 기댄", "Leaning against a wall", "leaning against a wall"], ["chair", "의자에 앉은", "Sitting on a chair", "sitting on a chair"], ["ground", "바닥에 앉은", "Sitting on the ground", "sitting on the ground"],
    ["surface", "표면에 기댄", "Resting against a surface", "resting against a surface"], ["holding", "지지물을 잡은", "Holding onto a support", "holding onto a support"],
  ]),
];

export const poseAttributes: Attr[] = [...posture, ...head, ...arms, ...legs, ...action];

const conflict = (id: string, when: Condition[], involves: string[], en: string, ko: string): Rule => ({
  id,
  kind: "conflict",
  severity: "warning",
  when,
  involves,
  message: { en, ko },
  guidance: { en: "Neither value is changed automatically. Adjust one if this is not intended.", ko: "어느 값도 자동으로 바꾸지 않습니다. 의도한 설정이 아니라면 하나를 고치세요." },
});
const any = (attr: string, optionIds: string[]): Condition => ({ op: "anyOf", attributeId: `${P}${attr}`, optionIds });

/** Real contradictions only (non-blocking). */
export const poseRules: Rule[] = [
  conflict("pose-resting-posture-vs-locomotion", [any("posture", ["sitting", "lying_down", "reclining", "kneeling"]), any("action", ["walking", "running", "jumping"])], [`${P}posture`, `${P}action`],
    "A resting posture is combined with walking, running or jumping.", "쉬는 자세에 걷기·달리기·점프가 함께 설정되었습니다."),
  conflict("pose-static-vs-movement", [any("speed", ["static"]), any("action", ["walking", "running", "jumping", "dancing"])], [`${P}speed`, `${P}action`],
    "Static speed is combined with a moving action.", "정지 속도에 움직이는 동작이 함께 설정되었습니다."),
  conflict("pose-standing-vs-seated-support", [any("posture", ["standing"]), any("support", ["chair", "ground"])], [`${P}posture`, `${P}support`],
    "A standing posture is combined with sitting support.", "서 있는 자세에 앉은 지지가 함께 설정되었습니다."),
  conflict("pose-standing-vs-hands-on-lap", [any("posture", ["standing"]), any("hand_position", ["on_lap"])], [`${P}posture`, `${P}hand_position`],
    "Hands resting on the lap need a seated posture.", "손을 무릎 위에 두려면 앉은 자세가 필요합니다."),
  conflict("pose-crossed-arms-vs-hand-position", [any("arms", ["crossed"]), any("hand_position", ["on_hips", "in_pockets", "behind_head", "behind_back", "on_lap"])], [`${P}arms`, `${P}hand_position`],
    "Crossed arms are combined with a hand position they rule out.", "팔짱과 함께할 수 없는 손 위치가 설정되었습니다."),
  conflict("pose-crossed-arms-vs-straight-elbows", [any("arms", ["crossed"]), any("elbows", ["straight"])], [`${P}arms`, `${P}elbows`],
    "Crossed arms need bent elbows.", "팔짱을 끼려면 팔꿈치가 굽어 있어야 합니다."),
  conflict("pose-bent-posture-vs-straight-knees", [any("posture", ["kneeling", "crouching", "squatting"]), any("knees", ["straight"])], [`${P}posture`, `${P}knees`],
    "Kneeling, crouching or squatting needs bent knees.", "무릎 꿇기·웅크리기·쪼그려 앉기에는 무릎이 굽어 있어야 합니다."),
  conflict("pose-closed-eyes-vs-gaze-direction", [{ op: "anyOf", attributeId: "person.expression.eye_openness", optionIds: ["closed"] }, { op: "isSet", attributeId: `${P}gaze_direction` }], ["person.expression.eye_openness", `${P}gaze_direction`],
    "The eyes are closed, but a gaze direction is set.", "눈을 감은 상태인데 시선 방향이 설정되었습니다."),
  ...oppositeIn(poseAttributes, `${P}hand_gesture`, [["open", "fists"]]),
];
