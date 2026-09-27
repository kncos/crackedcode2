import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { UserRole, zSessionUser } from "@/lib/types";
import { Prettify } from "@/lib/utils";
import { ORPCError, os } from "@orpc/server";
import { createRedisClient } from "cracked-judge";
import { eq } from "drizzle-orm";
import z from "zod";

const oAuthMiddleware = os
  .$context<{
    user?: Prettify<z.infer<typeof zSessionUser>>;
  }>()
  .middleware(async (params) => {
    const { next, context } = params;

    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const [user_result] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      const user = zSessionUser.parse(user_result);

      return await next({
        ...params,
        context: {
          ...context,
          user,
        },
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

const oRedisMiddleware = os
  .$context<{
    redis?: Awaited<ReturnType<typeof createRedisClient>>;
  }>()
  .middleware(async (params) => {
    const { next, context } = params;

    try {
      const redis = await createRedisClient({
        maxRetries: 2,
        initialBackoffMs: 300,
        maxBackoffMs: 900,
      });

      return await next({
        ...params,
        context: {
          ...context,
          redis,
        },
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

export const oBase = os;
export const oAuthed = oBase.use(oAuthMiddleware).use(oRedisMiddleware);

const oCreateRequiredRoleMiddleware = (hasAccess: UserRole[]) =>
  oAuthed.middleware(async (params) => {
    const { context, next } = params;
    if (hasAccess.findIndex((v) => v === context.user.role) === -1) {
      throw new ORPCError("FORBIDDEN");
    }
    return await next(params);
  });

export const oPaid = oAuthed.use(
  oCreateRequiredRoleMiddleware(["paid", "admin"]),
);

export const oAdmin = oAuthed.use(oCreateRequiredRoleMiddleware(["admin"]));
