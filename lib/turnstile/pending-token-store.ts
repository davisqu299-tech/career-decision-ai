const PENDING_TOKEN_KEY_PREFIX = "career-decision-ai:turnstile-token:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(sessionId: string): string {
  return `${PENDING_TOKEN_KEY_PREFIX}${sessionId}`;
}

export function setPendingTurnstileToken(
  sessionId: string,
  token: string
): void {
  if (!isBrowser()) return;

  try {
    sessionStorage.setItem(storageKey(sessionId), token);
  } catch {
    // ignore
  }
}

export function consumePendingTurnstileToken(sessionId: string): string | null {
  if (!isBrowser()) return null;

  try {
    const key = storageKey(sessionId);
    const token = sessionStorage.getItem(key);
    if (token) {
      sessionStorage.removeItem(key);
    }
    return token;
  } catch {
    return null;
  }
}
