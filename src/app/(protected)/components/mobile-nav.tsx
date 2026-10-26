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
  { name: "Início", href: "/dashboard", icon: LayoutDashboard },
  { name: "Empresas", href: "/empresas", icon: Building2 },
  { name: "Equipe", href: "/funcionarios", icon: Users },
  { name: "Pontos", href: "/pontos", icon: CalendarClock },
  { name: "Espelho", href: "/relatorios", icon: FileBarChart },
  { name: "Bater", href: "/bater", icon: Clock3 },
  { name: "Ajustes", href: "/configuracoes", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden dark:border-slate-800 dark:bg-slate-900">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
              active
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
