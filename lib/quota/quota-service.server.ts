import { getDailyAnalysisLimit } from "@/lib/quota/constants";
import {
  applyQuotaResetIfDue,
  computeInitialResetTime,
  toQuotaStatus,
} from "@/lib/quota/reset-time";
import type { QuotaRepository } from "@/lib/quota/repository";
import { getSqliteQuotaRepository } from "@/lib/quota/sqlite-repository";
import type {
  ConsumeQuotaInput,
  QuotaConsumeResult,
  QuotaRecord,
  QuotaStatus,
} from "@/lib/quota/types";
import { QuotaExceededError } from "@/lib/quota/types";

function getRepository(): QuotaRepository {
  return getSqliteQuotaRepository();
}

function getOrCreateRecord(
  browserUuid: string,
  repository: QuotaRepository,
  now: Date = new Date()
): QuotaRecord {
  const dailyLimit = getDailyAnalysisLimit();
  const existing = repository.getByBrowserUuid(browserUuid);

  if (existing) {
    const reset = applyQuotaResetIfDue(existing, dailyLimit, now);
    if (
      reset.remainingAnalysisCount !== existing.remainingAnalysisCount ||
      reset.resetTime !== existing.resetTime
    ) {
      repository.upsert(reset);
    }
    return reset;
  }

  const firstVisitTime = now.toISOString();
  const created: QuotaRecord = {
    browserUuid,
    firstVisitTime,
    remainingAnalysisCount: dailyLimit,
    lastAnalysisTime: null,
    resetTime: computeInitialResetTime(now),
  };

  repository.upsert(created);
  return created;
}

export class QuotaService {
  static getStatus(browserUuid: string): QuotaStatus {
    const repository = getRepository();
    const record = getOrCreateRecord(browserUuid, repository);
    return toQuotaStatus(record, getDailyAnalysisLimit());
  }

  static assertAllowed(browserUuid: string): QuotaStatus {
    const status = this.getStatus(browserUuid);
    if (!status.allowed) {
      throw new QuotaExceededError(
        "今日分析额度已用完，请明天再来。",
        status.resetTime
      );
    }
    return status;
  }

  static consumeOne(input: ConsumeQuotaInput): QuotaConsumeResult {
    const repository = getRepository();
    const now = new Date();
    const record = getOrCreateRecord(input.browserUuid, repository, now);
    const status = toQuotaStatus(record, getDailyAnalysisLimit(), now);

    if (repository.hasConsumedSession(input.sessionId)) {
      return {
        remaining: status.remaining,
        resetTime: status.resetTime,
        consumed: false,
      };
    }

    if (status.remaining <= 0) {
      throw new QuotaExceededError(
        "今日分析额度已用完，请明天再来。",
        status.resetTime
      );
    }

    const consumedAt = now.toISOString();
    repository.markSessionConsumed(
      input.browserUuid,
      input.sessionId,
      consumedAt
    );

    const updated: QuotaRecord = {
      ...record,
      remainingAnalysisCount: status.remaining - 1,
      lastAnalysisTime: consumedAt,
    };

    repository.upsert(updated);

    const nextStatus = toQuotaStatus(updated, getDailyAnalysisLimit(), now);
    return {
      remaining: nextStatus.remaining,
      resetTime: nextStatus.resetTime,
      consumed: true,
    };
  }
}

export { QuotaExceededError };
