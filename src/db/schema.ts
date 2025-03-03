import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const adminsTable = sqliteTable("admins", {
  userId: text("user_id").primaryKey(),
});

export const webhooksTable = sqliteTable("webhooks", {
  userId: text("user_id").notNull(),
  channelId: text("channel_id").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Admin = typeof adminsTable.$inferSelect;
export type Webhook = typeof webhooksTable.$inferSelect;
