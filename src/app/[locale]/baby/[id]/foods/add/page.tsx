import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getBaby } from "@/lib/services/babies";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import AddFoodForm from "./AddFoodForm";

export default async function AddFoodPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect({
      href: {
        pathname: "/auth/signin",
        query: {
          callbackUrl: `/baby/${id}/foods/add`,
        },
      },
      locale,
    });
  }

  const baby = await getBaby(id, session.user.id);

  if (!baby) {
    notFound();
  }

  return (
    <PageLayout>
      <AddFoodForm babyId={baby.id} />
    </PageLayout>
  );
}
