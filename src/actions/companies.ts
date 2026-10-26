"use server";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companiesTable, workdayRulesTable } from "@/db/schema";
import { authActionClient } from "@/lib/next-safe-action";
import { DEFAULT_RULES } from "@/lib/ponto/constants";
import { emptyToNull, isUniqueViolation } from "@/lib/utils";

const companySchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").max(150),
  cnpj: z.string().max(18),
  contact: z.string().max(150),
  whatsapp: z.string().max(20),
  email: z.union([z.string().email("E-mail inválido"), z.literal("")]),
  active: z.boolean(),
  notes: z.string().max(2000),
});

export const getCompaniesAction = authActionClient
  .schema(z.object({}))
  .action(async () => {
    const data = await db
      .select()
      .from(companiesTable)
      .orderBy(asc(companiesTable.name));
    return { success: true as const, data };
  });

export const createCompanyAction = authActionClient
  .schema(companySchema)
  .action(async ({ parsedInput }) => {
    const company = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(companiesTable)
        .values({
          name: parsedInput.name.trim(),
          cnpj: emptyToNull(parsedInput.cnpj),
          contact: emptyToNull(parsedInput.contact),
          whatsapp: emptyToNull(parsedInput.whatsapp),
          email: emptyToNull(parsedInput.email),
          active: parsedInput.active,
          notes: emptyToNull(parsedInput.notes),
        })
        .returning();

      await tx.insert(workdayRulesTable).values(
        DEFAULT_RULES.map((rule) => ({
          companyId: created.id,
          weekday: rule.weekday,
          expectedMinutes: rule.expectedMinutes,
          firstOvertimeMinutes: rule.firstOvertimeMinutes,
        })),
      );

      return created;
    });

    return { success: true as const, id: company.id };
  });

export const updateCompanyAction = authActionClient
  .schema(companySchema.extend({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const [company] = await db
      .update(companiesTable)
      .set({
        name: parsedInput.name.trim(),
        cnpj: emptyToNull(parsedInput.cnpj),
        contact: emptyToNull(parsedInput.contact),
        whatsapp: emptyToNull(parsedInput.whatsapp),
        email: emptyToNull(parsedInput.email),
        active: parsedInput.active,
        notes: emptyToNull(parsedInput.notes),
        updatedAt: new Date(),
      })
      .where(eq(companiesTable.id, parsedInput.id))
      .returning({ id: companiesTable.id });

    if (!company) throw new Error("Empresa não encontrada");
    return { success: true as const };
  });

export const deleteCompanyAction = authActionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    try {
      await db.delete(companiesTable).where(eq(companiesTable.id, parsedInput.id));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("Não foi possível excluir a empresa");
      }
      throw error;
    }
    return { success: true as const };
  });
