import express from "express";
import { getAllUsers, getUserWithId, createUser, deleteAllUsers, deleteUserById } from "../services/user-service";
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const users = await getAllUsers();
        res.status(200).json({
            data: users
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: "Missing userId" });
            return
        }
        const user = await getUserWithId(id);
        res.status(200).json(user);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

router.post("/", async (req, res) => {
    const {data} = req.body;
    try {
        const newUser = await createUser(data);
        res.status(201).json(newUser);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});


router.delete("/:id", async (req, res) => {
    const {id} = req.params;
    try {
        const data = await deleteUserById(id);
        res.status(200).json({ message: "All users deleted successfully", data });
        return;
    } catch (err) {
        res.status(500).json({ message: "Failed to delete users" });
        return;
    }
});



export default router;


