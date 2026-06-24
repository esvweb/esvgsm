import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { matchBillRecord, confirmBillBatch } from "@/lib/actions/bills";

export default async function BillBatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const [batch, lines, session] = await Promise.all([
    prisma.monthlyBillBatch.findUnique({
      where: { id: batchId },
      include: {
        records: {
          include: { line: { include: { currentPackage: true } } },
          orderBy: { rawExtractedNumber: "asc" },
        },
      },
    }),
    prisma.gsmLine.findMany({ orderBy: { msisdn: "asc" } }),
    auth(),
  ]);
  if (!batch) notFound();
  const canUpload = session ? can(session.user.role, "uploadBills") : false;

  const unmatched = batch.records.filter((r) => !r.lineId);

  // Group matched records by package for company-average comparison.
  const groups = new Map<string, { name: string; listPrice: number; amounts: number[] }>();
  for (const r of batch.records) {
    if (!r.line) continue;
    const pkg = r.line.currentPackage;
    const g = groups.get(pkg.id) ?? { name: pkg.name, listPrice: Number(pkg.listPriceTRY), amounts: [] };
    g.amounts.push(Number(r.amountTRY));
    groups.set(pkg.id, g);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Bill batch — {batch.periodMonth}/{batch.periodYear} ({batch.operator})
        </h1>
        <a href={batch.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:underline">
          View original PDF
        </a>
      </div>
      <p className="text-sm text-slate-500">Status: {batch.status}</p>

      {unmatched.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-3 font-medium text-amber-900">Unmatched numbers — please match manually</h2>
          <ul className="space-y-2 text-sm">
            {unmatched.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <span className="w-32 font-mono">{r.rawExtractedNumber}</span>
                <span className="w-24">{Number(r.amountTRY).toFixed(2)} TRY</span>
                {canUpload && (
                  <form
                    action={async (formData) => {
                      "use server";
                      await matchBillRecord(r.id, formData);
                    }}
                    className="flex gap-2"
                  >
                    <select name="lineId" required className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="">Select line…</option>
                      {lines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.msisdn}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-white">
                      Match
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {[...groups.values()].map((g) => {
        const avg = g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length;
        return (
          <section key={g.name} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-medium text-slate-900">{g.name}</h2>
            <p className="mb-3 text-sm text-slate-500">
              List price: {g.listPrice.toFixed(2)} TRY · Group average this period: {avg.toFixed(2)} TRY (
              {g.amounts.length} lines)
            </p>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1">Number</th>
                  <th className="py-1">Amount</th>
                  <th className="py-1">vs. list price</th>
                  <th className="py-1">vs. group avg</th>
                </tr>
              </thead>
              <tbody>
                {batch.records
                  .filter((r) => r.line?.currentPackage.name === g.name)
                  .map((r) => {
                    const amount = Number(r.amountTRY);
                    const vsList = g.listPrice > 0 ? ((amount - g.listPrice) / g.listPrice) * 100 : 0;
                    const vsAvg = avg > 0 ? ((amount - avg) / avg) * 100 : 0;
                    return (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-1">{r.line?.msisdn}</td>
                        <td className="py-1">{amount.toFixed(2)} TRY</td>
                        <td className={`py-1 ${Math.abs(vsList) > 25 ? "text-red-600 font-medium" : ""}`}>
                          {vsList > 0 ? "+" : ""}
                          {vsList.toFixed(1)}%
                        </td>
                        <td className="py-1">
                          {vsAvg > 0 ? "+" : ""}
                          {vsAvg.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </section>
        );
      })}

      {canUpload && batch.status === "REVIEW" && (
        <form
          action={async () => {
            "use server";
            await confirmBillBatch(batch.id);
          }}
        >
          <button
            type="submit"
            disabled={unmatched.length > 0}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            Confirm batch &amp; run alerts
          </button>
          {unmatched.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">Match all unmatched numbers before confirming.</p>
          )}
        </form>
      )}
    </div>
  );
}
