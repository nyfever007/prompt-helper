"use client";

import type { CatalogRegistry } from "@/domain";
import type { Messages } from "@/i18n/messages";
import type { Mode } from "@/state/useUiPrefs";
import type { Workspace } from "@/state/useWorkspace";
import { AttributeList } from "./AttributeList";
import { SpecSummary } from "./SpecSummary";

/**
 * Basic renders catalog attributes of tier "basic". Detailed/Precision are
 * honest placeholders in Sprint 0 but already read the same shared spec, and
 * will render their own tiers from the catalog once those attributes exist.
 */
export function ModePanel({
  mode,
  registry,
  workspace,
  locale,
  t,
}: {
  mode: Mode;
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
}) {
  if (mode === "basic") {
    return <AttributeList attributes={registry.attributesForTier("basic")} workspace={workspace} locale={locale} t={t} />;
  }
  const title = mode === "detailed" ? t.planned.detailedTitle : t.planned.precisionTitle;
  const body = mode === "detailed" ? t.planned.detailedBody : t.planned.precisionBody;
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
