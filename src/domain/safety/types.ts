import type { LocalizedText } from "../shared/localized";

/**
 * A lexicon entry. `term` entries match:
 * - `lang: "en"` → whole words/phrases (letters/digits may not touch either side);
 * - `lang: "ko"` → substrings (Korean attaches particles, so word boundaries do not work).
 * `pattern` entries are Unicode regexes. `except` lists phrases whose matches are ignored
 * (e.g. "nude lipstick", "칼로리") to limit false positives.
 */
export interface LexiconEntry {
  term?: string;
  pattern?: string;
  lang: "en" | "ko";
  except?: readonly string[];
}

/** A signal is a policy-relevant concept detected from catalog tags and/or text. */
export interface SafetySignalDef {
  id: string;
  label: LocalizedText;
  /** Catalog option `policyTags` that raise this signal. */
  tags: readonly string[];
  lexicon: readonly LexiconEntry[];
}

export interface SafetyRuleDef {
  id: string;
  category: string;
  severity: "block" | "warn";
  /** Every group must have at least one present signal (AND of ORs). */
  allOf: ReadonlyArray<readonly string[]>;
  message: LocalizedText;
  guidance: LocalizedText;
}

export interface SafetyPolicy {
  id: string;
  version: string;
  signals: readonly SafetySignalDef[];
  rules: readonly SafetyRuleDef[];
}

export type SignalSource =
  | { kind: "tag"; attributeId: string; optionId: string; tag: string }
  /** `attributeId` is `"$prompt"` for text found only in the adapter's final output. */
  | { kind: "text"; attributeId: string; term: string };

export interface SafetyFinding {
  ruleId: string;
  category: string;
  severity: "block" | "warn";
  signals: Array<{ signalId: string; sources: SignalSource[] }>;
}

export interface SafetyReport {
  policyId: string;
  policyVersion: string;
  blocked: boolean;
  findings: SafetyFinding[];
}

export interface SafetyInput {
  texts: ReadonlyArray<{ attributeId: string; text: string }>;
  tags: ReadonlyArray<{ attributeId: string; optionId: string; tag: string }>;
}
