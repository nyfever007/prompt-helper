"use client";

import { Fragment, useContext } from "react";
import { resolveText, type CatalogRegistry } from "@/domain";
import { type Messages } from "@/i18n/messages";
import { attributeLabel } from "./format";
import { GoToAttribute } from "./navigation";

/**
 * “관련 설정: …” — the other settings a notice is about, each with its page. With navigation available
 * each is a button that opens that setting in the Detailed editor (it never changes a value).
 */
export function RelatedSettings({ ids, registry, locale, t }: { ids: readonly string[]; registry: CatalogRegistry; locale: string; t: Messages }) {
  const goTo = useContext(GoToAttribute);
  if (ids.length === 0) return null;
  const label = (id: string) => {
    const cat = registry.getAttribute(id)?.categoryId;
    return `${attributeLabel(registry, id, locale)}${cat ? ` (${resolveText(registry.getCategory(cat)?.label, locale)})` : ""}`;
  };
  return (
    <span className="diag__related small" data-testid="related-settings">
      {t.field.relatedTitle}:{" "}
      {ids.map((id, i) => (
        <Fragment key={id}>
          {i > 0 && ", "}
          {goTo ? (
            <button type="button" className="link-button diag__related-link" onClick={() => goTo(id)} aria-label={`${label(id)} — ${t.field.goToSetting}`}>
              {label(id)}
            </button>
          ) : (
            label(id)
          )}
        </Fragment>
      ))}
    </span>
  );
}
