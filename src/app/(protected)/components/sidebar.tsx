"use client";

import {
  Building2,
  CalendarClock,
  Clock3,
  FileBarChart,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Empresas", href: "/empresas", icon: Building2 },
  { name: "Funcionários", href: "/funcionarios", icon: Users },
  { name: "Pontos", href: "/pontos", icon: CalendarClock },
  { name: "Relatórios", href: "/relatorios", icon: FileBarChart },
  { name: "Bater ponto", href: "/bater", icon: Clock3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 md:flex dark:border-slate-800 dark:bg-slate-900">
      <div className="px-6 pt-6 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Clock3 className="h-6 w-6" />
        </div>
        <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">RH Ponto</p>
        <p className="text-sm text-slate-500">Ponto eletrônico</p>
      </div>
      <nav className="flex flex-1 flex-col px-4 py-2">
        <div className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
          <Link
            href="/configuracoes"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              pathname.startsWith("/configuracoes")
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
        </div>
      </nav>
    </aside>
  );
}
