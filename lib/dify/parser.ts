import type { ChatApiResponse } from "@/types/decision";
import { DifyClientError } from "@/lib/dify/types";

function extractOutputs(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    throw new DifyClientError("工作流返回为空或格式无效");
  }

  const obj = raw as Record<string, unknown>;

  if (obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if (data.outputs) {
      return normalizeOutputs(data.outputs);
    }
  }

  if (obj.outputs) {
    return normalizeOutputs(obj.outputs);
  }

  return obj;
}

function normalizeOutputs(outputs: unknown): Record<string, unknown> {
  if (typeof outputs === "string") {
    try {
      return JSON.parse(outputs) as Record<string, unknown>;
    } catch {
      throw new DifyClientError("无法解析工作流 outputs 字符串");
    }
  }
  if (typeof outputs === "object" && outputs !== null) {
    return outputs as Record<string, unknown>;
  }
  throw new DifyClientError("工作流 outputs 格式无效");
}

function unwrapNested(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function parseWorkflowOutput(raw: unknown): ChatApiResponse {
  const outputs = extractOutputs(raw);

  if (outputs.decision_summary) {
    const summary = unwrapNested(outputs.decision_summary);
    if (!summary) {
      throw new DifyClientError("decision_summary 格式无效");
    }

    const conclusion = unwrapNested(summary.conclusion);
    const reasoning = unwrapNested(summary.reasoning);
    const insights = unwrapNested(summary.insights_and_actions);
    const coreTruth = unwrapNested(summary.core_truth);

    if (
      !conclusion?.final_choice ||
      !reasoning?.core_logic ||
      !insights?.deep_insight ||
      !coreTruth?.problem_essence
    ) {
      throw new DifyClientError("决策报告字段不完整");
    }

    return {
      type: "decision",
      decision_summary: {
        conclusion: { final_choice: String(conclusion.final_choice) },
        reasoning: { core_logic: String(reasoning.core_logic) },
        insights_and_actions: {
          deep_insight: String(insights.deep_insight),
        },
        core_truth: {
          problem_essence: String(coreTruth.problem_essence),
        },
      },
    };
  }

  if (outputs.question) {
    return {
      type: "follow_up",
      strategy_id: String(outputs.strategy_id ?? "default"),
      question: String(outputs.question),
    };
  }

  throw new DifyClientError(
    "无法识别工作流输出：缺少 question 或 decision_summary"
  );
}
