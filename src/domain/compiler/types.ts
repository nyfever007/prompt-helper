import type { Diagnostic } from "../shared/diagnostics";

/** One piece of prompt text and the selection it came from (traceability). */
export interface PromptFragment {
  attributeId: string;
  /** Template applied, whitespace-normalized, adapter-specific phrasing chosen. */
  text: string;
  priority?: number;
}

/**
 * A PromptAdapter turns the compiler's semantic plan (ordered fragments) into
 * text for a target model family. It is NOT an API client — see
 * `providers/` for that boundary.
 */
export interface PromptAdapter {
  id: string;
  version: string;
  outputLanguage: "en";
  /** Whether this adapter can express per-fragment emphasis. */
  supportsPriority: boolean;
  render(fragments: readonly PromptFragment[]): { prompt: string; negativePrompt: string };
}

export interface PromptCompilation {
  prompt: string;
  negativePrompt: string;
  fragments: PromptFragment[];
  diagnostics: Diagnostic[];
  meta: {
    compilerVersion: string;
    adapterId: string;
    adapterVersion: string;
    specSchemaVersion: string;
    catalogId: string;
    catalogVersion: string;
  };
}
