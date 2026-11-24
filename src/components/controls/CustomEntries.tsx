"use client";

import { useId, useState } from "react";
import {
  CUSTOM_EXPRESSION_MAX,
  CUSTOM_LABEL_MAX,
  customKey,
  normalizeSearch,
  resolveText,
  type CustomEntry,
  type OptionAttributeDefinition,
  type OptionDefinition,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";

/** Registered options whose label or alias equals the name (search-normalized). Never used to merge — notice only. */
export const similarOptions = (attribute: OptionAttributeDefinition, label: string): OptionDefinition[] => {
  const key = normalizeSearch(label);
  if (!key) return [];
  return attribute.options.filter((o) => [...Object.values(o.label), ...(o.aliases ?? [])].some((x) => normalizeSearch(x) === key));
};

function EntryEditor({
  attribute,
  entry,
  index,
  locale,
  t,
  others,
  onChange,
  onRemove,
  onPickRegistered,
}: {
  attribute: OptionAttributeDefinition;
  entry: CustomEntry;
  index: number;
  locale: string;
  t: Messages;
  others: readonly CustomEntry[];
  onChange(next: CustomEntry): void;
  onRemove(): void;
  onPickRegistered(optionId: string): void;
}) {
  const labelMax = attribute.custom?.labelMaxLength ?? CUSTOM_LABEL_MAX;
  const exprMax = attribute.custom?.expressionMaxLength ?? CUSTOM_EXPRESSION_MAX;
  // Drafts: a blank or duplicate name is shown but never stored.
  const [label, setLabel] = useState(entry.label);
  const [expression, setExpression] = useState(entry.expression ?? "");
  const [synced, setSynced] = useState(JSON.stringify(entry));
  if (synced !== JSON.stringify(entry)) {
    setSynced(JSON.stringify(entry));
    setLabel(entry.label);
    setExpression(entry.expression ?? "");
  }
  const duplicate = others.some((o) => customKey(o.label) === customKey(label));
  const blank = label.trim() === "";
  const similar = similarOptions(attribute, label);
  const idBase = useId();
  const store = (l: string, e: string) => {
    if (l.trim() === "" || others.some((o) => customKey(o.label) === customKey(l))) return;
    onChange({ label: l, ...(e.trim() !== "" ? { expression: e } : {}) });
  };
  return (
    <li className="custom-entry" data-testid={`custom-entry-${attribute.id}-${index}`}>
      <div className="custom-entry__row">
        <label htmlFor={`${idBase}-l`} className="small">
          {t.custom.name}
        </label>
        <input
          id={`${idBase}-l`}
          type="text"
          className="text-input"
          value={label}
          maxLength={labelMax}
          aria-invalid={duplicate || blank || undefined}
          onChange={(e) => {
            setLabel(e.target.value);
            store(e.target.value, expression);
          }}
        />
      </div>
      <div className="custom-entry__row">
        <label htmlFor={`${idBase}-e`} className="small">
          {t.custom.expression} <span className="muted">({t.custom.optional})</span>
        </label>
        <textarea
          id={`${idBase}-e`}
          rows={2}
          lang="en"
          value={expression}
          maxLength={exprMax}
          placeholder={t.custom.expressionPlaceholder}
          onChange={(e) => {
            setExpression(e.target.value);
            store(label, e.target.value);
          }}
        />
        <span className="counter">
          {expression.length} / {exprMax} {t.field.chars}
        </span>
      </div>
      {blank && <p className="field-error small">{t.custom.nameRequired}</p>}
      {duplicate && <p className="field-error small">{t.custom.duplicate}</p>}
      {similar.length > 0 && (
        <p className="notice small" data-testid="custom-similar">
          {fmt(t.custom.similar, { names: similar.map((o) => resolveText(o.label, locale)).join(", ") })}{" "}
          {similar.map((o) => (
            <button key={o.id} type="button" className="link-button" onClick={() => onPickRegistered(o.id)}>
              {fmt(t.custom.useRegistered, { name: resolveText(o.label, locale) })}
            </button>
          ))}
        </p>
      )}
      <p className="muted small">{entry.expression ? t.custom.usesExpression : t.custom.usesName}</p>
      <button type="button" className="link-button" onClick={onRemove} aria-label={`${t.custom.remove}: ${entry.label}`}>
        {t.custom.remove}
      </button>
    </li>
  );
}

/**
 * User-defined values of an option attribute: name and prompt expression are
 * independent, original text is kept verbatim, nothing is merged with
 * registered options (similar names only get a notice).
 */
export function CustomEntries({
  attribute,
  entries,
  label,
  locale,
  t,
  onAdd,
  onUpdate,
  onRemove,
  onPickRegistered,
  addRequest,
}: {
  attribute: OptionAttributeDefinition;
  entries: readonly CustomEntry[];
  label: string;
  locale: string;
  t: Messages;
  onAdd(entry: CustomEntry): void;
  onUpdate(index: number, entry: CustomEntry): void;
  onRemove(index: number): void;
  onPickRegistered(optionId: string): void;
  /** Name prefilled from a search box ("add as custom"). */
  addRequest?: { name: string; n: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [expression, setExpression] = useState("");
  const [request, setRequest] = useState<number | null>(null);
  if (addRequest && addRequest.n !== request) {
    setRequest(addRequest.n);
    setOpen(true);
    setName(addRequest.name);
  }
  const isMulti = attribute.type === "multi";
  const duplicate = entries.some((e) => customKey(e.label) === customKey(name));
  const similar = similarOptions(attribute, name);
  const idBase = useId();
  const labelMax = attribute.custom?.labelMaxLength ?? CUSTOM_LABEL_MAX;
  const exprMax = attribute.custom?.expressionMaxLength ?? CUSTOM_EXPRESSION_MAX;
  const canAdd = name.trim() !== "" && !duplicate;

  return (
    <div className="custom-entries" data-testid={`custom-${attribute.id}`}>
      {entries.length > 0 && (
        <ul className="custom-entries__list" aria-label={fmt(t.custom.listLabel, { label })}>
          {entries.map((e, i) => (
            <EntryEditor
              key={i}
              attribute={attribute}
              entry={e}
              index={i}
              locale={locale}
              t={t}
              others={entries.filter((_, j) => j !== i)}
              onChange={(next) => onUpdate(i, next)}
              onRemove={() => onRemove(i)}
              onPickRegistered={onPickRegistered}
            />
          ))}
        </ul>
      )}
      {!open ? (
        <button type="button" className="button button--small" onClick={() => setOpen(true)} aria-label={`${t.custom.add}: ${label}`}>
          + {t.custom.add}
        </button>
      ) : (
        <form
          className="custom-add"
          aria-label={`${t.custom.add}: ${label}`}
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!canAdd) return;
            onAdd({ label: name, ...(expression.trim() !== "" ? { expression } : {}) });
            setName("");
            setExpression("");
            setOpen(false);
          }}
        >
          {!isMulti && entries.length === 0 && <p className="muted small">{t.custom.replacesSingle}</p>}
          <label htmlFor={`${idBase}-n`} className="small">
            {t.custom.name}
          </label>
          <input id={`${idBase}-n`} type="text" className="text-input" value={name} maxLength={labelMax} autoFocus onChange={(e) => setName(e.target.value)} />
          <label htmlFor={`${idBase}-x`} className="small">
            {t.custom.expression} <span className="muted">({t.custom.optional})</span>
          </label>
          <textarea id={`${idBase}-x`} rows={2} lang="en" value={expression} maxLength={exprMax} placeholder={t.custom.expressionPlaceholder} onChange={(e) => setExpression(e.target.value)} />
          {duplicate && <p className="field-error small">{t.custom.duplicate}</p>}
          {similar.length > 0 && (
            <p className="notice small" data-testid="custom-similar">
              {fmt(t.custom.similar, { names: similar.map((o) => resolveText(o.label, locale)).join(", ") })}
            </p>
          )}
          <div className="toolbar">
            <button type="submit" className="button button--small button--primary" disabled={!canAdd}>
              {t.custom.confirmAdd}
            </button>
            <button type="button" className="link-button" onClick={() => setOpen(false)}>
              {t.presetDialog.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
