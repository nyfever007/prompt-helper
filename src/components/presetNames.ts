"use client";

import { createContext, useContext } from "react";

/** Names of the user's presets by id (Sprint 3.3), so provenance badges can name a user preset. */
export const PresetNamesContext = createContext<(presetId: string) => string | undefined>(() => undefined);
export const usePresetNames = () => useContext(PresetNamesContext);
