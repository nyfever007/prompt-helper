"use client";

import { useId, type ReactNode } from "react";
import { resolveText, type CatalogRegistry, type ImageSpec } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { boxAttr, CROPS, frontLayers, profileLayers, type Box, type El, type Layer, type LayerId } from "@/visual/face-sketch";
import { paint } from "@/visual/sketch-core";
import { FIG_CROPS, figureLayers } from "@/visual/figure-sketch";
import { HEAD_CROPS, headLayers } from "@/visual/hair-sketch";
import { figureSketchState } from "../figure/figureSketchState";
import { cameraLayers } from "@/visual/camera-sketch";
import { LIGHT_BOX, lightLayers } from "@/visual/light-sketch";
import { cameraSketchState, cameraSubject, lightSketchState } from "../scene/sceneSketchState";
import { faceSketchState } from "./faceSketchState";

/** Inline SVG of sketch layers. Colours come from `.face-sketch` tokens (light/dark) in globals.css. */
export function SketchSvg({ layers, box, label, focus, className }: { layers: Layer[]; box: Box; label: string; focus?: LayerId | undefined; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  let n = 0;
  const style = (e: { fill?: string; stroke?: string; sw?: number }) =>
    e.fill || e.stroke || e.sw !== undefined ? { ...(e.fill ? { fill: paint(e.fill, uid) } : {}), ...(e.stroke ? { stroke: paint(e.stroke, uid) } : {}), ...(e.sw !== undefined ? { strokeWidth: e.sw } : {}) } : undefined;
  const el = (e: El, key: string): ReactNode => {
    if (e.t === "circle") return <circle key={key} className={e.c} cx={e.cx} cy={e.cy} r={e.r} style={style(e)} opacity={e.opacity} />;
    if (e.t === "path") return <path key={key} className={e.c} d={e.d} style={style(e)} opacity={e.opacity} />;
    if (e.t === "grad") {
      const stops = e.stops.map(([o, c, op], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={op} />);
      return (
        <defs key={key}>
          {e.radial ? (
            <radialGradient id={`${uid}${e.id}`} gradientUnits="userSpaceOnUse" cx={e.radial.cx} cy={e.radial.cy} r={e.radial.r} fx={e.radial.fx} fy={e.radial.fy}>
              {stops}
            </radialGradient>
          ) : (
            <linearGradient id={`${uid}${e.id}`} gradientUnits="userSpaceOnUse" x1={e.linear!.x1} y1={e.linear!.y1} x2={e.linear!.x2} y2={e.linear!.y2}>
              {stops}
            </linearGradient>
          )}
        </defs>
      );
    }
    if (e.t === "g") {
      const fid = e.blur ? `${uid}f${n++}` : null;
      return (
        <g key={key}>
          {fid && (
            <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={e.blur} />
            </filter>
          )}
          <g filter={fid ? `url(#${fid})` : undefined} transform={e.rotate ? `rotate(${e.rotate.join(" ")})` : undefined} opacity={e.opacity}>
            {e.children.map((c, i) => el(c, `${key}-${i}`))}
          </g>
        </g>
      );
    }
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

type View = "front" | "profile" | "head" | "figure" | "camera" | "light";
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
  // Sprint 2-D.4: camera sliders on the reference scene, lighting sliders on the head-sphere
  ...Object.fromEntries(["camera.distance", "composition.negative_space", "camera.depth_of_field", "camera.focus_sharpness"].map((id) => [id, { view: "camera" as const, box: [0, 0, 160, 120] as Box, focus: "subject" as LayerId }])),
  ...Object.fromEntries(["lighting.key_height", "lighting.shadow_edge"].map((id) => [id, { view: "light" as const, box: LIGHT_BOX as Box, focus: "light" as LayerId }])),
};

export function SliderPreview({ registry, spec, attributeId, locale, t }: { registry: CatalogRegistry; spec: ImageSpec; attributeId: string; locale: string; t: Messages }) {
  const cfg = SLIDER_PREVIEWS[attributeId];
  if (!cfg) return null;
  const unset = !(attributeId in spec.selections);
  const layers = (() => {
    if (cfg.view === "camera") return cameraLayers(cameraSketchState(registry, spec, attributeId).params, 160, 120, cameraSubject(registry, spec));
    if (cfg.view === "light") return lightLayers(lightSketchState(registry, spec, attributeId).params);
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
      <SketchSvg layers={layers} box={cfg.box} focus={cfg.view === "figure" || cfg.view === "camera" || cfg.view === "light" ? undefined : cfg.focus} label={fmt(t.face.preview, { name })} />
      {unset && <figcaption className="muted small">{t.face.previewUnset}</figcaption>}
    </figure>
  );
}
