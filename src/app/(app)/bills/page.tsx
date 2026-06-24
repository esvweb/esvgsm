import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";

const STATUS_LABEL: Record<string, string> = {
  PROCESSING: "Processing",
  REVIEW: "Needs review",
  CONFIRMED: "Confirmed",
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
        <h1 className="text-xl font-semibold text-slate-900">Monthly bills</h1>
        {canUpload && (
          <Link href="/bills/upload" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Upload bill
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Operator</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Line items</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/bills/${b.id}`} className="font-medium text-slate-900 hover:underline">
                    {b.periodMonth}/{b.periodYear}
                  </Link>
                </td>
                <td className="px-4 py-2">{b.operator}</td>
                <td className="px-4 py-2">{STATUS_LABEL[b.status]}</td>
                <td className="px-4 py-2">{b._count.records}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
