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
exports.fetchStarterFilesFromGitHub = fetchStarterFilesFromGitHub;
function fetchFilesRecursive(folderPath_1) {
    return __awaiter(this, arguments, void 0, function* (folderPath, basePath = '') {
        const apiUrl = `https://api.github.com/repos/ishika777/starter-templates-ccce/contents/${folderPath}`;
        const res = yield fetch(apiUrl);
        if (!res.ok) {
            throw new Error(`Failed to fetch files list: ${res.status} ${res.statusText}`);
        }
        const items = (yield res.json());
        const files = [];
        for (const item of items) {
            if (item.type === 'file') {
                const fileRes = yield fetch(item.download_url);
                if (!fileRes.ok) {
                    throw new Error(`Failed to fetch file ${item.path}: ${fileRes.statusText}`);
                }
                const content = yield fileRes.text();
                files.push({ name: basePath + item.name, content });
            }
            else if (item.type === 'dir') {
                const nestedFiles = yield fetchFilesRecursive(item.path, basePath + item.name + '/');
                files.push(...nestedFiles);
            }
        }
        return files;
    });
}
function fetchStarterFilesFromGitHub(folderName) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetchFilesRecursive(folderName);
    });
}
