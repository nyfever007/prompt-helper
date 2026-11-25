"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { resolveText, type CatalogRegistry, type HistoryEntry } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import type { Snapshots } from "@/state/useSnapshots";
import type { Workspace } from "@/state/useWorkspace";
import { ModalDialog } from "../ModalDialog";
import { attributeLabel } from "../format";
import { usePresetNames } from "../presetNames";

/** Text fields keep their own undo: the global shortcuts do nothing there. */
const isTextEditing = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName !== "INPUT") return false;
  return ["text", "search", "number", "email", "url", "tel", "password"].includes((el as HTMLInputElement).type);
};

/** A history entry in words. */
export const describeEntry = (e: HistoryEntry, registry: CatalogRegistry, locale: string, t: Messages, presetName: (id: string) => string | undefined): string => {
  const k = t.history.kinds;
  switch (e.kind) {
    case "edit":
      return fmt(k.edit, { name: attributeLabel(registry, e.detail ?? "", locale) });
    case "output":
      return fmt(k.output, { name: attributeLabel(registry, e.detail ?? "", locale) });
    case "lock":
      return e.detail === "on" ? k.lockOn : k.lockOff;
    case "random":
      return fmt(k.random, { name: t.random.styles[(e.detail ?? "natural") as keyof typeof t.random.styles] ?? e.detail ?? "" });
    case "preset":
    case "userPreset": {
      const id = e.detail ?? "";
      return fmt(k[e.kind], { name: resolveText(registry.getPreset(id)?.label, locale) || presetName(id) || id });
    }
    case "categoryReset":
      return fmt(k.categoryReset, { name: resolveText(registry.getCategory(e.detail ?? "")?.label, locale) || (e.detail ?? "") });
    case "snapshot":
      return fmt(k.snapshot, { name: e.detail ?? "" });
    default:
      return k[e.kind];
  }
};

/**
 * Undo / Redo and the History panel (Sprint 3.4) — above every mode (no separate mode tab), on phones too.
 * Ctrl/⌘+Z and Ctrl/⌘+Shift+Z or Ctrl+Y outside text fields.
 */
export function HistoryControls({
  registry,
  workspace,
  snapshots,
  locale,
  t,
  onNotice,
}: {
  registry: CatalogRegistry;
  workspace: Workspace;
  snapshots: Snapshots;
  locale: string;
  t: Messages;
  onNotice(text: string, kind: "success" | "info" | "error"): void;
}) {
  const h = t.history;
  const presetName = usePresetNames();
  const [open, setOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  const { history } = workspace;
  const what = (e: HistoryEntry | undefined) => (e ? describeEntry(e, registry, locale, t, presetName) : "");

  const undo = useCallback(() => {
    if (!workspace.canUndo) return;
    setAnnounce(fmt(h.undone, { what: what(history.entries[history.index]) }));
    workspace.undo();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `what` reads the same values listed here
  }, [workspace, history, h.undone]);
  const redo = useCallback(() => {
    if (!workspace.canRedo) return;
    setAnnounce(fmt(h.redone, { what: what(history.entries[history.index + 1]) }));
    workspace.redo();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `what` reads the same values listed here
  }, [workspace, history, h.redone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextEditing(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || (key === "y" && e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="history-bar" role="toolbar" aria-label={h.title} data-testid="history-bar">
      <button type="button" className="button button--small" onClick={undo} disabled={!workspace.canUndo} aria-keyshortcuts="Control+Z Meta+Z" data-testid="history-undo">
        <span aria-hidden="true">↶</span> {h.undo}
      </button>
      <button type="button" className="button button--small" onClick={redo} disabled={!workspace.canRedo} aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y" data-testid="history-redo">
        <span aria-hidden="true">↷</span> {h.redo}
      </button>
      <button type="button" className="button button--small" onClick={() => setOpen(true)} aria-haspopup="dialog" data-testid="history-open">
        {h.open}
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </span>
      {open && (
        <HistoryPanel
          workspace={workspace}
          snapshots={snapshots}
          locale={locale}
          t={t}
          what={what}
          onClose={() => setOpen(false)}
          onNotice={onNotice}
          onRestored={(text) => setAnnounce(text)}
        />
      )}
    </div>
  );
}

function HistoryPanel({
  workspace,
  snapshots,
  locale,
  t,
  what,
  onClose,
  onNotice,
  onRestored,
}: {
  workspace: Workspace;
  snapshots: Snapshots;
  locale: string;
  t: Messages;
  what(e: HistoryEntry | undefined): string;
  onClose(): void;
  onNotice(text: string, kind: "success" | "info" | "error"): void;
  onRestored(text: string): void;
}) {
  const h = t.history;
  const ids = useId();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const time = (ms: number) => new Date(ms).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const { entries, index } = workspace.history;
  const newestFirst = entries.map((e, i) => ({ e, i })).reverse();
  const current = entries[index];

  return (
    <ModalDialog labelledBy={`${ids}-title`} testId="history-panel" onClose={onClose}>
      <div className="modal__card history-panel">
        <h2 id={`${ids}-title`}>{h.title}</h2>
        <section aria-labelledby={`${ids}-hist`}>
          <h3 id={`${ids}-hist`}>{h.historyTitle}</h3>
          <p className="muted small">{h.historyNote}</p>
          {!workspace.historySaved && (
            <p className="notice notice--warning small" role="alert">
              {h.saveFailed}
            </p>
          )}
          <ol className="history-list">
            {newestFirst.map(({ e, i }) => {
              const isCurrent = i === index;
              const label = what(e);
              return (
                <li key={e.id} className={`history-item${isCurrent ? " is-current" : ""}${i > index ? " is-redo" : ""}`} data-history-id={e.id} aria-current={isCurrent ? "step" : undefined}>
                  <span className="history-item__time muted small">{e.at ? time(e.at) : "—"}</span>
                  <span className="history-item__what">{label}</span>
                  <span className="muted small">{fmt(h.changed, { n: e.changed })}</span>
                  {isCurrent ? (
                    <span className="badge badge--set">{h.current}</span>
                  ) : (
                    <>
                      {i > index && <span className="badge">{h.redoable}</span>}
                      <button
                        type="button"
                        className="button button--small"
                        aria-label={fmt(h.restoreLabel, { what: label, time: e.at ? time(e.at) : "" })}
                        onClick={() => {
                          workspace.restoreHistory(e.id);
                          onRestored(fmt(h.restored, { what: label }));
                          onNotice(fmt(h.restored, { what: label }), "info");
                          onClose();
                        }}
                      >
                        {h.restore}
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
          {current && <p className="muted small">{h.shortcuts}</p>}
        </section>

        <section aria-labelledby={`${ids}-snap`} className="history-panel__snapshots">
          <h3 id={`${ids}-snap`}>{h.snapTitle}</h3>
          <p className="muted small">{h.snapIntro}</p>
          <form
            className="history-panel__snapform"
            onSubmit={(e) => {
              e.preventDefault();
              const s = snapshots.save(workspace.spec, name);
              if (s) {
                setName("");
                onNotice(fmt(h.snapSaved, { name: s.name }), "success");
              }
            }}
          >
            <input className="text-input" type="text" value={name} placeholder={h.snapName} aria-label={h.snapName} maxLength={80} onChange={(e) => setName(e.target.value)} data-testid="snapshot-name" />
            <button type="submit" className="button button--primary button--small" disabled={name.trim() === ""} data-testid="snapshot-save">
              {h.snapSave}
            </button>
          </form>
          {!snapshots.saved && (
            <p className="notice notice--warning small" role="alert">
              {h.snapSaveFailed}
            </p>
          )}
          {snapshots.snapshots.length === 0 ? (
            <p className="muted small">{h.snapEmpty}</p>
          ) : (
            <ul className="history-list">
              {snapshots.snapshots.map((s) => (
                <li key={s.id} className="history-item" data-snapshot-id={s.id}>
                  {renaming?.id === s.id ? (
                    <form
                      className="history-panel__snapform"
                      onSubmit={(e) => {
                        e.preventDefault();
                        snapshots.rename(s.id, renaming.name);
                        setRenaming(null);
                      }}
                    >
                      <input className="text-input" type="text" value={renaming.name} aria-label={h.snapName} maxLength={80} onChange={(e) => setRenaming({ id: s.id, name: e.target.value })} data-testid="snapshot-rename-input" />
                      <button type="submit" className="button button--small">
                        {h.snapRename}
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="history-item__what">
                        <strong>{s.name}</strong>
                      </span>
                      <span className="muted small">
                        {new Date(s.at).toLocaleString(locale)} · {fmt(h.snapCount, { n: Object.keys(s.spec.selections).length })}
                      </span>
                      <span className="history-item__actions">
                        <button
                          type="button"
                          className="button button--small"
                          aria-label={`${h.snapRestore}: ${s.name}`}
                          onClick={() => {
                            workspace.restoreSnapshot(s.spec, s.name);
                            onRestored(fmt(h.snapRestored, { name: s.name }));
                            onNotice(fmt(h.snapRestored, { name: s.name }), "success");
                            onClose();
                          }}
                        >
                          {h.snapRestore}
                        </button>
                        <button type="button" className="link-button" aria-label={`${h.snapRename}: ${s.name}`} onClick={() => setRenaming({ id: s.id, name: s.name })}>
                          {h.snapRename}
                        </button>
                        <button
                          type="button"
                          className="link-button link-button--danger"
                          aria-label={`${h.snapDelete}: ${s.name}`}
                          onClick={() => {
                            if (window.confirm(fmt(h.snapDeleteConfirm, { name: s.name }))) snapshots.remove(s.id);
                          }}
                        >
                          {h.snapDelete}
                        </button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="toolbar modal__actions">
          <button type="button" className="button" onClick={onClose} data-autofocus>
            {h.close}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
