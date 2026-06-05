export interface DecisionSummary {
  conclusion: { final_choice: string };
  reasoning: { core_logic: string };
  insights_and_actions: { deep_insight: string };
  core_truth: { problem_essence: string };
}

export type ChatApiResponse =
  | { type: "follow_up"; strategy_id: string; question: string }
  | { type: "decision"; decision_summary: DecisionSummary };
