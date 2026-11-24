"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const focusables = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest("[hidden]"));

/**
 * Modal dialog behavior (Sprint 2-C.1, TD-02), shared by every modal in the app:
 * - initial focus: the element marked `data-autofocus` inside, else the first focusable (React's
 *   `autoFocus` is not used: it moves focus before effects run, which would lose the opener);
 * - Tab / Shift+Tab stay inside; the rest of the page is `inert` while open (screen readers and pointer too);
 * - Escape closes (`onClose`);
 * - on close, focus returns to the element that opened it — or, when that element is gone or disabled
 *   (e.g. the category reset button after resetting), to `returnFocus()`.
 * No library and no native `<dialog>` (jsdom lacks `showModal`, so tests would not exercise the real path).
 * Non-modal panels (color palette, mobile preview sheet) do NOT use this: they never trap focus.
 */
export function ModalDialog({
  className = "modal",
  labelledBy,
  label,
  testId,
  onClose,
  returnFocus,
  onBackdropClick,
  children,
}: {
  className?: string;
  labelledBy?: string;
  label?: string;
  testId?: string;
  onClose(): void;
  returnFocus?(): HTMLElement | null;
  onBackdropClick?(): void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ onClose, returnFocus });
  useEffect(() => {
    latest.current = { onClose, returnFocus };
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && !node.contains(active) ? active : null;
    (node.querySelector<HTMLElement>("[data-autofocus]") ?? focusables(node)[0] ?? node).focus();

    // Everything outside the dialog becomes inert (each ancestor's siblings), restored on close.
    const inerted: Element[] = [];
    for (let el: Element = node; el.parentElement && el !== document.body; el = el.parentElement) {
      for (const sibling of Array.from(el.parentElement.children)) {
        if (sibling !== el && !sibling.hasAttribute("inert") && sibling.tagName !== "SCRIPT") {
          sibling.setAttribute("inert", "");
          inerted.push(sibling);
        }
      }
    }
    return () => {
      for (const el of inerted) el.removeAttribute("inert");
      const usable = (el: HTMLElement | null) => el && el.isConnected && !el.matches(":disabled") && !el.closest("[inert]");
      const target = usable(opener) ? opener : latest.current.returnFocus?.() ?? null;
      target?.focus();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      data-testid={testId}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          latest.current.onClose();
          return;
        }
        if (e.key !== "Tab") return;
        const list = focusables(e.currentTarget);
        if (list.length === 0) return e.preventDefault();
        const first = list[0]!;
        const last = list[list.length - 1]!;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      {children}
    </div>
  );
}
