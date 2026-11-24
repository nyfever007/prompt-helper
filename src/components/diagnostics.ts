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
  if (d.code === "prompt.mixed_language") {
    return { text: fmt(t.preview.mixedLanguage, { scripts: String(d.params?.scripts ?? "") }) };
  }
  const localized = DIAGNOSTIC_TEXT[locale]?.[d.code];
  if (!localized) return { text: d.message };
  return { text: d.path ? `${localized} (${d.path})` : localized };
};
