import { prisma } from "@/lib/prisma";
import { createUser, setUserActive, setUserRole } from "@/lib/actions/users";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

const ROLES = ["ADMIN", "IT_STAFF", "FINANCE", "VIEWER"] as const;

export default async function UsersAdminPage() {
  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">System users</h1>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-5 py-3 text-foreground">{u.name}</td>
                <td className="px-5 py-3 text-muted">{u.email}</td>
                <td className="px-5 py-3">
                  <form
                    action={async (formData) => {
                      "use server";
                      await setUserRole(u.id, formData);
                    }}
                    className="flex gap-2"
                  >
                    <Select name="role" defaultValue={u.role} className="py-1.5 text-xs">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">
                      Save
                    </Button>
                  </form>
                </td>
                <td className="px-5 py-3">
                  <form
                    action={async () => {
                      "use server";
                      await setUserActive(u.id, !u.active);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Badge variant={u.active ? "secondary" : "neutral"}>{u.active ? "Active" : "Inactive"}</Badge>
                    <Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">
                      {u.active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="max-w-md">
        <form action={createUser} className="space-y-3">
          <CardTitle>Add user</CardTitle>
          <Input name="name" placeholder="Name" required />
          <Input name="email" type="email" placeholder="Email" required />
          <Input name="password" type="password" placeholder="Temporary password" required minLength={8} />
          <Select name="role" required>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Button type="submit">Create</Button>
        </form>
      </Card>
    </div>
  );
}
