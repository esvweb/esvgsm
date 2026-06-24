import type { SystemRole } from "@prisma/client";

export const ROLE_PERMISSIONS = {
  ADMIN: { manageUsers: true, manageSettings: true, manageData: true, uploadBills: true, write: true },
  IT_STAFF: { manageUsers: false, manageSettings: false, manageData: true, uploadBills: false, write: true },
  FINANCE: { manageUsers: false, manageSettings: false, manageData: false, uploadBills: true, write: true },
  VIEWER: { manageUsers: false, manageSettings: false, manageData: false, uploadBills: false, write: false },
} as const satisfies Record<
  SystemRole,
  { manageUsers: boolean; manageSettings: boolean; manageData: boolean; uploadBills: boolean; write: boolean }
>;

export function can(role: SystemRole, action: keyof (typeof ROLE_PERMISSIONS)["ADMIN"]) {
  return ROLE_PERMISSIONS[role][action];
}
