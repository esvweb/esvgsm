import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { updatePerson, setPersonActive } from "@/lib/actions/people";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

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
        <h1 className="text-2xl font-semibold text-foreground">
          {person.fullName}
          {person.nickname && <span className="ml-2 text-muted">({person.nickname})</span>}
        </h1>
        {canEdit && (
          <form
            action={async () => {
              "use server";
              await setPersonActive(person.id, !person.active);
            }}
          >
            <Button type="submit" variant="outline">
              {person.active ? "Mark departed" : "Mark active"}
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardTitle>Lines currently held</CardTitle>
        {currentLines.length === 0 && person.assignmentsAsDisplay.length === 0 && (
          <p className="text-sm text-muted">No lines currently assigned.</p>
        )}
        <ul className="space-y-2 text-sm">
          {currentLines.map((a) => (
            <li key={a.id}>
              <Link href={`/lines/${a.line.id}`} className="font-medium text-foreground hover:text-primary">
                {a.line.msisdn}
              </Link>{" "}
              <span className="text-muted">— {a.package.name}</span>
              {a.displayAsPerson && (
                <Badge variant="warning" className="ml-2">
                  using as {a.displayAsPerson.fullName}
                </Badge>
              )}
            </li>
          ))}
          {person.assignmentsAsDisplay.map((a) => (
            <li key={a.id} className="text-muted">
              <Link href={`/lines/${a.line.id}`} className="hover:text-primary">
                {a.line.msisdn}
              </Link>{" "}
              — currently used by {a.person.fullName} under this identity/nickname
            </li>
          ))}
        </ul>
      </Card>

      {pastLines.length > 0 && (
        <Card>
          <CardTitle>Past lines</CardTitle>
          <ul className="space-y-1 text-sm text-muted">
            {pastLines.map((a) => (
              <li key={a.id}>
                {a.line.msisdn} — {a.package.name} ({a.startDate.toLocaleDateString()} –{" "}
                {a.endDate?.toLocaleDateString()})
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canEdit && (
        <Card>
          <form
            action={async (formData) => {
              "use server";
              await updatePerson(person.id, formData);
            }}
            className="space-y-4"
          >
            <CardTitle>Edit details</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              <Input name="fullName" defaultValue={person.fullName} required />
              <Input name="nickname" defaultValue={person.nickname ?? ""} />
              <Input name="email" type="email" defaultValue={person.email ?? ""} />
              <Input name="department" defaultValue={person.department ?? ""} />
              <Select name="userType" defaultValue={person.userType} required className="col-span-2">
                <option value="OFFICE_USER">Office User</option>
                <option value="SALES_AGENT">Sales Agent</option>
                <option value="HEAVY_DATA_USER">Heavy Data User</option>
              </Select>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
