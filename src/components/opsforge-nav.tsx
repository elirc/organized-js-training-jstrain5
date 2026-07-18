"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  CheckCheck,
  ClipboardList,
  DollarSign,
  Flag,
  Gauge,
  Receipt,
  Settings,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/accounts", label: "Accounts", icon: Shield },
  { href: "/billing", label: "Billing", icon: DollarSign },
  { href: "/infrastructure", label: "Infrastructure", icon: Activity },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/operations", label: "Operations", icon: Wrench },
  { href: "/approvals", label: "Approvals", icon: CheckCheck },
  { href: "/feature-flags", label: "Feature Flags", icon: Flag },
  { href: "/runbooks", label: "Runbooks", icon: ClipboardList },
  { href: "/audit", label: "Audit", icon: Receipt },
  { href: "/reports", label: "Reports", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function OpsforgeNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
