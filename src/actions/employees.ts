"use server";

import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companiesTable, employeesTable } from "@/db/schema";
import { authActionClient } from "@/lib/next-safe-action";
import { parseDescriptor } from "@/lib/ponto/face-match";
import { isUniqueViolation } from "@/lib/utils";

const employeeSchema = z.object({
  companyId: z.string().uuid("Selecione a empresa"),
  registration: z.string().min(1, "Informe o registro").max(30),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").max(150),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de admissão"),
  active: z.boolean(),
  faceDescriptor: z.array(z.number()).length(128).nullable(),
  facePhoto: z.string().max(200_000).nullable(),
  clearFace: z.boolean(),
});

function faceValues(input: z.infer<typeof employeeSchema>) {
  if (input.clearFace) return { faceDescriptor: null, facePhoto: null };
  if (!input.faceDescriptor) return {};
  const descriptor = parseDescriptor(input.faceDescriptor);
  if (!descriptor) throw new Error("A facial capturada é inválida");
  return {
    faceDescriptor: descriptor,
    facePhoto: input.facePhoto,
  };
}

export const getEmployeesAction = authActionClient
  .schema(
    z.object({
      companyId: z.string().uuid().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const filters = parsedInput.companyId
      ? eq(employeesTable.companyId, parsedInput.companyId)
      : undefined;

    const data = await db
      .select({
        id: employeesTable.id,
        companyId: employeesTable.companyId,
        companyName: companiesTable.name,
        registration: employeesTable.registration,
        name: employeesTable.name,
        admissionDate: employeesTable.admissionDate,
        active: employeesTable.active,
        facePhoto: employeesTable.facePhoto,
        hasFace: sql<boolean>`${employeesTable.faceDescriptor} is not null`.as("has_face"),
      })
      .from(employeesTable)
      .innerJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
      .where(filters)
      .orderBy(asc(companiesTable.name), asc(employeesTable.name));

    return { success: true as const, data };
  });

export const createEmployeeAction = authActionClient
  .schema(employeeSchema)
  .action(async ({ parsedInput }) => {
    try {
      const [employee] = await db
        .insert(employeesTable)
        .values({
          companyId: parsedInput.companyId,
          registration: parsedInput.registration.trim(),
          name: parsedInput.name.trim(),
          admissionDate: parsedInput.admissionDate,
          active: parsedInput.active,
          ...faceValues(parsedInput),
        })
        .returning({ id: employeesTable.id });

      return { success: true as const, id: employee.id };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("Já existe um funcionário com este registro nesta empresa");
      }
      throw error;
    }
  });

export const updateEmployeeAction = authActionClient
  .schema(employeeSchema.extend({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    try {
      const [employee] = await db
        .update(employeesTable)
        .set({
          companyId: parsedInput.companyId,
          registration: parsedInput.registration.trim(),
          name: parsedInput.name.trim(),
          admissionDate: parsedInput.admissionDate,
          active: parsedInput.active,
          updatedAt: new Date(),
          ...faceValues(parsedInput),
        })
        .where(eq(employeesTable.id, parsedInput.id))
        .returning({ id: employeesTable.id });

      if (!employee) throw new Error("Funcionário não encontrado");
      return { success: true as const };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("Já existe um funcionário com este registro nesta empresa");
      }
      throw error;
    }
  });

export const deleteEmployeeAction = authActionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    await db.delete(employeesTable).where(eq(employeesTable.id, parsedInput.id));
    return { success: true as const };
  });
