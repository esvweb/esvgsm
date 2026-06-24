import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { createLine } from "@/lib/actions/lines";

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned",
  IT_DEPOT: "IT Depot",
  RESERVED: "Reserved",
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
        <h1 className="text-xl font-semibold text-slate-900">GSM Lines</h1>
        <div className="flex gap-2 text-sm">
          {["ASSIGNED", "IT_DEPOT", "RESERVED"].map((s) => (
            <Link
              key={s}
              href={`/lines?status=${s}`}
              className={`rounded px-2 py-1 ${status === s ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600"}`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
          {status && (
            <Link href="/lines" className="rounded px-2 py-1 text-slate-400 hover:text-slate-700">
              Clear
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Package</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Holder</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const current = l.assignments[0];
              return (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/lines/${l.id}`} className="font-medium text-slate-900 hover:underline">
                      {l.msisdn}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{l.currentPackage.name}</td>
                  <td className="px-4 py-2">{STATUS_LABEL[l.status]}</td>
                  <td className="px-4 py-2">
                    {current
                      ? `${current.person.fullName}${current.displayAsPerson ? ` (as ${current.displayAsPerson.fullName})` : ""}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <form action={createLine} className="max-w-xl space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">Add GSM line</h2>
          <div className="grid grid-cols-2 gap-3">
            <input name="msisdn" placeholder="Phone number" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="operator" placeholder="Operator" defaultValue="Vodafone" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <select name="packageId" required className="rounded border border-slate-300 px-3 py-2 text-sm">
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input name="notes" placeholder="Notes (optional)" className="rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Create (starts in IT Depot)
          </button>
        </form>
      )}
    </div>
  );
}
