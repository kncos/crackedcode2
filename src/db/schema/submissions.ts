import { JudgeStatus, zJob, zJobResult } from "cracked-judge";
import { integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import z from "zod";
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
  status: text("status").$type<JudgeStatus>().notNull(),
  runtimeMs: integer("runtime_ms"),
  memoryKb: integer("memory_kb"),
  language: text("language"),
  job: jsonb("job").$type<z.infer<typeof zJob>>(),
  jobResult: jsonb("job_result").$type<z.infer<typeof zJobResult>>(),
});
