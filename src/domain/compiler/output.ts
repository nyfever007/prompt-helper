import type { PromptCompilation } from "./types";

export type PromptOutput =
  | { ok: true; prompt: string; negativePrompt: string }
  | { ok: false; reason: "blocked" | "empty" };

/**
 * The ONE gate every prompt output path must use (preview, copy, text export,
 * future provider calls). Blocked or empty compilations yield no text.
 */
export const getPromptOutput = (compilation: PromptCompilation): PromptOutput => {
  if (compilation.blocked) return { ok: false, reason: "blocked" };
  if (!compilation.prompt) return { ok: false, reason: "empty" };
  return { ok: true, prompt: compilation.prompt, negativePrompt: compilation.negativePrompt };
};

/** Plain-text prompt export (UTF-8). Returns null when the gate refuses. */
export const exportPromptText = (compilation: PromptCompilation): string | null => {
  const out = getPromptOutput(compilation);
  if (!out.ok) return null;
  const params = Object.entries(compilation.parameters)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}: ${v}`);
  return [out.prompt, ...(params.length ? ["", "# parameters", ...params] : [])].join("\n") + "\n";
};
