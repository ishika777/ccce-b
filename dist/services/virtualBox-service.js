"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUTVData = exports.incrementGenerations = exports.removeSharedVirtualBox = exports.shareVirtualBox = exports.getUsersSharedByMe = exports.getVirtualBoxesSharedToMe = exports.updateVirtualBox = exports.createVirtualBox = exports.deleteVirtualBox = exports.deleteAllVirtualBoxesByUser = exports.getAllVirtualBoxes = exports.getVirtualBoxByName = exports.getVirtualBoxById = exports.getAllVirtualBoxByUser = void 0;
const database_1 = require("../database");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const getAllVirtualBoxByUser = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield database_1.db.query.virtualBox.findMany({
        where: (vb, { eq }) => eq(vb.userId, id),
        with: {
            usersToVirtualboxes: true,
        },
    });
});
exports.getAllVirtualBoxByUser = getAllVirtualBoxByUser;
const getVirtualBoxById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield database_1.db.query.virtualBox.findFirst({
        where: (vb, { eq }) => eq(vb.id, id),
    });
});
exports.getVirtualBoxById = getVirtualBoxById;
const getVirtualBoxByName = (name) => __awaiter(void 0, void 0, void 0, function* () {
    return yield database_1.db.query.virtualBox.findFirst({
        where: (vb, { eq }) => eq(vb.name, name),
    });
});
exports.getVirtualBoxByName = getVirtualBoxByName;
const getAllVirtualBoxes = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield database_1.db.select().from(schema_1.virtualBox).all();
});
exports.getAllVirtualBoxes = getAllVirtualBoxes;
const deleteAllVirtualBoxesByUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield database_1.db.delete(schema_1.virtualBox).where((0, drizzle_orm_1.eq)(schema_1.virtualBox.userId, userId));
});
exports.deleteAllVirtualBoxesByUser = deleteAllVirtualBoxesByUser;
const deleteVirtualBox = (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
    yield database_1.db.delete(schema_1.usersToVirtualboxes).where((0, drizzle_orm_1.eq)(schema_1.usersToVirtualboxes.virtualboxId, id));
    const deleted = yield database_1.db.delete(schema_1.virtualBox).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.virtualBox.id, id), (0, drizzle_orm_1.eq)(schema_1.virtualBox.userId, userId)));
    return deleted;
});
exports.deleteVirtualBox = deleteVirtualBox;
const createVirtualBox = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield database_1.db.insert(schema_1.virtualBox)
        .values(data)
        .returning()
        .get();
});
exports.createVirtualBox = createVirtualBox;
const updateVirtualBox = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield database_1.db.update(schema_1.virtualBox)
        .set({ name: data.name, visibility: data.visibility })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.virtualBox.id, data.id), (0, drizzle_orm_1.eq)(schema_1.virtualBox.userId, data.userId)))
        .returning()
        .get();
});
exports.updateVirtualBox = updateVirtualBox;
const getVirtualBoxesSharedToMe = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const sharedBoxes = yield database_1.db.query.usersToVirtualboxes.findMany({
        where: (utv, { eq }) => eq(utv.sharedTo, userId),
        with: {
            virtualBox: true,
            sharedByUser: true,
        },
    });
    return sharedBoxes;
});
exports.getVirtualBoxesSharedToMe = getVirtualBoxesSharedToMe;
const getUsersSharedByMe = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const shares = yield database_1.db.query.usersToVirtualboxes.findMany({
        where: (utv, { eq }) => eq(utv.sharedBy, userId),
        with: {
            sharedToUser: true,
        },
    });
    return shares;
});
exports.getUsersSharedByMe = getUsersSharedByMe;
const shareVirtualBox = (virtualboxId, sharedById, shareToUserId) => __awaiter(void 0, void 0, void 0, function* () {
    if (sharedById === shareToUserId) {
        throw new Error("Cannot share a virtual-box with yourself");
    }
    const alreadyShared = yield database_1.db.query.usersToVirtualboxes.findFirst({
        where: (utv, { and, eq }) => and(eq(utv.sharedTo, shareToUserId), eq(utv.virtualboxId, virtualboxId)),
    });
    if (alreadyShared) {
        throw new Error("User already has access");
    }
    return yield database_1.db.insert(schema_1.usersToVirtualboxes).values({
        sharedTo: shareToUserId,
        virtualboxId,
        sharedOn: new Date(),
        sharedBy: sharedById
    }).returning().get();
});
exports.shareVirtualBox = shareVirtualBox;
const removeSharedVirtualBox = (sharedToId, virtualboxId, sharedById) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield database_1.db.delete(schema_1.usersToVirtualboxes).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.usersToVirtualboxes.sharedTo, sharedToId), (0, drizzle_orm_1.eq)(schema_1.usersToVirtualboxes.virtualboxId, virtualboxId), (0, drizzle_orm_1.eq)(schema_1.usersToVirtualboxes.sharedBy, sharedById))).returning();
    if (res.length == 0) {
        throw Error("VirtualBox not shared with user");
    }
    return res;
});
exports.removeSharedVirtualBox = removeSharedVirtualBox;
const incrementGenerations = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield database_1.db.query.user.findFirst({
        where: (user, { eq }) => eq(user.id, userId),
    });
    if (!user)
        throw new Error("User not found");
    if (user.generations !== null && user.generations >= 30) {
        throw new Error("You reached the maximum # of generations.");
    }
    // await db.update(user)
    // .set({ generations: sql`${user.generations} + 1` })
    // .where(eq(user.id, userId))
    // .get();
});
exports.incrementGenerations = incrementGenerations;
const deleteUTVData = () => __awaiter(void 0, void 0, void 0, function* () {
    const allData = yield database_1.db.select().from(schema_1.usersToVirtualboxes).all();
    console.log("All data in usersToVirtualboxes:", allData);
    if (allData.length === 0) {
        return;
    }
    return yield database_1.db.delete(schema_1.usersToVirtualboxes).returning().get();
});
exports.deleteUTVData = deleteUTVData;
