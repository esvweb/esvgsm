"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Tablet,
  Receipt,
  BellRing,
  UserCog,
  Package,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lines", label: "GSM Lines", icon: Smartphone },
  { href: "/people", label: "People", icon: Users },
  { href: "/devices", label: "Devices", icon: Tablet },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

const ADMIN_NAV = [
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/packages", label: "Packages", icon: Package },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-primary-light text-primary" : "text-muted hover:bg-gray-50 hover:text-foreground"
            }`}
          >
            <Icon size={18} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
