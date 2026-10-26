import ExcelJS from "exceljs";

import type { TimesheetResult } from "@/lib/ponto/get-timesheet";
import { formatDateBR, formatMinutes } from "@/lib/ponto/time";

function sheetName(timesheet: TimesheetResult, index: number, used: Set<string>) {
  const raw = `${timesheet.registration} ${timesheet.employeeName}`
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
  const base = raw || `Funcionario ${index + 1}`;
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base.slice(0, 24)} ${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

function displayTime(value: string | null) {
  return value ?? "";
}

function minutesOrBlank(minutes: number) {
  return minutes > 0 ? formatMinutes(minutes) : "";
}

export async function buildTimesheetWorkbook(
  timesheets: TimesheetResult[],
  notes: string,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RH Ponto";
  const usedNames = new Set<string>();

  timesheets.forEach((timesheet, index) => {
    const sheet = workbook.addWorksheet(sheetName(timesheet, index, usedNames), {
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
      views: [{ state: "frozen", ySplit: 6 }],
    });

    sheet.mergeCells("A1:M1");
    sheet.getCell("A1").value = "APONTAMENTO DE CARTÕES";
    sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF1E3A8A" } };

    sheet.getCell("A2").value = "EMPRESA:";
    sheet.getCell("A2").font = { bold: true };
    sheet.mergeCells("B2:F2");
    sheet.getCell("B2").value = timesheet.companyName;

    sheet.getCell("A3").value = "FUNCIONÁRIO:";
    sheet.getCell("A3").font = { bold: true };
    sheet.mergeCells("B3:F3");
    sheet.getCell("B3").value = `${timesheet.registration} - ${timesheet.employeeName}`;

    sheet.getCell("A4").value = "ADMISSÃO:";
    sheet.getCell("A4").font = { bold: true };
    sheet.getCell("B4").value = formatDateBR(timesheet.admissionDate);
    sheet.getCell("D4").value = "PERÍODO:";
    sheet.getCell("D4").font = { bold: true };
    sheet.mergeCells("E4:G4");
    sheet.getCell("E4").value = `${formatDateBR(timesheet.from)} a ${formatDateBR(timesheet.to)}`;

    const headers = [
      "Data",
      "Dia",
      "Entrada",
      "Saída almoço",
      "Entrada almoço",
      "Saída",
      "H. Diária",
      "Atrasos",
      "Abona",
      "Horas extras",
      "A.N.",
      "50%",
      "100%",
    ];
    const header = sheet.getRow(6);
    header.values = [null, ...headers];
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.alignment = { vertical: "middle", horizontal: "center" };
    header.height = 22;
    for (let column = 1; column <= headers.length; column += 1) {
      header.getCell(column).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D4ED8" },
      };
    }

    timesheet.days.forEach((day, dayIndex) => {
      const statusLabel =
        day.status === "falta" ? "FALTA" : day.status === "suspensao" ? "SUSPENSÃO" : null;
      const row = sheet.getRow(7 + dayIndex);
      row.values = [
        null,
        formatDateBR(day.date),
        day.holidayName ? `${day.weekday} (${day.holidayName})` : day.weekday,
        statusLabel ?? displayTime(day.entry),
        statusLabel ? "" : displayTime(day.lunchOut),
        statusLabel ? "" : displayTime(day.lunchIn),
        statusLabel ? "" : displayTime(day.exit),
        minutesOrBlank(day.workedMinutes),
        minutesOrBlank(day.delayMinutes),
        day.abono ? "Sim" : "",
        minutesOrBlank(day.overtimeMinutes),
        minutesOrBlank(day.nightMinutes),
        minutesOrBlank(day.extra50Minutes),
        minutesOrBlank(day.extra100Minutes),
      ];
      row.alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(2).alignment = { horizontal: "left" };

      let color = "";
      if (day.status === "falta") color = "FFFECACA";
      else if (day.status === "suspensao") color = "FFFDE68A";
      else if (day.holidayName) color = "FFFEF3C7";
      else if (day.weekdayIndex === 0) color = "FFF1F5F9";

      if (color) {
        for (let column = 1; column <= headers.length; column += 1) {
          row.getCell(column).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: color },
          };
        }
      }
    });

    const totalIndex = 7 + timesheet.days.length;
    const total = sheet.getRow(totalIndex);
    total.values = [
      null,
      "TOTAIS",
      "",
      "",
      "",
      "",
      "",
      formatMinutes(timesheet.totals.workedMinutes),
      formatMinutes(timesheet.totals.delayMinutes),
      "",
      formatMinutes(timesheet.totals.overtimeMinutes),
      formatMinutes(timesheet.totals.nightMinutes),
      formatMinutes(timesheet.totals.extra50Minutes),
      formatMinutes(timesheet.totals.extra100Minutes),
    ];
    total.font = { bold: true };
    for (let column = 1; column <= headers.length; column += 1) {
      total.getCell(column).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDBEAFE" },
      };
    }

    sheet.getCell(totalIndex + 2, 1).value =
      `Faltas: ${timesheet.totals.absences}    Suspensões: ${timesheet.totals.suspensions}    Tolerância: ${timesheet.toleranceMinutes} min`;
    sheet.mergeCells(totalIndex + 2, 1, totalIndex + 2, 8);

    if (notes.trim()) {
      sheet.getCell(totalIndex + 3, 1).value = `OBSERVAÇÕES: ${notes.trim()}`;
      sheet.mergeCells(totalIndex + 3, 1, totalIndex + 3, 8);
    }

    sheet.getCell("O6").value = "CARGA HORÁRIA";
    sheet.getCell("O6").font = { bold: true };
    timesheet.schedule.forEach((rule, ruleIndex) => {
      sheet.getCell(7 + ruleIndex, 15).value = rule.label;
      sheet.getCell(7 + ruleIndex, 16).value = formatMinutes(rule.expectedMinutes);
    });

    const widths = [14, 28, 14, 16, 16, 12, 12, 12, 10, 14, 10, 10, 10];
    widths.forEach((width, column) => {
      sheet.getColumn(column + 1).width = width;
    });
    sheet.getColumn(15).width = 16;
    sheet.getColumn(16).width = 12;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
