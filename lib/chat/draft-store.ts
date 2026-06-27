const HOME_DRAFT_KEY = "career-decision-ai:home-draft";
const CHAT_DRAFT_KEY_PREFIX = "career-decision-ai:chat-draft:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function chatDraftKey(sessionId: string): string {
  return `${CHAT_DRAFT_KEY_PREFIX}${sessionId}`;
}

export function getHomeDraft(): string {
  if (!isBrowser()) return "";
  try {
    return sessionStorage.getItem(HOME_DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setHomeDraft(text: string): void {
  if (!isBrowser()) return;
  try {
    if (text) {
      sessionStorage.setItem(HOME_DRAFT_KEY, text);
    } else {
      sessionStorage.removeItem(HOME_DRAFT_KEY);
    }
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function clearHomeDraft(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(HOME_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function getChatDraft(sessionId: string): string {
  if (!isBrowser()) return "";
  try {
    return sessionStorage.getItem(chatDraftKey(sessionId)) ?? "";
  } catch {
    return "";
  }
}

export function setChatDraft(sessionId: string, text: string): void {
  if (!isBrowser()) return;
  try {
    const key = chatDraftKey(sessionId);
    if (text) {
      sessionStorage.setItem(key, text);
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function clearChatDraft(sessionId: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(chatDraftKey(sessionId));
  } catch {
    // ignore
  }
}
