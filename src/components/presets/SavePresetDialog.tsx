"use client";

import { useId, useMemo, useState } from "react";
import { resolveText, USER_PRESET_DESCRIPTION_MAX, USER_PRESET_NAME_MAX, type CatalogRegistry, type ImageSpec } from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";
import { ModalDialog } from "../ModalDialog";
import { describeValue } from "../format";

/** Group key of an attribute: its category path's first two levels (e.g. Person › Hair). */
const groupOf = (registry: CatalogRegistry, attributeId: string): string => {
  const c = registry.getAttribute(attributeId)?.categoryId;
  if (!c) return "";
  const path = registry.categoryPath(c);
  return path[Math.min(1, path.length - 1)]!;
};

/**
 * Save as a preset (Sprint 3.3) — and rename (`edit`). Choose everything, whole categories or single
 * attributes among the SET ones. Values are saved exactly (custom colors and locks included).
 */
export function SavePresetDialog({
  registry,
  spec,
  locale,
  t,
  initialIds,
  edit,
  onSave,
  onClose,
}: {
  registry: CatalogRegistry;
  spec: ImageSpec;
  locale: string;
  t: Messages;
  /** Preselected attributes (default: everything that is set). */
  initialIds?: readonly string[];
  /** Rename mode: only name and description. */
  edit?: { name: string; description?: string };
  onSave(input: { name: string; description: string; attributeIds: string[] }): void;
  onClose(): void;
}) {
  const m = t.myPresets;
  const ids = useId();
  const setIds = useMemo(() => registry.attributes().filter((a) => a.id in spec.selections).map((a) => a.id), [registry, spec]);
  const groups = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const id of setIds) {
      const g = groupOf(registry, id);
      out.set(g, [...(out.get(g) ?? []), id]);
    }
    return [...out.entries()];
  }, [registry, setIds]);
  const [name, setName] = useState(edit?.name ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set((initialIds ?? setIds).filter((id) => setIds.includes(id))));
  const [tried, setTried] = useState(false);
  const toggle = (list: readonly string[], on: boolean) =>
    setChosen((prev) => {
      const next = new Set(prev);
      for (const id of list) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  const nameMissing = name.trim() === "";
  const noneChosen = !edit && chosen.size === 0;
  const submit = () => {
    setTried(true);
    if (nameMissing || noneChosen) return;
    onSave({ name, description, attributeIds: setIds.filter((id) => chosen.has(id)) });
  };
  const label = (g: string) => (g ? registry.categoryPath(g).map((c) => resolveText(registry.getCategory(c)?.label, locale)).join(" › ") : "—");

  return (
    <ModalDialog labelledBy={`${ids}-title`} testId="save-preset-dialog" onClose={onClose}>
      <form
        className="modal__card save-preset"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 id={`${ids}-title`}>{edit ? m.editTitle : m.dialogTitle}</h2>
        <label className="save-preset__row">
          <span>{m.name}</span>
          <input
            className="text-input"
            type="text"
            value={name}
            maxLength={USER_PRESET_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={(tried && nameMissing) || undefined}
            data-autofocus
            data-testid="preset-name"
          />
        </label>
        {tried && nameMissing && (
          <p className="field__error small" role="alert">
            {m.nameRequired}
          </p>
        )}
        <label className="save-preset__row">
          <span>{m.description}</span>
          <textarea rows={2} value={description} maxLength={USER_PRESET_DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} data-testid="preset-description" />
        </label>

        {!edit && (
          <fieldset className="save-preset__scope">
            <legend>{m.scope}</legend>
            {setIds.length === 0 ? (
              <p className="muted small">{m.nothingSet}</p>
            ) : (
              <>
                <div className="toolbar">
                  <button type="button" className="button button--small" onClick={() => toggle(setIds, true)}>
                    {m.selectAll}
                  </button>
                  <button type="button" className="button button--small" onClick={() => toggle(setIds, false)}>
                    {m.selectNone}
                  </button>
                  <span className="small" role="status" data-testid="preset-selected-count">
                    {fmt(m.selected, { n: chosen.size })}
                  </span>
                </div>
                <ul className="save-preset__groups">
                  {groups.map(([g, list]) => {
                    const n = list.filter((id) => chosen.has(id)).length;
                    return (
                      <li key={g || "none"} data-preset-group={g}>
                        <label className="save-preset__group">
                          <input
                            type="checkbox"
                            checked={n === list.length}
                            ref={(el) => {
                              if (el) el.indeterminate = n > 0 && n < list.length;
                            }}
                            onChange={(e) => toggle(list, e.target.checked)}
                          />
                          <strong>{label(g)}</strong> <span className="muted small">({n}/{list.length})</span>
                        </label>
                        <details>
                          <summary className="small">{fmt(m.count, { n: list.length })}</summary>
                          <ul className="save-preset__attrs">
                            {list.map((id) => {
                              const a = registry.getAttribute(id)!;
                              const s = spec.selections[id]!;
                              return (
                                <li key={id}>
                                  <label>
                                    <input type="checkbox" checked={chosen.has(id)} onChange={(e) => toggle([id], e.target.checked)} data-preset-attr={id} />{" "}
                                    {resolveText(a.label, locale)}: <span className="muted">{describeValue(a, s.value, locale)}</span>
                                    {s.locked && <span aria-label={t.lock.locked}> 🔒</span>}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      </li>
                    );
                  })}
                </ul>
                {tried && noneChosen && (
                  <p className="field__error small" role="alert">
                    {m.noneSelected}
                  </p>
                )}
                <p className="muted small">{m.keepNote}</p>
              </>
            )}
          </fieldset>
        )}
        <div className="toolbar modal__actions">
          <button type="submit" className="button button--primary" disabled={!edit && setIds.length === 0} data-testid="preset-save">
            {m.save}
          </button>
          <button type="button" className="button" onClick={onClose}>
            {m.cancel}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
