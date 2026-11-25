"use client";

import type { CatalogRegistry } from "@/domain";
import type { Messages } from "@/i18n/messages";
import type { Mode } from "@/state/useUiPrefs";
import type { Workspace } from "@/state/useWorkspace";
import { DetailedEditor } from "../detailed/DetailedEditor";
import type { DetailedNavigator } from "../navigation";
import { BasicComposer } from "./BasicComposer";
import { SpecSummary } from "./SpecSummary";

/**
 * Basic renders approved basic-tier attributes; Detailed renders the
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
}) {
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
