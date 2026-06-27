import type { ChatStreamServerEvent } from "@/types/chat-stream";

const encoder = new TextEncoder();

export function encodeSseEvent(event: ChatStreamServerEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function* readSseStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<ChatStreamServerEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const eventEnd = buffer.indexOf("\n\n");
        if (eventEnd === -1) break;

        const rawEvent = buffer.slice(0, eventEnd);
        buffer = buffer.slice(eventEnd + 2);

        for (const line of rawEvent.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const payload = trimmed.slice(5).trim();
          if (!payload) continue;

          yield JSON.parse(payload) as ChatStreamServerEvent;
        }
      }
    }

    const trailing = buffer.trim();
    if (trailing) {
      for (const line of trailing.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload) continue;

        yield JSON.parse(payload) as ChatStreamServerEvent;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
