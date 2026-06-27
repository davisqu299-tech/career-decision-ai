import {
  BROWSER_UUID_COOKIE_MAX_AGE_SECONDS,
  BROWSER_UUID_COOKIE_NAME,
  BROWSER_UUID_STORAGE_KEY,
} from "@/lib/visitor/constants";
import type { VisitorIdentity } from "@/lib/visitor/types";
import { generateUuidV4, isValidUuidV4 } from "@/lib/visitor/uuid";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!match) return null;

  const value = decodeURIComponent(match.slice(name.length + 1));
  return value || null;
}

function writeCookie(name: string, value: string): void {
  if (!isBrowser()) return;

  const maxAge = BROWSER_UUID_COOKIE_MAX_AGE_SECONDS;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Anonymous visitor identity for the current browser.
 * Persists UUID in localStorage + cookie (365 days).
 */
export class VisitorService {
  static initialize(): VisitorIdentity {
    const browserUuid = this.getOrCreateBrowserUuid();
    return { browserUuid };
  }

  static getBrowserUuid(): string {
    return this.getOrCreateBrowserUuid();
  }

  static getIdentity(): VisitorIdentity {
    return { browserUuid: this.getBrowserUuid() };
  }

  private static getOrCreateBrowserUuid(): string {
    if (!isBrowser()) {
      return "";
    }

    const existing = this.readExistingUuid();
    if (existing) {
      this.persistUuid(existing);
      return existing;
    }

    const created = generateUuidV4();
    this.persistUuid(created);
    return created;
  }

  private static readExistingUuid(): string | null {
    if (!isBrowser()) return null;

    try {
      const fromStorage = localStorage.getItem(BROWSER_UUID_STORAGE_KEY);
      if (fromStorage && isValidUuidV4(fromStorage)) {
        return fromStorage;
      }
    } catch {
      // ignore private mode / quota errors
    }

    const fromCookie = readCookie(BROWSER_UUID_COOKIE_NAME);
    if (fromCookie && isValidUuidV4(fromCookie)) {
      return fromCookie;
    }

    return null;
  }

  private static persistUuid(uuid: string): void {
    if (!isBrowser()) return;

    try {
      localStorage.setItem(BROWSER_UUID_STORAGE_KEY, uuid);
    } catch {
      // ignore private mode / quota errors
    }

    writeCookie(BROWSER_UUID_COOKIE_NAME, uuid);
  }
}
