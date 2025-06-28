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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const port = process.env.PORT || 8080;
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const user_router_1 = __importDefault(require("./router/user-router"));
const virtualBox_router_1 = __importDefault(require("./router/virtualBox-router"));
const user_service_1 = require("./services/user-service");
const zod_1 = require("zod");
const service_1 = require("./storage/service");
const node_pty_1 = require("node-pty");
const ai_service_1 = require("./services/ai-service");
const rate_limit_1 = require("./rate-limit");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "*"
}));
app.use(express_1.default.json());
app.use("/api/user", user_router_1.default);
app.use("/api/virtualbox", virtualBox_router_1.default);
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*"
    }
});
const terminals = {};
const handShakeSchmea = zod_1.z.object({
    userId: zod_1.z.string(),
    virtualBoxId: zod_1.z.string(),
    type: zod_1.z.enum(["node", "react"]),
    EIO: zod_1.z.string(),
    transport: zod_1.z.string(),
});
io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const q = socket.handshake.query;
    const parseResult = handShakeSchmea.safeParse(q);
    if (!parseResult.success) {
        next(new Error("Invalid Request"));
        return;
    }
    const { userId, virtualBoxId, type } = parseResult.data;
    const dbUser = yield (0, user_service_1.getUserWithId)(q.userId);
    const includesVirtualBox = dbUser === null || dbUser === void 0 ? void 0 : dbUser.virtualBox.some((box) => box.id === q.virtualBoxId);
    if (!dbUser || !includesVirtualBox) {
        next(new Error("Invalid Credentials"));
        return;
    }
    socket.data = {
        id: virtualBoxId,
        type,
        userId
    };
    next();
}));
io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
    const data = socket.data;
    const folderTree = yield (0, service_1.getFolderTreeInVirtualBox)(data.userId, data.id);
    socket.emit("loaded", folderTree.children);
    socket.on("getFile", (fullPath, callback) => __awaiter(void 0, void 0, void 0, function* () {
        const content = yield (0, service_1.getFileContentByFullPath)(fullPath);
        callback(content);
    }));
    socket.on("rename", (filePath, newName, callback) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield rate_limit_1.renameFileRL.consume(data.userId, 1);
            const { success, pathMap } = yield (0, service_1.renameItem)(filePath, newName);
            const folderTree = yield (0, service_1.getFolderTreeInVirtualBox)(data.userId, data.id);
            callback(success, null, pathMap, folderTree.children);
        }
        catch (error) {
            socket.emit("rate-limit", "You are sending too many requests. Please try again later.");
        }
    }));
    socket.on("save-file", (fullPath, content, callback) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (Buffer.byteLength(content, "utf-8") > rate_limit_1.MAX_BODY_SIZE) {
                socket.emit("rateLimit", "Rate limited: file size too large. Please reduce the file size.");
                return;
            }
            yield rate_limit_1.saveFileRL.consume(data.userId, 1);
            const success = yield (0, service_1.updateFileContent)(fullPath, content);
            callback(success);
        }
        catch (error) {
            socket.emit("rate-limit", "You are sending too many requests. Please try again later.");
        }
    }));
    socket.on("create-new-request", (name, type, selectedFolder, callback) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (type === "file") {
                yield rate_limit_1.createFileRL.consume(data.userId, 1);
            }
            else {
                yield rate_limit_1.createFolderRL.consume(data.userId, 1);
            }
            yield (0, service_1.createNewFileOrFolder)(name, type, selectedFolder);
            const folderTree = yield (0, service_1.getFolderTreeInVirtualBox)(data.userId, data.id);
            callback(true, null, folderTree.children);
        }
        catch (error) {
            socket.emit("rate-limit", "You are sending too many requests. Please try again later.");
            callback(false, error.message, []);
        }
    }));
    socket.on("delete-request", (path, callback) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const isFile = (_a = path.spllit("/").pop()) === null || _a === void 0 ? void 0 : _a.includes(".");
            if (isFile) {
                yield rate_limit_1.deleteFileRL.consume;
            }
            else {
                yield rate_limit_1.deleteFolderRL.consume(data.userId, 1);
            }
            yield (0, service_1.deleteFileOrFolder)(path);
            const folderTree = yield (0, service_1.getFolderTreeInVirtualBox)(data.userId, data.id);
            callback(true, null, folderTree.children);
        }
        catch (error) {
            socket.emit("rate-limit", "You are sending too many requests. Please try again later.");
            callback(false, error.message, []);
        }
    }));
    socket.on("create-terminal", (id) => {
        if (terminals[id]) {
            return;
        }
        if (Object.keys(terminals).length >= 4) {
            socket.emit("terminal-error", "You can only have 4 terminals open at a time.");
            return;
        }
        const projectPath = path_1.default.join(__dirname, "..", "..", "projects", data.id);
        if (!fs_1.default.existsSync(projectPath)) {
            fs_1.default.mkdirSync(projectPath, { recursive: true });
        }
        const files = fs_1.default.readdirSync(projectPath);
        if (files.length === 0) {
            fs_1.default.writeFileSync(path_1.default.join(projectPath, ".placeholder"), "");
        }
        const pty = (0, node_pty_1.spawn)(os_1.default.platform() === "win32" ? "cmd.exe" : "bash", [], {
            name: "xterm",
            cols: 100,
            cwd: path_1.default.join()
        });
        const onData = pty.onData((data) => {
            socket.emit("terminal-response", {
                data
            });
        });
        const onExit = pty.onExit((code) => console.log("exit", code));
        pty.write("clear\n");
        terminals[id] = {
            terminal: pty,
            onData,
            onExit
        };
    });
    socket.on("terminal-data", (id, data) => {
        console.log("terminal", data);
        if (!terminals[id])
            return;
        try {
            terminals[id].terminal.write(data);
        }
        catch (error) {
            console.log("error writing", error);
        }
    });
    socket.on("generate-code", (fileName, code, line, instructions, callback) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("Reach");
            const res = yield (0, ai_service_1.generateCode)(fileName, code, instructions, line, (chunk) => {
                socket.emit("generate-code-chunk", chunk);
            });
            socket.emit("generate-code-done");
        }
        catch (error) {
            socket.emit("generate-code-error", error.message);
            // callback(false, error.message, "");
        }
    }));
    socket.on("disconnect", () => {
        Object.entries(terminals).forEach((t) => {
            const { terminal, onData, onExit } = t[1];
            if (os_1.default.platform() !== "win32")
                terminal.kill;
            onData.dispose();
            onExit.dispose();
            delete terminals[t[0]];
        });
    });
}));
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
