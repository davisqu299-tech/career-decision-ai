const HOME_DRAFT_KEY = "career-decision-ai:home-draft";

function isBrowser(): boolean {
  return typeof window !== "undefined";
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
