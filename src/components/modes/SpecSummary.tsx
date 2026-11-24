"use client";

import { resolveText, type CatalogRegistry, type ImageSpec } from "@/domain";
import type { Messages } from "@/i18n/messages";
import { describeValue } from "../format";

/** Read-only view of the shared ImageSpec (used by placeholder modes). */
export function SpecSummary({ registry, spec, locale, t }: { registry: CatalogRegistry; spec: ImageSpec; locale: string; t: Messages }) {
  return (
    <section className="summary" aria-label={t.planned.sharedSpec}>
      <h3>{t.planned.sharedSpec}</h3>
      <p className="muted">{t.planned.sharedSpecHint}</p>
      <dl>
        {registry.attributes().map((a) => {
          const s = spec.selections[a.id];
          return (
            <div key={a.id} className="summary__row" data-attribute-id={a.id} data-state={s ? "set" : "unset"}>
              <dt>{resolveText(a.label, locale)}</dt>
              <dd>{s ? describeValue(a, s.value, locale) : <span className="muted">{t.field.notSet}</span>}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
