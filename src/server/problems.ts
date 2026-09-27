import { db } from "@/db";
import {
  problemDetailSelect,
  problemListItemSelect,
  problems,
} from "@/db/schema";
import { znEntry } from "@/lib/newTypesDsl/nodes";
import { count, eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-orm/zod";
import z from "zod";
import { oAdmin, oBase } from "./builders";
import { calcOffset, zPageLimit } from "./utils";

export const problemsRouter = {
  findMany: oBase
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: zPageLimit,
      }),
    )
    .handler(async ({ input }) => {
      const offset = calcOffset(input);
      const [items, [total]] = await Promise.all([
        db
          .select(problemListItemSelect)
          .from(problems)
          .limit(input.limit)
          .offset(offset),
        db.select({ count: count() }).from(problems),
      ]);

      return {
        items,
        total: total?.count ?? 0,
        page: input.page,
        limit: input.limit,
      };
    }),
  findOne: oBase
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [item] = await db
        .select(problemDetailSelect)
        .from(problems)
        .where(eq(problems.id, input.id))
        .limit(1);

      return item;
    }),
  create: oAdmin
    .input(
      createInsertSchema(problems).extend({
        abi: znEntry,
      }),
    )
    .output(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const [result] = await db
        .insert(problems)
        .values({ ...input })
        .returning({ id: problems.id });

      return result;
    }),
};
