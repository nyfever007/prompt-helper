"use client";

import { resolveText, type CatalogRegistry, type ImageSpec } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { cameraLayers } from "@/visual/camera-sketch";
import { LIGHT_BOX, lightLayers } from "@/visual/light-sketch";
import { attributeLabel } from "../format";
import { SketchSvg } from "../face/FaceSketch";
import { cameraSketchState, cameraSubject, frameSize, isCameraCategory, isLightCategory, lightSketchState } from "./sceneSketchState";

/**
 * Camera / lighting preview (Sprint 2-D.4): every camera (or lighting) setting of the shared ImageSpec combined
 * into one live sketch on the camera (or lighting) pages. Read-only; unset settings use an unsaved neutral view.
 */
export function ScenePreview({
  kind,
  registry,
  spec,
  categoryId,
  locale,
  t,
  open,
  onToggle,
  onSelect,
}: {
  kind: "camera" | "light";
  registry: CatalogRegistry;
  spec: ImageSpec;
  categoryId: string;
  locale: string;
  t: Messages;
  open: boolean;
  onToggle(open: boolean): void;
  onSelect(categoryId: string, attributeId?: string): void;
}) {
  const text = kind === "camera" ? t.camera : t.light;
  const s = kind === "camera" ? cameraSketchState(registry, spec) : lightSketchState(registry, spec);
  const inArea = kind === "camera" ? isCameraCategory : isLightCategory;
  const parent = registry.getCategory(categoryId)?.parentId;
  const areas = registry.categories.filter((c) => c.parentId === parent && c.status === "approved" && inArea(registry, c.id)).sort((a, b) => a.order - b.order);
  const countIn = (cat: string) => Object.keys(spec.selections).filter((id) => registry.getAttribute(id)?.categoryId === cat).length;
  const [W, H] = frameSize(registry, spec);
  const svg =
    kind === "camera" ? (
      <SketchSvg layers={cameraLayers(cameraSketchState(registry, spec).params, W, H, cameraSubject(registry, spec))} box={[0, 0, W, H]} label={fmt(text.view, { n: s.drawn.length })} className="scene-preview__camera" />
    ) : (
      <SketchSvg layers={lightLayers(lightSketchState(registry, spec).params)} box={LIGHT_BOX} label={fmt(text.view, { n: s.drawn.length })} className="scene-preview__light" />
    );
  const list = (ids: string[], testId: string, title: string) =>
    ids.length > 0 && (
      <li data-testid={testId}>
        {title}{" "}
        {ids.map((id, i) => (
          <span key={id}>
            {i > 0 && ", "}
            <button type="button" className="link-button" onClick={() => onSelect(registry.getAttribute(id)?.categoryId ?? categoryId, id)}>
              {attributeLabel(registry, id, locale)}
            </button>
          </span>
        ))}
      </li>
    );
  return (
    <details className="face-builder scene-preview" open={open} onToggle={(e) => onToggle(e.currentTarget.open)} data-testid={`${kind}-preview`}>
      <summary>
        <span className="face-builder__title">{text.title}</span>
        <span className="muted small"> {open ? t.face.hide : t.face.show}</span>
      </summary>
      <div className="face-builder__body">
        <div className="face-builder__art">{svg}</div>
        <div className="face-builder__info">
          <p className="small">{text.intro}</p>
          <nav aria-label={t.figure.areas} className="face-builder__areas">
            {areas.map((c) => (
              <button key={c.id} type="button" className="button button--small face-builder__area" aria-current={c.id === categoryId ? "page" : undefined} onClick={() => onSelect(c.id)}>
                {fmt(t.face.areaCount, { name: resolveText(c.label, locale), n: countIn(c.id) })}
              </button>
            ))}
          </nav>
          <ul className="face-builder__status small">
            <li className="muted">{text.neutral}</li>
            {list(s.excluded, `${kind}-preview-excluded`, t.face.excluded)}
            {list(s.inactive, `${kind}-preview-inactive`, t.face.inactive)}
            {list(s.notDrawn, `${kind}-preview-not-drawn`, t.face.notDrawn)}
          </ul>
        </div>
      </div>
    </details>
  );
}
