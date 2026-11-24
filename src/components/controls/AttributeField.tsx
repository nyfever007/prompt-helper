"use client";

import { useId, type ReactNode } from "react";
import {
  isOptionAttribute,
  resolveText,
  type AttributeDefinition,
  type AttributeSelection,
  type CatalogRegistry,
  type Diagnostic,
  type OptionDefinition,
  type PromptFragment,
  type SelectionValue,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { describeDiagnostic } from "../diagnostics";
import { attributeLabel, describeValue, optionLabel } from "../format";
import { OptionPicker } from "./OptionPicker";

export interface AttributeFieldProps {
  registry: CatalogRegistry;
  attribute: AttributeDefinition;
  selection: AttributeSelection | undefined;
  /** Attribute-level applicability. */
  active: boolean;
  isOptionActive(option: OptionDefinition): boolean;
  /** Diagnostics that concern this attribute (rules, safety, language…). */
  diagnostics: Diagnostic[];
  /** The prompt text this attribute currently contributes, if any. */
  fragment: PromptFragment | undefined;
  /** True when the whole prompt output is withheld by the safety policy. */
  outputBlocked: boolean;
  locale: string;
  t: Messages;
  onSet(value: SelectionValue): void;
  onClear(): void;
  /** For rule actions that clear another attribute (always user-triggered). */
  onClearAttribute(attributeId: string): void;
  isAttributeSet(attributeId: string): boolean;
}

/**
 * Generic control renderer. Driven entirely by the AttributeDefinition, so new
 * attributes/options in the catalog appear without UI code changes. Only a
 * brand-new attribute *type* needs a new branch here.
 */
export function AttributeField(props: AttributeFieldProps) {
  const { registry, attribute, selection, active, isOptionActive, diagnostics, fragment, locale, t, onSet, onClear } = props;
  const headingId = useId();
  const label = resolveText(attribute.label, locale);
  const description = resolveText(attribute.description, locale);
  const isSet = selection !== undefined;

  const selectedIds =
    selection?.value.kind === "single" ? [selection.value.optionId] : selection?.value.kind === "multi" ? selection.value.optionIds : [];
  const selectedOptions = isOptionAttribute(attribute) ? attribute.options.filter((o) => selectedIds.includes(o.id)) : [];
  const inactiveOptions = active ? selectedOptions.filter((o) => !isOptionActive(o)) : [];
  const classified = selectedOptions.filter((o) => o.classification && Object.keys(o.classification).length > 0);

  return (
    <section
      className="field"
      aria-labelledby={headingId}
      data-attribute-id={attribute.id}
      data-state={isSet ? "set" : "unset"}
      data-active={active && inactiveOptions.length === 0 ? "true" : "false"}
    >
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
      {inactiveOptions.length > 0 && (
        <p className="field__inactive">
          {fmt(t.field.optionInactive, { options: inactiveOptions.map((o) => resolveText(o.label, locale)).join(", ") })}
        </p>
      )}

      <Control {...props} label={label} selectedIds={selectedIds} />

      {!isSet && attribute.defaultValue && (
        <button type="button" className="link-button" onClick={() => onSet(attribute.defaultValue!)}>
          {t.field.useDefault}: {describeValue(attribute, attribute.defaultValue, locale)}
        </button>
      )}

      {classified.length > 0 && (
        <div className="classification" data-testid={`classification-${attribute.id}`}>
          <p className="muted small">{fmt(t.field.presetScope, { label })}</p>
          <p className="small">{t.field.classification}</p>
          <ul>
            {classified.flatMap((o) =>
              Object.entries(o.classification!).map(([axisId, values]) => (
                <li key={`${o.id}-${axisId}`}>
                  <span className="muted">{attributeLabel(registry, axisId, locale)}:</span>{" "}
                  {values.map((v) => optionLabel(registry, axisId, v, locale)).join(", ")}
                </li>
              )),
            )}
          </ul>
        </div>
      )}

      {diagnostics.length > 0 && (
        <ul className="field__diagnostics">
          {diagnostics.map((d, i) => {
            const desc = describeDiagnostic(d, { registry, locale, t });
            return (
              <li key={`${d.code}-${i}`} className={`diag diag--${d.severity}`} data-code={d.code}>
                <span>{desc.text}</span>
                {desc.terms && (
                  <span className="muted small"> ({desc.terms})</span>
                )}
                {desc.guidance && (
                  <span className="diag__guidance">
                    <strong>{t.field.guidance}:</strong> {desc.guidance}
                  </span>
                )}
                {desc.actions && desc.actions.length > 0 && (
                  <span className="diag__actions">
                    {desc.actions
                      .filter((a) => props.isAttributeSet(a.attributeId))
                      .map((a) => (
                        <button key={a.attributeId} type="button" className="button button--small" onClick={() => props.onClearAttribute(a.attributeId)}>
                          {fmt(t.field.clearOther, { label: attributeLabel(registry, a.attributeId, locale) })}
                        </button>
                      ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isSet && (
        <p className="field__provenance small" data-testid={`provenance-${attribute.id}`}>
          {fragment ? (
            <>
              <span className="muted">{t.field.contributes}:</span> <code lang="en">{fragment.text}</code>
            </>
          ) : props.outputBlocked ? (
            <span className="diag--error">{t.field.blockedProvenance}</span>
          ) : (
            <span className="muted">{t.field.notInPrompt}</span>
          )}
        </p>
      )}
    </section>
  );
}

function Control({
  attribute,
  selection,
  isOptionActive,
  locale,
  t,
  onSet,
  onClear,
  label,
  selectedIds,
}: AttributeFieldProps & { label: string; selectedIds: readonly string[] }): ReactNode {
  const value = selection?.value;
  switch (attribute.type) {
    case "single":
    case "multi":
      return (
        <OptionPicker
          attribute={attribute}
          label={label}
          selectedIds={selectedIds}
          isActive={isOptionActive}
          locale={locale}
          t={t}
          onSelect={(optionId) => onSet({ kind: "single", optionId })}
          onToggle={(optionId) => {
            const next = selectedIds.includes(optionId) ? selectedIds.filter((x) => x !== optionId) : [...selectedIds, optionId];
            if (next.length === 0) onClear();
            else onSet({ kind: "multi", optionIds: next });
          }}
        />
      );
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
