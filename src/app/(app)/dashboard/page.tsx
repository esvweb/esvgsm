import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [total, assigned, depot, reserved, pendingAlerts] = await Promise.all([
    prisma.gsmLine.count(),
    prisma.gsmLine.count({ where: { status: "ASSIGNED" } }),
    prisma.gsmLine.count({ where: { status: "IT_DEPOT" } }),
    prisma.gsmLine.count({ where: { status: "RESERVED" } }),
    prisma.alert.count({ where: { status: "PENDING" } }),
  ]);

  const cards = [
    { label: "Total lines", value: total, href: "/lines" },
    { label: "Assigned", value: assigned, href: "/lines?status=ASSIGNED" },
    { label: "In IT Depot", value: depot, href: "/lines?status=IT_DEPOT" },
    { label: "Reserved", value: reserved, href: "/lines?status=RESERVED" },
    { label: "Pending alerts", value: pendingAlerts, href: "/alerts" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <div className="text-2xl font-semibold text-slate-900">{c.value}</div>
            <div className="text-sm text-slate-500">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
