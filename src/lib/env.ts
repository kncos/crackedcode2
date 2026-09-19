// import { zRedisConfig } from "cracked-judge/src/types";
import "dotenv/config";
import z from "zod";

export const zEnv = z.object({
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  DB_DB: z.string().default("postgres"),
  DB_SSL: z.boolean().default(false),
});
// .extend(zRedisConfig.shape);

export const ENV = zEnv.parse(process.env);
