import { Role } from "./roles";

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role?: Role;
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
