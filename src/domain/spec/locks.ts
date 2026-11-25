import type { AttributeSelection, ImageSpec } from "./schema";

/**
 * Attribute locks (Sprint 3.1 ADR-070; stored in the ImageSpec since Sprint 3.2, ADR-071) — which set
 * attributes the user has pinned: `AttributeSelection.locked`.
 *
 * A locked value is kept by random regeneration, preset / concept application (every mode), category and
 * full resets and preset undo; a direct edit or clear needs the lock to be released first. Locking is
 * independent of prompt exclusion and never affects safety (the compiler ignores it). Only SET attributes
 * can be locked — the flag lives on the selection, so a lock goes away with its value.
 */
export type Locks = ReadonlySet<string>;
export const NO_LOCKS: Locks = new Set<string>();

/** The locked attribute ids of a spec, sorted. */
export const lockedIds = (spec: ImageSpec): string[] =>
  Object.keys(spec.selections)
    .filter((id) => spec.selections[id]!.locked)
    .sort();
export const locksOf = (spec: ImageSpec): Locks => new Set(lockedIds(spec));

const withLock = (s: AttributeSelection, locked: boolean): AttributeSelection => {
  if (Boolean(s.locked) === locked) return s;
  if (locked) return { ...s, locked: true };
  const { locked: _drop, ...rest } = s;
  void _drop;
  return rest;
};

/** Lock or unlock attributes (unset ids are ignored). Untouched selections keep their identity. */
export const setLocks = (spec: ImageSpec, attributeIds: readonly string[], locked: boolean): ImageSpec => {
  let selections: ImageSpec["selections"] | null = null;
  for (const id of attributeIds) {
    const s = (selections ?? spec.selections)[id];
    if (!s) continue;
    const next = withLock(s, locked);
    if (next === s) continue;
    selections ??= { ...spec.selections };
    selections[id] = next;
  }
  return selections ? { ...spec, selections } : spec;
};

/** Release every lock. */
export const unlockAll = (spec: ImageSpec): ImageSpec => setLocks(spec, lockedIds(spec), false);

/** A full reset keeps the locked values (they are pinned); everything else is cleared. */
export const keepLocked = (spec: ImageSpec): ImageSpec["selections"] =>
  Object.fromEntries(Object.entries(spec.selections).filter(([, s]) => s.locked));
