import type { DecisionComparison } from "@/types/decision-comparison";

export interface DecisionSummary {
  final_choice: string;
  core_logic: string;
  insights_and_actions: string;
  core_truth: string;
}

export type ChatApiResponse =
  | {
      type: "follow_up";
      strategy_id: string;
      question: string;
      decision_comparison?: DecisionComparison;
    }
  | {
      type: "decision";
      decision_summary: DecisionSummary;
      decision_comparison?: DecisionComparison;
    };
