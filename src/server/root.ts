import { usersTable } from "@/db/schema";
import { db } from "@/lib/db";
import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import * as z from "zod";

export const listPlanets = os.handler(async () => {
  return db.select().from(usersTable);
});

export const findPlanet = os
  .input(z.object({ id: z.number() }))
  .handler(async ({ input }) => {
    const [planet] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id));
    return planet;
  });

export const createPlanet = os
  .input(z.object({ name: z.string() }))
  .handler(async ({ input }) => {
    const [planet] = await db
      .insert(usersTable)
      .values({ name: input.name })
      .returning();
    return planet;
  });

export const router = {
  planet: {
    list: listPlanets,
    find: findPlanet,
    create: createPlanet,
  },
};
