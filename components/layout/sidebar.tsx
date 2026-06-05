"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, PanelLeft } from "lucide-react";
import type { Session } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  sessions: Session[];
  currentSessionId?: string;
  onNewChat?: () => void;
  className?: string;
}

export function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  className,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-neutral-200 bg-white",
        className
      )}
    >
      <div className="flex items-center gap-2 p-4">
        <PanelLeft className="h-4 w-4 text-neutral-400" />
        <Link href="/" className="text-sm font-semibold text-neutral-900">
          Career Decision AI
        </Link>
      </div>
      <div className="px-3 pb-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
          asChild={!onNewChat}
        >
          {onNewChat ? (
            <>
              <MessageSquarePlus className="h-4 w-4" />
              新建对话
            </>
          ) : (
            <Link href="/">
              <MessageSquarePlus className="h-4 w-4" />
              新建对话
            </Link>
          )}
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-1">
          {sessions.length === 0 && (
            <p className="px-2 py-4 text-xs text-neutral-400">暂无历史会话</p>
          )}
          {sessions.map((session) => {
            const href =
              session.status === "completed"
                ? `/report/${session.id}`
                : `/chat/${session.id}`;
            const isActive =
              currentSessionId === session.id || pathname === href;

            return (
              <Link
                key={session.id}
                href={href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className="line-clamp-2">{session.title}</span>
                {session.status === "completed" && (
                  <span className="mt-0.5 block text-xs text-neutral-400">
                    已完成
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
