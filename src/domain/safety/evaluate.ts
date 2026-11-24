import { baselinePolicy } from "./baselinePolicy";
import type { LexiconEntry, SafetyFinding, SafetyInput, SafetyPolicy, SafetyReport, SafetySignalDef, SignalSource } from "./types";

/** Normalize text for matching only (the stored spec is never changed). */
export const normalizeForSafety = (text: string): string =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[​-‍⁠﻿]/gu, "")
    .replace(/[‐-―]/gu, "-")
    .replace(/[‘’]/gu, "'")
    .replace(/\s+/gu, " ")
    .trim();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Regex source of one lexicon entry (same matching rules as `regexFor`). */
const sourceFor = (entry: LexiconEntry): string =>
  entry.pattern ??
  (entry.lang === "en"
    ? `(?<![\\p{L}\\p{N}])${escapeRegex(normalizeForSafety(entry.term!))}(?![\\p{L}\\p{N}])`
    : escapeRegex(normalizeForSafety(entry.term!)));

const regexCache = new Map<string, RegExp>();
const regexFor = (entry: LexiconEntry): RegExp => {
  const key = `${entry.lang}|${entry.term ?? ""}|${entry.pattern ?? ""}`;
  let re = regexCache.get(key);
  if (!re) {
    re = new RegExp(sourceFor(entry), "gu");
    regexCache.set(key, re);
  }
  re.lastIndex = 0;
  return re;
};

const ranges = (text: string, phrases: readonly string[] | undefined): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (const p of phrases ?? []) {
    const needle = normalizeForSafety(p);
    for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) out.push([i, i + needle.length]);
  }
  return out;
};

/**
 * Pre-filter: one union regex per signal. If it does not match, no entry of the
 * signal can match (exception phrases only REMOVE matches), so the per-entry
 * scan is skipped. Results are identical; only clean texts get faster.
 */
const unionCache = new WeakMap<SafetySignalDef, RegExp>();
const unionFor = (signal: SafetySignalDef): RegExp => {
  let re = unionCache.get(signal);
  if (!re) {
    re = new RegExp(signal.lexicon.map((e) => `(?:${sourceFor(e)})`).join("|"), "u");
    unionCache.set(signal, re);
  }
  return re;
};

/** All lexicon matches of an entry in normalized text, minus matches inside exception phrases. */
export const matchEntry = (entry: LexiconEntry, normalized: string): string[] => {
  const exceptions = ranges(normalized, entry.except);
  const out: string[] = [];
  for (const m of normalized.matchAll(regexFor(entry))) {
    const start = m.index;
    const end = start + m[0].length;
    if (exceptions.some(([s, e]) => start >= s && end <= e)) continue;
    out.push(m[0]);
  }
  return out;
};

/**
 * Evaluate the policy over structured tags and texts. Deterministic: signals,
 * sources and findings are produced in policy/input order.
 */
export const evaluateSafety = (input: SafetyInput, policy: SafetyPolicy = baselinePolicy): SafetyReport => {
  const sourcesBySignal = new Map<string, SignalSource[]>();
  const add = (signalId: string, source: SignalSource) => {
    const list = sourcesBySignal.get(signalId) ?? [];
    const dupe = list.some(
      (s) =>
        (s.kind === "text" && source.kind === "text" && s.term === source.term && (s.attributeId === source.attributeId || source.attributeId === "$prompt")) ||
        (s.kind === "tag" && source.kind === "tag" && s.attributeId === source.attributeId && s.optionId === source.optionId && s.tag === source.tag),
    );
    if (!dupe) list.push(source);
    sourcesBySignal.set(signalId, list);
  };

  // Normalize each text once (not once per signal).
  const normalizedTexts = input.texts.map(({ attributeId, text }) => ({ attributeId, normalized: normalizeForSafety(text) }));
  for (const signal of policy.signals) {
    for (const t of input.tags) if (signal.tags.includes(t.tag)) add(signal.id, { kind: "tag", ...t });
    const union = unionFor(signal);
    for (const { attributeId, normalized } of normalizedTexts) {
      if (!normalized || !union.test(normalized)) continue;
      for (const entry of signal.lexicon) {
        for (const term of matchEntry(entry, normalized)) add(signal.id, { kind: "text", attributeId, term });
      }
    }
  }

  const findings: SafetyFinding[] = [];
  for (const rule of policy.rules) {
    const satisfied = rule.allOf.every((group) => group.some((id) => (sourcesBySignal.get(id)?.length ?? 0) > 0));
    if (!satisfied) continue;
    const signalIds = [...new Set(rule.allOf.flat())].filter((id) => (sourcesBySignal.get(id)?.length ?? 0) > 0);
    findings.push({
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      signals: signalIds.map((signalId) => ({ signalId, sources: sourcesBySignal.get(signalId)! })),
    });
  }
  return {
    policyId: policy.id,
    policyVersion: policy.version,
    blocked: findings.some((f) => f.severity === "block"),
    findings,
  };
};

export const getSafetyRule = (ruleId: string, policy: SafetyPolicy = baselinePolicy) => policy.rules.find((r) => r.id === ruleId);
export const getSafetySignal = (signalId: string, policy: SafetyPolicy = baselinePolicy) =>
  policy.signals.find((s) => s.id === signalId);
