"use server";

import { randomUUID } from "crypto";

import { asc, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import { db } from "@/db";
import { accountsTable, usersTable } from "@/db/schema";
import { authActionClient } from "@/lib/next-safe-action";
import { isUniqueViolation } from "@/lib/utils";

export const getUsersAction = authActionClient.schema(z.object({})).action(async () => {
  const data = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(asc(usersTable.name));

  return { success: true as const, data };
});

export const createUserAction = authActionClient
  .schema(
    z.object({
      name: z.string().min(3, "Informe o nome").max(150),
      email: z.string().email("E-mail inválido"),
      password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
      isActive: z.boolean(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const now = new Date();
    const id = randomUUID();

    try {
      await db.insert(usersTable).values({
        id,
        name: parsedInput.name.trim(),
        email: parsedInput.email.trim().toLowerCase(),
        emailVerified: true,
        isActive: parsedInput.isActive,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(accountsTable).values({
        id: randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: await hashPassword(parsedInput.password),
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error("Este e-mail já está em uso");
      throw error;
    }

    return { success: true as const, id };
  });

export const setUserActiveAction = authActionClient
  .schema(z.object({ id: z.string().min(1), isActive: z.boolean() }))
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.id === ctx.user.id && !parsedInput.isActive) {
      throw new Error("Você não pode desativar o próprio usuário");
    }

    await db
      .update(usersTable)
      .set({ isActive: parsedInput.isActive, updatedAt: new Date() })
      .where(eq(usersTable.id, parsedInput.id));

    return { success: true as const };
  });

export const deleteUserAction = authActionClient
  .schema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.id === ctx.user.id) {
      throw new Error("Você não pode excluir o próprio usuário");
    }

    await db.delete(usersTable).where(eq(usersTable.id, parsedInput.id));
    return { success: true as const };
  });
