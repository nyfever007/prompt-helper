import type { PromptAdapter } from "../types";

const TERMINAL = /[.!?…。！？]$/u;

/** Ensure a fragment reads as a sentence. Deterministic and idempotent. */
export const ensureSentence = (text: string): string => (TERMINAL.test(text) ? text : `${text}.`);

/**
 * generic-en: plain English, one sentence per fragment, in catalog order.
 * Model-agnostic; no weighting syntax; no negative prompt (Sprint 0).
 */
export const genericEnglishAdapter: PromptAdapter = {
  id: "generic-en",
  version: "0.1.0",
  outputLanguage: "en",
  supportsPriority: false,
  render(fragments) {
    return {
      prompt: fragments.map((f) => ensureSentence(f.text)).join(" "),
      negativePrompt: "",
    };
  },
};
