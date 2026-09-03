import { notFound } from "next/navigation";

import { redirect } from "@/i18n/routing";
import { requireTripAccess, TripAccessDeniedError } from "@/lib/auth-guards";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  try {
    await requireTripAccess(id);
  } catch (error) {
    if (error instanceof TripAccessDeniedError) {
      if (error.reason === "signin_required") {
        return redirect({
          href: { pathname: "/auth/signin", query: { callbackUrl: `/trips/${id}` } },
          locale,
        });
      }
      notFound();
    }
    throw error;
  }

  return <PageLayout theme="hub">{children}</PageLayout>;
}
