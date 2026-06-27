export const DEFAULT_DAILY_ANALYSIS_LIMIT = 3;
export const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function getDailyAnalysisLimit(): number {
  const raw = process.env.QUOTA_DAILY_LIMIT;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DAILY_ANALYSIS_LIMIT;
}
