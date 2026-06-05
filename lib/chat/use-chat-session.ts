"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ChatApiResponse } from "@/types/decision";
import type { Session } from "@/types/chat";
import {
  appendMessage,
  completeSession,
  getSession,
  listSessions,
} from "@/lib/chat/session-store";

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);

  const refresh = useCallback(() => {
    setSession(getSession(sessionId));
    setSessions(listSessions());
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const callApi = useCallback(
    async (message: string, currentSession: Session) => {
      const history = currentSession.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message,
          history,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "请求失败，请稍后重试"
        );
      }

      return (await response.json()) as ChatApiResponse;
    },
    [sessionId]
  );

  const handleResponse = useCallback(
    (data: ChatApiResponse) => {
      if (data.type === "follow_up") {
        appendMessage(sessionId, "assistant", data.question);
        refresh();
        return;
      }

      completeSession(sessionId, data.decision_summary);
      refresh();
      router.push(`/report/${sessionId}`);
    },
    [sessionId, refresh, router]
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

      setIsLoading(true);

      try {
        let working = current;
        if (!options?.skipUserAppend) {
          const updated = appendMessage(sessionId, "user", message);
          if (updated) working = updated;
          refresh();
        }

        const data = await callApi(message, working);
        handleResponse(data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "发送失败"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, callApi, handleResponse, refresh, router]
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
    sessions,
    isLoading,
    sendMessage,
    refresh,
  };
}
