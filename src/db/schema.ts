import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const adminsTable = sqliteTable("admins", {
  userId: text("user_id").primaryKey(),
});

export const pingsTable = sqliteTable("pings", {
  slackId: text("slack_id").notNull(),
  ts: text("ts").notNull(),
  type: text("type", { enum: ["channel", "here"] }).notNull(),
});

export type Admin = typeof adminsTable.$inferSelect;
export type Ping = typeof pingsTable.$inferSelect;
