"use client";

import { useState } from "react";
import type { PromptCompilation } from "@/domain";
import { describeDiagnostic, type Messages } from "@/i18n/messages";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const done = document.execCommand("copy");
    el.remove();
    return done;
  } catch {
    return false;
  }
}

export function PromptPreview({ compilation, locale, t }: { compilation: PromptCompilation; locale: string; t: Messages }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const notes = compilation.diagnostics.filter((d) => d.code !== "compiler.empty");
  const { meta } = compilation;

  const onCopy = async () => {
    const okCopy = await copyText(compilation.prompt);
    setCopyState(okCopy ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <section className="preview" aria-labelledby="preview-title">
      <header className="preview__header">
        <h2 id="preview-title">{t.preview.title}</h2>
        <button type="button" className="button button--primary" onClick={onCopy} disabled={!compilation.prompt}>
          {copyState === "copied" ? t.preview.copied : t.preview.copy}
        </button>
      </header>
      <output className="preview__prompt" data-testid="prompt-output" aria-live="polite" lang="en">
        {compilation.prompt || <span className="muted">{t.preview.empty}</span>}
      </output>
      {copyState === "failed" && (
        <p role="alert" className="notice notice--error">
          {t.preview.copyFailed}
        </p>
      )}
      <p className="preview__meta muted">
        {t.preview.language} · {t.preview.meta} {meta.compilerVersion} · {meta.adapterId}@{meta.adapterVersion} · {meta.catalogId}@
        {meta.catalogVersion} · spec {meta.specSchemaVersion}
      </p>
      {compilation.fragments.length > 0 && (
        <details className="preview__sources">
          <summary>{t.preview.sources}</summary>
          <ol>
            {compilation.fragments.map((f) => (
              <li key={f.attributeId}>
                <code>{f.attributeId}</code> → <span lang="en">{f.text}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      {notes.length > 0 && (
        <div className="preview__notes">
          <h3>{t.diagnostics.title}</h3>
          <ul>
            {notes.map((d, i) => (
              <li key={`${d.code}-${i}`} className={`diag diag--${d.severity}`}>
                {describeDiagnostic(locale, d)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
