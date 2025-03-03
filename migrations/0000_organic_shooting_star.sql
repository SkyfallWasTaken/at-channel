CREATE TABLE `admins` (
	`user_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`user_id` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admins`(`user_id`) ON UPDATE no action ON DELETE no action
);
