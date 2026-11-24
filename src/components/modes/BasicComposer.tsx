"use client";

import { useState } from "react";
import { isAttributeActive, resolveText, type AttributeDefinition, type CatalogRegistry, type GroupDefinition } from "@/domain";
import type { Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { WorkspaceField } from "../controls/WorkspaceField";

/**
 * Basic mode: catalog groups in order; within a group, `primary` attributes up
 * front and `secondary` ones behind an expandable "More settings". Everything
 * comes from the catalog — no attribute is hard-coded here.
 */
export function BasicComposer({ registry, workspace, locale, t }: { registry: CatalogRegistry; workspace: Workspace; locale: string; t: Messages }) {
  // Only APPROVED basic-tier attributes are editable in the product UI.
  const basic = registry.exposedAttributes("basic");
  const roots = registry.groups.filter((g) => !g.parentId);
  const sections: Array<{ group: GroupDefinition | null; attributes: AttributeDefinition[] }> = roots
    .map((group) => ({ group, attributes: basic.filter((a) => registry.rootGroupOf(a)?.id === group.id) }))
    .filter((s) => s.attributes.length > 0);
  const ungrouped = basic.filter((a) => !registry.rootGroupOf(a));
  if (ungrouped.length) sections.push({ group: null, attributes: ungrouped });

  return (
    <div className="composer">
      {sections.map(({ group, attributes }) => (
        <GroupSection key={group?.id ?? "_other"} group={group} attributes={attributes} registry={registry} workspace={workspace} locale={locale} t={t} />
      ))}
    </div>
  );
}

function GroupSection({
  group,
  attributes,
  registry,
  workspace,
  locale,
  t,
}: {
  group: GroupDefinition | null;
  attributes: AttributeDefinition[];
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
}) {
  const { spec } = workspace;
  // Hide inapplicable attributes unless the user already set them (never silently drop a value).
  const shown = attributes.filter((a) => isAttributeActive(registry, a, spec) || a.id in spec.selections);
  const primary = shown.filter((a) => a.prominence !== "secondary");
  const secondary = shown.filter((a) => a.prominence === "secondary");
  const secondarySet = secondary.filter((a) => a.id in spec.selections).length;
  // Until the user toggles it, "More settings" is open exactly when something inside is set.
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const expanded = userChoice ?? secondarySet > 0;
  if (shown.length === 0) return null;

  const field = (a: AttributeDefinition) => <WorkspaceField key={a.id} attribute={a} registry={registry} workspace={workspace} locale={locale} t={t} />;

  const groupLabel = group ? resolveText(group.label, locale) : "";
  return (
    <section className="group" aria-label={groupLabel || undefined} data-group-id={group?.id}>
      {group && <h2 className="group__title">{groupLabel}</h2>}
      <div className="attribute-list">{primary.map(field)}</div>
      {secondary.length > 0 && (
        <div className="more">
          <button type="button" className="more__toggle" aria-expanded={expanded} onClick={() => setUserChoice(!expanded)}>
            {expanded ? "▾" : "▸"} {t.field.moreSettings} ({secondary.length}
            {secondarySet > 0 ? ` · ${secondarySet} ${t.field.set}` : ""})
          </button>
          {expanded && <div className="attribute-list">{secondary.map(field)}</div>}
        </div>
      )}
    </section>
  );
}
