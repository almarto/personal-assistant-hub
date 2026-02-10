import type { AppRole } from "./roles";
import { Role } from "./roles";

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role?: Role;
  appRoles?: AppRole[];
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
