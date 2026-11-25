import type { ImageSpec } from "./schema";

/**
 * Attribute locks (Sprint 3.1, ADR-070) — which set attributes the user has pinned.
 *
 * A lock is editing state, not image meaning: it is NOT part of the ImageSpec (no schema change) and
 * is kept beside it (persistence/locks.ts). A locked value is kept by random regeneration, preset /
 * concept application (every mode), category and full resets and preset undo; a direct edit or clear
 * needs the lock to be released first. Locking is independent of prompt exclusion and never affects
 * safety: a locked value is checked like any other.
 *
 * Only SET attributes can be locked; locks of attributes that are no longer set are dropped (`pruneLocks`).
 */
export type Locks = ReadonlySet<string>;
export const NO_LOCKS: Locks = new Set<string>();

/** The locks that still refer to a set attribute, sorted (stable storage and comparison). */
export const pruneLocks = (locks: Iterable<string>, spec: ImageSpec): string[] => [...new Set(locks)].filter((id) => id in spec.selections).sort();

/** Lock or unlock attributes; only set attributes can be locked. Returns the new sorted list. */
export const setLocks = (current: readonly string[], spec: ImageSpec, attributeIds: readonly string[], locked: boolean): string[] => {
  const next = new Set(current);
  for (const id of attributeIds) {
    if (locked && id in spec.selections) next.add(id);
    else if (!locked) next.delete(id);
  }
  return pruneLocks(next, spec);
};

/** A full reset keeps the locked values (they are pinned); everything else is cleared. */
export const keepLocked = (spec: ImageSpec, locks: Locks): ImageSpec["selections"] =>
  Object.fromEntries(Object.entries(spec.selections).filter(([id]) => locks.has(id)));
