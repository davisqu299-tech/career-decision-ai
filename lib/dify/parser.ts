import type { ChatApiResponse, DecisionSummary } from "@/types/decision";
import type { DecisionComparison } from "@/types/decision-comparison";
import { DifyClientError } from "@/lib/dify/types";

function tryParseSingleJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function extractJsonObjectsByBraces(text: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  let i = 0;

  while (i < text.length) {
    while (i < text.length && text[i] !== "{") {
      i++;
    }
    if (i >= text.length) break;

    const start = i;
    let depth = 0;
    let inString = false;
    let escape = false;

    for (; i < text.length; i++) {
      const ch = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === "\\" && inString) {
        escape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const parsed = tryParseSingleJson(text.slice(start, i + 1));
          if (parsed) results.push(parsed);
          i++;
          break;
        }
      }
    }
  }

  return results;
}

function extractAllJsonObjects(answer: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(answer)) !== null) {
    const parsed = tryParseSingleJson(match[1]);
    if (parsed) results.push(parsed);
  }

  if (results.length > 0) return results;

  const byBraces = extractJsonObjectsByBraces(answer);
  if (byBraces.length > 0) return byBraces;

  const single = tryParseSingleJson(answer.trim());
  if (single) return [single];

  return [];
}

function mergeOutputs(objects: Record<string, unknown>[]): Record<string, unknown> {
  return Object.assign({}, ...objects);
}

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
    const objects = extractAllJsonObjects(outputs);
    if (objects.length > 0) {
      return mergeOutputs(objects);
    }

    const single = tryParseSingleJson(outputs);
    if (single) return single;

    throw new DifyClientError("无法解析工作流 outputs 字符串");
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

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const DECISION_FIELDS = [
  "final_choice",
  "core_logic",
  "insights_and_actions",
  "core_truth",
] as const;

function hasDecisionFields(obj: Record<string, unknown>): boolean {
  return DECISION_FIELDS.every((field) => {
    const value = obj[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function extractComparisonFields(
  obj: Record<string, unknown>
): DecisionComparison | undefined {
  const comparison: DecisionComparison = {
    decisionTopic: optionalString(obj.decision_topic),
    optionOne: optionalString(obj.option_A),
    optionTwo: optionalString(obj.option_B),
    optionMissing: optionalString(obj.option_missing),
  };

  if (
    !comparison.decisionTopic &&
    !comparison.optionOne &&
    !comparison.optionTwo &&
    !comparison.optionMissing
  ) {
    return undefined;
  }

  return comparison;
}

export function parseDecisionComparison(
  raw: Record<string, unknown>
): DecisionComparison | undefined {
  const fromTop = extractComparisonFields(raw);
  if (fromTop) return fromTop;

  const nested = unwrapNested(raw.decision_comparison);
  if (nested) return extractComparisonFields(nested);

  return undefined;
}

function parseDecisionSummary(raw: Record<string, unknown>): DecisionSummary | null {
  if (hasDecisionFields(raw)) {
    return {
      final_choice: String(raw.final_choice),
      core_logic: String(raw.core_logic),
      insights_and_actions: String(raw.insights_and_actions),
      core_truth: String(raw.core_truth),
    };
  }

  const nested = unwrapNested(raw.decision_summary);
  if (nested && hasDecisionFields(nested)) {
    return {
      final_choice: String(nested.final_choice),
      core_logic: String(nested.core_logic),
      insights_and_actions: String(nested.insights_and_actions),
      core_truth: String(nested.core_truth),
    };
  }

  return null;
}

function buildResponseFromOutputs(outputs: Record<string, unknown>): ChatApiResponse {
  const decisionComparison = parseDecisionComparison(outputs);
  const comparisonField = decisionComparison
    ? { decision_comparison: decisionComparison }
    : {};

  const question = optionalString(outputs.question);
  if (question) {
    return {
      type: "follow_up",
      strategy_id: String(outputs.strategy_id ?? "default"),
      question,
      ...comparisonField,
    };
  }

  const decisionSummary = parseDecisionSummary(outputs);
  if (decisionSummary) {
    return {
      type: "decision",
      decision_summary: decisionSummary,
      ...comparisonField,
    };
  }

  throw new DifyClientError(
    "无法识别工作流输出：缺少 question 或决策报告字段"
  );
}

export function parseChatAnswer(answer: string): ChatApiResponse {
  const objects = extractAllJsonObjects(answer);
  if (objects.length > 0) {
    return buildResponseFromOutputs(mergeOutputs(objects));
  }

  const text = answer.trim();
  if (!text) {
    throw new DifyClientError("Chatflow 返回内容为空");
  }

  return {
    type: "follow_up",
    strategy_id: "default",
    question: text,
  };
}

export function parseWorkflowOutput(raw: unknown): ChatApiResponse {
  const outputs = extractOutputs(raw);
  return buildResponseFromOutputs(outputs);
}
