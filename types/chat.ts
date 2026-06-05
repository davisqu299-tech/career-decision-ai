import type { DecisionSummary } from "@/types/decision";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
}

export type SessionStatus = "active" | "completed";

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  status: SessionStatus;
  decisionSummary?: DecisionSummary;
  createdAt: number;
  updatedAt: number;
}

export interface ChatHistoryItem {
  role: MessageRole;
  content: string;
}
