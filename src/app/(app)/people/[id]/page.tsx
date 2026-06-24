import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { updatePerson, setPersonActive } from "@/lib/actions/people";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, session] = await Promise.all([
    prisma.person.findUnique({
      where: { id },
      include: {
        assignmentsAsHolder: {
          include: { line: true, package: true, displayAsPerson: true },
          orderBy: { startDate: "desc" },
        },
        assignmentsAsDisplay: {
          where: { endDate: null },
          include: { line: true, person: true },
        },
      },
    }),
    auth(),
  ]);
  if (!person) notFound();

  const canEdit = session ? can(session.user.role, "manageData") : false;
  const currentLines = person.assignmentsAsHolder.filter((a) => a.endDate === null);
  const pastLines = person.assignmentsAsHolder.filter((a) => a.endDate !== null);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          {person.fullName}
          {person.nickname && <span className="ml-2 text-slate-400">({person.nickname})</span>}
        </h1>
        {canEdit && (
          <form
            action={async () => {
              "use server";
              await setPersonActive(person.id, !person.active);
            }}
          >
            <button className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
              {person.active ? "Mark departed" : "Mark active"}
            </button>
          </form>
        )}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-slate-900">Lines currently held</h2>
        {currentLines.length === 0 && person.assignmentsAsDisplay.length === 0 && (
          <p className="text-sm text-slate-500">No lines currently assigned.</p>
        )}
        <ul className="space-y-2 text-sm">
          {currentLines.map((a) => (
            <li key={a.id}>
              <Link href={`/lines/${a.line.id}`} className="font-medium text-slate-900 hover:underline">
                {a.line.msisdn}
              </Link>{" "}
              — {a.package.name}
              {a.displayAsPerson && (
                <span className="ml-2 text-amber-600">
                  (using under {a.displayAsPerson.fullName}&apos;s identity)
                </span>
              )}
            </li>
          ))}
          {person.assignmentsAsDisplay.map((a) => (
            <li key={a.id} className="text-slate-500">
              <Link href={`/lines/${a.line.id}`} className="hover:underline">
                {a.line.msisdn}
              </Link>{" "}
              — currently used by {a.person.fullName} under this identity/nickname
            </li>
          ))}
        </ul>
      </section>

      {pastLines.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-medium text-slate-900">Past lines</h2>
          <ul className="space-y-1 text-sm text-slate-500">
            {pastLines.map((a) => (
              <li key={a.id}>
                {a.line.msisdn} — {a.package.name} ({a.startDate.toLocaleDateString()} –{" "}
                {a.endDate?.toLocaleDateString()})
              </li>
            ))}
          </ul>
        </section>
      )}

      {canEdit && (
        <form
          action={async (formData) => {
            "use server";
            await updatePerson(person.id, formData);
          }}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 className="font-medium text-slate-900">Edit details</h2>
          <div className="grid grid-cols-2 gap-3">
            <input name="fullName" defaultValue={person.fullName} required className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="nickname" defaultValue={person.nickname ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="email" type="email" defaultValue={person.email ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="department" defaultValue={person.department ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <select name="userType" defaultValue={person.userType} required className="rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="OFFICE_USER">Office User</option>
              <option value="SALES_AGENT">Sales Agent</option>
              <option value="HEAVY_DATA_USER">Heavy Data User</option>
            </select>
          </div>
          <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Save
          </button>
        </form>
      )}
    </div>
  );
}
