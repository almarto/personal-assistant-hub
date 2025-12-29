export enum Role {
  ADMIN = "admin",
  PARENT = "parent",
  CAREGIVER = "caregiver",
}

export function hasRole(
  userRole: string | undefined | null,
  role: Role
): boolean {
  if (!userRole) return false;
  const roles = userRole.split(",").map((r) => r.trim());
  return roles.includes(role);
}
