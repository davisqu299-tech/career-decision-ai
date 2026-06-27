import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { QuotaRepository } from "@/lib/quota/repository";
import type { QuotaRecord } from "@/lib/quota/types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS visitor_quota (
  browser_uuid TEXT PRIMARY KEY,
  first_visit_time TEXT NOT NULL,
  remaining_analysis_count INTEGER NOT NULL,
  last_analysis_time TEXT,
  reset_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quota_consume_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  browser_uuid TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  consumed_at TEXT NOT NULL
);
`;

function mapRow(row: Record<string, unknown>): QuotaRecord {
  return {
    browserUuid: String(row.browser_uuid),
    firstVisitTime: String(row.first_visit_time),
    remainingAnalysisCount: Number(row.remaining_analysis_count),
    lastAnalysisTime: row.last_analysis_time
      ? String(row.last_analysis_time)
      : null,
    resetTime: String(row.reset_time),
  };
}

export class SqliteQuotaRepository implements QuotaRepository {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.db.exec(SCHEMA);
  }

  getByBrowserUuid(browserUuid: string): QuotaRecord | null {
    const row = this.db
      .prepare(
        `SELECT browser_uuid, first_visit_time, remaining_analysis_count,
                last_analysis_time, reset_time
         FROM visitor_quota WHERE browser_uuid = ?`
      )
      .get(browserUuid) as Record<string, unknown> | undefined;

    return row ? mapRow(row) : null;
  }

  upsert(record: QuotaRecord): QuotaRecord {
    this.db
      .prepare(
        `INSERT INTO visitor_quota (
           browser_uuid, first_visit_time, remaining_analysis_count,
           last_analysis_time, reset_time
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(browser_uuid) DO UPDATE SET
           first_visit_time = excluded.first_visit_time,
           remaining_analysis_count = excluded.remaining_analysis_count,
           last_analysis_time = excluded.last_analysis_time,
           reset_time = excluded.reset_time`
      )
      .run(
        record.browserUuid,
        record.firstVisitTime,
        record.remainingAnalysisCount,
        record.lastAnalysisTime,
        record.resetTime
      );

    return record;
  }

  hasConsumedSession(sessionId: string): boolean {
    const row = this.db
      .prepare(`SELECT 1 FROM quota_consume_log WHERE session_id = ?`)
      .get(sessionId);

    return Boolean(row);
  }

  markSessionConsumed(
    browserUuid: string,
    sessionId: string,
    consumedAt: string
  ): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO quota_consume_log (browser_uuid, session_id, consumed_at)
         VALUES (?, ?, ?)`
      )
      .run(browserUuid, sessionId, consumedAt);
  }
}

let repositoryInstance: SqliteQuotaRepository | null = null;

export function getSqliteQuotaRepository(): SqliteQuotaRepository {
  if (!repositoryInstance) {
    const dbPath =
      process.env.QUOTA_DB_PATH ??
      path.join(process.cwd(), "data", "quota.db");
    repositoryInstance = new SqliteQuotaRepository(dbPath);
  }

  return repositoryInstance;
}
