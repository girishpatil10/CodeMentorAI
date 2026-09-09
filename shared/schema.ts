import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const codeSubmissions = pgTable("code_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  language: text("language").notNull(),
  timeComplexity: text("time_complexity"),
  spaceComplexity: text("space_complexity"),
  concepts: json("concepts").$type<string[]>().default([]),
  aiSuggestions: text("ai_suggestions"),
  debuggingResults: text("debugging_results"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const executionHistory = pgTable("execution_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  language: text("language").notNull(),
  stdin: text("stdin"),
  output: text("output").notNull(),
  error: text("error"),
  exitCode: integer("exit_code").notNull(),
  executionTime: integer("execution_time").notNull(), // in milliseconds
  memoryUsage: integer("memory_usage"), // in KB if available
  success: boolean("success").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  problemsSolved: integer("problems_solved").notNull().default(0),
  bugsFixed: integer("bugs_fixed").notNull().default(0),
  languagesUsed: json("languages_used").$type<Record<string, number>>().default({}),
  achievements: json("achievements").$type<string[]>().default([]),
  totalExecutions: integer("total_executions").notNull().default(0),
  successfulExecutions: integer("successful_executions").notNull().default(0),
  averageExecutionTime: real("average_execution_time").notNull().default(0),
  favoriteLanguage: text("favorite_language"),
  lastActive: timestamp("last_active").notNull().defaultNow(),
});

export const learningAnalytics = pgTable("learning_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull().defaultNow(),
  language: text("language").notNull(),
  executionsCount: integer("executions_count").notNull().default(1),
  successRate: real("success_rate").notNull().default(0),
  averageTime: real("average_time").notNull().default(0),
  complexityScore: real("complexity_score").notNull().default(0),
  conceptsLearned: json("concepts_learned").$type<string[]>().default([]),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCodeSubmissionSchema = createInsertSchema(codeSubmissions).omit({
  id: true,
  createdAt: true,
});

export const insertExecutionHistorySchema = createInsertSchema(executionHistory).omit({
  id: true,
  createdAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

export const insertLearningAnalyticsSchema = createInsertSchema(learningAnalytics).omit({
  id: true,
  date: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCodeSubmission = z.infer<typeof insertCodeSubmissionSchema>;
export type CodeSubmission = typeof codeSubmissions.$inferSelect;
export type InsertExecutionHistory = z.infer<typeof insertExecutionHistorySchema>;
export type ExecutionHistory = typeof executionHistory.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertLearningAnalytics = z.infer<typeof insertLearningAnalyticsSchema>;
export type LearningAnalytics = typeof learningAnalytics.$inferSelect;
