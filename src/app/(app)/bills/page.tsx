import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  PROCESSING: "Processing",
  REVIEW: "Needs review",
  CONFIRMED: "Confirmed",
};

const STATUS_BADGE: Record<string, "neutral" | "warning" | "secondary"> = {
  PROCESSING: "neutral",
  REVIEW: "warning",
  CONFIRMED: "secondary",
};

export default async function BillsPage() {
  const [batches, session] = await Promise.all([
    prisma.monthlyBillBatch.findMany({
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      include: { _count: { select: { records: true } } },
    }),
    auth(),
  ]);
  const canUpload = session ? can(session.user.role, "uploadBills") : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Monthly bills</h1>
        {canUpload && (
          <Link href="/bills/upload">
            <Button>Upload bill</Button>
          </Link>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3">Operator</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Line items</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-t border-border hover:bg-gray-50">
                <td className="px-5 py-3">
                  <Link href={`/bills/${b.id}`} className="font-medium text-foreground hover:text-primary">
                    {b.periodMonth}/{b.periodYear}
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted">{b.operator}</td>
                <td className="px-5 py-3">
                  <Badge variant={STATUS_BADGE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                </td>
                <td className="px-5 py-3 text-muted">{b._count.records}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
