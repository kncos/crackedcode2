import { znEntry } from "@/lib/newTypesDsl/nodes";
import { zJsonFile } from "@/lib/types";
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
  userFiles: jsonb("user_files").$type<z.infer<typeof zJsonFile>[]>(),
});

export const problemListItemSelect = {
  id: problems.id,
  createdAt: problems.createdAt,
  updatedAt: problems.updatedAt,
  title: problems.title,
  difficulty: problems.difficulty,
  categories: problems.categories,
} as const;

export const problemDetailSelect = {
  ...problemListItemSelect,
  description: problems.description,
  editorial: problems.editorial,
  userFiles: problems.userFiles,
} as const;
