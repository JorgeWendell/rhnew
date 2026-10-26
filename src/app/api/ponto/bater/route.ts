import { NextResponse } from "next/server";

import { db } from "@/db";
import { punchesTable } from "@/db/schema";
import { FACE_MATCH_MAX_DISTANCE, duplicatePunchMessage, punchLabel, type PunchType } from "@/lib/ponto/constants";
import { euclidean, parseDescriptor } from "@/lib/ponto/face-match";
import { employeesWithFace, todayPunches, tooManyRequests } from "@/lib/ponto/identify";
import { formatDateTime } from "@/lib/ponto/time";
import { isUniqueViolation } from "@/lib/utils";

export const runtime = "nodejs";

const types = new Set<PunchType>(["entry", "lunch_out", "lunch_in", "exit"]);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooManyRequests(ip)) {
    return NextResponse.json({ success: false, message: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    employeeId?: string;
    descriptor?: unknown;
    type?: string;
  } | null;

  const descriptor = parseDescriptor(body?.descriptor);
  const type = body?.type as PunchType | undefined;
  if (!body?.employeeId || !descriptor || !type || !types.has(type)) {
    return NextResponse.json({ success: false, message: "Dados da marcação inválidos" }, { status: 400 });
  }

  const employees = await employeesWithFace();
  const employee = employees.find((item) => item.id === body.employeeId);
  if (!employee) {
    return NextResponse.json({ success: false, message: "Funcionário não encontrado" }, { status: 404 });
  }

  const distance = euclidean(descriptor, employee.descriptor);
  if (distance > FACE_MATCH_MAX_DISTANCE) {
    return NextResponse.json({ success: false, message: "A facial não confere com o funcionário" }, { status: 403 });
  }

  const today = await todayPunches(employee.id);
  if (today.some((punch) => punch.type === type)) {
    return NextResponse.json({ success: false, message: duplicatePunchMessage(type) }, { status: 409 });
  }

  const punchedAt = new Date();
  try {
    await db.insert(punchesTable).values({
      employeeId: employee.id,
      type,
      punchedAt,
      source: "facial",
      faceDistance: distance,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ success: false, message: duplicatePunchMessage(type) }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    type,
    label: punchLabel(type),
    punchedAt: punchedAt.toISOString(),
    time: formatDateTime(punchedAt),
    today: await todayPunches(employee.id),
  });
}
