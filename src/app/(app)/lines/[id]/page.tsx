import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { assignLine, moveLineToDepot, changeLinePackage } from "@/lib/actions/lines";

const ACTION_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned",
  UNASSIGNED: "Unassigned",
  PACKAGE_CHANGED: "Package changed",
  MOVED_TO_DEPOT: "Moved to IT Depot",
  RESERVED: "Reserved",
  DEVICE_LINKED: "Device linked",
  DEVICE_UNLINKED: "Device unlinked",
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
        <h1 className="text-xl font-semibold text-slate-900">{line.msisdn}</h1>
        <p className="text-sm text-slate-500">
          {line.operator} · {line.currentPackage.name} · {line.status.replace("_", " ")}
          {!line.currentPackage.isAssignable && (
            <span className="ml-2 text-amber-600">(restricted — must upgrade before assigning)</span>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-slate-900">Current holder</h2>
        {current ? (
          <p className="text-sm text-slate-700">
            {current.person.fullName}
            {current.displayAsPerson && (
              <span className="ml-2 text-amber-600">
                (using under {current.displayAsPerson.fullName}&apos;s identity/nickname)
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Unassigned ({line.status.replace("_", " ")}).</p>
        )}
        {line.device && (
          <p className="mt-1 text-sm text-slate-500">Device: {line.device.model} ({line.device.imei})</p>
        )}
      </section>

      {canEdit && (
        <section className="grid gap-4 sm:grid-cols-2">
          <form
            action={async (formData) => {
              "use server";
              try {
                await assignLine(line.id, formData);
              } catch (err) {
                redirect(`/lines/${line.id}?error=${encodeURIComponent((err as Error).message)}`);
              }
            }}
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <h2 className="font-medium text-slate-900">Assign / reserve</h2>
            <select name="personId" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.userType.replace("_", " ")})
                </option>
              ))}
            </select>
            <select name="displayAsPersonId" className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">No nickname override</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  Show as: {p.fullName}
                </option>
              ))}
            </select>
            <select name="status" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="ASSIGNED">Assigned (in active use)</option>
              <option value="RESERVED">Reserved for later project</option>
            </select>
            <input name="note" placeholder="Note (optional)" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Save
            </button>
          </form>

          <div className="space-y-4">
            <form
              action={async (formData) => {
                "use server";
                try {
                  await changeLinePackage(line.id, formData);
                } catch (err) {
                  redirect(`/lines/${line.id}?error=${encodeURIComponent((err as Error).message)}`);
                }
              }}
              className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <h2 className="font-medium text-slate-900">Change package</h2>
              <select name="packageId" defaultValue={line.currentPackageId} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {Number(p.listPriceTRY)} TRY
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Save
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await moveLineToDepot(line.id);
              }}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <h2 className="mb-2 font-medium text-slate-900">Return to IT Depot</h2>
              <button type="submit" className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                Unassign &amp; move to depot
              </button>
            </form>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-slate-900">Monthly bills</h2>
        {line.billRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No bills recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1">Period</th>
                <th className="py-1">Amount</th>
                <th className="py-1">vs. list price ({listPrice} TRY)</th>
              </tr>
            </thead>
            <tbody>
              {line.billRecords.map((r) => {
                const amount = Number(r.amountTRY);
                const diffPct = listPrice > 0 ? ((amount - listPrice) / listPrice) * 100 : 0;
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-1">
                      {r.batch.periodMonth}/{r.batch.periodYear}
                    </td>
                    <td className="py-1">{amount.toFixed(2)} TRY</td>
                    <td className={`py-1 ${Math.abs(diffPct) > 25 ? "text-red-600 font-medium" : "text-slate-600"}`}>
                      {diffPct > 0 ? "+" : ""}
                      {diffPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-slate-900">History log</h2>
        <ul className="space-y-2 text-sm">
          {line.logs.map((log) => (
            <li key={log.id} className="border-b border-slate-100 pb-2 last:border-0">
              <span className="text-slate-400">{log.timestamp.toLocaleString()}</span> —{" "}
              <span className="font-medium">{ACTION_LABEL[log.action]}</span>
              {log.fromPerson && <span> from {log.fromPerson.fullName}</span>}
              {log.toPerson && <span> to {log.toPerson.fullName}</span>}
              {log.fromPackage && <span> from {log.fromPackage.name}</span>}
              {log.toPackage && <span> to {log.toPackage.name}</span>}
              <span className="text-slate-400"> · by {log.performedByUser.name}</span>
              {log.note && <div className="text-slate-500">{log.note}</div>}
            </li>
          ))}
          {line.logs.length === 0 && <p className="text-slate-500">No history yet.</p>}
        </ul>
      </section>
    </div>
  );
}
