import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const adminsTable = sqliteTable("admins", {
  userId: text("user_id").primaryKey(),
});

export const webhooksTable = sqliteTable("webhooks", {
  userId: text("user_id")
    .primaryKey()
    .references(() => adminsTable.userId),
});

export type Admin = typeof adminsTable.$inferSelect;
export type Webhook = typeof webhooksTable.$inferSelect;
