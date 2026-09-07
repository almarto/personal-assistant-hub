import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { hasRole, Role } from "@/lib/types/roles";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";
import { SectionSubNav } from "@/systemUI/components/SectionSubNav/SectionSubNav";

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

  const t = await getTranslations("Admin");

  return (
    <PageLayout>
      <SectionSubNav
        tabs={[
          { label: t("users"), href: "/admin/users" },
          { label: t("families"), href: "/admin/families" },
        ]}
      />
      {children}
    </PageLayout>
  );
}
