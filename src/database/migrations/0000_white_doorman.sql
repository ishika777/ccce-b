CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`image` text,
	`generations` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_unique` ON `users` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `users_to_virtualboxes` (
	`userId` text NOT NULL,
	`virtualBoxId` text NOT NULL,
	`sharedOn` integer,
	`sharedBy` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`virtualBoxId`) REFERENCES `virtualBox`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sharedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `virtualBox` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`visibility` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `virtualBox_id_unique` ON `virtualBox` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `virtualBox_name_unique` ON `virtualBox` (`name`);