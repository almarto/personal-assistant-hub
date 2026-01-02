export enum Role {
  ADMIN = "admin",
  USER = "user",
}

export function hasRole(
  userRole: string | undefined | null,
  role: Role
): boolean {
  if (!userRole) return false;
  return userRole === role;
}
