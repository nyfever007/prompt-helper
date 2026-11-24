import { baselinePolicy, getSafetyRule, resolveText, type CatalogRegistry, type Diagnostic } from "@/domain";
import { DIAGNOSTIC_TEXT, fmt, type Messages } from "@/i18n/messages";
import { attributeLabel, optionLabel } from "./format";

export interface DescribedDiagnostic {
  text: string;
  guidance?: string;
  terms?: string;
  actions?: Array<{ kind: "clear"; attributeId: string }>;
  /** Attributes involved in a safety finding, with “(excluded from prompt)” etc. for values that are not output. */
  sources?: string;
}

/** Localize a domain diagnostic using the catalog, the safety policy and UI strings. */
export const describeDiagnostic = (
  d: Diagnostic,
  ctx: { registry: CatalogRegistry; locale: string; t: Messages },
): DescribedDiagnostic => {
  const { registry, locale, t } = ctx;
  if (d.code.startsWith("rule.") && d.ruleId) {
    const rule = registry.rules.find((r) => r.id === d.ruleId);
    if (rule) {
      return {
        text: resolveText(rule.message, locale),
        guidance: resolveText(rule.guidance, locale),
        ...(d.actions ? { actions: d.actions } : {}),
      };
    }
  }
  if (d.code.startsWith("safety.")) {
    const rule = getSafetyRule(String(d.params?.safetyRule ?? ""));
    if (rule) {
      const hidden = new Map(
        String(d.params?.hiddenSources ?? "")
          .split(",")
          .filter(Boolean)
          .map((x) => x.split(":") as [string, string]),
      );
      const sources = (d.involves ?? [])
        .map((id) => {
          const reason = hidden.get(id) as keyof Messages["hiddenSource"] | undefined;
          return `${attributeLabel(registry, id, locale)}${reason && t.hiddenSource[reason] ? ` (${t.hiddenSource[reason]})` : ""}`;
        })
        .join(", ");
      // Structured tags (e.g. `age.minor` from an age value) are shown by their signal label, not as raw ids.
      const terms = String(d.params?.terms ?? "")
        .split(", ")
        .filter(Boolean)
        .map((term) => {
          const signal = baselinePolicy.signals.find((x) => x.tags.includes(term));
          return signal ? resolveText(signal.label, locale) : term;
        });
      return { text: resolveText(rule.message, locale), guidance: resolveText(rule.guidance, locale), terms: [...new Set(terms)].join(", "), ...(sources ? { sources } : {}) };
    }
  }
  if (d.code === "selection.inactive" && d.attributeId) {
    return { text: `${attributeLabel(registry, d.attributeId, locale)}: ${t.field.inactive}` };
  }
  if (d.code === "selection.option_inactive" && d.attributeId) {
    const ids = String(d.params?.optionIds ?? "").split(",").filter(Boolean);
    const options = ids.map((id) => optionLabel(registry, d.attributeId!, id, locale)).join(", ");
    return { text: `${attributeLabel(registry, d.attributeId, locale)}: ${fmt(t.field.optionInactive, { options })}` };
  }
  if (d.code === "selection.restricted" || d.code === "policy.restricted_selection") {
    const ids = String(d.params?.optionIds ?? "").split(",").filter(Boolean);
    const attribute = d.attributeId ? registry.getAttribute(d.attributeId) : undefined;
    const reasons = ids
      .map((id) => (attribute && (attribute.type === "single" || attribute.type === "multi") ? attribute.options.find((o) => o.id === id)?.restriction?.reason : undefined))
      .filter((r) => r !== undefined)
      .map((r) => resolveText(r, locale));
    const what = `${attributeLabel(registry, d.attributeId ?? "", locale)}: ${ids.map((id) => optionLabel(registry, d.attributeId ?? "", id, locale)).join(", ")}`;
    return {
      text: locale === "ko" ? `사용이 제한된 선택지가 있어 프롬프트 출력이 차단되었습니다 — ${what}` : `A restricted option blocks the prompt output — ${what}`,
      ...(reasons[0] ? { guidance: reasons[0] } : {}),
      actions: d.attributeId ? [{ kind: "clear" as const, attributeId: d.attributeId }] : [],
    };
  }
  if (d.code === "selection.custom_name_only") {
    return { text: fmt(t.field.customNameOnly, { labels: String(d.params?.labels ?? "") }) };
  }
  if (d.code === "selection.atypical" && d.attributeId) {
    const withLabels = String(d.params?.with ?? "")
      .split(",")
      .filter(Boolean)
      .map((id) => attributeLabel(registry, id, locale))
      .join(", ");
    return { text: fmt(t.field.atypical, { option: optionLabel(registry, d.attributeId, String(d.params?.optionId ?? ""), locale), with: withLabels }) };
  }
  if (d.code === "preset.unit_overridden") {
    const preset = attributeLabel(registry, String(d.params?.preset ?? ""), locale);
    return { text: fmt(t.detailed.takenOverOverride, { preset }) };
  }
  if (d.code === "prompt.mixed_language") {
    return { text: fmt(t.preview.mixedLanguage, { scripts: String(d.params?.scripts ?? "") }) };
  }
  const localized = DIAGNOSTIC_TEXT[locale]?.[d.code];
  if (!localized) return { text: d.message };
  return { text: d.path ? `${localized} (${d.path})` : localized };
};
