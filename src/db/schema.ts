import type { SqlDb } from "./sql";

const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE categories (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    position  INTEGER NOT NULL
  );

  CREATE TABLE dishes (
    id            TEXT PRIMARY KEY,
    category_id   TEXT NOT NULL REFERENCES categories(id),
    name          TEXT NOT NULL,
    duration_min  INTEGER NOT NULL,
    cadence       TEXT NOT NULL,
    repeats       INTEGER NOT NULL DEFAULT 1,
    created_on    TEXT NOT NULL
  );
  CREATE INDEX dishes_category ON dishes(category_id);

  CREATE TABLE dish_rule_history (
    dish_id       TEXT NOT NULL REFERENCES dishes(id),
    period_start  TEXT NOT NULL,
    cadence       TEXT NOT NULL,
    repeats       INTEGER NOT NULL,
    PRIMARY KEY (dish_id, period_start)
  );

  CREATE TABLE orders (
    day        TEXT PRIMARY KEY,
    placed_at  TEXT NOT NULL
  );

  CREATE TABLE order_items (
    day      TEXT NOT NULL REFERENCES orders(day),
    dish_id  TEXT NOT NULL REFERENCES dishes(id),
    PRIMARY KEY (day, dish_id)
  );
  CREATE INDEX order_items_dish ON order_items(dish_id);

  CREATE TABLE completions (
    day      TEXT NOT NULL,
    dish_id  TEXT NOT NULL REFERENCES dishes(id),
    done_at  TEXT NOT NULL,
    PRIMARY KEY (day, dish_id)
  );
  CREATE INDEX completions_dish ON completions(dish_id);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Brings the database up to the current schema. Safe to call on every open. */
export function migrate(db: SqlDb): void {
  db.execSync("PRAGMA foreign_keys = ON;");
  const row = db.getFirstSync<{ user_version: number }>("PRAGMA user_version");
  let version = row?.user_version ?? 0;
  while (version < SCHEMA_VERSION) {
    const sql = MIGRATIONS[version];
    db.withTransactionSync(() => {
      db.execSync(sql);
      db.execSync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}
