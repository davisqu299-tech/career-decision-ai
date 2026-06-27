export const QUOTA_CACHE_STORAGE_KEY = "career-decision-ai:quota_cache";

export interface QuotaCacheRecord {
  remaining: number;
  allowed: boolean;
  reset_time: string;
  first_visit_time: string;
  last_analysis_time: string | null;
  synced_at: number;
}
