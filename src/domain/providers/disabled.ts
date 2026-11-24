import { warning } from "../shared/diagnostics";
import type { ImageProviderAdapter } from "./types";

/**
 * The only provider in Sprint 0. It performs no I/O and never charges.
 */
export const disabledImageProvider: ImageProviderAdapter = {
  capabilities: {
    providerId: "disabled",
    displayName: "Image generation disabled (Sprint 0)",
    tasks: ["text-to-image"],
    isPaid: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
  },
  validateRequest() {
    return [warning("provider.disabled", "Image generation is not enabled in this build")];
  },
  estimateCost() {
    return null;
  },
  async generate() {
    return {
      status: "failed",
      error: { code: "provider.disabled", message: "Image generation is not enabled in this build", retryable: false },
    };
  },
};
