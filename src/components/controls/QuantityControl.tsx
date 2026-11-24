"use client";

import { useId, useState } from "react";
import { resolveText, type QuantityAttributeDefinition, type SelectionValue } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";

type Saved = Extract<SelectionValue, { kind: "number" | "range" }> | undefined;

const toDraft = (v: Saved) => ({
  form: v?.kind ?? null,
  unit: v?.unit ?? null,
  a: v ? String(v.kind === "number" ? v.value : v.min) : "",
  b: v?.kind === "range" ? String(v.max) : "",
});
const keyOf = (v: Saved) => (v ? JSON.stringify(v) : "");

/**
 * Number OR complete range with an explicit unit (quantity attributes).
 * Draft and saved values are separate: nothing is stored until the input is a
 * valid whole value (both range ends, in bounds, integer when required). The
 * displayed form/unit are never stored on their own; the unit is stored only
 * together with a number the user entered.
 */
export function QuantityControl({
  attribute,
  value,
  label,
  locale,
  t,
  onSet,
  onClear,
}: {
  attribute: QuantityAttributeDefinition;
  value: Saved;
  label: string;
  locale: string;
  t: Messages;
  onSet(v: SelectionValue): void;
  onClear(): void;
}) {
  const savedKey = keyOf(value);
  const [synced, setSynced] = useState(savedKey);
  const [draft, setDraft] = useState(() => toDraft(value));
  if (synced !== savedKey) {
    // external change (import, undo, clear, reset): adopt it
    setSynced(savedKey);
    setDraft(toDraft(value));
  }
  const errId = useId();
  const form = draft.form ?? attribute.forms[0]!;
  const unit = draft.unit ?? attribute.units[0]!.id;
  const max = attribute.max ?? Number.POSITIVE_INFINITY;

  const parse = (s: string): number | null => {
    if (s.trim() === "") return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < attribute.min || n > max || (attribute.integer && !Number.isInteger(n))) return NaN;
    return n;
  };
  const a = parse(draft.a);
  const b = parse(draft.b);
  const invalid = Number.isNaN(a) || Number.isNaN(b) || (form === "range" && a !== null && b !== null && !Number.isNaN(a) && !Number.isNaN(b) && a > b);
  const incomplete = form === "range" && (a === null) !== (b === null);

  const commit = (next: typeof draft) => {
    setDraft(next);
    const f = next.form ?? attribute.forms[0]!;
    const u = next.unit ?? attribute.units[0]!.id;
    const x = parse(next.a);
    const y = parse(next.b);
    if (f === "number") {
      if (x === null) return value ? onClear() : undefined;
      if (!Number.isNaN(x)) onSet({ kind: "number", value: x, unit: u });
      return;
    }
    if (x === null && y === null) return value ? onClear() : undefined;
    if (x !== null && y !== null && !Number.isNaN(x) && !Number.isNaN(y) && x <= y) onSet({ kind: "range", min: x, max: y, unit: u });
  };

  const numberInput = (which: "a" | "b", aria: string) => (
    <input
      type="number"
      inputMode="numeric"
      aria-label={aria}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errId : undefined}
      min={attribute.min}
      max={attribute.max}
      step={attribute.integer ? 1 : "any"}
      value={draft[which]}
      onChange={(e) => commit({ ...draft, form, unit, [which]: e.target.value })}
    />
  );

  return (
    <div className="quantity-control" data-testid={`quantity-${attribute.id}`}>
      {attribute.forms.length > 1 && (
        <div className="segmented" role="radiogroup" aria-label={fmt(t.controls.quantityForm, { label })}>
          {attribute.forms.map((f) => (
            <label key={f} className="segmented__item" data-checked={form === f}>
              <input type="radio" name={`${attribute.id}-form`} checked={form === f} onChange={() => setDraft({ ...draft, form: f, unit, b: f === "number" ? "" : draft.b })} />
              {f === "number" ? t.controls.quantityNumber : t.controls.quantityRange}
            </label>
          ))}
        </div>
      )}
      <div className="quantity-control__inputs">
        {form === "number" ? (
          numberInput("a", label)
        ) : (
          <>
            {numberInput("a", `${label} ${t.controls.rangeMin}`)}
            <span aria-hidden="true">–</span>
            {numberInput("b", `${label} ${t.controls.rangeMax}`)}
          </>
        )}
        <select aria-label={fmt(t.controls.quantityUnit, { label })} value={unit} onChange={(e) => commit({ ...draft, form, unit: e.target.value })}>
          {attribute.units.map((u) => (
            <option key={u.id} value={u.id}>
              {resolveText(u.label, locale)}
            </option>
          ))}
        </select>
      </div>
      {incomplete && (
        <span className="muted small" data-testid={`range-hint-${attribute.id}`}>
          {t.controls.rangeIncomplete}
        </span>
      )}
      {invalid && (
        <span id={errId} role="alert" className="field-error small">
          {fmt(attribute.integer ? t.controls.quantityInvalidInt : t.controls.quantityInvalid, { min: attribute.min })}
        </span>
      )}
      {value && (incomplete || invalid || form !== value.kind) && (
        <span className="muted small">{fmt(t.controls.quantitySavedStill, { value: `${value.kind === "number" ? value.value : `${value.min}–${value.max}`} ${resolveText(attribute.units.find((u) => u.id === value.unit)?.label, locale)}` })}</span>
      )}
    </div>
  );
}
