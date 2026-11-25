"use client";

import { useState } from "react";
import { exportPromptText, getPromptOutput, type CatalogRegistry, type PromptCompilation } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { copyText } from "./clipboard";
import { describeDiagnostic } from "./diagnostics";
import { downloadText, timestamp } from "./download";
import { attributeLabel } from "./format";

/**
 * All prompt output paths (display, copy, .txt export) go through
 * `getPromptOutput` / `exportPromptText`, so a blocked compilation can never
 * leak through any of them.
 */
export function PromptPreview({
  compilation,
  registry,
  locale,
  t,
  onClose,
}: {
  compilation: PromptCompilation;
  registry: CatalogRegistry;
  locale: string;
  t: Messages;
  /** Mobile bottom-sheet close (the button is only visible on small screens). */
  onClose?(): void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const output = getPromptOutput(compilation);
  const { meta } = compilation;
  const ctx = { registry, locale, t };
  // Everything that withholds output: safety policy findings and catalog policy restrictions.
  const safetyDiags = compilation.diagnostics.filter((d) => d.code.startsWith("safety.") || d.code.startsWith("policy."));
  const languageDiags = compilation.diagnostics.filter((d) => d.code === "prompt.mixed_language");
  const notes = compilation.diagnostics.filter(
    (d) => d.code !== "compiler.empty" && !d.code.startsWith("safety.") && !d.code.startsWith("policy.") && d.code !== "prompt.mixed_language",
  );
  const params = Object.entries(compilation.parameters).sort(([a], [b]) => (a < b ? -1 : 1));

  const onCopy = async () => {
    if (!output.ok) return;
    const okCopy = await copyText(output.prompt);
    setCopyState(okCopy ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };
  const onExportTxt = () => {
    const text = exportPromptText(compilation);
    if (text !== null) downloadText(`prompter-prompt-${timestamp(new Date())}.txt`, text, "text/plain");
  };

  return (
    <section className="preview" id="preview-panel" aria-labelledby="preview-title" data-blocked={compilation.blocked}>
      <header className="preview__header">
        <h2 id="preview-title" tabIndex={-1}>{t.preview.title}</h2>
        {onClose && (
          <button type="button" className="link-button preview__close" onClick={onClose}>
            {t.mobile.hidePreview}
          </button>
        )}
        <div className="toolbar">
          <button type="button" className="button button--primary" onClick={onCopy} disabled={!output.ok}>
            {copyState === "copied" ? t.preview.copied : t.preview.copy}
          </button>
          <button type="button" className="button" onClick={onExportTxt} disabled={!output.ok}>
            {t.preview.exportTxt}
          </button>
        </div>
      </header>

      {compilation.blocked ? (
        <div className="blocked" role="alert" data-testid="prompt-blocked">
          <p className="blocked__title">{t.preview.blockedTitle}</p>
          <p className="small">{t.preview.blockedBody}</p>
          <ul>
            {safetyDiags.map((d, i) => {
              const desc = describeDiagnostic(d, ctx);
              return (
                <li key={i} data-code={d.code}>
                  <p>{desc.text}</p>
                  {desc.terms && (
                    <p className="small" data-testid="blocked-sources">
                      <strong>{t.preview.matched}:</strong> {desc.terms}
                      {desc.sources && <> — {desc.sources}</>}
                    </p>
                  )}
                  {desc.guidance && (
                    <p className="small">
                      <strong>{t.field.guidance}:</strong> {desc.guidance}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <output className="preview__prompt" data-testid="prompt-output" aria-live="polite" lang="en">
          {output.ok ? output.prompt : <span className="muted">{t.preview.empty}</span>}
        </output>
      )}

      {languageDiags.length > 0 && (
        <p className="notice notice--warning small" data-testid="mixed-language">
          {fmt(t.preview.mixedLanguage, { scripts: [...new Set(languageDiags.map((d) => String(d.params?.scripts ?? "")))].join(", ") })}
          {" — "}
          {languageDiags.map((d) => attributeLabel(registry, d.attributeId ?? "", locale)).join(", ")}
        </p>
      )}

      {copyState === "failed" && (
        <p role="alert" className="notice notice--error">
          {t.preview.copyFailed}
        </p>
      )}

      {params.length > 0 && (
        <div className="small" data-testid="prompt-parameters">
          <span className="muted">{t.preview.parameters}:</span>{" "}
          {params.map(([k, v]) => (
            <code key={k}>
              {k}={String(v)}
            </code>
          ))}
        </div>
      )}

      <p className="preview__meta muted">
        {t.preview.language} · {t.preview.meta} {meta.compilerVersion} · {meta.adapterId}@{meta.adapterVersion} · {meta.catalogId}@{meta.catalogVersion} · spec{" "}
        {meta.specSchemaVersion} · {meta.safetyPolicyId}@{meta.safetyPolicyVersion}
      </p>

      {compilation.fragments.length > 0 && (
        <details className="preview__sources">
          <summary>{t.preview.sources}</summary>
          <ol>
            {compilation.fragments.map((f) => (
              <li key={f.attributeId}>
                <span className="muted">{attributeLabel(registry, f.attributeId, locale)}</span> → <span lang="en">{f.text}</span>
              </li>
            ))}
            {(compilation.covered ?? []).map((c) => (
              <li key={`covered-${c.attributeId}`} className="muted" data-testid={`source-covered-${c.attributeId}`}>
                {attributeLabel(registry, c.attributeId, locale)} → {t.hiddenSource.covered} ({attributeLabel(registry, c.coveredBy, locale)})
              </li>
            ))}
          </ol>
        </details>
      )}

      {notes.length > 0 && (
        <div className="preview__notes">
          <h3>{t.diagnostics.title}</h3>
          <ul>
            {notes.map((d, i) => {
              const desc = describeDiagnostic(d, ctx);
              const basis = d.code.startsWith("rule.") ? (d.params?.basis as "contradiction" | "convention" | undefined) : undefined;
              return (
                <li key={`${d.code}-${i}`} className={`diag diag--${d.severity}`} data-code={d.code} data-basis={basis}>
                  {basis && <span className={`diag__basis diag__basis--${basis}`}>{t.field.basis[basis]}</span>}
                  {desc.text}
                  {desc.guidance && <span className="diag__guidance">{desc.guidance}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="muted small">{t.preview.safetyNote}</p>
    </section>
  );
}
