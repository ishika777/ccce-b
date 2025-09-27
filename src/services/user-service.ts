import { z } from "zod";
import { db } from "../database";
import { user } from "../database/schema";
import { eq } from "drizzle-orm";

export const getAllUsers = async () => {
    const data = await db.select().from(user).all();
    return data;
}

export const getUserWithEmail = async (email: string) => {
    const data = await db.query.user.findFirst({
        where: () => eq(user.email, email),
        with: {
            virtualBox: true,
            usersToVirtualboxes: true
        }
    })
    return data
}

export const getUserWithId = async (id: string) => {
  return await db.query.user.findFirst({
    where: () => eq(user.id, id),
    with: {
      virtualBox: true,
      usersToVirtualboxes: true,
    },
  });
};

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
    const createdUser = await db.insert(user).values({id, name, email}).returning().get();
    return createdUser;
}

export const deleteUserById = async (id: string) => {
    const idSchema = z.string().min(1, "User ID is required");
    const userId = idSchema.parse(id);

    return await db
        .delete(user)
        .where(eq(user.id, userId))
        .returning()
        .get();

};

export const deleteAllUsers = async () => {
    return await db.delete(user).returning().get()
};