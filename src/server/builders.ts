import { users } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { USER_ROLE, zSessionUser } from "@/lib/types";
import { Prettify } from "@/lib/utils";
import { ORPCError, os } from "@orpc/server";
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

export const oBase = os;
export const oAuthed = oBase.use(oAuthMiddleware);

const oCreateRequiredRoleMiddleware = (hasAccess: USER_ROLE[]) =>
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
