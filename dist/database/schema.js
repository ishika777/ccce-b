"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersToVirtualboxesRelations = exports.usersToVirtualboxes = exports.virtualBoxRelations = exports.userRelations = exports.virtualBox = exports.user = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const cuid2_1 = require("@paralleldrive/cuid2");
const drizzle_orm_1 = require("drizzle-orm");
exports.user = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.text)("id").$defaultFn(() => (0, cuid2_1.createId)()).primaryKey().unique(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    email: (0, sqlite_core_1.text)("email").notNull().unique(),
    image: (0, sqlite_core_1.text)('image'),
    generations: (0, sqlite_core_1.integer)('generations').default(0),
});
exports.virtualBox = (0, sqlite_core_1.sqliteTable)('virtualBox', {
    id: (0, sqlite_core_1.text)("id").$defaultFn(() => (0, cuid2_1.createId)()).primaryKey().unique(),
    name: (0, sqlite_core_1.text)("name").unique().notNull(),
    type: (0, sqlite_core_1.text)("type", { enum: ["react", "node"] }).notNull(),
    visibility: (0, sqlite_core_1.text)('visibility', { enum: ['public', 'private'] }),
    userId: (0, sqlite_core_1.text)("userId").notNull().references(() => exports.user.id)
});
exports.userRelations = (0, drizzle_orm_1.relations)(exports.user, ({ many }) => ({
    virtualBox: many(exports.virtualBox),
    usersToVirtualboxes: many(exports.usersToVirtualboxes, {
        relationName: 'userIdRelation',
    }),
}));
exports.virtualBoxRelations = (0, drizzle_orm_1.relations)(exports.virtualBox, ({ one, many }) => ({
    author: one(exports.user, {
        fields: [exports.virtualBox.userId],
        references: [exports.user.id]
    }),
    usersToVirtualboxes: many(exports.usersToVirtualboxes),
}));
exports.usersToVirtualboxes = (0, sqlite_core_1.sqliteTable)('users_to_virtualboxes', {
    sharedTo: (0, sqlite_core_1.text)('userId').notNull().references(() => exports.user.id),
    virtualboxId: (0, sqlite_core_1.text)('virtualBoxId').notNull().references(() => exports.virtualBox.id),
    sharedOn: (0, sqlite_core_1.integer)('sharedOn', { mode: 'timestamp_ms' }),
    sharedBy: (0, sqlite_core_1.text)('sharedBy').notNull().references(() => exports.user.id),
});
exports.usersToVirtualboxesRelations = (0, drizzle_orm_1.relations)(exports.usersToVirtualboxes, ({ one }) => ({
    virtualBox: one(exports.virtualBox, {
        fields: [exports.usersToVirtualboxes.virtualboxId],
        references: [exports.virtualBox.id],
    }),
    sharedToUser: one(exports.user, {
        relationName: 'userIdRelation',
        fields: [exports.usersToVirtualboxes.sharedTo],
        references: [exports.user.id],
    }),
    sharedByUser: one(exports.user, {
        relationName: 'sharedByRelation',
        fields: [exports.usersToVirtualboxes.sharedBy],
        references: [exports.user.id],
    }),
}));
