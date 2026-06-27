export interface QuotaRecord {
  browserUuid: string;
  firstVisitTime: string;
  remainingAnalysisCount: number;
  lastAnalysisTime: string | null;
  resetTime: string;
}

export interface QuotaStatus {
  remaining: number;
  allowed: boolean;
  resetTime: string;
  firstVisitTime: string;
  lastAnalysisTime: string | null;
}

export interface QuotaConsumeResult {
  remaining: number;
  resetTime: string;
  consumed: boolean;
}

export type ConsumeEvent = "analysis_completed";

export interface ConsumeQuotaInput {
  browserUuid: string;
  sessionId: string;
  event: ConsumeEvent;
}

export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public resetTime: string
  ) {
    super(message);
    this.name = "QuotaExceededError";
  }
}
