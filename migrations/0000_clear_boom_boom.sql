DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS pings;
DROP TABLE IF EXISTS pingPerms;

CREATE TABLE `admins` (
	`user_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pings` (
	`slack_id` text NOT NULL,
	`ts` text NOT NULL,
	`type` text NOT NULL,
    PRIMARY KEY (`slack_id`, `ts`)
);
CREATE TABLE `pingPerms` (
    `slack_id` text NOT NULL,
    `channel_id` text NOT NULL,
    PRIMARY KEY (`slack_id`, `channel_ID`)
);