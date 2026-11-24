"use client";

import { useId, useMemo, useState } from "react";
import { resolveText, searchOptions, type OptionAttributeDefinition, type OptionDefinition } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";

/**
 * Single/multi option chips driven entirely by catalog data.
 * - Inapplicable options are hidden unless currently selected (then marked).
 * - `searchable` attributes get a search box over all-locale labels + aliases.
 * - No limit on the number of options rendered.
 */
export function OptionPicker({
  attribute,
  label,
  selectedIds,
  isActive,
  isRestricted = () => false,
  locale,
  t,
  onSelect,
  onToggle,
}: {
  attribute: OptionAttributeDefinition;
  label: string;
  selectedIds: readonly string[];
  isActive(option: OptionDefinition): boolean;
  /** Policy-restricted options are shown DISABLED (never silently hidden). */
  isRestricted?(option: OptionDefinition): boolean;
  locale: string;
  t: Messages;
  onSelect(optionId: string): void;
  onToggle(optionId: string): void;
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();

  const { visible, matchCount } = useMemo(() => {
    const offered = attribute.options.filter((o) => isActive(o) || selectedIds.includes(o.id) || isRestricted(o));
    if (!attribute.searchable || !query.trim()) return { visible: offered, matchCount: offered.length };
    const ordered = searchOptions(attribute, query)
      .map((h) => h.option)
      .filter((o) => offered.includes(o));
    const hits = new Set(ordered.map((o) => o.id));
    // Keep current selections visible even when they do not match the query.
    const pinned = offered.filter((o) => selectedIds.includes(o.id) && !hits.has(o.id));
    return { visible: [...pinned, ...ordered], matchCount: ordered.length };
  }, [attribute, isActive, isRestricted, selectedIds, query]);

  const isMulti = attribute.type === "multi";
  return (
    <div className="option-picker">
      {attribute.searchable && (
        <div className="option-search">
          <input
            id={searchId}
            type="search"
            value={query}
            placeholder={t.field.searchPlaceholder}
            aria-label={`${label} ${t.field.search}`}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && (
            <span className="counter" aria-live="polite">
              {fmt(t.field.searchCount, { n: matchCount })}
            </span>
          )}
        </div>
      )}
      <div role={isMulti ? "group" : "radiogroup"} aria-label={label} className="chips">
        {visible.map((o) => {
          const checked = selectedIds.includes(o.id);
          const inactive = !isActive(o);
          const restricted = isRestricted(o);
          return (
            <label
              key={o.id}
              className={`chip ${o.parentId ? "chip--child" : ""}`}
              data-checked={checked}
              data-inactive={inactive || undefined}
              data-restricted={restricted || undefined}
              data-option-id={o.id}
            >
              <input
                type={isMulti ? "checkbox" : "radio"}
                name={isMulti ? undefined : attribute.id}
                value={o.id}
                checked={checked}
                disabled={restricted && !checked}
                onChange={() => (isMulti ? onToggle(o.id) : onSelect(o.id))}
              />
              <span>{resolveText(o.label, locale)}</span>
            </label>
          );
        })}
      </div>
      {attribute.searchable && query.trim() && matchCount === 0 && <p className="muted small">{t.field.noResults}</p>}
    </div>
  );
}
