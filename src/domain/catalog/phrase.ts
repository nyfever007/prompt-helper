import type { PhrasePart, PhraseUnit } from "./schema";

const isUnit = (p: unknown): p is PhraseUnit => typeof p === "object" && p !== null && "axis" in p;

/**
 * Render a decomposed phrase. Units whose axis is in `takenOver` are omitted
 * (a direct selection of that axis states the meaning instead). Pure and
 * deterministic; with an empty set it must equal the option's `prompt.text`
 * (enforced by the registry).
 */
export const renderPhraseParts = (parts: readonly PhrasePart[], takenOver: ReadonlySet<string> = new Set()): string =>
  parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (isUnit(part)) return takenOver.has(part.axis) ? "" : part.text;
      return part.list
        .filter((item) => typeof item === "string" || !takenOver.has(item.axis))
        .map((item) => (typeof item === "string" ? item : item.text))
        .join(part.sep);
    })
    .filter((s) => s.trim() !== "")
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();

/** Every semantic unit in a phrase (top level and inside lists). */
export const phraseUnits = (parts: readonly PhrasePart[] | undefined): PhraseUnit[] =>
  (parts ?? []).flatMap((p) => (typeof p === "string" ? [] : isUnit(p) ? [p] : p.list.filter(isUnit)));
