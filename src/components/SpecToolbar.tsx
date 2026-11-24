"use client";

import { useRef } from "react";
import { exportSpecJson, importSpecJson, type CatalogRegistry, type Diagnostic, type ImageSpec } from "@/domain";
import type { Messages } from "@/i18n/messages";

export type Notice = { kind: "success" | "error" | "info"; text: string; diagnostics?: Diagnostic[] };

const timestamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

export function SpecToolbar({
  registry,
  spec,
  t,
  onImported,
  onReset,
  onNotice,
}: {
  registry: CatalogRegistry;
  spec: ImageSpec;
  t: Messages;
  onImported(spec: ImageSpec): void;
  onReset(): void;
  onNotice(notice: Notice): void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const blob = new Blob([exportSpecJson(spec)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompter-spec-${timestamp(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const result = importSpecJson(text, registry);
    if (result.ok) {
      onImported(result.value);
      onNotice({ kind: "success", text: t.toolbar.importOk, diagnostics: result.diagnostics.filter((d) => d.severity !== "info") });
    } else {
      onNotice({ kind: "error", text: t.toolbar.importFailed, diagnostics: result.diagnostics });
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const onResetClick = () => {
    if (window.confirm(t.toolbar.resetConfirm)) {
      onReset();
      onNotice({ kind: "info", text: t.toolbar.resetDone });
    }
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Specification actions">
      <button type="button" className="button" onClick={onExport}>
        {t.toolbar.exportJson}
      </button>
      <button type="button" className="button" onClick={() => fileInput.current?.click()}>
        {t.toolbar.importJson}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        data-testid="import-input"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button type="button" className="button button--danger" onClick={onResetClick}>
        {t.toolbar.reset}
      </button>
    </div>
  );
}
