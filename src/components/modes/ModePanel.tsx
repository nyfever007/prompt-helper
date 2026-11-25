"use client";

import { DEFAULT_RANDOM_STYLE, type CatalogRegistry, type RandomStyle } from "@/domain";
import type { Messages } from "@/i18n/messages";
import type { Mode } from "@/state/useUiPrefs";
import type { Workspace } from "@/state/useWorkspace";
import { DetailedEditor } from "../detailed/DetailedEditor";
import type { DetailedNavigator } from "../navigation";
import { BasicComposer } from "./BasicComposer";
import { PrecisionPanel } from "./PrecisionPanel";
import { RandomComposer } from "./RandomComposer";
import { RecommendedMode } from "./RecommendedMode";

/**
 * Recommended (Sprint 2-D.5) starts from a concept preset; Basic renders approved basic-tier attributes; Detailed renders the
 * data-driven Detailed Editor; Precision remains an honest placeholder that
 * reads the same shared spec.
 */
export function ModePanel({
  mode,
  registry,
  workspace,
  locale,
  t,
  onPresetApplied,
  onModeChange,
  navigatorRef,
  initialAttributeId,
  randomStyle = DEFAULT_RANDOM_STYLE,
  onRandomStyle,
  onGoTo,
}: {
  mode: Mode;
  /** Registered by the Detailed editor so “go to attribute” works while it is shown. */
  navigatorRef?: DetailedNavigator;
  /** Attribute to open when the Detailed editor mounts (after a “go to attribute” from Basic). */
  initialAttributeId?: string | null;
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
  onPresetApplied(name: string, count: number): void;
  /** Recommended mode: “edit in Basic / Detailed” after applying a concept. */
  onModeChange?(mode: Mode): void;
  /** Random mode: the selected style (a view preference, not part of the spec). */
  randomStyle?: RandomStyle;
  onRandomStyle?(style: RandomStyle): void;
  /** Precision: open an attribute's field for editing. */
  onGoTo?(attributeId: string): void;
}) {
  if (mode === "recommended")
    return <RecommendedMode registry={registry} workspace={workspace} locale={locale} t={t} onPresetApplied={onPresetApplied} onEdit={(m) => onModeChange?.(m)} />;
  if (mode === "random")
    return (
      <RandomComposer registry={registry} workspace={workspace} locale={locale} t={t} onEdit={(m) => onModeChange?.(m)} style={randomStyle} onStyle={(s) => onRandomStyle?.(s)} />
    );;
  if (mode === "basic") return <BasicComposer registry={registry} workspace={workspace} locale={locale} t={t} />;
  if (mode === "detailed")
    return (
      <DetailedEditor
        registry={registry}
        workspace={workspace}
        locale={locale}
        t={t}
        onPresetApplied={onPresetApplied}
        {...(navigatorRef ? { navigatorRef } : {})}
        {...(initialAttributeId ? { initialAttributeId } : {})}
      />
    );
  return <PrecisionPanel registry={registry} workspace={workspace} locale={locale} t={t} onGoTo={(id) => onGoTo?.(id)} />;
}
