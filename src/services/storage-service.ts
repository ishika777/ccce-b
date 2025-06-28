import { deleteUserStorageFolder, deleteVirtualBox, uploadStarterFiles } from "../storage/service";
import { fetchStarterFilesFromGitHub } from "./file-service";

export const initStorage = async (virtualboxId: string, userId: string, type: "react" | "node") => {

    const folderName = type === "react" ? "react-basic" : "node-basic"
    const files = await fetchStarterFilesFromGitHub(folderName)

    await uploadStarterFiles(userId, virtualboxId, files);
}

export const deleteStorage = async(userId: string, virtualboxId: string) => {
    await deleteVirtualBox(userId, virtualboxId)
}

export const deleteUserStorage = async(userId: string) => {
    await deleteUserStorageFolder(userId)
}