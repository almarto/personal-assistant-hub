import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "@/i18n/routing";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

export default async function ProfileLayout({
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
    redirect({
      href: {
        pathname: "/auth/signin",
        query: {
          callbackUrl: "/profile",
        },
      },
      locale,
    });
  }

  return <PageLayout>{children}</PageLayout>;
}
