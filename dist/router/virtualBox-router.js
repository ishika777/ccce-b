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
const zod_1 = require("zod");
const express_1 = __importDefault(require("express"));
const virtualBox_service_1 = require("../services/virtualBox-service");
const user_service_1 = require("../services/user-service");
const storage_service_1 = require("../services/storage-service");
const router = express_1.default.Router();
// router.get("/", async (req, res) => {
//     try {
//         const all = await getAllVirtualBoxes();
//         res.status(200).json(all);
//     } catch (err: any) {
//         res.status(500).json({ message: err.message });
//     }
// });
router.get("/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const user = yield (0, user_service_1.getUserWithId)(userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" });
            return;
        }
        const virtualBox = yield (0, virtualBox_service_1.getAllVirtualBoxByUser)(userId);
        res.status(200).json(virtualBox);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
}));
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({
        name: zod_1.z.string(),
        userId: zod_1.z.string(),
        type: zod_1.z.enum(["react", "node"]),
        visibility: zod_1.z.enum(["public", "private"]),
    });
    try {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: parseResult.error.issues[0].message,
            });
            return;
        }
        const data = parseResult.data;
        const user = yield (0, user_service_1.getUserWithId)(data.userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" });
            return;
        }
        const existingVirtualBox = yield (0, virtualBox_service_1.getVirtualBoxByName)(data.name);
        if (existingVirtualBox) {
            res.status(400).json({
                message: "VirtualBox with this name already exists. Please choose a different name."
            });
            return;
        }
        const virtualbox = yield (0, virtualBox_service_1.createVirtualBox)(data);
        try {
            yield (0, storage_service_1.initStorage)(virtualbox.id, user.id, data.type);
        }
        catch (storageErr) {
            yield (0, virtualBox_service_1.deleteVirtualBox)(virtualbox.id, user.id);
            res.status(500).json({
                message: `${storageErr.message}`,
            });
            return;
        }
        res.status(201).json({
            message: "Created VirtualBox successfully!",
            virtualbox
        });
    }
    catch (err) {
        res.status(400).json({ messagege: err.message });
    }
}));
router.delete("/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ message: "Missing userId" });
        return;
    }
    const user = yield (0, user_service_1.getUserWithId)(userId);
    if (!user) {
        res.status(404).json({ message: "Invalid Credentials(userId)" });
        return;
    }
    try {
        try {
            yield (0, storage_service_1.deleteUserStorage)(userId);
        }
        catch (storageErr) {
            res.status(500).json({ message: `Storage deletion failed: ${storageErr.message}` });
            return;
        }
        yield (0, virtualBox_service_1.deleteAllVirtualBoxesByUser)(userId);
        res.status(200).json({ message: "Deleted all VirtualBoxes successfully!" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
router.delete("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, userId } = req.body;
    try {
        if (!id || !userId) {
            res.status(400).json({ message: "Missing ID" });
            return;
        }
        const user = yield (0, user_service_1.getUserWithId)(userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" });
            return;
        }
        const vb = yield (0, virtualBox_service_1.getVirtualBoxById)(id);
        if (!vb) {
            res.status(404).json({ message: "Invalid Credentials(VirtualBoxId)" });
            return;
        }
        try {
            yield (0, storage_service_1.deleteStorage)(userId, id);
        }
        catch (storageErr) {
            res.status(500).json({ message: `Storage deletion failed: ${storageErr.message}` });
            return;
        }
        yield (0, virtualBox_service_1.deleteVirtualBox)(id, userId);
        res.status(200).json({ message: "Deleted VirtualBox successfully" });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
}));
router.put("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({
        userId: zod_1.z.string(),
        id: zod_1.z.string(),
        name: zod_1.z.string().optional(),
        visibility: zod_1.z.enum(["public", "private"]).optional(),
    });
    try {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: parseResult.error.issues[0].message,
            });
            return;
        }
        const data = parseResult.data;
        const user = yield (0, user_service_1.getUserWithId)(data.userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" });
            return;
        }
        const vb = yield (0, virtualBox_service_1.getVirtualBoxById)(data.id);
        if (!vb) {
            res.status(404).json({ message: "Invalid Credentials(VirtualBoxId)" });
            return;
        }
        const updatedVb = yield (0, virtualBox_service_1.updateVirtualBox)(data);
        res.status(200).json({
            message: "VirtualBox updated successfully",
            data: updatedVb
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
}));
router.get("/shared/users/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const user = yield (0, user_service_1.getUserWithId)(userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" });
            return;
        }
        const data = yield (0, virtualBox_service_1.getUsersSharedByMe)(userId);
        const finalData = data.map((item) => item.sharedToUser);
        res.status(200).json({ data: finalData });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
}));
router.get("/shared-to-me/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const user = yield (0, user_service_1.getUserWithId)(userId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(userId)" });
            return;
        }
        const data = yield (0, virtualBox_service_1.getVirtualBoxesSharedToMe)(userId);
        res.status(200).json({ data });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
}));
router.post("/share", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({
        virtualboxId: zod_1.z.string(),
        shareById: zod_1.z.string(),
        email: zod_1.z.string(),
    });
    try {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: parseResult.error.issues[0].message,
            });
            return;
        }
        const { virtualboxId, shareById, email } = parseResult.data;
        const vb = yield (0, virtualBox_service_1.getVirtualBoxById)(virtualboxId);
        if (!vb) {
            res.status(404).json({ meeage: "Invalid Credentials(VirtualBoxId)" });
            return;
        }
        const user = yield (0, user_service_1.getUserWithId)(shareById);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(shareById)" });
            return;
        }
        const shareToUser = yield (0, user_service_1.getUserWithEmail)(email);
        if (!shareToUser) {
            res.status(404).json({ message: "Invalid Credentials(email)" });
            return;
        }
        const shareResult = yield (0, virtualBox_service_1.shareVirtualBox)(virtualboxId, shareById, shareToUser.id);
        console.log(shareResult);
        res.status(200).json({
            message: "VirtualBox shared successfully",
            data: shareResult
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
}));
router.delete("/share", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({
        virtualboxId: zod_1.z.string(),
        sharedToId: zod_1.z.string(),
        sharedById: zod_1.z.string()
    });
    try {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: parseResult.error.issues[0].message,
            });
            return;
        }
        const { virtualboxId, sharedToId, sharedById } = parseResult.data;
        const vb = yield (0, virtualBox_service_1.getVirtualBoxById)(virtualboxId);
        if (!vb) {
            res.status(404).json({ meeage: "Invalid Credentials(VirtualBoxId)" });
            return;
        }
        const user = yield (0, user_service_1.getUserWithId)(sharedToId);
        if (!user) {
            res.status(404).json({ message: "Invalid Credentials(sharedToId)" });
            return;
        }
        const sharedByUser = yield (0, user_service_1.getUserWithId)(sharedById);
        if (!sharedByUser) {
            res.status(404).json({ message: "Invalid Credentials(sharedBy)" });
            return;
        }
        const data = yield (0, virtualBox_service_1.removeSharedVirtualBox)(sharedToId, virtualboxId, sharedById);
        res.status(200).json({
            message: "Removed shared vitualbox successfully",
            data
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
}));
router.post("/generate", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({ userId: zod_1.z.string() });
    try {
        const { userId } = schema.parse(req.body);
        yield (0, virtualBox_service_1.incrementGenerations)(userId);
        res.sendStatus(200); // OK
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
}));
// router.get("/delete/utv", async (req, res) => {
//     try {
//         const allData = await deleteUTVData()
//         console.log("All data in usersToVirtualboxes:", allData);
//         res.status(200).json(allData);
//     } catch (err: any) {
//         res.status(500).json({ message: err.message });
//     }
// })
exports.default = router;
