"use client";

import { useEffect } from "react";

export const LEAVE_CONFIRM_MESSAGE =
  "您尚未保存分析报告，离开此页面将丢失当前结果。确定要离开吗？";

export const CHAT_LEAVE_CONFIRM_MESSAGE =
  "如果离开此页面将丢失当前结果，确定离开吗？";

export function useBeforeUnloadGuard(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}

export function confirmLeave(
  message: string = LEAVE_CONFIRM_MESSAGE
): boolean {
  return window.confirm(message);
}

interface UsePageLeaveGuardOptions {
  enabled?: boolean;
  confirmMessage?: string;
}

export function usePageLeaveGuard({
  enabled = true,
  confirmMessage = LEAVE_CONFIRM_MESSAGE,
}: UsePageLeaveGuardOptions = {}): void {
  useBeforeUnloadGuard(enabled);

  useEffect(() => {
    if (!enabled) return;

    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      if (confirmLeave(confirmMessage)) {
        window.removeEventListener("popstate", onPopState);
        window.history.back();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, confirmMessage]);
}
