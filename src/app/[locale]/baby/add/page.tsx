import { headers } from "next/headers";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import AddBabyForm from "./AddBabyForm";

export default async function AddBaby({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect({
      href: {
        pathname: "/auth/signin",
        query: {
          callbackUrl: "/baby/add",
        },
      },
      locale,
    });
  }

  return (
    <PageLayout>
      <AddBabyForm />
    </PageLayout>
  );
}
