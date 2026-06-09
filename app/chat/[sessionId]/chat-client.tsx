"use client";

import Link from "next/link";
import { ChatArea } from "@/components/chat/chat-area";
import { ChatInput } from "@/components/chat/chat-input";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { useChatSession } from "@/lib/chat/use-chat-session";
import {
  CHAT_LEAVE_CONFIRM_MESSAGE,
  usePageLeaveGuard,
} from "@/lib/hooks/use-leave-guard";
import { Button } from "@/components/ui/button";

interface ChatClientProps {
  sessionId: string;
  autoSendInitial: boolean;
}

export function ChatClient({ sessionId, autoSendInitial }: ChatClientProps) {
  const { session, isLoading, sendMessage } = useChatSession({
    sessionId,
    autoSendInitial,
  });

  usePageLeaveGuard({
    enabled: session?.status === "active",
    confirmMessage: CHAT_LEAVE_CONFIRM_MESSAGE,
  });

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50">
        <p className="text-neutral-500">会话不存在或已过期</p>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </main>
    );
  }

  if (session.status === "completed" && session.decisionSummary) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50">
        <p className="text-neutral-500">该会话已完成分析</p>
        <Button asChild>
          <Link href={`/report/${sessionId}`}>查看报告</Link>
        </Button>
      </main>
    );
  }

  return (
    <WorkspaceLayout comparison={session.decisionComparison}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatArea messages={session.messages} isLoading={isLoading} />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </WorkspaceLayout>
  );
}
