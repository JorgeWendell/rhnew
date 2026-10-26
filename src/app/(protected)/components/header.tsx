"use client";

import { ChevronRight, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { authClient } from "@/lib/auth-client";

const titles: Record<string, string> = {
  "/dashboard": "Visão geral",
  "/empresas": "Empresas",
  "/funcionarios": "Funcionários",
  "/pontos": "Pontos",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/configuracoes/usuarios": "Usuários",
  "/configuracoes/jornada": "Jornada e feriados",
};

export function Header({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const title = titles[pathname] ?? "RH Ponto";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-blue-600">
          Console
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-blue-600">{title}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-3 px-2">
            <span className="hidden text-sm font-semibold sm:inline">{userName}</span>
            <Avatar className="ring-2 ring-blue-500">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={async () => {
              await authClient.signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
