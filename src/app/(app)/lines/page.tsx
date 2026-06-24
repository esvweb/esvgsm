import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { createLine } from "@/lib/actions/lines";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned",
  IT_DEPOT: "IT Depot",
  RESERVED: "Reserved",
};

const STATUS_BADGE: Record<string, "secondary" | "neutral" | "primary"> = {
  ASSIGNED: "secondary",
  IT_DEPOT: "neutral",
  RESERVED: "primary",
};

export default async function LinesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [lines, packages, session] = await Promise.all([
    prisma.gsmLine.findMany({
      where: status ? { status: status as "ASSIGNED" | "IT_DEPOT" | "RESERVED" } : undefined,
      include: {
        currentPackage: true,
        assignments: { where: { endDate: null }, include: { person: true, displayAsPerson: true } },
      },
      orderBy: { msisdn: "asc" },
    }),
    prisma.package.findMany({ orderBy: { name: "asc" } }),
    auth(),
  ]);
  const canEdit = session ? can(session.user.role, "manageData") : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">GSM Lines</h1>
        <div className="flex gap-2 text-sm">
          {["ASSIGNED", "IT_DEPOT", "RESERVED"].map((s) => (
            <Link
              key={s}
              href={`/lines?status=${s}`}
              className={`rounded-full px-3 py-1.5 font-medium ${
                status === s ? "bg-primary text-white" : "border border-border text-muted hover:bg-gray-50"
              }`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
          {status && (
            <Link href="/lines" className="rounded-full px-3 py-1.5 text-muted hover:text-foreground">
              Clear
            </Link>
          )}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">Number</th>
              <th className="px-5 py-3">Package</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Holder</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const current = l.assignments[0];
              return (
                <tr key={l.id} className="border-t border-border hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/lines/${l.id}`} className="font-medium text-foreground hover:text-primary">
                      {l.msisdn}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{l.currentPackage.name}</td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUS_BADGE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {current
                      ? `${current.person.fullName}${current.displayAsPerson ? ` (as ${current.displayAsPerson.fullName})` : ""}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {canEdit && (
        <Card className="max-w-xl">
          <form action={createLine} className="space-y-4">
            <CardTitle>Add GSM line</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              <Input name="msisdn" placeholder="Phone number" required />
              <Input name="operator" placeholder="Operator" defaultValue="Vodafone" required />
              <Select name="packageId" required className="col-span-2">
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Input name="notes" placeholder="Notes (optional)" className="col-span-2" />
            </div>
            <Button type="submit">Create (starts in IT Depot)</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
