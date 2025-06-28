import { z } from "zod";
import { db } from "../database";
import { user as userModel } from "../database/schema";

export const getAllUsers = async () => {
    const data = await db.select().from(userModel).all();
    return data;
}

export const getUserWithEmail = async (email: string) => {
    const data = await db.query.user.findFirst({
        where: (user, {eq}) => eq(user.email, email),
        with: {
            virtualBox: true,
            usersToVirtualboxes: true
        }
    })
    return data
}

export const getUserWithId = async (id: string) => {
    const data = await db.query.user.findFirst({
        where: (user, {eq}) => eq(user.id, id),
        with: {
            virtualBox: true,
            usersToVirtualboxes: true
        }
    })
    return data
}

type DataType = {
    id: string;
    name: string;
    email: string;
};

export const createUser = async (data: DataType) => {
    const userSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email()
    })
    const {id, name, email} = userSchema.parse(data);
    const user = await db.insert(userModel).values({id, name, email}).returning().get();
    return user;
}


export const deleteAllUsers = async () => {
    await db.delete(userModel);
};