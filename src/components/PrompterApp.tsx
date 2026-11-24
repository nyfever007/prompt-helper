"use client";

import { useMemo, useState } from "react";
import { getCoreRegistry, type CatalogRegistry, type KeyValueStore } from "@/domain";
import { describeDiagnostic, getMessages, SUPPORTED_LOCALES, type UiLocale } from "@/i18n/messages";
import { MODES, useUiPrefs } from "@/state/useUiPrefs";
import { useWorkspace } from "@/state/useWorkspace";
import { ModePanel } from "./modes/ModePanel";
import { PromptPreview } from "./PromptPreview";
import { SpecToolbar, type Notice } from "./SpecToolbar";

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
}

export function PrompterApp({ registry: registryProp, store: storeProp }: PrompterAppProps) {
  const registry = useMemo(() => registryProp ?? getCoreRegistry(), [registryProp]);
  const store = useMemo(() => (storeProp !== undefined ? storeProp : browserStore()), [storeProp]);
  const workspace = useWorkspace(registry, store);
  const { mode, setMode, locale, setLocale } = useUiPrefs(store);
  const t = getMessages(locale);
  const [notice, setNotice] = useState<Notice | null>(null);

  const storageLine = (() => {
    if (workspace.hydration.status === "pending") return t.storage.loading;
    if (workspace.save.status === "failed") return t.storage.saveFailed;
    if (workspace.save.status === "saved") return `${t.storage.savedAt} · ${new Date(workspace.save.savedAt).toLocaleTimeString(locale)}`;
    return "";
  })();

  return (
    <div className="app" lang={locale}>
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
            {m !== "basic" && <span className="tab__planned">{t.planned.tabBadge}</span>}
          </button>
        ))}
      </nav>
      <p className="muted mode-hint">{t.modeHint}</p>

      {workspace.hydration.status === "loaded" && notice === null && (
        <p className="notice notice--info" role="status">
          {t.storage.restored}
        </p>
      )}
      {workspace.hydration.status === "invalid" && (
        <p className="notice notice--error" role="alert">
          {t.storage.invalid}
        </p>
      )}
      {notice && (
        <div className={`notice notice--${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          <p>{notice.text}</p>
          {notice.diagnostics && notice.diagnostics.length > 0 && (
            <ul>
              {notice.diagnostics.map((d, i) => (
                <li key={`${d.code}-${i}`}>{describeDiagnostic(locale, d)}</li>
              ))}
            </ul>
          )}
          <button type="button" className="link-button" onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <main className="layout">
        <div id="mode-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="layout__editor">
          <ModePanel mode={mode} registry={registry} workspace={workspace} locale={locale} t={t} />
        </div>
        <aside className="layout__preview">
          <PromptPreview compilation={workspace.compilation} locale={locale} t={t} />
          <SpecToolbar
            registry={registry}
            spec={workspace.spec}
            t={t}
            onImported={workspace.replace}
            onReset={workspace.reset}
            onNotice={setNotice}
          />
          <p className="muted storage-line" data-testid="storage-status">
            {storageLine}
          </p>
        </aside>
      </main>
      <footer className="app__footer muted">{t.footer}</footer>
    </div>
  );
}
