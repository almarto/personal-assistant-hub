import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { Role } from "@/lib/types/roles";
import { User } from "@/lib/types/user";

import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  const sessionHeaders = await headers();
  const usersData = await auth.api.listUsers({
    headers: sessionHeaders,
    query: {
      limit: 100,
    },
  });
  
  const usersRaw = (usersData?.users || []) as User[];

  const users = usersRaw.map((user) => ({
    id: user.id,
    name: user.name,
    username: user.username || "",
    email: user.email,
    role: (user.role as Role) || Role.USER,
    createdAt: user.createdAt ? new Date(user.createdAt) : undefined,
    updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
    image: user.image,
  }));

  return <UsersClient initialUsers={users} />;
}
