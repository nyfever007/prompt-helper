"use client";

import { resolveText, type CatalogRegistry, type ImageSpec } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { FRONT_BOX, frontLayers, PROFILE_BOX, profileLayers, type LayerId } from "@/visual/face-sketch";
import { attributeLabel } from "../format";
import { FACE_CATEGORY_IDS, faceSketchState, type FaceCategoryId } from "./faceSketchState";
import { SketchSvg } from "./FaceSketch";

const FOCUS: Record<FaceCategoryId, LayerId> = { person_face: "face", person_eyes: "eyes", person_eyebrows: "brows", person_nose: "nose", person_lips: "lips" };

/**
 * Face Builder (Sprint 2-D.2): the face and feature settings of the shared ImageSpec drawn as ONE sketch
 * (front + side view), on every face / eyes / eyebrows / nose / lips page of the Detailed editor.
 * Read-only: it never writes to the spec; unset features use a neutral, unsaved preview form.
 */
export function FaceBuilder({
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
  categoryId: FaceCategoryId;
  locale: string;
  t: Messages;
  open: boolean;
  onToggle(open: boolean): void;
  onSelect(categoryId: string, attributeId?: string): void;
}) {
  const s = faceSketchState(registry, spec);
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
  return (
    <details className="face-builder" open={open} onToggle={(e) => onToggle(e.currentTarget.open)} data-testid="face-builder">
      <summary>
        <span className="face-builder__title">{t.face.title}</span>
        <span className="muted small"> {open ? t.face.hide : t.face.show}</span>
      </summary>
      <div className="face-builder__body">
        <div className="face-builder__art">
          <SketchSvg layers={frontLayers(s.params)} box={FRONT_BOX} focus={FOCUS[categoryId]} label={fmt(t.face.front, { n: s.drawn.length })} className="face-builder__front" />
          <SketchSvg layers={profileLayers(s.params)} box={PROFILE_BOX} label={t.face.profile} className="face-builder__profile" />
        </div>
        <div className="face-builder__info">
          <p className="small">{t.face.intro}</p>
          <nav aria-label={t.face.areas} className="face-builder__areas">
            {FACE_CATEGORY_IDS.map((id) => (
              <button key={id} type="button" className="button button--small face-builder__area" aria-current={id === categoryId ? "page" : undefined} onClick={() => onSelect(id)}>
                {fmt(t.face.areaCount, { name: resolveText(registry.getCategory(id)?.label, locale), n: countIn(id) })}
              </button>
            ))}
          </nav>
          <ul className="face-builder__status small">
            <li className="muted">{t.face.neutral}</li>
            {list(s.excluded, "face-builder-excluded", t.face.excluded)}
            {list(s.inactive, "face-builder-inactive", t.face.inactive)}
            {list(s.notDrawn, "face-builder-not-drawn", t.face.notDrawn)}
          </ul>
        </div>
      </div>
    </details>
  );
}
