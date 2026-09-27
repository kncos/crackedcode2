import { users } from "@/db/schema/auth";
import { createSelectSchema } from "drizzle-orm/zod";

export const zUser = createSelectSchema(users);
export const zSessionUser = zUser.omit({
  passwordHash: true,
});

export const USER_ROLES = ["none", "paid", "admin"] as const;
export type USER_ROLE = (typeof USER_ROLES)[number];
