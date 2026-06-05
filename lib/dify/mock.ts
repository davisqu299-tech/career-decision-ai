import type { ChatApiResponse } from "@/types/decision";
import type { ChatHistoryItem } from "@/types/chat";

const MOCK_DECISION: ChatApiResponse = {
  type: "decision",
  decision_summary: {
    conclusion: {
      final_choice:
        "建议暂缓裸辞，优先在 3 个月内完成一次有目标的内部转岗或外部 offer 对比后再做最终决定。",
    },
    reasoning: {
      core_logic:
        "你当前的核心矛盾并非「要不要离开这家公司」，而是「职业成长停滞」与「经济安全感」之间的权衡。现有岗位仍能提供稳定的现金流和行业背书，但成长曲线已明显放缓。在没有明确下一站的情况下离职，风险收益比偏低。",
    },
    insights_and_actions: {
      deep_insight:
        "1. 列出未来 6 个月必须达成的 2 个可量化职业目标\n2. 每周投入 5 小时进行外部市场调研与技能补强\n3. 与直属上级进行一次关于成长路径的坦诚对话\n4. 设定 90 天决策检查点，届时重新评估去留",
    },
    core_truth: {
      problem_essence:
        "你不是在逃避工作，而是在寻找一条能让你重新感到「在成长」的职业路径。",
    },
  },
};

export function buildMockResponse(
  history: ChatHistoryItem[] = []
): ChatApiResponse {
  const assistantCount = history.filter((h) => h.role === "assistant").length;

  if (assistantCount === 0) {
    return {
      type: "follow_up",
      strategy_id: "salary_team_growth",
      question:
        "为了更准确地分析你的处境，请补充：你目前的薪资水平是否与市场持平？团队氛围如何？近一年是否有明显的成长或晋升？",
    };
  }

  if (assistantCount === 1) {
    return {
      type: "follow_up",
      strategy_id: "timeline_motivation",
      question:
        "你是否有明确的离职时间线？另外，促使你考虑离职的最直接触发事件是什么？（例如：直属领导变动、项目裁撤、长期加班等）",
    };
  }

  return MOCK_DECISION;
}
