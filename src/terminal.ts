import { Socket } from "socket.io";
import { IPty, spawn } from "node-pty"
import os from "os"

export class Pty {
    socket: Socket;
    ptyProcess: IPty;
    id: string

    constructor(socket: Socket, id: string, cwd: string) {
        this.socket = socket;
        this.id = id

        this.ptyProcess = spawn(os.platform() === "win32" ? "cmd.exe" : "bash", [], {
            name: "xterm",
            cols: 100,
            cwd: cwd
        })

        this.ptyProcess.onData((data) => {
            this.send(data);
        });
    }
    
    write = (data: string) => {
        this.ptyProcess.write(data)
    }

    send = (data: string) => {
        this.socket.emit("terminal-response", {
            data: Buffer.from(data, "utf-8")
        })
    }

}