/**
 * Script detection for the mixed-language notice. This is NOT language
 * detection: it only recognizes non-Latin scripts. Other Latin-script
 * languages (French, Spanish, …) are not detected.
 */
const SCRIPTS: ReadonlyArray<[string, RegExp]> = [
  ["Hangul", /\p{Script=Hangul}/u],
  ["Han", /\p{Script=Han}/u],
  ["Hiragana", /\p{Script=Hiragana}/u],
  ["Katakana", /\p{Script=Katakana}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Greek", /\p{Script=Greek}/u],
  ["Arabic", /\p{Script=Arabic}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Thai", /\p{Script=Thai}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
];

// Printable ASCII contains none of the scripts above (fast path, same result).
const ASCII_ONLY = /^[\x00-\x7f]*$/;
export const detectNonLatinScripts = (text: string): string[] =>
  ASCII_ONLY.test(text) ? [] : SCRIPTS.filter(([, re]) => re.test(text)).map(([name]) => name);
