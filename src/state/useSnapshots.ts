"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSnapshot,
  parseSnapshots,
  serializeSnapshots,
  SNAPSHOT_NAME_MAX,
  SNAPSHOTS_STORAGE_KEY,
  type CatalogRegistry,
  type ImageSpec,
  type KeyValueStore,
  type Snapshot,
} from "@/domain";

export interface Snapshots {
  snapshots: Snapshot[];
  save(spec: ImageSpec, name: string): Snapshot | null;
  rename(id: string, name: string): void;
  remove(id: string): void;
  /** False if the last local write failed. */
  saved: boolean;
}

/** Named whole-design snapshots (Sprint 3.4), kept in local storage until the user deletes them. */
export const useSnapshots = (registry: CatalogRegistry, store: KeyValueStore | null): Snapshots => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [saved, setSaved] = useState(true);
  const latest = useRef<Snapshot[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!store) return;
    let raw: string | null = null;
    try {
      raw = store.getItem(SNAPSHOTS_STORAGE_KEY);
    } catch {
      // unavailable
    }
    latest.current = parseSnapshots(raw, registry);
    hydrated.current = true;
    setSnapshots(latest.current);
  }, [store, registry]);

  const commit = useCallback(
    (update: (prev: Snapshot[]) => Snapshot[]) => {
      const next = update(latest.current);
      latest.current = next;
      setSnapshots(next);
      if (!store || !hydrated.current) return;
      try {
        if (next.length === 0) store.removeItem(SNAPSHOTS_STORAGE_KEY);
        else store.setItem(SNAPSHOTS_STORAGE_KEY, serializeSnapshots(next));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    },
    [store],
  );

  const save = useCallback<Snapshots["save"]>(
    (spec, name) => {
      const s = createSnapshot(spec, name);
      if (s) commit((prev) => [s, ...prev]);
      return s;
    },
    [commit],
  );
  const rename = useCallback<Snapshots["rename"]>(
    (id, name) => {
      const n = name.trim().slice(0, SNAPSHOT_NAME_MAX);
      if (n) commit((prev) => prev.map((s) => (s.id === id ? { ...s, name: n } : s)));
    },
    [commit],
  );
  const remove = useCallback<Snapshots["remove"]>((id) => commit((prev) => prev.filter((s) => s.id !== id)), [commit]);
  return { snapshots, save, rename, remove, saved };
};
