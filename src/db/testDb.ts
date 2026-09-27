/**
 * Test-only adapter over Node's built-in SQLite. Never import from app code:
 * Metro cannot bundle node:sqlite.
 */
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./schema";
import type { SqlDb, SqlParam } from "./sql";

export function openTestDb(): SqlDb {
  const db = new DatabaseSync(":memory:");
  const adapter: SqlDb = {
    execSync: (sql) => db.exec(sql),
    runSync: (sql, params: SqlParam[] = []) => {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes) };
    },
    getAllSync: <T,>(sql: string, params: SqlParam[] = []) => db.prepare(sql).all(...params) as T[],
    getFirstSync: <T,>(sql: string, params: SqlParam[] = []) => (db.prepare(sql).get(...params) as T | undefined) ?? null,
    withTransactionSync: (task) => {
      db.exec("BEGIN");
      try {
        task();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  migrate(adapter);
  return adapter;
}
