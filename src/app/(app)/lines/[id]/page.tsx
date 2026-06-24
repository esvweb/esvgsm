import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { assignLine, moveLineToDepot, changeLinePackage } from "@/lib/actions/lines";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

const ACTION_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned",
  UNASSIGNED: "Unassigned",
  PACKAGE_CHANGED: "Package changed",
  MOVED_TO_DEPOT: "Moved to IT Depot",
  RESERVED: "Reserved",
  DEVICE_LINKED: "Device linked",
  DEVICE_UNLINKED: "Device unlinked",
};

const STATUS_BADGE: Record<string, "secondary" | "neutral" | "primary"> = {
  ASSIGNED: "secondary",
  IT_DEPOT: "neutral",
  RESERVED: "primary",
};

export default async function LineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const [line, people, packages, session] = await Promise.all([
    prisma.gsmLine.findUnique({
      where: { id },
      include: {
        currentPackage: true,
        device: true,
        assignments: {
          where: { endDate: null },
          include: { person: true, displayAsPerson: true },
        },
        logs: {
          orderBy: { timestamp: "desc" },
          include: { fromPerson: true, toPerson: true, fromPackage: true, toPackage: true, performedByUser: true },
        },
        billRecords: {
          include: { batch: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.person.findMany({ where: { active: true }, orderBy: { fullName: "asc" } }),
    prisma.package.findMany({ orderBy: { name: "asc" } }),
    auth(),
  ]);
  if (!line) notFound();

  const canEdit = session ? can(session.user.role, "manageData") : false;
  const current = line.assignments[0];
  const listPrice = Number(line.currentPackage.listPriceTRY);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{line.msisdn}</h1>
          <Badge variant={STATUS_BADGE[line.status]}>{line.status.replace("_", " ")}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {line.operator} · {line.currentPackage.name}
          {!line.currentPackage.isAssignable && (
            <Badge variant="warning" className="ml-2">
              restricted — upgrade before assigning
            </Badge>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(error)}</p>
      )}

      <Card>
        <CardTitle>Current holder</CardTitle>
        {current ? (
          <p className="text-sm text-foreground">
            {current.person.fullName}
            {current.displayAsPerson && (
              <Badge variant="warning" className="ml-2">
                using as {current.displayAsPerson.fullName}
              </Badge>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted">Unassigned ({line.status.replace("_", " ")}).</p>
        )}
        {line.device && (
          <p className="mt-1 text-sm text-muted">
            Device: {line.device.model} ({line.device.imei})
          </p>
        )}
      </Card>

      {canEdit && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <form
              action={async (formData) => {
                "use server";
                try {
                  await assignLine(line.id, formData);
                } catch (err) {
                  redirect(`/lines/${line.id}?error=${encodeURIComponent((err as Error).message)}`);
                }
              }}
              className="space-y-3"
            >
              <CardTitle>Assign / reserve</CardTitle>
              <Select name="personId" required>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.userType.replace("_", " ")})
                  </option>
                ))}
              </Select>
              <Select name="displayAsPersonId">
                <option value="">No nickname override</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    Show as: {p.fullName}
                  </option>
                ))}
              </Select>
              <Select name="status" required>
                <option value="ASSIGNED">Assigned (in active use)</option>
                <option value="RESERVED">Reserved for later project</option>
              </Select>
              <Input name="note" placeholder="Note (optional)" />
              <Button type="submit">Save</Button>
            </form>
          </Card>

          <div className="space-y-4">
            <Card>
              <form
                action={async (formData) => {
                  "use server";
                  try {
                    await changeLinePackage(line.id, formData);
                  } catch (err) {
                    redirect(`/lines/${line.id}?error=${encodeURIComponent((err as Error).message)}`);
                  }
                }}
                className="space-y-3"
              >
                <CardTitle>Change package</CardTitle>
                <Select name="packageId" defaultValue={line.currentPackageId} required>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {Number(p.listPriceTRY)} TRY
                    </option>
                  ))}
                </Select>
                <Button type="submit">Save</Button>
              </form>
            </Card>

            <Card>
              <form
                action={async () => {
                  "use server";
                  await moveLineToDepot(line.id);
                }}
              >
                <CardTitle>Return to IT Depot</CardTitle>
                <Button type="submit" variant="outline">
                  Unassign &amp; move to depot
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardTitle>Monthly bills</CardTitle>
        {line.billRecords.length === 0 ? (
          <p className="text-sm text-muted">No bills recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2">Period</th>
                <th className="py-2">Amount</th>
                <th className="py-2">vs. list price ({listPrice} TRY)</th>
              </tr>
            </thead>
            <tbody>
              {line.billRecords.map((r) => {
                const amount = Number(r.amountTRY);
                const diffPct = listPrice > 0 ? ((amount - listPrice) / listPrice) * 100 : 0;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2">
                      {r.batch.periodMonth}/{r.batch.periodYear}
                    </td>
                    <td className="py-2">{amount.toFixed(2)} TRY</td>
                    <td className={`py-2 ${Math.abs(diffPct) > 25 ? "font-medium text-red-600" : "text-muted"}`}>
                      {diffPct > 0 ? "+" : ""}
                      {diffPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardTitle>History log</CardTitle>
        <ul className="space-y-3 text-sm">
          {line.logs.map((log) => (
            <li key={log.id} className="border-b border-border pb-3 last:border-0">
              <span className="text-muted">{log.timestamp.toLocaleString()}</span> —{" "}
              <span className="font-medium text-foreground">{ACTION_LABEL[log.action]}</span>
              {log.fromPerson && <span className="text-muted"> from {log.fromPerson.fullName}</span>}
              {log.toPerson && <span className="text-muted"> to {log.toPerson.fullName}</span>}
              {log.fromPackage && <span className="text-muted"> from {log.fromPackage.name}</span>}
              {log.toPackage && <span className="text-muted"> to {log.toPackage.name}</span>}
              <span className="text-muted"> · by {log.performedByUser.name}</span>
              {log.note && <div className="text-muted">{log.note}</div>}
            </li>
          ))}
          {line.logs.length === 0 && <p className="text-muted">No history yet.</p>}
        </ul>
      </Card>
    </div>
  );
}
