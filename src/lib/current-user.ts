import { auth } from "@/auth";
import { can, ROLE_PERMISSIONS } from "@/lib/permissions";

export async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

export async function requirePermission(action: keyof (typeof ROLE_PERMISSIONS)["ADMIN"]) {
  const user = await requireUser();
  if (!can(user.role, action)) {
    throw new Error(`Role ${user.role} is not permitted to perform this action.`);
  }
  return user;
}
