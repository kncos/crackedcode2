import { timestamp, uuid } from "drizzle-orm/pg-core";

export const idColumn = {
  id: uuid("id").primaryKey(),
};

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  udpatedAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};
