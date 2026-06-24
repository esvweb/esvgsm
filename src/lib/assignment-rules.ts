import type { Package, Person } from "@prisma/client";

export class AssignmentRuleError extends Error {}

/** Throws if `package` cannot currently be assigned to `person`. */
export function assertAssignable(pkg: Package, person: Person) {
  if (!pkg.isAssignable) {
    throw new AssignmentRuleError(
      `"${pkg.name}" is a restricted package and cannot be assigned directly. Upgrade the line's package first.`
    );
  }
  if (!pkg.allowedUserTypes.includes(person.userType)) {
    throw new AssignmentRuleError(
      `"${pkg.name}" is not allowed for user type ${person.userType}.`
    );
  }
}
