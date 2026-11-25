"use client";

import { useId, useMemo, useState } from "react";
import { isAttributeActive, normalizeSearch, resolveText, valueOwner, type CatalogRegistry, type ValueOwner } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { describeValue } from "../format";

type LockFilter = "all" | "locked" | "unlocked";
type OutputFilter = "all" | "included" | "excluded";

/**
 * Precision (Sprint 3.1): every SET attribute of the shared ImageSpec in one list — category, value, source,
 * lock and prompt state — with search, filters, locks (one, the shown ones, all) and a jump to the field.
 * Reads and writes the same workspace as every other mode; no separate spec.
 */
export function PrecisionPanel({
  registry,
  workspace,
  locale,
  t,
  onGoTo,
}: {
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
  onGoTo(attributeId: string): void;
}) {
  const p = t.precision;
  const { spec } = workspace;
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<ValueOwner | "all">("all");
  const [lock, setLock] = useState<LockFilter>("all");
  const [output, setOutput] = useState<OutputFilter>("all");
  const ids = useId();

  // every set attribute, in catalog order
  const rows = useMemo(
    () =>
      registry
        .attributes()
        .filter((a) => a.id in spec.selections)
        .map((a) => {
          const s = spec.selections[a.id]!;
          const category = a.categoryId ? registry.categoryPath(a.categoryId).map((id) => resolveText(registry.getCategory(id)?.label, locale)).join(" › ") : p.noCategory;
          const label = resolveText(a.label, locale);
          const value = describeValue(a, s.value, locale);
          return {
            a,
            s,
            label,
            category,
            value,
            owner: valueOwner(s),
            active: isAttributeActive(registry, a, spec),
            haystack: normalizeSearch([label, resolveText(a.label, "en"), a.id, value, describeValue(a, s.value, "en"), category].join(" ")),
          };
        }),
    [registry, spec, locale, p.noCategory],
  );
  const q = normalizeSearch(query.trim());
  const shown = rows.filter(
    (r) =>
      (!q || r.haystack.includes(q)) &&
      (source === "all" || r.owner === source) &&
      (lock === "all" || (lock === "locked") === workspace.isLocked(r.a.id)) &&
      (output === "all" || (output === "excluded") === Boolean(r.s.excludedFromPrompt)),
  );
  const shownUnlocked = shown.filter((r) => !workspace.isLocked(r.a.id)).map((r) => r.a.id);
  const shownLocked = shown.filter((r) => workspace.isLocked(r.a.id)).map((r) => r.a.id);

  return (
    <section className="precision" aria-labelledby={`${ids}-title`} data-testid="precision-panel">
      <h2 id={`${ids}-title`}>{p.title}</h2>
      <p className="muted">{p.intro}</p>

      {rows.length === 0 ? (
        <p className="notice" data-testid="precision-empty">
          {p.empty}
        </p>
      ) : (
        <>
          <div className="precision__filters" role="search">
            <label className="precision__search">
              <span className="visually-hidden">{p.search}</span>
              <input type="search" value={query} placeholder={p.search} onChange={(e) => setQuery(e.target.value)} data-testid="precision-search" />
            </label>
            <label>
              <span>{p.filterSource}</span>
              <select value={source} onChange={(e) => setSource(e.target.value as ValueOwner | "all")} data-testid="precision-source">
                <option value="all">{p.all}</option>
                {(["user", "concept", "random"] as const).map((o) => (
                  <option key={o} value={o}>
                    {p.sources[o]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{p.filterLock}</span>
              <select value={lock} onChange={(e) => setLock(e.target.value as LockFilter)} data-testid="precision-lock">
                <option value="all">{p.all}</option>
                <option value="locked">{p.lockedOnly}</option>
                <option value="unlocked">{p.unlockedOnly}</option>
              </select>
            </label>
            <label>
              <span>{p.filterOutput}</span>
              <select value={output} onChange={(e) => setOutput(e.target.value as OutputFilter)} data-testid="precision-output">
                <option value="all">{p.all}</option>
                <option value="included">{p.included}</option>
                <option value="excluded">{p.excluded}</option>
              </select>
            </label>
          </div>

          <div className="precision__bar">
            <p className="small" role="status" data-testid="precision-count">
              {fmt(p.count, { shown: shown.length, total: rows.length, locked: workspace.locks.length })}
            </p>
            <span className="toolbar">
              {shownUnlocked.length > 0 && (
                <button type="button" className="button button--small" onClick={() => workspace.lock(shownUnlocked, true)} data-testid="precision-lock-shown">
                  🔒 {fmt(p.lockShown, { n: shownUnlocked.length })}
                </button>
              )}
              {shownLocked.length > 0 && (
                <button type="button" className="button button--small" onClick={() => workspace.lock(shownLocked, false)} data-testid="precision-unlock-shown">
                  🔓 {fmt(p.unlockShown, { n: shownLocked.length })}
                </button>
              )}
              {workspace.locks.length > 0 && (
                <button type="button" className="button button--small" onClick={workspace.unlockAll} data-testid="precision-unlock-all">
                  {t.lock.unlockAll}
                </button>
              )}
            </span>
          </div>

          {shown.length === 0 ? (
            <p className="muted" data-testid="precision-no-match">
              {p.noMatch}
            </p>
          ) : (
            <table className="precision__table" aria-label={fmt(p.results, { n: shown.length })}>
              <thead>
                <tr>
                  <th scope="col">{p.columns.attribute}</th>
                  <th scope="col">{p.columns.category}</th>
                  <th scope="col">{p.columns.value}</th>
                  <th scope="col">{p.columns.source}</th>
                  <th scope="col">{p.columns.lock}</th>
                  <th scope="col">{p.columns.output}</th>
                  <th scope="col">
                    <span className="visually-hidden">{p.goTo}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const locked = workspace.isLocked(r.a.id);
                  const excluded = Boolean(r.s.excludedFromPrompt);
                  return (
                    <tr key={r.a.id} data-attribute-row={r.a.id} data-locked={locked || undefined}>
                      <th scope="row" data-label={p.columns.attribute}>
                        {r.label}
                        {!r.active && <span className="muted small"> ({p.inactive})</span>}
                      </th>
                      <td data-label={p.columns.category} className="muted small">
                        {r.category}
                      </td>
                      <td data-label={p.columns.value}>{r.value}</td>
                      <td data-label={p.columns.source}>
                        <span className={`badge badge--source-${r.owner}`}>
                          {p.sources[r.owner]}
                          {r.s.source === "import" && ` (${p.imported})`}
                        </span>
                      </td>
                      <td data-label={p.columns.lock}>
                        <button
                          type="button"
                          className={`lock-toggle${locked ? " is-locked" : ""}`}
                          aria-pressed={locked}
                          aria-label={`${t.lock.lock}: ${r.label}`}
                          onClick={() => workspace.lock([r.a.id], !locked)}
                          data-testid={`precision-lock-${r.a.id}`}
                        >
                          <span aria-hidden="true">{locked ? "🔒" : "🔓"}</span> {locked ? t.lock.locked : t.lock.lock}
                        </button>
                      </td>
                      <td data-label={p.columns.output}>
                        {r.a.outputToggle ? (
                          <label className="output-toggle">
                            <input
                              type="checkbox"
                              role="switch"
                              checked={!excluded}
                              aria-checked={!excluded}
                              aria-label={`${t.field.includeInPrompt}: ${r.label}`}
                              onChange={(e) => workspace.setExcluded(r.a.id, !e.target.checked)}
                              data-testid={`precision-output-${r.a.id}`}
                            />
                            <span aria-hidden="true">{excluded ? p.excluded : p.included}</span>
                          </label>
                        ) : (
                          <span>{excluded ? p.excluded : p.included}</span>
                        )}
                      </td>
                      <td>
                        <button type="button" className="link-button" onClick={() => onGoTo(r.a.id)} aria-label={fmt(p.goToLabel, { label: r.label })}>
                          {p.goTo}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
