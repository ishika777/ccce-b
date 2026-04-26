import { TFolder } from '../types';
import { supabase } from './supabaseClient';
import JSZip from "jszip";
import crypto from "crypto";



const generateStableId = (fullPath: string): string => {
  return crypto.createHash("md5").update(fullPath).digest("hex");
}

const listAllFiles = async (path: string, collectedPaths: string[] = []) => {
    const { data, error } = await supabase.storage.from('file-storage').list(path, { limit: 1000 });
    // console.log("Listing files in:", data);

    if (error) throw new Error(`Failed to list files in ${path}: ${error.message}`);

    for (const item of data) {
        const fullPath = `${path}/${item.name}`;

        // console.log("Item found:", item);
        // console.log("Full path:", fullPath);

        if (item.metadata) {
            collectedPaths.push(fullPath);
        } else {
            await listAllFiles(fullPath, collectedPaths);
        }
    }

    return collectedPaths;
};




export async function getSignedUrl(userId: string, virtualBoxId: string, fileName = 'project.zip') {
    const filePath = `${userId}/${virtualBoxId}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('file-storage')
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry (3600 seconds)

    if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
}


export async function createProjectZip(userId: string, virtualBoxId: string): Promise<Buffer> {
    const baseFolder = `${userId}/${virtualBoxId}`;
    const zip = new JSZip();

    let files
    try {
        files = await listAllFiles(baseFolder);
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }


    // Download each file and add to zip
    await Promise.all(
        files.map(async (filePath) => {
            const relativePath = filePath.slice(baseFolder.length + 1); // remove prefix + slash

            const { data, error } = await supabase.storage.from('file-storage').download(filePath);
            if (error) throw new Error(`Failed to download ${filePath}: ${error.message}`);

            const buffer = await data.arrayBuffer();
            zip.file(relativePath, Buffer.from(buffer));
        })
    );

    return zip.generateAsync({ type: "nodebuffer" });
}

export async function uploadProjectZip(userId: string, virtualBoxId: string, zipBuffer: Buffer): Promise<string> {
    const filePath = `${userId}/${virtualBoxId}/project.zip`;

    const { error: deleteError } = await supabase.storage
        .from('file-storage')
        .remove([filePath]);

    if (deleteError) {
        throw new Error(`Failed to delete files in ${filePath}: ${deleteError.message}`);
    }

    const { error } = await supabase.storage
        .from("file-storage")
        .upload(filePath, zipBuffer, {
            upsert: true,
            contentType: "application/zip",
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/file-storage/${filePath}`;
    return publicUrl;
}


type StarterFile = {
    name: string;
    content: Buffer | string;
};

export async function uploadStarterFiles(userId: string, virtualBoxId: string, files: StarterFile[]): Promise<void> {
    try {
        await Promise.all(
            files.map(async (file) => {
                const fileBuffer = Buffer.isBuffer(file.content)
                    ? file.content
                    : Buffer.from(file.content);

                const uint8Array = new Uint8Array(fileBuffer);
                if (uint8Array.length === 0) {
                    throw new Error(`File "${file.name}" is empty or invalid`);
                }

                const blob = new Blob([uint8Array]);

                const filePath = `${userId}/${virtualBoxId}/${file.name}`;

                const { error } = await supabase.storage
                    .from('file-storage')
                    .upload(filePath, blob, {
                        upsert: true,
                        contentType: 'text/plain',
                    });

                if (error) {
                    throw new Error(`Failed to upload ${file.name}: ${error.message}`);
                }
            })
        );
    } catch (err) {
        throw new Error(`Storage upload failed: ${(err as Error).message}`);
    }
}

export async function deleteVirtualBox(userId: string, virtualBoxId: string): Promise<void> {

    const folderPath = `${userId}/${virtualBoxId}`;

    const filePathsToDelete = await listAllFiles(folderPath);

    if (filePathsToDelete.length === 0) {
        throw new Error(`No files found in ${folderPath}`);
    }

    const { error: deleteError } = await supabase.storage
        .from('file-storage')
        .remove(filePathsToDelete);

    if (deleteError) {
        throw new Error(`Failed to delete files in ${folderPath}: ${deleteError.message}`);
    }

}

export async function deleteUserStorageFolder(userId: string): Promise<void> {

    const userFolderPath = `${userId}`;

    const filesToDelete = await listAllFiles(userFolderPath);

    if (filesToDelete.length === 0) {
        console.warn(`No files found under userId: ${userId}`);
        return;
    }

    const { error: deleteError } = await supabase.storage.from('file-storage').remove(filesToDelete);

    if (deleteError) {
        throw new Error(`Failed to delete files for userId: ${userId} - ${deleteError.message}`);
    }

}

export async function getFileContentByFullPath(fullPath: string): Promise<string> {

    const { data, error } = await supabase.storage
        .from("file-storage")
        .download(fullPath);

    if (error || !data) {
        throw new Error(`Failed to fetch file at ${fullPath}: ${error?.message}`);
    }

    const text = await data.text();
    return text;
}

export async function buildFolderTree(prefix: string, name: string): Promise<TFolder> {

    const folderId = generateStableId(prefix);

    const folder: TFolder = {
        id: folderId,
        type: "folder",
        name,
        fullPath: prefix,
        children: []
    }

    const { data, error } = await supabase.storage
        .from("file-storage")
        .list(prefix);


    if (error) {
        throw new Error(`Failed to list folder ${prefix}: ${error.message}`);
    }

    for (const item of data) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.metadata) {
            const fileId = generateStableId(fullPath);
            folder.children.push({
                id: fileId,
                type: "file",
                name: item.name,
                fullPath,
            });
        } else {
            const subFolder = await buildFolderTree(fullPath, item.name);
            folder.children.push(subFolder);
        }
    }


    return folder;
}

export async function getFolderTreeInVirtualBox(userId: string, virtualBoxId: string): Promise<TFolder> {
    
    const rootPrefix = `${userId}/${virtualBoxId}`;
    const rootFolderName = virtualBoxId;

    try {
        const tree: TFolder = await buildFolderTree(rootPrefix, rootFolderName);
        return tree;
    } catch (error) {
        throw error
    }
}

export async function renameItem(fullPath: string, newName: string): Promise<{ success: boolean }> {

    const parts = fullPath.split("/");
    const oldName = parts.pop();
    const basePath = parts.join("/");
    const newFullPath = `${basePath}/${newName}`;

    const isFile = oldName?.includes(".");
    const storage = supabase.storage.from("file-storage");


    try {
        if (isFile) {
            const { data, error: downloadError } = await storage.download(fullPath);
            
            if (downloadError || !data) return { success: false };

            const uploadRes = await storage.upload(newFullPath, data, { upsert: true });
            if (uploadRes.error) return { success: false };

            const deleteRes = await storage.remove([fullPath]);
            if (deleteRes.error) return { success: false };

            return { success: true };
        } else {
            const allFiles = await listAllFiles(fullPath);

            for (const file of allFiles) {
                const fileName = file.slice(fullPath.length + 1);
                const newFilePath = `${newFullPath}/${fileName}`;

                const { data, error: downloadError } = await storage.download(file);
                if (downloadError || !data) return { success: false };

                const uploadRes = await storage.upload(newFilePath, data, { upsert: true });
                if (uploadRes.error) return { success: false };

                const deleteRes = await storage.remove([file]);
                if (deleteRes.error) return { success: false };

            }

            return { success: true };
        }

    } catch (err) {
        console.error("Rename failed:", err);
        return { success: false };
    }
}

export async function updateFileContent(fullPath: string, content: string): Promise<boolean> {

    const blob = new Blob([content], { type: "text/plain" });

    const { error } = await supabase.storage.from("file-storage").upload(fullPath, blob, {
        upsert: true,
    });

    if (error) {
        console.error("❌ Failed to update file:", error.message);
        return false;
    }

    return true;
}

export async function createNewFileOrFolder(
    name: string,
    type: "file" | "folder",
    selectedFolderPath: string,
): Promise<void> {
    const filePath = type === "file"
        ? `${selectedFolderPath}/${name}`
        : `${selectedFolderPath}/${name}/.placeholder`;

    const content = type === "file" ? "" : ".folder";
    const blob = new Blob([new Uint8Array(Buffer.from(content))]);

    const { error } = await supabase
        .storage
        .from("file-storage")
        .upload(filePath, blob, {
            upsert: true,
            contentType: "text/plain",
        });

    if (error) {
        throw new Error(`Supabase ${type} upload failed: ${error.message}`);
    }
}

export async function deleteFileOrFolder(path: string): Promise<void> {
    const isFile = path.split("/").pop()?.includes(".");

    if (isFile) {
        const { data, error } = await supabase.storage
            .from("file-storage")
            .remove([path]);

        if (error || !data) {
            throw new Error(`Failed to delete file ${path}: ${error?.message ?? "Unknown error or invalid bucket"}`);
        }

    } else {
        const { error } = await supabase.storage
            .from("file-storage")
            .list(path, { limit: 10000 });

        if (error) {
            throw new Error(`Failed to list folder ${path}: ${error.message}`);
        }

        const filesToDelete = await listAllFiles(path);

        if (filesToDelete.length > 0) {
            const { error } = await supabase.storage
                .from("file-storage")
                .remove(filesToDelete);

            if (error) {
                throw new Error(`Failed to delete contents of ${path}: ${error.message}`);
            }
        }
    }
}
