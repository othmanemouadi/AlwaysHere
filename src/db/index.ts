import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let _db: NodePgDatabase<typeof schema> | null = null;

export function db(): NodePgDatabase<typeof schema> {
  if (!_db) {
    const pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://alwayshere:alwayshere@localhost:5439/alwayshere",
      max: 10,
    });
    _db = drizzle(pool, { schema });
  }
  return _db;
}

export * as tables from "./schema";
