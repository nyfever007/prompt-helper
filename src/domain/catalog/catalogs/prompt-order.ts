/**
 * Prompt output order (TD-08, Sprint 2-C.2) — the ONLY source of the order in which the compiler
 * emits sentences. It is independent of the UI: attribute `order` and categories decide where an
 * attribute is shown in the editor; this file decides where its sentence appears in the prompt.
 *
 * - Groups are emitted in the order listed; inside a group, attributes are emitted in list order.
 * - Every catalog attribute appears exactly once (catalog integrity check — a missing or duplicate
 *   id is an error, so a new attribute must be placed here explicitly).
 * - Adding an attribute = inserting its id where its sentence belongs. No other attribute changes,
 *   no numbers are renumbered.
 * - Initial content (core 0.11.0) reproduces the 0.10.0 output order exactly
 *   (tests/fixtures/golden-prompt-order-0.10.0.json).
 */
import type { PromptGroup } from "../schema";

/** `ids("person.face.", ["shape", "length"])` → ["person.face.shape", "person.face.length"] (readability only). */
const ids = (prefix: string, names: readonly string[]): string[] => names.map((n) => `${prefix}${n}`);

export const corePromptOrder: PromptGroup[] = [
  // What the image is about: intent, main subject, appearance direction.
  {
    id: "subject",
    attributes: [
      "intent.description",
      "subject.kind",
      "person.appearance.direction",
    ],
  },
  // Person › Identity.
  {
    id: "person_identity",
    attributes: [
      ...ids("person.identity.", ["entity_type", "species", "character_origin", "age_group", "age", "apparent_age", "gender", "gender_presentation", "nationality", "ethnic_background", "cultural_background", "historical_period", "occupation", "narrative_role", "social_status", "description"]),
    ],
  },
  // Person › Face, eyes, eyebrows, nose, lips.
  {
    id: "person_face",
    attributes: [
      ...ids("person.face.", ["shape", "length", "width", "forehead_height", "forehead_width", "cheekbones", "jawline", "chin", "cheeks", "symmetry"]),
      ...ids("person.eyes.", ["shape", "size", "width", "height", "spacing", "outer_corner_angle", "depth", "eyelids", "iris_color", "iris_size", "pupil_shape", "lash_length", "lash_density"]),
      ...ids("person.eyebrows.", ["shape", "thickness", "length", "density", "angle", "height", "spacing", "color"]),
      ...ids("person.nose.", ["shape", "length", "width", "bridge_height", "bridge_shape", "tip_shape", "tip_angle", "alar_width"]),
      ...ids("person.lips.", ["shape", "mouth_width", "upper_thickness", "lower_thickness", "ratio", "cupids_bow", "corners", "natural_color"]),
    ],
  },
  // Person › Skin, hair, facial hair.
  {
    id: "person_skin_hair",
    attributes: [
      ...ids("person.skin.", ["tone", "undertone", "texture", "sheen", "hydration", "pores", "translucency", "evenness", "freckle_density", "freckle_placement", "moles", "mole_placement", "wrinkles", "wrinkle_placement", "scars", "features"]),
      ...ids("person.hair.", ["presence", "length", "primary_color", "secondary_color", "color_pattern", "texture", "thickness", "density", "volume", "shine", "condition", "curl_size", "curl_tightness", "part", "hairline", "bangs_style", "bangs_length", "bangs_density", "style", "tie_position", "layering", "flyaways", "movement"]),
      ...ids("person.facial_hair.", ["style", "length", "density", "color", "grooming", "texture"]),
    ],
  },
  // Person › Body.
  {
    id: "person_body",
    attributes: [
      ...ids("person.body.", ["height", "build", "frame", "muscle_mass", "muscle_definition", "body_fat", "silhouette", "proportions", "head_size", "heads_tall", "upper_body_length", "lower_body_length", "upper_lower_ratio", "neck_length", "neck_thickness", "shoulder_width", "shoulder_slope", "collarbones", "rib_cage_width", "chest_volume", "pectorals", "waist_width", "waist_curvature", "abdomen", "abs_definition", "back_width", "back_muscles", "pelvis_width", "gluteal_volume", "gluteal_shape", "waist_hip_contrast", "arm_length", "upper_arm_thickness", "forearm_thickness", "arm_muscles", "hand_size", "finger_length", "finger_thickness", "leg_length", "thigh_thickness", "calf_thickness", "leg_muscles", "ankle_thickness", "foot_size", "leg_alignment"]),
    ],
  },
  // Person › Expression, impression, makeup.
  {
    id: "person_expression",
    attributes: [
      ...ids("person.expression.", ["emotion", "emotion_intensity", "smile", "mouth_openness", "teeth", "eye_openness", "brow_movement", "gaze_state", "tears", "facial_tension"]),
      ...ids("person.impression.", ["overall", "vibe", "attractiveness", "cuteness", "elegance", "charisma", "androgyny", "maturity"]),
      ...ids("person.makeup.", ["presence", "style", "intensity", "base_coverage", "base_finish", "eyeshadow_color", "eyeshadow_style", "eyeliner_style", "eyeliner_color", "mascara", "false_lashes", "blush_color", "blush_placement", "lip_color", "lip_finish", "contour"]),
    ],
  },
  // Person › Wardrobe (overall, then each garment).
  {
    id: "person_wardrobe",
    attributes: [
      ...ids("person.clothing.", ["fashion_style", "formality", "fit", "season", "era", "condition", "layering", "coverage"]),
      ...ids("person.clothing.tops.", ["type", "primary_color", "secondary_color", "material", "pattern", "fit", "neckline", "collar", "sleeve_length", "sleeve_style", "length", "details"]),
      ...ids("person.clothing.bottoms.", ["type", "primary_color", "secondary_color", "material", "pattern", "fit", "waist_rise", "leg_cut", "hem_length", "details"]),
      ...ids("person.clothing.one_piece.", ["type", "primary_color", "secondary_color", "material", "pattern", "fit", "neckline", "sleeve_length", "sleeve_style", "waist_design", "hem_length", "skirt_silhouette", "details"]),
      ...ids("person.clothing.outerwear.", ["type", "primary_color", "secondary_color", "material", "pattern", "fit", "length", "closure_state", "closure_type", "hood", "details"]),
      ...ids("person.clothing.innerwear.", ["type", "primary_color", "material", "pattern"]),
      ...ids("person.clothing.footwear.", ["type", "primary_color", "secondary_color", "material", "heel_height", "heel_type", "toe_shape", "closure"]),
      ...ids("person.clothing.hosiery.", ["type", "primary_color", "pattern", "length", "opacity", "thickness"]),
    ],
  },
  // Person › Accessories.
  {
    id: "person_accessories",
    attributes: [
      ...ids("person.accessories.", ["eyewear", "frame_shape", "frame_color", "hat", "hat_color", "hair_accessories", "earrings", "necklace", "bracelets", "rings", "watch", "belt", "bag", "scarf", "gloves", "necktie", "piercings", "decorative"]),
    ],
  },
  // Person › Pose & action.
  {
    id: "person_pose",
    attributes: [
      ...ids("person.pose.", ["posture", "body_orientation", "torso_rotation", "torso_lean", "weight_shift", "balance", "tension", "head_direction", "head_tilt", "chin", "gaze_direction", "arms", "elbows", "hand_position", "hand_gesture", "legs", "knees", "feet", "action", "speed", "phase", "support"]),
    ],
  },
  // Style (preset, then axes).
  {
    id: "style",
    attributes: [
      ...ids("style.", ["preset", "medium", "realism", "technique", "movement", "aesthetic"]),
    ],
  },
  // Framing, viewpoint and camera.
  {
    id: "composition",
    attributes: [
      ...ids("composition.", ["framing", "view_direction"]),
      ...ids("camera.", ["angle", "distance", "roll"]),
      ...ids("composition.", ["layout", "negative_space", "subject_position"]),
      ...ids("camera.", ["lens_type", "focal_length", "projection", "perspective", "aperture", "depth_of_field", "focus_target", "focus_sharpness", "bokeh", "motion_blur"]),
    ],
  },
  // Place & background.
  {
    id: "scene",
    attributes: [
      ...ids("scene.", ["setting", "background"]),
    ],
  },
  // Mood.
  {
    id: "mood",
    attributes: [
      "mood.tone",
    ],
  },
  // Lighting (preset, then properties).
  {
    id: "lighting",
    attributes: [
      ...ids("lighting.", ["preset", "source", "direction", "key_height", "softness", "intensity", "color_temperature", "key_color", "contrast", "fill", "rim", "rim_color", "ambient", "shadow_strength", "shadow_edge", "reflected", "volumetric", "source_visibility"]),
    ],
  },
  // Output (parameters).
  {
    id: "output",
    attributes: [
      "output.aspect_ratio",
    ],
  },
];
