"use client";

import { useMemo, useState } from "react";
import { applyPresetPlan, createEmptySpec, planPreset, resolveText, writableEntries, type CatalogRegistry, type PresetDefinition } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { cameraLayers } from "@/visual/camera-sketch";
import { lightLayers } from "@/visual/light-sketch";
import type { UserPresets } from "@/state/useUserPresets";
import { PresetDialog } from "../detailed/PresetDialog";
import { MyPresets } from "../presets/MyPresets";
import { SketchSvg } from "../face/FaceSketch";
import { describeValue, attributeLabel } from "../format";
import { cameraSketchState, cameraSubject, frameSize, lightSketchState } from "../scene/sceneSketchState";

const KEY_SETTINGS = 5;
/** The sphere part of the lighting sketch (the bust is cropped away for the small inset). */
const LIGHT_INSET = [58, 20, 84, 84] as const;

/**
 * Recommended mode (Sprint 2-D.5): start from a concept. Each concept is an approved catalog preset
 * (no categoryId) applied through the existing plan → confirm → apply → undo path, keeping the user's own
 * values by default. The sketch is the concept's camera and lighting on the neutral mannequin, drawn by the
 * same modules as the camera / lighting previews — not a generated image.
 */
export function RecommendedMode({
  registry,
  workspace,
  locale,
  t,
  onPresetApplied,
  onEdit,
  userPresets,
  onNotice,
}: {
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
  onPresetApplied(name: string, count: number): void;
  onEdit(mode: "basic" | "detailed"): void;
  /** Sprint 3.3: My Presets (shown below the system concepts). */
  userPresets?: UserPresets;
  onNotice?(text: string, kind: "success" | "info" | "error"): void;
}) {
  const concepts = useMemo(() => registry.presets.filter((p) => p.status === "approved" && !p.categoryId), [registry]);
  const [dialogId, setDialogId] = useState<string | null>(null);
  const tx = workspace.presetTransaction;
  const last = tx ? concepts.find((c) => c.id === tx.presetId) : undefined;
  const r = t.recommended;
  return (
    <section className="recommended" aria-labelledby="recommended-title">
      <h2 id="recommended-title">{r.title}</h2>
      <p className="muted">{r.intro}</p>
      <p className="small">{r.keep}</p>
      {last && (
        <div className="preset-bar" role="status" data-testid="concept-bar">
          <span>{fmt(r.last, { name: resolveText(last.label, locale) })}</span>
          <button type="button" className="button button--small" onClick={() => workspace.undoPreset()}>
            {r.undo}
          </button>
          <button type="button" className="button button--small" onClick={() => onEdit("basic")}>
            {r.editBasic}
          </button>
          <button type="button" className="button button--small" onClick={() => onEdit("detailed")}>
            {r.editDetailed}
          </button>
        </div>
      )}
      <ul className="concepts">
        {concepts.map((c) => (
          <ConceptCard key={c.id} concept={c} registry={registry} locale={locale} t={t} applied={last?.id === c.id} onOpen={() => setDialogId(c.id)} />
        ))}
      </ul>
      <p className="muted small">{r.sketchNote}</p>
      {userPresets && (
        <MyPresets registry={registry} workspace={workspace} userPresets={userPresets} locale={locale} t={t} onPresetApplied={onPresetApplied} onNotice={(text, kind) => onNotice?.(text, kind)} />
      )}
      {dialogId && (
        <PresetDialog
          presetId={dialogId}
          registry={registry}
          workspace={workspace}
          locale={locale}
          t={t}
          protectUserValues
          onClose={() => setDialogId(null)}
          onApplied={(plan, mode) => {
            const count = writableEntries(plan, mode, new Set(workspace.locks)).length;
            workspace.applyPreset(plan, mode);
            setDialogId(null);
            onPresetApplied(resolveText(plan.preset.label, locale), count);
          }}
        />
      )}
    </section>
  );
}

function ConceptCard({ concept, registry, locale, t, applied, onOpen }: { concept: PresetDefinition; registry: CatalogRegistry; locale: string; t: Messages; applied: boolean; onOpen(): void }) {
  const name = resolveText(concept.label, locale);
  // the concept on its own (an empty spec), so every card is drawn the same way
  const sketch = useMemo(() => {
    const empty = createEmptySpec(registry);
    const plan = planPreset(empty, registry, concept.id);
    const spec = plan.ok ? applyPresetPlan(empty, registry, plan.value, "all").spec : empty;
    const [W, H] = frameSize(registry, spec, 160);
    return { camera: cameraLayers(cameraSketchState(registry, spec).params, W, H, cameraSubject(registry, spec)), W, H, light: lightLayers(lightSketchState(registry, spec).params) };
  }, [registry, concept.id]);
  const keys = concept.patches.filter((p) => p.attributeId !== "subject.kind");
  return (
    <li className="concept" data-preset-id={concept.id} data-applied={applied || undefined}>
      <div className="concept__media" role="img" aria-label={fmt(t.recommended.visual, { name })}>
        <SketchSvg layers={sketch.camera} box={[0, 0, sketch.W, sketch.H]} label="" decorative className="concept__camera" />
        <SketchSvg layers={sketch.light} box={LIGHT_INSET} label="" decorative className="concept__light" />
      </div>
      <div className="concept__body">
        <h3>
          {name} {locale !== "en" && <span className="concept__en" lang="en">{concept.label.en}</span>} <span className="badge badge--system">{t.myPresets.system}</span>
          {applied && <span className="badge badge--set"> {t.recommended.applied}</span>}
        </h3>
        {concept.description && <p className="small">{resolveText(concept.description, locale)}</p>}
        <p className="concept__keys-title muted small">{t.recommended.keySettings}</p>
        <ul className="concept__keys small">
          {keys.slice(0, KEY_SETTINGS).map((p) => {
            const a = registry.getAttribute(p.attributeId)!;
            return (
              <li key={p.attributeId}>
                <span className="muted">{attributeLabel(registry, p.attributeId, locale)}:</span> {describeValue(a, p.value, locale)}
              </li>
            );
          })}
          {keys.length > KEY_SETTINGS && <li className="muted">{fmt(t.recommended.more, { n: keys.length - KEY_SETTINGS })}</li>}
        </ul>
        <button type="button" className="button button--primary" aria-label={fmt(t.recommended.previewOne, { name })} onClick={onOpen}>
          {t.recommended.preview}
        </button>
      </div>
    </li>
  );
}
