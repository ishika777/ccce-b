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
import tar from "tar-fs";


import userRouter from "./router/user-router";
import virtualBoxRouter from "./router/virtualBox-router";

import { getUserWithId } from "./services/user-service";
import { z } from "zod";
import { createNewFileOrFolder, createProjectZip, deleteFileOrFolder, getFileContentByFullPath, getFolderSizeInMB, getFolderTreeInVirtualBox, getSignedUrl, renameItem, updateFileContent, uploadProjectZip } from "./storage/service";
import { IDisposable, IPty, spawn } from "node-pty"
import { generateCode } from "./services/ai-service";
import Docker from "dockerode"
import { getVirtualBoxById } from "./services/virtualBox-service";
import { ConsoleLogWriter } from "drizzle-orm";


const app = express();

app.use(cors({
    origin: "*"
}))
app.use(express.json())


app.use("/api/user", userRouter);
app.use("/api/virtualbox", virtualBoxRouter);



const docker = new Docker({
    socketPath: '//./pipe/docker_engine'  // Windows named pipe path
});
const dockerfileFolder = path.resolve(__dirname, "..", "dockerfiles");


const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
})

let isOwnerConnected = false;

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

    const { userId, virtualBoxId} = parseResult.data

    const dbUser = await getUserWithId(userId)

    if (!dbUser) {
        next(new Error("Invalid UserId"))
        return;
    }

     const virtualbox = await getVirtualBoxById(virtualBoxId)

    if (!virtualbox) {
        next(new Error("Invalid virtualBoxId"))
        return;
    }
    
    const isOwner = dbUser?.virtualBox.some((box) => box.id === virtualBoxId);

    
    const isSharedUser = dbUser.usersToVirtualboxes.some(
        (utv: any) => utv.virtualboxId === virtualBoxId
    );

    if (!isOwner && !isSharedUser) {
        next(new Error("Neither Owner or Shared User"));
        return;
    }

    socket.data = {
        id: virtualBoxId,
        userId,
        isOwner: isOwner,
    }

    next();
})



io.on("connection", async (socket) => {

    const data = socket.data as {
        userId: string
        id: string
        isOwner: boolean;
    }

    if (data.isOwner) {
        isOwnerConnected = true;
    }
    
    if (!isOwnerConnected) {
        socket.emit("disableAccess", "The virtualbox owner is not connected.");
        return;
    }
    
    socket.on("get-file-tree", async (userId: string, virtualBoxId: string) => {
        const folderTree = await getFolderTreeInVirtualBox(userId, virtualBoxId);
        socket.emit("loaded", folderTree.children)
    });

    socket.on("getFile", async (fullPath: string, callback) => {
        const content = await getFileContentByFullPath(fullPath);
        callback(content);
    })

    socket.on("rename", async (filePath: string, newName: string, callback) => {
        const { success, pathMap } = await renameItem(filePath, newName);
        const folderTree = await getFolderTreeInVirtualBox(data.userId, data.id);
        callback(success, null, pathMap, folderTree.children);

    })

    socket.on("save-file", async (fullPath: string, content: string, callback) => {
        const success = await updateFileContent(fullPath, content);
        callback(success);
    })


    socket.on("create-new-request", async (name: string, type: "file" | "folder", selectedFolder: string, callback) => {
        try {

            await createNewFileOrFolder(name, type, selectedFolder);
            const folderTree = await getFolderTreeInVirtualBox(data.userId, data.id);
            callback(true, null, folderTree.children);
        } catch (error: any) {
            callback(false, error.message, []);
        }
    })

    socket.on("delete-request", async (path, callback) => {
        try {
            await deleteFileOrFolder(path);
            const folderTree = await getFolderTreeInVirtualBox(data.userId, data.id);
            callback(true, null, folderTree.children);
        } catch (error: any) {
            callback(false, error.message, []);
        }

    });



    socket.on("terminal-resize", (dimensions: { cols: number; rows: number }) => {
        Object.values(terminals).forEach((t) => {
            t.terminal.resize(dimensions.cols, dimensions.rows);
        });
    });



    // socket.on("create-terminal", (id: string, callback) => {

    //     if (terminals[id]) {
    //         return;
    //     }

    //     if (Object.keys(terminals).length >= 4) {
    //         socket.emit("terminal-error", "You can only have 4 terminals open at a time.");
    //         return;
    //     }

    //     const projectPath = path.join(__dirname, "..", "..", "projects", data.id);
    //     if (!fs.existsSync(projectPath)) {
    //         fs.mkdirSync(projectPath, { recursive: true });
    //     }

    //     const files = fs.readdirSync(projectPath);
    //     if (files.length === 0) {
    //         fs.writeFileSync(path.join(projectPath, ".placeholder"), "");
    //     }

    // const pty = spawn(os.platform() === "win32" ? "cmd.exe" : "bash", [], {
    //     name: "xterm",
    //     cols: 100,
    //     cwd: projectPath
    // })

    // const onData = pty.onData((data) => {
    //     io.emit("terminal-response", {
    //         id,
    //         data
    //     })
    // })

    // const onExit = pty.onExit((code) => console.log("exit", code))
    // pty.write("clear\n");
    // terminals[id] = {
    //     terminal: pty,
    //     onData,
    //     onExit
    // };

    //     callback()
    // })


    async function handleZipAndUpload(userId: string, vbId: string) {
        const zip = await createProjectZip(userId, vbId);
        const url = await uploadProjectZip(userId, vbId, zip);
    }

    async function buildDockerImageWithArgs(virtualBoxId: string, downloadURL: string) {
        const imageTag = `ccce-react-${virtualBoxId}:latest`;

        if (!fs.existsSync(dockerfileFolder)) {
            throw new Error(`❌ Dockerfile folder does not exist: ${dockerfileFolder}`);
        }

        const tarStream = tar.pack(dockerfileFolder);

        const stream = await docker.buildImage(tarStream, {
            t: imageTag,
            buildargs: {
                DOWNLOAD_URL: downloadURL,
            },
        });


        await new Promise((resolve, reject) => {
            docker.modem.followProgress(
                stream,
                (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res);
                },
            );
        });

        console.log(`🚀 Image successfully built and tagged as: ${imageTag}`);
    }


    // project delete remove image and container


    socket.on("create-terminal", async (id: string, userId: string, virtualBoxId: string, callback) => {
        try {

            if (Object.keys(terminals).length >= 1) {
                socket.emit("terminal-error", "You can only have 1 terminal open at a time.");
                return;
            }

            let hostPort;

            await handleZipAndUpload(userId, virtualBoxId);
            const downloadURL = await getSignedUrl(userId, virtualBoxId);

            const imageTag = `ccce-react-${virtualBoxId}:latest`;

            try {
                await docker.getImage(imageTag).inspect();
            } catch (err) {
                await buildDockerImageWithArgs(virtualBoxId, downloadURL);
            }

            const containerName = `react-${virtualBoxId}`;
            let container;
            try {
                container = docker.getContainer(containerName);
                const data = await container.inspect();

                if (data.State.Status !== 'running') {
                    await container.start();
                }
                hostPort = data.HostConfig.PortBindings["5000/tcp"][0].HostPort;
            } catch (err) {

                const lastTwo = id.slice(-2).replace(/\D/g, "");
                hostPort = `31${lastTwo}`;

                container = await docker.createContainer({
                    Image: imageTag,
                    name: containerName,
                    Tty: true,
                    WorkingDir: "/app",
                    HostConfig: {
                        PortBindings: { "5000/tcp": [{ HostPort: hostPort }] },
                    },
                    ExposedPorts: { "5000/tcp": {} },
                });

                await container.start();
            }

            const pty = spawn("docker", [
                "exec", "-it", "-w", "/app", `react-${virtualBoxId}`, "bash"
            ], {
                name: "xterm-color",
                cols: 100,
                rows: 30,
            });

            const onData = pty.onData((data) => {
                socket.emit("terminal-response", {
                    id,
                    data
                });
            });

            const onExit = pty.onExit(() => { });

            terminals[id] = {
                terminal: pty,
                onData,
                onExit,
            };
        
            socket.emit("preview-url", `http://localhost:${hostPort}`);
            callback();
        } catch (err) {
            console.error("Failed to create terminal:", err);
            callback(err);
        }
    });



    socket.on("terminal-data", (id: string, data: string) => {
        if (!terminals[id]) return

        try {
            terminals[id].terminal.write(data)
        } catch (error) {
            console.log("error writing", error)
        }

    })

    socket.on("close-terminal", async (id: string, virtualBoxId: string, callback) => {
        if (!terminals[id]) {
            console.log(
                "Tried to close, but terminal does not exist. Current terminals:",
                Object.keys(terminals)
            );
            callback(false);
            return;
        }

        try {
            terminals[id].onData.dispose();
            terminals[id].onExit.dispose();

            delete terminals[id];

            const container = docker.getContainer(`react-${virtualBoxId}`);
            if (container) {
                await container.stop();
            } else {
                console.log(`No container found with name react-${virtualBoxId}`);
            }

            callback(true);
        } catch (error) {
            console.error(`Error closing terminal ${id}:`, error);
            callback(false);
        }
    });


    // socket.on("close-terminal", (id: string, callback) => {
    //     if (!terminals[id]) {
    //         console.log(
    //             "tried to close, but term does not exists. terminals",
    //             terminals
    //         );
    //         return;
    //     }

    //     terminals[id].onData.dispose();
    //     terminals[id].onExit.dispose();

    //     delete terminals[id];

    //     callback(true);
    // });





    socket.on("generate-code", async (fileName: string, code: string, line: number, instructions: string, callback) => {
        try {
            await generateCode(fileName, code, instructions, line, (chunk) => {
                socket.emit("generate-code-chunk", chunk);
            });
            socket.emit("generate-code-done");
        } catch (error: any) {
            socket.emit("generate-code-error", error.message);
        }
    })




    socket.on("disconnect", async () => {
        if (data.isOwner) {
            Object.entries(terminals).forEach(async (t) => {
                const { terminal, onData, onExit } = t[1];
                const container = docker.getContainer(`react-${data.id}`);
                if (container) {
                    await container.stop();
                }
                if (os.platform() !== "win32") terminal.kill();
                onData.dispose();
                onExit.dispose();
                delete terminals[t[0]];
            });

            isOwnerConnected = false;

            socket.broadcast.emit(
                "disableAccess",
                "The virtualbox owner has disconnected."
            );
        }

    })

})

httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`)
})