"use client";

import { useState } from "react";
import { resolveText, searchCatalog, type CatalogRegistry, type CategoryNode } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { attributeLabel, optionLabel } from "../format";

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
  const hits = query.trim() ? searchCatalog(registry, query) : [];
  const path = (categoryId: string) => registry.categoryPath(categoryId).map((id) => resolveText(registry.getCategory(id)?.label, locale)).join(" › ");

  const renderNode = (n: CategoryNode) => {
    const id = n.category.id;
    const open = !collapsed.has(id);
    return (
      <li key={id} data-category-id={id} data-applicable={n.applicable} data-approved={n.approved}>
        <div className={`cat-row ${selectedId === id ? "is-selected" : ""} ${n.applicable ? "" : "is-dim"}`} style={{ paddingLeft: 4 + n.depth * 14 }}>
          {n.children.length > 0 ? (
            <button
              type="button"
              className="cat-toggle"
              aria-expanded={open}
              aria-label={`${resolveText(n.category.label, locale)} ${open ? "−" : "+"}`}
              onClick={() =>
                setCollapsed((s) => {
                  const next = new Set(s);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            >
              {open ? "▾" : "▸"}
            </button>
          ) : (
            <span className="cat-toggle" aria-hidden="true" />
          )}
          <button type="button" className="cat-link" aria-current={selectedId === id ? "page" : undefined} onClick={() => onSelect(id)} title={n.applicable ? undefined : t.detailed.notApplicable}>
            {resolveText(n.category.label, locale)}
          </button>
          <span className="cat-badges">
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
        {n.children.length > 0 && open && <ul>{n.children.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <nav className="cat-nav" aria-label={t.detailed.navTitle}>
      <input type="search" className="cat-search-input" value={query} aria-label={t.detailed.searchLabel} placeholder={t.detailed.searchPlaceholder} onChange={(e) => setQuery(e.target.value)} />
      {query.trim() ? (
        hits.length === 0 ? (
          <p className="muted small">{t.detailed.noResults}</p>
        ) : (
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
        <ul className="cat-tree">{nodes.map(renderNode)}</ul>
      )}
    </nav>
  );
}
