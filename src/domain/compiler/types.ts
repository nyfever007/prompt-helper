import type { SafetyReport } from "../safety/types";
import type { Diagnostic } from "../shared/diagnostics";

/** One piece of prompt text and the selection it came from (provenance). */
export interface PromptFragment {
  attributeId: string;
  /** Template applied, whitespace-normalized, adapter-specific phrasing chosen. */
  text: string;
  /** Option ids that contributed (only applicable ones), for option attributes. */
  optionIds?: string[];
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

export type PromptParameterValue = string | number;

export interface PromptCompilation {
  /** Empty when nothing is selected OR when blocked by the safety policy. */
  prompt: string;
  negativePrompt: string;
  /** Text fragments with provenance. Empty when blocked. */
  fragments: PromptFragment[];
  /** Structured values for future provider parameters (e.g. aspectRatio). Empty when blocked. */
  parameters: Record<string, PromptParameterValue>;
  /** Which attribute produced each parameter. */
  parameterSources: Record<string, string>;
  /** True when the safety policy withheld the output. */
  blocked: boolean;
  safety: SafetyReport;
  diagnostics: Diagnostic[];
  meta: {
    compilerVersion: string;
    adapterId: string;
    adapterVersion: string;
    specSchemaVersion: string;
    catalogId: string;
    catalogVersion: string;
    safetyPolicyId: string;
    safetyPolicyVersion: string;
  };
}
