import type { DecisionComparison } from "@/types/decision-comparison";

export interface DecisionSummary {
  final_choice: string;
  core_logic: string;
  insights_and_actions: string;
  core_truth: string;
}

export interface QuotaSnapshot {
  remaining: number;
  reset_time: string;
}

interface ChatApiResponseBase {
  entire_analysis?: string;
  analysis_completed?: boolean;
  quota?: QuotaSnapshot;
}

export type ChatApiResponse =
  | ({
      type: "follow_up";
      strategy_id: string;
      question: string;
      decision_comparison?: DecisionComparison;
    } & ChatApiResponseBase)
  | ({
      type: "report_generating";
      decision_comparison?: DecisionComparison;
    } & ChatApiResponseBase)
  | ({
      type: "decision";
    } & DecisionSummary &
      ChatApiResponseBase & {
        decision_comparison?: DecisionComparison;
      });