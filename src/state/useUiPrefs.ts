"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeyValueStore } from "@/domain";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type UiLocale } from "@/i18n/messages";

export const MODES = ["basic", "detailed", "precision"] as const;
export type Mode = (typeof MODES)[number];

export const UI_PREFS_KEY = "prompter:v1:ui";

interface UiPrefs {
  mode: Mode;
  locale: UiLocale;
}

const DEFAULT_PREFS: UiPrefs = { mode: "basic", locale: DEFAULT_LOCALE };

const parsePrefs = (raw: string | null): UiPrefs => {
  if (!raw) return DEFAULT_PREFS;
  try {
    const v = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      mode: MODES.includes(v.mode as Mode) ? (v.mode as Mode) : DEFAULT_PREFS.mode,
      locale: SUPPORTED_LOCALES.some((l) => l.id === v.locale) ? (v.locale as UiLocale) : DEFAULT_PREFS.locale,
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

/** View preferences (mode tab, UI language). Deliberately NOT part of the ImageSpec. */
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
    (patch: Partial<UiPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
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
  };
};
