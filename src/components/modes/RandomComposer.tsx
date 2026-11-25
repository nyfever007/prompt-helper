"use client";

import { isRandomSelection, RANDOM_ORIGIN, type CatalogRegistry } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { cameraLayers } from "@/visual/camera-sketch";
import { FIG_BOX, figureLayers } from "@/visual/figure-sketch";
import { headLayers } from "@/visual/hair-sketch";
import { LIGHT_BOX, lightLayers } from "@/visual/light-sketch";
import { WorkspaceField } from "../controls/WorkspaceField";
import { faceSketchState } from "../face/faceSketchState";
import { SketchSvg } from "../face/FaceSketch";
import { figureSketchState } from "../figure/figureSketchState";
import { attributeLabel, describeValue } from "../format";
import { cameraSketchState, cameraSubject, lightSketchState } from "../scene/sceneSketchState";

/** The five basics offered first (all optional): species, gender, style, background (place), appearance direction. */
export const RANDOM_BASICS = ["person.identity.species", "person.identity.gender", "style.preset", "scene.setting", "person.appearance.direction"] as const;
const HEAD_BOX = [-25, -6, 250, 262] as const;

/**
 * Random Composer (Sprint 2-D.6): one button fills every applicable setting the user has not chosen with a
 * random catalog value (domain/random/composer.ts). The user's own values — including the five basics here
 * and anything set in Basic / Detailed — concept values and excluded values are kept; generating again only
 * replaces random values; the last run can be undone (existing preset undo). The result is the same
 * ImageSpec, editable everywhere.
 */
export function RandomComposer({ registry, workspace, locale, t, onEdit }: { registry: CatalogRegistry; workspace: Workspace; locale: string; t: Messages; onEdit(mode: "basic" | "detailed"): void }) {
  const r = t.random;
  const spec = workspace.spec;
  const sels = Object.entries(spec.selections);
  const randomIds = sels.filter(([, s]) => isRandomSelection(s) && !s.excludedFromPrompt).map(([id]) => id);
  const userCount = sels.filter(([, s]) => s.source === "user" || s.source === "import" || (isRandomSelection(s) && s.excludedFromPrompt)).length;
  const conceptCount = sels.filter(([, s]) => s.source === "preset" && !isRandomSelection(s)).length;
  const lastIsRandom = workspace.presetTransaction?.presetId === RANDOM_ORIGIN.presetId;
  const last = workspace.lastRandom;
  const hasResult = randomIds.length > 0;
  return (
    <section className="random" aria-labelledby="random-title">
      <h2 id="random-title">{r.title}</h2>
      <p className="muted">{r.intro}</p>
      <p className="small">{r.keep}</p>

      <div className="random__actions">
        <button type="button" className="button button--primary random__go" onClick={() => workspace.randomize()} data-testid="random-generate">
          🎲 {hasResult ? r.regenerate : r.generate}
        </button>
        {lastIsRandom && (
          <button type="button" className="button" onClick={() => workspace.undoPreset()} data-testid="random-undo">
            {r.undo}
          </button>
        )}
        {hasResult && (
          <>
            <button type="button" className="button" onClick={() => onEdit("basic")}>
              {r.editBasic}
            </button>
            <button type="button" className="button" onClick={() => onEdit("detailed")}>
              {r.editDetailed}
            </button>
          </>
        )}
      </div>
      <p className="muted small">{r.creative}</p>

      <details className="random__basics" open>
        <summary>{r.basics}</summary>
        <div className="random__fields">
          {RANDOM_BASICS.map((id) => {
            const a = registry.getAttribute(id);
            if (!a) return null;
            const sel = spec.selections[id];
            const mine = sel !== undefined && !isRandomSelection(sel);
            return (
              <div key={id} className="random__field" data-random-basic={id}>
                <span className={`badge ${mine ? "badge--set" : "badge--random"}`} data-testid={`basic-state-${id}`}>
                  {mine ? r.stateMine : r.stateRandom}
                </span>
                <WorkspaceField attribute={a} registry={registry} workspace={workspace} locale={locale} t={t} />
              </div>
            );
          })}
        </div>
      </details>


      {last && lastIsRandom && (
        <p className="notice" role="status" data-testid="random-result" key={last.id}>
          {fmt(r.done, { n: last.written })}
          {last.removed > 0 && <> {fmt(r.removed, { n: last.removed })}</>}
          {last.safetyDropped.length > 0 && <> {fmt(r.safety, { n: last.safetyDropped.length })}</>}
        </p>
      )}
      {(hasResult || userCount > 0) && (
        <p className="small" data-testid="random-counts">
          {fmt(r.counts, { r: randomIds.length, u: userCount, p: conceptCount })}
        </p>
      )}
      {hasResult && <ResultSketches registry={registry} workspace={workspace} t={t} />}
      {hasResult && (
        <details className="random__list">
          <summary>{fmt(r.list, { n: randomIds.length })}</summary>
          <ul className="small">
            {randomIds.map((id) => (
              <li key={id}>
                <span className="muted">{attributeLabel(registry, id, locale)}:</span> {describeValue(registry.getAttribute(id)!, spec.selections[id]!.value, locale)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ResultSketches({ registry, workspace, t }: { registry: CatalogRegistry; workspace: Workspace; t: Messages }) {
  const spec = workspace.spec;
  const face = faceSketchState(registry, spec).params;
  const fig = figureSketchState(registry, spec).params;
  return (
    <figure className="random__sketches">
      <figcaption className="small">{t.random.sketches}</figcaption>
      <div className="random__sketch-row">
        <SketchSvg layers={headLayers(face, face.hair)} box={HEAD_BOX} label={t.random.face} className="random__sketch" />
        <SketchSvg layers={figureLayers(fig.body, fig.outfit, fig.hair)} box={FIG_BOX} label={t.random.figure} className="random__sketch random__sketch--tall" />
        <SketchSvg layers={cameraLayers(cameraSketchState(registry, spec).params, 160, 120, cameraSubject(registry, spec))} box={[0, 0, 160, 120]} label={t.random.camera} className="random__sketch random__sketch--wide" />
        <SketchSvg layers={lightLayers(lightSketchState(registry, spec).params)} box={LIGHT_BOX} label={t.random.light} className="random__sketch random__sketch--wide" />
      </div>
      <p className="muted small">{t.random.sketchNote}</p>
    </figure>
  );
}
