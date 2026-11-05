import { useEffect } from "react";
import type { Notice } from "../game/reducer.ts";

const NOTICE_MS = 4000;

type NoticeStackProps = {
  notices: readonly Notice[];
  onDismiss: (id: number) => void;
};

// Server errors are plain prose meant to be shown as-is. The oldest one goes
// away on its own after a few seconds, a click dismisses any of them
export function NoticeStack({ notices, onDismiss }: NoticeStackProps) {
  const oldest = notices[0];

  useEffect(() => {
    if (!oldest) return;
    const timer = window.setTimeout(() => onDismiss(oldest.id), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [oldest, onDismiss]);

  if (notices.length === 0) return null;

  return (
    <div className="notices" role="status" aria-live="polite">
      {notices.map(notice => (
        <div
          key={notice.id}
          className={`notice${notice.tone === "info" ? " notice-info" : ""}`}
          onClick={() => onDismiss(notice.id)}
        >
          {notice.message}
        </div>
      ))}
    </div>
  );
}
