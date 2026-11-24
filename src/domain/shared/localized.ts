import { z } from "zod";

/**
 * Human-facing text in multiple locales. English is required as the fallback;
 * any other BCP-47-ish locale key (e.g. `ko`, `ja`, `pt-BR`) may be added
 * without schema changes.
 */
export const LocalizedTextSchema = z
  .object({ en: z.string().min(1) })
  .catchall(z.string().min(1));

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export type Locale = string;

export const resolveText = (text: LocalizedText | undefined, locale: Locale): string => {
  if (!text) return "";
  return text[locale] ?? text.en;
};
