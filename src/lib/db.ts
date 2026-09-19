import { drizzle } from "drizzle-orm/node-postgres";
import { ENV } from "./env";

export const db = drizzle({
  connection: {
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    database: ENV.DB_DB,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    ssl: ENV.DB_SSL,
  },
});
