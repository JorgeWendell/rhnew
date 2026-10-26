import { NextResponse } from "next/server";

import { buildTimesheetWorkbook } from "@/lib/ponto/build-workbook";
import { getTimesheets } from "@/lib/ponto/get-timesheet";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") ?? "";
  const employeeId = searchParams.get("employeeId") || undefined;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const notes = searchParams.get("notes") ?? "";

  try {
    const timesheets = await getTimesheets({ companyId, employeeId, from, to });
    if (timesheets.length === 0) {
      return NextResponse.json({ message: "Nenhum funcionário no período" }, { status: 404 });
    }

    const file = await buildTimesheetWorkbook(timesheets, notes);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="espelho-ponto.xlsx"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gerar o Excel";
    return NextResponse.json({ message }, { status: 400 });
  }
}
