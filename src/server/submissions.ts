import { db } from "@/db";
import {
  isUserVisibleSubmission,
  submissions,
  submissionsListItemSelect,
} from "@/db/schema";
import { createJob, zUserSubmission } from "@/lib/submissions/validate";
import { dequeueResult, enqueueJob, zJobResult } from "cracked-judge";
import { and, count, desc, eq } from "drizzle-orm";
import z from "zod";
import { oBase, oPaid } from "./builders";
import { calcOffset, zPageLimit } from "./utils";

export const submissionsRouter = {
  findMany: oBase
    .input(
      z.object({
        problemId: z.string().optional(),
        userId: z.string().optional(),
        limit: zPageLimit,
        page: z.number().min(1).default(1),
      }),
    )
    .handler(async ({ input, context }) => {
      const offset = calcOffset(input);
      const { problemId, userId } = input;

      const whereCondition = and(
        isUserVisibleSubmission,
        // only use this clause if problemId was provided
        problemId ? eq(submissions.problemId, problemId) : undefined,
        userId ? eq(submissions.userId, userId) : undefined,
      );

      const [items, [total]] = await Promise.all([
        db
          .select(submissionsListItemSelect)
          .from(submissions)
          .where(whereCondition)
          .orderBy(desc(submissions.createdAt))
          .limit(input.limit)
          .offset(offset),
        db.select({ count: count() }).from(submissions).where(whereCondition),
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
      const { id } = input;
      const whereCondition = and(
        isUserVisibleSubmission,
        eq(submissions.id, id),
      );

      const [item] = await db
        .select()
        .from(submissions)
        .where(whereCondition)
        .limit(1);

      return item;
    }),
  create: oPaid
    .input(
      zUserSubmission.extend({
        maxWaitSecs: z.number().min(1).max(60).default(20),
      }),
    )
    .output(
      z.object({
        status: z.enum(["success", "pending"]),
        jobId: z.string(),
        result: zJobResult.nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { maxWaitSecs, ...rest } = input;

      const job = createJob(rest);
      const { redis } = context;
      await enqueueJob(redis, job);
      const result = await dequeueResult(redis, job.id, maxWaitSecs);

      return {
        result,
        jobId: job.id,
        status: result === null ? "pending" : "success",
      };
    }),
};
