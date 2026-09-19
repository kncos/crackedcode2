import { usersTable } from "@/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { oAuthed, oBase } from "./builders";

export const listPlanets = oBase.handler(async () => {
  return db.select().from(usersTable);
});

export const findPlanet = oBase
  .input(z.object({ id: z.number() }))
  .handler(async ({ input }) => {
    const [planet] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id));
    return planet;
  });

export const createPlanet = oAuthed
  .input(z.object({ name: z.string() }))
  .handler(async ({ input, context }) => {
    if (context) {
      console.log("createPlanet ctx:\n", JSON.stringify(context, null, 2));
    }

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
