/**
 * The slice of a SQLite connection the repository needs. expo-sqlite's
 * SQLiteDatabase satisfies it directly; tests wrap node:sqlite.
 */
export type SqlParam = string | number | null;

export interface SqlDb {
  execSync(sql: string): void;
  runSync(sql: string, params?: SqlParam[]): { changes: number };
  getAllSync<T>(sql: string, params?: SqlParam[]): T[];
  getFirstSync<T>(sql: string, params?: SqlParam[]): T | null;
  withTransactionSync(task: () => void): void;
}
