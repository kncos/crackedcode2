import { users } from "@/db/schema/auth";
import { createSelectSchema } from "drizzle-orm/zod";
import z from "zod";

export const zUser = createSelectSchema(users);
export const zSessionUser = zUser.omit({
  passwordHash: true,
});

export const USER_ROLES = ["none", "paid", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUPPORTED_LANGS = ["cpp", "python"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const zJsonFile = z.object({
  name: z.string().nonempty(),
  contents: z.string(),
});
