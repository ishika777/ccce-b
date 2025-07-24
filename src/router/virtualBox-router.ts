import { z } from "zod";
import express from "express";

import {
    getVirtualBoxById,
    getAllVirtualBoxes,
    deleteVirtualBox,
    updateVirtualBox,
    createVirtualBox,
    shareVirtualBox,
    removeSharedVirtualBox,
    incrementGenerations,
    getAllVirtualBoxByUser,
    deleteAllVirtualBoxesByUser,
    getVirtualBoxByName,
    deleteUTVData,
    getUsersSharedByMe,
    deleteAllVirtualBoxes,
} from "../services/virtualBox-service";
import { getUserWithEmail, getUserWithId } from "../services/user-service";
import { deleteStorage, deleteUserStorage, initStorage } from "../services/storage-service";

const router = express.Router();

router.delete("/whole", async (req, res) => {
    try {
        const all = await deleteAllVirtualBoxes();
        res.status(200).json(all);
    } catch (err: any) {
        res.status(500).json({ message: err.message });

    }
})


router.get("/", async (req, res) => {
    try {
        const all = await getAllVirtualBoxes();
        res.status(200).json(all);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await getUserWithId(userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" })
            return
        }
        const virtualBox = await getAllVirtualBoxByUser(userId);
        res.status(200).json(virtualBox);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

router.get("/id/:id", async(req, res) => {
    const { id } = req.params;
    try {
        const vb = await getVirtualBoxById(id);
        res.status(200).json({virtualBox: vb});
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
})

router.post("/", async (req, res) => {

    const schema = z.object({
        name: z.string(),
        userId: z.string(),
        type: z.enum(["react", "node"]),
        visibility: z.enum(["public", "private"]),
    });

    try {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: parseResult.error.issues[0].message,
            });
            return
        }
        const data = parseResult.data;

        const user = await getUserWithId(data.userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" })
            return
        }


        const existingVirtualBox = await getVirtualBoxByName(data.name);
        if (existingVirtualBox) {
            res.status(400).json({
                message: "VirtualBox with this name already exists. Please choose a different name."
            });
            return;
        }

        const virtualbox = await createVirtualBox(data);

        try {
            await initStorage(virtualbox.id, user.id, data.type);
        } catch (storageErr: any) {

            await deleteVirtualBox(virtualbox.id, user.id);
            res.status(500).json({
                message: `${storageErr.message}`,
            });
            return
        }
        res.status(201).json({
            message: "Created VirtualBox successfully!",
            virtualbox
        });
    } catch (err: any) {
        res.status(400).json({ messagege: err.message });
    }
});

router.delete("/all", async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        res.status(400).json({ message: "Missing userId" });
        return
    }
    const user = await getUserWithId(userId);
    if (!user) {
        res.status(404).json({ message: "Invalid Credentials(userId)" })
        return;
    }

    try {
        try {
            await deleteUserStorage(userId);
        } catch (storageErr: any) {
            res.status(500).json({ message: `Storage deletion failed: ${storageErr.message}` });
            return;
        }
        await deleteAllVirtualBoxesByUser(userId);
        console.log("yess2")
        res.status(200).json({ message: "Deleted all VirtualBoxes successfully!" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.delete("/", async (req, res) => {
    const { id, userId } = req.body;
    try {
        if (!id || !userId) {
            res.status(400).json({ message: "Missing ID" });
            return
        }
        const user = await getUserWithId(userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" })
            return;
        }
        const vb = await getVirtualBoxById(id);
        if (!vb) {
            res.status(404).json({ message: "Invalid Credentials(VirtualBoxId)" });
            return;
        }

        try {
            await deleteStorage(userId, id);
        } catch (storageErr: any) {
            res.status(500).json({ message: `Storage deletion failed: ${storageErr.message}` });
            return;
        }
        await deleteVirtualBox(id, userId);
        res.status(200).json({ message: "Deleted VirtualBox successfully" });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

router.put("/", async (req, res) => {
    const schema = z.object({
        userId: z.string(),
        id: z.string(),
        name: z.string().optional(),
        visibility: z.enum(["public", "private"]).optional(),
    });

    try {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: parseResult.error.issues[0].message,
            });
            return
        }
        const data = parseResult.data;

        const user = await getUserWithId(data.userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" })
            return;
        }
        const vb = await getVirtualBoxById(data.id);
        if (!vb) {
            res.status(404).json({ message: "Invalid Credentials(VirtualBoxId)" });
            return;
        }
        const updatedVb = await updateVirtualBox(data);
        res.status(200).json({
            message: "VirtualBox updated successfully",
            data: updatedVb
        });
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

router.get("/shared/users/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await getUserWithId(userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" })
            return;
        }
        const data = await getUsersSharedByMe(userId);
        const finalData = data.map((item) => item.sharedToUser)
        res.status(200).json({ data: finalData });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});


router.post("/share", async (req, res) => {
    const schema = z.object({
        virtualboxId: z.string(),
        shareById: z.string(),
        email: z.string(),
    });

    try {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: parseResult.error.issues[0].message,
            });
            return
        }
        const { virtualboxId, shareById, email } = parseResult.data;

        const vb = await getVirtualBoxById(virtualboxId);
        if (!vb) {
            res.status(404).json({ meeage: "Invalid Credentials(VirtualBoxId)" });
            return;
        }

        const user = await getUserWithId(shareById);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(shareById)" });
            return;
        }

        const shareToUser = await getUserWithEmail(email);
        if (!shareToUser) {
            res.status(404).json({ message: "Invalid Credentials(email)" });
            return;
        }

        const shareResult = await shareVirtualBox(virtualboxId, shareById, shareToUser.id);
        console.log(shareResult)
        res.status(200).json({
            message: "VirtualBox shared successfully",
            data: shareResult
        })
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

router.delete("/share", async (req, res) => {
    const schema = z.object({
        virtualboxId: z.string(),
        sharedToId: z.string(),
        sharedById: z.string()
    });

    try {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: parseResult.error.issues[0].message,
            });
            return
        }
        const { virtualboxId, sharedToId, sharedById } = parseResult.data;


        const vb = await getVirtualBoxById(virtualboxId);
        if (!vb) {
            res.status(404).json({ meeage: "Invalid Credentials(VirtualBoxId)" });
            return;
        }

        const user = await getUserWithId(sharedToId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(sharedToId)" });
            return;
        }

        const sharedByUser = await getUserWithId(sharedById);
        if (!sharedByUser) {
            res.status(404).json({ message: "Invalid Credentials(sharedBy)" });
            return;
        }

        const data = await removeSharedVirtualBox(sharedToId, virtualboxId, sharedById);

        res.status(200).json({
            message: "Removed shared vitualbox successfully",
            data
        })
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});



















router.post("/generate", async (req, res) => {
    const schema = z.object({ userId: z.string() });

    try {
        const { userId } = schema.parse(req.body);
        await incrementGenerations(userId);
        res.sendStatus(200); // OK
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});




router.get("/delete/utv", async (req, res) => {
    try {
        const allData = await deleteUTVData()
        res.status(200).json(allData);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
})

export default router;
