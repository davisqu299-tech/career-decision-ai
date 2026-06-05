import type { ChatHistoryItem } from "@/types/chat";
import type { ChatApiResponse } from "@/types/decision";
import { buildMockResponse } from "@/lib/dify/mock";
import { parseWorkflowOutput } from "@/lib/dify/parser";
import {
  DifyClientError,
  type DifyWorkflowBlockingResponse,
  type DifyWorkflowRunRequest,
} from "@/lib/dify/types";

const REQUEST_TIMEOUT_MS = 60_000;

export function useMockMode(): boolean {
  return process.env.DIFY_USE_MOCK === "true";
}

export function buildQuery(
  message: string,
  history: ChatHistoryItem[] = []
): string {
  if (history.length === 0) {
    return message;
  }

  const transcript = history
    .map((h) => `${h.role === "user" ? "用户" : "助手"}: ${h.content}`)
    .join("\n");

  return `【对话历史】\n${transcript}\n\n【当前输入】\n${message}`;
}

function getApiBase(): string {
  const base = process.env.DIFY_API_BASE ?? "https://api.dify.ai/v1";
  return base.replace(/\/$/, "");
}

function getWorkflowUrl(): string {
  const base = getApiBase();
  const workflowId = process.env.DIFY_WORKFLOW_ID;
  if (workflowId) {
    return `${base}/workflows/${workflowId}/run`;
  }
  return `${base}/workflows/run`;
}

export async function runWorkflow(params: {
  sessionId: string;
  message: string;
  history?: ChatHistoryItem[];
}): Promise<ChatApiResponse> {
  const history = params.history ?? [];

  if (useMockMode()) {
    return buildMockResponse(history);
  }

  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    throw new DifyClientError("未配置 DIFY_API_KEY", 500);
  }

  const userPrefix = process.env.DIFY_USER_PREFIX ?? "career-ai";
  const body: DifyWorkflowRunRequest = {
    inputs: {
      query: buildQuery(params.message, history),
    },
    response_mode: "blocking",
    user: `${userPrefix}-${params.sessionId}`,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(getWorkflowUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new DifyClientError(
        `Dify API 错误 (${response.status}): ${text || response.statusText}`,
        502
      );
    }

    const json = (await response.json()) as DifyWorkflowBlockingResponse;

    if (json.data?.status === "failed") {
      throw new DifyClientError(
        json.data.error ?? "工作流执行失败",
        502
      );
    }

    return parseWorkflowOutput(json);
  } catch (error) {
    if (error instanceof DifyClientError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DifyClientError("Dify 请求超时", 504);
    }
    throw new DifyClientError(
      error instanceof Error ? error.message : "未知错误",
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}
