"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companiesTable, holidaysTable, workdayRulesTable } from "@/db/schema";
import { authActionClient } from "@/lib/next-safe-action";
import { nationalHolidays } from "@/lib/ponto/holidays";
import { parseClock } from "@/lib/ponto/time";

const clockSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use o formato HH:MM");

export const getJourneyAction = authActionClient
  .schema(z.object({ companyId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const [company] = await db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        toleranceMinutes: companiesTable.toleranceMinutes,
        nightStart: companiesTable.nightStart,
        nightEnd: companiesTable.nightEnd,
      })
      .from(companiesTable)
      .where(eq(companiesTable.id, parsedInput.companyId))
      .limit(1);

    if (!company) throw new Error("Empresa não encontrada");

    const rules = await db
      .select()
      .from(workdayRulesTable)
      .where(eq(workdayRulesTable.companyId, parsedInput.companyId))
      .orderBy(asc(workdayRulesTable.weekday));

    const holidays = await db
      .select()
      .from(holidaysTable)
      .where(eq(holidaysTable.companyId, parsedInput.companyId))
      .orderBy(asc(holidaysTable.holidayDate));

    return { success: true as const, data: { company, rules, holidays } };
  });

export const saveJourneyAction = authActionClient
  .schema(
    z.object({
      companyId: z.string().uuid(),
      toleranceMinutes: z.number().int().min(0).max(120),
      nightStart: clockSchema,
      nightEnd: clockSchema,
      rules: z
        .array(
          z.object({
            weekday: z.number().int().min(0).max(6),
            expected: clockSchema,
            firstOvertime: clockSchema,
          }),
        )
        .length(7),
    }),
  )
  .action(async ({ parsedInput }) => {
    if (parseClock(parsedInput.nightStart) === null || parseClock(parsedInput.nightEnd) === null) {
      throw new Error("Horário do adicional noturno inválido");
    }

    const rules = parsedInput.rules.map((rule) => {
      const expectedMinutes = parseClock(rule.expected);
      const firstOvertimeMinutes = parseClock(rule.firstOvertime);
      if (expectedMinutes === null || firstOvertimeMinutes === null) {
        throw new Error("Carga horária inválida");
      }
      return {
        companyId: parsedInput.companyId,
        weekday: rule.weekday,
        expectedMinutes,
        firstOvertimeMinutes,
      };
    });

    await db.transaction(async (tx) => {
      await tx
        .update(companiesTable)
        .set({
          toleranceMinutes: parsedInput.toleranceMinutes,
          nightStart: parsedInput.nightStart,
          nightEnd: parsedInput.nightEnd,
          updatedAt: new Date(),
        })
        .where(eq(companiesTable.id, parsedInput.companyId));

      await tx
        .delete(workdayRulesTable)
        .where(eq(workdayRulesTable.companyId, parsedInput.companyId));
      await tx.insert(workdayRulesTable).values(rules);
    });

    return { success: true as const };
  });

export const createHolidayAction = authActionClient
  .schema(
    z.object({
      companyId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
      name: z.string().min(3, "Informe o nome do feriado").max(150),
    }),
  )
  .action(async ({ parsedInput }) => {
    await db
      .insert(holidaysTable)
      .values({
        companyId: parsedInput.companyId,
        holidayDate: parsedInput.date,
        name: parsedInput.name.trim(),
      })
      .onConflictDoUpdate({
        target: [holidaysTable.companyId, holidaysTable.holidayDate],
        set: { name: parsedInput.name.trim() },
      });

    return { success: true as const };
  });

export const deleteHolidayAction = authActionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    await db.delete(holidaysTable).where(eq(holidaysTable.id, parsedInput.id));
    return { success: true as const };
  });

export const importHolidaysAction = authActionClient
  .schema(
    z.object({
      companyId: z.string().uuid(),
      year: z.number().int().min(2020).max(2100),
    }),
  )
  .action(async ({ parsedInput }) => {
    const inserted = await db
      .insert(holidaysTable)
      .values(
        nationalHolidays(parsedInput.year).map((holiday) => ({
          companyId: parsedInput.companyId,
          holidayDate: holiday.date,
          name: holiday.name,
        })),
      )
      .onConflictDoNothing({
        target: [holidaysTable.companyId, holidaysTable.holidayDate],
      })
      .returning({ id: holidaysTable.id });

    return { success: true as const, inserted: inserted.length };
  });

export const listCompaniesForSettingsAction = authActionClient
  .schema(z.object({}))
  .action(async () => {
    const data = await db
      .select({ id: companiesTable.id, name: companiesTable.name })
      .from(companiesTable)
      .where(and(eq(companiesTable.active, true)))
      .orderBy(asc(companiesTable.name));
    return { success: true as const, data };
  });
