PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pings` (
	`slack_id` text NOT NULL,
	`ts` text NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_pings`("slack_id", "ts", "type") SELECT "slack_id", "ts", "type" FROM `pings`;--> statement-breakpoint
DROP TABLE `pings`;--> statement-breakpoint
ALTER TABLE `__new_pings` RENAME TO `pings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;