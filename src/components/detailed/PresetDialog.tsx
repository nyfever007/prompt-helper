"use client";

import { useMemo } from "react";
import { planPreset, resolveText, writableEntries, type CatalogRegistry, type PresetApplyMode, type PresetPlan, type PresetPlanEntry } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { describeDiagnostic } from "../diagnostics";
import { ModalDialog } from "../ModalDialog";
import { attributeLabel, describeValue } from "../format";

/**
 * Preview → confirm. Shows exactly what would change; nothing is written
 * until a button is pressed. Overwriting an explicit value is a separate,
 * clearly labelled choice.
 */
export function PresetDialog({
  presetId,
  registry,
  workspace,
  locale,
  t,
  onClose,
  onApplied,
  protectUserValues = false,
}: {
  presetId: string;
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
  onClose(): void;
  onApplied(plan: PresetPlan, mode: PresetApplyMode): void;
  /** Recommended concepts (Sprint 2-D.5): keeping the user's own values is the default action. */
  protectUserValues?: boolean;
}) {
  const plan = useMemo(() => planPreset(workspace.spec, registry, presetId), [workspace.spec, registry, presetId]);
  if (!plan.ok) return null;
  const p = plan.value;
  const name = resolveText(p.preset.label, locale);
  const by = (kind: PresetPlanEntry["kind"]) => p.entries.filter((e) => e.kind === kind);
  // Sprint 3.1: locked values are never written by any mode
  const locked = new Set(workspace.locks);
  const isLocked = (e: PresetPlanEntry) => locked.has(e.attributeId);
  const lockedChanges = by("change").filter(isLocked);
  const changes = by("change").filter((e) => !isLocked(e));
  const value = (e: PresetPlanEntry, which: "current" | "next") => {
    const attr = registry.getAttribute(e.attributeId)!;
    const sel = which === "current" ? e.current! : e.next;
    return describeValue(attr, sel.value, locale);
  };
  const source = (e: PresetPlanEntry) => (e.current?.source === "preset" ? t.presetDialog.sourcePreset : t.presetDialog.sourceUser);
  const writable = by("new").length + changes.length;
  // values the user set (or imported) — kept unless the user explicitly chooses to replace them
  const userOwned = changes.filter((e) => e.current?.source !== "preset");

  const section = (kind: PresetPlanEntry["kind"], title: string, render: (e: PresetPlanEntry) => React.ReactNode) => {
    const list = by(kind);
    if (list.length === 0) return null;
    return (
      <section data-plan-kind={kind}>
        <h3>{fmt(title, { n: list.length })}</h3>
        <ul>
          {list.map((e) => (
            <li key={e.attributeId} data-attribute-id={e.attributeId}>
              <strong>{attributeLabel(registry, e.attributeId, locale)}</strong>: {render(e)}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <ModalDialog labelledBy="preset-dialog-title" onClose={onClose}>
      <div className="modal__card">
        <h2 id="preset-dialog-title">{fmt(t.presetDialog.title, { name })}</h2>
        {p.preset.description && <p className="muted">{resolveText(p.preset.description, locale)}</p>}
        <p className="small">{t.presetDialog.intro}</p>
        {!p.presetApplicable && <p className="notice notice--warning">{t.presetDialog.notApplicable}</p>}
        {section("new", t.presetDialog.new, (e) => value(e, "next"))}
        {section("change", t.presetDialog.change, (e) =>
          isLocked(e) ? (
            <>
              {value(e, "current")}{" "}
              <span className="badge badge--locked" data-testid="preset-locked">
                🔒 {t.lock.presetLocked}
              </span>
            </>
          ) : (
          <>
            {value(e, "current")} <span className="muted">({source(e)})</span> → <strong>{value(e, "next")}</strong>
            {protectUserValues && e.current?.source !== "preset" && (
              <span className="badge badge--set" data-testid="kept-by-default">
                {" "}
                {t.presetDialog.keptByDefault}
              </span>
            )}
          </>
          ),
        )}
        {section("same", t.presetDialog.same, (e) => value(e, "next"))}
        {section("inapplicable", t.presetDialog.inapplicable, (e) => value(e, "next"))}
        {section("restricted", t.presetDialog.restricted, (e) => value(e, "next"))}
        {p.conflictsAfter.length > 0 && (
          <section data-plan-kind="conflicts">
            <h3>{fmt(t.presetDialog.conflicts, { n: p.conflictsAfter.length })}</h3>
            <ul>
              {p.conflictsAfter.map((d, i) => (
                <li key={i} className="diag diag--warning">
                  {describeDiagnostic(d, { registry, locale, t }).text}
                </li>
              ))}
            </ul>
          </section>
        )}
        {p.untouched.length > 0 && (
          <details data-plan-kind="untouched">
            <summary>{fmt(t.presetDialog.untouched, { n: p.untouched.length })}</summary>
            <p className="small">{p.untouched.map((id) => attributeLabel(registry, id, locale)).join(", ")}</p>
          </details>
        )}
        {protectUserValues && userOwned.length > 0 && <p className="small notice">{fmt(t.presetDialog.keepUserNote, { n: userOwned.length })}</p>}
        {lockedChanges.length > 0 && (
          <p className="small notice" data-testid="preset-locked-note">
            🔒 {fmt(t.lock.presetLockedNote, { n: lockedChanges.length })}
          </p>
        )}
        <div className="toolbar modal__actions">
          {protectUserValues ? (
            <>
              <button type="button" className="button button--primary" disabled={!p.presetApplicable || writableEntries(p, "keepUser", locked).length === 0} onClick={() => onApplied(p, "keepUser")}>
                {userOwned.length > 0 ? t.presetDialog.applyKeepUser : t.presetDialog.apply}
              </button>
              {userOwned.length > 0 && (
                <button type="button" className="button" disabled={!p.presetApplicable} onClick={() => onApplied(p, "all")}>
                  {t.presetDialog.applyReplaceUser}
                </button>
              )}
            </>
          ) : changes.length > 0 ? (
            <>
              <button type="button" className="button button--primary" disabled={!p.presetApplicable} onClick={() => onApplied(p, "all")}>
                {t.presetDialog.applyAll}
              </button>
              <button type="button" className="button" disabled={!p.presetApplicable || by("new").length === 0} onClick={() => onApplied(p, "onlyEmpty")}>
                {t.presetDialog.applyOnlyEmpty}
              </button>
            </>
          ) : (
            <button type="button" className="button button--primary" disabled={!p.presetApplicable || writable === 0} onClick={() => onApplied(p, "all")}>
              {t.presetDialog.apply}
            </button>
          )}
          <button type="button" className="button" onClick={onClose} data-autofocus>
            {t.presetDialog.cancel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
