import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { matchBillRecord, confirmBillBatch } from "@/lib/actions/bills";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

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
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Bill batch — {batch.periodMonth}/{batch.periodYear} ({batch.operator})
          </h1>
          <Badge variant={batch.status === "CONFIRMED" ? "secondary" : "warning"} className="mt-2">
            {batch.status}
          </Badge>
        </div>
        <a href={batch.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
          View original PDF
        </a>
      </div>

      {unmatched.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardTitle className="text-amber-900">Unmatched numbers — please match manually</CardTitle>
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
                    <Select name="lineId" required className="py-1.5 text-xs">
                      <option value="">Select line…</option>
                      {lines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.msisdn}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">
                      Match
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {[...groups.values()].map((g) => {
        const avg = g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length;
        return (
          <Card key={g.name}>
            <CardTitle>{g.name}</CardTitle>
            <p className="mb-3 text-sm text-muted">
              List price: {g.listPrice.toFixed(2)} TRY · Group average this period: {avg.toFixed(2)} TRY (
              {g.amounts.length} lines)
            </p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2">Number</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">vs. list price</th>
                  <th className="py-2">vs. group avg</th>
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
                      <tr key={r.id} className="border-t border-border">
                        <td className="py-2">{r.line?.msisdn}</td>
                        <td className="py-2">{amount.toFixed(2)} TRY</td>
                        <td className={`py-2 ${Math.abs(vsList) > 25 ? "font-medium text-red-600" : "text-muted"}`}>
                          {vsList > 0 ? "+" : ""}
                          {vsList.toFixed(1)}%
                        </td>
                        <td className="py-2 text-muted">
                          {vsAvg > 0 ? "+" : ""}
                          {vsAvg.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </Card>
        );
      })}

      {canUpload && batch.status === "REVIEW" && (
        <form
          action={async () => {
            "use server";
            await confirmBillBatch(batch.id);
          }}
        >
          <Button type="submit" disabled={unmatched.length > 0}>
            Confirm batch &amp; run alerts
          </Button>
          {unmatched.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">Match all unmatched numbers before confirming.</p>
          )}
        </form>
      )}
    </div>
  );
}
