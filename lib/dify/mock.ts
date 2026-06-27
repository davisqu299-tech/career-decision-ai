import type { ChatApiResponse } from "@/types/decision";

import type { DecisionComparison } from "@/types/decision-comparison";

import type { ChatHistoryItem } from "@/types/chat";

import { REPORT_GENERATION_SIGNAL } from "@/lib/dify/parser";



const MOCK_COMPARISON_ROUND_1: DecisionComparison = {

  decisionTopic: "是否应从当前岗位离职",

  optionOne: "继续留任，争取内部转岗或晋升",

  optionTwo: "主动离职，寻找外部机会",

  optionMissing: "尚未明确下一家目标公司与可接受空窗期",

};



const MOCK_COMPARISON_ROUND_2: DecisionComparison = {

  decisionTopic: "是否应从当前岗位离职",

  optionOne: "暂缓离职，用 90 天验证成长可能性",

  optionTwo: "按计划离职，优先选择成长型团队",

  optionMissing: "对离职后收入下滑的承受区间仍不清晰",

};



const MOCK_COMPARISON_FINAL: DecisionComparison = {

  decisionTopic: "是否应从当前岗位离职",

  optionOne: "继续留任并设定 90 天成长检查点",

  optionTwo: "启动有目标的跳槽，避免裸辞",

  optionMissing: "外部 offer 的具体对比尚未完成",

};



const MOCK_DECISION_SUMMARY = {
  final_choice:
    "建议暂缓裸辞，优先在 3 个月内完成一次有目标的内部转岗或外部 offer 对比后再做最终决定。",
  core_logic:
    "你当前的核心矛盾并非「要不要离开这家公司」，而是「职业成长停滞」与「经济安全感」之间的权衡。现有岗位仍能提供稳定的现金流和行业背书，但成长曲线已明显放缓。在没有明确下一站的情况下离职，风险收益比偏低。",
  insights_and_actions:
    "1. 列出未来 6 个月必须达成的 2 个可量化职业目标\n2. 每周投入 5 小时进行外部市场调研与技能补强\n3. 与直属上级进行一次关于成长路径的坦诚对话\n4. 设定 90 天决策检查点，届时重新评估去留",
  core_truth:
    "你不是在逃避工作，而是在寻找一条能让你重新感到「在成长」的职业路径。",
};

const MOCK_DECISION: ChatApiResponse = {
  type: "decision",
  entire_analysis: "complete",
  analysis_completed: true,
  ...MOCK_DECISION_SUMMARY,
  decision_comparison: MOCK_COMPARISON_FINAL,
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

      decision_comparison: MOCK_COMPARISON_ROUND_1,

    };

  }



  if (assistantCount === 1) {

    return {

      type: "follow_up",

      strategy_id: "timeline_motivation",

      question:

        "你是否有明确的离职时间线？另外，促使你考虑离职的最直接触发事件是什么？（例如：直属领导变动、项目裁撤、长期加班等）",

      decision_comparison: MOCK_COMPARISON_ROUND_2,

    };

  }



  return MOCK_DECISION;

}



export function buildMockStreamAnswer(history: ChatHistoryItem[] = []): {

  partialAnswer: string | null;

  finalAnswer: string;

  response: ChatApiResponse;

} {

  const assistantCount = history.filter((h) => h.role === "assistant").length;



  if (assistantCount >= 2) {

    const partialAnswer = REPORT_GENERATION_SIGNAL;



    const finalAnswer = JSON.stringify({
      entire_analysis: "complete",
      analysis_completed: true,
      ...MOCK_DECISION_SUMMARY,
      decision_topic: MOCK_COMPARISON_FINAL.decisionTopic,
      option_A: MOCK_COMPARISON_FINAL.optionOne,
      option_B: MOCK_COMPARISON_FINAL.optionTwo,
      option_missing: MOCK_COMPARISON_FINAL.optionMissing,
    });


    return {

      partialAnswer,

      finalAnswer,

      response: MOCK_DECISION,

    };

  }



  const response = buildMockResponse(history);

  return {

    partialAnswer: null,

    finalAnswer: JSON.stringify(response),

    response,

  };

}

