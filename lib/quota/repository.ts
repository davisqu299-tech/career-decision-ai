import type { QuotaRecord } from "@/lib/quota/types";

export interface QuotaRepository {
  getByBrowserUuid(browserUuid: string): QuotaRecord | null;
  upsert(record: QuotaRecord): QuotaRecord;
  hasConsumedSession(sessionId: string): boolean;
  markSessionConsumed(browserUuid: string, sessionId: string, consumedAt: string): void;
}
