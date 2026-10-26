import { and, asc, eq, gte, lt } from "drizzle-orm";

import { db } from "@/db";
import { companiesTable, employeesTable, punchesTable } from "@/db/schema";
import { nextPunchType, punchLabel, type PunchType } from "@/lib/ponto/constants";
import { bestFaceMatch, parseDescriptor } from "@/lib/ponto/face-match";
import { addDays, formatTime, saoPauloDateTime, todayInSaoPaulo } from "@/lib/ponto/time";

const hits = new Map<string, number[]>();

export function tooManyRequests(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 80) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function employeesWithFace() {
  const rows = await db
    .select({
      id: employeesTable.id,
      name: employeesTable.name,
      registration: employeesTable.registration,
      companyName: companiesTable.name,
      facePhoto: employeesTable.facePhoto,
      faceDescriptor: employeesTable.faceDescriptor,
    })
    .from(employeesTable)
    .innerJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
    .where(eq(employeesTable.active, true));

  return rows.flatMap((row) => {
    const descriptor = parseDescriptor(row.faceDescriptor);
    if (!descriptor) return [];
    return [{ ...row, descriptor }];
  });
}

export async function identifyDescriptor(value: unknown) {
  const descriptor = parseDescriptor(value);
  if (!descriptor) return { match: false as const, message: "Facial inválida" };

  const employees = await employeesWithFace();
  const match = bestFaceMatch(
    descriptor,
    employees.map((employee) => ({ id: employee.id, descriptor: employee.descriptor })),
  );

  if (!match) {
    return { match: false as const, message: "Rosto não reconhecido" };
  }

  const employee = employees.find((item) => item.id === match.id);
  if (!employee) return { match: false as const, message: "Rosto não reconhecido" };

  const today = await todayPunches(employee.id);

  return {
    match: true as const,
    distance: match.distance,
    employee: {
      id: employee.id,
      name: employee.name,
      registration: employee.registration,
      companyName: employee.companyName,
      photo: employee.facePhoto,
    },
    today,
    suggested: nextPunchType(today.map((punch) => punch.type)),
  };
}

export async function todayPunches(employeeId: string) {
  const range = todayRange();
  const rows = await db
    .select({
      type: punchesTable.type,
      punchedAt: punchesTable.punchedAt,
    })
    .from(punchesTable)
    .where(
      and(
        eq(punchesTable.employeeId, employeeId),
        gte(punchesTable.punchedAt, range.start),
        lt(punchesTable.punchedAt, range.end),
      ),
    )
    .orderBy(asc(punchesTable.punchedAt));

  return rows.map((row) => ({
    type: row.type as PunchType,
    label: punchLabel(row.type),
    time: formatTime(row.punchedAt),
  }));
}

export function todayRange() {
  const today = todayInSaoPaulo();
  return {
    start: saoPauloDateTime(today, "00:00"),
    end: saoPauloDateTime(addDays(today, 1), "00:00"),
  };
}
