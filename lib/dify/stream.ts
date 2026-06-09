import { DifyClientError, type DifyChatStreamEvent } from "@/lib/dify/types";

export interface DifyStreamResult {
  answer: string;
  conversationId: string;
}

function handleStreamEvent(
  event: DifyChatStreamEvent,
  state: { answer: string; conversationId: string }
): void {
  if (event.conversation_id) {
    state.conversationId = event.conversation_id;
  }

  switch (event.event) {
    case "message":
    case "agent_message":
      if (event.answer) {
        state.answer += event.answer;
      }
      break;
    case "message_replace":
      if (event.answer) {
        state.answer = event.answer;
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
  options?: { onActivity?: () => void }
): Promise<DifyStreamResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new DifyClientError("Dify streaming 响应体为空", 502);
  }

  const decoder = new TextDecoder();
  const state = { answer: "", conversationId: "" };
  let buffer = "";

  const processLine = (line: string): void => {
    if (isPingLine(line)) {
      options?.onActivity?.();
      return;
    }

    const event = parseSseDataLine(line);
    if (event) {
      options?.onActivity?.();
      handleStreamEvent(event, state);
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
