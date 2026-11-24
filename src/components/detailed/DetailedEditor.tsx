"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildCategoryTree, flattenCategoryTree, resolveText, type CatalogRegistry, type CategoryNode, type PresetPlan } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import type { Workspace } from "@/state/useWorkspace";
import { WorkspaceField } from "../controls/WorkspaceField";
import { CategoryNav } from "./CategoryNav";
import { PresetDialog } from "./PresetDialog";

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
}: {
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
  onPresetApplied(name: string, count: number): void;
}) {
  const tree = useMemo(() => buildCategoryTree(registry, workspace.spec, workspace.compilation.diagnostics), [registry, workspace.spec, workspace.compilation.diagnostics]);
  const flat = useMemo(() => flattenCategoryTree(tree), [tree]);
  const [selectedId, setSelectedId] = useState(() => flat.find((n) => n.approved && n.attributes.length > 0)?.category.id ?? flat[0]?.category.id ?? "");
  const [navOpen, setNavOpen] = useState(false);
  const [dialogPresetId, setDialogPresetId] = useState<string | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const node = flat.find((n) => n.category.id === selectedId) ?? flat[0];

  // After navigating from search, bring the matched attribute into view.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const el = document.getElementById(`attr-${id}`);
    el?.scrollIntoView?.({ block: "center" });
    el?.focus();
  }, [selectedId]);

  const select = (categoryId: string, attributeId?: string) => {
    pendingFocus.current = attributeId ?? null;
    setSelectedId(categoryId);
    setNavOpen(false);
    if (attributeId && categoryId === selectedId) {
      const el = document.getElementById(`attr-${attributeId}`);
      el?.scrollIntoView?.({ block: "center" });
      el?.focus();
    }
  };

  const tx = workspace.presetTransaction;
  const txName = tx ? resolveText(registry.getPreset(tx.presetId)?.label, locale) || tx.presetId : "";

  return (
    <div className="detailed" data-nav-open={navOpen}>
      <div className="detailed__navbar">
        <button type="button" className="button nav-toggle" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>
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
        {node && <CategoryPanel node={node} registry={registry} workspace={workspace} locale={locale} t={t} onSelect={select} onOpenPreset={setDialogPresetId} />}
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

function CategoryPanel({
  node,
  registry,
  workspace,
  locale,
  t,
  onSelect,
  onOpenPreset,
}: {
  node: CategoryNode;
  registry: CatalogRegistry;
  workspace: Workspace;
  locale: string;
  t: Messages;
  onSelect(id: string): void;
  onOpenPreset(id: string): void;
}) {
  const c = node.category;
  const path = registry.categoryPath(c.id).map((id) => resolveText(registry.getCategory(id)?.label, locale));
  const presets = node.approved ? registry.presets.filter((p) => p.status === "approved" && p.categoryId === c.id) : [];
  return (
    <section className="cat-panel" aria-labelledby="cat-panel-title" data-category-id={c.id}>
      <p className="breadcrumb muted small">{path.join(" › ")}</p>
      <h2 id="cat-panel-title">
        {resolveText(c.label, locale)} {!node.approved && <span className="badge badge--planned">{t.detailed.draft}</span>}
      </h2>
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
    </section>
  );
}
