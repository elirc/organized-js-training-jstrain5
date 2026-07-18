import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { OpsforgeNav } from "@/components/opsforge-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r border-[var(--line)] bg-[var(--surface)] p-4 lg:block">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">NovaCom</p>
          <h1 className="text-xl font-bold">OpsForge</h1>
        </div>
        <OpsforgeNav />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader operatorLabel={`${session.user.name} (${session.user.role})`} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
