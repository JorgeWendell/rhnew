import { count } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

import { LoginForm } from "./components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const [row] = await db.select({ value: count() }).from(usersTable);
  const canSignUp = (row?.value ?? 0) === 0;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="hidden w-1/2 flex-col justify-between bg-blue-700 p-12 text-white lg:flex">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-blue-100">RH PONTO</p>
          <h1 className="mt-6 max-w-md text-4xl font-bold leading-tight">
            Ponto eletrônico com conferência facial.
          </h1>
          <p className="mt-4 max-w-md text-blue-100">
            Cadastre a empresa, os funcionários e acompanhe o espelho de ponto no mesmo padrão do cartão.
          </p>
        </div>
        <p className="text-sm text-blue-100">Entrada, saída para o almoço, retorno e saída.</p>
      </div>
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <LoginForm canSignUp={canSignUp} />
      </div>
    </div>
  );
}
