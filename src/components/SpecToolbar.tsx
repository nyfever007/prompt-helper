"use client";

import { useRef } from "react";
import { exportSpecJson, importSpecJson, type CatalogRegistry, type ImageSpec, type SpecAnalysis } from "@/domain";
import type { Messages } from "@/i18n/messages";
import { downloadText, timestamp } from "./download";

export function SpecToolbar({
  registry,
  spec,
  t,
  hasResetSnapshot,
  onImportAnalyzed,
  onReset,
  onRestoreResetSnapshot,
}: {
  registry: CatalogRegistry;
  spec: ImageSpec;
  t: Messages;
  hasResetSnapshot: boolean;
  onImportAnalyzed(analysis: SpecAnalysis, originalText: string, fileName: string): void;
  onReset(): void;
  onRestoreResetSnapshot(): void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  // Spec JSON export is always allowed (data preservation), even when the prompt is blocked.
  const onExport = () => downloadText(`prompter-spec-${timestamp(new Date())}.json`, exportSpecJson(spec));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    onImportAnalyzed(importSpecJson(text, registry), text, file.name);
    if (fileInput.current) fileInput.current.value = "";
  };

  const onResetClick = () => {
    if (window.confirm(t.toolbar.resetConfirm)) onReset();
  };

  const onUndoClick = () => {
    const hasWork = Object.keys(spec.selections).length > 0;
    if (!hasWork || window.confirm(t.toolbar.undoConfirm)) onRestoreResetSnapshot();
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
      {hasResetSnapshot && (
        <button type="button" className="button" onClick={onUndoClick}>
          {t.toolbar.undoReset}
        </button>
      )}
    </div>
  );
}
