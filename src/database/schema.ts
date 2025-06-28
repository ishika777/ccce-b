import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createId } from "@paralleldrive/cuid2";
import { relations, InferSelectModel } from 'drizzle-orm';

export const user = sqliteTable('users', {
    id: text("id").$defaultFn(() => createId()).primaryKey().unique(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    image: text('image'),
	generations: integer('generations').default(0),
});

export const virtualBox = sqliteTable('virtualBox', {
    id: text("id").$defaultFn(() => createId()).primaryKey().unique(),
    name: text("name").unique().notNull(),
    type: text("type", { enum: ["react", "node"] }).notNull(),
    visibility: text('visibility', { enum: ['public', 'private'] }),
    userId: text("userId").notNull().references(() => user.id)
});



export const userRelations = relations(user, ({ many }) => ({
	virtualBox: many(virtualBox),
	usersToVirtualboxes: many(usersToVirtualboxes, {
		relationName: 'userIdRelation',
	}),

}));

export const virtualBoxRelations = relations(virtualBox, ({ one, many }) => ({
    author: one(user, {
        fields: [virtualBox.userId],
        references: [user.id]
    }),
    usersToVirtualboxes: many(usersToVirtualboxes),
}));

export type UserWithoutVirtualBoxType = InferSelectModel<typeof user>;
export type VirtualBoxWithoutUserType = InferSelectModel<typeof virtualBox>;

export type UserType = UserWithoutVirtualBoxType & {
    virtualBox: VirtualBoxWithoutUserType[];
};

export type VirtualBoxType = VirtualBoxWithoutUserType & {
    author: UserWithoutVirtualBoxType;
};


export const usersToVirtualboxes = sqliteTable('users_to_virtualboxes', {
	sharedTo: text('userId').notNull().references(() => user.id),
	virtualboxId: text('virtualBoxId').notNull().references(() => virtualBox.id),
	sharedOn: integer('sharedOn', { mode: 'timestamp_ms' }),
	sharedBy: text('sharedBy').notNull().references(() => user.id),
});


export const usersToVirtualboxesRelations = relations(usersToVirtualboxes, ({ one }) => ({
	virtualBox: one(virtualBox, {
		fields: [usersToVirtualboxes.virtualboxId],
		references: [virtualBox.id],
	}),
	sharedToUser: one(user, {
		relationName: 'userIdRelation',
		fields: [usersToVirtualboxes.sharedTo],
		references: [user.id],
	}),
	sharedByUser: one(user, {
		relationName: 'sharedByRelation',
		fields: [usersToVirtualboxes.sharedBy],
		references: [user.id],
	}),
}));

