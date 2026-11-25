/**
 * Token and text-input cost estimates (Sprint 2-D.7, ADR-069). Local only: no network, no AI, no paid API.
 *
 * - `tokenizer: "o200k_base"`: the prompt text is counted locally with the o200k_base encoding
 *   (gpt-tokenizer maps these OpenAI image models to it). Request framing can add a few tokens.
 * - `tokenizer: null`: no local tokenizer for that model — the count shown is an ESTIMATE
 *   (o200k_base as a stand-in) and is labelled as such.
 * - `price`: shipped only when checked against the provider's published page (date and source kept).
 *   Otherwise no cost is shown until the user enters a price.
 * - The cost covers TEXT INPUT only. Image generation (output images, image inputs) is billed
 *   separately and is never included.
 */
export interface TokenModel {
  id: string;
  label: string;
  tokenizer: "o200k_base" | null;
  /** USD per 1M text input tokens, as published. */
  price: { usdPerMillion: number; checkedAt: string; source: string } | null;
}

export const TOKEN_MODELS: readonly TokenModel[] = [
  {
    id: "gpt-image-1.5",
    label: "OpenAI GPT Image 1.5",
    tokenizer: "o200k_base",
    price: { usdPerMillion: 5, checkedAt: "2026-11-25", source: "https://platform.openai.com/docs/models/gpt-image-1.5" },
  },
  {
    id: "gpt-image-1-mini",
    label: "OpenAI GPT Image 1 mini",
    tokenizer: "o200k_base",
    price: { usdPerMillion: 2, checkedAt: "2026-11-25", source: "https://platform.openai.com/docs/models/gpt-image-1-mini" },
  },
  { id: "gpt-image-2", label: "OpenAI GPT Image 2", tokenizer: "o200k_base", price: null },
  { id: "gemini-image", label: "Google Gemini (image)", tokenizer: null, price: null },
  { id: "stable-diffusion", label: "Stable Diffusion / Flux", tokenizer: null, price: null },
  { id: "other", label: "Other", tokenizer: null, price: null },
];
export const DEFAULT_TOKEN_MODEL = TOKEN_MODELS[0]!.id;

export const getTokenModel = (id: string): TokenModel => TOKEN_MODELS.find((m) => m.id === id) ?? TOKEN_MODELS[0]!;

/** The price in effect: the user's own entry wins over the shipped one; null = unknown (no cost shown). */
export const effectivePrice = (
  model: TokenModel,
  userPrices: Readonly<Record<string, number>>,
): { usdPerMillion: number; source: "user" | "published" } | null => {
  const own = userPrices[model.id];
  if (own !== undefined && Number.isFinite(own) && own >= 0) return { usdPerMillion: own, source: "user" };
  return model.price ? { usdPerMillion: model.price.usdPerMillion, source: "published" } : null;
};

/** Text-input cost in USD for a token count. */
export const textInputCost = (tokens: number, usdPerMillion: number): number => (tokens * usdPerMillion) / 1_000_000;

/** Placeholder while the tokenizer loads (≈ 4 characters per token for English); always shown as an estimate. */
export const roughTokenEstimate = (text: string): number => (text.length === 0 ? 0 : Math.ceil(text.length / 4));

/** "$0.00123" — enough digits for tiny prompt costs. */
export const formatUsd = (usd: number): string => {
  if (usd === 0) return "$0";
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toPrecision(3)}`;
};
