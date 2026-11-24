"use client";

import { resolveText, type CatalogRegistry, type ExcludedItem } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { describeDiagnostic } from "./diagnostics";

/**
 * Explicit, user-confirmed partial recovery. Shows exactly what would be
 * excluded and why. Nothing is applied until the user clicks "apply".
 */
export function RecoveryPanel({
  title,
  excluded,
  registry,
  locale,
  t,
  applyLabel,
  discardLabel,
  keptNote,
  onApply,
  onDiscard,
  onDownload,
}: {
  title: string;
  excluded: ExcludedItem[];
  registry: CatalogRegistry;
  locale: string;
  t: Messages;
  applyLabel: string;
  discardLabel: string;
  keptNote: string;
  onApply(): void;
  onDiscard(): void;
  onDownload(): void;
}) {
  return (
    <section className="recovery" role="alertdialog" aria-label={title}>
      <h2>{title}</h2>
      <p>{t.recovery.body}</p>
      <h3>{fmt(t.recovery.excluded, { n: excluded.length })}</h3>
      <ul className="recovery__list">
        {excluded.map((item) => {
          const attr = item.attributeId ? registry.getAttribute(item.attributeId) : undefined;
          return (
            <li key={item.path} data-path={item.path}>
              <code>{item.path}</code>
              {attr && <span className="muted"> ({resolveText(attr.label, locale)})</span>}
              <div className="small">
                <strong>{t.recovery.reason}:</strong> {item.diagnostics.map((d) => describeDiagnostic(d, { registry, locale, t }).text).join(" · ")}
              </div>
              <details className="small">
                <summary>{t.recovery.original}</summary>
                <pre>{JSON.stringify(item.original, null, 2)}</pre>
              </details>
            </li>
          );
        })}
      </ul>
      <p className="muted small">{keptNote}</p>
      <div className="toolbar">
        <button type="button" className="button button--primary" onClick={onApply}>
          {applyLabel}
        </button>
        <button type="button" className="button" onClick={onDownload}>
          {t.recovery.download}
        </button>
        <button type="button" className="button" onClick={onDiscard}>
          {discardLabel}
        </button>
      </div>
    </section>
  );
}
