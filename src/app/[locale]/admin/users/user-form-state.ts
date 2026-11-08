import type { AppRole, Role } from "@/lib/types/roles";

export interface UserFormValues {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  currentPassword: string;
  role: Role;
  appRoles: AppRole[];
}

function sameRoles(a: AppRole[], b: AppRole[]): boolean {
  const set = new Set(a);
  return a.length === b.length && b.every((role) => set.has(role));
}

/** True when the form differs from what was last loaded or saved. */
export function isFormDirty(
  current: UserFormValues,
  baseline: UserFormValues
): boolean {
  return (
    current.name !== baseline.name ||
    current.username !== baseline.username ||
    current.email !== baseline.email ||
    current.password !== baseline.password ||
    current.confirmPassword !== baseline.confirmPassword ||
    current.currentPassword !== baseline.currentPassword ||
    current.role !== baseline.role ||
    !sameRoles(current.appRoles, baseline.appRoles)
  );
}

/** After a save, password fields must not be resent. */
export function clearPasswordFields(values: UserFormValues): UserFormValues {
  return { ...values, password: "", confirmPassword: "", currentPassword: "" };
}
