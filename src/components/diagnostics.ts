import { getSafetyRule, resolveText, type CatalogRegistry, type Diagnostic } from "@/domain";
import { DIAGNOSTIC_TEXT, fmt, type Messages } from "@/i18n/messages";
import { attributeLabel, optionLabel } from "./format";

export interface DescribedDiagnostic {
  text: string;
  guidance?: string;
  terms?: string;
  actions?: Array<{ kind: "clear"; attributeId: string }>;
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
      return { text: resolveText(rule.message, locale), guidance: resolveText(rule.guidance, locale), terms: String(d.params?.terms ?? "") };
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
