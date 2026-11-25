"use client";

import { useId, useState, type ReactNode } from "react";
import {
  customKey,
  defaultControl,
  isOptionAttribute,
  resolveText,
  selectedCustomEntries,
  isRandomSelection,
  selectedOptionIds,
  type AgeClass,
  type AttributeDefinition,
  type AttributeSelection,
  type CatalogRegistry,
  type CustomEntry,
  type Diagnostic,
  type OptionDefinition,
  type PromptFragment,
  type SelectionValue,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { describeDiagnostic } from "../diagnostics";
import { RelatedSettings } from "../RelatedSettings";
import { attributeLabel, describeValue, optionLabel, presetLabel } from "../format";
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
import { CustomEntries } from "./CustomEntries";
import { OptionPicker } from "./OptionPicker";
import { QuantityControl } from "./QuantityControl";

export interface AttributeFieldProps {
  registry: CatalogRegistry;
  attribute: AttributeDefinition;
  selection: AttributeSelection | undefined;
  /** Attribute-level applicability. */
  active: boolean;
  isOptionActive(option: OptionDefinition): boolean;
  isOptionRestricted(option: OptionDefinition): boolean;
  /** Typical in the current context (UI ordering only). */
  isOptionSuggested?(option: OptionDefinition): boolean;
  /** Diagnostics that concern this attribute (rules, safety, language…). */
  diagnostics: Diagnostic[];
  /** The prompt text this attribute currently contributes, if any. */
  fragment: PromptFragment | undefined;
  /** Preset phrases whose units this attribute takes over (it states that meaning instead). */
  takeovers: Array<{ presetAttributeId: string; relation: "equivalent" | "override" }>;
  /** Another produced option already states this attribute's meaning (output once). */
  coveredBy?: { attributeId: string; optionIds: string[] };
  /** Structured age assessment (explains conditional wording). */
  ageClass?: AgeClass;
  /** True when the whole prompt output is withheld by the safety policy. */
  outputBlocked: boolean;
  locale: string;
  t: Messages;
  onSet(value: SelectionValue): void;
  onClear(): void;
  /** Include/exclude from the prompt (only offered when the catalog enables the toggle). */
  onSetExcluded?(excluded: boolean): void;
  /** For rule actions that clear another attribute (always user-triggered). */
  onClearAttribute(attributeId: string): void;
  isAttributeSet(attributeId: string): boolean;
  /** Optional visual next to the control (e.g. the live face-sketch preview of a relative slider). */
  visual?: ReactNode;
  /** Sprint 3.1: the value is locked — editing and clearing wait until it is unlocked. */
  locked?: boolean;
  /** Lock / unlock (offered when the attribute is set). */
  onToggleLock?(locked: boolean): void;
  /** Rule actions never clear a locked attribute. */
  isAttributeLocked?(attributeId: string): boolean;
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
  const excluded = Boolean(selection?.excludedFromPrompt);
  const locked = isSet && Boolean(props.locked);
  const [addRequest, setAddRequest] = useState<{ name: string; n: number } | null>(null);

  const selectedIds = selectedOptionIds(selection?.value);
  const custom = selectedCustomEntries(selection?.value);
  const selectedOptions = isOptionAttribute(attribute) ? attribute.options.filter((o) => selectedIds.includes(o.id)) : [];
  const inactiveOptions = active ? selectedOptions.filter((o) => !isOptionActive(o)) : [];
  const classified = selectedOptions.filter((o) => o.classification && Object.keys(o.classification).length > 0);
  const restrictedOptions = isOptionAttribute(attribute) ? attribute.options.filter((o) => isOptionRestricted(o)) : [];
  const randomValue = isRandomSelection(selection);
  const presetName = selection?.origin && !randomValue ? presetLabel(registry, selection.origin.presetId, locale, t.random.name) : null;
  const variantOptions = selectedOptions.filter((o) => o.prompt.variants?.length);

  // Option values with custom entries: every edit keeps the other part of the value.
  const writeOptions = (ids: string[], entries: CustomEntry[]) => {
    if (attribute.type === "single") {
      if (entries[0]) onSet({ kind: "single", custom: entries[0] });
      else if (ids[0]) onSet({ kind: "single", optionId: ids[0] });
      else onClear();
      return;
    }
    if (ids.length === 0 && entries.length === 0) return onClear();
    onSet({ kind: "multi", optionIds: ids, ...(entries.length ? { custom: entries } : {}) });
  };
  const customOps = isOptionAttribute(attribute) && attribute.custom
    ? {
        add: (e: CustomEntry) => (attribute.type === "single" ? writeOptions([], [e]) : custom.some((c) => customKey(c.label) === customKey(e.label)) ? undefined : writeOptions(selectedIds, [...custom, e])),
        update: (i: number, e: CustomEntry) => writeOptions(selectedIds, custom.map((c, j) => (j === i ? e : c))),
        remove: (i: number) => writeOptions(selectedIds, custom.filter((_, j) => j !== i)),
        pick: (optionId: string) => (attribute.type === "single" ? writeOptions([optionId], []) : writeOptions(selectedIds.includes(optionId) ? selectedIds : [...selectedIds, optionId], custom)),
      }
    : null;

  return (
    <section
      className="field"
      id={`attr-${attribute.id}`}
      aria-labelledby={headingId}
      data-attribute-id={attribute.id}
      data-state={isSet ? (excluded ? "excluded" : "set") : "unset"}
      data-active={active && inactiveOptions.length === 0 ? "true" : "false"}
      data-locked={locked ? "true" : undefined}
      tabIndex={-1}
    >
      <header className="field__header">
        <h3 id={headingId} className="field__label">
          {label}
        </h3>
        <span className={`badge ${isSet ? (excluded ? "badge--excluded" : "badge--set") : "badge--unset"}`} data-testid={`state-${attribute.id}`}>
          {isSet ? (excluded ? t.field.excludedBadge : t.field.set) : t.field.notSet}
        </span>
        {presetName && <span className="badge badge--preset">{fmt(t.detailed.fromPreset, { name: presetName })}</span>}
        {randomValue && (
          <span className="badge badge--random" data-testid={`random-${attribute.id}`}>
            {t.random.badge}
          </span>
        )}
        {/* Sprint 2-C.1: include/exclude and clear sit together in the header, next to the state. */}
        {attribute.outputToggle && isSet && props.onSetExcluded && (
          <label className="output-toggle" data-testid={`output-toggle-${attribute.id}`}>
            <input type="checkbox" role="switch" checked={!excluded} aria-checked={!excluded} onChange={(e) => props.onSetExcluded!(!e.target.checked)} />
            <span>{t.field.includeInPrompt}</span>
          </label>
        )}
        {isSet && props.onToggleLock && (
          <button
            type="button"
            className={`lock-toggle${locked ? " is-locked" : ""}`}
            aria-pressed={locked}
            aria-label={`${t.lock.lock}: ${label}`}
            onClick={() => props.onToggleLock!(!locked)}
            data-testid={`lock-${attribute.id}`}
          >
            <span aria-hidden="true">{locked ? "🔒" : "🔓"}</span> {locked ? t.lock.locked : t.lock.lock}
          </button>
        )}
        {isSet && (
          <button type="button" className="link-button field__clear" onClick={onClear} aria-label={`${t.field.clear}: ${label}`} disabled={locked}>
            {t.field.clear}
          </button>
        )}
      </header>
      {locked && (
        <p className="field__locked small" data-testid={`locked-note-${attribute.id}`}>
          {t.lock.note}
        </p>
      )}
      {excluded && <p className="muted small field__excluded">{t.field.excludedHint}</p>}
      {description && <p className="field__description">{description}</p>}
      {isSet && !active && <p className="field__inactive">{t.field.inactive}</p>}
      {inactiveOptions.length > 0 && (
        <p className="field__inactive">
          {fmt(t.field.optionInactive, { options: inactiveOptions.map((o) => resolveText(o.label, locale)).join(", ") })}
        </p>
      )}

      <fieldset className="field__lockable" disabled={locked}>
      {(() => {
        const control = (
          <Control
            {...props}
            label={label}
            selectedIds={selectedIds}
            customEntries={custom}
            onAddCustomRequest={customOps ? (name) => setAddRequest({ name, n: (addRequest?.n ?? 0) + 1 }) : undefined}
          />
        );
        return props.visual ? (
          <div className="field__with-visual">
            <div className="field__control">{control}</div>
            {props.visual}
          </div>
        ) : (
          control
        );
      })()}
      <RestrictedNote options={restrictedOptions} locale={locale} t={t} />

      {customOps && isOptionAttribute(attribute) && (
        <CustomEntries
          attribute={attribute}
          entries={custom}
          label={label}
          locale={locale}
          t={t}
          onAdd={customOps.add}
          onUpdate={customOps.update}
          onRemove={customOps.remove}
          onPickRegistered={customOps.pick}
          addRequest={addRequest}
        />
      )}

      {!isSet && attribute.defaultValue && (
        <button type="button" className="link-button" onClick={() => onSet(attribute.defaultValue!)}>
          {t.field.useDefault}: {describeValue(attribute, attribute.defaultValue, locale)}
        </button>
      )}
      </fieldset>

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
            const basis = d.code.startsWith("rule.") ? (d.params?.basis as "contradiction" | "convention" | undefined) : undefined;
            // TD-10: the other settings this notice is about, with their page, so they are easy to find.
            // Safety findings that are resolved elsewhere (e.g. the age settings) name those settings (Sprint 2-C.3).
            const related = d.code.startsWith("rule.")
              ? (d.involves ?? []).filter((id) => id !== attribute.id)
              : String(d.params?.relatedAttributes ?? "").split(",").filter((id) => id && id !== attribute.id);
            return (
              <li key={`${d.code}-${i}`} className={`diag diag--${d.severity}`} data-code={d.code} data-basis={basis}>
                {basis && <span className={`diag__basis diag__basis--${basis}`}>{t.field.basis[basis]}</span>}
                <span>{desc.text}</span>
                <RelatedSettings ids={related} registry={registry} locale={locale} t={t} />
                {desc.terms && <span className="muted small"> ({desc.terms})</span>}
                {desc.guidance && (
                  <span className="diag__guidance">
                    <strong>{t.field.guidance}:</strong> {desc.guidance}
                  </span>
                )}
                {desc.actions && desc.actions.length > 0 && (
                  <span className="diag__actions">
                    {desc.actions
                      .filter((a) => props.isAttributeSet(a.attributeId) && !props.isAttributeLocked?.(a.attributeId))
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
          ) : excluded ? (
            <p className="muted">{t.field.notInPromptExcluded}</p>
          ) : attribute.expression?.role === "metadata" ? (
            <p className="muted">{t.field.notInPromptMetadata}</p>
          ) : props.coveredBy ? (
            <p className="muted" data-testid={`covered-${attribute.id}`}>
              {fmt(t.field.coveredBy, {
                label: attributeLabel(registry, props.coveredBy.attributeId, locale),
                options: props.coveredBy.optionIds.map((id) => optionLabel(registry, props.coveredBy!.attributeId, id, locale)).join(", "),
              })}
            </p>
          ) : (
            <p className="muted">{t.field.notInPrompt}</p>
          )}
          {fragment && variantOptions.length > 0 && props.ageClass && (
            <p className="muted" data-testid={`variant-${attribute.id}`}>
              {fmt(t.field.variantNote, { age: t.ageClass[props.ageClass] })}
            </p>
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

function Control(
  props: AttributeFieldProps & {
    label: string;
    selectedIds: readonly string[];
    customEntries: readonly CustomEntry[];
    onAddCustomRequest: ((name: string) => void) | undefined;
  },
): ReactNode {
  const { attribute, selection, isOptionActive, isOptionRestricted, locale, t, onSet, onClear, label, selectedIds, customEntries } = props;
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
        // Custom entries are part of the same value and are kept.
        if (next.length === 0 && customEntries.length === 0) onClear();
        else onSet({ kind: "multi", optionIds: next, ...(customEntries.length ? { custom: [...customEntries] } : {}) });
      },
      onClear,
      ...(props.isOptionSuggested ? { isSuggested: props.isOptionSuggested } : {}),
      ...(props.onAddCustomRequest ? { onAddCustomRequest: props.onAddCustomRequest, customLabels: customEntries.map((c) => c.label) } : {}),
    };
    switch (control) {
      case "dropdown": {
        const selected = attribute.options.find((o) => o.id === selectedIds[0]);
        return (
          <>
            <DropdownControl {...optionProps} />
            {selected?.description && <p className="muted small">{resolveText(selected.description, locale)}</p>}
          </>
        );
      }
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

  if (attribute.type === "quantity") {
    const v = value?.kind === "number" || value?.kind === "range" ? value : undefined;
    return <QuantityControl attribute={attribute} value={v} label={label} locale={locale} t={t} onSet={onSet} onClear={onClear} />;
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
