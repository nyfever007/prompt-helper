"use client";

import { useId, type ReactNode } from "react";
import {
  defaultControl,
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
import {
  CardsControl,
  ColorControl,
  DropdownControl,
  NumberInputControl,
  RangeControl,
  RestrictedNote,
  SearchableListControl,
  SliderControl,
  type OptionControlProps,
} from "./Controls";
import { OptionPicker } from "./OptionPicker";

export interface AttributeFieldProps {
  registry: CatalogRegistry;
  attribute: AttributeDefinition;
  selection: AttributeSelection | undefined;
  /** Attribute-level applicability. */
  active: boolean;
  isOptionActive(option: OptionDefinition): boolean;
  isOptionRestricted(option: OptionDefinition): boolean;
  /** Diagnostics that concern this attribute (rules, safety, language…). */
  diagnostics: Diagnostic[];
  /** The prompt text this attribute currently contributes, if any. */
  fragment: PromptFragment | undefined;
  /** Preset phrases whose units this attribute takes over (it states that meaning instead). */
  takeovers: Array<{ presetAttributeId: string; relation: "equivalent" | "override" }>;
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
 * Generic field. Driven entirely by the AttributeDefinition: the data type
 * says WHAT is stored; `control` says HOW it is shown. New attributes/options
 * appear without UI code changes; only a new control kind needs a branch.
 */
export function AttributeField(props: AttributeFieldProps) {
  const { registry, attribute, selection, active, isOptionActive, isOptionRestricted, diagnostics, fragment, locale, t, onSet, onClear } = props;
  const headingId = useId();
  const label = resolveText(attribute.label, locale);
  const description = resolveText(attribute.description, locale);
  const isSet = selection !== undefined;

  const selectedIds =
    selection?.value.kind === "single" ? [selection.value.optionId] : selection?.value.kind === "multi" ? selection.value.optionIds : [];
  const selectedOptions = isOptionAttribute(attribute) ? attribute.options.filter((o) => selectedIds.includes(o.id)) : [];
  const inactiveOptions = active ? selectedOptions.filter((o) => !isOptionActive(o)) : [];
  const classified = selectedOptions.filter((o) => o.classification && Object.keys(o.classification).length > 0);
  const restrictedOptions = isOptionAttribute(attribute) ? attribute.options.filter((o) => isOptionRestricted(o)) : [];
  const presetName = selection?.origin ? resolveText(registry.getPreset(selection.origin.presetId)?.label, locale) || selection.origin.presetId : null;

  return (
    <section
      className="field"
      id={`attr-${attribute.id}`}
      aria-labelledby={headingId}
      data-attribute-id={attribute.id}
      data-state={isSet ? "set" : "unset"}
      data-active={active && inactiveOptions.length === 0 ? "true" : "false"}
      tabIndex={-1}
    >
      <header className="field__header">
        <h3 id={headingId} className="field__label">
          {label}
        </h3>
        <span className={`badge ${isSet ? "badge--set" : "badge--unset"}`}>{isSet ? t.field.set : t.field.notSet}</span>
        {presetName && <span className="badge badge--preset">{fmt(t.detailed.fromPreset, { name: presetName })}</span>}
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
      <RestrictedNote options={restrictedOptions} locale={locale} t={t} />

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
                {desc.terms && <span className="muted small"> ({desc.terms})</span>}
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
        <div className="field__provenance small" data-testid={`provenance-${attribute.id}`}>
          {fragment ? (
            <p>
              <span className="muted">{t.field.contributes}:</span> <code lang="en">{fragment.text}</code>
            </p>
          ) : props.outputBlocked ? (
            <p className="diag--error">{t.field.blockedProvenance}</p>
          ) : (
            <p className="muted">{t.field.notInPrompt}</p>
          )}
          {fragment?.takenOverBy && fragment.takenOverBy.length > 0 && (
            <p className="muted">
              {fmt(t.detailed.presetPartsReplaced, { labels: fragment.takenOverBy.map((x) => attributeLabel(registry, x.attributeId, locale)).join(", ") })}
            </p>
          )}
          {fragment &&
            props.takeovers.map((x) => (
              <p key={x.presetAttributeId} className="muted" data-testid={`takeover-${attribute.id}`}>
                {fmt(x.relation === "equivalent" ? t.detailed.takenOverEquivalent : t.detailed.takenOverOverride, {
                  preset: attributeLabel(registry, x.presetAttributeId, locale),
                })}
              </p>
            ))}
        </div>
      )}
    </section>
  );
}

function Control(props: AttributeFieldProps & { label: string; selectedIds: readonly string[] }): ReactNode {
  const { attribute, selection, isOptionActive, isOptionRestricted, locale, t, onSet, onClear, label, selectedIds } = props;
  const value = selection?.value;
  const control = defaultControl(attribute);

  if (attribute.type === "single" || attribute.type === "multi") {
    const optionProps: OptionControlProps = {
      attribute,
      label,
      selectedIds,
      isActive: isOptionActive,
      isRestricted: isOptionRestricted,
      locale,
      t,
      onSelect: (optionId) => onSet({ kind: "single", optionId }),
      onToggle: (optionId) => {
        const next = selectedIds.includes(optionId) ? selectedIds.filter((x) => x !== optionId) : [...selectedIds, optionId];
        if (next.length === 0) onClear();
        else onSet({ kind: "multi", optionIds: next });
      },
      onClear,
    };
    switch (control) {
      case "dropdown":
        return <DropdownControl {...optionProps} />;
      case "cards":
        return <CardsControl {...optionProps} />;
      case "searchable":
        return <SearchableListControl {...optionProps} />;
      case "color":
        return <ColorControl {...optionProps} />;
      default:
        return (
          <OptionPicker
            attribute={attribute}
            label={label}
            selectedIds={selectedIds}
            isActive={isOptionActive}
            isRestricted={isOptionRestricted}
            locale={locale}
            t={t}
            onSelect={optionProps.onSelect}
            onToggle={optionProps.onToggle}
          />
        );
    }
  }

  if (attribute.type === "number") {
    const n = value?.kind === "number" ? value.value : undefined;
    return control === "slider" ? (
      <SliderControl attribute={attribute} value={n} label={label} locale={locale} t={t} onSet={onSet} />
    ) : (
      <NumberInputControl attribute={attribute} value={n} label={label} t={t} onSet={onSet} onClear={onClear} />
    );
  }

  if (attribute.type === "range") {
    const r = value?.kind === "range" ? { min: value.min, max: value.max } : undefined;
    return <RangeControl attribute={attribute} value={r} label={label} t={t} onSet={onSet} onClear={onClear} />;
  }

  const text = value?.kind === "text" ? value.text : "";
  if (control === "text") {
    return (
      <input
        type="text"
        className="text-input"
        aria-label={label}
        value={text}
        maxLength={attribute.maxLength}
        placeholder={resolveText(attribute.placeholder, locale)}
        onChange={(e) => onSet({ kind: "text", text: e.target.value })}
      />
    );
  }
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
