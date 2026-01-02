import { Role } from "@/lib/types/roles";

export type User = {
  id: string;
  email: string;
  name: string;
  username: string;
  role?: Role;
};