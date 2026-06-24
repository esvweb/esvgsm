import { prisma } from "@/lib/prisma";
import { createUser, setUserActive, setUserRole } from "@/lib/actions/users";

const ROLES = ["ADMIN", "IT_STAFF", "FINANCE", "VIEWER"] as const;

export default async function UsersAdminPage() {
  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">System users</h1>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <form
                    action={async (formData) => {
                      "use server";
                      await setUserRole(u.id, formData);
                    }}
                    className="flex gap-2"
                  >
                    <select name="role" defaultValue={u.role} className="rounded border border-slate-300 px-2 py-1 text-xs">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2">
                  <form
                    action={async () => {
                      "use server";
                      await setUserActive(u.id, !u.active);
                    }}
                  >
                    <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={createUser} className="max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Add user</h2>
        <input name="name" placeholder="Name" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        <input name="email" type="email" placeholder="Email" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Temporary password" required minLength={8} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        <select name="role" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Create
        </button>
      </form>
    </div>
  );
}
