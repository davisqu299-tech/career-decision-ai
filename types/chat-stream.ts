import type { ChatApiResponse } from "@/types/decision";
import type { DecisionComparison } from "@/types/decision-comparison";
import type { QuotaSnapshot } from "@/types/decision";

export type ChatStreamServerEvent =
  | { event: "report_generating"; conversationId?: string }
  | {
      event: "decision_comparison";
      decision_comparison: DecisionComparison;
      conversationId?: string;
    }
  | {
      event: "result";
      payload: ChatApiResponse & {
        conversationId?: string;
        quota?: QuotaSnapshot;
      };
    }
  | { event: "error"; message: string };

export type ChatPipelineEvent =
  | { type: "loading"; isLoading: boolean }
  | { type: "report_generating"; conversationId?: string }
  | {
      type: "decision_comparison";
      decision_comparison: DecisionComparison;
      conversationId?: string;
    }
  | {
      type: "follow_up";
      data: ChatApiResponse & {
        conversationId?: string;
        quota?: QuotaSnapshot;
      };
    }
  | {
      type: "decision";
      data: ChatApiResponse & {
        conversationId?: string;
        quota?: QuotaSnapshot;
      };
    }
  | { type: "error"; message: string };

export type PipelinePhase = "idle" | "loading" | "report_generating" | "done";
