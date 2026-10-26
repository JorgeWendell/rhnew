import Link from "next/link";
import { Building2, Camera, Clock3, Users } from "lucide-react";

import { punchLabel, type PunchType } from "@/lib/ponto/constants";
import { formatDateTime } from "@/lib/ponto/time";
import { getDashboardStats } from "@/lib/dashboard";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const cards = [
    { label: "Empresas ativas", value: stats.companies, href: "/empresas" },
    { label: "Funcionários ativos", value: stats.employees, href: "/funcionarios" },
    { label: "Sem facial", value: stats.withoutFace, href: "/funcionarios" },
    { label: "Pontos de hoje", value: stats.punchesToday, href: "/pontos" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Visão geral</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Acompanhe cadastros e as marcações do dia.
          </p>
        </div>
        <Link
          href="/bater"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
        >
          Abrir relógio de ponto
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">Últimas marcações</h3>
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recent.length === 0 && (
              <p className="py-6 text-sm text-slate-500">Nenhum ponto registrado ainda.</p>
            )}
            {stats.recent.map((punch) => (
              <div key={punch.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {punch.employeeName}{" "}
                    <span className="text-sm font-normal text-slate-500">#{punch.registration}</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {punch.companyName} · {punchLabel(punch.type as PunchType)} ·{" "}
                    {punch.source === "facial" ? "Facial" : "Manual"}
                  </p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {formatDateTime(punch.punchedAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">Como usar</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-blue-600" />
              Cadastre a empresa e ajuste a jornada em Configurações.
            </li>
            <li className="flex gap-3">
              <Users className="mt-0.5 h-4 w-4 text-blue-600" />
              Cadastre o funcionário com registro, nome, admissão e facial.
            </li>
            <li className="flex gap-3">
              <Camera className="mt-0.5 h-4 w-4 text-blue-600" />
              No celular, abra Bater ponto para reconhecer o rosto e gravar o horário.
            </li>
            <li className="flex gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 text-blue-600" />
              O espelho calcula horas, atrasos, extras e adicional noturno.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
