"use client";

import { useMemo, useRef, useState } from "react";
import {
  applyPresetPlan,
  createEmptySpec,
  isUserPresetId,
  normalizeSearch,
  planPresetDefinition,
  resolveText,
  savedLocks,
  userPresetCategories,
  userPresetToDefinition,
  writableEntries,
  type CatalogRegistry,
  type UserPreset,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import type { UserPresets } from "@/state/useUserPresets";
import type { Workspace } from "@/state/useWorkspace";
import { cameraLayers } from "@/visual/camera-sketch";
import { headLayers } from "@/visual/hair-sketch";
import { lightLayers } from "@/visual/light-sketch";
import { PresetDialog } from "../detailed/PresetDialog";
import { downloadText, timestamp } from "../download";
import { faceSketchState } from "../face/faceSketchState";
import { SketchSvg } from "../face/FaceSketch";
import { cameraSketchState, cameraSubject, frameSize, lightSketchState } from "../scene/sceneSketchState";
import { SavePresetDialog } from "./SavePresetDialog";

const HEAD_BOX = [-25, -6, 250, 262] as const;
const LIGHT_INSET = [58, 20, 84, 84] as const;
const FACE = /^person\.(face|eyes|eyebrows|nose|lips|skin|hair|facial_hair|expression|makeup)\./;
const SCENE = /^(camera|composition|lighting)\./;

/**
 * My Presets (Sprint 3.3, in the Recommended tab): the user's own presets next to the system concepts.
 * Save (all / categories / single attributes), search, favorites, rename, duplicate, delete, JSON export
 * and import; applying goes through the existing preset dialog (changes first, own values kept by default,
 * locks protected, undo), with an option to apply the preset's saved locks.
 */
export function MyPresets({
  registry,
  workspace,
  userPresets,
  locale,
  t,
  onPresetApplied,
  onNotice,
}: {
  registry: CatalogRegistry;
  workspace: Workspace;
  userPresets: UserPresets;
  locale: string;
  t: Messages;
  onPresetApplied(name: string, count: number): void;
  onNotice(text: string, kind: "success" | "info" | "error"): void;
}) {
  const m = t.myPresets;
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<UserPreset | null>(null);
  const [applying, setApplying] = useState<UserPreset | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const q = normalizeSearch(query.trim());
  const catLabel = (id: string) => resolveText(registry.getCategory(id)?.label, locale);
  const shown = userPresets.presets
    .filter((p) => (!favoritesOnly || p.favorite) && (!q || normalizeSearch([p.name, p.description ?? "", ...userPresetCategories(registry, p).map((c) => catLabel(c.categoryId))].join(" ")).includes(q)))
    .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)));
  const tx = workspace.presetTransaction;
  const last = tx && isUserPresetId(tx.presetId) ? userPresets.presets.find((p) => p.id === tx.presetId) : undefined;

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    const r = userPresets.importText(await f.text());
    if (file.current) file.current.value = "";
    if (!r) return onNotice(m.importFailed, "error");
    onNotice(
      [fmt(m.imported, { n: r.presets.length }), r.droppedPatches ? fmt(m.importSkipped, { n: r.droppedPatches }) : "", r.rejected ? fmt(m.importRejected, { n: r.rejected }) : ""].filter(Boolean).join(" "),
      r.presets.length ? "success" : "info",
    );
  };

  return (
    <section className="my-presets" aria-labelledby="my-presets-title" data-testid="my-presets">
      <h2 id="my-presets-title">{m.title}</h2>
      <p className="muted small">{m.intro}</p>
      <div className="my-presets__bar toolbar">
        <button type="button" className="button button--primary" onClick={() => setSaving(true)} data-testid="preset-save-current">
          {m.saveCurrent}
        </button>
        <button type="button" className="button" onClick={() => file.current?.click()}>
          {m.import}
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} data-testid="preset-import-input" />
        {userPresets.presets.length > 0 && (
          <button type="button" className="button" onClick={() => downloadText(`prompter-presets-${timestamp(new Date())}.json`, userPresets.exportText())}>
            {m.exportAll}
          </button>
        )}
      </div>
      {!userPresets.saved && (
        <p className="notice notice--warning small" role="alert">
          {m.storageFailed}
        </p>
      )}
      {last && (
        <div className="preset-bar" role="status" data-testid="user-preset-bar">
          <span>{fmt(m.last, { name: last.name })}</span>
          <button type="button" className="button button--small" onClick={() => workspace.undoPreset()}>
            {m.undo}
          </button>
        </div>
      )}
      {userPresets.presets.length === 0 ? (
        <p className="muted" data-testid="my-presets-empty">
          {m.empty}
        </p>
      ) : (
        <>
          <div className="my-presets__filters">
            <input type="search" className="text-input" value={query} placeholder={m.search} aria-label={m.search} onChange={(e) => setQuery(e.target.value)} data-testid="preset-search" />
            <label className="small">
              <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} data-testid="preset-favorites-only" /> ★ {m.favoritesOnly}
            </label>
          </div>
          {shown.length === 0 ? (
            <p className="muted">{m.noMatch}</p>
          ) : (
            <ul className="concepts my-presets__list">
              {shown.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  registry={registry}
                  locale={locale}
                  t={t}
                  applied={last?.id === p.id}
                  onApply={() => setApplying(p)}
                  onFavorite={() => userPresets.toggleFavorite(p.id)}
                  onRename={() => setEditing(p)}
                  onDuplicate={() => userPresets.duplicate(p.id, fmt(m.copyName, { name: p.name }))}
                  onExport={() => downloadText(`prompter-preset-${timestamp(new Date())}.json`, userPresets.exportText([p.id]))}
                  onDelete={() => {
                    if (!window.confirm(fmt(m.deleteConfirm, { name: p.name }))) return;
                    userPresets.remove(p.id);
                    onNotice(fmt(m.deleted, { name: p.name }), "info");
                  }}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {saving && (
        <SavePresetDialog
          registry={registry}
          spec={workspace.spec}
          locale={locale}
          t={t}
          onClose={() => setSaving(false)}
          onSave={(input) => {
            const p = userPresets.save(workspace.spec, input);
            setSaving(false);
            if (p) onNotice(fmt(m.savedNotice, { name: p.name, n: p.patches.length }), "success");
          }}
        />
      )}
      {editing && (
        <SavePresetDialog
          registry={registry}
          spec={workspace.spec}
          locale={locale}
          t={t}
          edit={{ name: editing.name, ...(editing.description ? { description: editing.description } : {}) }}
          onClose={() => setEditing(null)}
          onSave={({ name, description }) => {
            userPresets.rename(editing.id, name, description);
            setEditing(null);
          }}
        />
      )}
      {applying && (
        <PresetDialog
          preset={userPresetToDefinition(applying)}
          savedLocks={savedLocks(applying)}
          registry={registry}
          workspace={workspace}
          locale={locale}
          t={t}
          protectUserValues
          onClose={() => setApplying(null)}
          onApplied={(plan, mode, lockIds) => {
            const count = writableEntries(plan, mode, new Set(workspace.locks)).length;
            workspace.applyPreset(plan, mode, lockIds);
            setApplying(null);
            onPresetApplied(applying.name, count);
          }}
        />
      )}
    </section>
  );
}

function PresetCard({
  preset: p,
  registry,
  locale,
  t,
  applied,
  onApply,
  onFavorite,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}: {
  preset: UserPreset;
  registry: CatalogRegistry;
  locale: string;
  t: Messages;
  applied: boolean;
  onApply(): void;
  onFavorite(): void;
  onRename(): void;
  onDuplicate(): void;
  onExport(): void;
  onDelete(): void;
}) {
  const m = t.myPresets;
  const categories = userPresetCategories(registry, p).slice(0, 3);
  const locks = savedLocks(p).length;
  // the preset on its own (an empty spec), drawn with the existing sketches where it has something to show
  const sketch = useMemo(() => {
    const empty = createEmptySpec(registry);
    const spec = applyPresetPlan(empty, registry, planPresetDefinition(empty, registry, userPresetToDefinition(p)), "all").spec;
    const ids = p.patches.map((x) => x.attributeId);
    const face = ids.some((id) => FACE.test(id)) ? faceSketchState(registry, spec).params : null;
    const scene = ids.some((id) => SCENE.test(id));
    const [W, H] = frameSize(registry, spec, 160);
    return {
      head: face ? headLayers(face, face.hair) : null,
      camera: scene ? cameraLayers(cameraSketchState(registry, spec).params, W, H, cameraSubject(registry, spec)) : null,
      light: scene ? lightLayers(lightSketchState(registry, spec).params) : null,
      W,
      H,
    };
  }, [registry, p]);
  const hasSketch = sketch.head || sketch.camera;
  return (
    <li className="concept my-preset" data-user-preset={p.id} data-applied={applied || undefined}>
      {hasSketch && (
        <div className="concept__media my-preset__media" role="img" aria-label={fmt(m.sketch, { name: p.name })}>
          {sketch.head && <SketchSvg layers={sketch.head} box={HEAD_BOX} label="" decorative className="my-preset__head" />}
          {sketch.camera && <SketchSvg layers={sketch.camera} box={[0, 0, sketch.W, sketch.H]} label="" decorative className="concept__camera" />}
          {sketch.light && <SketchSvg layers={sketch.light} box={LIGHT_INSET} label="" decorative className="concept__light" />}
        </div>
      )}
      <div className="concept__body">
        <h3>
          {p.name} <span className="badge badge--mine">{m.mine}</span>
          {applied && <span className="badge badge--set"> {t.recommended.applied}</span>}
        </h3>
        {p.description && <p className="small">{p.description}</p>}
        <p className="small">
          <strong>{fmt(m.count, { n: p.patches.length })}</strong>
          {locks > 0 && <span className="badge badge--locked"> 🔒 {fmt(m.locksSaved, { n: locks })}</span>}
        </p>
        {categories.length > 0 && (
          <p className="small muted">
            {m.categories}: {categories.map((c) => `${resolveText(registry.getCategory(c.categoryId)?.label, locale)} ${c.count}`).join(" · ")}
          </p>
        )}
        <div className="toolbar my-preset__actions">
          <button type="button" className="button button--primary" aria-label={fmt(m.applyOne, { name: p.name })} onClick={onApply}>
            {m.apply}
          </button>
          <button type="button" className={`button button--small my-preset__fav${p.favorite ? " is-on" : ""}`} aria-pressed={Boolean(p.favorite)} aria-label={`${m.favorite}: ${p.name}`} onClick={onFavorite}>
            {p.favorite ? "★" : "☆"}
          </button>
        </div>
        <div className="toolbar my-preset__manage small">
          <button type="button" className="link-button" onClick={onRename} aria-label={`${m.rename}: ${p.name}`}>
            {m.rename}
          </button>
          <button type="button" className="link-button" onClick={onDuplicate} aria-label={`${m.duplicate}: ${p.name}`}>
            {m.duplicate}
          </button>
          <button type="button" className="link-button" onClick={onExport} aria-label={`${m.exportOne}: ${p.name}`}>
            {m.exportOne}
          </button>
          <button type="button" className="link-button link-button--danger" onClick={onDelete} aria-label={`${m.delete}: ${p.name}`}>
            {m.delete}
          </button>
        </div>
      </div>
    </li>
  );
}
