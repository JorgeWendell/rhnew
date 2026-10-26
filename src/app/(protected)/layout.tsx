import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

import { Header } from "./components/header";
import { MobileNav } from "./components/mobile-nav";
import { Sidebar } from "./components/sidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header userName={user.name || user.email} />
        <MobileNav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
