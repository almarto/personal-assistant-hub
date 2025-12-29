import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import UsersClient from "./UsersClient";
import { User } from "./types";

export default async function AdminUsersPage() {
  const sessionHeaders = await headers();
  const usersData = await auth.api.listUsers({
    headers: sessionHeaders,
    query: {
      limit: 100,
    },
  });

  const users = (usersData?.users || []).map((user: any) => ({
    id: user.id,
    name: user.name,
    username: user.username || "",
    email: user.email,
    role: user.role || "user",
  })) as User[];

  return <UsersClient initialUsers={users} />;
}
