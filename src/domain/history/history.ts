import type { CatalogRegistry } from "../catalog/registry";
import { canonicalizeSpec } from "../spec/factory";
import type { ImageSpec } from "../spec/schema";
import { analyzeSpecInput } from "../validation/analyze";

/**
 * Work history (Sprint 3.4, ADR-073): multi-step undo / redo and restore over the WHOLE ImageSpec.
 *
 * - Each entry is the state AFTER one user action (a bulk action — random run, preset application, reset —
 *   is one entry). `index` points at the current state; undo / redo move it. A new action after an undo
 *   drops the redo branch.
 * - Consecutive edits of the same attribute within `COALESCE_MS` (slider drags, typing, color dragging) are
 *   one entry.
 * - Restoring an entry is itself a new entry, so it can be undone. Undo, redo and restore bring back the
 *   whole spec as it was — values, locks, custom colors, provenance and prompt exclusion — even where a
 *   normal edit would respect a lock: the user explicitly asked for that past state.
 * - At most `HISTORY_LIMIT` entries are kept (oldest dropped). Stored beside the workspace; the ImageSpec
 *   (0.4.0) is unchanged. The current safety policy applies to every restored state (it is just the spec).
 */
export const HISTORY_LIMIT = 50;
export const COALESCE_MS = 1500;
export const HISTORY_STORAGE_KEY = "prompter:v1:history";

export const HISTORY_KINDS = [
  "start",
  "edit",
  "lock",
  "output",
  "random",
  "preset",
  "userPreset",
  "presetUndo",
  "categoryReset",
  "categoryRestore",
  "reset",
  "resetRestore",
  "import",
  "restore",
  "snapshot",
] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

export interface HistoryEntry {
  id: number;
  /** Epoch milliseconds. */
  at: number;
  kind: HistoryKind;
  /** Attribute, category, preset name or snapshot name, by kind (display only). */
  detail?: string;
  /** Attributes whose stored selection differs from the previous entry. */
  changed: number;
  spec: ImageSpec;
  /** Same key + within COALESCE_MS → merged into this entry (session only). */
  coalesce?: string;
}

export interface History {
  entries: HistoryEntry[];
  index: number;
  nextId: number;
}

const selectionKey = (s: unknown) => JSON.stringify(s);

/** Attributes whose stored selection differs (added, removed or changed — locks and exclusion included). */
export const countChanged = (before: ImageSpec, after: ImageSpec): number => {
  if (before === after) return 0;
  const ids = new Set([...Object.keys(before.selections), ...Object.keys(after.selections)]);
  let n = 0;
  for (const id of ids) {
    const a = before.selections[id];
    const b = after.selections[id];
    if (a !== b && selectionKey(a ? canonicalizeSpec({ ...before, selections: { [id]: a } }).selections[id] : null) !== selectionKey(b ? canonicalizeSpec({ ...after, selections: { [id]: b } }).selections[id] : null)) n++;
  }
  return n;
};

export const startHistory = (spec: ImageSpec, at: number, kind: HistoryKind = "start"): History => ({
  entries: [{ id: 1, at, kind, changed: 0, spec }],
  index: 0,
  nextId: 2,
});

const trim = (h: History): History => {
  const over = h.entries.length - HISTORY_LIMIT;
  return over > 0 ? { ...h, entries: h.entries.slice(over), index: Math.max(0, h.index - over) } : h;
};

/** Record the state after an action (drops the redo branch; merges coalescible edits). */
export const recordHistory = (h: History, input: { kind: HistoryKind; spec: ImageSpec; at: number; detail?: string; coalesce?: string }): History => {
  const head = h.entries[h.index]!;
  const atEnd = h.index === h.entries.length - 1;
  if (input.coalesce && atEnd && head.coalesce === input.coalesce && input.at - head.at <= COALESCE_MS && h.index > 0) {
    const prev = h.entries[h.index - 1]!;
    const merged: HistoryEntry = { ...head, at: input.at, spec: input.spec, changed: countChanged(prev.spec, input.spec) };
    return { ...h, entries: [...h.entries.slice(0, h.index), merged] };
  }
  const entry: HistoryEntry = {
    id: h.nextId,
    at: input.at,
    kind: input.kind,
    ...(input.detail ? { detail: input.detail } : {}),
    changed: countChanged(head.spec, input.spec),
    spec: input.spec,
    ...(input.coalesce ? { coalesce: input.coalesce } : {}),
  };
  return trim({ entries: [...h.entries.slice(0, h.index + 1), entry], index: h.index + 1, nextId: h.nextId + 1 });
};

export const canUndo = (h: History) => h.index > 0;
export const canRedo = (h: History) => h.index < h.entries.length - 1;

/** Move back / forward; the returned spec is the state to show. Coalescing stops at a moved pointer. */
export const undoHistory = (h: History): { history: History; spec: ImageSpec } | null =>
  canUndo(h) ? { history: stopCoalescing({ ...h, index: h.index - 1 }), spec: h.entries[h.index - 1]!.spec } : null;
export const redoHistory = (h: History): { history: History; spec: ImageSpec } | null =>
  canRedo(h) ? { history: stopCoalescing({ ...h, index: h.index + 1 }), spec: h.entries[h.index + 1]!.spec } : null;
const stopCoalescing = (h: History): History => ({
  ...h,
  entries: h.entries.map((e) => {
    if (!e.coalesce) return e;
    const { coalesce: _drop, ...rest } = e;
    void _drop;
    return rest;
  }),
});

/** Restore an entry's state as a NEW entry (undoable). */
export const restoreHistoryEntry = (h: History, id: number, at: number): { history: History; spec: ImageSpec } | null => {
  const target = h.entries.find((e) => e.id === id);
  if (!target || h.entries[h.index]!.id === id) return null;
  return { history: recordHistory(h, { kind: "restore", spec: target.spec, at, detail: String(target.id) }), spec: target.spec };
};

/** Compact JSON for storage (specs canonicalized). */
export const serializeHistory = (h: History, catalogId: string, limit = HISTORY_LIMIT): string => {
  const drop = Math.max(0, h.entries.length - limit);
  return JSON.stringify({
    kind: "prompter.history",
    version: 1,
    catalogId,
    index: Math.max(0, h.index - drop),
    nextId: h.nextId,
    entries: h.entries.slice(drop).map((e) => ({ id: e.id, at: e.at, kind: e.kind, ...(e.detail ? { detail: e.detail } : {}), changed: e.changed, spec: canonicalizeSpec(e.spec) })),
  });
};

/**
 * Read stored history. Every entry's spec is validated (and migrated) like an import; entries that are no
 * longer valid are dropped. Null when there is nothing usable.
 */
export const parseHistory = (text: string | null, registry: CatalogRegistry): History | null => {
  if (!text) return null;
  try {
    const raw = JSON.parse(text) as { kind?: unknown; version?: unknown; catalogId?: unknown; index?: unknown; nextId?: unknown; entries?: unknown };
    if (raw.kind !== "prompter.history" || raw.version !== 1 || raw.catalogId !== registry.id || !Array.isArray(raw.entries)) return null;
    const index = typeof raw.index === "number" ? raw.index : raw.entries.length - 1;
    const entries: HistoryEntry[] = [];
    let newIndex = -1;
    raw.entries.forEach((e: Record<string, unknown>, i: number) => {
      const a = analyzeSpecInput(e.spec, registry);
      if (a.status !== "valid" || typeof e.id !== "number" || typeof e.at !== "number" || !HISTORY_KINDS.includes(e.kind as HistoryKind)) return;
      if (i <= index) newIndex = entries.length;
      entries.push({ id: e.id, at: e.at, kind: e.kind as HistoryKind, ...(typeof e.detail === "string" ? { detail: e.detail } : {}), changed: typeof e.changed === "number" ? e.changed : 0, spec: a.spec });
    });
    if (entries.length === 0) return null;
    const maxId = Math.max(...entries.map((x) => x.id));
    return { entries, index: Math.max(0, newIndex), nextId: Math.max(maxId + 1, typeof raw.nextId === "number" ? raw.nextId : 0) };
  } catch {
    return null;
  }
};

/** Same design (canonical form)? */
export const sameSpec = (a: ImageSpec, b: ImageSpec): boolean => a === b || JSON.stringify(canonicalizeSpec(a)) === JSON.stringify(canonicalizeSpec(b));

/**
 * Continue a stored history with the spec actually loaded: if it is the stored current state, the history
 * (with its redo branch) continues as it was; otherwise the loaded spec becomes a new entry.
 */
export const resumeHistory = (stored: History | null, loaded: ImageSpec, at: number): History => {
  if (!stored) return startHistory(loaded, at);
  if (sameSpec(stored.entries[stored.index]!.spec, loaded)) {
    const entries = [...stored.entries];
    entries[stored.index] = { ...entries[stored.index]!, spec: loaded };
    return { ...stored, entries };
  }
  return recordHistory({ ...stored, index: stored.entries.length - 1 }, { kind: "start", spec: loaded, at });
};
