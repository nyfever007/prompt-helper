"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  attributesInCategory,
  buildCategoryTree,
  flattenCategoryTree,
  isAttributeActive,
  resolveText,
  type CatalogRegistry,
  type CategoryNode,
  type PresetPlan,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { WorkspaceField } from "../controls/WorkspaceField";
import { ModalDialog } from "../ModalDialog";
import type { DetailedNavigator } from "../navigation";
import { attributeLabel } from "../format";
import { CategoryNav } from "./CategoryNav";
import { PresetDialog } from "./PresetDialog";

const PAGE_TITLE = "\u0000page-title";

/**
 * Detailed Editor: navigation, editing panel and (in the app shell) preview.
 * Everything — categories, attributes, controls, presets — comes from the
 * catalog; no category has a hand-written screen.
 */
export function DetailedEditor({
  registry,
  workspace,
  locale,
  t,
  onPresetApplied,
  navigatorRef,
  initialAttributeId,
}: {
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
  onPresetApplied(name: string, count: number): void;
  navigatorRef?: DetailedNavigator;
  initialAttributeId?: string;
}) {
  const tree = useMemo(() => buildCategoryTree(registry, workspace.spec, workspace.compilation.diagnostics), [registry, workspace.spec, workspace.compilation.diagnostics]);
  const flat = useMemo(() => flattenCategoryTree(tree), [tree]);
  const [selectedId, setSelectedId] = useState(() => {
    const target = initialAttributeId ? registry.getAttribute(initialAttributeId)?.categoryId : undefined;
    if (target && flat.some((n) => n.category.id === target)) return target;
    return flat.find((n) => n.approved && n.attributes.length > 0)?.category.id ?? flat[0]?.category.id ?? "";
  });
  const [navOpen, setNavOpen] = useState(false);
  const [dialogPresetId, setDialogPresetId] = useState<string | null>(null);
  const pendingFocus = useRef<string | null>(initialAttributeId ?? null);
  const node = flat.find((n) => n.category.id === selectedId) ?? flat[0];

  // After navigating from search, bring the matched attribute into view.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    if (id === PAGE_TITLE) {
      const title = document.getElementById("cat-panel-title");
      title?.scrollIntoView?.({ block: "nearest" });
      title?.focus();
      return;
    }
    const el = document.getElementById(`attr-${id}`);
    el?.scrollIntoView?.({ block: "center" });
    el?.focus();
  }, [selectedId]);

  const select = (categoryId: string, attributeId?: string) => {
    // With the (mobile) category drawer open, the chosen item disappears with the drawer: continue on the page title.
    pendingFocus.current = attributeId ?? (navOpen ? PAGE_TITLE : null);
    setSelectedId(categoryId);
    setNavOpen(false);
    if (attributeId && categoryId === selectedId) {
      const el = document.getElementById(`attr-${attributeId}`);
      el?.scrollIntoView?.({ block: "center" });
      el?.focus();
    }
  };

  // “Go to attribute” (notices pointing to related settings) uses the same navigation as search.
  useEffect(() => {
    if (!navigatorRef) return;
    navigatorRef.current = select;
    return () => {
      navigatorRef.current = null;
    };
  });

  const tx = workspace.presetTransaction;
  const txName = tx ? resolveText(registry.getPreset(tx.presetId)?.label, locale) || tx.presetId : "";
  const catName = (id: string) => resolveText(registry.getCategory(id)?.label, locale);
  const [latestReset, ...olderResets] = workspace.categoryResets;
  const lastRestore = workspace.lastCategoryRestore;
  const time = (at: string | undefined) => (at ? new Date(at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "");
  const [dismissedRestore, setDismissedRestore] = useState(0);

  return (
    <div className="detailed" data-nav-open={navOpen}>
      <div className="detailed__navbar">
        <button type="button" className="button nav-toggle" aria-expanded={navOpen} aria-controls="detailed-nav" onClick={() => setNavOpen(!navOpen)}>
          ☰ {navOpen ? t.detailed.closeNav : t.detailed.openNav}
          {node && <span className="muted small"> · {resolveText(node.category.label, locale)}</span>}
        </button>
      </div>
      <CategoryNav nodes={tree} registry={registry} selectedId={selectedId} locale={locale} t={t} onSelect={select} />
      <div className="detailed__main">
        {tx && (
          <div className="preset-bar" role="status">
            <span>{fmt(t.detailed.lastPreset, { name: txName })}</span>
            <button type="button" className="button button--small" onClick={() => workspace.undoPreset()}>
              {t.detailed.undoPreset}
            </button>
          </div>
        )}
        {latestReset && (
          // TD-09: the most recent reset stays one click away; earlier ones (session only) are listed below it.
          <div className="preset-bar reset-history" role="status" data-testid="category-reset-bar" data-reset-id={latestReset.id}>
            <span>
              {fmt(t.categoryReset.done, { name: catName(latestReset.categoryId), n: Object.keys(latestReset.removed).length })}
              {latestReset.editedSince.length > 0 && <span className="small"> · {fmt(t.categoryReset.editedNote, { n: latestReset.editedSince.length })}</span>}
            </span>
            <button type="button" className="button button--small" onClick={() => workspace.undoCategoryReset(latestReset.id)}>
              {t.categoryReset.undo}
            </button>
            {olderResets.length > 0 && (
              <details className="reset-history__older" data-testid="category-reset-history">
                <summary>{fmt(t.categoryReset.older, { n: olderResets.length })}</summary>
                <ol>
                  {olderResets.map((r) => (
                    <li key={r.id} data-reset-id={r.id}>
                      <span>{fmt(t.categoryReset.entry, { name: catName(r.categoryId), n: Object.keys(r.removed).length, time: time(r.at) })}</span>
                      {r.editedSince.length > 0 && <span className="small"> · {fmt(t.categoryReset.editedNote, { n: r.editedSince.length })}</span>}
                      <button
                        type="button"
                        className="button button--small"
                        aria-label={fmt(t.categoryReset.undoOne, { name: catName(r.categoryId), time: time(r.at) })}
                        onClick={() => workspace.undoCategoryReset(r.id)}
                      >
                        {t.categoryReset.undoShort}
                      </button>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        )}
        {lastRestore && lastRestore.id !== dismissedRestore && (
          <div className="notice" role="status" data-testid="category-restore-notice">
            <span>{fmt(t.categoryReset.restored, { name: catName(lastRestore.categoryId), n: lastRestore.restored.length })}</span>
            {lastRestore.skipped.length > 0 && (
              <span> {fmt(t.categoryReset.skipped, { labels: lastRestore.skipped.map((id) => attributeLabel(registry, id, locale)).join(", ") })}</span>
            )}{" "}
            <button type="button" className="link-button" onClick={() => setDismissedRestore(lastRestore.id)}>
              {t.dismiss}
            </button>
          </div>
        )}
        {node && (
          <CategoryPanel
            key={node.category.id}
            node={node}
            registry={registry}
            workspace={workspace}
            locale={locale}
            t={t}
            onSelect={select}
            onOpenPreset={setDialogPresetId}
            sequence={sequenceAround(flat, node.category.id)}
            onStep={(id) => {
              pendingFocus.current = PAGE_TITLE;
              setSelectedId(id);
            }}
          />
        )}
      </div>
      {dialogPresetId && (
        <PresetDialog
          presetId={dialogPresetId}
          registry={registry}
          workspace={workspace}
          locale={locale}
          t={t}
          onClose={() => setDialogPresetId(null)}
          onApplied={(plan: PresetPlan, mode) => {
            const count = plan.entries.filter((e) => e.kind === "new" || (mode === "all" && e.kind === "change")).length;
            workspace.applyPreset(plan, mode);
            setDialogPresetId(null);
            onPresetApplied(resolveText(plan.preset.label, locale), count);
          }}
        />
      )}
    </div>
  );
}

/**
 * Previous / next page with editable attributes, in navigation order (approved, applicable pages
 * only), so a long area such as Wardrobe or Camera can be walked through without reopening the
 * navigation (mobile in particular). Purely navigational.
 */
const sequenceAround = (flat: CategoryNode[], id: string) => {
  const pages = flat.filter((n) => n.approved && n.applicable && n.attributes.length > 0);
  const order = flat.map((n) => n.category.id);
  const at = order.indexOf(id);
  const before = pages.filter((n) => order.indexOf(n.category.id) < at);
  const after = pages.filter((n) => order.indexOf(n.category.id) > at);
  return { previous: before[before.length - 1], next: after[0] };
};

function CategoryPanel({
  node,
  registry,
  workspace,
  locale,
  t,
  onSelect,
  onOpenPreset,
  sequence,
  onStep,
}: {
  node: CategoryNode;
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
  onSelect(id: string): void;
  onOpenPreset(id: string): void;
  sequence: { previous: CategoryNode | undefined; next: CategoryNode | undefined };
  onStep(id: string): void;
}) {
  const c = node.category;
  const path = registry.categoryPath(c.id).map((id) => resolveText(registry.getCategory(id)?.label, locale));
  const presets = node.approved ? registry.presets.filter((p) => p.status === "approved" && p.categoryId === c.id) : [];
  // Category reset targets: EVERY stored selection of the subtree (not what is shown/filtered).
  const targets = attributesInCategory(registry, c.id).filter((id) => id in workspace.spec.selections);
  const [confirming, setConfirming] = useState(false);
  const stateOf = (id: string) => {
    const a = registry.getAttribute(id)!;
    const tags: string[] = [];
    if (workspace.spec.selections[id]?.excludedFromPrompt) tags.push(t.categoryReset.excluded);
    if (!isAttributeActive(registry, a, workspace.spec)) tags.push(t.categoryReset.inactive);
    if (!registry.isExposed(a, "detailed")) tags.push(t.categoryReset.hidden);
    return tags;
  };
  const showReset = (node.approved && (node.attributes.length > 0 || node.children.length > 0)) || targets.length > 0;
  return (
    <section className="cat-panel" aria-labelledby="cat-panel-title" data-category-id={c.id}>
      <p className="breadcrumb muted small">{path.join(" › ")}</p>
      <div className="cat-panel__head">
        <h2 id="cat-panel-title" tabIndex={-1}>
          {resolveText(c.label, locale)} {!node.approved && <span className="badge badge--planned">{t.detailed.draft}</span>}
          {targets.length > 0 && <span className="badge badge--set"> {fmt(t.detailed.setCount, { n: targets.length })}</span>}
        </h2>
        {showReset && (
          <button
            type="button"
            className="button button--small"
            disabled={targets.length === 0}
            title={targets.length === 0 ? t.categoryReset.nothing : undefined}
            onClick={() => setConfirming(true)}
            data-testid="category-reset"
          >
            {t.categoryReset.button}
          </button>
        )}
      </div>
      {confirming && (
        <ModalDialog
          labelledBy="cat-reset-title"
          testId="category-reset-dialog"
          onClose={() => setConfirming(false)}
          // After a reset the button is disabled (nothing left): focus the undo button, else the page title.
          returnFocus={() => document.querySelector<HTMLElement>('[data-testid="category-reset-bar"] button') ?? document.getElementById("cat-panel-title")}
        >
          <div className="modal__card">
            <h3 id="cat-reset-title">{fmt(t.categoryReset.title, { name: resolveText(c.label, locale) })}</h3>
            <p>{fmt(t.categoryReset.body, { n: targets.length })}</p>
            <ul className="small">
              {targets.map((id) => {
                const tags = stateOf(id);
                return (
                  <li key={id} data-attribute-id={id}>
                    {attributeLabel(registry, id, locale)}
                    {tags.length > 0 && <span className="muted"> ({tags.join(", ")})</span>}
                  </li>
                );
              })}
            </ul>
            <div className="toolbar">
              <button
                type="button"
                className="button button--danger"
                onClick={() => {
                  workspace.resetCategory(c.id);
                  setConfirming(false);
                }}
              >
                {fmt(t.categoryReset.confirm, { n: targets.length })}
              </button>
              <button type="button" className="button" data-autofocus onClick={() => setConfirming(false)}>
                {t.categoryReset.cancel}
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
      {c.description && <p className="muted">{resolveText(c.description, locale)}</p>}
      {!node.applicable && (
        <p className="notice notice--warning" role="note">
          {t.detailed.notApplicableBody}
        </p>
      )}
      {!node.approved && (
        <div className="planned__banner" role="note" data-testid="draft-placeholder">
          <span className="badge badge--planned">{t.detailed.draft}</span>
          <h3>{t.detailed.draftTitle}</h3>
          <p>{fmt(t.detailed.draftBody, { doc: c.docPath ?? "docs/catalogs/" })}</p>
        </div>
      )}
      {presets.length > 0 && (
        <div className="presets">
          <h3>{t.detailed.presets}</h3>
          <ul>
            {presets.map((p) => (
              <li key={p.id} className="preset-card" data-preset-id={p.id}>
                <div>
                  <strong>{resolveText(p.label, locale)}</strong>
                  {p.description && <p className="muted small">{resolveText(p.description, locale)}</p>}
                </div>
                <button type="button" className="button button--small" aria-label={`${t.detailed.presetPreview} ${resolveText(p.label, locale)}`} onClick={() => onOpenPreset(p.id)}>
                  {t.detailed.presetPreview}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="attribute-list">
        {node.attributes.map((a) => (
          <WorkspaceField key={a.id} attribute={a} registry={registry} workspace={workspace} locale={locale} t={t} />
        ))}
      </div>
      {node.children.length > 0 && (
        <div className="subcats">
          <h3>{t.detailed.subcategories}</h3>
          <ul>
            {node.children.map((ch) => (
              <li key={ch.category.id}>
                <button type="button" className="button button--small" onClick={() => onSelect(ch.category.id)}>
                  {resolveText(ch.category.label, locale)}
                  {ch.setCount > 0 && <span className="badge badge--set"> {ch.setCount}</span>}
                  {!ch.approved && <span className="badge badge--planned"> {t.detailed.draft}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {node.approved && node.attributes.length === 0 && node.children.length === 0 && <p className="muted">{t.detailed.emptyApproved}</p>}
      {(sequence.previous || sequence.next) && (
        <nav className="cat-sequence" aria-label={t.detailed.sequence} data-testid="category-sequence">
          {sequence.previous ? (
            <button type="button" className="button button--small" onClick={() => onStep(sequence.previous!.category.id)}>
              ← {fmt(t.detailed.previous, { name: resolveText(sequence.previous.category.label, locale) })}
            </button>
          ) : (
            <span />
          )}
          {sequence.next && (
            <button type="button" className="button button--small" onClick={() => onStep(sequence.next!.category.id)}>
              {fmt(t.detailed.next, { name: resolveText(sequence.next.category.label, locale) })} →
            </button>
          )}
        </nav>
      )}
    </section>
  );
}
