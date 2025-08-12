PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pingPerms` (
	`slack_id` text NOT NULL,
	`channel_id` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_pingPerms`("slack_id", "channel_id") SELECT "slack_id", "channel_id" FROM `pingPerms`;--> statement-breakpoint
DROP TABLE `pingPerms`;--> statement-breakpoint
ALTER TABLE `__new_pingPerms` RENAME TO `pingPerms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;