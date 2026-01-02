import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Role } from "@/lib/types/roles";

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Admin access required");
  }

  return session;
}
