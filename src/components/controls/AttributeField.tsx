"use client";

import { useId, type ReactNode } from "react";
import { resolveText, type AttributeDefinition, type AttributeSelection, type SelectionValue } from "@/domain";
import type { Messages } from "@/i18n/messages";
import { describeValue } from "../format";

export interface AttributeFieldProps {
  attribute: AttributeDefinition;
  selection: AttributeSelection | undefined;
  active: boolean;
  locale: string;
  t: Messages;
  onSet(value: SelectionValue): void;
  onClear(): void;
}

/**
 * Generic control renderer. It is driven entirely by the AttributeDefinition,
 * so new attributes/options in the catalog appear without UI code changes.
 * Only a brand-new attribute *type* needs a new branch here.
 */
export function AttributeField(props: AttributeFieldProps) {
  const { attribute, selection, active, locale, t, onSet, onClear } = props;
  const headingId = useId();
  const label = resolveText(attribute.label, locale);
  const description = resolveText(attribute.description, locale);
  const isSet = selection !== undefined;

  return (
    <section className="field" aria-labelledby={headingId} data-attribute-id={attribute.id} data-state={isSet ? "set" : "unset"}>
      <header className="field__header">
        <h3 id={headingId} className="field__label">
          {label}
        </h3>
        <span className={`badge ${isSet ? "badge--set" : "badge--unset"}`}>{isSet ? t.field.set : t.field.notSet}</span>
        {isSet && (
          <button type="button" className="link-button" onClick={onClear} aria-label={`${t.field.clear}: ${label}`}>
            {t.field.clear}
          </button>
        )}
      </header>
      {description && <p className="field__description">{description}</p>}
      {isSet && !active && <p className="field__inactive">{t.field.inactive}</p>}
      <Control {...props} label={label} />
      {!isSet && attribute.defaultValue && (
        <button type="button" className="link-button" onClick={() => onSet(attribute.defaultValue!)}>
          {t.field.useDefault}: {describeValue(attribute, attribute.defaultValue, locale)}
        </button>
      )}
    </section>
  );
}

function Control({ attribute, selection, locale, t, onSet, onClear, label }: AttributeFieldProps & { label: string }): ReactNode {
  const value = selection?.value;
  switch (attribute.type) {
    case "single": {
      const current = value?.kind === "single" ? value.optionId : undefined;
      return (
        <div role="radiogroup" aria-label={label} className="chips">
          {attribute.options.map((o) => (
            <label key={o.id} className={`chip ${o.parentId ? "chip--child" : ""}`} data-checked={current === o.id}>
              <input
                type="radio"
                name={attribute.id}
                value={o.id}
                checked={current === o.id}
                onChange={() => onSet({ kind: "single", optionId: o.id })}
              />
              <span>{resolveText(o.label, locale)}</span>
            </label>
          ))}
        </div>
      );
    }
    case "multi": {
      const current = value?.kind === "multi" ? value.optionIds : [];
      const toggle = (id: string) => {
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        if (next.length === 0) onClear();
        else onSet({ kind: "multi", optionIds: next });
      };
      return (
        <div role="group" aria-label={label} className="chips">
          {attribute.options.map((o) => (
            <label key={o.id} className={`chip ${o.parentId ? "chip--child" : ""}`} data-checked={current.includes(o.id)}>
              <input type="checkbox" value={o.id} checked={current.includes(o.id)} onChange={() => toggle(o.id)} />
              <span>{resolveText(o.label, locale)}</span>
            </label>
          ))}
        </div>
      );
    }
    case "text": {
      const text = value?.kind === "text" ? value.text : "";
      return (
        <div className="text-control">
          <textarea
            aria-label={label}
            value={text}
            maxLength={attribute.maxLength}
            rows={3}
            placeholder={resolveText(attribute.placeholder, locale)}
            onChange={(e) => onSet({ kind: "text", text: e.target.value })}
          />
          <span className="counter">
            {text.length} / {attribute.maxLength} {t.field.chars}
          </span>
        </div>
      );
    }
    case "number": {
      const n = value?.kind === "number" ? value.value : "";
      return (
        <input
          type="number"
          aria-label={label}
          min={attribute.min}
          max={attribute.max}
          step={attribute.step}
          value={n}
          onChange={(e) => {
            if (e.target.value === "") return onClear();
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onSet({ kind: "number", value: v });
          }}
        />
      );
    }
    case "range": {
      const r = value?.kind === "range" ? value : { min: attribute.min, max: attribute.max };
      const update = (patch: Partial<{ min: number; max: number }>) => {
        const next = { ...r, ...patch };
        if (Number.isFinite(next.min) && Number.isFinite(next.max) && next.min <= next.max) {
          onSet({ kind: "range", min: next.min, max: next.max });
        }
      };
      return (
        <div className="range-control">
          <input type="number" aria-label={`${label} min`} min={attribute.min} max={attribute.max} step={attribute.step} value={r.min} onChange={(e) => update({ min: Number(e.target.value) })} />
          <span>–</span>
          <input type="number" aria-label={`${label} max`} min={attribute.min} max={attribute.max} step={attribute.step} value={r.max} onChange={(e) => update({ max: Number(e.target.value) })} />
        </div>
      );
    }
  }
}
