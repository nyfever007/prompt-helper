import type { Condition } from "../catalog/schema";

/**
 * Random styles (Sprint 2-D.7, ADR-069).
 *
 * - `natural` (default): values that belong together — the existing conflict rules are avoided, typical
 *   context (`suggestedWhen`) and the relations below are preferred, unusual or extreme options are rare,
 *   sliders stay near the middle, decoration is limited and optional details may stay unset.
 * - `creative`: still coherent (contradictions are avoided) but unusual choices are welcome.
 * - `chaos`: the Sprint 2-D.6 whole-catalog generation, unchanged.
 *
 * The data here is product knowledge for random generation only. It never changes the catalog, a
 * user's choice, the applicability rules or the safety policy, and every id it names is checked
 * against the core catalog in tests.
 */
export const RANDOM_STYLES = ["natural", "creative", "chaos"] as const;
export type RandomStyle = (typeof RANDOM_STYLES)[number];
export const DEFAULT_RANDOM_STYLE: RandomStyle = "natural";

export interface StyleProfile {
  /** Chance of filling an applicable, unset attribute by importance (1 core, 2 meaningful, 3 fine). */
  fill: Record<1 | 2 | 3, number>;
  /** Extra chance factor for optional decorative attributes (see OPTIONAL). */
  optional: number;
  /** Weight factors for `odd` (unusual but plausible) and `rare` (fantastical or extreme) options. */
  odd: number;
  rare: number;
  /** Weight factor for an option whose `suggestedWhen` context does not hold. */
  atypical: number;
  /** Weight factors from RELATIONS. */
  prefer: number;
  avoid: number;
  /** Conflict rules a candidate must not trigger: all, contradictions only. */
  avoidRules: "all" | "contradiction";
  /** Share of a slider's range around its middle that values come from (1 = whole range). */
  spread: number;
  /** Chance of 2 and 3 values in a multi-select. */
  multi: [number, number];
  /** Accessories with a real item (not "none") at most. */
  accessories: number;
}

export const PROFILES: Record<Exclude<RandomStyle, "chaos">, StyleProfile> = {
  natural: { fill: { 1: 1, 2: 0.7, 3: 0.2 }, optional: 0.35, odd: 0.12, rare: 0.01, atypical: 0.04, prefer: 6, avoid: 0.03, avoidRules: "all", spread: 0.5, multi: [0, 0], accessories: 2 },
  creative: { fill: { 1: 1, 2: 0.85, 3: 0.45 }, optional: 0.6, odd: 0.6, rare: 0.12, atypical: 0.35, prefer: 3, avoid: 0.25, avoidRules: "contradiction", spread: 0.85, multi: [0.25, 0], accessories: 4 },
};

/** Decoration and niche details that are naturally often left unset. */
export const OPTIONAL = [
  /^person\.accessories\./,
  /^person\.skin\.(features|scars|moles|freckle_density|wrinkles)$/,
  /^person\.hair\.(color_pattern|secondary_color|condition)$/,
  /^person\.clothing\.[a-z_]+\.(details|pattern|secondary_color)$/,
  /^person\.clothing\.(hosiery\.type|condition|layering)$/,
  /^person\.expression\.tears$/,
  /^person\.identity\.(nationality|ethnic_background|cultural_background|historical_period|occupation|narrative_role|social_status|character_origin|gender_presentation)$/,
  /^person\.impression\./,
  /^person\.makeup\.(eyeshadow_style|eyeliner_style|blush_placement|false_lashes|contour)$/,
  /^person\.pose\.(support|hand_gesture)$/,
  /^camera\.motion_blur$/,
  /^lighting\.(volumetric|rim|rim_color|reflected)$/,
];

/** Option keys: an option id (also matches its child options) or `group:<id>` (a display group). */
type Keys = readonly string[];

/** Unusual but plausible choices. */
export const ODD: Record<string, Keys> = {
  "person.identity.age_group": ["advanced_age"],
  "person.identity.character_origin": ["mythological"],
  "person.hair.length": ["knee", "floor", "extremely_short"],
  "person.hair.presence": ["shaved", "bald", "partial_loss"],
  "person.hair.color_pattern": ["split_dyed", "dip_dyed", "contrasting_roots"],
  "person.hair.style": ["mohawk", "flat_top", "bouffant", "space_buns", "finger_waves", "pin_curls"],
  "person.hair.condition": ["unkempt", "wet", "frizzy"],
  "person.facial_hair.style": ["handlebar_mustache", "mutton_chops", "braided_beard", "soul_patch", "chevron_mustache", "pencil_mustache"],
  "person.skin.features": ["vitiligo", "stretch_marks", "visible_veins", "dry_patches", "acne"],
  "person.skin.scars": ["burn", "surgical"],
  "person.body.build": ["heavyset"],
  "person.body.proportions": ["exaggerated", "elongated"],
  "person.expression.emotion": ["disgusted", "contemptuous", "fearful"],
  "person.expression.tears": ["welling", "watery"],
  "person.expression.smile": ["asymmetric"],
  "person.makeup.style": ["gothic", "editorial", "graphic", "vintage", "retro", "full_glam"],
  "person.clothing.fashion_style": ["haute_couture", "military", "steampunk", "gothic", "punk"],
  "person.clothing.condition": ["weathered", "distressed", "patched"],
  "person.clothing.era": ["baroque", "victorian", "edwardian", "renaissance"],
  "person.accessories.eyewear": ["monocle", "protective_goggles", "fashion_goggles"],
  "person.accessories.hat": ["top_hat", "bowler_hat", "bonnet", "cowboy_hat"],
  "person.accessories.piercings": ["septum", "eyebrow", "lip", "nose_ring"],
  "person.pose.posture": ["squatting", "crouching", "reclining"],
  "person.pose.speed": ["very_fast"],
  "style.preset": ["low_poly", "claymation", "pixel_art", "ukiyo_e", "art_nouveau", "cyberpunk_art"],
  "scene.setting": ["underwater", "desert", "snowfield"],
  "camera.angle": ["birds_eye", "worms_eye"],
  "camera.roll": ["tilted_left", "tilted_right"],
  "camera.lens_type": ["ultra_wide", "macro"],
  "camera.focal_length": ["mm_14", "mm_200"],
  "camera.aperture": ["f_16", "f_22"],
  "camera.motion_blur": ["moderate"],
  "lighting.intensity": ["very_dim", "very_bright"],
  "lighting.color_temperature": ["very_cool", "very_warm", "mixed_color"],
  "lighting.key_color": ["group:vivid", "group:cool"],
  "lighting.volumetric": ["moderate"],
  "mood.tone": ["eerie", "tense"],
};

/** Fantastical or extreme choices: rare in Natural, occasional in Creative. */
export const RARE: Record<string, Keys> = {
  "person.identity.entity_type": ["fantasy_humanoid", "alien_humanoid", "android", "cyborg", "humanoid_robot", "anthropomorphic", "supernatural", "mythological", "artificial_life"],
  "person.identity.age_group": ["ageless"],
  // a hybrid asks for a free-text description, which random generation never writes
  "person.identity.species": ["hybrid"],
  "person.eyes.iris_color": ["violet", "red", "gold", "silver"],
  "person.eyes.pupil_shape": ["vertical_slit", "horizontal_slit", "star", "heart"],
  "person.skin.tone": ["group:fantasy"],
  "person.hair.primary_color": ["group:fantasy"],
  "person.hair.secondary_color": ["group:fantasy"],
  "person.facial_hair.color": ["group:fantasy"],
  "person.makeup.style": ["theatrical", "fantasy", "avant_garde"],
  "person.makeup.lip_color": ["group:creative", "group:metallic"],
  "person.makeup.eyeliner_color": ["group:creative", "group:metallic"],
  "person.makeup.blush_color": ["group:creative", "group:metallic"],
  "person.makeup.eyeshadow_color": ["group:creative"],
  "person.body.proportions": ["chibi"],
  "person.expression.tears": ["streaming"],
  "person.clothing.fashion_style": ["futuristic", "cyberpunk", "fantasy"],
  "person.clothing.condition": ["tattered"],
  "person.clothing.era": ["ancient", "medieval", "futuristic"],
  "person.identity.historical_period": ["prehistoric", "far_future", "fictional"],
  "scene.setting": ["outer_space", "fantasy_world"],
  "camera.roll": ["dutch"],
  "camera.lens_type": ["fisheye"],
  "camera.projection": ["orthographic"],
  "camera.perspective": ["exaggerated"],
  "camera.motion_blur": ["strong"],
  "lighting.volumetric": ["strong"],
};

/** When every condition holds, options of other attributes are preferred or avoided. */
export interface Relation {
  when: Condition[];
  prefer?: Record<string, Keys>;
  avoid?: Record<string, Keys>;
}
const is = (attributeId: string, ...optionIds: string[]): Condition => ({ op: "anyOf", attributeId, optionIds });

const OUTDOOR = ["nature", "urban", "outer_space", "fantasy_world"];
const CLOSE = ["extreme_close_up", "face_close_up", "head_and_shoulders"];
const WIDE = ["wide_shot", "extreme_wide", "panoramic", "full_view"];
const HAPPY = ["happy", "excited", "content"];
const GLOOMY = ["melancholic", "eerie", "tense"];

export const RELATIONS: Relation[] = [
  // subject, species and character
  { when: [is("person.identity.entity_type", "human")], prefer: { "person.identity.species": ["human"], "person.identity.character_origin": ["original", "fictional"] } },
  { when: [is("person.identity.species", "human")], avoid: { "person.eyes.pupil_shape": ["vertical_slit", "horizontal_slit", "star", "heart"], "person.skin.tone": ["group:fantasy"] } },
  { when: [is("person.identity.gender", "woman")], prefer: { "person.identity.gender_presentation": ["feminine"], "person.facial_hair.style": ["clean_shaven"] } },
  { when: [is("person.identity.gender", "man")], prefer: { "person.identity.gender_presentation": ["masculine"], "person.makeup.presence": ["none"] } },
  { when: [is("person.identity.age_group", "young_adult", "adult")], avoid: { "person.hair.primary_color": ["group:gray"], "person.skin.wrinkles": ["deep", "pronounced"] } },
  { when: [is("person.identity.age_group", "older_adult", "advanced_age")], prefer: { "person.hair.primary_color": ["group:gray"] } },
  { when: [is("person.identity.historical_period", "medieval")], prefer: { "person.clothing.era": ["medieval"] } },
  { when: [is("person.identity.historical_period", "contemporary")], prefer: { "person.clothing.era": ["contemporary"] }, avoid: { "person.clothing.fashion_style": ["fantasy", "steampunk"] } },
  // hair style, length and texture
  { when: [is("person.hair.length", "extremely_short", "ear")], prefer: { "person.hair.style": ["group:short", "group:sides"] }, avoid: { "person.hair.style": ["group:ponytail", "group:bun", "group:braids", "group:half_up"] } },
  { when: [is("person.hair.length", "chin", "neck")], prefer: { "person.hair.style": ["group:bob", "group:layered"] } },
  { when: [is("person.hair.length", "shoulder", "chest", "mid_back", "waist", "hip", "knee", "floor")], avoid: { "person.hair.style": ["group:short", "group:sides", "group:bob"] } },
  { when: [is("person.hair.texture", "straight")], avoid: { "person.hair.style": ["afro", "finger_coils", "pin_curls", "finger_waves"] } },
  { when: [is("person.hair.texture", "coily", "tightly_curly")], prefer: { "person.hair.style": ["afro", "finger_coils", "locs", "box_braids", "cornrows"] } },
  // clothing, style, season and place
  { when: [is("scene.setting", "beach")], prefer: { "person.clothing.season": ["summer"], "person.clothing.footwear.type": ["group:open", "none"] }, avoid: { "person.clothing.outerwear.type": ["group:coats"] } },
  { when: [is("scene.setting", "snowfield", "mountains")], prefer: { "person.clothing.season": ["winter"], "person.clothing.footwear.type": ["group:boots"] } },
  { when: [is("scene.setting", "office")], prefer: { "person.clothing.fashion_style": ["business", "business_casual", "smart_casual", "formal"] } },
  { when: [is("scene.setting", "fantasy_world")], prefer: { "person.clothing.fashion_style": ["fantasy"], "person.identity.historical_period": ["fictional", "medieval"] } },
  { when: [is("scene.setting", "outer_space")], prefer: { "person.clothing.fashion_style": ["futuristic", "techwear"] } },
  { when: [is("person.clothing.season", "summer")], prefer: { "person.clothing.outerwear.type": ["none"], "person.clothing.tops.type": ["group:tees", "group:sleeveless", "linen_shirt"], "person.clothing.footwear.type": ["group:open", "group:sneakers"] }, avoid: { "person.clothing.outerwear.type": ["group:coats", "puffer_jacket"], "person.clothing.tops.type": ["group:knits"], "person.accessories.gloves": ["leather", "knitted", "mittens"], "person.accessories.scarf": ["knitted", "wool"] } },
  { when: [is("person.clothing.season", "winter")], prefer: { "person.clothing.outerwear.type": ["group:coats", "puffer_jacket"], "person.clothing.tops.type": ["group:knits"], "person.clothing.footwear.type": ["group:boots"] }, avoid: { "person.clothing.outerwear.type": ["none"], "person.clothing.tops.type": ["group:sleeveless"], "person.clothing.footwear.type": ["group:open"], "person.clothing.bottoms.type": ["group:shorts"] } },
  { when: [is("person.clothing.fashion_style", "formal", "business")], prefer: { "person.clothing.tops.type": ["group:shirts"], "person.clothing.bottoms.type": ["group:trousers", "pencil_skirt"], "person.clothing.footwear.type": ["group:shoes"], "person.clothing.outerwear.type": ["group:tailored", "none"] }, avoid: { "person.clothing.tops.type": ["graphic_tee", "hoodie", "crop_top"], "person.clothing.footwear.type": ["group:sneakers", "flip_flops", "slides"] } },
  { when: [is("person.clothing.fashion_style", "streetwear", "casual")], prefer: { "person.clothing.tops.type": ["group:tees", "hoodie", "sweatshirt"], "person.clothing.bottoms.type": ["group:jeans", "cargo_pants", "joggers"], "person.clothing.footwear.type": ["group:sneakers"] } },
  { when: [is("person.clothing.fashion_style", "sportswear")], prefer: { "person.clothing.tops.type": ["group:tees", "tank_top", "hoodie"], "person.clothing.bottoms.type": ["joggers", "shorts", "leggings", "cycling_shorts"], "person.clothing.footwear.type": ["running_shoes", "sneakers"] } },
  { when: [is("person.clothing.fashion_style", "traditional")], prefer: { "person.clothing.one_piece.type": ["group:traditional"] } },
  { when: [is("person.clothing.fashion_style", "minimalist", "formal", "business")], prefer: { "person.clothing.tops.pattern": ["solid"], "person.clothing.bottoms.pattern": ["solid"], "person.clothing.one_piece.pattern": ["solid"] } },
  // accessories (their number is limited by the style profile)
  { when: [is("person.accessories.eyewear", "sunglasses")], prefer: { "lighting.preset": ["midday_sun", "natural_daylight", "golden_hour"] } },
  // emotion, expression and mood
  { when: [is("mood.tone", "cheerful", "energetic", "cozy", "romantic", "whimsical")], prefer: { "person.expression.emotion": [...HAPPY, "curious"] }, avoid: { "person.expression.emotion": ["sad", "angry", "fearful", "disgusted", "contemptuous"] } },
  { when: [is("mood.tone", ...GLOOMY)], prefer: { "person.expression.emotion": ["sad", "worried", "fearful", "neutral"] }, avoid: { "person.expression.emotion": HAPPY } },
  { when: [is("mood.tone", "calm", "nostalgic", "mysterious")], prefer: { "person.expression.emotion": ["neutral", "content", "curious"] } },
  { when: [is("mood.tone", "dramatic", "epic")], prefer: { "person.expression.emotion": ["determined", "angry", "surprised"] } },
  { when: [is("person.expression.emotion", ...HAPPY)], prefer: { "person.expression.smile": ["gentle", "broad", "open_mouth", "closed_mouth"], "person.expression.tears": ["none"] }, avoid: { "person.expression.smile": ["none"], "person.expression.tears": ["welling", "streaming"] } },
  { when: [is("person.expression.emotion", "sad", "angry", "fearful", "worried", "disgusted", "contemptuous", "bored")], prefer: { "person.expression.smile": ["none"] }, avoid: { "person.expression.smile": ["broad", "open_mouth"] } },
  { when: [is("person.expression.emotion", "neutral", "determined", "curious", "confused")], prefer: { "person.expression.smile": ["none", "faint"], "person.expression.tears": ["none"] } },
  { when: [is("person.expression.emotion", "sad")], prefer: { "person.expression.tears": ["none", "watery"] } },
  // pose and action
  { when: [is("person.pose.action", "walking", "running", "jumping", "dancing")], prefer: { "person.pose.posture": ["standing"] }, avoid: { "person.pose.posture": ["sitting", "lying_down", "reclining", "kneeling"] } },
  { when: [is("person.pose.action", "running", "jumping")], prefer: { "person.pose.speed": ["fast", "moderate"] } },
  { when: [is("person.pose.posture", "sitting")], prefer: { "person.pose.support": ["chair", "surface"], "person.pose.action": ["reading", "writing"] } },
  { when: [is("person.pose.posture", "lying_down", "reclining")], prefer: { "person.pose.support": ["ground", "surface"] }, avoid: { "person.pose.action": ["walking", "running", "jumping", "dancing"] } },
  // camera, lens and framing
  { when: [is("composition.framing", ...CLOSE)], prefer: { "camera.lens_type": ["standard", "telephoto"], "camera.focal_length": ["mm_50", "mm_70", "mm_85", "mm_105", "mm_135"], "camera.aperture": ["f_1_4", "f_1_8", "f_2", "f_2_8"] }, avoid: { "camera.lens_type": ["ultra_wide", "fisheye"] } },
  { when: [is("composition.framing", "upper_body", "knees_up", "full_body")], prefer: { "camera.lens_type": ["standard"], "camera.focal_length": ["mm_35", "mm_50", "mm_85"] } },
  { when: [is("composition.framing", ...WIDE)], prefer: { "camera.lens_type": ["wide", "ultra_wide"], "camera.focal_length": ["mm_14", "mm_20", "mm_24", "mm_28", "mm_35"], "camera.aperture": ["f_5_6", "f_8", "f_11"] }, avoid: { "camera.lens_type": ["telephoto", "macro"] } },
  { when: [is("camera.lens_type", "telephoto")], prefer: { "camera.focal_length": ["mm_85", "mm_105", "mm_135", "mm_200"], "camera.perspective": ["compressed"] } },
  { when: [is("camera.lens_type", "wide", "ultra_wide")], prefer: { "camera.focal_length": ["mm_14", "mm_20", "mm_24", "mm_28"] } },
  { when: [is("camera.lens_type", "standard")], prefer: { "camera.focal_length": ["mm_35", "mm_50"], "camera.perspective": ["natural"] } },
  // lighting, time of day and environment
  { when: [is("scene.setting", ...OUTDOOR)], prefer: { "lighting.preset": ["natural_daylight", "golden_hour", "overcast", "blue_hour", "midday_sun"] }, avoid: { "lighting.preset": ["studio_softbox", "high_key"] } },
  { when: [is("scene.setting", "studio")], prefer: { "lighting.preset": ["studio_softbox", "high_key", "low_key", "backlit_rim"], "scene.background": ["plain", "gradient"] }, avoid: { "lighting.preset": ["midday_sun", "golden_hour", "moonlight", "blue_hour"] } },
  { when: [is("scene.setting", "indoors")], prefer: { "lighting.preset": ["natural_daylight", "candlelight", "low_key"] }, avoid: { "lighting.preset": ["midday_sun", "moonlight"] } },
  { when: [is("scene.setting", "city_street")], prefer: { "lighting.preset": ["neon", "blue_hour", "golden_hour", "overcast"] } },
  { when: [is("lighting.preset", "golden_hour", "candlelight")], prefer: { "lighting.color_temperature": ["warm", "very_warm"], "lighting.softness": ["soft", "very_soft"] }, avoid: { "lighting.color_temperature": ["cool", "very_cool"] } },
  { when: [is("lighting.preset", "moonlight", "blue_hour")], prefer: { "lighting.color_temperature": ["cool", "very_cool"], "lighting.intensity": ["dim", "very_dim"] }, avoid: { "lighting.color_temperature": ["warm", "very_warm"] } },
  { when: [is("lighting.preset", "neon")], prefer: { "lighting.color_temperature": ["mixed_color"], "lighting.key_color": ["group:vivid", "group:cool"] } },
  { when: [is("lighting.preset", "natural_daylight", "midday_sun", "overcast")], prefer: { "lighting.color_temperature": ["neutral"], "lighting.key_color": ["group:whites"] } },
  { when: [is("lighting.preset", "golden_hour", "midday_sun", "natural_daylight")], prefer: { "lighting.source": ["sun", "daylight_sky"] }, avoid: { "lighting.source": ["moon", "fire", "neon"] } },
  { when: [is("lighting.preset", "moonlight")], prefer: { "lighting.source": ["moon"] }, avoid: { "lighting.source": ["sun", "daylight_sky", "studio", "softbox"] } },
  { when: [is("lighting.preset", "neon")], prefer: { "lighting.source": ["neon", "practical"] } },
  { when: [is("lighting.preset", "candlelight")], prefer: { "lighting.source": ["fire"] } },
  { when: [is("lighting.preset", "studio_softbox", "high_key", "low_key")], prefer: { "lighting.source": ["studio", "softbox"] } },
  { when: [is("lighting.preset", "low_key")], prefer: { "lighting.contrast": ["high", "very_high"], "mood.tone": ["dramatic", "mysterious"] } },
  { when: [is("lighting.preset", "high_key")], prefer: { "lighting.contrast": ["low", "very_low"], "mood.tone": ["cheerful", "calm"] } },
  { when: [is("mood.tone", "cozy", "romantic", "nostalgic")], prefer: { "lighting.color_temperature": ["warm"], "lighting.preset": ["golden_hour", "candlelight"] } },
  { when: [is("mood.tone", "eerie", "mysterious")], prefer: { "lighting.preset": ["moonlight", "low_key", "blue_hour"], "lighting.intensity": ["dim"] } },
];
