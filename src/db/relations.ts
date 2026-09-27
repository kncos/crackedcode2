import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  submissions: {
    problems: r.one.problems({
      from: r.submissions.problemId,
      to: r.problems.id,
    }),
    users: r.one.users({
      from: r.submissions.userId,
      to: r.users.id,
    }),
  },
  problems: {
    submissions: r.many.submissions(),
  },
}));
