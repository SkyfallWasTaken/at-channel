ALTER TABLE `webhooks` ADD `channel_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `webhooks` ADD `webhook_url` text NOT NULL;--> statement-breakpoint
ALTER TABLE `webhooks` ADD `created_at` text DEFAULT CURRENT_TIMESTAMP;