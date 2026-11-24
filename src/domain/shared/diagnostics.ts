/**
 * Diagnostics are the single channel through which domain modules report
 * problems. They never mutate a spec; the UI decides how to present them.
 *
 * `message` is an English developer-facing fallback. UIs should translate by
 * `code` (+ `params`) so diagnostics stay localizable.
 */
export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  code: string;
  severity: Severity;
  message: string;
  /** Dotted path into the inspected document, when applicable. */
  path?: string;
  attributeId?: string;
  params?: Record<string, string | number>;
}

export type Result<T> =
  | { ok: true; value: T; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

export const ok = <T>(value: T, diagnostics: Diagnostic[] = []): Result<T> => ({ ok: true, value, diagnostics });
export const fail = <T = never>(diagnostics: Diagnostic[]): Result<T> => ({ ok: false, diagnostics });

export const hasErrors = (diagnostics: readonly Diagnostic[]): boolean =>
  diagnostics.some((d) => d.severity === "error");

export const error = (code: string, message: string, extra: Partial<Diagnostic> = {}): Diagnostic => ({
  code,
  severity: "error",
  message,
  ...extra,
});

export const warning = (code: string, message: string, extra: Partial<Diagnostic> = {}): Diagnostic => ({
  code,
  severity: "warning",
  message,
  ...extra,
});

export const info = (code: string, message: string, extra: Partial<Diagnostic> = {}): Diagnostic => ({
  code,
  severity: "info",
  message,
  ...extra,
});

/** Convert Zod issues into diagnostics without leaking Zod types to callers. */
export const fromZodIssues = (
  code: string,
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
  pathPrefix = "",
): Diagnostic[] =>
  issues.map((issue) => {
    const path = [pathPrefix, ...issue.path.map(String)].filter(Boolean).join(".");
    return error(code, path ? `${path}: ${issue.message}` : issue.message, path ? { path } : {});
  });
