import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPerson } from "@/lib/actions/people";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";

export default async function PeoplePage() {
  const [people, session] = await Promise.all([
    prisma.person.findMany({ orderBy: { fullName: "asc" } }),
    auth(),
  ]);
  const canEdit = session ? can(session.user.role, "manageData") : false;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">People</h1>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/people/${p.id}`} className="font-medium text-slate-900 hover:underline">
                    {p.fullName}
                  </Link>
                  {p.nickname && <span className="ml-1 text-slate-400">({p.nickname})</span>}
                </td>
                <td className="px-4 py-2">{p.userType.replace("_", " ")}</td>
                <td className="px-4 py-2">{p.department ?? "—"}</td>
                <td className="px-4 py-2">
                  {p.active ? (
                    <span className="text-emerald-600">Active</span>
                  ) : (
                    <span className="text-slate-400">Departed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <form action={createPerson} className="max-w-xl space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">Add person</h2>
          <div className="grid grid-cols-2 gap-3">
            <input name="fullName" placeholder="Full name" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="nickname" placeholder="Nickname (optional)" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="Email (optional)" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="department" placeholder="Department (optional)" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <select name="userType" required className="rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="OFFICE_USER">Office User</option>
              <option value="SALES_AGENT">Sales Agent</option>
              <option value="HEAVY_DATA_USER">Heavy Data User</option>
            </select>
          </div>
          <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Create
          </button>
        </form>
      )}
    </div>
  );
}
