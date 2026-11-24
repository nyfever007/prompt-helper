"use client";

import { useState } from "react";
import {
  isAttributeActive,
  isOptionActive,
  resolveText,
  type AttributeDefinition,
  type CatalogRegistry,
  type Diagnostic,
  type GroupDefinition,
} from "@/domain";
import type { Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { AttributeField } from "../controls/AttributeField";

const FIELD_HIDDEN_CODES = new Set(["selection.inactive", "selection.option_inactive", "compiler.empty"]);

const concerns = (d: Diagnostic, attributeId: string) => d.attributeId === attributeId || (d.involves ?? []).includes(attributeId);

/**
 * Basic mode: catalog groups in order; within a group, `primary` attributes up
 * front and `secondary` ones behind an expandable "More settings". Everything
 * comes from the catalog — no attribute is hard-coded here.
 */
export function BasicComposer({ registry, workspace, locale, t }: { registry: CatalogRegistry; workspace: Workspace; locale: string; t: Messages }) {
  const basic = registry.attributesForTier("basic");
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

  const field = (a: AttributeDefinition) => (
    <AttributeField
      key={a.id}
      registry={registry}
      attribute={a}
      selection={spec.selections[a.id]}
      active={isAttributeActive(registry, a, spec)}
      isOptionActive={(o) => isOptionActive(registry, o, spec)}
      diagnostics={workspace.compilation.diagnostics.filter((d) => !FIELD_HIDDEN_CODES.has(d.code) && concerns(d, a.id))}
      fragment={workspace.compilation.fragments.find((f) => f.attributeId === a.id)}
      outputBlocked={workspace.compilation.blocked}
      locale={locale}
      t={t}
      onSet={(value) => workspace.setValue(a.id, value)}
      onClear={() => workspace.clear(a.id)}
      onClearAttribute={(id) => workspace.clear(id)}
      isAttributeSet={(id) => id in spec.selections}
    />
  );

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
