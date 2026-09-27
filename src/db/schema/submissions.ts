import { JudgeStatus, zJob, zJobResult } from "cracked-judge";
import { and, eq, isNotNull } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import z from "zod";
import { users } from "./auth";
import { idColumn, timestamps } from "./columns";
import { problems } from "./problems";

export const submissions = pgTable("submission", {
  ...idColumn,
  ...timestamps,
  // intentionally optional
  problemId: uuid("problemId").references(() => problems.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  userId: uuid("userId").references(() => users.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  hidden: boolean().notNull().default(false),
  status: text("status").$type<JudgeStatus>().notNull(),
  runtimeMs: integer("runtime_ms"),
  memoryKb: integer("memory_kb"),
  language: text("language"),
  job: jsonb("job").$type<z.infer<typeof zJob>>(),
  jobResult: jsonb("job_result").$type<z.infer<typeof zJobResult>>(),
});

export const submissionsListItemSelect = {
  id: submissions.id,
  createdAt: submissions.createdAt,
  updatedAt: submissions.updatedAt,
  status: submissions.status,
  runtimeMs: submissions.runtimeMs,
  memoryKb: submissions.memoryKb,
  language: submissions.language,
} as const;

export const isUserVisibleSubmission = and(
  eq(submissions.hidden, false),
  isNotNull(submissions.problemId),
);
