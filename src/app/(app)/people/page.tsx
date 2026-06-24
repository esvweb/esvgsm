import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPerson } from "@/lib/actions/people";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export default async function PeoplePage() {
  const [people, session] = await Promise.all([
    prisma.person.findMany({ orderBy: { fullName: "asc" } }),
    auth(),
  ]);
  const canEdit = session ? can(session.user.role, "manageData") : false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">People</h1>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-gray-50">
                <td className="px-5 py-3">
                  <Link href={`/people/${p.id}`} className="font-medium text-foreground hover:text-primary">
                    {p.fullName}
                  </Link>
                  {p.nickname && <span className="ml-1 text-muted">({p.nickname})</span>}
                </td>
                <td className="px-5 py-3 text-muted">{p.userType.replace("_", " ")}</td>
                <td className="px-5 py-3 text-muted">{p.department ?? "—"}</td>
                <td className="px-5 py-3">
                  {p.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="neutral">Departed</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {canEdit && (
        <Card className="max-w-xl">
          <form action={createPerson} className="space-y-4">
            <CardTitle>Add person</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              <Input name="fullName" placeholder="Full name" required />
              <Input name="nickname" placeholder="Nickname (optional)" />
              <Input name="email" type="email" placeholder="Email (optional)" />
              <Input name="department" placeholder="Department (optional)" />
              <Select name="userType" required className="col-span-2">
                <option value="OFFICE_USER">Office User</option>
                <option value="SALES_AGENT">Sales Agent</option>
                <option value="HEAVY_DATA_USER">Heavy Data User</option>
              </Select>
            </div>
            <Button type="submit">Create</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
