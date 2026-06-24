import Link from "next/link";
import { Smartphone, CheckCircle2, Archive, Clock, BellRing } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { SpendBarChart } from "@/components/charts/spend-bar-chart";

const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function DashboardPage() {
  const [total, assigned, depot, reserved, pendingAlerts, batches] = await Promise.all([
    prisma.gsmLine.count(),
    prisma.gsmLine.count({ where: { status: "ASSIGNED" } }),
    prisma.gsmLine.count({ where: { status: "IT_DEPOT" } }),
    prisma.gsmLine.count({ where: { status: "RESERVED" } }),
    prisma.alert.count({ where: { status: "PENDING" } }),
    prisma.monthlyBillBatch.findMany({
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
      include: { records: { include: { line: { include: { currentPackage: true } } } } },
      take: 6,
    }),
  ]);

  const cards = [
    { label: "Total lines", value: total, href: "/lines", icon: Smartphone },
    { label: "Assigned", value: assigned, href: "/lines?status=ASSIGNED", icon: CheckCircle2 },
    { label: "In IT Depot", value: depot, href: "/lines?status=IT_DEPOT", icon: Archive },
    { label: "Reserved", value: reserved, href: "/lines?status=RESERVED", icon: Clock },
    { label: "Pending alerts", value: pendingAlerts, href: "/alerts", icon: BellRing },
  ];

  const spendData = batches.map((b) => ({
    label: `${MONTH_LABEL[b.periodMonth - 1]} ${String(b.periodYear).slice(2)}`,
    total: b.records.reduce((sum, r) => sum + Number(r.amountTRY), 0),
  }));

  const latestBatch = batches[batches.length - 1];
  const byPackage = new Map<string, number>();
  let latestTotal = 0;
  if (latestBatch) {
    for (const r of latestBatch.records) {
      const name = r.line?.currentPackage.name ?? "Unmatched";
      const amount = Number(r.amountTRY);
      byPackage.set(name, (byPackage.get(name) ?? 0) + amount);
      latestTotal += amount;
    }
  }
  const packageColors = ["bg-primary", "bg-secondary", "bg-amber-400", "bg-gray-400"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
                  <Icon size={18} />
                </div>
                <div className="text-2xl font-semibold text-foreground">{c.value}</div>
                <div className="text-sm text-muted">{c.label}</div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Monthly bill spend</CardTitle>
          {spendData.length > 0 ? (
            <SpendBarChart data={spendData} />
          ) : (
            <p className="text-sm text-muted">No confirmed bills yet.</p>
          )}
        </Card>

        <Card>
          <CardTitle>Spend by package {latestBatch && `(${latestBatch.periodMonth}/${latestBatch.periodYear})`}</CardTitle>
          {byPackage.size === 0 ? (
            <p className="text-sm text-muted">No bill data yet.</p>
          ) : (
            <ul className="space-y-3">
              {[...byPackage.entries()].map(([name, amount], i) => (
                <li key={name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-foreground">{name}</span>
                    <span className="text-muted">{amount.toFixed(0)} TRY</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-1.5 rounded-full ${packageColors[i % packageColors.length]}`}
                      style={{ width: `${latestTotal > 0 ? (amount / latestTotal) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
