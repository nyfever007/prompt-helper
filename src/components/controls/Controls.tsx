"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  normalizeSearch,
  resolveText,
  searchOptions,
  type AttributeDefinition,
  type OptionAttributeDefinition,
  type OptionDefinition,
  type SelectionValue,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { ModalDialog } from "../ModalDialog";

export interface OptionControlProps {
  attribute: OptionAttributeDefinition;
  label: string;
  selectedIds: readonly string[];
  isActive(option: OptionDefinition): boolean;
  isRestricted(option: OptionDefinition): boolean;
  locale: string;
  t: Messages;
  onSelect(optionId: string): void;
  onToggle(optionId: string): void;
  onClear(): void;
  /** Typical in the current context (`suggestedWhen`) — ordering only, never hides. */
  isSuggested?(option: OptionDefinition): boolean;
  /** Offer "add ‘query’ as a custom value" (attributes that allow custom values). */
  onAddCustomRequest?(name: string): void;
  /** Names of custom entries already in the value (an exact match hides the “add” shortcut). */
  customLabels?: readonly string[];
}

/** Options offered: applicable ones + current selections (kept) + restricted ones (shown disabled). */
export const offeredOptions = (p: Pick<OptionControlProps, "attribute" | "isActive" | "isRestricted" | "selectedIds">) =>
  p.attribute.options.filter((o) => p.isActive(o) || p.selectedIds.includes(o.id) || p.isRestricted(o));

/** Lists restricted options with the policy reason (never silently hidden). */
export function RestrictedNote({ options, locale, t }: { options: OptionDefinition[]; locale: string; t: Messages }) {
  if (options.length === 0) return null;
  return (
    <div className="restricted-note small" data-testid="restricted-note">
      <strong>{t.controls.restrictedTitle}</strong>
      <ul>
        {options.map((o) => (
          <li key={o.id}>
            {resolveText(o.label, locale)} — {resolveText(o.restriction?.reason, locale)}
          </li>
        ))}
      </ul>
    </div>
  );
}

const englishTerm = (o: OptionDefinition, locale: string) => (locale !== "en" && o.label.en !== resolveText(o.label, locale) ? o.label.en : null);

export function DropdownControl(p: OptionControlProps) {
  const options = offeredOptions(p);
  const current = p.selectedIds[0] ?? "";
  return (
    <select
      className="dropdown"
      aria-label={p.label}
      value={current}
      onChange={(e) => (e.target.value === "" ? p.onClear() : p.onSelect(e.target.value))}
    >
      <option value="">{p.t.controls.selectPlaceholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} disabled={p.isRestricted(o) && !p.selectedIds.includes(o.id)}>
          {resolveText(o.label, p.locale)}
          {!p.isActive(o) && p.selectedIds.includes(o.id) ? " ⚠" : ""}
        </option>
      ))}
    </select>
  );
}

export function CardsControl(p: OptionControlProps) {
  const [zoom, setZoom] = useState<OptionDefinition | null>(null);
  const isMulti = p.attribute.type === "multi";
  const options = offeredOptions(p);
  return (
    <>
      <div className="cards" role={isMulti ? "group" : "radiogroup"} aria-label={p.label}>
        {options.map((o) => {
          const checked = p.selectedIds.includes(o.id);
          const restricted = p.isRestricted(o);
          const example = o.examples?.find((e) => e.status === "ready" && e.src);
          const en = englishTerm(o, p.locale);
          return (
            <div key={o.id} className="card" data-checked={checked} data-option-id={o.id} data-restricted={restricted || undefined} data-inactive={!p.isActive(o) || undefined}>
              <div className="card__media">
                {example ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- local catalog asset (data URI / static), no optimization needed */}
                    <img src={example.src} alt={resolveText(example.alt, p.locale)} />
                    <button type="button" className="link-button card__zoom" onClick={() => setZoom(o)}>
                      {p.t.controls.zoom}
                    </button>
                  </>
                ) : (
                  <span className="card__placeholder">{p.t.controls.noImage}</span>
                )}
              </div>
              <label className="card__body">
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={isMulti ? undefined : p.attribute.id}
                  checked={checked}
                  disabled={restricted && !checked}
                  onChange={() => (isMulti ? p.onToggle(o.id) : p.onSelect(o.id))}
                />
                <span className="card__label">{resolveText(o.label, p.locale)}</span>
                {en && <span className="card__term" lang="en">{en}</span>}
                {o.description && <span className="card__desc">{resolveText(o.description, p.locale)}</span>}
              </label>
            </div>
          );
        })}
      </div>
      {zoom && (
        <ModalDialog className="zoom" label={resolveText(zoom.label, p.locale)} onClose={() => setZoom(null)} onBackdropClick={() => setZoom(null)}>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- local catalog asset */}
            <img src={zoom.examples?.find((e) => e.src)?.src} alt={resolveText(zoom.examples?.find((e) => e.src)?.alt, p.locale)} />
            <figcaption>
              {resolveText(zoom.label, p.locale)}
              {zoom.examples?.[0]?.provenance && <span className="muted small"> · {zoom.examples[0].provenance.source}</span>}
            </figcaption>
            <button type="button" className="button" onClick={() => setZoom(null)} data-autofocus>
              {p.t.controls.closeZoom}
            </button>
          </figure>
        </ModalDialog>
      )}
    </>
  );
}

/** Path of an option within its hierarchy, e.g. "수인족 › 고양이 수인". */
const optionPath = (attribute: OptionAttributeDefinition, o: OptionDefinition, locale: string): string => {
  const parts: string[] = [];
  let cur: OptionDefinition | undefined = o;
  while (cur && parts.length < 8) {
    parts.unshift(resolveText(cur.label, locale));
    cur = cur.parentId ? attribute.options.find((x) => x.id === cur!.parentId) : undefined;
  }
  return parts.join(" › ");
};
const depthOf = (attribute: OptionAttributeDefinition, o: OptionDefinition): number => {
  let d = 0;
  let cur = o.parentId;
  while (cur && d < 8) {
    d++;
    cur = attribute.options.find((x) => x.id === cur)?.parentId;
  }
  return d;
};

/**
 * Searchable list for large vocabularies: Korean/English labels + aliases,
 * hierarchy (children indented under their parent; search hits show the path),
 * display-only option groups, typical options first (nothing hidden), and an
 * "add as custom value" shortcut. Selected values stay visible while filtering.
 */
export function SearchableListControl(p: OptionControlProps) {
  const [query, setQuery] = useState("");
  const isMulti = p.attribute.type === "multi";
  const offered = offeredOptions(p);
  const groups = p.attribute.optionGroups ? [...p.attribute.optionGroups].sort((a, b) => a.order - b.order) : null;

  // Browsing order: hierarchy (parent then children); typical ones first when a suggestion context exists.
  const browse = useMemo(() => {
    const roots = offered.filter((o) => !o.parentId || !offered.some((x) => x.id === o.parentId));
    const withChildren = (o: OptionDefinition): OptionDefinition[] => [o, ...offered.filter((c) => c.parentId === o.id).flatMap(withChildren)];
    const suggested = (o: OptionDefinition) => !p.isSuggested || p.isSuggested(o);
    return {
      typical: roots.filter(suggested).flatMap(withChildren),
      other: roots.filter((o) => !suggested(o)).flatMap(withChildren),
    };
  }, [offered, p]);

  const { visible, matchCount, hits } = useMemo(() => {
    if (!query.trim()) return { visible: offered, matchCount: offered.length, hits: null };
    const ordered = searchOptions(p.attribute, query)
      .map((h) => h.option)
      .filter((o) => offered.includes(o));
    const hitIds = new Set(ordered.map((o) => o.id));
    const pinned = offered.filter((o) => p.selectedIds.includes(o.id) && !hitIds.has(o.id));
    return { visible: [...pinned, ...ordered], matchCount: ordered.length, hits: hitIds };
  }, [query, offered, p.attribute, p.selectedIds]);

  const exactMatch =
    query.trim() !== "" &&
    (visible.some((o) => [...Object.values(o.label), ...(o.aliases ?? [])].some((x) => normalizeSearch(x) === normalizeSearch(query))) ||
      (p.customLabels ?? []).some((l) => normalizeSearch(l) === normalizeSearch(query)));
  const selectedOptions = p.attribute.options.filter((o) => p.selectedIds.includes(o.id));

  const item = (o: OptionDefinition, flat: boolean) => {
    const en = englishTerm(o, p.locale);
    const checked = p.selectedIds.includes(o.id);
    const depth = flat ? 0 : depthOf(p.attribute, o);
    return (
      <li
        key={o.id}
        data-option-id={o.id}
        data-checked={checked}
        data-depth={depth || undefined}
        data-restricted={p.isRestricted(o) || undefined}
        style={depth ? { paddingInlineStart: depth * 18 } : undefined}
      >
        <label>
          <input
            type={isMulti ? "checkbox" : "radio"}
            name={isMulti ? undefined : p.attribute.id}
            checked={checked}
            disabled={p.isRestricted(o) && !checked}
            onChange={() => (isMulti ? p.onToggle(o.id) : p.onSelect(o.id))}
          />
          <span>{flat && o.parentId ? optionPath(p.attribute, o, p.locale) : resolveText(o.label, p.locale)}</span>
          {en && <span className="muted small" lang="en"> {en}</span>}
          {o.description && <span className="muted small"> — {resolveText(o.description, p.locale)}</span>}
          {flat && hits && !hits.has(o.id) && <span className="badge badge--set"> {p.t.field.selected}</span>}
        </label>
      </li>
    );
  };

  const groupedList = (list: OptionDefinition[]) =>
    groups ? (
      <>
        {groups.map((g) => {
          const members = list.filter((o) => o.group === g.id);
          if (members.length === 0) return null;
          return (
            <li key={`g-${g.id}`} className="list-group" role="presentation">
              <span className="list-group__title" aria-hidden="true">
                {resolveText(g.label, p.locale)}
              </span>
              <ul role="presentation">{members.map((o) => item(o, false))}</ul>
            </li>
          );
        })}
        {list.filter((o) => !o.group || !groups.some((g) => g.id === o.group)).map((o) => item(o, false))}
      </>
    ) : (
      list.map((o) => item(o, false))
    );

  return (
    <div className="option-picker">
      {selectedOptions.length > 0 && (
        // Large lists: what is selected stays visible regardless of scrolling or filtering.
        <div className="selected-summary small" data-testid={`selected-${p.attribute.id}`}>
          <span className="muted">{p.t.field.selectedSummary}:</span>
          {selectedOptions.map((o) => (
            <button
              key={o.id}
              type="button"
              className="selected-chip"
              aria-label={fmt(p.t.field.deselect, { name: resolveText(o.label, p.locale) })}
              onClick={() => (isMulti ? p.onToggle(o.id) : p.onClear())}
            >
              {resolveText(o.label, p.locale)} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <div className="option-search">
        <input type="search" value={query} placeholder={p.t.field.searchPlaceholder} aria-label={`${p.label} ${p.t.field.search}`} onChange={(e) => setQuery(e.target.value)} />
        {query.trim() && (
          <span className="counter" aria-live="polite">
            {fmt(p.t.field.searchCount, { n: matchCount })}
          </span>
        )}
      </div>
      <ul className="list-options" role={isMulti ? "group" : "radiogroup"} aria-label={p.label}>
        {query.trim() ? (
          visible.map((o) => item(o, true))
        ) : (
          <>
            {groupedList(browse.typical)}
            {browse.other.length > 0 && (
              <>
                <li className="list-group__title list-group__title--other" role="presentation" data-testid={`atypical-${p.attribute.id}`}>
                  {p.t.field.otherOptions}
                </li>
                {groupedList(browse.other)}
              </>
            )}
          </>
        )}
      </ul>
      {query.trim() && matchCount === 0 && <p className="muted small">{p.t.field.noResults}</p>}
      {p.onAddCustomRequest && query.trim() && !exactMatch && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            p.onAddCustomRequest!(query.trim());
            setQuery("");
          }}
        >
          {fmt(p.t.custom.addFromSearch, { name: query.trim() })}
        </button>
      )}
    </div>
  );
}

const NAV_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);

/**
 * Color picker (Sprint 2-C.1, TD-13). Collapsed by default: only the current color (swatch +
 * name, a custom value, or “not set”), a button that opens the palette and a per-color clear.
 * The full palette (display-only groups, e.g. natural / fantasy; never output) opens inline as a
 * NON-MODAL panel: Escape or the toggle closes it and returns focus to the toggle, a click outside
 * closes it, and choosing a color in a single-select palette closes it (arrow-key browsing does
 * not). Values, IDs, output and storage are unchanged — the palette is only not rendered while closed.
 */
export function ColorControl(p: OptionControlProps) {
  const isMulti = p.attribute.type === "multi";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const browsing = useRef(false);
  const paletteId = useId();
  const offered = offeredOptions(p);
  const selected = p.attribute.options.filter((o) => p.selectedIds.includes(o.id));
  const custom = p.customLabels ?? [];
  const hasValue = selected.length > 0 || custom.length > 0;

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  };

  // Light dismiss: a pointer press outside closes the panel without moving focus.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Opening moves focus to the current color (or the first one) so the palette is usable from the keyboard.
  useEffect(() => {
    if (!open) return;
    const panel = rootRef.current?.querySelector<HTMLElement>(".color-palette");
    (panel?.querySelector<HTMLInputElement>("input:checked:not(:disabled)") ?? panel?.querySelector<HTMLInputElement>("input:not(:disabled)"))?.focus();
  }, [open]);

  const swatch = (o: OptionDefinition) => (
    <label key={o.id} className="chip chip--swatch" data-checked={p.selectedIds.includes(o.id)} data-option-id={o.id} data-restricted={p.isRestricted(o) || undefined} data-inactive={!p.isActive(o) || undefined}>
      <input
        type={isMulti ? "checkbox" : "radio"}
        name={isMulti ? undefined : p.attribute.id}
        checked={p.selectedIds.includes(o.id)}
        disabled={p.isRestricted(o) && !p.selectedIds.includes(o.id)}
        onChange={() => (isMulti ? p.onToggle(o.id) : p.onSelect(o.id))}
        // Single select: a click (or Space) chooses and closes; arrow keys only browse.
        onClick={() => !isMulti && !browsing.current && close(true)}
      />
      <span className="swatch" style={{ background: o.swatch }} aria-hidden="true" />
      <span>{resolveText(o.label, p.locale)}</span>
    </label>
  );
  const groups = p.attribute.optionGroups ? [...p.attribute.optionGroups].sort((a, b) => a.order - b.order) : null;
  const ungrouped = groups ? offered.filter((o) => !o.group || !groups.some((g) => g.id === o.group)) : offered;

  return (
    <div
      className="color-picker"
      ref={rootRef}
      data-open={open}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close(true);
        }
      }}
    >
      <div className="color-picker__bar">
        <div className="color-picker__current" data-testid={`color-current-${p.attribute.id}`}>
          {selected.map((o) => (
            <span key={o.id} className="color-value" data-option-id={o.id} data-inactive={!p.isActive(o) || undefined}>
              <span className="swatch" style={{ background: o.swatch }} aria-hidden="true" />
              <span>{resolveText(o.label, p.locale)}</span>
              {!p.isActive(o) && <span className="muted small"> ({p.t.controls.colorInactive})</span>}
              <button
                type="button"
                className="color-value__clear"
                aria-label={fmt(p.t.field.deselect, { name: resolveText(o.label, p.locale) })}
                onClick={() => (isMulti ? p.onToggle(o.id) : p.onClear())}
              >
                <span aria-hidden="true">×</span>
              </button>
            </span>
          ))}
          {custom.map((name) => (
            <span key={`custom-${name}`} className="color-value color-value--custom">
              <span className="swatch swatch--custom" aria-hidden="true" />
              <span>{fmt(p.t.controls.colorCustom, { name })}</span>
            </span>
          ))}
          {!hasValue && (
            <span className="color-value color-value--unset">
              <span className="swatch swatch--empty" aria-hidden="true" />
              <span className="muted">{p.t.controls.colorUnset}</span>
            </span>
          )}
        </div>
        <button
          ref={toggleRef}
          type="button"
          className="button button--small color-picker__toggle"
          aria-expanded={open}
          aria-controls={open ? paletteId : undefined}
          aria-label={`${p.label}: ${open ? p.t.controls.colorClose : hasValue ? p.t.controls.colorChange : p.t.controls.colorOpen}`}
          onClick={() => (open ? close(false) : setOpen(true))}
        >
          {open ? p.t.controls.colorClose : hasValue ? p.t.controls.colorChange : p.t.controls.colorOpen}
        </button>
      </div>
      {open && (
        <div
          id={paletteId}
          className="color-palette"
          role="group"
          aria-label={fmt(p.t.controls.colorPalette, { label: p.label })}
          onKeyDown={(e) => {
            if (NAV_KEYS.has(e.key)) browsing.current = true;
            // Single select (Sprint 2-C.4 fix): arrow keys already choose a color, and browsers fire no click for
            // Space on an already-checked radio (Enter does nothing on radios) — so Space on the current color or
            // Enter confirms the choice and closes, returning focus to the toggle.
            const target = e.target as HTMLInputElement;
            if (!isMulti && target.type === "radio" && (e.key === "Enter" || (e.key === " " && target.checked))) {
              e.preventDefault();
              const id = target.closest("[data-option-id]")?.getAttribute("data-option-id");
              if (!target.checked && id && !target.disabled) p.onSelect(id);
              close(true);
            }
          }}
          onKeyUp={(e) => {
            if (NAV_KEYS.has(e.key)) browsing.current = false;
          }}
        >
          <div className="swatch-groups" role={isMulti ? "group" : "radiogroup"} aria-label={p.label}>
            {groups?.map((g) => {
              const members = offered.filter((o) => o.group === g.id);
              if (members.length === 0) return null;
              return (
                <div key={g.id} className="swatch-group" data-group-id={g.id}>
                  <span className="swatch-group__title small muted">{resolveText(g.label, p.locale)}</span>
                  <div className="chips">{members.map(swatch)}</div>
                </div>
              );
            })}
            {ungrouped.length > 0 && <div className="chips">{ungrouped.map(swatch)}</div>}
          </div>
          <button type="button" className="button button--small color-palette__done" onClick={() => close(true)}>
            {p.t.controls.colorDone}
          </button>
        </div>
      )}
    </div>
  );
}

type NumberAttr = Extract<AttributeDefinition, { type: "number" }>;
type RangeAttr = Extract<AttributeDefinition, { type: "range" }>;

const formatNumber = (a: NumberAttr | RangeAttr, v: number) => (a.unit ? (a.unit === "%" ? `${v}%` : `${v} ${a.unit}`) : String(v));

/**
 * Slider: an unset attribute shows a neutral, dimmed track. The displayed
 * position is NEVER stored — only an input event from the user stores a value.
 */
export function SliderControl({ attribute, value, label, locale, t, onSet }: { attribute: NumberAttr; value: number | undefined; label: string; locale: string; t: Messages; onSet(v: SelectionValue): void }) {
  const unset = value === undefined;
  const step = attribute.step ?? 1;
  const display = unset ? Math.round((attribute.min + attribute.max) / 2 / step) * step : value;
  const band = !unset && attribute.bands ? (attribute.bands.find((b) => value <= b.upTo) ?? attribute.bands[attribute.bands.length - 1]) : undefined;
  // Relative (degree) sliders show only the qualitative band — the number is not a measurement (Sprint 2-B.2 §5).
  const valueText = unset ? t.controls.unsetValue : band ? resolveText(band.label, locale) : formatNumber(attribute, value);
  return (
    <div className="slider" data-unset={unset}>
      <input
        type="range"
        aria-label={label}
        min={attribute.min}
        max={attribute.max}
        step={step}
        value={display}
        aria-valuetext={valueText}
        onChange={(e) => onSet({ kind: "number", value: Number(e.target.value) })}
      />
      <output className="slider__value" data-testid={`slider-value-${attribute.id}`}>
        {valueText}
      </output>
      <p className="muted small">{unset ? t.controls.sliderHint : attribute.semantics === "degree" ? t.controls.sliderDisclaimer : ""}</p>
    </div>
  );
}

/** Numeric input with a draft: invalid or partial input is shown but never stored. */
export function NumberInputControl({ attribute, value, label, t, onSet, onClear }: { attribute: NumberAttr; value: number | undefined; label: string; t: Messages; onSet(v: SelectionValue): void; onClear(): void }) {
  const savedKey = value === undefined ? "" : String(value);
  const [synced, setSynced] = useState(savedKey);
  const [draft, setDraft] = useState(savedKey);
  if (synced !== savedKey) {
    // external change (import, undo, clear): adopt it unless the draft already represents it
    setSynced(savedKey);
    if (Number(draft) !== value || draft === "") setDraft(savedKey);
  }
  const n = Number(draft);
  const invalid = draft.trim() !== "" && (!Number.isFinite(n) || n < attribute.min || n > attribute.max);
  const errId = useId();
  return (
    <div className="number-control">
      <input
        type="number"
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errId : undefined}
        min={attribute.min}
        max={attribute.max}
        step={attribute.step}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (next.trim() === "") return onClear();
          const v = Number(next);
          if (Number.isFinite(v) && v >= attribute.min && v <= attribute.max) onSet({ kind: "number", value: v });
        }}
      />
      {attribute.unit && <span className="muted">{attribute.unit}</span>}
      {invalid && (
        <span id={errId} role="alert" className="field-error small">
          {fmt(t.controls.numberInvalid, { min: attribute.min, max: attribute.max })}
        </span>
      )}
    </div>
  );
}

/**
 * Range with a draft: a value is stored only when BOTH ends are valid
 * (min ≤ max, within bounds). A half-filled draft is never stored and never
 * completed with display defaults.
 */
export function RangeControl({
  attribute,
  value,
  label,
  t,
  onSet,
  onClear,
}: {
  attribute: RangeAttr;
  value: { min: number; max: number } | undefined;
  label: string;
  t: Messages;
  onSet(v: SelectionValue): void;
  onClear(): void;
}) {
  const savedKey = value ? `${value.min}|${value.max}` : "";
  const fromSaved = () => (value ? { min: String(value.min), max: String(value.max) } : { min: "", max: "" });
  const [synced, setSynced] = useState(savedKey);
  const [draft, setDraft] = useState(fromSaved);
  if (synced !== savedKey) {
    setSynced(savedKey);
    if (`${draft.min}|${draft.max}` !== savedKey) setDraft(fromSaved());
  }
  const lo = Number(draft.min);
  const hi = Number(draft.max);
  const bothEmpty = draft.min.trim() === "" && draft.max.trim() === "";
  const incomplete = !bothEmpty && (draft.min.trim() === "" || draft.max.trim() === "");
  const complete = !bothEmpty && !incomplete;
  const valid = complete && Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi && lo >= attribute.min && hi <= attribute.max;
  const dirty = `${draft.min}|${draft.max}` !== savedKey && !(bothEmpty && savedKey === "");

  const update = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    const a = Number(next.min);
    const b = Number(next.max);
    if (next.min.trim() === "" && next.max.trim() === "") {
      if (value) onClear();
      return;
    }
    if (next.min.trim() !== "" && next.max.trim() !== "" && Number.isFinite(a) && Number.isFinite(b) && a <= b && a >= attribute.min && b <= attribute.max) {
      onSet({ kind: "range", min: a, max: b });
    }
  };

  return (
    <div className="range-control">
      <input type="number" aria-label={`${label} ${t.controls.rangeMin}`} placeholder={t.controls.rangeMin} min={attribute.min} max={attribute.max} step={attribute.step} value={draft.min} onChange={(e) => update({ min: e.target.value })} />
      <span>–</span>
      <input type="number" aria-label={`${label} ${t.controls.rangeMax}`} placeholder={t.controls.rangeMax} min={attribute.min} max={attribute.max} step={attribute.step} value={draft.max} onChange={(e) => update({ max: e.target.value })} />
      {attribute.unit && <span className="muted">{attribute.unit}</span>}
      {incomplete && <span className="muted small" data-testid={`range-hint-${attribute.id}`}>{t.controls.rangeIncomplete}</span>}
      {complete && !valid && (
        <span role="alert" className="field-error small">
          {fmt(t.controls.rangeInvalid, { min: attribute.min, max: attribute.max })}
        </span>
      )}
      {dirty && (
        <button type="button" className="link-button" onClick={() => setDraft(fromSaved())}>
          {t.controls.cancelEdit}
        </button>
      )}
    </div>
  );
}
