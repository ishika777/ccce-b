import { db } from "../database";
import { user, virtualBox, usersToVirtualboxes } from "../database/schema"
import { eq, and, sql } from "drizzle-orm";

export const getAllVirtualBoxByUser = async (id: string) => {
    return await db.query.virtualBox.findMany({
        where: (vb, { eq }) => eq(vb.userId, id),
        with: {
            usersToVirtualboxes: true,
        },
    });
};

export const getVirtualBoxById = async (id: string) => {
    return await db.query.virtualBox.findFirst({
        where: (vb, { eq }) => eq(vb.id, id),
    });
}

export const getVirtualBoxByName = async (name: string) => {
    return await db.query.virtualBox.findFirst({
        where: (vb, { eq }) => eq(vb.name, name),
    });
}

export const getAllVirtualBoxes = async () => {
    return await db.select().from(virtualBox).all();
};

export const deleteAllVirtualBoxesByUser = async (userId: string) => {
    return await db.delete(virtualBox).where(eq(virtualBox.userId, userId));
}

export const deleteVirtualBox = async (id: string, userId: string) => {
    await db.delete(usersToVirtualboxes).where(
        eq(usersToVirtualboxes.virtualboxId, id)
    );


    const deleted = await db.delete(virtualBox).where(
        and(eq(virtualBox.id, id), eq(virtualBox.userId, userId))
    );

    return deleted;
};

export const createVirtualBox = async (data: {
    type: "react" | "node";
    name: string;
    userId: string;
    visibility: "public" | "private";
}) => {
    return await db.insert(virtualBox)
        .values(data)
        .returning()
        .get();
};

export const updateVirtualBox = async (data: {
    id: string;
    name?: string;
    visibility?: "public" | "private";
    userId: string;
}) => {
    return await db.update(virtualBox)
        .set({ name: data.name, visibility: data.visibility })
        .where(and(eq(virtualBox.id, data.id), eq(virtualBox.userId, data.userId)))
        .returning()
        .get();
};

export const getVirtualBoxesSharedToMe = async (userId: string) => {
    const sharedBoxes = await db.query.usersToVirtualboxes.findMany({
        where: (utv, { eq }) => eq(utv.sharedTo, userId),
        with: {
            virtualBox: true,
            sharedByUser: true,
        },
    });

    return sharedBoxes;
}

export const getUsersSharedByMe = async (userId: string) => {
    const shares = await db.query.usersToVirtualboxes.findMany({
        where: (utv, { eq }) => eq(utv.sharedBy, userId),
        with: {
            sharedToUser: true,
        },
    });

    return shares;
}

export const shareVirtualBox = async (virtualboxId: string, sharedById: string, shareToUserId: string) => {

    if (sharedById === shareToUserId) {
        throw new Error("Cannot share a virtual-box with yourself");
    }

    const alreadyShared = await db.query.usersToVirtualboxes.findFirst({
        where: (utv, { and, eq }) =>
            and(eq(utv.sharedTo, shareToUserId), eq(utv.virtualboxId, virtualboxId)),
    });

    if (alreadyShared) {
        throw new Error("User already has access");
    }

    return await db.insert(usersToVirtualboxes).values({
        sharedTo: shareToUserId,
        virtualboxId,
        sharedOn: new Date(),
        sharedBy: sharedById
    }).returning().get();

};

export const removeSharedVirtualBox = async (
    sharedToId: string,
    virtualboxId: string,
    sharedById: string
) => {
    const res = await db.delete(usersToVirtualboxes).where(
        and(
            eq(usersToVirtualboxes.sharedTo, sharedToId),
            eq(usersToVirtualboxes.virtualboxId, virtualboxId),
            eq(usersToVirtualboxes.sharedBy, sharedById)
        )
    ).returning();
    if(res.length == 0){
        throw Error("VirtualBox not shared with user");
    }
    return res;
};













export const incrementGenerations = async (userId: string) => {
    const user = await db.query.user.findFirst({
        where: (user, { eq }) => eq(user.id, userId),
    });

    if (!user) throw new Error("User not found");
    if (user.generations !== null && user.generations >= 30) {
        throw new Error("You reached the maximum # of generations.");
    }

    // await db.update(user)
    // .set({ generations: sql`${user.generations} + 1` })
    // .where(eq(user.id, userId))
    // .get();
};


export const deleteUTVData = async () => {
    const allData = await db.select().from(usersToVirtualboxes).all();
    console.log("All data in usersToVirtualboxes:", allData);

    if (allData.length === 0) {
        return;
    }

    return await db.delete(usersToVirtualboxes).returning().get();
};