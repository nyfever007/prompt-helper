import type { PromptCompilation } from "../compiler/types";
import type { Diagnostic } from "../shared/diagnostics";
import type { ImageSpec, Task } from "../spec/schema";

/**
 * ProviderAdapter boundary for FUTURE image-generation APIs (Sprint 5).
 *
 * Sprint 0 ships only the interface and a disabled implementation. Rules for
 * real adapters (from the master plan):
 * - run server-side only; API keys never reach the browser;
 * - paid calls require explicit user approval (`approvedCostUsd`) and spend caps;
 * - prompt compilation stays separate: adapters consume a PromptCompilation.
 */
export interface ImageProviderCapabilities {
  providerId: string;
  displayName: string;
  tasks: readonly Task[];
  isPaid: boolean;
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  maxPromptLength?: number;
}

export interface ImageGenerationRequest {
  spec: ImageSpec;
  compilation: PromptCompilation;
  options?: { width?: number; height?: number; count?: number; seed?: number };
}

export interface CostEstimate {
  currency: "USD";
  amount: number;
  basis: string;
}

export interface GenerationContext {
  /** Must be set by an explicit user approval step before any paid call. */
  approvedCostUsd?: number;
  signal?: AbortSignal;
}

export type GenerationResult =
  | { status: "succeeded"; assets: Array<{ id: string; mimeType: string; url?: string }>; cost?: CostEstimate }
  | { status: "failed"; error: { code: string; message: string; retryable: boolean } };

export interface ImageProviderAdapter {
  readonly capabilities: ImageProviderCapabilities;
  validateRequest(request: ImageGenerationRequest): Diagnostic[];
  estimateCost(request: ImageGenerationRequest): CostEstimate | null;
  generate(request: ImageGenerationRequest, context: GenerationContext): Promise<GenerationResult>;
}
