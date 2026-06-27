"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatArea } from "@/components/chat/chat-area";
import { ChatInput } from "@/components/chat/chat-input";
import { GenerationStageBanner } from "@/components/generation/generation-stage-banner";
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
  const router = useRouter();
  const {
    session,
    isLoading,
    generationStageKey,
    sendMessage,
    cancelInFlight,
    editAndResubmit,
  } = useChatSession({
    sessionId,
    autoSendInitial,
  });

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.status === "generating_report") {
      router.push(`/report/${sessionId}`);
    }
  }, [session?.status, sessionId, router]);

  usePageLeaveGuard({
    enabled: session?.status === "active",
    confirmMessage: CHAT_LEAVE_CONFIRM_MESSAGE,
  });

  const handleStartEdit = useCallback(
    (messageId: string) => {
      cancelInFlight();
      setEditingMessageId(messageId);
    },
    [cancelInFlight]
  );

  const handleConfirmEdit = useCallback(
    async (messageId: string, newContent: string) => {
      setEditingMessageId(null);
      await editAndResubmit(messageId, newContent);
    },
    [editAndResubmit]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

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

  const showGenerationBanner =
    isLoading && session.status !== "generating_report";

  return (
    <WorkspaceLayout
      comparison={session.decisionComparison}
      generationBanner={
        <GenerationStageBanner
          mode="chat"
          isVisible={showGenerationBanner}
          stageKey={generationStageKey}
        />
      }
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatArea
          messages={session.messages}
          editingMessageId={editingMessageId}
          onStartEdit={handleStartEdit}
          onConfirmEdit={handleConfirmEdit}
          onCancelEdit={handleCancelEdit}
        />
        <ChatInput
          sessionId={sessionId}
          onSend={sendMessage}
          disabled={isLoading || editingMessageId !== null}
        />
      </div>
    </WorkspaceLayout>
  );
}
