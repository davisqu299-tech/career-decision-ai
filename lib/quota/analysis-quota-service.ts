"use client";

import type { QuotaSnapshot } from "@/types/decision";
import {
  QUOTA_CACHE_STORAGE_KEY,
  type QuotaCacheRecord,
} from "@/lib/quota/quota-cache";
import { VisitorService } from "@/lib/visitor/visitor-service";

export interface QuotaApiResponse {
  remaining: number;
  allowed: boolean;
  reset_time: string;
  first_visit_time: string;
  last_analysis_time: string | null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function writeCache(record: QuotaCacheRecord): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(QUOTA_CACHE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

function readCache(): QuotaCacheRecord | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(QUOTA_CACHE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuotaCacheRecord;
  } catch {
    return null;
  }
}

function toCacheRecord(data: QuotaApiResponse): QuotaCacheRecord {
  return {
    remaining: data.remaining,
    allowed: data.allowed,
    reset_time: data.reset_time,
    first_visit_time: data.first_visit_time,
    last_analysis_time: data.last_analysis_time,
    synced_at: Date.now(),
  };
}

export class AnalysisQuotaService {
  static getCachedQuota(): QuotaCacheRecord | null {
    return readCache();
  }

  static async fetchQuota(): Promise<QuotaApiResponse> {
    const browserUuid = VisitorService.getBrowserUuid();
    const url = new URL("/api/quota", window.location.origin);
    if (browserUuid) {
      url.searchParams.set("browser_uuid", browserUuid);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const message =
            (err as { error?: string }).error ?? "额度查询失败，请稍后重试";

          if (response.status >= 500 && attempt === 0) {
            lastError = new Error(message);
            continue;
          }

          throw new Error(message);
        }

        const data = (await response.json()) as QuotaApiResponse;
        writeCache(toCacheRecord(data));
        return data;
      } catch (error) {
        if (error instanceof Error) {
          lastError = error;
          if (attempt === 0 && error.message.includes("fetch")) {
            continue;
          }
          throw error;
        }
        throw new Error("额度查询失败，请稍后重试");
      }
    }

    throw lastError ?? new Error("额度查询失败，请稍后重试");
  }
  static syncFromResponse(quota: QuotaSnapshot): void {
    const cached = readCache();
    writeCache({
      remaining: quota.remaining,
      allowed: quota.remaining > 0,
      reset_time: quota.reset_time,
      first_visit_time: cached?.first_visit_time ?? new Date().toISOString(),
      last_analysis_time: cached?.last_analysis_time ?? null,
      synced_at: Date.now(),
    });
  }

  static syncFromApiResponse(data: QuotaApiResponse): void {
    writeCache(toCacheRecord(data));
  }

  static formatResetTime(resetTime: string): string {
    const reset = new Date(resetTime);
    const hours = reset.getHours().toString().padStart(2, "0");
    const minutes = reset.getMinutes().toString().padStart(2, "0");
    const now = new Date();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isTomorrow =
      reset.getFullYear() === tomorrow.getFullYear() &&
      reset.getMonth() === tomorrow.getMonth() &&
      reset.getDate() === tomorrow.getDate();

    if (isTomorrow) {
      return `明天 ${hours}:${minutes}`;
    }

    return `${reset.getMonth() + 1}月${reset.getDate()}日 ${hours}:${minutes}`;
  }

  static getBlockedMessages(resetTime: string): {
    title: string;
    detail: string;
  } {
    const formatted = this.formatResetTime(resetTime);
    return {
      title: "今日分析额度已用完，请明天再来。",
      detail: `分析额度将在${formatted}自动恢复。`,
    };
  }

  static getCompletionToast(remaining: number, resetTime: string): string | null {
    if (remaining === 1) {
      return "今日还剩最后 1 次完整分析额度。";
    }

    if (remaining === 0) {
      return "今日分析额度已用完，将于明天同一时间自动恢复。";
    }

    return null;
  }
}
