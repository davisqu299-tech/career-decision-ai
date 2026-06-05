"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ChatArea } from "@/components/chat/chat-area";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatSession } from "@/lib/chat/use-chat-session";
import { Button } from "@/components/ui/button";

interface ChatClientProps {
  sessionId: string;
  autoSendInitial: boolean;
}

export function ChatClient({ sessionId, autoSendInitial }: ChatClientProps) {
  const { session, sessions, isLoading, sendMessage } = useChatSession({
    sessionId,
    autoSendInitial,
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
    <AppShell sessions={sessions} currentSessionId={sessionId}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatArea messages={session.messages} isLoading={isLoading} />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </AppShell>
  );
}
