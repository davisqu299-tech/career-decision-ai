import type { ChatApiResponse, DecisionSummary } from "@/types/decision";
import type { DecisionComparison } from "@/types/decision-comparison";
import { DifyClientError } from "@/lib/dify/types";

export const OFF_TOPIC_REDIRECT_MESSAGE =
  "当前问题超出了荔枝AI的分析范围。我目前仅支持离职决策、Offer选择、职业规划等职业发展相关咨询，欢迎描述你的职业困惑，我会帮助你进行结构化分析。";

export const REPORT_GENERATION_SIGNAL = "进入报告生成";

const DECISION_FIELDS = [
  "final_choice",
  "core_logic",
  "insights_and_actions",
  "core_truth",
] as const;

function normalizeForMatch(text: string): string {
  return text.trim().replace(/[\s~～!！?？。，,.]/g, "");
}

export function isOffTopicRedirectMessage(text: string): boolean {
  const normalized = normalizeForMatch(text);
  if (!normalized) return false;

  const target = normalizeForMatch(OFF_TOPIC_REDIRECT_MESSAGE);
  return (
    normalized === target ||
    normalized.includes(normalizeForMatch("当前问题超出了荔枝AI的分析范围"))
  );
}

function findOffTopicRedirectMessage(
  raw: Record<string, unknown>
): string | null {
  for (const value of Object.values(raw)) {
    if (typeof value === "string" && isOffTopicRedirectMessage(value)) {
      return OFF_TOPIC_REDIRECT_MESSAGE;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = findOffTopicRedirectMessage(value as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  return null;
}

export function isReportGenerationSignal(text: string): boolean {
  const normalized = normalizeForMatch(text);
  if (!normalized) return false;

  const target = normalizeForMatch(REPORT_GENERATION_SIGNAL);
  return (
    normalized === target ||
    normalized.includes(target) ||
    text.includes(REPORT_GENERATION_SIGNAL)
  );
}

/** @deprecated Use isReportGenerationSignal */
export function isReportGenerationSignalValue(text: string): boolean {
  return isReportGenerationSignal(text);
}

function findReportGenerationSignal(
  raw: Record<string, unknown>
): string | null {
  for (const value of Object.values(raw)) {
    if (typeof value === "string" && isReportGenerationSignal(value)) {
      return REPORT_GENERATION_SIGNAL;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = findReportGenerationSignal(value as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  return null;
}

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

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractAnalysisFields(outputs: Record<string, unknown>): {
  entire_analysis?: string;
  analysis_completed?: boolean;
} {
  const entireAnalysis = optionalString(outputs.entire_analysis);
  if (!entireAnalysis) {
    return {};
  }

  return {
    entire_analysis: entireAnalysis,
    analysis_completed: entireAnalysis === "complete",
  };
}

function hasDecisionFields(obj: Record<string, unknown>): boolean {
  return DECISION_FIELDS.every((field) => {
    const value = obj[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function parseDecisionFields(
  raw: Record<string, unknown>
): DecisionSummary | null {
  if (!hasDecisionFields(raw)) {
    return null;
  }

  return {
    final_choice: String(raw.final_choice),
    core_logic: String(raw.core_logic),
    insights_and_actions: String(raw.insights_and_actions),
    core_truth: String(raw.core_truth),
  };
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

  for (const key of ["decision_comparison", "DECISION_COMPARISON"]) {
    const nested = raw[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const fromNested = extractComparisonFields(nested as Record<string, unknown>);
      if (fromNested) return fromNested;
    }
  }

  for (const value of Object.values(raw)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const fromNested = parseDecisionComparison(value as Record<string, unknown>);
      if (fromNested) return fromNested;
    }
  }

  return undefined;
}

function extractValidQuestion(obj: Record<string, unknown>): string | undefined {
  const question = optionalString(obj.question);
  if (!question) return undefined;
  if (isOffTopicRedirectMessage(question)) return OFF_TOPIC_REDIRECT_MESSAGE;
  if (isReportGenerationSignal(question)) return undefined;
  return question;
}

function findQuestionInObjects(
  objects: Record<string, unknown>[]
): string | undefined {
  for (const obj of objects) {
    const question = extractValidQuestion(obj);
    if (question) return question;
  }

  return undefined;
}

export function hasCompleteDecisionInText(text: string): boolean {
  const objects = extractAllJsonObjects(text);
  if (objects.length > 0) {
    return parseDecisionFields(mergeOutputs(objects)) !== null;
  }

  return DECISION_FIELDS.every((field) => {
    const pattern = new RegExp(`"${field}"\\s*:\\s*"[^"]+"`);
    return pattern.test(text);
  });
}

/** @deprecated Use hasCompleteDecisionInText */
export const hasCompleteDecisionInAnswer = hasCompleteDecisionInText;

export function tryDetectReportGeneratingFromPartialAnswer(
  answer: string
): boolean {
  if (!isReportGenerationSignal(answer)) {
    return false;
  }

  if (hasCompleteDecisionInText(answer)) {
    return false;
  }

  return true;
}

export function tryDetectReportGeneratingDelta(
  prevAnswer: string,
  nextAnswer: string
): boolean {
  const signalNewlyAppeared =
    isReportGenerationSignal(nextAnswer) && !isReportGenerationSignal(prevAnswer);

  const signalInDelta =
    nextAnswer.length > prevAnswer.length &&
    isReportGenerationSignal(nextAnswer.slice(prevAnswer.length));

  if (!signalNewlyAppeared && !signalInDelta) {
    return false;
  }

  return !hasCompleteDecisionInText(nextAnswer);
}

export function tryParseDecisionComparisonFromPartial(
  answer: string
): DecisionComparison | undefined {
  const objects = extractAllJsonObjects(answer);
  if (objects.length === 0) {
    return undefined;
  }

  return parseDecisionComparison(mergeOutputs(objects));
}

export function tryParseDecisionFromPartial(
  answer: string
): Extract<ChatApiResponse, { type: "decision" }> | null {
  const objects = extractAllJsonObjects(answer);
  if (objects.length === 0) {
    return null;
  }

  const merged = mergeOutputs(objects);
  const decisionFields = parseDecisionFields(merged);
  if (!decisionFields) {
    return null;
  }

  const decisionComparison = parseDecisionComparison(merged);
  const analysisFields = extractAnalysisFields(merged);

  return {
    type: "decision",
    ...decisionFields,
    ...(decisionComparison ? { decision_comparison: decisionComparison } : {}),
    ...analysisFields,
  };
}

export function tryParseFollowUpQuestionFromPartial(
  answer: string
): string | undefined {
  const objects = extractAllJsonObjects(answer);
  if (objects.length === 0) {
    return undefined;
  }

  return findQuestionInObjects(objects);
}

function buildResponseFromOutputs(
  outputs: Record<string, unknown>,
  objects: Record<string, unknown>[] = [outputs]
): ChatApiResponse {
  const decisionComparison = parseDecisionComparison(outputs);
  const comparisonField = decisionComparison
    ? { decision_comparison: decisionComparison }
    : {};
  const analysisFields = extractAnalysisFields(outputs);

  const offTopicMessage = findOffTopicRedirectMessage(outputs);
  if (offTopicMessage) {
    return {
      type: "follow_up",
      strategy_id: String(outputs.strategy_id ?? "default"),
      question: offTopicMessage,
      ...comparisonField,
      ...analysisFields,
    };
  }

  const decisionFields = parseDecisionFields(outputs);
  if (decisionFields) {
    return {
      type: "decision",
      ...decisionFields,
      ...comparisonField,
      ...analysisFields,
    };
  }

  const question =
    extractValidQuestion(outputs) ?? findQuestionInObjects(objects);
  if (question) {
    return {
      type: "follow_up",
      strategy_id: String(outputs.strategy_id ?? "default"),
      question,
      ...comparisonField,
      ...analysisFields,
    };
  }

  if (findReportGenerationSignal(outputs)) {
    return {
      type: "report_generating",
      ...comparisonField,
      ...analysisFields,
    };
  }

  if (isReportGenerationSignal(JSON.stringify(outputs))) {
    return {
      type: "report_generating",
      ...comparisonField,
      ...analysisFields,
    };
  }

  if (decisionComparison) {
    const recoveredQuestion = findQuestionInObjects(objects);
    if (recoveredQuestion) {
      return {
        type: "follow_up",
        strategy_id: String(outputs.strategy_id ?? "default"),
        question: recoveredQuestion,
        ...comparisonField,
        ...analysisFields,
      };
    }
  }

  throw new DifyClientError(
    "无法识别工作流输出：缺少 question 或决策报告字段"
  );
}

function buildResponseFromAnswerObjects(
  objects: Record<string, unknown>[]
): ChatApiResponse {
  if (objects.length === 0) {
    throw new DifyClientError("Chatflow 返回内容为空");
  }

  const merged = mergeOutputs(objects);

  try {
    return buildResponseFromOutputs(merged, objects);
  } catch (error) {
    const recoveredQuestion = findQuestionInObjects(objects);
    if (recoveredQuestion) {
      const decisionComparison = parseDecisionComparison(merged);
      return {
        type: "follow_up",
        strategy_id: String(merged.strategy_id ?? "default"),
        question: recoveredQuestion,
        ...(decisionComparison
          ? { decision_comparison: decisionComparison }
          : {}),
        ...extractAnalysisFields(merged),
      };
    }

    throw error;
  }
}

export function parseChatAnswer(answer: string): ChatApiResponse {
  const text = answer.trim();
  if (!text) {
    throw new DifyClientError("Chatflow 返回内容为空");
  }

  if (isOffTopicRedirectMessage(text)) {
    return {
      type: "follow_up",
      strategy_id: "default",
      question: OFF_TOPIC_REDIRECT_MESSAGE,
    };
  }

  const objects = extractAllJsonObjects(answer);
  if (objects.length > 0) {
    const response = buildResponseFromAnswerObjects(objects);

    if (response.type === "decision" || response.type === "follow_up") {
      return response;
    }

    if (
      response.type === "report_generating" &&
      !isReportGenerationSignal(text) &&
      !findReportGenerationSignal(mergeOutputs(objects))
    ) {
      const recoveredQuestion = findQuestionInObjects(objects);
      if (recoveredQuestion) {
        return {
          type: "follow_up",
          strategy_id: "default",
          question: recoveredQuestion,
          ...(response.decision_comparison
            ? { decision_comparison: response.decision_comparison }
            : {}),
        };
      }
    }

    return response;
  }

  if (isReportGenerationSignal(text) && !hasCompleteDecisionInText(text)) {
    return { type: "report_generating" };
  }

  return {
    type: "follow_up",
    strategy_id: "default",
    question: text,
  };
}

/**
 * Parse Dify answer with fallback to question/decision captured during streaming.
 * Handles message_replace dropping JSON from the final answer string.
 */
export function resolveChatflowResponse(
  answer: string,
  streamMeta?: {
    streamQuestion?: string;
    streamDecision?: Extract<ChatApiResponse, { type: "decision" }> | null;
  }
): ChatApiResponse {
  const streamQuestion = streamMeta?.streamQuestion;
  const tryDecisionRecovery = (): Extract<
    ChatApiResponse,
    { type: "decision" }
  > | null =>
    streamMeta?.streamDecision ?? tryParseDecisionFromPartial(answer);

  try {
    const response = parseChatAnswer(answer);

    if (response.type === "follow_up" || response.type === "decision") {
      return response;
    }

    const recoveredDecision = tryDecisionRecovery();
    if (recoveredDecision) {
      return recoveredDecision;
    }

    if (streamQuestion && response.type !== "report_generating") {
      const decisionComparison =
        response.decision_comparison ??
        tryParseDecisionComparisonFromPartial(answer);
      return {
        type: "follow_up",
        strategy_id: "default",
        question: streamQuestion,
        ...(decisionComparison
          ? { decision_comparison: decisionComparison }
          : {}),
      };
    }

    return response;
  } catch (error) {
    const recoveredDecision = tryDecisionRecovery();
    if (recoveredDecision) {
      return recoveredDecision;
    }

    const question =
      streamQuestion ?? tryParseFollowUpQuestionFromPartial(answer);
    if (question) {
      const decisionComparison = tryParseDecisionComparisonFromPartial(answer);
      return {
        type: "follow_up",
        strategy_id: "default",
        question,
        ...(decisionComparison
          ? { decision_comparison: decisionComparison }
          : {}),
      };
    }
    throw error;
  }
}

export function parseWorkflowOutput(raw: unknown): ChatApiResponse {
  const outputs = extractOutputs(raw);
  const objects = extractAllJsonObjects(
    typeof outputs === "object" ? JSON.stringify(outputs) : String(outputs)
  );
  if (objects.length > 0) {
    return buildResponseFromAnswerObjects(objects);
  }
  return buildResponseFromOutputs(outputs, [outputs]);
}

export function decisionResponseToSummary(
  data: Extract<ChatApiResponse, { type: "decision" }>
): DecisionSummary {
  return {
    final_choice: data.final_choice,
    core_logic: data.core_logic,
    insights_and_actions: data.insights_and_actions,
    core_truth: data.core_truth,
  };
}
