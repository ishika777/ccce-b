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
exports.uploadStarterFiles = uploadStarterFiles;
exports.deleteVirtualBox = deleteVirtualBox;
exports.deleteUserStorageFolder = deleteUserStorageFolder;
exports.getFileContentByFullPath = getFileContentByFullPath;
exports.buildFolderTree = buildFolderTree;
exports.getFolderTreeInVirtualBox = getFolderTreeInVirtualBox;
exports.renameItem = renameItem;
exports.updateFileContent = updateFileContent;
exports.createNewFileOrFolder = createNewFileOrFolder;
exports.deleteFileOrFolder = deleteFileOrFolder;
const supabaseClient_1 = require("./supabaseClient");
function uploadStarterFiles(userId, virtualBoxId, files) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
                const fileBuffer = Buffer.isBuffer(file.content)
                    ? file.content
                    : Buffer.from(file.content);
                const uint8Array = new Uint8Array(fileBuffer);
                if (uint8Array.length === 0) {
                    throw new Error(`File "${file.name}" is empty or invalid`);
                }
                const blob = new Blob([uint8Array]);
                const filePath = `${userId}/${virtualBoxId}/${file.name}`;
                const { error } = yield supabaseClient_1.supabase.storage
                    .from('file-storage')
                    .upload(filePath, blob, {
                    upsert: true,
                    contentType: 'text/plain',
                });
                if (error) {
                    throw new Error(`Failed to upload ${file.name}: ${error.message}`);
                }
            })));
        }
        catch (err) {
            throw new Error(`Storage upload failed: ${err.message}`);
        }
    });
}
function deleteVirtualBox(userId, virtualBoxId) {
    return __awaiter(this, void 0, void 0, function* () {
        const folderPath = `${userId}/${virtualBoxId}`;
        const listAllFiles = (path_1, ...args_1) => __awaiter(this, [path_1, ...args_1], void 0, function* (path, collectedPaths = []) {
            const { data, error } = yield supabaseClient_1.supabase.storage.from('file-storage').list(path, { limit: 1000 });
            if (error)
                throw new Error(`Failed to list files in ${path}: ${error.message}`);
            for (const item of data) {
                const fullPath = `${path}/${item.name}`;
                if (item.metadata && item.metadata.size === 0 && item.name.includes(".")) {
                    collectedPaths.push(fullPath);
                }
                else if (item.name.includes(".")) {
                    collectedPaths.push(fullPath);
                }
                else {
                    // It's a subfolder — recursively list its contents
                    yield listAllFiles(fullPath, collectedPaths);
                }
            }
            return collectedPaths;
        });
        const filePathsToDelete = yield listAllFiles(folderPath);
        if (filePathsToDelete.length === 0) {
            throw new Error(`No files found in ${folderPath}`);
            return;
        }
        const { error: deleteError } = yield supabaseClient_1.supabase.storage
            .from('file-storage')
            .remove(filePathsToDelete);
        if (deleteError) {
            throw new Error(`Failed to delete files in ${folderPath}: ${deleteError.message}`);
        }
    });
}
function deleteUserStorageFolder(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Recursively collect all file paths under the userId folder
        const listAllFiles = (path_1, ...args_1) => __awaiter(this, [path_1, ...args_1], void 0, function* (path, collectedPaths = []) {
            const { data, error } = yield supabaseClient_1.supabase.storage.from('file-storage').list(path, { limit: 1000 });
            if (error)
                throw new Error(`Failed to list files in ${path}: ${error.message}`);
            for (const item of data) {
                const fullPath = `${path}/${item.name}`;
                if (item.metadata && item.metadata.size === 0 && item.name.includes(".")) {
                    collectedPaths.push(fullPath);
                }
                else if (item.name.includes(".")) {
                    collectedPaths.push(fullPath);
                }
                else {
                    // It's a folder, go deeper
                    yield listAllFiles(fullPath, collectedPaths);
                }
            }
            return collectedPaths;
        });
        const userFolderPath = `${userId}`;
        const filesToDelete = yield listAllFiles(userFolderPath);
        if (filesToDelete.length === 0) {
            console.warn(`No files found under userId: ${userId}`);
            return;
        }
        const { error: deleteError } = yield supabaseClient_1.supabase.storage.from('file-storage').remove(filesToDelete);
        if (deleteError) {
            throw new Error(`Failed to delete files for userId: ${userId} - ${deleteError.message}`);
        }
        console.log(`Successfully deleted all files for userId: ${userId}`);
    });
}
function getFileContentByFullPath(fullPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield supabaseClient_1.supabase.storage
            .from("file-storage")
            .download(fullPath);
        if (error || !data) {
            throw new Error(`Failed to fetch file at ${fullPath}: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
        const text = yield data.text(); // assuming it's a text file
        return text;
    });
}
function buildFolderTree(prefix, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const folderId = crypto.randomUUID();
        const folder = {
            id: folderId,
            type: "folder",
            name,
            fullPath: prefix,
            children: []
        };
        const { data, error } = yield supabaseClient_1.supabase.storage
            .from("file-storage")
            .list(prefix);
        if (error) {
            throw new Error(`Failed to list folder ${prefix}: ${error.message}`);
        }
        for (const item of data) {
            const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.metadata) {
                // It's a file
                const fileId = crypto.randomUUID();
                folder.children.push({
                    id: fileId,
                    type: "file",
                    name: item.name,
                    fullPath,
                });
            }
            else {
                const subFolder = yield buildFolderTree(fullPath, item.name);
                folder.children.push(subFolder);
            }
        }
        return folder;
    });
}
function getFolderTreeInVirtualBox(userId, virtualBoxId) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootPrefix = `${userId}/${virtualBoxId}`;
        const rootFolderName = virtualBoxId;
        return yield buildFolderTree(rootPrefix, rootFolderName);
    });
}
function renameItem(fullPath, newName) {
    return __awaiter(this, void 0, void 0, function* () {
        const parts = fullPath.split("/");
        const oldName = parts.pop();
        const basePath = parts.join("/");
        const newFullPath = `${basePath}/${newName}`;
        const isFile = oldName === null || oldName === void 0 ? void 0 : oldName.includes(".");
        const storage = supabaseClient_1.supabase.storage.from("file-storage");
        const pathMap = {};
        try {
            if (isFile) {
                const { data, error: downloadError } = yield storage.download(fullPath);
                if (downloadError || !data)
                    return { success: false, pathMap };
                const uploadRes = yield storage.upload(newFullPath, data, { upsert: true });
                if (uploadRes.error)
                    return { success: false, pathMap };
                const deleteRes = yield storage.remove([fullPath]);
                if (deleteRes.error)
                    return { success: false, pathMap };
                pathMap[fullPath] = newFullPath;
                return { success: true, pathMap };
            }
            else {
                // FOLDER: Get all nested files recursively
                const collectAllFiles = (prefix) => __awaiter(this, void 0, void 0, function* () {
                    const { data: items, error } = yield storage.list(prefix, { limit: 10000 });
                    if (error || !items)
                        return [];
                    const results = [];
                    for (const item of items) {
                        const itemPath = `${prefix}/${item.name}`;
                        if (item.metadata) {
                            results.push(itemPath);
                        }
                        else {
                            const subResults = yield collectAllFiles(itemPath);
                            results.push(...subResults);
                        }
                    }
                    return results;
                });
                const allFiles = yield collectAllFiles(fullPath);
                // Move each file
                for (const oldFilePath of allFiles) {
                    const relative = oldFilePath.slice(fullPath.length + 1); // skip prefix + "/"
                    const newFilePath = `${newFullPath}/${relative}`;
                    const { data, error: downloadError } = yield storage.download(oldFilePath);
                    if (downloadError || !data)
                        return { success: false, pathMap };
                    const uploadRes = yield storage.upload(newFilePath, data, { upsert: true });
                    if (uploadRes.error)
                        return { success: false, pathMap };
                    const deleteRes = yield storage.remove([oldFilePath]);
                    if (deleteRes.error)
                        return { success: false, pathMap };
                    pathMap[oldFilePath] = newFilePath;
                }
                // Optionally: remove empty folders — Supabase doesn't support folder deletion directly
                pathMap[fullPath] = newFullPath;
                return { success: true, pathMap };
            }
        }
        catch (err) {
            console.error("Rename failed:", err);
            return { success: false, pathMap };
        }
    });
}
function updateFileContent(fullPath, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const storage = supabaseClient_1.supabase.storage.from("file-storage");
        const blob = new Blob([content], { type: "text/plain" });
        const { error } = yield storage.upload(fullPath, blob, {
            upsert: true,
        });
        if (error) {
            console.error("❌ Failed to update file:", error.message);
            return false;
        }
        return true;
    });
}
//handled
function createNewFileOrFolder(name, type, selectedFolderPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = type === "file"
            ? `${selectedFolderPath}/${name}`
            : `${selectedFolderPath}/${name}/.placeholder`;
        const content = type === "file" ? "" : ".folder";
        const blob = new Blob([new Uint8Array(Buffer.from(content))]);
        const { error } = yield supabaseClient_1.supabase
            .storage
            .from("file-storage")
            .upload(filePath, blob, {
            upsert: true,
            contentType: "text/plain",
        });
        if (error) {
            throw new Error(`Supabase ${type} upload failed: ${error.message}`);
        }
    });
}
//handled
function deleteFileOrFolder(path) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const isFile = (_a = path.split("/").pop()) === null || _a === void 0 ? void 0 : _a.includes(".");
        if (isFile) {
            const { data, error } = yield supabaseClient_1.supabase.storage
                .from("file-storage")
                .remove([path]);
            if (error || !data) {
                throw new Error(`Failed to delete file ${path}: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : "Unknown error or invalid bucket"}`);
            }
        }
        else {
            const folderPath = path.endsWith("/") ? path : `${path}/`;
            const { data, error } = yield supabaseClient_1.supabase.storage
                .from("file-storage")
                .list(folderPath, { limit: 10000 });
            if (error) {
                throw new Error(`Failed to list folder ${folderPath}: ${error.message}`);
            }
            const filesToDelete = [];
            for (const item of data) {
                const fullPath = `${folderPath}${item.name}`;
                if (item.metadata) {
                    filesToDelete.push(fullPath);
                }
                else {
                    yield deleteFileOrFolder(fullPath);
                }
            }
            filesToDelete.push(`${folderPath}.placeholder`);
            if (filesToDelete.length > 0) {
                const { error } = yield supabaseClient_1.supabase.storage
                    .from("file-storage")
                    .remove(filesToDelete);
                if (error) {
                    throw new Error(`Failed to delete contents of ${folderPath}: ${error.message}`);
                }
            }
        }
    });
}
