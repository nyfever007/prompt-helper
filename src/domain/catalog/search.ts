import type { OptionAttributeDefinition, OptionDefinition } from "./schema";

export interface OptionSearchHit {
  option: OptionDefinition;
  score: number;
}

/** Normalize for search: NFKC, lowercase, drop whitespace/hyphens/underscores/dots. */
export const normalizeSearch = (s: string): string =>
  s.normalize("NFKC").toLowerCase().replace(/[\s\-_.·'’]+/gu, "");

const candidates = (o: OptionDefinition): Array<{ text: string; weight: number }> => [
  ...Object.values(o.label).map((text) => ({ text, weight: 0 })),
  ...(o.aliases ?? []).map((text) => ({ text, weight: -5 })),
  { text: o.id, weight: -10 },
  ...Object.values(o.description ?? {}).map((text) => ({ text, weight: -40 })),
];

const scoreToken = (token: string, o: OptionDefinition): number => {
  let best = 0;
  for (const { text, weight } of candidates(o)) {
    const t = normalizeSearch(text);
    if (!t) continue;
    const s = t === token ? 100 : t.startsWith(token) ? 80 : t.includes(token) ? 60 : 0;
    if (s > 0) best = Math.max(best, s + weight);
  }
  return best;
};

/**
 * Search an option attribute by label (all locales), aliases, id and description.
 * Whitespace-separated tokens are ANDed. Results are deterministic: score desc,
 * then catalog order. An empty query returns every option in catalog order.
 * No result limit is imposed.
 */
export const searchOptions = (attribute: OptionAttributeDefinition, query: string): OptionSearchHit[] => {
  const tokens = query
    .normalize("NFKC")
    .split(/\s+/u)
    .map(normalizeSearch)
    .filter(Boolean);
  const hits = attribute.options.map((option, index) => {
    if (tokens.length === 0) return { option, score: 0, index };
    let total = 0;
    for (const token of tokens) {
      const s = scoreToken(token, option);
      if (s <= 0) return null;
      total += s;
    }
    return { option, score: total, index };
  });
  return hits
    .filter((h): h is { option: OptionDefinition; score: number; index: number } => h !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ option, score }) => ({ option, score }));
};
