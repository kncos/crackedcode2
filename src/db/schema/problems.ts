import { znEntry } from "@/lib/newTypesDsl/nodes";
import { integer, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import z from "zod";
import { idColumn, timestamps } from "./columns";

export const problems = pgTable("problems", {
  ...idColumn,
  ...timestamps,
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  editorial: text("editorial"),
  difficulty: integer("difficulty"),
  categories: text("categories").array().notNull().default([]),
  abi: jsonb("abi").$type<z.infer<typeof znEntry>>(),
  testCases: jsonb("test_cases"),
});
