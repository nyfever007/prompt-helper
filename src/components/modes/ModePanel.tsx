"use client";

import type { CatalogRegistry } from "@/domain";
import type { Messages } from "@/i18n/messages";
import type { Mode } from "@/state/useUiPrefs";
import type { Workspace } from "@/state/useWorkspace";
import { DetailedEditor } from "../detailed/DetailedEditor";
import type { DetailedNavigator } from "../navigation";
import { BasicComposer } from "./BasicComposer";
import { RandomComposer } from "./RandomComposer";
import { RecommendedMode } from "./RecommendedMode";
import { SpecSummary } from "./SpecSummary";

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
}) {
  if (mode === "recommended")
    return <RecommendedMode registry={registry} workspace={workspace} locale={locale} t={t} onPresetApplied={onPresetApplied} onEdit={(m) => onModeChange?.(m)} />;
  if (mode === "random") return <RandomComposer registry={registry} workspace={workspace} locale={locale} t={t} onEdit={(m) => onModeChange?.(m)} />;
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
  const title = t.planned.precisionTitle;
  const body = t.planned.precisionBody;
  return (
    <div className="planned">
      <div className="planned__banner" role="note">
        <span className="badge badge--planned">{t.planned.badge}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <SpecSummary registry={registry} spec={workspace.spec} locale={locale} t={t} />
    </div>
  );
}
