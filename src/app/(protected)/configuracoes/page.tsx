import Link from "next/link";
import { CalendarClock, ChevronRight, Users } from "lucide-react";

const links = [
  {
    href: "/configuracoes/usuarios",
    title: "Usuários",
    description: "Quem administra o sistema",
    icon: Users,
  },
  {
    href: "/configuracoes/jornada",
    title: "Jornada e feriados",
    description: "Carga horária, tolerância, adicional noturno e feriados",
    icon: CalendarClock,
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Usuários do painel e as regras usadas no espelho de ponto.
        </p>
      </div>
      <div className="space-y-3">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
