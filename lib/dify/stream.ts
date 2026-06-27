import { DifyClientError, type DifyChatStreamEvent } from "@/lib/dify/types";
import type { ChatApiResponse } from "@/types/decision";
import {
  tryParseDecisionFromPartial,
  tryParseFollowUpQuestionFromPartial,
} from "@/lib/dify/parser";

export interface DifyStreamResult {
  answer: string;
  conversationId: string;
  taskId?: string;
  /** Question captured from any stream chunk; survives message_replace wipes */
  lastSeenQuestion?: string;
  /** Decision captured from any stream chunk; survives message_replace wipes */
  lastSeenDecision?: Extract<ChatApiResponse, { type: "decision" }>;
}

export type DifyAnswerUpdateHandler = (
  answer: string,
  delta: string
) => void;

interface StreamState extends DifyStreamResult {}

function captureQuestionFromText(
  state: StreamState,
  text: string,
  source: string
): void {
  const question = tryParseFollowUpQuestionFromPartial(text);
  if (question) {
    state.lastSeenQuestion = question;
    // #region agent log
    fetch("http://127.0.0.1:7255/ingest/63f3ec50-0b6a-42df-9327-acdddaa35630", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "155530",
      },
      body: JSON.stringify({
        sessionId: "155530",
        location: "stream.ts:captureQuestion",
        message: "question captured from stream chunk",
        data: {
          source,
          questionLen: question.length,
          textLen: text.length,
          hasComparison: /"decision_topic"\s*:/.test(text),
        },
        timestamp: Date.now(),
        hypothesisId: "H2-H4",
      }),
    }).catch(() => {});
    // #endregion
  }
}

function captureDecisionFromText(
  state: StreamState,
  text: string,
  source: string
): void {
  const decision = tryParseDecisionFromPartial(text);
  if (decision) {
    state.lastSeenDecision = decision;
    // #region agent log
    fetch("http://127.0.0.1:7255/ingest/63f3ec50-0b6a-42df-9327-acdddaa35630", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "155530",
      },
      body: JSON.stringify({
        sessionId: "155530",
        location: "stream.ts:captureDecision",
        message: "decision captured from stream chunk",
        data: { source, textLen: text.length },
        timestamp: Date.now(),
        hypothesisId: "H1-H4",
      }),
    }).catch(() => {});
    // #endregion
  }
}

function captureFromText(state: StreamState, text: string, source: string): void {
  captureQuestionFromText(state, text, source);
  captureDecisionFromText(state, text, source);
}

function notifyAnswerUpdate(
  prevAnswer: string,
  nextAnswer: string,
  onAnswerUpdate?: DifyAnswerUpdateHandler
): void {
  if (!onAnswerUpdate) return;

  if (nextAnswer.length >= prevAnswer.length) {
    const delta = nextAnswer.slice(prevAnswer.length);
    onAnswerUpdate(nextAnswer, delta.length > 0 ? delta : nextAnswer);
    return;
  }

  onAnswerUpdate(nextAnswer, nextAnswer);
}

function extractNodeFinishedChunks(event: DifyChatStreamEvent): string[] {
  const data = event.data;
  if (!data) return [];

  const chunks: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      chunks.push(value);
    }
  };

  push(data.answer);
  push(data.text);

  const outputs = data.outputs;
  push(outputs);

  if (outputs && typeof outputs === "object" && !Array.isArray(outputs)) {
    for (const value of Object.values(outputs)) {
      push(value);
    }
  }

  return [...new Set(chunks)];
}

function extractNodeFinishedText(event: DifyChatStreamEvent): string | null {
  const chunks = extractNodeFinishedChunks(event);
  if (chunks.length === 0) return null;
  return chunks.join("");
}

function appendToAnswer(
  state: StreamState,
  chunk: string,
  onAnswerUpdate?: DifyAnswerUpdateHandler
): void {
  captureFromText(state, chunk, "append-chunk");
  const prevAnswer = state.answer;
  state.answer += chunk;
  captureFromText(state, state.answer, "append-full");
  notifyAnswerUpdate(prevAnswer, state.answer, onAnswerUpdate);
}

function handleStreamEvent(
  event: DifyChatStreamEvent,
  state: StreamState,
  onAnswerUpdate?: DifyAnswerUpdateHandler
): void {
  if (event.task_id) {
    state.taskId = event.task_id;
  }

  if (event.conversation_id) {
    state.conversationId = event.conversation_id;
  }

  switch (event.event) {
    case "message":
    case "agent_message":
      if (event.answer) {
        appendToAnswer(state, event.answer, onAnswerUpdate);
      }
      break;
    case "message_replace":
      if (event.answer) {
        const prevAnswer = state.answer;
        captureFromText(state, prevAnswer, "message_replace-prev");
        captureFromText(state, event.answer, "message_replace-new");
        state.answer = event.answer;
        // #region agent log
        fetch(
          "http://127.0.0.1:7255/ingest/63f3ec50-0b6a-42df-9327-acdddaa35630",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "155530",
            },
            body: JSON.stringify({
              sessionId: "155530",
              location: "stream.ts:message_replace",
              message: "message_replace event",
              data: {
                prevLen: prevAnswer.length,
                newLen: event.answer.length,
                prevHasQuestion: /"question"\s*:/.test(prevAnswer),
                newHasQuestion: /"question"\s*:/.test(event.answer),
                lastSeenQuestionSet: !!state.lastSeenQuestion,
              },
              timestamp: Date.now(),
              hypothesisId: "H1",
            }),
          }
        ).catch(() => {});
        // #endregion
        notifyAnswerUpdate(prevAnswer, state.answer, onAnswerUpdate);
      }
      break;
    case "node_finished":
    case "workflow_node_finished": {
      const chunks = extractNodeFinishedChunks(event);
      for (const chunk of chunks) {
        captureFromText(state, chunk, "node_finished-chunk");
      }
      const combined = chunks.join("");
      if (combined) {
        appendToAnswer(state, combined, onAnswerUpdate);
      }
      break;
    }
    case "text_chunk":
      if (event.answer) {
        appendToAnswer(state, event.answer, onAnswerUpdate);
      }
      break;
    case "message_end":
      break;
    case "error":
      throw new DifyClientError(
        event.message ?? "Dify streaming 错误",
        event.status ?? 502
      );
    case "ping":
      break;
    default:
      break;
  }
}

function parseSseDataLine(line: string): DifyChatStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) {
    return null;
  }

  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") {
    return null;
  }

  try {
    return JSON.parse(payload) as DifyChatStreamEvent;
  } catch {
    return null;
  }
}

function isPingLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "event: ping" || trimmed === "ping";
}

export async function parseDifySseStream(
  response: Response,
  options?: {
    onActivity?: () => void;
    onTaskId?: (taskId: string) => void;
    onAnswerUpdate?: DifyAnswerUpdateHandler;
  }
): Promise<DifyStreamResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new DifyClientError("Dify streaming 响应体为空", 502);
  }

  const decoder = new TextDecoder();
  const state: StreamState = { answer: "", conversationId: "" };
  let buffer = "";

  const processLine = (line: string): void => {
    if (isPingLine(line)) {
      options?.onActivity?.();
      return;
    }

    const event = parseSseDataLine(line);
    if (event) {
      options?.onActivity?.();
      if (event.task_id) {
        options?.onTaskId?.(event.task_id);
      }
      handleStreamEvent(event, state, options?.onAnswerUpdate);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      options?.onActivity?.();
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }
    }

    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        processLine(line);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return state;
}
