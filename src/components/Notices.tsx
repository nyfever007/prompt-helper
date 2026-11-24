"use client";

import { useEffect } from "react";

export type NoticeKind = "success" | "info" | "warning" | "error";

export interface Notice {
  id: string;
  kind: NoticeKind;
  title?: string;
  text?: string;
  details?: string[];
  /** Auto-dismiss after this many ms. Omit for notices that must stay (errors, decisions). */
  autoDismissMs?: number;
}

function NoticeItem({ notice, onDismiss, dismissLabel }: { notice: Notice; onDismiss(id: string): void; dismissLabel: string }) {
  useEffect(() => {
    if (!notice.autoDismissMs) return;
    const timer = window.setTimeout(() => onDismiss(notice.id), notice.autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [notice.id, notice.autoDismissMs, onDismiss]);

  return (
    <div className={`notice notice--${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"} data-notice-id={notice.id}>
      {notice.title && <p className="notice__title">{notice.title}</p>}
      {notice.text && <p>{notice.text}</p>}
      {notice.details && notice.details.length > 0 && (
        <ul>
          {notice.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      <button type="button" className="link-button notice__close" onClick={() => onDismiss(notice.id)} aria-label={dismissLabel}>
        ×
      </button>
    </div>
  );
}

export function Notices({ notices, onDismiss, dismissLabel }: { notices: Notice[]; onDismiss(id: string): void; dismissLabel: string }) {
  if (notices.length === 0) return null;
  return (
    <div className="notices">
      {notices.map((n) => (
        <NoticeItem key={n.id} notice={n} onDismiss={onDismiss} dismissLabel={dismissLabel} />
      ))}
    </div>
  );
}
