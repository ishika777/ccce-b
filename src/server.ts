import dotenv from "dotenv"
import path from "path"
import fs from "fs"
import os from "os";
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const port = process.env.PORT || 8080;
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";

import userRouter from "./router/user-router";
import virtualBoxRouter from "./router/virtualBox-router";

import { getUserWithId } from "./services/user-service";
import { z } from "zod";
import { createNewFileOrFolder, deleteFileOrFolder, getFileContentByFullPath, getFolderTreeInVirtualBox, renameItem, updateFileContent } from "./storage/service";
import { IDisposable, IPty, spawn } from "node-pty"
import { generateCode } from "./services/ai-service";
import { createFileRL, createFolderRL, deleteFileRL, deleteFolderRL, MAX_BODY_SIZE, renameFileRL, saveFileRL } from "./rate-limit";



const app = express();

app.use(cors({
    origin: "*"
}))
app.use(express.json())


app.use("/api/user", userRouter);
app.use("/api/virtualbox", virtualBoxRouter);



const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
})

const terminals: {
    [id: string]: {
        terminal: IPty;
        onData: IDisposable;
        onExit: IDisposable
    }
} = {}


const handShakeSchmea = z.object({
    userId: z.string(),
    virtualBoxId: z.string(),
    type: z.enum(["node", "react"]),
    EIO: z.string(),
    transport: z.string(),
})

io.use(async (socket, next) => {
    const q = socket.handshake.query;

    const parseResult = handShakeSchmea.safeParse(q);
    if (!parseResult.success) {
        next(new Error("Invalid Request"))
        return;
    }

    const { userId, virtualBoxId, type } = parseResult.data

    const dbUser = await getUserWithId(q.userId as string)

    const includesVirtualBox = dbUser?.virtualBox.some((box) => box.id === q.virtualBoxId);
    if (!dbUser || !includesVirtualBox) {
        next(new Error("Invalid Credentials"))
        return;
    }

    socket.data = {
        id: virtualBoxId,
        type,
        userId
    }
    next();
})



io.on("connection", async (socket) => {

    const data = socket.data as {
        userId: string
        id: string
        type: "react" | "node"
    }


    const folderTree = await getFolderTreeInVirtualBox(data.userId, data.id);

    socket.emit("loaded", folderTree.children);

    socket.on("getFile", async (fullPath: string, callback) => {
        const content = await getFileContentByFullPath(fullPath);
        callback(content);
    })

    socket.on("rename", async (filePath: string, newName: string, callback) => {
        try {
            await renameFileRL.consume(data.userId, 1);
            const { success, pathMap } = await renameItem(filePath, newName);
            const folderTree = await getFolderTreeInVirtualBox(data.userId, data.id);
            callback(success, null, pathMap, folderTree.children);

        } catch (error) {
            socket.emit("rate-limit", "You are sending too many requests. Please try again later.");

        }

    })

    socket.on("save-file", async (fullPath: string, content: string, callback) => {
        try {
            if (Buffer.byteLength(content, "utf-8") > MAX_BODY_SIZE) {
                socket.emit(
                    "rateLimit",
                    "Rate limited: file size too large. Please reduce the file size."
                );
                return;
            }
            await saveFileRL.consume(data.userId, 1)
            const success = await updateFileContent(fullPath, content);
            callback(success);
        } catch (error) {
            socket.emit("rate-limit", "You are sending too many requests. Please try again later.");
        }
    })

    socket.on("create-new-request", async (name: string, type: "file" | "folder", selectedFolder: string, callback) => {
        try {
            if (type === "file") {
                await createFileRL.consume(data.userId, 1);
            } else {
                await createFolderRL.consume(data.userId, 1);
            }
            await createNewFileOrFolder(name, type, selectedFolder);
            const folderTree = await getFolderTreeInVirtualBox(data.userId, data.id);
            callback(true, null, folderTree.children);
        } catch (error: any) {
            socket.emit("rate-limit", "You are sending too many requests. Please try again later.");
            callback(false, error.message, []);
        }
    })

    socket.on("delete-request", async (path, callback) => {
        try {
            const isFile = path.spllit("/").pop()?.includes(".");
            if (isFile) {
                await deleteFileRL.consume
            } else {
                await deleteFolderRL.consume(data.userId, 1);
            }
            await deleteFileOrFolder(path);
            const folderTree = await getFolderTreeInVirtualBox(data.userId, data.id);
            callback(true, null, folderTree.children);
        } catch (error: any) {
            socket.emit("rate-limit", "You are sending too many requests. Please try again later.");
            callback(false, error.message, []);
        }

    });







    socket.on("create-terminal", (id: string) => {

        if (terminals[id]) {
            return;
        }

        if (Object.keys(terminals).length >= 4) {
            socket.emit("terminal-error", "You can only have 4 terminals open at a time.");
            return;
        }

        const projectPath = path.join(__dirname, "..", "..", "projects", data.id);
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
        }

        const files = fs.readdirSync(projectPath);
        if (files.length === 0) {
            fs.writeFileSync(path.join(projectPath, ".placeholder"), "");
        }

        const pty = spawn(os.platform() === "win32" ? "cmd.exe" : "bash", [], {
            name: "xterm",
            cols: 100,
            cwd: path.join()
        })

        const onData = pty.onData((data) => {
            socket.emit("terminal-response", {
                data
            })
        })

        const onExit = pty.onExit((code) => console.log("exit", code))
        pty.write("clear\n");
        terminals[id] = {
            terminal: pty,
            onData,
            onExit
        };


    })


    socket.on("terminal-data", (id: string, data: string) => {
        console.log("terminal", data)
        if (!terminals[id]) return

        try {
            terminals[id].terminal.write(data)
        } catch (error) {
            console.log("error writing", error)
        }

    })





    socket.on("generate-code", async (fileName: string, code: string, line: number, instructions: string, callback) => {
        try {
            console.log("Reach")
            const res = await generateCode(fileName, code, instructions, line, (chunk) => {
                socket.emit("generate-code-chunk", chunk);
            });
            socket.emit("generate-code-done");
        } catch (error: any) {
            socket.emit("generate-code-error", error.message);
            // callback(false, error.message, "");
        }
    })




    socket.on("disconnect", () => {
        Object.entries(terminals).forEach((t) => {
            const { terminal, onData, onExit } = t[1];
            if (os.platform() !== "win32") terminal.kill
            onData.dispose();
            onExit.dispose();
            delete terminals[t[0]]
        })
    })

})

httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`)
})