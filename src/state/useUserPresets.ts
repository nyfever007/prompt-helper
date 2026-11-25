"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createUserPreset,
  duplicateUserPreset,
  exportUserPresets,
  importUserPresets,
  loadUserPresets,
  USER_PRESET_DESCRIPTION_MAX,
  USER_PRESET_NAME_MAX,
  USER_PRESETS_STORAGE_KEY,
  type CatalogRegistry,
  type ImageSpec,
  type KeyValueStore,
  type UserPreset,
  type UserPresetImport,
} from "@/domain";

export interface UserPresets {
  presets: UserPreset[];
  /** Save the chosen attributes of a design; returns the new preset (null when nothing could be saved). */
  save(spec: ImageSpec, input: { name: string; description?: string; attributeIds: readonly string[] }): UserPreset | null;
  rename(id: string, name: string, description: string): void;
  duplicate(id: string, name: string): UserPreset | null;
  remove(id: string): void;
  toggleFavorite(id: string): void;
  importText(text: string): UserPresetImport | null;
  exportText(ids?: readonly string[]): string;
  nameOf(id: string): string | undefined;
  /** False if the last local write failed (the library still works for this session). */
  saved: boolean;
}

/**
 * The user's preset library (Sprint 3.3): local storage under its own key — separate from the workspace
 * and the ImageSpec. Damaged data loads as an empty library.
 */
export const useUserPresets = (registry: CatalogRegistry, store: KeyValueStore | null): UserPresets => {
  const [presets, setPresets] = useState<UserPreset[]>([]);
  const [saved, setSaved] = useState(true);
  const hydrated = useRef(false);
  const latest = useRef<UserPreset[]>([]);

  useEffect(() => {
    if (!store) return;
    let raw: string | null = null;
    try {
      raw = store.getItem(USER_PRESETS_STORAGE_KEY);
    } catch {
      // unavailable
    }
    hydrated.current = true;
    latest.current = loadUserPresets(raw, registry);
    setPresets(latest.current);
  }, [store, registry]);

  const commit = useCallback(
    (update: (prev: UserPreset[]) => UserPreset[]) => {
      const next = update(latest.current);
      latest.current = next;
      setPresets(next);
      if (!store || !hydrated.current) return;
      try {
        if (next.length === 0) store.removeItem(USER_PRESETS_STORAGE_KEY);
        else store.setItem(USER_PRESETS_STORAGE_KEY, exportUserPresets(next));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    },
    [store],
  );

  const save = useCallback<UserPresets["save"]>(
    (spec, input) => {
      const p = createUserPreset(spec, registry, input);
      if (p) commit((prev) => [p, ...prev]);
      return p;
    },
    [registry, commit],
  );
  const rename = useCallback<UserPresets["rename"]>(
    (id, name, description) => {
      const n = name.trim().slice(0, USER_PRESET_NAME_MAX);
      if (!n) return;
      const d = description.trim().slice(0, USER_PRESET_DESCRIPTION_MAX);
      commit((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const { description: _old, ...rest } = p;
          void _old;
          return { ...rest, name: n, ...(d ? { description: d } : {}), updatedAt: new Date().toISOString() };
        }),
      );
    },
    [commit],
  );
  const duplicate = useCallback<UserPresets["duplicate"]>(
    (id, name) => {
      const src = latest.current.find((p) => p.id === id);
      if (!src) return null;
      const copy = duplicateUserPreset(src, name);
      commit((prev) => {
        const i = prev.findIndex((p) => p.id === id);
        return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
      });
      return copy;
    },
    [commit],
  );
  const remove = useCallback<UserPresets["remove"]>((id) => commit((prev) => prev.filter((p) => p.id !== id)), [commit]);
  const toggleFavorite = useCallback<UserPresets["toggleFavorite"]>(
    (id) => commit((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p))),
    [commit],
  );
  const importText = useCallback<UserPresets["importText"]>(
    (text) => {
      const r = importUserPresets(text, registry);
      if (r && r.presets.length) commit((prev) => [...r.presets, ...prev]);
      return r;
    },
    [registry, commit],
  );
  const exportText = useCallback<UserPresets["exportText"]>((ids) => exportUserPresets(ids ? presets.filter((p) => ids.includes(p.id)) : presets), [presets]);
  const names = useMemo(() => new Map(presets.map((p) => [p.id, p.name])), [presets]);
  const nameOf = useCallback((id: string) => names.get(id), [names]);

  return { presets, save, rename, duplicate, remove, toggleFavorite, importText, exportText, nameOf, saved };
};
