import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { companiesTable, employeesTable, punchesTable } from "@/db/schema";
import { addDays, saoPauloDateTime, todayInSaoPaulo } from "@/lib/ponto/time";

export async function getDashboardStats() {
  const today = todayInSaoPaulo();
  const start = saoPauloDateTime(today, "00:00");
  const end = saoPauloDateTime(addDays(today, 1), "00:00");

  const [companies] = await db
    .select({ value: count() })
    .from(companiesTable)
    .where(eq(companiesTable.active, true));

  const [employees] = await db
    .select({ value: count() })
    .from(employeesTable)
    .where(eq(employeesTable.active, true));

  const [withoutFace] = await db
    .select({ value: count() })
    .from(employeesTable)
    .where(and(eq(employeesTable.active, true), sql`${employeesTable.faceDescriptor} is null`));

  const [punchesToday] = await db
    .select({ value: count() })
    .from(punchesTable)
    .where(and(gte(punchesTable.punchedAt, start), lt(punchesTable.punchedAt, end)));

  const recent = await db
    .select({
      id: punchesTable.id,
      employeeName: employeesTable.name,
      registration: employeesTable.registration,
      companyName: companiesTable.name,
      type: punchesTable.type,
      punchedAt: punchesTable.punchedAt,
      source: punchesTable.source,
    })
    .from(punchesTable)
    .innerJoin(employeesTable, eq(punchesTable.employeeId, employeesTable.id))
    .innerJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
    .orderBy(desc(punchesTable.punchedAt))
    .limit(8);

  return {
    companies: companies?.value ?? 0,
    employees: employees?.value ?? 0,
    withoutFace: withoutFace?.value ?? 0,
    punchesToday: punchesToday?.value ?? 0,
    recent,
  };
}
