import type { AgeAssessment } from "../catalog/age";
import type { SafetyReport } from "../safety/types";
import type { Diagnostic } from "../shared/diagnostics";

/** One piece of prompt text and the selection it came from (provenance). */
export interface PromptFragment {
  attributeId: string;
  /** Template applied, whitespace-normalized, adapter-specific phrasing chosen. */
  text: string;
  /** Option ids that contributed (only applicable ones), for option attributes. */
  optionIds?: string[];
  /** Number of user-defined entries that contributed. */
  customCount?: number;
  priority?: number;
  /**
   * Semantic units of this (preset) phrase that were taken over by direct
   * selections of other attributes. `equivalent` = same meaning (output once,
   * by the direct selection); `override` = the direct selection replaced it.
   */
  takenOverBy?: Array<{ attributeId: string; relation: "equivalent" | "override" }>;
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

/** Why a set, valid selection produced no fragment. */
export type HiddenReason = "excluded" | "inactive" | "metadata" | "covered";

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
  /** Structured age assessment (shared by safety, consistency checks and conditional wording). */
  age: AgeAssessment;
  /** Attributes whose meaning another produced option already states (output once, provenance kept). */
  covered?: Array<{ attributeId: string; coveredBy: string; byOptionIds: string[] }>;
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
