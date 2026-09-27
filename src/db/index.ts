import "server-only";

import { ENV } from "@/lib/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { relations } from "./relations";

export function createDb() {
  return drizzle({
    connection: {
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      database: ENV.DB_DB,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      ssl: ENV.DB_SSL,
    },
    relations,
  });
}

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
