"use server";

import { z } from "zod";

import { db } from "@/db";
import { dayMarksTable } from "@/db/schema";
import { authActionClient } from "@/lib/next-safe-action";
import { getTimesheets } from "@/lib/ponto/get-timesheet";

export const getTimesheetAction = authActionClient
  .schema(
    z.object({
      companyId: z.string().uuid("Selecione a empresa"),
      employeeId: z.string().uuid().optional(),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .action(async ({ parsedInput }) => {
    const data = await getTimesheets(parsedInput);
    return { success: true as const, data };
  });

export const setDayMarkAction = authActionClient
  .schema(
    z.object({
      employeeId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      abono: z.boolean(),
      status: z.enum(["normal", "falta", "suspensao"]),
    }),
  )
  .action(async ({ parsedInput }) => {
    await db
      .insert(dayMarksTable)
      .values({
        employeeId: parsedInput.employeeId,
        workDate: parsedInput.date,
        abono: parsedInput.abono,
        status: parsedInput.status,
      })
      .onConflictDoUpdate({
        target: [dayMarksTable.employeeId, dayMarksTable.workDate],
        set: {
          abono: parsedInput.abono,
          status: parsedInput.status,
          updatedAt: new Date(),
        },
      });

    return { success: true as const };
  });
