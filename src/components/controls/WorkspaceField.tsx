"use client";

import {
  evaluateAll,
  isAttributeActive,
  isOptionActive,
  isOptionRestricted,
  type AttributeDefinition,
  type CatalogRegistry,
  type Diagnostic,
} from "@/domain";
import type { Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { SLIDER_PREVIEWS, SliderPreview } from "../face/FaceSketch";
import { AttributeField } from "./AttributeField";

const FIELD_HIDDEN_CODES = new Set(["selection.inactive", "selection.option_inactive", "compiler.empty"]);
const concerns = (d: Diagnostic, attributeId: string) => d.attributeId === attributeId || (d.involves ?? []).includes(attributeId);

/** One attribute field bound to the shared workspace — identical in Basic and Detailed. */
export function WorkspaceField({ attribute: a, registry, workspace, locale, t }: { attribute: AttributeDefinition; registry: CatalogRegistry; workspace: Workspace; locale: string; t: Messages }) {
  const { spec, compilation } = workspace;
  const covered = compilation.covered?.find((c) => c.attributeId === a.id);
  const takeovers = compilation.fragments.flatMap((f) =>
    (f.takenOverBy ?? []).filter((x) => x.attributeId === a.id).map((x) => ({ presetAttributeId: f.attributeId, relation: x.relation })),
  );
  return (
    <AttributeField
      registry={registry}
      attribute={a}
      selection={spec.selections[a.id]}
      active={isAttributeActive(registry, a, spec)}
      isOptionActive={(o) => isOptionActive(registry, o, spec)}
      isOptionRestricted={(o) => isOptionRestricted(registry, o, spec)}
      isOptionSuggested={(o) => !o.suggestedWhen || evaluateAll(o.suggestedWhen, spec, registry)}
      {...(covered ? { coveredBy: { attributeId: covered.coveredBy, optionIds: covered.byOptionIds } } : {})}
      ageClass={compilation.age.ageClass}
      onSetExcluded={(excluded) => workspace.setExcluded(a.id, excluded)}
      diagnostics={compilation.diagnostics.filter((d) => !FIELD_HIDDEN_CODES.has(d.code) && d.code !== "preset.unit_overridden" && concerns(d, a.id))}
      fragment={compilation.fragments.find((f) => f.attributeId === a.id)}
      takeovers={takeovers}
      outputBlocked={compilation.blocked}
      locale={locale}
      t={t}
      onSet={(value) => workspace.setValue(a.id, value)}
      onClear={() => workspace.clear(a.id)}
      onClearAttribute={(id) => workspace.clear(id)}
      isAttributeSet={(id) => id in spec.selections}
      {...(SLIDER_PREVIEWS[a.id] ? { visual: <SliderPreview registry={registry} spec={spec} attributeId={a.id} locale={locale} t={t} /> } : {})}
    />
  );
}
