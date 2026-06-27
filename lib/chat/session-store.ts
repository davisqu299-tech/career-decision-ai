import type { DecisionSummary } from "@/types/decision";
import type { DecisionComparison } from "@/types/decision-comparison";
import type { Message, MessageRole, Session } from "@/types/chat";



const STORAGE_KEY = "career-decision-ai:current-session";



function isBrowser(): boolean {

  return typeof window !== "undefined";

}



function readCurrent(): Session | null {

  if (!isBrowser()) return null;

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    return JSON.parse(raw) as Session;

  } catch {

    return null;

  }

}



function writeCurrent(session: Session | null): void {

  if (!isBrowser()) return;

  if (session) {

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

  } else {

    localStorage.removeItem(STORAGE_KEY);

  }

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



  writeCurrent(session);

  return session;

}



export function getSession(id: string): Session | null {

  const session = readCurrent();

  if (!session || session.id !== id) return null;

  return session;

}



export function appendMessage(

  sessionId: string,

  role: MessageRole,

  content: string

): Session | null {

  const session = readCurrent();

  if (!session || session.id !== sessionId) return null;



  const message = createMessage(role, content);

  const updated: Session = {

    ...session,

    messages: [...session.messages, message],

    updatedAt: Date.now(),

  };

  writeCurrent(updated);

  return updated;

}



export function completeSession(

  sessionId: string,

  decisionSummary: DecisionSummary

): Session | null {

  const session = readCurrent();

  if (!session || session.id !== sessionId) return null;



  const updated: Session = {

    ...session,

    status: "completed",

    decisionSummary,

    updatedAt: Date.now(),

  };

  writeCurrent(updated);

  return updated;

}



export function setSessionGeneratingReport(sessionId: string): Session | null {

  const session = readCurrent();

  if (!session || session.id !== sessionId) return null;



  const updated: Session = {

    ...session,

    status: "generating_report",

    updatedAt: Date.now(),

  };

  writeCurrent(updated);

  return updated;

}



export function setSessionActive(sessionId: string): Session | null {

  const session = readCurrent();

  if (!session || session.id !== sessionId) return null;

  if (session.status === "active") return session;



  const updated: Session = {

    ...session,

    status: "active",

    updatedAt: Date.now(),

  };

  writeCurrent(updated);

  return updated;

}



export function setDifyConversationId(

  sessionId: string,

  conversationId: string

): Session | null {

  const session = readCurrent();

  if (!session || session.id !== sessionId) return null;



  const updated: Session = {

    ...session,

    difyConversationId: conversationId,

    updatedAt: Date.now(),

  };

  writeCurrent(updated);

  return updated;

}



export function setDecisionComparison(

  sessionId: string,

  comparison: DecisionComparison

): Session | null {

  const session = readCurrent();

  if (!session || session.id !== sessionId) return null;



  const updated: Session = {

    ...session,

    decisionComparison: comparison,

    updatedAt: Date.now(),

  };

  writeCurrent(updated);

  return updated;

}



function buildTitleFromMessage(content: string): string {

  return content.length > 30 ? `${content.slice(0, 30)}…` : content;

}



export function getLastUserMessageId(messages: Message[]): string | null {

  for (let i = messages.length - 1; i >= 0; i--) {

    if (messages[i].role === "user") {

      return messages[i].id;

    }

  }

  return null;

}



export function editLastUserMessage(

  sessionId: string,

  messageId: string,

  newContent: string

): Session | null {

  const session = readCurrent();

  if (!session || session.id !== sessionId) return null;



  const lastUserId = getLastUserMessageId(session.messages);

  if (!lastUserId || lastUserId !== messageId) return null;



  const index = session.messages.findIndex((m) => m.id === messageId);

  if (index === -1) return null;



  const truncated = session.messages.slice(0, index + 1);

  truncated[index] = { ...truncated[index], content: newContent };



  const { difyConversationId: _, decisionComparison: __, ...rest } = session;

  const updated: Session = {

    ...rest,

    messages: truncated,

    title: index === 0 ? buildTitleFromMessage(newContent) : session.title,

    updatedAt: Date.now(),

  };

  writeCurrent(updated);

  return updated;

}


