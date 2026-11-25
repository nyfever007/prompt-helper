import { z } from "zod";
import { migrateCatalogSelections } from "../catalog/migrate";
import type { CatalogRegistry } from "../catalog/registry";
import type { PresetDefinition } from "../catalog/schema";
import { checkValueForAttribute } from "../catalog/valueCheck";
import { hasErrors } from "../shared/diagnostics";
import { CatalogIdSchema, SemVerSchema } from "../shared/ids";
import type { ImageSpec } from "../spec/schema";
import { SelectionValueSchema, type SelectionValue } from "../spec/values";

/**
 * User presets (Sprint 3.3, ADR-072): parts of a design the user saves and reuses. A user preset is a
 * partial patch like a catalog preset — applied through the same plan → confirm → apply → undo path — but
 * it lives in the user's own library (local storage, JSON export/import), never in the catalog and never in
 * the ImageSpec (which stays 0.4.0).
 *
 * - Values are stored exactly (custom entries and custom colors included); a saved lock is kept per patch
 *   and applied only when the user asks for it.
 * - Ids start with `user_`, so a value's provenance (`origin.presetId`) tells system and user presets apart.
 * - Loading and importing validate every patch against the catalog (renamed attributes are migrated);
 *   unknown attributes or invalid values are dropped and counted — never applied.
 */
export const USER_PRESET_PREFIX = "user_";
export const USER_PRESET_VERSION = "1.0.0";
export const USER_PRESETS_STORAGE_KEY = "prompter:v1:user-presets";
export const USER_PRESET_NAME_MAX = 80;
export const USER_PRESET_DESCRIPTION_MAX = 500;
export const isUserPresetId = (id: string | undefined): boolean => Boolean(id?.startsWith(USER_PRESET_PREFIX));

export const UserPresetPatchSchema = z
  .object({ attributeId: z.string().min(1), value: SelectionValueSchema, locked: z.literal(true).optional() })
  .strict();
export type UserPresetPatch = z.infer<typeof UserPresetPatchSchema>;

export const UserPresetSchema = z
  .object({
    id: z.string().regex(/^user_[a-z0-9]{4,32}$/),
    name: z.string().trim().min(1).max(USER_PRESET_NAME_MAX),
    description: z.string().max(USER_PRESET_DESCRIPTION_MAX).optional(),
    favorite: z.boolean().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    catalog: z.object({ id: CatalogIdSchema, version: SemVerSchema }).strict(),
    patches: z.array(UserPresetPatchSchema).min(1),
  })
  .strict();
export type UserPreset = z.infer<typeof UserPresetSchema>;

export interface UserPresetLibraryFile {
  kind: "prompter.user-presets";
  version: 1;
  presets: UserPreset[];
}

/** A new id (`user_` + base36 time + random). `random` is injectable for tests. */
export const newUserPresetId = (now: Date = new Date(), random: () => number = Math.random): string =>
  `${USER_PRESET_PREFIX}${now.getTime().toString(36)}${Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, "0")}`;

/** Save the chosen SET attributes of a design (in catalog order). Values and locks are copied exactly. */
export const createUserPreset = (
  spec: ImageSpec,
  registry: CatalogRegistry,
  input: { name: string; description?: string; attributeIds: readonly string[] },
  now: Date = new Date(),
  id: string = newUserPresetId(now),
): UserPreset | null => {
  const chosen = new Set(input.attributeIds);
  const patches: UserPresetPatch[] = registry
    .attributes()
    .filter((a) => chosen.has(a.id) && spec.selections[a.id])
    .map((a) => {
      const s = spec.selections[a.id]!;
      return { attributeId: a.id, value: s.value, ...(s.locked ? { locked: true as const } : {}) };
    });
  if (patches.length === 0 || input.name.trim() === "") return null;
  const at = now.toISOString();
  const description = input.description?.trim();
  return {
    id,
    name: input.name.trim().slice(0, USER_PRESET_NAME_MAX),
    ...(description ? { description: description.slice(0, USER_PRESET_DESCRIPTION_MAX) } : {}),
    createdAt: at,
    updatedAt: at,
    catalog: { id: registry.id, version: registry.version },
    patches,
  };
};

/** The same preset as a catalog-style definition for planning (provenance: origin `user_…`). */
export const userPresetToDefinition = (p: UserPreset): PresetDefinition => ({
  id: p.id,
  version: USER_PRESET_VERSION,
  status: "approved",
  label: { en: p.name, ko: p.name },
  ...(p.description ? { description: { en: p.description, ko: p.description } } : {}),
  provenance: { source: "user" },
  patches: p.patches.map(({ attributeId, value }) => ({ attributeId, value })),
});

/** Attributes whose saved lock can be applied with the preset. */
export const savedLocks = (p: UserPreset): string[] => p.patches.filter((x) => x.locked).map((x) => x.attributeId);

/**
 * Validate one preset against this catalog: catalog renames are migrated, patches for unknown attributes or
 * with invalid values are dropped (counted). Null when nothing usable is left or the shape is wrong.
 */
export const normalizeUserPreset = (raw: unknown, registry: CatalogRegistry): { preset: UserPreset; dropped: number } | null => {
  const parsed = UserPresetSchema.safeParse(raw);
  if (!parsed.success || parsed.data.catalog.id !== registry.id) return null;
  const p = parsed.data;
  let patches = p.patches;
  if (p.catalog.version !== registry.version) {
    const byId = Object.fromEntries(p.patches.map((x) => [x.attributeId, x]));
    const migrated = migrateCatalogSelections(
      Object.fromEntries(p.patches.map((x) => [x.attributeId, { value: x.value, source: "user" }])),
      p.catalog.version,
      registry,
    );
    patches = Object.entries(migrated.selections).map(([attributeId, s]) => {
      const old = byId[attributeId] ?? Object.values(byId).find((x) => JSON.stringify(x.value) === JSON.stringify((s as { value: SelectionValue }).value));
      return { attributeId, value: (s as { value: SelectionValue }).value, ...(old?.locked ? { locked: true as const } : {}) };
    });
  }
  const valid = patches.filter((x) => {
    const a = registry.getAttribute(x.attributeId);
    return a !== undefined && !hasErrors(checkValueForAttribute(a, x.value, x.attributeId));
  });
  if (valid.length === 0) return null;
  return { preset: { ...p, catalog: { id: registry.id, version: registry.version }, patches: valid }, dropped: p.patches.length - valid.length };
};

export const exportUserPresets = (presets: readonly UserPreset[]): string =>
  `${JSON.stringify({ kind: "prompter.user-presets", version: 1, presets: [...presets] } satisfies UserPresetLibraryFile, null, 2)}\n`;

export interface UserPresetImport {
  presets: UserPreset[];
  /** Presets that could not be used at all. */
  rejected: number;
  /** Patches dropped from imported presets (unknown attribute / invalid value). */
  droppedPatches: number;
}

/** Read a library file (or a single preset). Imported presets get new ids so they never replace existing ones. */
export const importUserPresets = (text: string, registry: CatalogRegistry, now: Date = new Date(), random: () => number = Math.random): UserPresetImport | null => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const list = (raw as { kind?: unknown; presets?: unknown })?.kind === "prompter.user-presets" ? (raw as { presets?: unknown }).presets : [raw];
  if (!Array.isArray(list)) return null;
  const out: UserPresetImport = { presets: [], rejected: 0, droppedPatches: 0 };
  for (const item of list) {
    const r = normalizeUserPreset(item, registry);
    if (!r) {
      out.rejected++;
      continue;
    }
    out.droppedPatches += r.dropped;
    out.presets.push({ ...r.preset, id: newUserPresetId(now, random) });
  }
  return out;
};

/** Read the local library; anything damaged is ignored (an empty library, never an error). */
export const loadUserPresets = (text: string | null, registry: CatalogRegistry): UserPreset[] => {
  if (!text) return [];
  try {
    const raw = JSON.parse(text) as { kind?: unknown; version?: unknown; presets?: unknown };
    if (raw.kind !== "prompter.user-presets" || raw.version !== 1 || !Array.isArray(raw.presets)) return [];
    return raw.presets.flatMap((p) => normalizeUserPreset(p, registry)?.preset ?? []);
  } catch {
    return [];
  }
};

/** Duplicate with a new id and name. */
export const duplicateUserPreset = (p: UserPreset, name: string, now: Date = new Date(), id: string = newUserPresetId(now)): UserPreset => ({
  ...p,
  id,
  name: name.slice(0, USER_PRESET_NAME_MAX),
  favorite: false,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

/** The categories a preset covers most (category path labels' first two levels), most attributes first. */
export const userPresetCategories = (registry: CatalogRegistry, p: UserPreset): Array<{ categoryId: string; count: number }> => {
  const counts = new Map<string, number>();
  for (const x of p.patches) {
    const c = registry.getAttribute(x.attributeId)?.categoryId;
    if (!c) continue;
    const path = registry.categoryPath(c);
    const key = path[Math.min(1, path.length - 1)]!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([categoryId, count]) => ({ categoryId, count })).sort((a, b) => b.count - a.count);
};
