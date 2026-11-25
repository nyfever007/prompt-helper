"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_RANDOM_STYLE, DEFAULT_TOKEN_MODEL, PROMPT_DETAILS, RANDOM_STYLES, TOKEN_MODELS, type KeyValueStore, type PromptDetail, type RandomStyle } from "@/domain";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type UiLocale } from "@/i18n/messages";

export const MODES = ["recommended", "random", "basic", "detailed", "precision"] as const;
export type Mode = (typeof MODES)[number];

export const UI_PREFS_KEY = "prompter:v1:ui";

/** `auto`: Balanced for a design with random values, otherwise Full (existing projects keep Full). */
export type PromptDetailPref = PromptDetail | "auto";

interface UiPrefs {
  mode: Mode;
  locale: UiLocale;
  randomStyle: RandomStyle;
  promptDetail: PromptDetailPref;
  tokenModel: string;
  /** USD per 1M text input tokens entered by the user, per model id. */
  tokenPrices: Record<string, number>;
}

const DEFAULT_PREFS: UiPrefs = { mode: "basic", locale: DEFAULT_LOCALE, randomStyle: DEFAULT_RANDOM_STYLE, promptDetail: "auto", tokenModel: DEFAULT_TOKEN_MODEL, tokenPrices: {} };

const parsePrices = (v: unknown): Record<string, number> => {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, number> = {};
  for (const m of TOKEN_MODELS) {
    const n = (v as Record<string, unknown>)[m.id];
    if (typeof n === "number" && Number.isFinite(n) && n >= 0) out[m.id] = n;
  }
  return out;
};

const parsePrefs = (raw: string | null): UiPrefs => {
  if (!raw) return DEFAULT_PREFS;
  try {
    const v = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      mode: MODES.includes(v.mode as Mode) ? (v.mode as Mode) : DEFAULT_PREFS.mode,
      locale: SUPPORTED_LOCALES.some((l) => l.id === v.locale) ? (v.locale as UiLocale) : DEFAULT_PREFS.locale,
      randomStyle: RANDOM_STYLES.includes(v.randomStyle as RandomStyle) ? (v.randomStyle as RandomStyle) : DEFAULT_PREFS.randomStyle,
      promptDetail: v.promptDetail === "auto" || PROMPT_DETAILS.includes(v.promptDetail as PromptDetail) ? (v.promptDetail as PromptDetailPref) : DEFAULT_PREFS.promptDetail,
      tokenModel: TOKEN_MODELS.some((m) => m.id === v.tokenModel) ? (v.tokenModel as string) : DEFAULT_PREFS.tokenModel,
      tokenPrices: parsePrices(v.tokenPrices),
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

/** View preferences (mode tab, UI language, random style, prompt detail, token model and prices). Deliberately NOT part of the ImageSpec. */
export const useUiPrefs = (store: KeyValueStore | null) => {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (!store) return;
    let raw: string | null = null;
    try {
      raw = store.getItem(UI_PREFS_KEY);
    } catch {
      // storage unavailable
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from external storage
    setPrefs(parsePrefs(raw));
  }, [store]);

  const update = useCallback(
    (patch: Partial<UiPrefs> | ((prev: UiPrefs) => Partial<UiPrefs>)) => {
      setPrefs((prev) => {
        const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
        try {
          store?.setItem(UI_PREFS_KEY, JSON.stringify(next));
        } catch {
          // non-critical
        }
        return next;
      });
    },
    [store],
  );

  return {
    mode: prefs.mode,
    locale: prefs.locale,
    setMode: useCallback((mode: Mode) => update({ mode }), [update]),
    setLocale: useCallback((locale: UiLocale) => update({ locale }), [update]),
    randomStyle: prefs.randomStyle,
    setRandomStyle: useCallback((randomStyle: RandomStyle) => update({ randomStyle }), [update]),
    promptDetail: prefs.promptDetail,
    setPromptDetail: useCallback((promptDetail: PromptDetailPref) => update({ promptDetail }), [update]),
    tokenModel: prefs.tokenModel,
    setTokenModel: useCallback((tokenModel: string) => update({ tokenModel }), [update]),
    tokenPrices: prefs.tokenPrices,
    setTokenPrice: useCallback(
      (modelId: string, price: number | null) =>
        update((prev) => {
          const tokenPrices = { ...prev.tokenPrices };
          if (price === null) delete tokenPrices[modelId];
          else tokenPrices[modelId] = price;
          return { tokenPrices };
        }),
      [update],
    ),
  };
};
