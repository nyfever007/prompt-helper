import type { LexiconEntry, SafetyPolicy } from "./types";

/**
 * prompter.baseline — LOCAL, KEYWORD-BASED baseline content policy (v0.2.0).
 *
 * Scope (approved for Sprint 1):
 *   1. Sexualization of minors (incl. ambiguous-age words) → block
 *   2. Explicit sexual content and nudity → block
 *
 * Deliberately NOT signals: body proportions, garment fit, coverage, swimwear,
 * cleavage-free fashion terms, "shirtless", "curvy", "athletic", etc. Adult
 * visual appeal ("sexy", "sensual", "lingerie") is permitted on its own; it
 * only matters in combination with minor / ambiguous-age signals.
 *
 * LIMITATIONS (see docs/DECISIONS.md ADR-019): this is not semantic
 * moderation. It misses paraphrases, slang, misspellings, other languages and
 * images; it can produce false positives. It does not guarantee compliance
 * with any image provider's policy.
 */

const en = (...terms: string[]): LexiconEntry[] => terms.map((term) => ({ term, lang: "en" as const }));
const ko = (...terms: string[]): LexiconEntry[] => terms.map((term) => ({ term, lang: "ko" as const }));

export const baselinePolicy: SafetyPolicy = {
  id: "prompter.baseline",
  // 0.2.0 (Sprint 2-B.1): same signals, lexicon and rules; the INPUT now also covers values
  // excluded from the prompt or inapplicable, custom names/expressions, all selected options'
  // tags and structured age signals (age.minor / age.ambiguous_young). Nothing was relaxed.
  version: "0.2.0",
  signals: [
    {
      id: "age.minor",
      label: { en: "minor / child", ko: "미성년자·아동 표현" },
      tags: ["age.minor"],
      lexicon: [
        ...en(
          "child", "children", "kid", "kids", "minors", "underage", "under-age", "preteen", "pre-teen", "preteens",
          "tween", "tweens", "teen", "teens", "teenage", "teenaged", "teenager", "teenagers", "adolescent", "adolescents",
          "toddler", "toddlers", "infant", "infants", "babies", "newborn", "newborns", "schoolgirl", "schoolgirls",
          "schoolboy", "schoolboys", "school girl", "school boy", "little girl", "little girls", "little boy", "little boys",
          "young girl", "young girls", "young boy", "young boys", "loli", "lolita", "lolicon", "shota", "shotacon",
          "middle schooler", "high schooler", "elementary schooler", "kindergartner", "barely legal",
        ),
        { term: "baby", lang: "en", except: ["baby blue", "baby pink", "baby's breath", "baby face", "baby grand"] },
        { pattern: "(?<![\\p{L}\\p{N}])(?:[1-9]|1[0-7])[\\s-]?(?:years?|yrs?)[\\s-]?old(?![\\p{L}\\p{N}])", lang: "en" },
        { pattern: "(?<![\\p{L}\\p{N}])(?:[1-9]|1[0-7])[\\s-]?(?:yo|y/o)(?![\\p{L}\\p{N}])", lang: "en" },
        { pattern: "(?<![\\p{L}\\p{N}])aged\\s(?:[1-9]|1[0-7])(?![\\p{N}])", lang: "en" },
        ...ko(
          "어린이", "어린아이", "아동", "미성년", "청소년", "초등학생", "초딩", "중학생", "중딩", "고등학생", "고딩",
          "여고생", "남고생", "여중생", "남중생", "영아", "유치원생", "꼬마",
        ),
        { term: "유아", lang: "ko", except: ["유아독존", "유아인"] },
        { term: "아기", lang: "ko", except: ["아기자기"] },
        { term: "로리", lang: "ko", except: ["칼로리", "글로리", "플로리", "갤로리"] },
        { term: "쇼타", lang: "ko", except: ["쇼타임"] },
        { pattern: "(?<![0-9])(?:[1-9]|1[0-7])\\s?(?:살|세)(?![기대트])", lang: "ko" },
      ],
    },
    {
      id: "age.ambiguous_young",
      label: { en: "ambiguous-age wording", ko: "나이가 모호한 표현" },
      tags: ["age.ambiguous_young"],
      lexicon: [
        ...en("girl", "girls", "boy", "boys", "school uniform", "young-looking", "childlike", "child-like"),
        ...ko("소녀", "소년", "교복", "여학생", "남학생"),
        { term: "학생", lang: "ko", except: ["대학생", "대학원생", "학생증"] },
      ],
    },
    {
      id: "appeal.sexualized",
      label: { en: "sexual appeal", ko: "성적 매력·암시 표현" },
      tags: ["appeal.suggestive", "appeal.sexualized"],
      lexicon: [
        ...en(
          "sexy", "sexier", "sexiest", "seductive", "seductively", "seduce", "seducing", "sensual", "sensually",
          "erotic", "erotica", "provocative", "provocatively", "lingerie", "underwear", "panties", "bra", "lewd",
          "suggestive", "sultry", "steamy", "boudoir", "pin-up", "pinup", "fetish", "kinky", "cleavage", "busty",
          "bedroom eyes", "come-hither",
        ),
        ...ko(
          "섹시", "야한", "야하게", "야릇", "관능", "선정적", "선정성", "유혹", "에로", "란제리", "속옷", "팬티",
          "브래지어", "가슴골", "도발적", "요염", "음탕", "퇴폐", "페티시",
        ),
      ],
    },
    {
      id: "content.explicit_sexual",
      label: { en: "explicit sexual content", ko: "노골적 성적 내용" },
      tags: ["content.explicit_sexual"],
      lexicon: [
        ...en(
          "porn", "porno", "pornography", "pornographic", "hentai", "nsfw", "xxx", "sex act", "sex acts", "sexual act",
          "sexual acts", "sex scene", "sex scenes", "sexual intercourse", "intercourse", "having sex", "oral sex",
          "sex toy", "sex toys", "orgasm", "orgasms", "masturbation", "masturbating", "masturbate", "genital",
          "genitals", "genitalia", "penis", "penises", "vagina", "vaginas", "vulva", "ejaculation", "rape",
          "sexual assault", "bdsm", "explicit sex", "explicit sexual",
        ),
        ...ko("포르노", "야동", "음란물", "음란", "성행위", "섹스", "성관계", "오르가즘", "음경", "강간", "성폭행", "야설"),
        { term: "성교", lang: "ko", except: ["성교육"] },
        { term: "성기", lang: "ko", except: ["성기사"] },
        { term: "자위", lang: "ko", except: ["자위대", "자위권", "자위적"] },
        { term: "정사", lang: "ko", except: ["정사각", "정사진", "정사영", "정사면", "정사회"] },
      ],
    },
    {
      id: "exposure.nudity",
      label: { en: "nudity", ko: "나체·성적 부위 노출" },
      tags: ["exposure.nudity"],
      lexicon: [
        {
          term: "nude",
          lang: "en",
          except: [
            "nude lipstick", "nude lip", "nude lips", "nude makeup", "nude make-up", "nude color", "nude colour",
            "nude-colored", "nude-coloured", "nude tone", "nude tones", "nude heels", "nude pumps", "nude shoes",
            "nude palette", "nude beige", "nude nail", "nude nails", "nude shade", "nude dress",
          ],
        },
        { term: "naked", lang: "en", except: ["naked eye", "naked flame", "naked branches", "naked tree", "naked trees"] },
        ...en(
          "nudes", "nudity", "topless", "bottomless", "unclothed", "without clothes", "without clothing", "no clothes",
          "bare breasts", "bare breast", "exposed breasts", "exposed breast", "exposed nipples", "nipple", "nipples",
          "bare buttocks", "exposed buttocks",
        ),
        {
          term: "누드",
          lang: "ko",
          except: [
            "누드톤", "누드 톤", "누드메이크업", "누드 메이크업", "누드립", "누드 립", "누드컬러", "누드 컬러",
            "누드베이지", "누드 베이지", "누드네일", "누드 네일", "누드김밥", "누드 김밥",
          ],
        },
        ...ko("알몸", "나체", "벌거벗", "젖꼭지", "유두"),
        { term: "전라", lang: "ko", except: ["전라도", "전라남도", "전라북도", "전라선", "전라권"] },
      ],
    },
  ],
  rules: [
    {
      id: "minor-sexualization",
      category: "sexual_minors",
      severity: "block",
      allOf: [
        ["age.minor", "age.ambiguous_young"],
        ["appeal.sexualized", "content.explicit_sexual", "exposure.nudity"],
      ],
      message: {
        en: "Words that indicate (or may indicate) a minor are combined with sexual or nudity wording.",
        ko: "미성년자이거나 미성년자로 보일 수 있는 표현이 성적·노출 표현과 함께 사용되었습니다.",
      },
      guidance: {
        en: "Sexualized depictions of minors are never allowed. If every person is an adult, say so explicitly (e.g. “adult woman”, “adult man”) instead of words like “girl”/“boy”. If a minor is present, remove the sexual or nudity wording.",
        ko: "미성년자를 성적으로 묘사하는 내용은 허용되지 않습니다. 등장인물이 모두 성인이라면 ‘소녀/girl’ 대신 ‘성인 여성/adult woman’처럼 명확히 표현하세요. 미성년자가 포함된 장면이라면 성적·노출 표현을 제거하세요.",
      },
    },
    {
      id: "explicit-sexual-content",
      category: "sexual_explicit",
      severity: "block",
      allOf: [["content.explicit_sexual"]],
      message: { en: "Explicit sexual content is not supported.", ko: "노골적인 성적 내용은 지원하지 않습니다." },
      guidance: {
        en: "Remove the explicit sexual wording. Non-explicit adult fashion, appearance and mood can be described.",
        ko: "노골적인 성적 표현을 제거하세요. 성인의 패션, 외형, 분위기 등 노골적이지 않은 표현은 사용할 수 있습니다.",
      },
    },
    {
      id: "nudity",
      category: "sexual_explicit",
      severity: "block",
      allOf: [["exposure.nudity"]],
      message: { en: "Nudity is not supported.", ko: "나체 또는 성적 부위 노출 표현은 지원하지 않습니다." },
      guidance: {
        en: "Describe clothing instead (any style, fit or coverage of clothing is fine), or remove the nudity wording.",
        ko: "나체 표현 대신 의상을 묘사하세요(의상의 스타일, 핏, 노출 범위는 자유롭게 지정할 수 있습니다).",
      },
    },
  ],
};
