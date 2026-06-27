import { RESET_INTERVAL_MS } from "@/lib/quota/constants";
import type { QuotaRecord } from "@/lib/quota/types";

export function computeInitialResetTime(firstVisitTime: Date): string {
  return new Date(firstVisitTime.getTime() + RESET_INTERVAL_MS).toISOString();
}

export function advanceResetTime(
  firstVisitTime: string,
  currentResetTime: string,
  now: Date = new Date()
): string {
  const firstMs = new Date(firstVisitTime).getTime();
  let resetMs = new Date(currentResetTime).getTime();

  while (now.getTime() >= resetMs) {
    resetMs += RESET_INTERVAL_MS;
  }

  if (resetMs <= firstMs + RESET_INTERVAL_MS) {
    return new Date(firstMs + RESET_INTERVAL_MS).toISOString();
  }

  return new Date(resetMs).toISOString();
}

export function applyQuotaResetIfDue(
  record: QuotaRecord,
  dailyLimit: number,
  now: Date = new Date()
): QuotaRecord {
  const nowMs = now.getTime();
  const resetMs = new Date(record.resetTime).getTime();

  if (nowMs < resetMs) {
    return record;
  }

  const nextResetTime = advanceResetTime(
    record.firstVisitTime,
    record.resetTime,
    now
  );

  return {
    ...record,
    remainingAnalysisCount: dailyLimit,
    resetTime: nextResetTime,
  };
}

export function toQuotaStatus(
  record: QuotaRecord,
  dailyLimit: number,
  now: Date = new Date()
): import("@/lib/quota/types").QuotaStatus {
  const normalized = applyQuotaResetIfDue(record, dailyLimit, now);

  return {
    remaining: normalized.remainingAnalysisCount,
    allowed: normalized.remainingAnalysisCount > 0,
    resetTime: normalized.resetTime,
    firstVisitTime: normalized.firstVisitTime,
    lastAnalysisTime: normalized.lastAnalysisTime,
  };
}
