"use server";

import { and, desc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companiesTable, employeesTable, punchesTable } from "@/db/schema";
import { authActionClient } from "@/lib/next-safe-action";
import { duplicatePunchMessage, type PunchType } from "@/lib/ponto/constants";
import { addDays, saoPauloDateTime } from "@/lib/ponto/time";
import { isUniqueViolation } from "@/lib/utils";

const punchTypeSchema = z.enum(["entry", "lunch_out", "lunch_in", "exit"]);

export const getPunchesAction = authActionClient
  .schema(
    z.object({
      companyId: z.string().uuid().optional(),
      employeeId: z.string().uuid().optional(),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .action(async ({ parsedInput }) => {
    const filters = [
      gte(punchesTable.punchedAt, saoPauloDateTime(parsedInput.from, "00:00")),
      lt(punchesTable.punchedAt, saoPauloDateTime(addDays(parsedInput.to, 1), "00:00")),
    ];
    if (parsedInput.companyId) filters.push(eq(employeesTable.companyId, parsedInput.companyId));
    if (parsedInput.employeeId) filters.push(eq(punchesTable.employeeId, parsedInput.employeeId));

    const data = await db
      .select({
        id: punchesTable.id,
        employeeId: punchesTable.employeeId,
        employeeName: employeesTable.name,
        registration: employeesTable.registration,
        companyName: companiesTable.name,
        type: punchesTable.type,
        punchedAt: punchesTable.punchedAt,
        source: punchesTable.source,
        faceDistance: punchesTable.faceDistance,
      })
      .from(punchesTable)
      .innerJoin(employeesTable, eq(punchesTable.employeeId, employeesTable.id))
      .innerJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
      .where(and(...filters))
      .orderBy(desc(punchesTable.punchedAt))
      .limit(500);

    return { success: true as const, data };
  });

export const createPunchAction = authActionClient
  .schema(
    z.object({
      employeeId: z.string().uuid("Selecione o funcionário"),
      type: punchTypeSchema,
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
      time: z.string().regex(/^\d{2}:\d{2}$/, "Informe a hora"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const [employee] = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(eq(employeesTable.id, parsedInput.employeeId))
      .limit(1);

    if (!employee) throw new Error("Funcionário não encontrado");

    const dayStart = saoPauloDateTime(parsedInput.date, "00:00");
    const dayEnd = saoPauloDateTime(addDays(parsedInput.date, 1), "00:00");
    const [existing] = await db
      .select({ id: punchesTable.id })
      .from(punchesTable)
      .where(
        and(
          eq(punchesTable.employeeId, parsedInput.employeeId),
          eq(punchesTable.type, parsedInput.type),
          gte(punchesTable.punchedAt, dayStart),
          lt(punchesTable.punchedAt, dayEnd),
        ),
      )
      .limit(1);

    if (existing) throw new Error(duplicatePunchMessage(parsedInput.type as PunchType));

    let punch: { id: string };
    try {
      [punch] = await db
        .insert(punchesTable)
        .values({
          employeeId: parsedInput.employeeId,
          type: parsedInput.type,
          punchedAt: saoPauloDateTime(parsedInput.date, parsedInput.time),
          source: "manual",
          createdByUserId: ctx.user.id,
        })
        .returning({ id: punchesTable.id });
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error(duplicatePunchMessage(parsedInput.type as PunchType));
      throw error;
    }

    return { success: true as const, id: punch.id };
  });

export const deletePunchAction = authActionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    await db.delete(punchesTable).where(eq(punchesTable.id, parsedInput.id));
    return { success: true as const };
  });
