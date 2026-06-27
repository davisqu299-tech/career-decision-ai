import type { ChatHistoryItem } from "@/types/chat";
import type { ChatApiResponse } from "@/types/decision";
import { buildMockResponse, buildMockStreamAnswer } from "@/lib/dify/mock";
import { parseChatAnswer, parseWorkflowOutput, resolveChatflowResponse } from "@/lib/dify/parser";
import { parseDifySseStream, type DifyAnswerUpdateHandler } from "@/lib/dify/stream";
import {
  DifyClientError,
  type DifyChatBlockingResponse,
  type DifyChatMessageRequest,
  type DifyWorkflowBlockingResponse,
  type DifyWorkflowRunRequest,
} from "@/lib/dify/types";

const DEFAULT_REQUEST_TIMEOUT_MS = 600_000;

function getRequestTimeoutMs(): number {
  const raw = process.env.DIFY_REQUEST_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_TIMEOUT_MS;
}

function getResponseMode(): "streaming" | "blocking" {
  const mode = process.env.DIFY_RESPONSE_MODE?.toLowerCase();
  return mode === "blocking" ? "blocking" : "streaming";
}

function formatDifyErrorText(status: number, text: string): string {
  if (text.startsWith("<!")) {
    if (status === 504) {
      return "Gateway time-out（建议使用 streaming 模式）";
    }
    return `HTTP ${status} HTML 错误页`;
  }
  return text.slice(0, 200) || "未知错误";
}

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

function getChatUrl(): string {
  return `${getApiBase()}/chat-messages`;
}

function getApiKey(): string {
  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    throw new DifyClientError("未配置 DIFY_API_KEY", 500);
  }
  return apiKey;
}

function getUserId(browserUuid: string): string {
  const userPrefix = process.env.DIFY_USER_PREFIX ?? "career-ai";
  return `${userPrefix}-${browserUuid}`;
}

function wrapFetchError(error: unknown, abortedByUser = false): never {
  if (error instanceof DifyClientError) throw error;
  if (error instanceof Error && error.name === "AbortError") {
    throw new DifyClientError(
      abortedByUser ? "请求已取消" : "Dify 请求超时",
      abortedByUser ? 499 : 504
    );
  }
  throw new DifyClientError(
    error instanceof Error ? error.message : "未知错误",
    502
  );
}

function mergeAbortSignals(
  signals: (AbortSignal | undefined)[]
): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => s !== undefined);
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

async function stopChatMessage(
  taskId: string,
  browserUuid: string
): Promise<void> {
  try {
    const response = await fetch(
      `${getChatUrl()}/${taskId}/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: getUserId(browserUuid) }),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(
        `[dify] stop task ${taskId} failed (${response.status}): ${text.slice(0, 200)}`
      );
    }
  } catch (error) {
    console.warn(
      `[dify] stop task ${taskId} error:`,
      error instanceof Error ? error.message : error
    );
  }
}

async function postDify<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getRequestTimeoutMs());

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new DifyClientError(
        `Dify API 错误 (${response.status}): ${formatDifyErrorText(response.status, text)}`,
        502
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    throw wrapFetchError(error);
  } finally {
    clearTimeout(timeout);
  }
}

async function postDifyStream(
  url: string,
  body: DifyChatMessageRequest,
  options?: {
    signal?: AbortSignal;
    sessionId?: string;
    browserUuid: string;
    onPartialAnswer?: DifyAnswerUpdateHandler;
  }
): Promise<{
  answer: string;
  conversationId: string;
  lastSeenQuestion?: string;
  lastSeenDecision?: Extract<ChatApiResponse, { type: "decision" }>;
}> {
  const timeoutController = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let taskId: string | undefined;
  let abortedByExternal = false;

  const externalSignal = options?.signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      abortedByExternal = true;
    } else {
      externalSignal.addEventListener(
        "abort",
        () => {
          abortedByExternal = true;
          timeoutController.abort();
        },
        { once: true }
      );
    }
  }

  const signal = mergeAbortSignals([
    timeoutController.signal,
    externalSignal,
  ]);

  const resetIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => timeoutController.abort(), getRequestTimeoutMs());
  };

  try {
    resetIdleTimer();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, response_mode: "streaming" }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new DifyClientError(
        `Dify API 错误 (${response.status}): ${formatDifyErrorText(response.status, text)}`,
        502
      );
    }

    const result = await parseDifySseStream(response, {
      onActivity: resetIdleTimer,
      onTaskId: (id) => {
        taskId = id;
      },
      onAnswerUpdate: options?.onPartialAnswer,
    });

    return {
      answer: result.answer,
      conversationId: result.conversationId,
      lastSeenQuestion: result.lastSeenQuestion,
      lastSeenDecision: result.lastSeenDecision,
    };
  } catch (error) {
    if (
      abortedByExternal &&
      taskId &&
      options?.browserUuid
    ) {
      void stopChatMessage(taskId, options.browserUuid);
    }
    throw wrapFetchError(error, abortedByExternal);
  } finally {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
  }
}

export interface RunChatflowResult {
  response: ChatApiResponse;
  conversationId: string;
}

export interface RunDifyStreamCallbacks {
  onPartialAnswer?: DifyAnswerUpdateHandler;
}

export async function runDifyWithStream(params: {
  sessionId: string;
  browserUuid: string;
  message: string;
  conversationId?: string;
  history?: ChatHistoryItem[];
  signal?: AbortSignal;
} & RunDifyStreamCallbacks): Promise<RunChatflowResult> {
  if (useMockMode()) {
    return runMockWithStream(params);
  }

  const mode = process.env.DIFY_APP_MODE ?? "chatflow";
  if (mode === "workflow") {
    const result = await runWorkflow(params);
    params.onPartialAnswer?.(JSON.stringify(result.response), JSON.stringify(result.response));
    return result;
  }

  const body: DifyChatMessageRequest = {
    inputs: {},
    query: params.message,
    response_mode: getResponseMode(),
    user: getUserId(params.browserUuid),
  };

  if (params.conversationId) {
    body.conversation_id = params.conversationId;
  }

  if (getResponseMode() === "streaming") {
    const streamed = await postDifyStream(getChatUrl(), body, {
      signal: params.signal,
      sessionId: params.sessionId,
      browserUuid: params.browserUuid,
      onPartialAnswer: params.onPartialAnswer,
    });

    if (!streamed.answer.trim()) {
      throw new DifyClientError("Chatflow 返回内容为空", 502);
    }

    return {
      response: resolveChatflowResponse(streamed.answer, {
        streamQuestion: streamed.lastSeenQuestion,
        streamDecision: streamed.lastSeenDecision ?? null,
      }),
      conversationId: streamed.conversationId,
    };
  }

  const json = await postDify<DifyChatBlockingResponse>(getChatUrl(), {
    ...body,
    response_mode: "blocking",
  });

  if (!json.answer?.trim()) {
    throw new DifyClientError("Chatflow 返回内容为空", 502);
  }

  params.onPartialAnswer?.(json.answer, json.answer);

  return {
    response: resolveChatflowResponse(json.answer),
    conversationId: json.conversation_id,
  };
}

async function runMockWithStream(params: {
  history?: ChatHistoryItem[];
  conversationId?: string;
  onPartialAnswer?: DifyAnswerUpdateHandler;
}): Promise<RunChatflowResult> {
  const { partialAnswer, finalAnswer, response } = buildMockStreamAnswer(
    params.history ?? []
  );

  if (partialAnswer) {
    params.onPartialAnswer?.(partialAnswer, partialAnswer);
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const accumulatedAnswer = partialAnswer + finalAnswer;
    params.onPartialAnswer?.(accumulatedAnswer, finalAnswer);
  } else {
    params.onPartialAnswer?.(finalAnswer, finalAnswer);
  }

  return {
    response,
    conversationId: params.conversationId ?? "",
  };
}

export async function runChatflow(params: {
  sessionId: string;
  browserUuid: string;
  message: string;
  conversationId?: string;
  history?: ChatHistoryItem[];
  signal?: AbortSignal;
}): Promise<RunChatflowResult> {
  if (useMockMode()) {
    return {
      response: buildMockResponse(params.history ?? []),
      conversationId: params.conversationId ?? "",
    };
  }

  const body: DifyChatMessageRequest = {
    inputs: {},
    query: params.message,
    response_mode: getResponseMode(),
    user: getUserId(params.browserUuid),
  };

  if (params.conversationId) {
    body.conversation_id = params.conversationId;
  }

  if (getResponseMode() === "streaming") {
    const streamed = await postDifyStream(getChatUrl(), body, {
      signal: params.signal,
      sessionId: params.sessionId,
      browserUuid: params.browserUuid,
    });

    if (!streamed.answer.trim()) {
      throw new DifyClientError("Chatflow 返回内容为空", 502);
    }

    return {
      response: resolveChatflowResponse(streamed.answer, {
        streamQuestion: streamed.lastSeenQuestion,
        streamDecision: streamed.lastSeenDecision ?? null,
      }),
      conversationId: streamed.conversationId,
    };
  }

  const json = await postDify<DifyChatBlockingResponse>(getChatUrl(), {
    ...body,
    response_mode: "blocking",
  });

  if (!json.answer?.trim()) {
    throw new DifyClientError("Chatflow 返回内容为空", 502);
  }

  return {
    response: resolveChatflowResponse(json.answer),
    conversationId: json.conversation_id,
  };
}

export async function runWorkflow(params: {
  sessionId: string;
  browserUuid: string;
  message: string;
  history?: ChatHistoryItem[];
  conversationId?: string;
}): Promise<RunChatflowResult> {
  const history = params.history ?? [];

  if (useMockMode()) {
    return {
      response: buildMockResponse(history),
      conversationId: params.conversationId ?? "",
    };
  }

  const body: DifyWorkflowRunRequest = {
    inputs: {
      query: buildQuery(params.message, history),
    },
    response_mode: "blocking",
    user: getUserId(params.browserUuid),
  };

  const json = await postDify<DifyWorkflowBlockingResponse>(
    getWorkflowUrl(),
    body
  );

  if (json.data?.status === "failed") {
    throw new DifyClientError(json.data.error ?? "工作流执行失败", 502);
  }

  return {
    response: parseWorkflowOutput(json),
    conversationId: params.conversationId ?? "",
  };
}

export async function runDify(params: {
  sessionId: string;
  browserUuid: string;
  message: string;
  history?: ChatHistoryItem[];
  conversationId?: string;
  signal?: AbortSignal;
}): Promise<RunChatflowResult> {
  const mode = process.env.DIFY_APP_MODE ?? "chatflow";

  if (mode === "workflow") {
    return runWorkflow(params);
  }

  return runChatflow({
    ...params,
    history: params.history,
  });
}
