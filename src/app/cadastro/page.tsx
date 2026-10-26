import { count } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { usersTable } from "@/db/schema";

import { SignupForm } from "./components/signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const [row] = await db.select({ value: count() }).from(usersTable);
  if ((row?.value ?? 0) > 0) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <SignupForm />
    </div>
  );
}
