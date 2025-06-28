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
exports.deleteUserStorage = exports.deleteStorage = exports.initStorage = void 0;
const service_1 = require("../storage/service");
const file_service_1 = require("./file-service");
const initStorage = (virtualboxId, userId, type) => __awaiter(void 0, void 0, void 0, function* () {
    const folderName = type === "react" ? "react-basic" : "node-basic";
    const files = yield (0, file_service_1.fetchStarterFilesFromGitHub)(folderName);
    yield (0, service_1.uploadStarterFiles)(userId, virtualboxId, files);
});
exports.initStorage = initStorage;
const deleteStorage = (userId, virtualboxId) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, service_1.deleteVirtualBox)(userId, virtualboxId);
});
exports.deleteStorage = deleteStorage;
const deleteUserStorage = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, service_1.deleteUserStorageFolder)(userId);
});
exports.deleteUserStorage = deleteUserStorage;
