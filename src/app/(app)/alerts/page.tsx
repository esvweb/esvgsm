import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { ackAlert } from "@/lib/actions/alerts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_BADGE: Record<string, "neutral" | "secondary" | "primary"> = {
  PENDING: "neutral",
  SENT: "primary",
  ACKED: "secondary",
};

export default async function AlertsPage() {
  const [alerts, session] = await Promise.all([
    prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      include: { lineBillRecord: { include: { line: true, batch: true } } },
    }),
    auth(),
  ]);
  const canAck = session ? can(session.user.role, "uploadBills") : false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Alerts — bills &gt;25% off list price</h1>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3">Line</th>
              <th className="px-5 py-3">Diff</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Recipients</th>
              {canAck && <th className="px-5 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-5 py-3 text-muted">
                  {a.lineBillRecord.batch.periodMonth}/{a.lineBillRecord.batch.periodYear}
                </td>
                <td className="px-5 py-3">
                  {a.lineBillRecord.line ? (
                    <Link href={`/lines/${a.lineBillRecord.line.id}`} className="font-medium text-foreground hover:text-primary">
                      {a.lineBillRecord.line.msisdn}
                    </Link>
                  ) : (
                    a.lineBillRecord.rawExtractedNumber
                  )}
                </td>
                <td className={`px-5 py-3 font-medium ${Number(a.pctDiff) > 0 ? "text-red-600" : "text-amber-600"}`}>
                  {Number(a.pctDiff) > 0 ? "+" : ""}
                  {Number(a.pctDiff).toFixed(1)}%
                </td>
                <td className="px-5 py-3">
                  <Badge variant={STATUS_BADGE[a.status]}>{a.status}</Badge>
                </td>
                <td className="px-5 py-3 text-xs text-muted">{a.recipients.join(", ") || "—"}</td>
                {canAck && a.status !== "ACKED" && (
                  <td className="px-5 py-3">
                    <form
                      action={async () => {
                        "use server";
                        await ackAlert(a.id);
                      }}
                    >
                      <Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">
                        Acknowledge
                      </Button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {alerts.length === 0 && <p className="px-5 py-6 text-sm text-muted">No alerts yet.</p>}
      </Card>
    </div>
  );
}
