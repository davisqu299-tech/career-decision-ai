"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Session } from "@/types/chat";
import type { ChatPipelineEvent } from "@/types/chat-stream";
import { applyChatApiResponse } from "@/lib/chat/apply-chat-response";
import {
  abortChatPipeline,
  getPipelineState,
  startChatPipeline,
  subscribeChatPipeline,
} from "@/lib/chat/chat-pipeline";
import {
  appendMessage,
  editLastUserMessage,
  getLastUserMessageId,
  getSession,
  setDecisionComparison,
  setDifyConversationId,
} from "@/lib/chat/session-store";
import { applySystemUnavailableResponse } from "@/lib/chat/system-unavailable";
import { consumePendingTurnstileToken } from "@/lib/turnstile/turnstile-service";
import { VisitorService } from "@/lib/visitor/visitor-service";

interface UseChatSessionOptions {
  sessionId: string;
  autoSendInitial?: boolean;
}

export function useChatSession({
  sessionId,
  autoSendInitial = false,
}: UseChatSessionOptions) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [generationStageKey, setGenerationStageKey] = useState(0);

  const requestIdRef = useRef(0);

  const refresh = useCallback(() => {
    setSession(getSession(sessionId));
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const syncLoading = () => {
      setIsLoading(getPipelineState(sessionId).isLoading);
    };

    syncLoading();

    return subscribeChatPipeline(sessionId, (event) => {
      if (event.type === "loading") {
        setIsLoading(event.isLoading);
      }
    });
  }, [sessionId]);

  const handleSystemFailure = useCallback(() => {
    applySystemUnavailableResponse(sessionId);
    refresh();
    setIsLoading(false);
  }, [sessionId, refresh]);

  const handlePipelineEvent = useCallback(
    (event: ChatPipelineEvent, requestId: number) => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (event.type === "decision_comparison") {
        if (event.conversationId) {
          setDifyConversationId(sessionId, event.conversationId);
        }
        setDecisionComparison(sessionId, event.decision_comparison);
        refresh();
        return;
      }

      if (event.type === "report_generating") {
        if (event.conversationId) {
          setDifyConversationId(sessionId, event.conversationId);
        }
        applyChatApiResponse(sessionId, {
          type: "report_generating",
          conversationId: event.conversationId,
        });
        refresh();
        router.push(`/report/${sessionId}`);
        return;
      }

      if (event.type === "follow_up") {
        const action = applyChatApiResponse(sessionId, event.data);
        refresh();

        if (action === "follow_up") {
          setIsLoading(false);
        }
        return;
      }

      if (event.type === "decision") {
        applyChatApiResponse(sessionId, event.data);
        refresh();
        setIsLoading(false);
        router.push(`/report/${sessionId}`);
        return;
      }

      if (event.type === "error") {
        handleSystemFailure();
      }
    },
    [sessionId, refresh, router, handleSystemFailure]
  );

  const cancelInFlight = useCallback(() => {
    requestIdRef.current += 1;
    abortChatPipeline(sessionId);
    setIsLoading(false);
  }, [sessionId]);

  const executeRequest = useCallback(
    async (message: string, currentSession: Session) => {
      const requestId = ++requestIdRef.current;
      setGenerationStageKey((key) => key + 1);
      setIsLoading(true);

      const history = currentSession.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const hasAssistantReply = history.some((item) => item.role === "assistant");
      const turnstileToken = hasAssistantReply
        ? undefined
        : consumePendingTurnstileToken(sessionId) ?? undefined;

      const unsubscribe = subscribeChatPipeline(sessionId, (event) => {
        handlePipelineEvent(event, requestId);
      });

      try {
        await startChatPipeline(sessionId, (signal) =>
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              message,
              history,
              conversationId: currentSession.difyConversationId,
              browserUuid: VisitorService.getBrowserUuid(),
              turnstileToken,
            }),
            signal,
          })
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        if (requestIdRef.current !== requestId) {
          return;
        }
        handleSystemFailure();
      } finally {
        unsubscribe();
        if (requestIdRef.current === requestId) {
          setIsLoading(getPipelineState(sessionId).isLoading);
        }
      }
    },
    [sessionId, handlePipelineEvent, handleSystemFailure]
  );

  const sendMessage = useCallback(
    async (message: string, options?: { skipUserAppend?: boolean }) => {
      const current = getSession(sessionId);
      if (!current) {
        toast.error("会话不存在");
        return;
      }

      if (current.status === "completed") {
        router.push(`/report/${sessionId}`);
        return;
      }

      let working = current;
      if (!options?.skipUserAppend) {
        const updated = appendMessage(sessionId, "user", message);
        if (updated) working = updated;
        refresh();
      }

      await executeRequest(message, working);
    },
    [sessionId, executeRequest, refresh, router]
  );

  const editAndResubmit = useCallback(
    async (messageId: string, newContent: string) => {
      const trimmed = newContent.trim();
      if (!trimmed) {
        toast.error("消息内容不能为空");
        return;
      }

      const current = getSession(sessionId);
      if (!current) {
        toast.error("会话不存在");
        return;
      }

      const lastUserId = getLastUserMessageId(current.messages);
      if (!lastUserId || lastUserId !== messageId) {
        toast.error("只能修改最后一条用户消息");
        return;
      }

      const existing = current.messages.find((m) => m.id === messageId);
      if (existing && existing.content === trimmed) {
        return;
      }

      cancelInFlight();

      const updated = editLastUserMessage(sessionId, messageId, trimmed);
      if (!updated) {
        toast.error("修改失败");
        return;
      }

      refresh();
      await executeRequest(trimmed, updated);
    },
    [sessionId, cancelInFlight, executeRequest, refresh]
  );

  useEffect(() => {
    if (!autoSendInitial || hasAutoSent || !session) return;

    const lastMessage = session.messages[session.messages.length - 1];
    const assistantReplied = session.messages.some((m) => m.role === "assistant");

    if (
      lastMessage?.role === "user" &&
      !assistantReplied &&
      session.status === "active"
    ) {
      setHasAutoSent(true);
      sendMessage(lastMessage.content, { skipUserAppend: true });
    }
  }, [autoSendInitial, hasAutoSent, session, sendMessage]);

  return {
    session,
    isLoading,
    generationStageKey,
    sendMessage,
    cancelInFlight,
    editAndResubmit,
    refresh,
  };
}
