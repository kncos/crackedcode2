import { rolesEnum, users } from "@/db/auth";
import { createSelectSchema } from "drizzle-orm/zod";

export const zUser = createSelectSchema(users);
export const zSessionUser = zUser.omit({
  passwordHash: true,
});

export const USER_ROLES = rolesEnum.enumValues;
export type USER_ROLE = (typeof USER_ROLES)[number];
