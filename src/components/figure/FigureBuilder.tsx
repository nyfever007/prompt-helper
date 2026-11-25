"use client";

import { resolveText, type CatalogRegistry, type ImageSpec } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { FIG_BOX, figureLayers } from "@/visual/figure-sketch";
import { poseLayers } from "@/visual/pose-sketch";
import { attributeLabel } from "../format";
import { SketchSvg } from "../face/FaceSketch";
import { figureSketchState, isFigureCategory, isPoseCategory } from "./figureSketchState";

const POSE_VIEW = [0, 0, 200, 260] as const;

/**
 * Figure Builder (Sprint 2-D.3): body proportions, the chosen garments (palette colours) and the hair length
 * of the shared ImageSpec drawn as ONE neutral mannequin, on every body and wardrobe page of the Detailed
 * editor. Read-only: it never writes to the spec; unchosen areas use unsaved plain base clothing.
 */
export function FigureBuilder({
  registry,
  spec,
  categoryId,
  locale,
  t,
  open,
  onToggle,
  onSelect,
}: {
  registry: CatalogRegistry;
  spec: ImageSpec;
  categoryId: string;
  locale: string;
  t: Messages;
  open: boolean;
  onToggle(open: boolean): void;
  onSelect(categoryId: string, attributeId?: string): void;
}) {
  const s = figureSketchState(registry, spec);
  const parent = registry.getCategory(categoryId)?.parentId;
  const areas = registry.categories.filter((c) => c.parentId === parent && c.status === "approved" && isFigureCategory(registry, c.id)).sort((a, b) => a.order - b.order);
  const countIn = (cat: string) => Object.keys(spec.selections).filter((id) => registry.getAttribute(id)?.categoryId === cat).length;
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
  const { body, outfit, hair, pose } = s.params;
  const poseView = isPoseCategory(registry, categoryId);
  // pose view: the jointed mannequin (body proportions, pose, garment colours); clothing shapes are omitted
  const colors = { top: outfit.dress?.color ?? outfit.top?.color ?? null, bottom: outfit.bottom?.color ?? outfit.dress?.color ?? null };
  return (
    <details className="face-builder figure-builder" open={open} onToggle={(e) => onToggle(e.currentTarget.open)} data-testid="figure-builder">
      <summary>
        <span className="face-builder__title">{t.figure.title}</span>
        <span className="muted small"> {open ? t.face.hide : t.face.show}</span>
      </summary>
      <div className="face-builder__body">
        <div className="face-builder__art">
          {poseView ? (
            <SketchSvg layers={poseLayers(body, pose, { yaw: 20, pitch: 6, colors, box: POSE_VIEW })} box={POSE_VIEW} label={fmt(t.figure.pose, { n: s.drawn.length })} className="figure-builder__pose" />
          ) : (
            <SketchSvg layers={figureLayers(body, outfit, hair)} box={FIG_BOX} label={fmt(t.figure.front, { n: s.drawn.length })} className="figure-builder__figure" />
          )}
        </div>
        <div className="face-builder__info">
          <p className="small">{t.figure.intro}</p>
          <nav aria-label={t.figure.areas} className="face-builder__areas">
            {areas.map((c) => (
              <button key={c.id} type="button" className="button button--small face-builder__area" aria-current={c.id === categoryId ? "page" : undefined} onClick={() => onSelect(c.id)}>
                {fmt(t.face.areaCount, { name: resolveText(c.label, locale), n: countIn(c.id) })}
              </button>
            ))}
          </nav>
          <ul className="face-builder__status small">
            <li className="muted">{poseView ? t.figure.poseNeutral : t.figure.neutral}</li>
            {list(s.excluded, "figure-builder-excluded", t.face.excluded)}
            {list(s.inactive, "figure-builder-inactive", t.face.inactive)}
            {list(s.notDrawn, "figure-builder-not-drawn", t.face.notDrawn)}
          </ul>
        </div>
      </div>
    </details>
  );
}
