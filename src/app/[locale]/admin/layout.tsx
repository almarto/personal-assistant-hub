import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role, hasRole } from "@/lib/types/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !hasRole(session.user.role, Role.ADMIN)) {
    redirect("/");
  }

  return <>{children}</>;
}
