CREATE TABLE `admins` (
	`user_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pings` (
	`slack_id` text PRIMARY KEY NOT NULL,
	`ts` text NOT NULL,
	`type` text NOT NULL
);
