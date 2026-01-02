import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "@/i18n/routing";
import { Role, hasRole } from "@/lib/types/roles";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { locale } = await params;

  if (!session || !hasRole(session.user.role, Role.ADMIN)) {
    if (!session) {
      redirect({
        href: {
          pathname: "/auth/signin",
          query: {
            callbackUrl: "/admin/users",
          },
        },
        locale,
      });
    } else {
      redirect({ href: "/", locale });
    }
  }

  return <PageLayout>{children}</PageLayout>;
}
