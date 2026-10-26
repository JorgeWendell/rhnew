import { NextResponse } from "next/server";

import { identifyDescriptor, tooManyRequests } from "@/lib/ponto/identify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooManyRequests(ip)) {
    return NextResponse.json(
      { match: false, message: "Muitas tentativas. Aguarde um instante." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { descriptor?: unknown } | null;
  const result = await identifyDescriptor(body?.descriptor);

  if (!result.match) {
    return NextResponse.json({ match: false, message: result.message });
  }

  return NextResponse.json({
    match: true,
    employee: result.employee,
    today: result.today,
    suggested: result.suggested,
  });
}
