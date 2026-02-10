import { headers } from "next/headers";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { userHasAppRole } from "@/lib/services/user-roles";
import { APP_ROLE } from "@/lib/types/roles";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

export default async function ScheduleLayout({
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

  if (!session) {
    return redirect({
      href: {
        pathname: "/auth/signin",
        query: {
          callbackUrl: "/schedule",
        },
      },
      locale,
    });
  }

  const hasAccess = await userHasAppRole(
    session.user.id,
    session.user.role,
    APP_ROLE.SCHEDULE_MANAGER
  );

  if (!hasAccess) {
    return redirect({ href: "/", locale });
  }

  return <PageLayout>{children}</PageLayout>;
}
