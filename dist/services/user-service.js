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
exports.deleteAllUsers = exports.createUser = exports.getUserWithId = exports.getUserWithEmail = exports.getAllUsers = void 0;
const zod_1 = require("zod");
const database_1 = require("../database");
const schema_1 = require("../database/schema");
const getAllUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield database_1.db.select().from(schema_1.user).all();
    return data;
});
exports.getAllUsers = getAllUsers;
const getUserWithEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield database_1.db.query.user.findFirst({
        where: (user, { eq }) => eq(user.email, email),
        with: {
            virtualBox: true,
            usersToVirtualboxes: true
        }
    });
    return data;
});
exports.getUserWithEmail = getUserWithEmail;
const getUserWithId = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield database_1.db.query.user.findFirst({
        where: (user, { eq }) => eq(user.id, id),
        with: {
            virtualBox: true,
            usersToVirtualboxes: true
        }
    });
    return data;
});
exports.getUserWithId = getUserWithId;
const createUser = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const userSchema = zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string().email()
    });
    const { id, name, email } = userSchema.parse(data);
    const user = yield database_1.db.insert(schema_1.user).values({ id, name, email }).returning().get();
    return user;
});
exports.createUser = createUser;
const deleteAllUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    yield database_1.db.delete(schema_1.user);
});
exports.deleteAllUsers = deleteAllUsers;
