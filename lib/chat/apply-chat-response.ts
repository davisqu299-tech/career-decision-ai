import { toast } from "sonner";
import type { ChatApiResponse, QuotaSnapshot } from "@/types/decision";
import { decisionResponseToSummary } from "@/lib/dify/parser";import {
  appendMessage,
  completeSession,
  getSession,
  setDecisionComparison,
  setDifyConversationId,
  setSessionActive,
  setSessionGeneratingReport,
} from "@/lib/chat/session-store";
import { AnalysisQuotaService } from "@/lib/quota/analysis-quota-service";

export type ChatResponseAction =
  | "follow_up"
  | "report_generating"
  | "decision"
  | "none";

export function applyChatApiResponse(
  sessionId: string,
  data: ChatApiResponse & {
    conversationId?: string;
    quota?: QuotaSnapshot;
  }
): ChatResponseAction {
  const existingSession = getSession(sessionId);
  const wasCompleted = existingSession?.status === "completed";

  if (data.conversationId) {
    setDifyConversationId(sessionId, data.conversationId);
  }

  if (data.decision_comparison) {
    setDecisionComparison(sessionId, data.decision_comparison);
  }

  if (data.type === "follow_up") {
    const current = getSession(sessionId);
    const lastMessage = current?.messages[current.messages.length - 1];
    if (
      lastMessage?.role !== "assistant" ||
      lastMessage.content !== data.question
    ) {
      appendMessage(sessionId, "assistant", data.question);
    }
    setSessionActive(sessionId);
    return "follow_up";
  }
  if (data.type === "report_generating") {
    setSessionGeneratingReport(sessionId);
    return "report_generating";
  }

  if (data.type !== "decision") {
    return "none";
  }

  if (data.quota && !wasCompleted) {
    AnalysisQuotaService.syncFromResponse(data.quota);
    const toastMessage = AnalysisQuotaService.getCompletionToast(
      data.quota.remaining,
      data.quota.reset_time
    );
    if (toastMessage) {
      toast(toastMessage);
    }
  }

  completeSession(sessionId, decisionResponseToSummary(data));
  return "decision";}
