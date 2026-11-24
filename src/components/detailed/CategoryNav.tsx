"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { resolveText, searchCatalog, type CatalogRegistry, type CategoryNode } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { attributeLabel, optionLabel } from "../format";

/**
 * Category navigation (Sprint 2-C.1, TD-01) — the WAI-ARIA *navigation treeview* pattern:
 * one Tab stop (roving tabindex); ↑/↓ move, → expands / enters, ← collapses / goes to the
 * parent, Home/End jump, Enter/Space opens the category. The current page is `aria-current`,
 * open/closed is `aria-expanded`, and set/warning/draft counts are an accessible description
 * (the visible badges are decorative), so each item's name is just the category label.
 * No type-ahead or other custom keys. Search results stay a plain list of buttons.
 */
export function CategoryNav({
  nodes,
  registry,
  selectedId,
  locale,
  t,
  onSelect,
}: {
  nodes: CategoryNode[];
  registry: CatalogRegistry;
  selectedId: string;
  locale: string;
  t: Messages;
  onSelect(categoryId: string, attributeId?: string): void;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  // Roving position, remembered only for the page it was set on: a page change from elsewhere
  // (subcategory buttons, search, previous/next) resets it to the current page.
  const [roving, setRoving] = useState<{ id: string; page: string } | null>(null);
  const focusId = roving && roving.page === selectedId ? roving.id : null;
  const setFocusId = (id: string) => setRoving({ id, page: selectedId });
  const items = useRef(new Map<string, HTMLLIElement>());
  const hits = query.trim() ? searchCatalog(registry, query) : [];
  const path = (categoryId: string) => registry.categoryPath(categoryId).map((id) => resolveText(registry.getCategory(id)?.label, locale)).join(" › ");

  // Visible items in tree order, with parent links (collapsed subtrees are skipped).
  const visible = useMemo(() => {
    const out: Array<{ node: CategoryNode; parentId: string | null }> = [];
    const walk = (list: CategoryNode[], parentId: string | null) => {
      for (const n of list) {
        out.push({ node: n, parentId });
        if (n.children.length > 0 && !collapsed.has(n.category.id)) walk(n.children, n.category.id);
      }
    };
    walk(nodes, null);
    return out;
  }, [nodes, collapsed]);

  // The single tabbable item: the focused one, else the current page, else its nearest visible ancestor.
  const tabbableId = useMemo(() => {
    const isVisible = (id: string) => visible.some((v) => v.node.category.id === id);
    if (focusId && isVisible(focusId)) return focusId;
    const ancestors = registry.categoryPath(selectedId);
    for (let i = ancestors.length - 1; i >= 0; i--) if (isVisible(ancestors[i]!)) return ancestors[i]!;
    return visible[0]?.node.category.id ?? "";
  }, [focusId, visible, registry, selectedId]);

  const moveTo = (id: string | undefined) => {
    if (!id) return;
    setFocusId(id);
    items.current.get(id)?.focus();
  };
  const setOpen = (id: string, open: boolean) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>, n: CategoryNode) => {
    const id = n.category.id;
    const i = visible.findIndex((v) => v.node.category.id === id);
    const hasChildren = n.children.length > 0;
    const open = hasChildren && !collapsed.has(id);
    let handled = true;
    switch (e.key) {
      case "ArrowDown":
        moveTo(visible[i + 1]?.node.category.id);
        break;
      case "ArrowUp":
        moveTo(visible[i - 1]?.node.category.id);
        break;
      case "Home":
        moveTo(visible[0]?.node.category.id);
        break;
      case "End":
        moveTo(visible[visible.length - 1]?.node.category.id);
        break;
      case "ArrowRight":
        if (hasChildren && !open) setOpen(id, true);
        else if (open) moveTo(n.children[0]?.category.id);
        break;
      case "ArrowLeft":
        if (open) setOpen(id, false);
        else moveTo(visible[i]?.parentId ?? undefined);
        break;
      case "Enter":
      case " ":
        onSelect(id);
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const renderNode = (n: CategoryNode) => {
    const id = n.category.id;
    const hasChildren = n.children.length > 0;
    const open = hasChildren && !collapsed.has(id);
    const label = resolveText(n.category.label, locale);
    const status = [
      !n.approved && n.category.status === "draft" ? t.detailed.draft : "",
      n.setCount > 0 ? fmt(t.detailed.rowStatus, { n: n.setCount }) : "",
      n.warningCount > 0 ? fmt(t.detailed.rowWarnings, { n: n.warningCount }) : "",
      n.blocked ? t.detailed.blocked : "",
      n.applicable ? "" : t.detailed.notApplicable,
    ].filter(Boolean);
    const labelId = `cat-label-${id}`;
    const statusId = `cat-status-${id}`;
    return (
      <li
        key={id}
        ref={(el) => {
          if (el) items.current.set(id, el);
          else items.current.delete(id);
        }}
        role="treeitem"
        className="cat-node"
        tabIndex={tabbableId === id ? 0 : -1}
        aria-level={n.depth + 1}
        aria-current={selectedId === id ? "page" : undefined}
        aria-selected={selectedId === id}
        aria-expanded={hasChildren ? open : undefined}
        aria-labelledby={labelId}
        aria-describedby={status.length > 0 ? statusId : undefined}
        data-category-id={id}
        data-applicable={n.applicable}
        data-approved={n.approved}
        onKeyDown={(e) => onKeyDown(e, n)}
        onClick={(e) => {
          e.stopPropagation(); // a nested item's click must not also select its parents
          onSelect(id);
        }}
      >
        <div
          className={`cat-row ${selectedId === id ? "is-selected" : ""} ${n.applicable ? "" : "is-dim"}`}
          style={{ paddingLeft: 4 + n.depth * 14 }}
          title={n.applicable ? undefined : t.detailed.notApplicable}
        >
          {hasChildren ? (
            // Mouse affordance only; the keyboard uses ← / → on the item itself.
            <span
              className="cat-toggle"
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(id, !open);
              }}
            >
              {open ? "▾" : "▸"}
            </span>
          ) : (
            <span className="cat-toggle" aria-hidden="true" />
          )}
          <span className="cat-link" id={labelId}>
            {label}
          </span>
          <span className="cat-badges" aria-hidden="true">
            {!n.approved && n.category.status === "draft" && <span className="badge badge--planned">{t.detailed.draft}</span>}
            {n.setCount > 0 && (
              <span className="badge badge--set" title={fmt(t.detailed.setCount, { n: n.setCount })} data-testid={`count-${id}`}>
                {n.setCount}
              </span>
            )}
            {n.warningCount > 0 && (
              <span className="badge badge--warn" title={fmt(t.detailed.warnings, { n: n.warningCount })} data-testid={`warn-${id}`}>
                ⚠ {n.warningCount}
              </span>
            )}
            {n.blocked && (
              <span className="badge badge--danger" data-testid={`blocked-${id}`}>
                {t.detailed.blocked}
              </span>
            )}
          </span>
        </div>
        {status.length > 0 && (
          <span id={statusId} hidden>
            {status.join(", ")}
          </span>
        )}
        {hasChildren && open && <ul role="group">{n.children.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <nav className="cat-nav" id="detailed-nav" aria-label={t.detailed.navTitle}>
      <input type="search" className="cat-search-input" value={query} aria-label={t.detailed.searchLabel} placeholder={t.detailed.searchPlaceholder} onChange={(e) => setQuery(e.target.value)} />
      {query.trim() && (
        <p className="muted small cat-search-count" role="status" data-testid="cat-search-count">
          {hits.length === 0 ? t.detailed.noResults : fmt(t.detailed.searchCount, { n: hits.length })}
        </p>
      )}
      {query.trim() ? (
        hits.length > 0 && (
          <ul className="cat-search-results" aria-label={t.detailed.searchLabel}>
            {hits.map((h, i) => (
              <li key={`${h.kind}-${h.attributeId ?? ""}-${h.optionId ?? ""}-${h.categoryId}-${i}`}>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    onSelect(h.categoryId, h.attributeId);
                    setQuery("");
                  }}
                >
                  <span className="muted small">{path(h.categoryId)}</span>
                  {h.attributeId && <> › {attributeLabel(registry, h.attributeId, locale)}</>}
                  {h.optionId && h.attributeId && <> › <strong>{optionLabel(registry, h.attributeId, h.optionId, locale)}</strong></>}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <ul className="cat-tree" role="tree" aria-label={t.detailed.navTitle}>
          {nodes.map(renderNode)}
        </ul>
      )}
    </nav>
  );
}
