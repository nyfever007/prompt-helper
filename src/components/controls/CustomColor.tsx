"use client";

import { useId, useState } from "react";
import {
  customKey,
  hexToRgb,
  nearestSwatchOption,
  normalizeHex,
  resolveText,
  rgbToHex,
  type CustomEntry,
  type OptionAttributeDefinition,
  type Rgb,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";

const CHANNELS = ["r", "g", "b"] as const;

/**
 * User-defined color for a color attribute (Sprint 3.2, ADR-071): native picker, HEX, RGB number inputs and
 * sliders, all kept in sync, with a live preview and the nearest palette color. Nothing is stored by opening
 * the panel — only a change the user makes is written (a single-select color is written immediately, so
 * sketches and the prompt follow live; a multi-select color is added with a button). Invalid HEX is
 * explained and never stored. The palette stays as it is.
 */
export function CustomColorPanel({
  attribute,
  label,
  entries,
  paletteHex,
  locale,
  t,
  onWrite,
}: {
  attribute: OptionAttributeDefinition;
  label: string;
  /** The value's custom entries (all of them; only color entries are edited here). */
  entries: readonly CustomEntry[];
  /** Swatch of the selected palette color, used as the starting point (preview only). */
  paletteHex: string | null;
  locale: string;
  t: Messages;
  /** Write the value's custom entries (the palette part of the value is kept by the caller). */
  onWrite(entries: CustomEntry[]): void;
}) {
  const c = t.color;
  const isMulti = attribute.type === "multi";
  const current = isMulti ? undefined : entries.find((e) => e.color);
  const start = current?.color ?? paletteHex?.toUpperCase() ?? "#808080";
  const [open, setOpen] = useState(Boolean(current));
  const [hex, setHex] = useState(start);
  const [hexText, setHexText] = useState(start);
  const [synced, setSynced] = useState(current?.color ?? null);
  // follow outside changes of the stored color (undo, another tab, a reset)
  if ((current?.color ?? null) !== synced) {
    setSynced(current?.color ?? null);
    if (current?.color) {
      setHex(current.color);
      setHexText(current.color);
    }
  }
  const [hexLeft, setHexLeft] = useState(false);
  const hexValid = normalizeHex(hexText) !== null;
  const showHexError = !hexValid && hexLeft;
  const rgb = hexToRgb(hex);
  const near = nearestSwatchOption(attribute.options, hex);
  const ids = useId();
  const duplicate = isMulti && entries.some((e) => customKey(e.label) === customKey(hex));

  /** Single select: write right away. A user name / wording of the entry is kept; an automatic name follows the color. */
  const commit = (next: string, keepText = false) => {
    setHex(next);
    if (!keepText) setHexText(next);
    if (isMulti) return;
    setSynced(next); // our own write is not an outside change
    const named = current && normalizeHex(current.label) !== current.color;
    onWrite([{ ...(current ?? {}), label: named ? current!.label : next, color: next }]);
  };
  const setChannel = (i: number, v: number) => {
    const next = [...rgb] as [number, number, number];
    next[i] = v;
    commit(rgbToHex(next as Rgb));
  };

  if (!open) {
    return (
      <button type="button" className="link-button custom-color__open" onClick={() => setOpen(true)} data-testid={`custom-color-open-${attribute.id}`}>
        {c.open}
      </button>
    );
  }
  return (
    <fieldset className="custom-color" data-testid={`custom-color-${attribute.id}`}>
      <legend>{fmt(c.title, { label })}</legend>
      <div className="custom-color__body">
        <div className="custom-color__preview" aria-live="polite">
          <span className="custom-color__swatch" style={{ background: hex }} data-testid={`custom-color-preview-${attribute.id}`} />
          <span className="small">
            <strong>{hex}</strong> · RGB {rgb.join(", ")}
            {near && (
              <>
                <br />
                <span className="muted">{fmt(c.nearest, { name: resolveText(near.label, locale) })}</span>
              </>
            )}
          </span>
        </div>
        <div className="custom-color__inputs">
          <label className="custom-color__row">
            <span>{c.picker}</span>
            <input type="color" value={hex.toLowerCase()} onChange={(e) => commit(normalizeHex(e.target.value)!)} data-testid={`custom-color-picker-${attribute.id}`} />
          </label>
          <label className="custom-color__row" htmlFor={`${ids}-hex`}>
            <span>HEX</span>
          </label>
          <input
            id={`${ids}-hex`}
            className="text-input custom-color__hex"
            type="text"
            inputMode="text"
            spellCheck={false}
            autoComplete="off"
            value={hexText}
            aria-invalid={showHexError || undefined}
            aria-describedby={showHexError ? `${ids}-err` : undefined}
            onChange={(e) => {
              setHexText(e.target.value);
              setHexLeft(false);
              // while typing, only a full #RRGGBB is applied (a 3-digit prefix of it is not a color yet)
              if (/^#?[0-9a-fA-F]{6}$/.test(e.target.value.trim())) commit(normalizeHex(e.target.value)!, true);
            }}
            onBlur={() => {
              setHexLeft(true);
              const n = normalizeHex(hexText);
              // apply only a real change (also the #RGB shorthand); leaving an untouched field stores nothing
              if (n && n !== hex) commit(n);
              else if (n) setHexText(n);
            }}
            data-testid={`custom-color-hex-${attribute.id}`}
          />
          {showHexError && (
            <p id={`${ids}-err`} className="field__error small" role="alert" data-testid={`custom-color-error-${attribute.id}`}>
              {c.invalid}
            </p>
          )}
          {CHANNELS.map((ch, i) => (
            <div key={ch} className="custom-color__channel">
              <label htmlFor={`${ids}-${ch}`}>{c.channels[ch]}</label>
              <input
                id={`${ids}-${ch}`}
                type="range"
                min={0}
                max={255}
                value={rgb[i]}
                onChange={(e) => setChannel(i, Number(e.target.value))}
                data-testid={`custom-color-${ch}-range-${attribute.id}`}
              />
              <input
                type="number"
                min={0}
                max={255}
                value={rgb[i]}
                aria-label={`${c.channels[ch]} (0–255)`}
                onChange={(e) => e.target.value !== "" && setChannel(i, Number(e.target.value))}
                data-testid={`custom-color-${ch}-${attribute.id}`}
              />
            </div>
          ))}
        </div>
      </div>
      <p className="muted small">{c.note}</p>
      <div className="toolbar">
        {isMulti ? (
          <button type="button" className="button button--small" disabled={duplicate} onClick={() => onWrite([...entries, { label: hex, color: hex }])} data-testid={`custom-color-add-${attribute.id}`}>
            {duplicate ? c.added : fmt(c.add, { hex })}
          </button>
        ) : (
          current && (
            <button type="button" className="button button--small" onClick={() => onWrite(entries.filter((e) => e !== current))} data-testid={`custom-color-clear-${attribute.id}`}>
              {c.clear}
            </button>
          )
        )}
        <button type="button" className="link-button" onClick={() => setOpen(false)}>
          {c.close}
        </button>
      </div>
    </fieldset>
  );
}
