type StarterFile = {
    name: string;
    content: string;
};

async function fetchFilesRecursive(
    folderPath: string,
    basePath = ''
): Promise<StarterFile[]> {
    const apiUrl = `https://api.github.com/repos/ishika777/starter-templates-ccce/contents/${folderPath}`;

    const res = await fetch(apiUrl);
    if (!res.ok) {
        throw new Error(`Failed to fetch files list: ${res.status} ${res.statusText}`);
    }

    const items = (await res.json()) as Array<{
        name: string;
        path: string;
        download_url: string;
        type: string;
    }>;

    const files: StarterFile[] = [];

    for (const item of items) {
        if (item.type === 'file') {
            const fileRes = await fetch(item.download_url);
            if (!fileRes.ok) {
                throw new Error(`Failed to fetch file ${item.path}: ${fileRes.statusText}`);
            }
            const content = await fileRes.text();
            files.push({ name: basePath + item.name, content });
        } else if (item.type === 'dir') {
            const nestedFiles = await fetchFilesRecursive(item.path, basePath + item.name + '/');
            files.push(...nestedFiles);
        }
    }
    return files;
}


export async function fetchStarterFilesFromGitHub(folderName: string): Promise<StarterFile[]> {
    return fetchFilesRecursive(folderName);
}

