import { appendMessage, getSession, setSessionActive } from "@/lib/chat/session-store";

export const SYSTEM_UNAVAILABLE_MESSAGE =
  "当前系统存在问题，请稍后再试，感谢您的理解";

export function applySystemUnavailableResponse(sessionId: string): void {
  const session = getSession(sessionId);
  if (!session) return;

  const lastMessage = session.messages[session.messages.length - 1];
  if (
    lastMessage?.role === "assistant" &&
    lastMessage.content === SYSTEM_UNAVAILABLE_MESSAGE
  ) {
    setSessionActive(sessionId);
    return;
  }

  setSessionActive(sessionId);
  appendMessage(sessionId, "assistant", SYSTEM_UNAVAILABLE_MESSAGE);
}
