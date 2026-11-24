"use client";

import { useId, useMemo, useState } from "react";
import {
  resolveText,
  searchOptions,
  type AttributeDefinition,
  type OptionAttributeDefinition,
  type OptionDefinition,
  type SelectionValue,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";

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
        <div className="zoom" role="dialog" aria-modal="true" aria-label={resolveText(zoom.label, p.locale)} onClick={() => setZoom(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local catalog asset */}
            <img src={zoom.examples?.find((e) => e.src)?.src} alt={resolveText(zoom.examples?.find((e) => e.src)?.alt, p.locale)} />
            <figcaption>
              {resolveText(zoom.label, p.locale)}
              {zoom.examples?.[0]?.provenance && <span className="muted small"> · {zoom.examples[0].provenance.source}</span>}
            </figcaption>
            <button type="button" className="button" onClick={() => setZoom(null)} autoFocus>
              {p.t.controls.closeZoom}
            </button>
          </figure>
        </div>
      )}
    </>
  );
}

export function SearchableListControl(p: OptionControlProps) {
  const [query, setQuery] = useState("");
  const isMulti = p.attribute.type === "multi";
  const offered = offeredOptions(p);
  const { visible, matchCount } = useMemo(() => {
    if (!query.trim()) return { visible: offered, matchCount: offered.length };
    const ordered = searchOptions(p.attribute, query)
      .map((h) => h.option)
      .filter((o) => offered.includes(o));
    const hits = new Set(ordered.map((o) => o.id));
    const pinned = offered.filter((o) => p.selectedIds.includes(o.id) && !hits.has(o.id));
    return { visible: [...pinned, ...ordered], matchCount: ordered.length };
  }, [query, offered, p.attribute, p.selectedIds]);
  return (
    <div className="option-picker">
      <div className="option-search">
        <input type="search" value={query} placeholder={p.t.field.searchPlaceholder} aria-label={`${p.label} ${p.t.field.search}`} onChange={(e) => setQuery(e.target.value)} />
        {query.trim() && <span className="counter">{fmt(p.t.field.searchCount, { n: matchCount })}</span>}
      </div>
      <ul className="list-options" role={isMulti ? "group" : "radiogroup"} aria-label={p.label}>
        {visible.map((o) => {
          const en = englishTerm(o, p.locale);
          return (
            <li key={o.id} data-option-id={o.id} data-checked={p.selectedIds.includes(o.id)} data-restricted={p.isRestricted(o) || undefined}>
              <label>
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={isMulti ? undefined : p.attribute.id}
                  checked={p.selectedIds.includes(o.id)}
                  disabled={p.isRestricted(o) && !p.selectedIds.includes(o.id)}
                  onChange={() => (isMulti ? p.onToggle(o.id) : p.onSelect(o.id))}
                />
                <span>{resolveText(o.label, p.locale)}</span>
                {en && <span className="muted small" lang="en"> {en}</span>}
                {o.description && <span className="muted small"> — {resolveText(o.description, p.locale)}</span>}
              </label>
            </li>
          );
        })}
      </ul>
      {query.trim() && matchCount === 0 && <p className="muted small">{p.t.field.noResults}</p>}
    </div>
  );
}

export function ColorControl(p: OptionControlProps) {
  const isMulti = p.attribute.type === "multi";
  return (
    <div className="chips" role={isMulti ? "group" : "radiogroup"} aria-label={p.label}>
      {offeredOptions(p).map((o) => (
        <label key={o.id} className="chip chip--swatch" data-checked={p.selectedIds.includes(o.id)} data-option-id={o.id} data-restricted={p.isRestricted(o) || undefined}>
          <input
            type={isMulti ? "checkbox" : "radio"}
            name={isMulti ? undefined : p.attribute.id}
            checked={p.selectedIds.includes(o.id)}
            disabled={p.isRestricted(o) && !p.selectedIds.includes(o.id)}
            onChange={() => (isMulti ? p.onToggle(o.id) : p.onSelect(o.id))}
          />
          <span className="swatch" style={{ background: o.swatch }} aria-hidden="true" />
          <span>{resolveText(o.label, p.locale)}</span>
        </label>
      ))}
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
  const valueText = unset ? t.controls.unsetValue : `${formatNumber(attribute, value)}${band ? ` · ${resolveText(band.label, locale)}` : ""}`;
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
