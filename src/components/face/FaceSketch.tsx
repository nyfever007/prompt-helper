"use client";

import { useId, type ReactNode } from "react";
import { resolveText, type CatalogRegistry, type ImageSpec } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { boxAttr, CROPS, frontLayers, profileLayers, type Box, type El, type Layer, type LayerId } from "@/visual/face-sketch";
import { FIG_CROPS, figureLayers } from "@/visual/figure-sketch";
import { HEAD_CROPS, headLayers } from "@/visual/hair-sketch";
import { figureSketchState } from "../figure/figureSketchState";
import { faceSketchState } from "./faceSketchState";

/** Inline SVG of sketch layers. Colours come from `.face-sketch` tokens (light/dark) in globals.css. */
export function SketchSvg({ layers, box, label, focus, className }: { layers: Layer[]; box: Box; label: string; focus?: LayerId | undefined; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  let n = 0;
  const el = (e: El, key: string): ReactNode => {
    if (e.t === "circle") return <circle key={key} className={e.c} cx={e.cx} cy={e.cy} r={e.r} style={e.fill ? { fill: e.fill } : undefined} />;
    if (e.t === "path") return <path key={key} className={e.c} d={e.d} style={e.fill ? { fill: e.fill } : undefined} opacity={e.opacity} />;
    const id = `${uid}k${n++}`;
    return (
      <g key={key}>
        <clipPath id={id}>
          {(Array.isArray(e.d) ? e.d : [e.d]).map((d, i) => (
            <path key={i} d={d} clipRule={e.evenOdd ? "evenodd" : undefined} />
          ))}
        </clipPath>
        <g clipPath={`url(#${id})`}>{e.children.map((c, i) => el(c, `${key}-${i}`))}</g>
      </g>
    );
  };
  return (
    <svg className={`face-sketch ${className ?? ""}`} viewBox={boxAttr(box)} role="img" aria-label={label} data-focus={focus} preserveAspectRatio="xMidYMid meet">
      {layers.map((l) => (
        <g key={l.id} data-layer={l.id}>
          {l.els.map((e, i) => el(e, `${l.id}-${i}`))}
        </g>
      ))}
    </svg>
  );
}

type View = "front" | "profile" | "head" | "figure";
const fig = (box: Box) => ({ view: "figure" as const, box, focus: "body" as LayerId });
/** Live preview of one relative slider: the sketch around that feature, redrawn as the value changes. */
export const SLIDER_PREVIEWS: Record<string, { view: View; box: Box; focus: LayerId }> = {
  ...Object.fromEntries(["length", "width", "forehead_height", "forehead_width"].map((x) => [`person.face.${x}`, { view: "front", box: CROPS.face, focus: "face" }])),
  ...Object.fromEntries(["size", "width", "height", "spacing", "outer_corner_angle", "iris_size"].map((x) => [`person.eyes.${x}`, { view: "front", box: CROPS.eyes, focus: "eyes" }])),
  ...Object.fromEntries(["thickness", "length", "density", "angle", "height", "spacing"].map((x) => [`person.eyebrows.${x}`, { view: "front", box: CROPS.eyes, focus: "brows" }])),
  ...Object.fromEntries(["length", "width", "alar_width"].map((x) => [`person.nose.${x}`, { view: "front", box: CROPS.noseFrontWide, focus: "nose" }])),
  ...Object.fromEntries(["bridge_height", "tip_angle"].map((x) => [`person.nose.${x}`, { view: "profile", box: CROPS.noseProfile, focus: "nose" }])),
  ...Object.fromEntries(["mouth_width", "upper_thickness", "lower_thickness", "corners"].map((x) => [`person.lips.${x}`, { view: "front", box: CROPS.lipsWide, focus: "lips" }])),
  // Sprint 2-D.3: hair volume on the reference face; body proportions on the neutral mannequin
  "person.hair.volume": { view: "head", box: HEAD_CROPS.head, focus: "hair" },
  ...Object.fromEntries(
    ["height", "frame", "muscle_mass", "body_fat", "head_size", "heads_tall", "upper_body_length", "lower_body_length", "arm_length", "leg_length"].map((x) => [`person.body.${x}`, fig(FIG_CROPS.figure)]),
  ),
  ...Object.fromEntries(["neck_length", "neck_thickness", "shoulder_width"].map((x) => [`person.body.${x}`, fig(FIG_CROPS.shoulders)])),
  ...Object.fromEntries(["rib_cage_width", "waist_width", "waist_curvature", "pelvis_width", "waist_hip_contrast"].map((x) => [`person.body.${x}`, fig(FIG_CROPS.torso)])),
  ...Object.fromEntries(["upper_arm_thickness", "forearm_thickness", "hand_size"].map((x) => [`person.body.${x}`, fig(FIG_CROPS.topArms)])),
  ...Object.fromEntries(["thigh_thickness", "calf_thickness", "ankle_thickness", "foot_size"].map((x) => [`person.body.${x}`, fig(FIG_CROPS.legs)])),
};

export function SliderPreview({ registry, spec, attributeId, locale, t }: { registry: CatalogRegistry; spec: ImageSpec; attributeId: string; locale: string; t: Messages }) {
  const cfg = SLIDER_PREVIEWS[attributeId];
  if (!cfg) return null;
  const unset = !(attributeId in spec.selections);
  const layers = (() => {
    if (cfg.view === "figure") {
      const { params } = figureSketchState(registry, spec, attributeId);
      return figureLayers(params.body, params.outfit, params.hair);
    }
    const { params } = faceSketchState(registry, spec, attributeId);
    return cfg.view === "front" ? frontLayers(params) : cfg.view === "head" ? headLayers(params, params.hair) : profileLayers(params);
  })();
  const name = resolveText(registry.getAttribute(attributeId)?.label, locale);
  return (
    <figure className="slider-preview" data-unset={unset} data-testid={`slider-preview-${attributeId}`}>
      <SketchSvg layers={layers} box={cfg.box} focus={cfg.view === "figure" ? undefined : cfg.focus} label={fmt(t.face.preview, { name })} />
      {unset && <figcaption className="muted small">{t.face.previewUnset}</figcaption>}
    </figure>
  );
}
