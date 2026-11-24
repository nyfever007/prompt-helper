"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  compilePrompt,
  getCoreRegistry,
  getPromptOutput,
  type CatalogMigrationRecord,
  type CatalogRegistry,
  type KeyValueStore,
  type SpecAnalysis,
  resolveText,
} from "@/domain";
import { fmt, getMessages, SUPPORTED_LOCALES, type Messages, type UiLocale } from "@/i18n/messages";
import { MODES, useUiPrefs } from "@/state/useUiPrefs";
import { useWorkspace } from "@/state/useWorkspace";
import { copyText } from "./clipboard";
import { describeDiagnostic } from "./diagnostics";
import { downloadText, timestamp } from "./download";
import { attributeLabel, optionLabel } from "./format";
import { ModePanel } from "./modes/ModePanel";
import { Notices, type Notice } from "./Notices";
import { PromptPreview } from "./PromptPreview";
import { RecoveryPanel } from "./RecoveryPanel";
import { SpecToolbar } from "./SpecToolbar";

const browserStore = (): KeyValueStore | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null; // storage blocked (privacy mode, etc.)
  }
};

export interface PrompterAppProps {
  /** Injected for tests / alternative catalogs. Defaults to the bundled core catalog. */
  registry?: CatalogRegistry;
  /** Injected for tests. Defaults to `window.localStorage`. `null` disables persistence. */
  store?: KeyValueStore | null;
  /** Auto-dismiss delay for non-critical notices. */
  noticeTimeoutMs?: number;
}

const describeMigration = (r: CatalogMigrationRecord, t: Messages, locale: string) => {
  const what = r.op === "renameAttribute" ? fmt(t.migration.item, { from: r.from, to: r.to }) : `${r.attributeId}: ${fmt(t.migration.item, { from: r.from, to: r.to })}`;
  return `${what} (${r.fromVersion} → ${r.toVersion}) — ${r.reason[locale] ?? r.reason.en}`;
};

type PendingImport = { analysis: Extract<SpecAnalysis, { status: "recoverable" }>; text: string; fileName: string };

export function PrompterApp({ registry: registryProp, store: storeProp, noticeTimeoutMs = 6000 }: PrompterAppProps) {
  const registry = useMemo(() => registryProp ?? getCoreRegistry(), [registryProp]);
  const store = useMemo(() => (storeProp !== undefined ? storeProp : browserStore()), [storeProp]);
  const workspace = useWorkspace(registry, store);
  const { mode, setMode, locale, setLocale } = useUiPrefs(store);
  const t = getMessages(locale);
  const ctx = { registry, locale, t };

  const [eventNotices, setEventNotices] = useState<Notice[]>([]);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewToggle = useRef<HTMLButtonElement>(null);
  // Mobile bottom sheet (non-modal): opening moves focus to its title; Escape or “hide” returns it to the toolbar button.
  const openPreview = (open: boolean, returnFocus = false) => {
    setPreviewOpen(open);
    if (open) window.requestAnimationFrame(() => document.getElementById("preview-title")?.focus());
    else if (returnFocus) previewToggle.current?.focus();
  };
  const [mobileCopied, setMobileCopied] = useState<"idle" | "copied" | "failed">("idle");
  const counter = useRef(0);
  const push = useCallback((n: Omit<Notice, "id">) => setEventNotices((ns) => [...ns, { ...n, id: `event-${++counter.current}` }]), []);
  const dismiss = useCallback((id: string) => {
    setDismissed((s) => new Set(s).add(id));
    setEventNotices((ns) => ns.filter((n) => n.id !== id));
  }, []);

  // ── Derived notices (no state sync needed) ────────────────────────────────
  const { hydration, transition } = workspace;
  const derived: Notice[] = [];
  if (hydration.status === "loaded" && hydration.migrations.length === 0) {
    derived.push({ id: "hydration-restored", kind: "info", text: t.storage.restored, autoDismissMs: noticeTimeoutMs });
  }
  if (hydration.status === "loaded" && hydration.migrations.length > 0) {
    derived.push({
      id: "hydration-migrated",
      kind: "info",
      title: t.migration.title,
      details: hydration.migrations.map((r) => describeMigration(r, t, locale)),
      ...(hydration.preMigrationBackupKey ? { text: fmt(t.migration.backupNote, { key: hydration.preMigrationBackupKey }) } : {}),
    });
  }
  if (hydration.status === "invalid") {
    derived.push({ id: "hydration-invalid", kind: "error", text: t.storage.invalid, details: hydration.diagnostics.map((d) => describeDiagnostic(d, ctx).text) });
  }
  if (hydration.status === "recovered") {
    derived.push({ id: "hydration-recovered", kind: "success", text: fmt(t.recovery.applied, { n: hydration.excludedCount }), autoDismissMs: noticeTimeoutMs });
  }
  if (hydration.status === "discarded") {
    derived.push({ id: "hydration-discarded", kind: "info", text: t.recovery.discarded, autoDismissMs: noticeTimeoutMs });
  }
  if (transition) {
    const label = (i: { attributeId: string; optionIds: string[] }) =>
      i.optionIds.length
        ? `${attributeLabel(registry, i.attributeId, locale)} (${i.optionIds.map((o) => optionLabel(registry, i.attributeId, o, locale)).join(", ")})`
        : attributeLabel(registry, i.attributeId, locale);
    if (transition.newlyInactive.length) {
      derived.push({
        id: `transition-${transition.id}-inactive`,
        kind: "warning",
        text: fmt(t.transition.inactive, { labels: transition.newlyInactive.map(label).join(", ") }),
        autoDismissMs: noticeTimeoutMs * 2,
      });
    }
    if (transition.reactivated.length) {
      derived.push({
        id: `transition-${transition.id}-reactivated`,
        kind: "info",
        text: fmt(t.transition.reactivated, { labels: transition.reactivated.map(label).join(", ") }),
        autoDismissMs: noticeTimeoutMs,
      });
    }
  }
  const undo = workspace.lastPresetUndo;
  if (undo) {
    const name = resolveText(registry.getPreset(undo.presetId)?.label, locale) || undo.presetId;
    const labels = (ids: string[]) => ids.map((id) => attributeLabel(registry, id, locale)).join(", ");
    derived.push({
      id: `preset-undo-${undo.id}`,
      kind: "info",
      text: fmt(t.presetDialog.undone, { name, restored: undo.restored.length ? labels(undo.restored) : t.presetDialog.nothingRestored }),
      ...(undo.kept.length ? { details: [fmt(t.presetDialog.undoneKept, { kept: labels(undo.kept) })] } : { autoDismissMs: noticeTimeoutMs }),
    });
  }
  const notices = [...derived, ...eventNotices].filter((n) => !dismissed.has(n.id));

  // Mobile toolbar status — same gate as every other output path.
  const output = getPromptOutput(workspace.compilation);
  const warningCount = workspace.compilation.diagnostics.filter(
    (d) => (d.severity === "warning" || d.severity === "error") && !d.code.startsWith("safety.") && !d.code.startsWith("policy."),
  ).length;
  const onMobileCopy = async () => {
    if (!output.ok) return;
    const done = await copyText(output.prompt);
    setMobileCopied(done ? "copied" : "failed");
    window.setTimeout(() => setMobileCopied("idle"), 2000);
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const onImportAnalyzed = (analysis: SpecAnalysis, text: string, fileName: string) => {
    if (analysis.status === "invalid") {
      push({ kind: "error", text: t.toolbar.importFailed, details: analysis.diagnostics.map((d) => describeDiagnostic(d, ctx).text) });
      return;
    }
    if (analysis.status === "recoverable") {
      setPendingImport({ analysis, text, fileName });
      return;
    }
    workspace.replace(analysis.spec);
    const details = [
      ...analysis.migrations.map((r) => describeMigration(r, t, locale)),
      ...analysis.diagnostics.filter((d) => d.severity === "warning" && !d.code.startsWith("rule.")).map((d) => describeDiagnostic(d, ctx).text),
      ...(compilePrompt(analysis.spec, registry).blocked ? [t.toolbar.blockedSpecNote] : []),
    ];
    push({
      kind: "success",
      text: t.toolbar.importOk,
      ...(details.length ? { details } : { autoDismissMs: noticeTimeoutMs }),
      ...(analysis.migrations.length ? { title: t.migration.title } : {}),
    });
  };

  const storageLine = (() => {
    if (hydration.status === "pending") return t.storage.loading;
    if (hydration.status === "recoverable") return t.storage.savePaused;
    if (workspace.save.status === "failed") return t.storage.saveFailed;
    if (workspace.save.status === "saved") return `${t.storage.savedAt} · ${new Date(workspace.save.savedAt).toLocaleTimeString(locale)}`;
    return "";
  })();

  const downloadBackup = (key: string) => {
    const raw = workspace.storage?.readBackup(key);
    if (raw) downloadText(`prompter-saved-original-${timestamp(new Date())}.json`, raw);
  };

  return (
    <div className="app" lang={locale} data-mode={mode} data-preview-open={previewOpen}>
      <header className="app__header">
        <div>
          <h1>{t.appTitle}</h1>
          <p className="muted">{t.appTagline}</p>
        </div>
        <label className="locale">
          <span>{t.language}</span>
          <select value={locale} onChange={(e) => setLocale(e.target.value as UiLocale)}>
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="tabs" role="tablist" aria-label="Mode">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            id={`tab-${m}`}
            aria-selected={mode === m}
            aria-controls="mode-panel"
            className="tab"
            onClick={() => setMode(m)}
          >
            {t.modes[m]}
            {m === "precision" && <span className="tab__planned">{t.planned.tabBadge}</span>}
          </button>
        ))}
      </nav>
      <p className="muted mode-hint">{t.modeHint}</p>

      <Notices notices={notices} onDismiss={dismiss} dismissLabel={t.dismiss} />
      {hydration.status === "invalid" && (
        <p className="small">
          <button type="button" className="link-button" onClick={() => downloadBackup(hydration.backupKey)}>
            {t.recovery.download}
          </button>
        </p>
      )}

      {hydration.status === "recoverable" && (
        <RecoveryPanel
          title={t.recovery.titleStorage}
          excluded={hydration.excluded}
          registry={registry}
          locale={locale}
          t={t}
          applyLabel={t.recovery.apply}
          discardLabel={t.recovery.discardStorage}
          keptNote={fmt(t.recovery.keptNote, { key: hydration.backupKey })}
          onApply={workspace.applyRecovery}
          onDiscard={workspace.discardRecovery}
          onDownload={() => downloadBackup(hydration.backupKey)}
        />
      )}
      {pendingImport && (
        <RecoveryPanel
          title={t.recovery.titleImport}
          excluded={pendingImport.analysis.excluded}
          registry={registry}
          locale={locale}
          t={t}
          applyLabel={t.recovery.applyImport}
          discardLabel={t.recovery.discardImport}
          keptNote={t.recovery.keptImportNote}
          onApply={() => {
            workspace.replace(pendingImport.analysis.spec);
            push({ kind: "success", text: fmt(t.recovery.applied, { n: pendingImport.analysis.excluded.length }), autoDismissMs: noticeTimeoutMs });
            setPendingImport(null);
          }}
          onDiscard={() => setPendingImport(null)}
          onDownload={() => downloadText(pendingImport.fileName || "prompter-original.json", pendingImport.text)}
        />
      )}

      <main className="layout">
        <div id="mode-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="layout__editor">
          <ModePanel
            mode={mode}
            registry={registry}
            workspace={workspace}
            locale={locale}
            t={t}
            onPresetApplied={(name, count) => push({ kind: "success", text: fmt(t.presetDialog.applied, { name, n: count }), autoDismissMs: noticeTimeoutMs })}
          />
        </div>
        <aside
          className="layout__preview"
          onKeyDown={(e) => {
            if (e.key === "Escape" && previewOpen) {
              e.stopPropagation();
              openPreview(false, true);
            }
          }}
        >
          <PromptPreview compilation={workspace.compilation} registry={registry} locale={locale} t={t} onClose={() => openPreview(false, true)} />
          <SpecToolbar
            registry={registry}
            spec={workspace.spec}
            t={t}
            hasResetSnapshot={workspace.hasResetSnapshot}
            onImportAnalyzed={onImportAnalyzed}
            onReset={() => {
              workspace.reset();
              push({ kind: "info", text: t.toolbar.resetDone, autoDismissMs: noticeTimeoutMs });
            }}
            onRestoreResetSnapshot={() => {
              workspace.restoreResetSnapshot();
              push({ kind: "success", text: t.toolbar.undoDone, autoDismissMs: noticeTimeoutMs });
            }}
          />
          <p className="muted storage-line" data-testid="storage-status">
            {storageLine}
          </p>
        </aside>
      </main>
      <footer className="app__footer muted">{t.footer}</footer>

      <div className="mobile-bar" role="toolbar" aria-label={t.mobile.toolbar}>
        <span className="mobile-bar__count" data-testid="mobile-applied">
          {fmt(t.mobile.applied, { n: Object.keys(workspace.spec.selections).length })}
        </span>
        <span
          className={`mobile-bar__status ${workspace.compilation.blocked ? "is-blocked" : warningCount ? "is-warn" : "is-ok"}`}
          data-testid="mobile-status"
        >
          {workspace.compilation.blocked ? t.mobile.blocked : warningCount ? fmt(t.mobile.warnings, { n: warningCount }) : t.mobile.ok}
        </span>
        <button ref={previewToggle} type="button" className="button button--small" aria-expanded={previewOpen} aria-controls="preview-panel" onClick={() => openPreview(!previewOpen)}>
          {previewOpen ? t.mobile.hidePreview : t.mobile.preview}
        </button>
        <button type="button" className="button button--small button--primary" aria-label={t.mobile.copyLabel} disabled={!output.ok} onClick={onMobileCopy}>
          {mobileCopied === "copied" ? t.preview.copied : t.mobile.copy}
        </button>
      </div>
    </div>
  );
}
