import type { DecisionSummary } from "@/types/decision";
import type { Message, MessageRole, Session } from "@/types/chat";

const STORAGE_KEY = "career-decision-ai:sessions";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readAll(): Session[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

function writeAll(sessions: Session[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function generateId(): string {
  if (isBrowser() && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createMessage(role: MessageRole, content: string): Message {
  return {
    id: generateId(),
    role,
    content,
    createdAt: Date.now(),
  };
}

export function createSession(firstMessage: string): Session {
  const message = createMessage("user", firstMessage);
  const title =
    firstMessage.length > 30
      ? `${firstMessage.slice(0, 30)}…`
      : firstMessage;

  const session: Session = {
    id: generateId(),
    title,
    messages: [message],
    status: "active",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sessions = readAll();
  sessions.unshift(session);
  writeAll(sessions);
  return session;
}

export function getSession(id: string): Session | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function listSessions(): Session[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function appendMessage(
  sessionId: string,
  role: MessageRole,
  content: string
): Session | null {
  const sessions = readAll();
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index === -1) return null;

  const message = createMessage(role, content);
  sessions[index] = {
    ...sessions[index],
    messages: [...sessions[index].messages, message],
    updatedAt: Date.now(),
  };
  writeAll(sessions);
  return sessions[index];
}

export function completeSession(
  sessionId: string,
  decisionSummary: DecisionSummary
): Session | null {
  const sessions = readAll();
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index === -1) return null;

  sessions[index] = {
    ...sessions[index],
    status: "completed",
    decisionSummary,
    updatedAt: Date.now(),
  };
  writeAll(sessions);
  return sessions[index];
}

export function deleteSession(sessionId: string): void {
  writeAll(readAll().filter((s) => s.id !== sessionId));
}
