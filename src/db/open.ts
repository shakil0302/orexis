import * as SQLite from "expo-sqlite";
import { Repo } from "./repo";
import { migrate } from "./schema";
import type { SqlDb } from "./sql";

let repo: Repo | null = null;

/** Opens (once) the on-device database, runs migrations, and returns the repository. */
export function getRepo(): Repo {
  if (repo) return repo;
  const db = SQLite.openDatabaseSync("orexis.db");
  db.execSync("PRAGMA journal_mode = WAL;");
  const adapter: SqlDb = {
    execSync: (sql) => db.execSync(sql),
    runSync: (sql, params = []) => db.runSync(sql, params),
    getAllSync: (sql, params = []) => db.getAllSync(sql, params),
    getFirstSync: (sql, params = []) => db.getFirstSync(sql, params),
    withTransactionSync: (task) => db.withTransactionSync(task),
  };
  migrate(adapter);
  repo = new Repo(adapter);
  return repo;
}
