"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LycheeLogo } from "@/components/home/lychee-logo";
import { getSession } from "@/lib/chat/session-store";
import {
  CHAT_LEAVE_CONFIRM_MESSAGE,
  LEAVE_CONFIRM_MESSAGE,
  confirmLeave,
} from "@/lib/hooks/use-leave-guard";

interface SiteHeaderProps {
  className?: string;
}

function getHomeLeaveConfirmMessage(pathname: string): string | null {
  const chatMatch = pathname.match(/^\/chat\/([^/]+)/);
  if (chatMatch) {
    const session = getSession(chatMatch[1]);
    if (session?.status === "active") {
      return CHAT_LEAVE_CONFIRM_MESSAGE;
    }
    return null;
  }

  const reportMatch = pathname.match(/^\/report\/([^/]+)/);
  if (reportMatch) {
    const session = getSession(reportMatch[1]);
    if (session?.decisionSummary) {
      return LEAVE_CONFIRM_MESSAGE;
    }
    return null;
  }

  return null;
}

export function SiteHeader({ className }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleHomeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") return;

    const confirmMessage = getHomeLeaveConfirmMessage(pathname);
    if (!confirmMessage) return;

    event.preventDefault();
    if (confirmLeave(confirmMessage)) {
      router.push("/");
    }
  };

  return (
    <header className={className}>
      <Link
        href="/"
        onClick={handleHomeClick}
        className="inline-flex items-center gap-2.5 text-neutral-900 transition-opacity hover:opacity-70"
        aria-label="荔枝AI 首页"
      >
        <LycheeLogo />
        <span className="text-xl font-medium leading-none tracking-tight">
          荔枝AI
        </span>
      </Link>
    </header>
  );
}