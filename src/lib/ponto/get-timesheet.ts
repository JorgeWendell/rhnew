import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";

import { db } from "@/db";
import {
  companiesTable,
  dayMarksTable,
  employeesTable,
  holidaysTable,
  punchesTable,
  workdayRulesTable,
} from "@/db/schema";
import { calculateDay, type PunchMap } from "@/lib/ponto/calculate-timesheet";
import {
  type DayStatus,
  type PunchType,
  WEEKDAY_LABELS,
} from "@/lib/ponto/constants";
import {
  addDays,
  diffDays,
  eachDate,
  formatTime,
  parseClock,
  saoPauloDateTime,
  saoPauloParts,
  todayInSaoPaulo,
  weekdayIndex,
} from "@/lib/ponto/time";

export type TimesheetDay = {
  date: string;
  weekday: string;
  weekdayIndex: number;
  holidayName: string | null;
  entry: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  exit: string | null;
  workedMinutes: number;
  delayMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  extra50Minutes: number;
  extra100Minutes: number;
  abono: boolean;
  status: DayStatus;
  inProgress: boolean;
};

export type TimesheetResult = {
  companyName: string;
  employeeId: string;
  employeeName: string;
  registration: string;
  admissionDate: string;
  from: string;
  to: string;
  toleranceMinutes: number;
  schedule: Array<{ weekday: number; label: string; expectedMinutes: number }>;
  days: TimesheetDay[];
  totals: {
    workedMinutes: number;
    delayMinutes: number;
    overtimeMinutes: number;
    nightMinutes: number;
    extra50Minutes: number;
    extra100Minutes: number;
    absences: number;
    suspensions: number;
  };
};

const punchField: Record<PunchType, keyof PunchMap> = {
  entry: "entry",
  lunch_out: "lunchOut",
  lunch_in: "lunchIn",
  exit: "exit",
};

function isDayStatus(value: string): value is DayStatus {
  return value === "normal" || value === "falta" || value === "suspensao";
}

export async function getTimesheets(input: {
  companyId: string;
  employeeId?: string;
  from: string;
  to: string;
}): Promise<TimesheetResult[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to)) {
    throw new Error("Informe um período válido");
  }
  if (input.from > input.to) throw new Error("A data inicial é maior que a final");
  if (diffDays(input.from, input.to) > 366) {
    throw new Error("O período pode ter no máximo 366 dias");
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, input.companyId))
    .limit(1);

  if (!company) throw new Error("Empresa não encontrada");

  const nightStart = parseClock(company.nightStart) ?? 22 * 60;
  const nightEnd = parseClock(company.nightEnd) ?? 5 * 60;

  const employeeFilters = [eq(employeesTable.companyId, input.companyId)];
  if (input.employeeId) employeeFilters.push(eq(employeesTable.id, input.employeeId));
  else employeeFilters.push(eq(employeesTable.active, true));

  const employees = await db
    .select({
      id: employeesTable.id,
      name: employeesTable.name,
      registration: employeesTable.registration,
      admissionDate: employeesTable.admissionDate,
    })
    .from(employeesTable)
    .where(and(...employeeFilters))
    .orderBy(asc(employeesTable.name));

  if (input.employeeId && employees.length === 0) {
    throw new Error("Funcionário não encontrado");
  }

  const rules = await db
    .select()
    .from(workdayRulesTable)
    .where(eq(workdayRulesTable.companyId, input.companyId));

  const holidays = await db
    .select({
      holidayDate: holidaysTable.holidayDate,
      name: holidaysTable.name,
    })
    .from(holidaysTable)
    .where(
      and(
        eq(holidaysTable.companyId, input.companyId),
        gte(holidaysTable.holidayDate, input.from),
        lt(holidaysTable.holidayDate, addDays(input.to, 1)),
      ),
    );

  const holidayMap = new Map(holidays.map((holiday) => [holiday.holidayDate, holiday.name]));
  const ruleMap = new Map(rules.map((rule) => [rule.weekday, rule]));
  const employeeIds = employees.map((employee) => employee.id);
  const dates = eachDate(input.from, input.to);
  const today = todayInSaoPaulo();

  const punchesByEmployee = new Map<string, Map<string, PunchMap>>();
  const marksByEmployee = new Map<string, Map<string, { abono: boolean; status: DayStatus }>>();

  if (employeeIds.length > 0) {
    const punches = await db
      .select({
        employeeId: punchesTable.employeeId,
        type: punchesTable.type,
        punchedAt: punchesTable.punchedAt,
      })
      .from(punchesTable)
      .where(
        and(
          inArray(punchesTable.employeeId, employeeIds),
          gte(punchesTable.punchedAt, saoPauloDateTime(input.from, "00:00")),
          lt(punchesTable.punchedAt, saoPauloDateTime(addDays(input.to, 1), "12:00")),
        ),
      );

    for (const punch of punches) {
      const day = saoPauloParts(punch.punchedAt).date;
      if (day < input.from || day > input.to) continue;
      const field = punchField[punch.type];
      const days = punchesByEmployee.get(punch.employeeId) ?? new Map<string, PunchMap>();
      const current = days.get(day) ?? {};
      const previous = current[field];
      if (!previous) current[field] = punch.punchedAt;
      else if (field === "exit" && punch.punchedAt > previous) current[field] = punch.punchedAt;
      else if (field !== "exit" && punch.punchedAt < previous) current[field] = punch.punchedAt;
      days.set(day, current);
      punchesByEmployee.set(punch.employeeId, days);
    }

    const marks = await db
      .select()
      .from(dayMarksTable)
      .where(
        and(
          inArray(dayMarksTable.employeeId, employeeIds),
          gte(dayMarksTable.workDate, input.from),
          lt(dayMarksTable.workDate, addDays(input.to, 1)),
        ),
      );

    for (const mark of marks) {
      const days = marksByEmployee.get(mark.employeeId) ?? new Map();
      days.set(mark.workDate, {
        abono: mark.abono,
        status: isDayStatus(mark.status) ? mark.status : "normal",
      });
      marksByEmployee.set(mark.employeeId, days);
    }
  }

  const schedule = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    expectedMinutes: ruleMap.get(weekday)?.expectedMinutes ?? 0,
  }));

  return employees.map((employee) => {
    const punchDays = punchesByEmployee.get(employee.id) ?? new Map<string, PunchMap>();
    const markDays =
      marksByEmployee.get(employee.id) ??
      new Map<string, { abono: boolean; status: DayStatus }>();

    const days: TimesheetDay[] = dates.map((date) => {
      const weekday = weekdayIndex(date);
      const holidayName = holidayMap.get(date) ?? null;
      const rule = ruleMap.get(weekday);
      const punches = punchDays.get(date) ?? {};
      const mark = markDays.get(date);
      const status: DayStatus = mark?.status ?? "normal";
      const inProgress = date === today && status === "normal" && !punches.exit;
      const calculated = calculateDay({
        punches,
        expectedMinutes: holidayName ? 0 : (rule?.expectedMinutes ?? 0),
        firstOvertimeMinutes: holidayName ? 0 : (rule?.firstOvertimeMinutes ?? 0),
        toleranceMinutes: company.toleranceMinutes,
        nightStart,
        nightEnd,
        abono: mark?.abono ?? false,
        status,
        inProgress,
      });

      return {
        date,
        weekday: WEEKDAY_LABELS[weekday],
        weekdayIndex: weekday,
        holidayName,
        entry: punches.entry ? formatTime(punches.entry) : null,
        lunchOut: punches.lunchOut ? formatTime(punches.lunchOut) : null,
        lunchIn: punches.lunchIn ? formatTime(punches.lunchIn) : null,
        exit: punches.exit ? formatTime(punches.exit) : null,
        abono: mark?.abono ?? false,
        status,
        inProgress,
        ...calculated,
      };
    });

    const totals = days.reduce(
      (sum, day) => ({
        workedMinutes: sum.workedMinutes + day.workedMinutes,
        delayMinutes: sum.delayMinutes + day.delayMinutes,
        overtimeMinutes: sum.overtimeMinutes + day.overtimeMinutes,
        nightMinutes: sum.nightMinutes + day.nightMinutes,
        extra50Minutes: sum.extra50Minutes + day.extra50Minutes,
        extra100Minutes: sum.extra100Minutes + day.extra100Minutes,
        absences: sum.absences + (day.status === "falta" ? 1 : 0),
        suspensions: sum.suspensions + (day.status === "suspensao" ? 1 : 0),
      }),
      {
        workedMinutes: 0,
        delayMinutes: 0,
        overtimeMinutes: 0,
        nightMinutes: 0,
        extra50Minutes: 0,
        extra100Minutes: 0,
        absences: 0,
        suspensions: 0,
      },
    );

    return {
      companyName: company.name,
      employeeId: employee.id,
      employeeName: employee.name,
      registration: employee.registration,
      admissionDate: employee.admissionDate,
      from: input.from,
      to: input.to,
      toleranceMinutes: company.toleranceMinutes,
      schedule,
      days,
      totals,
    };
  });
}
