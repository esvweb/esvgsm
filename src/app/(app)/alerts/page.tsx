import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { ackAlert } from "@/lib/actions/alerts";

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
      <h1 className="text-xl font-semibold text-slate-900">Alerts — bills &gt;25% off list price</h1>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Line</th>
              <th className="px-4 py-2">Diff</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Recipients</th>
              {canAck && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  {a.lineBillRecord.batch.periodMonth}/{a.lineBillRecord.batch.periodYear}
                </td>
                <td className="px-4 py-2">
                  {a.lineBillRecord.line ? (
                    <Link href={`/lines/${a.lineBillRecord.line.id}`} className="font-medium text-slate-900 hover:underline">
                      {a.lineBillRecord.line.msisdn}
                    </Link>
                  ) : (
                    a.lineBillRecord.rawExtractedNumber
                  )}
                </td>
                <td className={`px-4 py-2 font-medium ${Number(a.pctDiff) > 0 ? "text-red-600" : "text-amber-600"}`}>
                  {Number(a.pctDiff) > 0 ? "+" : ""}
                  {Number(a.pctDiff).toFixed(1)}%
                </td>
                <td className="px-4 py-2">{a.status}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{a.recipients.join(", ") || "—"}</td>
                {canAck && a.status !== "ACKED" && (
                  <td className="px-4 py-2">
                    <form
                      action={async () => {
                        "use server";
                        await ackAlert(a.id);
                      }}
                    >
                      <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                        Acknowledge
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {alerts.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No alerts yet.</p>}
      </div>
    </div>
  );
}
