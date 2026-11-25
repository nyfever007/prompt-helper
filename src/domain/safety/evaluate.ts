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

/** Normalized literal of a term entry (patterns have none). */
const literalCache = new WeakMap<LexiconEntry, string>();
const literalOf = (entry: LexiconEntry): string | undefined => {
  if (entry.term === undefined || entry.pattern !== undefined) return undefined;
  let lit = literalCache.get(entry);
  if (lit === undefined) literalCache.set(entry, (lit = normalizeForSafety(entry.term)));
  return lit;
};

/** All lexicon matches of an entry in normalized text, minus matches inside exception phrases. */
export const matchEntry = (entry: LexiconEntry, normalized: string): string[] => {
  // A term entry matches only where its literal occurs; skip the regex when it does not (same result).
  const literal = literalOf(entry);
  if (literal !== undefined && !normalized.includes(literal)) return [];
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
 * Matched terms of every signal (policy order) in one text: entries in lexicon
 * order, matches in text order — exactly the per-entry scan. Pure in (policy, text),
 * so results for short texts (prompt fragments, which repeat across compiles) are
 * memoized per policy object; long texts (the whole prompt) are always scanned.
 */
type TextScan = ReadonlyArray<readonly string[]>;
const SCAN_CACHE_MAX_ENTRIES = 4096;
const SCAN_CACHE_MAX_TEXT = 512;
const scanCache = new WeakMap<SafetyPolicy, Map<string, TextScan>>();
const scanText = (text: string, policy: SafetyPolicy): TextScan => {
  const cacheable = text.length <= SCAN_CACHE_MAX_TEXT;
  let cache = scanCache.get(policy);
  const hit = cacheable ? cache?.get(text) : undefined;
  if (hit) return hit;
  const normalized = normalizeForSafety(text);
  const scan: TextScan = policy.signals.map((signal) =>
    !normalized || signal.lexicon.length === 0 || !unionFor(signal).test(normalized) ? [] : signal.lexicon.flatMap((entry) => matchEntry(entry, normalized)),
  );
  if (cacheable) {
    if (!cache) scanCache.set(policy, (cache = new Map()));
    if (cache.size >= SCAN_CACHE_MAX_ENTRIES) cache.clear();
    cache.set(text, scan);
  }
  return scan;
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

  // Each text is scanned once for all signals (memoized per policy; see `scanText`).
  const scans = input.texts.map(({ text }) => scanText(text, policy));
  policy.signals.forEach((signal, i) => {
    for (const t of input.tags) if (signal.tags.includes(t.tag)) add(signal.id, { kind: "tag", ...t });
    input.texts.forEach(({ attributeId }, j) => {
      for (const term of scans[j]![i]!) add(signal.id, { kind: "text", attributeId, term });
    });
  });

  const findings: SafetyFinding[] = [];
  for (const rule of policy.rules) {
    const present = (id: string) => (sourcesBySignal.get(id)?.length ?? 0) > 0;
    const satisfied = rule.allOf.every((group) => group.some(present)) && !(rule.noneOf ?? []).some(present);
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
