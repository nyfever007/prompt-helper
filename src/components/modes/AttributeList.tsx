"use client";

import { evaluateAll, type AttributeDefinition } from "@/domain";
import type { Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { AttributeField } from "../controls/AttributeField";

export function AttributeList({
  attributes,
  workspace,
  locale,
  t,
}: {
  attributes: readonly AttributeDefinition[];
  workspace: Workspace;
  locale: string;
  t: Messages;
}) {
  return (
    <div className="attribute-list">
      {attributes.map((attribute) => {
        const selection = workspace.spec.selections[attribute.id];
        const active = evaluateAll(attribute.appliesWhen, workspace.spec);
        // Hide inapplicable attributes unless the user already set them (never silently drop a value).
        if (!active && !selection) return null;
        return (
          <AttributeField
            key={attribute.id}
            attribute={attribute}
            selection={selection}
            active={active}
            locale={locale}
            t={t}
            onSet={(value) => workspace.setValue(attribute.id, value)}
            onClear={() => workspace.clear(attribute.id)}
          />
        );
      })}
    </div>
  );
}
